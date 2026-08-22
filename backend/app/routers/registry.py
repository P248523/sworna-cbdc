"""Bank + customer registry endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..amounts import to_swr
from ..database import get_session
from ..models import Bank, Customer
from ..schemas import BankCreate, BankRead, CustomerCreate, CustomerRead, StatusUpdate
from ..token_client import TokenServiceError, token_client

router = APIRouter(prefix="/api/v1", tags=["registry"])


class BalanceRead(BaseModel):
    username: str
    wallet: str
    bank_name: str
    balance: str  # SWR, major units


class HistoryItem(BaseModel):
    txid: str
    amount: int
    message: str
    sender: str
    recipient: str
    status: str
    timestamp: str


@router.get("/banks", response_model=list[BankRead])
def list_banks(session: Session = Depends(get_session)):
    return session.scalars(select(Bank).order_by(Bank.id)).all()


@router.post("/banks", response_model=BankRead, status_code=201)
def create_bank(body: BankCreate, session: Session = Depends(get_session)):
    existing = session.scalar(select(Bank).where(Bank.name == body.name))
    if existing:
        raise HTTPException(409, f"bank '{body.name}' already exists")
    bank = Bank(name=body.name, owner_node=body.owner_node)
    session.add(bank)
    session.commit()
    session.refresh(bank)
    return bank


@router.get("/customers", response_model=list[CustomerRead])
def list_customers(session: Session = Depends(get_session)):
    return session.scalars(select(Customer).order_by(Customer.id)).all()


@router.post("/customers", response_model=CustomerRead, status_code=201)
def create_customer(body: CustomerCreate, session: Session = Depends(get_session)):
    bank = session.get(Bank, body.bank_id)
    if bank is None:
        raise HTTPException(404, "bank not found")
    if session.scalar(select(Customer).where(Customer.wallet == body.wallet)):
        raise HTTPException(409, f"wallet '{body.wallet}' already registered")
    customer = Customer(
        username=body.username,
        full_name=body.full_name,
        wallet=body.wallet,
        bank_id=body.bank_id,
    )
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer


@router.patch("/customers/{username}/status", response_model=CustomerRead)
def update_status(
    username: str, body: StatusUpdate, session: Session = Depends(get_session)
):
    customer = session.scalar(select(Customer).where(Customer.username == username))
    if customer is None:
        raise HTTPException(404, "customer not found")
    customer.status = body.status
    session.commit()
    session.refresh(customer)
    return customer


@router.get("/customers/{username}/balance", response_model=BalanceRead)
async def customer_balance(username: str, session: Session = Depends(get_session)):
    customer = session.scalar(select(Customer).where(Customer.username == username))
    if customer is None:
        raise HTTPException(404, "customer not found")
    try:
        minor = await token_client.balances(
            wallet=customer.wallet, node=customer.owner_node
        )
    except TokenServiceError as exc:
        raise HTTPException(502, f"token service error: {exc}") from exc
    return BalanceRead(
        username=customer.username,
        wallet=customer.wallet,
        bank_name=customer.bank.name,
        balance=str(to_swr(minor)),
    )


@router.get("/customers/{username}/transactions", response_model=list[HistoryItem])
async def customer_transactions(username: str, session: Session = Depends(get_session)):
    customer = session.scalar(select(Customer).where(Customer.username == username))
    if customer is None:
        raise HTTPException(404, "customer not found")
    try:
        history = await token_client.auditor_history(customer.wallet)
    except TokenServiceError as exc:
        raise HTTPException(502, f"token service error: {exc}") from exc
    items: list[HistoryItem] = []
    for tx in history:
        items.append(
            HistoryItem(
                txid=tx.get("id", ""),
                amount=int(tx.get("amount", {}).get("value", 0)),
                message=tx.get("message", ""),
                sender=tx.get("sender", ""),
                recipient=tx.get("recipient", ""),
                status=tx.get("status", ""),
                timestamp=tx.get("timestamp", ""),
            )
        )
    return items