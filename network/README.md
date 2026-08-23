# network/ — the Sworna settlement network

Our 3-organization Hyperledger Fabric network (adapted from the fabric-samples
test network and now owned here):

| Org | MSP | Domain | Peer |
|---|---|---|---|
| Central bank | `CentralBankMSP` | `centralbank.sworna.example.com` | `peer0.centralbank.sworna.example.com:7051` |
| Bank A | `BankAMSP` | `banka.sworna.example.com` | `peer0.banka.sworna.example.com:9051` |
| Bank B | `BankBMSP` | `bankb.sworna.example.com` | `peer0.bankb.sworna.example.com:11051` |

Channel: `settlement`. Orderer: `orderer.sworna.example.com:7050` (single-node
Raft in dev; more orderers in the lab/Phase 4).

## Bring-up

```bash
./network.sh up createChannel -ca        # centralbank + banka, channel settlement
./network/addOrg3/addOrg3.sh up          # bankb joins the channel
./network.sh deployCCAAS -ccn tokenchaincode -ccp ../token-services/tokenchaincode -cci init -ccs 1
./network.sh down                        # teardown
```

Prerequisites: the Fabric binaries/images installed into `bin/`/`config/` at
the repo root (see the root README, or `./scripts/install-fabric-tools.sh`).

## Layout

- `configtx/` — organizations, MSPs, channel, Raft profile.
- `organizations/` — Fabric CA registration/enrollment scripts; generated crypto
  is gitignored.
- `compose/` — docker compose for CAs, orderers, peers (docker + podman).
- `scripts/` — channel creation, CCAAS deployment, org3 join helpers.
- `addOrg3/` — the "a bank joins the settlement network" flow (bank B).

## Notes

- `bft-config/` and the `-bft`/couch/podman/deployCC paths are retained from the
  upstream network for future phases (SmartBFT, CouchDB); we currently run
  single Raft orderer + LevelDB + chaincode-as-a-service.
- Docs: [docs/DEMO.md](../docs/DEMO.md) · [docs/token-network](../docs/token-network).