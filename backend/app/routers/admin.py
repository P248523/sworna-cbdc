"""Central-bank admin endpoints: issue, redeem oversight, supply, circulation.

The token network itself decides issue/transfer/redeem validity (ZK proofs +
auditor signature). The backend adds the CB-facing reporting view.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..amounts import to_minor, to_swr
from ..database import get_session
from ..models import Bank, Customer, TransactionLog
from ..schemas import AdminOverview, CirculationRow, IssueRequest, TxLogRead
from ..token_client import TokenServiceError, token_client

router = APIRouter(prefix="/api/v1", tags=["admin"])


@router.post("/admin/issue", response_model=TxLogRead, status_code=201)
async def issue(body: IssueRequest, session: Session = Depends(get_session)):
    bank = session.scalar(select(Bank).where(Bank.name == body.bank_name))
    if bank is None:
        raise HTTPException(404, f"bank '{body.bank_name}' not found")
    customer = session.scalar(
        select(Customer).where(Customer.wallet == body.recipient_wallet)
    )
    if customer is None or customer.bank_id != bank.id:
        raise HTTPException(404, f"wallet '{body.recipient_wallet}' not on {bank.name}")

    amount_minor = to_minor(body.amount)
    try:
        txid = await token_client.issue(
            amount_minor=amount_minor,
            node=bank.owner_node,
            wallet=customer.wallet,
            message=body.message,
        )
    except TokenServiceError as exc:
        raise HTTPException(502, f"token service error: {exc}") from exc

    log = TransactionLog(
        txid=txid,
        tx_type="issue",
        to_wallet=customer.wallet,
        amount_minor=amount_minor,
        message=body.message,
    )
    session.add(log)
    session.commit()
    session.refresh(log)
    return log


@router.get("/admin/transactions", response_model=list[TxLogRead])
def list_transactions(limit: int = 50, session: Session = Depends(get_session)):
    return session.scalars(
        select(TransactionLog).order_by(TransactionLog.id.desc()).limit(limit)
    ).all()


@router.get("/admin/overview", response_model=AdminOverview)
async def overview(session: Session = Depends(get_session)):
    banks = session.scalars(select(Bank).order_by(Bank.id)).all()
    rows: list[CirculationRow] = []
    total_minor = 0
    for bank in banks:
        customers = session.scalars(
            select(Customer).where(Customer.bank_id == bank.id)
        ).all()
        bank_minor = 0
        for customer in customers:
            try:
                bank_minor += await token_client.balances(
                    wallet=customer.wallet, node=bank.owner_node
                )
            except TokenServiceError:
                continue
        total_minor += bank_minor
        rows.append(
            CirculationRow(
                bank_name=bank.name,
                owner_node=bank.owner_node,
                total_minor=bank_minor,
                total=to_swr(bank_minor),
            )
        )
    return AdminOverview(total_supply=to_swr(total_minor), circulation=rows)