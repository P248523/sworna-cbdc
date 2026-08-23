# DEPLOYMENT — how Sworna is deployed

One repository; a machine's role is decided by **which script it runs** and
**which keys it holds**.

```
Central-bank host   orderer · peer0.centralbank · CAs · token CA · issuer/auditor · backend · CB portal
Bank A host         owner1 · bank portal                       (peers/orderer live on the CB host today)
Bank B host         owner2 · bank portal
Customer machines   a browser only (the bank portal)
```

> **Operational runbook:** [SETUP.md](SETUP.md) is the step-by-step, agent-runnable
> guide for standing up any host (preflight → clone → Fabric tools → deploy →
> verify). Read it before running the scripts below.

## 1. The one repo, roles by script

| Script | Runs on | Starts |
|---|---|---|
| `scripts/deploy-centralbank.sh` | CB host | network + chaincode + **identity enrollment** + issuer/auditor + backend + CB portal |
| `scripts/deploy-banka.sh` | Bank A host | owner1 service + bank A portal |
| `scripts/deploy-bankb.sh` | Bank B host | owner2 service + bank B portal |

Every host clones the same repo, installs the Fabric binaries/images (`bin`/
`config` symlinks at the repo root pointing at a `fabric-samples` checkout), then
runs its role script. The token engine's `keys/` folder — provisioned by the CB —
is the **join bundle** that makes a bank's owner service valid. On a bank VM the
bundle also includes the org crypto under `network/organizations/` (TLS certs +
MSPs), which the owner containers mount.

## 2. Provisioning (the CB is the trust anchor)

The CB generates each bank's idemix wallets from its UI or API:

```
POST /api/v1/admin/banks/{code}/provision     # generate wallet pool keys
PATCH /api/v1/banks/{code}/status             # registered -> active
```

The generated keys live under `token-services/keys/<owner_node>/` and are
copied to the bank VM (the join bundle). The bank then starts its owner service.
Provisioning is idempotent — re-run to top up a pool.

## 3. Fresh-clone gotchas (now handled)

- `token-services/keys/` is **gitignored** — a fresh clone has no identities.
  `deploy-centralbank.sh` now enrolls them automatically (runs
  `token-services/scripts/enroll-users.sh` once, guarded) before the engine starts.
- The deploy scripts require **Docker Compose v2** (`docker compose`).
- Backend paths derive from the repo location (`backend/app/paths.py`) — no
  hardcoded absolute paths, so any clone path works.

## 4. Bring-up sequence (dev laptop = all-in-one)

```bash
./scripts/deploy-centralbank.sh --provision   # network, chaincode, identities, issuer/auditor, backend, portal
# all-in-one only: also run the two bank scripts, or:
cd token-services && docker compose up -d --build owner1 owner2
./scripts/demo.sh                             # issue -> transfers -> redeem
```

For a **CB host without owner nodes** (real two-tier, banks on their own VMs),
`deploy-centralbank.sh --provision` is enough — it also generates the bank join
bundles. The demo's cross-bank flows need owner1/owner2 running somewhere.

## 5. Distributed (3 VMs) — see docs/token-network/09

1. CB VM: `./scripts/deploy-centralbank.sh --provision` → generates bank keys + crypto.
2. Copy the join bundle (`token-services/keys/` + the bank's
   `network/organizations/` dirs) to each bank VM over Tailscale/SSH.
3. Bank VMs: `./scripts/deploy-banka.sh` / `deploy-bankb.sh`.
4. **Unvalidated step:** cross-host DNS (`extra_hosts`), FSC P2P port publishing,
   and firewall rules — see
   [docs/token-network/09-distributed-deployment.md](token-network/09-distributed-deployment.md).

## 6. Ports

| Port | Service | Host |
|---|---|---|
| 7050 · 7053 | orderer | CB |
| 7051 / 9051 / 11051 | peers (centralbank / banka / bankb) | CB (today) |
| 7054 / 8054 / 9054 | Fabric CAs | CB |
| 27054 | token CA | CB |
| 9000 · 9100 | auditor / issuer | CB |
| 9200 / 9300 | owner1 / owner2 | banka / bankb |
| 8000 | backend | CB |
| 5173 | portals (web dev) | each host |

Services bind `0.0.0.0`, so on lab VMs the portals/backend are reachable at
`http://<tailnet-ip>:<port>` from any laptop on the tailnet.

## 7. Progression

- **Dev (this repo, one laptop):** all-in-one — everything we test on.
- **Lab demo (3 VMs):** the split above; owner services on bank VMs reach the
  CB's network — this is what [09-distributed-deployment.md](token-network/09-distributed-deployment.md) is validating.
- **Comprehensive (up to 25 machines):** more orderers, CouchDB, monitoring,
  Ansible — Phase 4.

## 8. References

- Runbook: [SETUP.md](SETUP.md)
- Distributed validation: [docs/token-network/09-distributed-deployment.md](token-network/09-distributed-deployment.md)
- Provisioning model: [docs/token-network/08-provisioning.md](token-network/08-provisioning.md)
- Token network design: [docs/token-network/](token-network/)
- API: [docs/API.md](API.md)