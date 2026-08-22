"""End-to-end smoke tests against a running stack.

Requires (all on localhost):
  - token-services (issuer :9100, auditor :9000, owner1 :9200, owner2 :9300)
  - backend (:8000)

These tests create real transactions on the ledger. Run against a demo/seed
network, not a deployment you need to keep clean.
"""
from __future__ import annotations

import httpx
import pytest

BACKEND = "http://localhost:8000/api/v1"
OWNER1 = "http://localhost:9200/api/v1"


@pytest.fixture(scope="module")
def client():
    return httpx.Client(timeout=90)


def _assert_ok(resp: httpx.Response) -> dict:
    assert 200 <= resp.status_code < 300, f"{resp.status_code}: {resp.text}"
    return resp.json()


def test_health(client: httpx.Client):
    assert client.get("http://localhost:8000/healthz").json() == {"status": "ok"}


def test_registry_seeded(client: httpx.Client):
    banks = _assert_ok(client.get(f"{BACKEND}/banks"))
    names = {b["name"] for b in banks}
    assert {"banka", "bankb"} <= names
    customers = _assert_ok(client.get(f"{BACKEND}/customers"))
    wallets = {c["wallet"] for c in customers}
    assert {"alice", "bob", "carlos", "dan"} <= wallets


def test_issue_transfer_redeem_flow(client: httpx.Client):
    # issue 1.00 SWR to alice
    issue = _assert_ok(
        client.post(
            f"{BACKEND}/admin/issue",
            json={
                "recipient_wallet": "alice",
                "bank_name": "banka",
                "amount": "1.00",
                "message": "pytest issue",
            },
        )
    )
    assert issue["tx_type"] == "issue"

    # alice -> bob intra-bank 0.25 SWR
    intra = _assert_ok(
        client.post(
            f"{BACKEND}/payments/transfer",
            json={
                "from_wallet": "alice",
                "to_wallet": "bob",
                "amount": "0.25",
                "message": "pytest intra",
            },
        )
    )
    assert intra["tx_type"] == "transfer"

    # bob -> carlos cross-bank 0.10 SWR
    cross = _assert_ok(
        client.post(
            f"{BACKEND}/payments/transfer",
            json={
                "from_wallet": "bob",
                "to_wallet": "carlos",
                "amount": "0.10",
                "message": "pytest cross",
            },
        )
    )
    assert cross["tx_type"] == "transfer"

    # carlos redeem 0.05 SWR
    redeem = _assert_ok(
        client.post(
            f"{BACKEND}/payments/redeem",
            json={"wallet": "carlos", "amount": "0.05", "message": "pytest redeem"},
        )
    )
    assert redeem["tx_type"] == "redeem"


def test_admin_overview(client: httpx.Client):
    overview = _assert_ok(client.get(f"{BACKEND}/admin/overview"))
    assert float(overview["total_supply"]) > 0
    assert any(row["bank_name"] == "banka" for row in overview["circulation"])


def test_aml_freeze_blocks_transfer(client: httpx.Client):
    _assert_ok(
        client.patch(
            f"{BACKEND}/customers/bob/status",
            json={"status": "frozen"},
        )
    )
    resp = client.post(
        f"{BACKEND}/payments/transfer",
        json={
            "from_wallet": "bob",
            "to_wallet": "carlos",
            "amount": "0.01",
            "message": "pytest should-fail",
        },
    )
    assert resp.status_code == 403
    _assert_ok(
        client.patch(
            f"{BACKEND}/customers/bob/status",
            json={"status": "active"},
        )
    )


def test_ledger_balances_after_flow(client: httpx.Client):
    alice = _assert_ok(client.get(f"{OWNER1}/owner/accounts/alice"))
    for balance in alice["payload"]["balance"]:
        if balance["code"] == "SWR":
            assert int(balance["value"]) > 0
            break
    else:
        pytest.fail("alice has no SWR balance")