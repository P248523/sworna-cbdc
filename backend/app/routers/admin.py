"""Central-bank admin endpoints: issue, redeem oversight, supply, circulation.

The token network itself decides issue/transfer/redeem validity (ZK proofs +
auditor signature). The backend adds the CB-facing reporting view.
"""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..amounts import to_minor, to_swr
from ..database import get_session
from ..models import Bank, Customer, TransactionLog
from ..schemas import AdminOverview, CirculationRow, IssueRequest, TxLogRead
from ..token_client import TokenServiceError, token_client

router = APIRouter(prefix="/api/v1", tags=["admin"])


class BlockSummary(BaseModel):
    number: int
    tx_count: int
    txids: list[str]


class LedgerStatus(BaseModel):
    channel: str
    height: int
    blocks: list[BlockSummary]


def _peer_env() -> dict:
    """Environment for the Fabric peer CLI against the sworna network."""
    base = os.environ.get("SWORNA_NETWORK_HOME", "/run/media/sapiens/Development/CBDC/network")
    orgs = Path(base) / "organizations"
    env = {
        "PATH": f"{os.environ.get('SWORNA_BIN', '/run/media/sapiens/Development/CBDC/bin')}:" + os.environ.get("PATH", ""),
        "FABRIC_CFG_PATH": os.environ.get("SWORNA_FABRIC_CFG", "/run/media/sapiens/Development/CBDC/config"),
        "CORE_PEER_TLS_ENABLED": "true",
        "CORE_PEER_LOCALMSPID": "CentralBankMSP",
        "CORE_PEER_ADDRESS": "localhost:7051",
        "CORE_PEER_TLS_ROOTCERT_FILE": str(
            orgs / "peerOrganizations/centralbank.sworna.example.com/peers/peer0.centralbank.sworna.example.com/tls/ca.crt"
        ),
        "CORE_PEER_MSPCONFIGPATH": str(
            orgs / "peerOrganizations/centralbank.sworna.example.com/users/Admin@centralbank.sworna.example.com/msp"
        ),
        "ORDERER_CA": str(
            orgs / "ordererOrganizations/sworna.example.com/orderers/orderer.sworna.example.com/tls/ca.crt"
        ),
    }
    return env


@router.get("/admin/ledger", response_model=LedgerStatus)
def ledger_status(limit: int = 5):
    env = _peer_env()
    channel = "settlement"
    try:
        info = subprocess.run(
            ["peer", "channel", "getinfo", "-c", channel],
            capture_output=True, text=True, env=env, timeout=30,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
        raise HTTPException(503, f"peer CLI unavailable: {exc}") from exc
    if info.returncode != 0:
        raise HTTPException(503, info.stderr[-500:])

    height = 0
    for line in info.stdout.splitlines():
        if "Blockchain info:" in line:
            height = int(json.loads(line.split(":", 1)[1].strip())["height"])

    blocks: list[BlockSummary] = []
    start = max(0, height - limit)
    for num in range(start, max(height, 1)):
        fetch = subprocess.run(
            [
                "peer", "channel", "fetch", str(num), "-o", "localhost:7050",
                "--ordererTLSHostnameOverride", "orderer.sworna.example.com",
                "--tls", "--cafile", env["ORDERER_CA"], "-c", channel, "/tmp/sworna-blk.block",
            ],
            capture_output=True, text=True, env=env, timeout=30,
        )
        if fetch.returncode != 0:
            continue
        decoded = subprocess.run(
            ["configtxlator", "proto_decode", "--type", "common.Block",
             "--input", "/tmp/sworna-blk.block", "--output", "/tmp/sworna-blk.json"],
            capture_output=True, text=True, env=env, timeout=30,
        )
        if decoded.returncode != 0:
            continue
        try:
            data = json.loads(Path("/tmp/sworna-blk.json").read_text())
            txs = data.get("data", {}).get("data", [])
            txids = []
            for tx in txs:
                payload = tx.get("payload", {})
                ch = payload.get("header", {}).get("channel_header", {})
                tid = ch.get("tx_id", "")
                if tid:
                    txids.append(tid)
            blocks.append(BlockSummary(number=num, tx_count=len(txs), txids=txids))
        except (json.JSONDecodeError, KeyError):
            continue

    return LedgerStatus(channel=channel, height=height, blocks=blocks)


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