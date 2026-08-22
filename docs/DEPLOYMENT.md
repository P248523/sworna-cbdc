# DEPLOYMENT — how Sworna is deployed

This guide explains how the single code repository is deployed across machines so that different machines act as the **central bank**, **commercial banks**, or serve **customers**.

> Core idea: **one repo, one set of images — role decided by configuration and identity.** A machine is "the central bank" because it runs the central bank's compose file with the central bank's certificates. Customers run nothing; they use a web app.

---

## 1. Repository layout (the one repo)

```
CBDC/                          ← ONE git repository (all code lives here)
├── network/                   # Hyperledger Fabric network definition
│   ├── configtx/              #   configtx.yaml: organizations, MSPs, channel
│   ├── organizations/         #   Fabric CA configs + identity scripts per org
│   └── compose/               #   docker-compose files per role/host
│       ├── dev/               #     all-in-one (single machine)
│       ├── centralbank/       #     CB host stack
│       ├── banka/             #     Bank A host stack
│       └── bankb/             #     Bank B host stack
├── token-services/            # issuer / auditor / owner applications
│   ├── issuer/                #   mint & redeem (central bank only)
│   ├── auditor/               #   sign/oversee every transaction (central bank)
│   └── owner/                 #   customer wallets (one instance per bank)
├── backend/                   # FastAPI: customers, accounts, admin, reports
├── web/                       # React: customer wallet + CB/bank consoles
├── explorer/                  # Blockchain Explorer configuration
├── scripts/                   # deploy helpers (one entry point per role)
└── docs/                      # all documentation (this file)
```

Every machine **clones this same repo** (or pulls the same container images). Which role a machine plays is chosen by which script/compose file it runs and which certificates it is provisioned with.

## 2. The same binary, different roles

The token services are one codebase started in different roles:

| Application | Runs on | Role decided by |
|---|---|---|
| `issuer` | Central-bank host | issuer configuration + central-bank certificates |
| `auditor` | Central-bank host | auditor configuration + central-bank certificates |
| `owner` | Every bank host | bank configuration + that bank's certificates (ports/wallets differ) |

The `owner` binary on Bank A and Bank B is byte-for-byte identical — only its `conf/` folder differs.

## 3. Per-host role map

| Host | Services it runs | Identity (MSP) |
|---|---|---|
| **Central-bank host** | orderer cluster (Raft ×3) · `peer0.centralbank` · CA · issuer (:9100) · auditor (:9000) · FastAPI backend · web admin/wallet · explorer | `CentralBankMSP` |
| **Bank A host** | `peer0.banka` · CA · owner service (:9200) · bank console | `BankAMSP` |
| **Bank B host** | `peer0.bankb` · CA · owner service (:9300) · bank console | `BankBMSP` |
| **Customer machines** | nothing installed — a browser only | none (idemix wallet identity inside a bank's owner service) |

## 4. How a host is provisioned

Each host runs one command, which (1) generates/loads that host's certificates and (2) starts only its role's containers:

```
git clone <repo> && cd CBDC
./scripts/deploy-centralbank.sh     # central-bank host
./scripts/deploy-banka.sh           # bank A host
./scripts/deploy-bankb.sh           # bank B host
```

### 4.1 Identity & certificates

- Every organization runs its own **Fabric CA**. The script enrolls that host's identities (peer, orderer, admin, services) against the org CA.
- The resulting certificates chain back to the org's root CA and carry the **MSP ID** (`CentralBankMSP`, `BankAMSP`, `BankBMSP`).
- Fabric only trusts certificates chained to a CA that is part of the channel configuration — so a machine cannot impersonate another role.
- Customer wallets use **idemix** credentials issued by the bank CAs (privacy-preserving on the ledger).

### 4.2 What enforcement the network applies

Even with the right code, a transaction is only accepted if the identities can prove they are allowed:

| Action | Identity required | Enforced by |
|---|---|---|
| Mint / redeem | central-bank issuer | token chaincode signature check |
| Approve a transaction | central-bank auditor | mandatory auditor signature in the token flow |
| Spend a token | the token's owner | owner proves control (idemix / ZK) |
| Commit / order | orderer + endorsing orgs | Fabric endorsement policy + consensus |

## 5. Required ports (LAN / firewall)

| Port | Service | Opened on |
|---|---|---|
| 7050, 7051–7053 | orderers | central-bank host (cluster ports 7090–7099) |
| 7051, 7052 | peers | each org host |
| 7054 | Fabric CA | each org host (LAN only) |
| 9000 | auditor service | central-bank host |
| 9100 | issuer service | central-bank host |
| 9200 | owner service (Bank A) | bank A host |
| 9300 | owner service (Bank B) | bank B host |
| 8000 | FastAPI backend | central-bank host (reachable by bank/customer hosts) |
| 8080 | API docs | central-bank host |
| 8081 | Blockchain Explorer | central-bank host |

Firewall rule: lab machines must reach the central-bank host on the ports above and the relevant bank host for their owner service. All inter-service traffic is TLS.

## 6. Deployment progression

### 6.1 Development (single laptop)

One machine runs **everything** via `network/compose/dev/` — all three orgs' peers, orderers, CAs, token services, backend, and web apps as containers. Fastest iteration loop; used for building and testing the demo.

### 6.2 Lab demo (3+ hosts)

Central-bank host, Bank A host, Bank B host as shown in §3. Customer machines simply open the wallet web app in a browser. This is the "stretch" goal of the prototype demo.

### 6.3 Comprehensive build (up to 25 hosts)

Roles are split further for realism and performance:

| Host group | Machines | Services |
|---|---|---|
| Orderer hosts | 1–4 | orderer cluster (SmartBFT 4+ in comprehensive build) |
| Peer hosts | 1 per org | that org's peer + CouchDB |
| CA hosts | 1 per org | Fabric CA |
| Token-service hosts | 2–3 | issuer / auditor / owner services |
| Backend host | 1 | FastAPI + databases |
| Web host | 1 | React wallet + consoles |
| Explorer / monitoring | 1–2 | Blockchain Explorer, Prometheus/Grafana |
| Customer machines | remainder | browsers only |

Automation: `Ansible` playbooks drive the same `deploy-<role>.sh` scripts across hosts; `make`, `jq`, and shell scripts keep bring-up reproducible (`network up`, `network down`, `seed demo`).

## 7. Bring-up / teardown summary

```
./scripts/network up            # start the Fabric network (peers, orderers, CAs)
./scripts/network createChannel # create + join the 'settlement' channel
./scripts/network deployToken   # deploy token chaincode + start token services
./scripts/seed                  # reset demo data: issue → distribute → transfers → redeem
./scripts/network down          # stop and clean everything
```

## 8. References

- Fabric test network conventions (cryptogen vs CA, compose topology): [REFERENCES.md](REFERENCES.md) `R3`
- token-sdk services, ports, and "use another Fabric network": [REFERENCES.md](REFERENCES.md) `R13`
