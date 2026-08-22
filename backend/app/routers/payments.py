"""Payment endpoints: transfer and redeem, with AML-lite checks.

Before proxying to the token services, the backend enforces:
  - sender account must be `active`
  - per-transfer amount <= the account's transfer limit
These are demo-level checks; on-chain enforcement is deferred to Phase 4.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..amounts import to_minor
from ..database import get_session
from ..models import Customer, TransactionLog
from ..schemas import RedeemRequest, TransferRequest, TxLogRead
from ..token_client import TokenServiceError, token_client

router = APIRouter(prefix="/api/v1", tags=["payments"])


@router.post("/payments/transfer", response_model=TxLogRead)
async def transfer(body: TransferRequest, session: Session = Depends(get_session)):
    sender = session.scalar(
        select(Customer).where(Customer.wallet == body.from_wallet)
    )
    if sender is None:
        raise HTTPException(404, f"sender wallet '{body.from_wallet}' not registered")

    if sender.status != "active":
        raise HTTPException(403, f"account '{sender.username}' is {sender.status}")

    amount_minor = to_minor(body.amount)
    if amount_minor > sender.transfer_limit_minor:
        raise HTTPException(
            403,
            f"amount {body.amount} SWR exceeds transfer limit "
            f"({sender.transfer_limit_minor / 100:.2f} SWR)",
        )

    recipient = session.scalar(
        select(Customer).where(Customer.wallet == body.to_wallet)
    )
    if recipient is None:
        raise HTTPException(404, f"recipient wallet '{body.to_wallet}' not registered")

    try:
        txid = await token_client.transfer(
            from_wallet=sender.wallet,
            from_node=sender.owner_node,
            to_wallet=recipient.wallet,
            to_node=recipient.owner_node,
            amount_minor=amount_minor,
            message=body.message,
        )
    except TokenServiceError as exc:
        raise HTTPException(502, f"token service error: {exc}") from exc

    log = TransactionLog(
        txid=txid,
        tx_type="transfer",
        from_wallet=sender.wallet,
        to_wallet=recipient.wallet,
        amount_minor=amount_minor,
        message=body.message,
    )
    session.add(log)
    session.commit()
    session.refresh(log)
    return log


@router.post("/payments/redeem", response_model=TxLogRead)
async def redeem(body: RedeemRequest, session: Session = Depends(get_session)):
    customer = session.scalar(select(Customer).where(Customer.wallet == body.wallet))
    if customer is None:
        raise HTTPException(404, f"wallet '{body.wallet}' not registered")
    if customer.status != "active":
        raise HTTPException(403, f"account '{customer.username}' is {customer.status}")

    amount_minor = to_minor(body.amount)
    try:
        txid = await token_client.redeem(
            wallet=customer.wallet,
            node=customer.owner_node,
            amount_minor=amount_minor,
            message=body.message,
        )
    except TokenServiceError as exc:
        raise HTTPException(502, f"token service error: {exc}") from exc

    log = TransactionLog(
        txid=txid,
        tx_type="redeem",
        from_wallet=customer.wallet,
        amount_minor=amount_minor,
        message=body.message,
    )
    session.add(log)
    session.commit()
    session.refresh(log)
    return log