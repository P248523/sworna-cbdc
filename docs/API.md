# API — Sworna REST endpoint catalog

Two REST surfaces, as designed:

1. **Token services** — provided by the reused fabric-samples `token-sdk` sample (Go). These implement the actual on-ledger operations (issue/transfer/redeem) with ZK + UTXO [R13].
2. **FastAPI banking backend** — our Python layer. Holds the customer/bank/account registry, KYC flags, admin API, and aggregates the token services.

Service topology and ports (Phase 1): API docs at `:8080`, auditor `:9000`, issuer `:9100`, owner1 `:9200`, owner2 `:9300` [R13].

---

## 1. Token services (from the token-sdk sample) [R13]

### Issuer node — `:9100` (central bank)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/issuer/issue` | Mint tokens to a counterparty account |
| GET | `/api/v1/issuer/history` | Issuance history |
| POST | `/api/v1/issuer/redeem` | Redeem/burn tokens (as extended for Sworna) |

`POST /api/v1/issuer/issue` example [R13]:

```json
{
  "amount": {"code": "SWR", "value": 1000},
  "counterparty": {"node": "owner1", "account": "alice"},
  "message": "CB issuance to bank A"
}
```

### Owner nodes — `:9200` (banka), `:9300` (bankb)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/owner/accounts` | List accounts on this node |
| GET | `/api/v1/owner/accounts/{id}` | Account details |
| GET | `/api/v1/owner/accounts/{id}/transactions` | Transaction history (UTXO-based) |
| GET | `/api/v1/owner/accounts/{id}/balance` | Aggregate balance from owned UTXOs |
| POST | `/api/v1/owner/accounts/{id}/transfer` | Transfer tokens to a counterparty |
| POST | `/api/v1/owner/accounts/{id}/redeem` | Redeem to the issuer |

`POST /api/v1/owner/accounts/alice/transfer` example [R13]:

```json
{
  "amount": {"code": "SWR", "value": 100},
  "counterparty": {"node": "owner2", "account": "dan"},
  "message": "hello dan!"
}
```

Note the UTXO behavior: a 1000 SWR input yields 100 (dan) + 900 (change to alice) [R13].

### Auditor node — `:9000` (central bank supervision)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/auditor/balances` | All balances (auditor-only visibility) |
| GET | `/api/v1/auditor/transactions` | All transaction history |
| POST | `/api/v1/auditor/approve` | Approve/sign a transaction (internal flow) |

The auditor validates and signs every transaction before it is committed to the token chaincode [R13].

### API documentation

Interactive Swagger docs: `http://localhost:8080` [R13].

---

## 2. FastAPI banking backend (as-designed)

Base path: `/api/v1`. Auth: phase-2 (OIDC). Demo users seeded: alice, bob (bank A); carol, dan (bank B).

### Registry & accounts

| Method | Endpoint | Description |
|---|---|---|
| GET | `/customers` | List customers |
| POST | `/customers` | Register a customer (onboarding; status `active` by default) |
| GET | `/customers/{id}` | Customer detail |
| PATCH | `/customers/{id}` | Update customer / set KYC flags |
| GET | `/customers/{id}/accounts` | Accounts of a customer |
| POST | `/customers/{id}/accounts` | Open an account (creates a wallet on the bank's owner node) |
| GET | `/accounts/{id}` | Account detail (bank, balance from token service, status) |
| PATCH | `/accounts/{id}` | Set status: `active` / `flagged` / `frozen` (demo AML flag, E1) |
| GET | `/banks` | List commercial banks |

### Payments (proxies to owner-node token services)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/payments/transfer` | `{fromAccount, toAccount, amount, message}` → owner-node transfer |
| GET | `/payments/{id}/status` | Transaction status (submitted / endorsed / committed) |
| GET | `/accounts/{id}/transactions` | Aggregated history for the wallet UI |
| GET | `/accounts/{id}/balance` | Aggregated SWR balance |

### Central-bank admin

| Method | Endpoint | Description |
|---|---|---|
| POST | `/admin/issue` | `{bank, amount}` → issuer node issue |
| POST | `/admin/redeem` | `{bank, amount}` → issuer node redeem |
| GET | `/admin/supply` | Total SWR in circulation |
| GET | `/admin/circulation` | Per-bank circulation |
| GET | `/admin/overview` | Dashboard aggregate: supply, banks, customers, recent txns |

### Example — wallet balance

```
GET /api/v1/accounts/acc-alice-001/balance
→ {"account": "acc-alice-001", "customer": "alice", "bank": "banka",
   "balance": {"code": "SWR", "value": 900}, "status": "active"}
```

---

## 3. Data model (FastAPI)

- `customer`: id, name, phone, bank, kycStatus (`pending`/`verified`), accountStatus (`active`/`flagged`/`frozen`), created.
- `account`: id, customerId, bankId, ownerNode (`owner1`/`owner2`), walletName (e.g., `alice`), tokenType (`SWR`), createdAt.
- `bank`: id (`banka`/`bankb`), msp (`BankAMSP`/`BankBMSP`), ownerNode, createdAt.
- `transactionLog`: id, fromAccount, toAccount, amount, status, tokenTxId, timestamp.

## 4. References

- token-sdk REST API, ports, and request/response examples: https://github.com/hyperledger/fabric-samples/tree/main/token-sdk [R13]
