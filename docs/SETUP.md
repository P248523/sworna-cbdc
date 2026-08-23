# SETUP — step-by-step host bring-up

> **Status: v2 — verified.** This is the authoritative runbook for standing up a
> Sworna host from a fresh machine (dev laptop or lab VM). Follow it top to
> bottom for the central-bank host, then again (Bank A / Bank B sections) for
> each bank host. It is written so a human **or an AI agent** can execute it
> verbatim; agent guidance is in the last section.

One repository; a machine's role is decided by **which script it runs** and
**which keys it holds**.

| Host | Script | Runs |
|---|---|---|
| Central bank | `scripts/deploy-centralbank.sh` | orderer · 3 peers · CAs · token CA · issuer/auditor · backend · CB portal |
| Bank A | `scripts/deploy-banka.sh` | owner1 service · bank A portal |
| Bank B | `scripts/deploy-bankb.sh` | owner2 service · bank B portal |

> **Before you start — do not skip.** The repo's `token-services/keys/` folder
> is **gitignored**. A fresh clone has **no identities**, so the token engine
> will not start until identities are enrolled and banks are provisioned. The
> deployment scripts handle this on the central-bank host; bank hosts receive
> their keys as a *join bundle* from the CB.

---

## 1. Preflight (all hosts)

Run these on the host you are setting up.

### 1.1 OS packages

Ubuntu/Debian example:

```bash
sudo apt update && sudo apt install -y \
  git curl jq python3 python3-venv python3-pip tar \
  ca-certificates gnupg lsb-release
```

### 1.2 Docker + compose (v2 plugin required)

The scripts use the `docker compose` (v2) command. Install Docker Engine via
the official repo, then verify:

```bash
docker --version
docker compose version          # must print "Docker Compose version v2..."
sudo usermod -aG docker "$USER" # re-login (or newgrp docker) after this
docker run --rm hello-world     # sanity check
```

> If the machine has no `docker compose` v2, the `network.sh` and deploy
> scripts will fail. Do not install the old `docker-compose` v1 binary.

### 1.3 Node.js ≥ 18 (for the portal)

Ubuntu's apt `nodejs` is too old for Vite 5. Install Node 20 from NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v    # >= 18
```

### 1.4 Time sync

Fabric TLS certificates fail when clocks drift. Ensure NTP is on:

```bash
sudo timedatectl set-ntp true
timedatectl status   # "System clock synchronized: yes"
```

### 1.5 Swap (recommended for 8 GB hosts)

The Go engine builds inside Docker and can OOM on small VMs. Cheap insurance:

```bash
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 1.6 Reachability (lab VMs over Tailscale)

From your laptop, confirm the host is reachable before deploying:

```bash
ping 100.72.112.29              # CB VM example
ssh sapiens@100.72.112.29
```

---

## 2. Get the code + Fabric tools

### 2.1 Clone the repo

```bash
git clone https://github.com/sapienskid/sworna-cbdc.git ~/CBDC
cd ~/CBDC
```

### 2.2 Fabric binaries + config + images

The repo owns real `bin/` and `config/` directories (no `fabric-samples`
checkout is needed). Install the pinned Fabric tools directly:

```bash
cd ~/CBDC
./scripts/install-fabric-tools.sh
```

This downloads the Fabric **3.1.5** binaries + config and the CA **1.5.22**
binaries into `bin/`/`config/`, and pulls the Docker images
(`hyperledger/fabric-{peer,orderer,ccenv,baseos}:3.1.5`,
`hyperledger/fabric-ca:1.5.22`). It is the only large download in the whole
setup, and it is safe to re-run.

### 2.3 Verify the toolchain

```bash
cd ~/CBDC
bin/fabric-ca-client version   # works -> bin/ is good
ls config                      # configtx.yaml, core.yaml, orderer.yaml
docker images | grep -E '3\.1\.5|1\.5\.22'
```

Expected: `hyperledger/fabric-{peer,orderer,ccenv,baseos}:3.1.5` and
`hyperledger/fabric-ca:1.5.22`.

> **Note for AI agents:** the backend derives all repo paths from the file
> location (`backend/app/paths.py`), so no `SWORNA_BIN` /
> `SWORNA_TOKEN_SERVICES` env vars are needed at any clone path.

---

## 3. Central-bank host bring-up

Run on the CB host (all-in-one dev laptop, or the CB VM):

```bash
cd ~/CBDC
./scripts/deploy-centralbank.sh --provision
```

The script does (see the script header for the canonical list):

| Step | What happens |
|---|---|
| 1/5 | Fabric network up: centralbank + banka orgs, channel `settlement` |
| 2/5 | Bank B joins the channel (`addOrg3`) |
| 3/5 | Deploy the ZK token chaincode to all 3 orgs |
| 4/5 | Token CA up → **enroll identities** (auto, one-time) → issuer + auditor |
| 5/5 | Banking backend (:8000) + CB portal (:5173) |
| --provision | Generate wallet-pool keys for banks 001/002 (join bundles) |

