"""SQLAlchemy models for the Sworna banking registry.

Stores the off-chain banking view (banks, customers, accounts, transaction
log). Token balances themselves live on the Fabric ledger; the backend only
keeps registry + AML data and mirrors transactions for reporting.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Bank(Base):
    __tablename__ = "banks"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True)  # banka, bankb
    owner_node: Mapped[str] = mapped_column(String(50))  # owner1, owner2
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    customers: Mapped[list["Customer"]] = relationship(back_populates="bank")


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    wallet: Mapped[str] = mapped_column(String(50), unique=True, index=True)  # idemix wallet on the owner node
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | flagged | frozen
    transfer_limit_minor: Mapped[int] = mapped_column(Integer, default=50000)  # SWR minor units
    bank_id: Mapped[int] = mapped_column(ForeignKey("banks.id"))

    bank: Mapped["Bank"] = relationship(back_populates="customers")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    @property
    def owner_node(self) -> str:
        return self.bank.owner_node

    @property
    def bank_name(self) -> str:
        return self.bank.name


class TransactionLog(Base):
    __tablename__ = "transaction_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    txid: Mapped[str] = mapped_column(String(100), index=True)
    tx_type: Mapped[str] = mapped_column(String(20))  # issue | transfer | redeem
    from_wallet: Mapped[str] = mapped_column(String(50), default="")
    to_wallet: Mapped[str] = mapped_column(String(50), default="")
    amount_minor: Mapped[int] = mapped_column(Integer)
    message: Mapped[str] = mapped_column(String(255), default="")
    status: Mapped[str] = mapped_column(String(20), default="Confirmed")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    @property
    def amount(self):
        from .amounts import to_swr

        return to_swr(self.amount_minor)