# DEPLOYMENT — how Sworna is deployed

One repository; a machine's role is decided by **which script it runs** and
**which keys it holds**.

```
Central-bank host   orderer · peer0.centralbank · CAs · token CA · issuer/auditor · backend · CB portal
Bank A host         peer0.banka · CA · owner1 · bank portal
Bank B host         peer0.bankb · CA · owner2 · bank portal
Customer machines   a browser only (the bank portal)
```

## 1. The one repo, roles by script

| Script | Runs on | Starts |
|---|---|---|
| `scripts/deploy-centralbank.sh` | CB host | network + chaincode + issuer/auditor + backend + CB portal |
| `scripts/deploy-banka.sh` | Bank A host | owner1 service + bank A portal |
| `scripts/deploy-bankb.sh` | Bank B host | owner2 service + bank B portal |

Every host clones the same repo (`git clone <repo>`), installs the Fabric
binaries/images (`bin`/`config` symlinks at the repo root), then runs its role
script. The token engine's `keys/` folder — provisioned by the CB — is the
"join bundle" that makes a bank's owner service valid.

## 2. Provisioning (the CB is the trust anchor)

The CB generates each bank's idemix wallets from its UI or API:

```
POST /api/v1/admin/banks/{code}/provision     # generate wallet pool keys
PATCH /api/v1/banks/{code}/status             # registered -> active
```

The generated keys live under `token-services/keys/<owner_node>/` and are
copied to the bank VM (the join bundle). The bank then starts its owner service.

## 3. Bring-up sequence (dev laptop = all-in-one)

```bash
./scripts/deploy-centralbank.sh            # everything on one host
./scripts/demo.sh                          # issue -> transfers -> redeem
```

## 4. Distributed (3 VMs)

1. CB VM: `./scripts/deploy-centralbank.sh --provision` → generates bank keys.
2. Copy `token-services/keys/` (+ the owner confs) to each bank VM.
3. Bank VMs: `./scripts/deploy-banka.sh` / `deploy-bankb.sh`.
4. The bank peer joining `settlement` from its own host (TLS/gossip/DNS across
   hosts) is the step to validate on the lab LAN — everything else is identical
   to the all-in-one run.

## 5. Ports

| Port | Service | Host |
|---|---|---|
| 7050 · 7053 | orderer | CB |
| 7051 / 9051 / 11051 | peers (centralbank / banka / bankb) | per org host |
| 7054 / 8054 / 9054 | Fabric CAs | per org host |
| 27054 | token CA | CB |
| 9000 · 9100 | auditor / issuer | CB |
| 9200 / 9300 | owner1 / owner2 | banka / bankb |
| 8000 | backend | CB |
| 5173 | portals (web dev) | each host |

## 6. Progression

- **Dev (this repo, one laptop):** all-in-one — everything we test on.
- **Lab demo (3 VMs):** the split above; bank peers join the CB's network.
- **Comprehensive (up to 25 machines):** more orderers, CouchDB, monitoring,
  Ansible — Phase 4.

## 7. References

- Provisioning model: `docs/token-network/08-provisioning.md`
- Token network design: `docs/token-network/`
- API: `docs/API.md`