### 3.1 First-run identity enrollment (automatic)

On a **fresh clone** the script enrolls all token identities once:
`token-services/scripts/enroll-users.sh` creates the FSC node identities
(`fsc{issuer,auditor,owner1,owner2}`), the issuer/auditor wallet users, and the
demo customer wallets (`alice`, `bob`, `carlos`, `dan`). It is guarded so it
only runs when `token-services/keys/issuer/fsc` is missing — safe to re-run the
deploy script.

### 3.2 Wait conditions

- The engine nodes join the FSC bootstrap in ~20 s after start. If the portal
  reports `communication service not ready`, **wait and retry** — do not
  restart anything.
- If `--provision` ran before the backend was ready, the script prints a note.
  Provision later from the portal (see §4.2) — provisioning is idempotent.

### 3.3 Verify the CB host

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}'
```

Expected running: orderer, 3 peers, 3 Fabric CAs, `ca_token_network`, `issuer`,
`auditor`, `swagger-ui`. The issuer/auditor rows should show `healthy`
(healthcheck hits `/api/v1/readyz`).

```bash
curl -s http://localhost:8000/healthz    # {"status":"ok"}
curl -s http://localhost:9000/api/v1/readyz   # issuer/auditor FSC readiness
```

Then, from your **laptop browser** over Tailscale:

| URL | What |
|---|---|
| `http://<CB-IP>:5173` | CB portal — login `cbadmin` / `sworna-cb` |
| `http://<CB-IP>:8000/docs` | Backend API docs |
| `http://<CB-IP>:8080` | Token engine swagger (issuer/auditor/owner APIs) |

On the CB portal, check the **Ledger** page shows `settlement` with growing
block height — this proves the peer CLI + path wiring works.

---

## 4. Provisioning & join bundles

### 4.1 What provisioning does

The central bank is the trust anchor. `--provision` (or
`POST /api/v1/admin/banks/{code}/provision`) generates the **idemix wallet key
material** for each bank's declared pool wallets (`pool_w1..pool_w10` for
owner1, `pool_b2_w1..` for owner2) into `token-services/keys/`. These keys,
plus the committed owner confs, form the bank's **join bundle**.

### 4.2 Provision (if not done by the script)

From the CB portal → Banks → "Generate keys" for 001 and 002, or:

```bash
TOKEN=$(curl -sf -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"cbadmin","password":"sworna-cb"}' | jq -r .token)
curl -sf -X POST http://localhost:8000/api/v1/admin/banks/001/provision \
  -H "Authorization: Bearer $TOKEN"
curl -sf -X POST http://localhost:8000/api/v1/admin/banks/002/provision \
  -H "Authorization: Bearer $TOKEN"
```

Provisioning is **idempotent** — re-running only tops up missing wallets.

### 4.3 Export the join bundles

The bundle is `token-services/keys/` plus the committed owner confs. Copy the
per-bank key folders to each bank host **over a trusted channel**
(Tailscale/SSH):

```bash
# from the CB host:
scp -r ~/CBDC/token-services/keys/owner1 sapiens@<BANKA-IP>:~/CBDC/token-services/keys/
scp -r ~/CBDC/token-services/keys/owner2 sapiens@<BANKB-IP>:~/CBDC/token-services/keys/
```

> The bundle contains idemix private keys — treat it as a secret.

---

## 5. Bank host bring-up

On each bank VM (clone the repo + Fabric tools first — §1 and §2), then:

### 5.1 Bank A

```bash
# install the join bundle (already copied in §4.3):
ls ~/CBDC/token-services/keys/owner1   # must list pool_w* + alice + bob + fsc
cd ~/CBDC && ./scripts/deploy-banka.sh
```

### 5.2 Bank B

```bash
ls ~/CBDC/token-services/keys/owner2   # must list pool_b2_w* + carlos + dan + fsc
cd ~/CBDC && ./scripts/deploy-bankb.sh
```

Each script starts the bank's **owner service** and the **bank portal**, then
prints the login (`banka_admin` / `bankb_admin`, password `sworna-bank`).

### 5.3 DNS — reaching the CB network

The owner services resolve Fabric + FSC hostnames
(`orderer.sworna.example.com`, `peer0.banka.sworna.example.com`,
`auditor.sworna.example.com`, …). On the dev all-in-one host the Docker
`fabric_test` network resolves them; **across hosts they do not**. See
[docs/token-network/09-distributed-deployment.md](token-network/09-distributed-deployment.md)
for the DNS/publish options — this is the step being validated for the lab.

---

## 6. Verification checklists

### 6.1 Central-bank host

