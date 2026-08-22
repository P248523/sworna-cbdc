"""End-to-end smoke tests for the banking API against a running stack.

Requires (all on localhost):
  - token-services (issuer :9100, auditor :9000, owner1 :9200, owner2 :9300)
  - backend (:8000) with banks 001/002 + pool wallets provisioned

These tests create real transactions on the ledger. Run against a demo/seed
network, not a deployment you need to keep clean.
"""
from __future__ import annotations

import httpx
import pytest

BACKEND = "http://localhost:8000/api/v1"

CB = ("cbadmin", "sworna-cb")
BANKA = ("banka_admin", "sworna-bank")
BANKB = ("bankb_admin", "sworna-bank")
CUSTOMER = ("eva", "sworna-pass")


@pytest.fixture(scope="module")
def client():
    return httpx.Client(timeout=120)


def _login(client: httpx.Client, username: str, password: str) -> str:
    resp = client.post(f"{BACKEND}/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _assert_ok(resp: httpx.Response) -> dict:
    assert 200 <= resp.status_code < 300, f"{resp.status_code}: {resp.text}"
    return resp.json()


def test_health(client: httpx.Client):
    assert client.get("http://localhost:8000/healthz").json() == {"status": "ok"}


def test_login_roles(client: httpx.Client):
    for username, password, role in [
        (*CB, "cb_admin"),
        (*BANKA, "bank_staff"),
        (*CUSTOMER, "customer"),
    ]:
        resp = client.post(f"{BACKEND}/auth/login", json={"username": username, "password": password})
        assert resp.status_code == 200, resp.text
        assert resp.json()["role"] == role


def test_bad_login(client: httpx.Client):
    resp = client.post(f"{BACKEND}/auth/login", json={"username": "cbadmin", "password": "wrong"})
    assert resp.status_code == 401


def test_banks_visible_to_cb(client: httpx.Client):
    token = _login(client, *CB)
    banks = _assert_ok(client.get(f"{BACKEND}/banks", headers=_auth(token)))
    codes = {b["code"] for b in banks}
    assert {"001", "002"} <= codes


def test_provision_bank_pool(client: httpx.Client):
    token = _login(client, *CB)
    result = _assert_ok(
        client.post(f"{BACKEND}/admin/banks/001/provision", headers=_auth(token))
    )
    assert result["wallets_generated"] >= 10
    assert result["free"] > 0


def test_bank_scoping(client: httpx.Client):
    cb = _login(client, *CB)
    bankb = _login(client, *BANKB)
    banka_accounts = _assert_ok(
        client.get(f"{BACKEND}/accounts", headers=_auth(cb))
    )
    assert any(a["account_number"].startswith("SWR-001") for a in banka_accounts)
    # bankb staff only sees their own
    bankb_accounts = _assert_ok(
        client.get(f"{BACKEND}/accounts", headers=_auth(bankb))
    )
    assert all(a["account_number"].startswith("SWR-002") for a in bankb_accounts)
    # bankb staff cannot read a banka account
    resp = client.get(
        f"{BACKEND}/accounts/SWR-001-00000001/balance", headers=_auth(bankb)
    )
    assert resp.status_code == 403


def test_onboard_account(client: httpx.Client):
    token = _login(client, *BANKA)
    resp = client.post(
        f"{BACKEND}/accounts",
        headers=_auth(token),
        json={
            "full_name": "Pytest User",
            "username": "pytest_user",
            "password": "sworna-pass",
            "kyc_level": 1,
            "transfer_limit": "500.00",
        },
    )
    if resp.status_code == 201:
        account = resp.json()
        assert account["account_number"].startswith("SWR-001")
        assert account["full_name"] == "Pytest User"
        return account["account_number"]
    # username already used from a previous run — reuse it
    assert resp.status_code == 409, resp.text
    pytest.skip("pytest_user already exists")


def test_issue_transfer_redeem_flow(client: httpx.Client):
    cb = _login(client, *CB)
    bankb = _login(client, *BANKB)

    # issue to alice
    issue = _assert_ok(
        client.post(
            f"{BACKEND}/admin/issue",
            headers=_auth(cb),
            json={"to_account": "SWR-001-00000001", "amount": "2.00", "reference": "pytest issue"},
        )
    )
    assert issue["tx_type"] == "issue"

    # intra-bank by account number
    intra = _assert_ok(
        client.post(
            f"{BACKEND}/payments/transfer",
            headers=_auth(cb),
            json={
                "from_account": "SWR-001-00000001",
                "to_account": "SWR-001-00000002",
                "amount": "0.50",
                "reference": "pytest intra",
            },
        )
    )
    assert intra["tx_type"] == "transfer"

    # cross-bank by account number
    cross = _assert_ok(
        client.post(
            f"{BACKEND}/payments/transfer",
            headers=_auth(cb),
            json={
                "from_account": "SWR-001-00000001",
                "to_account": "SWR-002-00000001",
                "amount": "0.25",
                "reference": "pytest cross",
            },
        )
    )
    assert cross["tx_type"] == "transfer"

    # redeem on bankb
    redeem = _assert_ok(
        client.post(
            f"{BACKEND}/payments/redeem",
            headers=_auth(bankb),
            json={"account": "SWR-002-00000001", "amount": "0.10", "reference": "pytest redeem"},
        )
    )
    assert redeem["tx_type"] == "redeem"


def test_bank_permission_blocks_redeem(client: httpx.Client):
    cb = _login(client, *CB)
    bankb = _login(client, *BANKB)
    _assert_ok(
        client.patch(
            f"{BACKEND}/banks/002/permissions",
            headers=_auth(cb),
            json={"permissions": {"can_redeem": False, "interbank_limit_minor": 0, "redeem_limit_minor": 0}},
        )
    )
    resp = client.post(
        f"{BACKEND}/payments/redeem",
        headers=_auth(bankb),
        json={"account": "SWR-002-00000001", "amount": "0.01", "reference": "should fail"},
    )
    assert resp.status_code == 403
    # restore
    _assert_ok(
        client.patch(
            f"{BACKEND}/banks/002/permissions",
            headers=_auth(cb),
            json={"permissions": {"can_redeem": True, "interbank_limit_minor": 0, "redeem_limit_minor": 0}},
        )
    )


def test_customer_balance_and_statements(client: httpx.Client):
    eva = _login(client, *CUSTOMER)
    balance = _assert_ok(
        client.get(f"{BACKEND}/accounts/SWR-001-00000003/balance", headers=_auth(eva))
    )
    assert float(balance["balance"]) > 0
    statements = _assert_ok(
        client.get(f"{BACKEND}/accounts/SWR-001-00000003/statements", headers=_auth(eva))
    )
    assert len(statements) > 0


def test_admin_overview(client: httpx.Client):
    cb = _login(client, *CB)
    overview = _assert_ok(client.get(f"{BACKEND}/admin/overview", headers=_auth(cb)))
    assert float(overview["total_supply"]) > 0
    assert any(row["bank_code"] == "001" for row in overview["circulation"])