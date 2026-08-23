# AGENTS — operating the Sworna stack

Quickstart for AI agents and anyone automating this repo. The authoritative
runbook is [docs/SETUP.md](docs/SETUP.md); read it before doing anything.

## Roles & the one command each

| Role | Command | Notes |
|---|---|---|
| Central bank | `./scripts/deploy-centralbank.sh --provision` | network + chaincode + identity enrollment + issuer/auditor + backend + portal + bank wallet pools |
| Bank A / B | `./scripts/deploy-banka.sh` / `deploy-bankb.sh` | needs the join bundle (`token-services/keys/`) + org crypto (`network/organizations/`) copied from the CB first |
| Demo | `./scripts/demo.sh` | needs owner1/owner2 running |
| Teardown | `./network/network.sh down` | also `rm -rf token-services/{keys,data} backend/sworna.db` for a full reset |

## Rules

- **Idempotent by design.** Scripts and provisioning calls can be re-run; the
  identity-enroll and wallet-pool steps only create what is missing. Never fear
  a re-run; fear an unexplained failure.
- **Fresh clones have no identities.** `token-services/keys/` is gitignored.
  The CB deploy script enrolls identities automatically — never start the
  engine manually before `token-services/keys/issuer/fsc` exists.
- **Don't restart on `communication service not ready`.** FSC nodes take ~20 s
  to join the auditor bootstrap. Wait and retry the request.
- **Paths are derived.** `backend/app/paths.py` computes all repo paths from the
  file location; do not export `SWORNA_BIN`/`SWORNA_NETWORK_HOME`/
  `SWORNA_FABRIC_CFG`/`SWORNA_TOKEN_SERVICES` unless overriding deliberately.
- **Docker Compose v2 only.** Use `docker compose`, never `docker-compose`.

## Verification

Success = the checks in [docs/SETUP.md](docs/SETUP.md) §6 pass. Read
`/tmp/sworna-backend.log` and `/tmp/sworna-web.log` plus `docker logs` on
failure. Cross-host networking is unvalidated — assume all-in-one hosts (see
[docs/token-network/09-distributed-deployment.md](docs/token-network/09-distributed-deployment.md)).

## Known failure modes → fixes

See [docs/SETUP.md](docs/SETUP.md) §8 (troubleshooting table): missing keys,
compose v2 absent, OOM during build, "no free wallets", "account not found".