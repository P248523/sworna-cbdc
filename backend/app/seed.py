"""Seed the demo registry (banks + customers).

Does not touch the ledger; issue the money via the admin API after seeding.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Bank, Customer

DEMO = [
    ("banka", "owner1", [
        ("alice", "Alice Adhikari", "alice"),
        ("bob", "Bob Basnet", "bob"),
    ]),
    ("bankb", "owner2", [
        ("carlos", "Carlos Chhetri", "carlos"),
        ("dan", "Dan Dhakal", "dan"),
    ]),
]


def seed(session: Session) -> None:
    for bank_name, owner_node, customers in DEMO:
        bank = session.scalar(select(Bank).where(Bank.name == bank_name))
        if bank is None:
            bank = Bank(name=bank_name, owner_node=owner_node)
            session.add(bank)
            session.flush()
        for username, full_name, wallet in customers:
            existing = session.scalar(
                select(Customer).where(Customer.wallet == wallet)
            )
            if existing is None:
                session.add(
                    Customer(
                        username=username,
                        full_name=full_name,
                        wallet=wallet,
                        bank_id=bank.id,
                    )
                )
    session.commit()