"""Pydantic schemas for the Sworna banking API.

Amounts are expressed in major units of SWR (Decimal, `decimals` places) at
the API boundary and converted to integer minor units before reaching the
token services.
"""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

AccountStatus = Literal["active", "flagged", "frozen"]


class BankCreate(BaseModel):
    name: str
    owner_node: str


class BankRead(BankCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int


class CustomerCreate(BaseModel):
    username: str
    full_name: str
    wallet: str
    bank_id: int


class CustomerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    full_name: str
    wallet: str
    status: AccountStatus
    bank_name: str
    bank_id: int


class AccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    full_name: str
    wallet: str
    status: AccountStatus
    bank_name: str
    transfer_limit: Decimal = Field(description="SWR, major units")


class StatusUpdate(BaseModel):
    status: AccountStatus


class TransferRequest(BaseModel):
    from_wallet: str
    to_wallet: str
    amount: Decimal = Field(gt=0, description="SWR, major units")
    message: str = ""


class RedeemRequest(BaseModel):
    wallet: str
    amount: Decimal = Field(gt=0, description="SWR, major units")
    message: str = ""


class IssueRequest(BaseModel):
    recipient_wallet: str
    bank_name: str
    amount: Decimal = Field(gt=0, description="SWR, major units")
    message: str = ""


class TxLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    txid: str
    tx_type: str
    from_wallet: str
    to_wallet: str
    amount: Decimal
    message: str
    status: str
    created_at: datetime


class CirculationRow(BaseModel):
    bank_name: str
    owner_node: str
    total_minor: int
    total: Decimal


class AdminOverview(BaseModel):
    total_supply: Decimal
    circulation: list[CirculationRow]