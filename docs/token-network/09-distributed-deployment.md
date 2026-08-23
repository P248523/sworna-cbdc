# Token network — distributed deployment (3 hosts)

> **Status: PLANNED — not yet validated.** The lab split (CB host + Bank A VM +
> Bank B VM) works only after the cross-host networking below is exercised. The
> all-in-one deployment (everything on one host) is the validated reference —
> see [SETUP.md](../SETUP.md). Everything in this document is the "make it
> real across hosts" plan.

## 1. Host → role map

| Host | Runs (containers/services) | Notable ports |
|---|---|---|
| Central bank VM | orderer · peers (centralbank, banka, bankb) · Fabric CAs · token CA · issuer · auditor · backend · CB portal | 7050/7053, 7051/9051/11051, 7054/8054/9054, 27054, 9000, 9100, 8000, 5173 |
| Bank A VM | owner1 · bank A portal | 9200, 5173 |
| Bank B VM | owner2 · bank B portal | 9300, 5173 |

The Fabric peers/orderer currently run **on the CB host** (that is what
`network.sh up` + `addOrg3` do). Bank VMs run only the owner FSC service and
the portal; they reach the network **back to the CB host**.

> Relocating a bank's peer to its own VM (true distributed peer-join) is the
> explicitly unvalidated step from [DEPLOYMENT.md](../DEPLOYMENT.md) §4. The
> owner-service split below is the first distributed milestone.

## 2. What the owner service needs to resolve

From `token-services/owner/conf/owner{1,2}/core.yaml` (read them — they are
authoritative), each owner FSC node connects to:

| Hostname | Port | Purpose | Runs on |
|---|---|---|---|
| `auditor.sworna.example.com` | 9001 | FSC P2P bootstrap | CB host |
| `issuer.sworna.example.com` | 9101 | FSC P2P | CB host |
| `owner1.sworna.example.com` | 9201 | FSC P2P | Bank A VM |
| `owner2.sworna.example.com` | 9301 | FSC P2P | Bank B VM |
| `orderer.sworna.example.com` | 7050 | ordering service | CB host |
| `peer0.banka.sworna.example.com` | 9051 | Fabric peer (owner1) | CB host |
| `peer0.bankb.sworna.example.com` | 11051 | Fabric peer (owner2) | CB host |

TLS `serverNameOverride` means these hostnames must match the certificates —
you cannot connect by bare IP.

## 3. Cross-host requirements (the gaps to close)

### 3.1 DNS

Containers do not see the host's `/etc/hosts`. Add `extra_hosts` to the owner
services in `token-services/docker-compose.yaml` mapping every hostname above
to the owning host's Tailscale IP. Example for the Bank A owner:

```yaml
  owner1:
    extra_hosts:
      - "auditor.sworna.example.com:100.72.112.29"
      - "issuer.sworna.example.com:100.72.112.29"
      - "orderer.sworna.example.com:100.72.112.29"
      - "peer0.banka.sworna.example.com:100.72.112.29"
      - "owner1.sworna.example.com:<BANKA-IP>"
      - "owner2.sworna.example.com:<BANKB-IP>"
```

(An alternative is a lab DNS entry for `*.sworna.example.com`, but
`extra_hosts` needs no DNS server.)

### 3.2 Publish the FSC P2P ports

The compose file only `expose`s the P2P ports (9001/9101/9201/9301) — that is
sufficient inside the single-host Docker network but **not reachable from other
hosts**. Publish them on each host:

```yaml
  auditor:
    ports:
      - 9001:9001        # so bank owners can bootstrap to the auditor
  issuer:
    ports:
      - 9101:9101
  owner1:
    ports:
      - 9201:9001        # bank host publishes owner1's P2P port
  owner2:
    ports:
      - 9301:9001
```

### 3.3 Firewall / Tailscale

Tailscale nodes accept traffic between themselves by default; if the VMs run a
host firewall (`ufw`), allow the tailnet interface. Services must bind
`0.0.0.0` (the compose `ports:` mappings already do).

### 3.4 The join bundle must include the org crypto

The owner containers mount `../network/organizations` for TLS certs and MSPs
(`/var/fsc/fabric/organizations`). On a bank VM this directory does not exist
(fresh clone). Copy from the CB host:

```bash
# from the CB host, for Bank A:
scp -r ~/CBDC/token-services/keys/owner1 sapiens@<BANKA-IP>:~/CBDC/token-services/keys/
scp -r ~/CBDC/network/organizations/peerOrganizations/banka.sworna.example.com \
        sapiens@<BANKA-IP>:~/CBDC/network/organizations/peerOrganizations/
scp -r ~/CBDC/network/organizations/ordererOrganizations/sworna.example.com \
        sapiens@<BANKA-IP>:~/CBDC/network/organizations/ordererOrganizations/
```

The bank deploy scripts now fail fast if either `keys/` or the org crypto is
missing, so a missing bundle cannot silently mis-start.

## 4. Validation checklist (run once, record the result)

- [ ] Bank A VM: `curl http://<BANKA-IP>:9200/api/v1/readyz` → ready
- [ ] Bank B VM: `curl http://<BANKB-IP>:9300/api/v1/readyz` → ready
- [ ] From CB host, issuer reaches owner1 P2P (`owner1.sworna.example.com:9201`)
- [ ] CB issues SWR to a Bank A customer → balance appears on the bank portal
- [ ] Cross-bank transfer A → B commits and shows on both portals + auditor
- [ ] Redeem from Bank B works

When this checklist passes, promote the status at the top of this file and
update [DEPLOYMENT.md](../DEPLOYMENT.md) §4.

## 5. Related docs

- [SETUP.md](../SETUP.md) — the all-in-one runbook (validated)
- [DEPLOYMENT.md](../DEPLOYMENT.md) — roles, ports, progression
- [08-provisioning.md](08-provisioning.md) — wallet pools & the join bundle
- [05-engine-deep-dive.md](05-engine-deep-dive.md) — the Go engine's hostnames