- [ ] `docker ps` shows orderer, 3 peers, 3 CAs, token CA, issuer, auditor healthy
- [ ] `curl :8000/healthz` → `{"status":"ok"}`
- [ ] CB portal at `:5173` logs in with `cbadmin` / `sworna-cb`
- [ ] Ledger page shows `settlement` with blocks
- [ ] Banks 001/002 show pool manifests (provisioned)
- [ ] Engine swagger at `:8080` lists issuer/auditor/owner endpoints

### 6.2 Bank A host

- [ ] `docker ps` shows `owner1` healthy
- [ ] Bank portal at `:5173/b/001` logs in with `banka_admin` / `sworna-bank`
- [ ] Owner API up: `curl -s http://localhost:9200/api/v1/readyz`

### 6.3 Bank B host

- [ ] `docker ps` shows `owner2` healthy
- [ ] Bank portal at `:5173/b/002` logs in with `bankb_admin` / `sworna-bank`
- [ ] Owner API up: `curl -s http://localhost:9300/api/v1/readyz`

### 6.4 End-to-end (once banks are up)

```bash
cd ~/CBDC && ./scripts/demo.sh   # issue -> transfers (intra + cross) -> redeem
```

---

## 7. Demo reference

| Account | Owner | Wallet |
|---|---|---|
| `SWR-001-00000001` | Alice Adhikari | `alice` |
| `SWR-001-00000002` | Bob Basnet | `bob` |
| `SWR-002-00000001` | Carlos Chhetri | `carlos` |
| `SWR-002-00000002` | Dan Dhakal | `dan` |

Logins: CB `cbadmin`/`sworna-cb` · bank staff `banka_admin`/`bankb_admin`/
`sworna-bank` · customers `alice`/`bob`/`carlos`/`dan`/`sworna-pass`.

---

## 8. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `communication service not ready` | FSC nodes need ~20 s to join the bootstrap (auditor) after start. Wait and retry the request. |
| `no free wallets; provision more` | Bank's wallet pool exhausted. Run `POST /admin/banks/{code}/provision` (portal "Generate keys"). |
| Engine containers restart / not healthy | Missing identities on a fresh clone. Ensure `token-services/keys/{issuer,auditor,owner1,owner2}/fsc` exist; re-run `deploy-centralbank.sh` (enroll step is idempotent) or `token-services/scripts/enroll-users.sh` manually. |
| `docker compose` command not found | Compose v2 plugin not installed (§1.2). |
| Provisioning fails with `fabric-ca-client failed` | `bin/` not installed or token CA not up. Run `./scripts/install-fabric-tools.sh` and check `docker ps` for `ca_token_network`. |
| CB portal "Ledger" page errors | Old hardcoded paths. Pull the latest `main` (path fix in `backend/app/paths.py`) and restart the backend. |
| `account not found` | Account numbers look like `SWR-001-00000001` — paste exactly. |
| OOM during `docker compose up --build` | Add swap (§1.5) or build engine images on a bigger host and `docker save`/`load`. |
| Cross-host owner service can't reach peers | See §5.3 + [09-distributed-deployment.md](token-network/09-distributed-deployment.md). |

Logs live in `/tmp/sworna-backend.log`, `/tmp/sworna-web.log`, plus per-service
`docker logs <container>`.

---

## 9. Full reset

```bash
cd ~/CBDC
./network/network.sh down
rm -rf token-services/{keys,data}
rm -f backend/sworna.db
# re-run: ./scripts/deploy-centralbank.sh --provision
```

---

## 10. For AI agents

Rules for operating this stack without human back-and-forth:

- **Idempotency:** every script and provisioning call may be re-run safely.
  The enroll step and pool provisioning only create what is missing.
- **Detection:** success = the exact checks in §6 pass; failure = exit
  non-zero, a container in `Restarting`, or a curl timeout. Read
  `/tmp/sworna-*.log` and `docker logs` before deciding a retry is safe.
- **Do not restart blindly:** `communication service not ready` resolves with a
  ~20 s wait, not a restart. Retry the request, not the service.
- **Fresh clone checklist:** after `git clone`, `keys/` is empty — the deploy
  script enrolls identities automatically, but never try to start the engine
  before `keys/issuer/fsc` exists.
- **Paths:** all backend paths derive from the repo location
  (`backend/app/paths.py`); never export `SWORNA_BIN`/`SWORNA_NETWORK_HOME`
  unless overriding deliberately.
- **Join bundles:** bank VMs must receive `token-services/keys/{owner1,owner2}`
  from the CB before their deploy script runs — the script exits if `keys/` is
  absent.
- **Cross-host networking** is not yet validated in the lab; for now assume
  all-in-one hosts unless [09-distributed-deployment.md](token-network/09-distributed-deployment.md) says otherwise.