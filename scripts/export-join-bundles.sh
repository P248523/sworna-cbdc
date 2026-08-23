#!/usr/bin/env bash
#
# Package each bank's "join bundle" so it can be scp'd to the bank's VM.
#
# A bank bundle contains everything a bank host needs that is NOT in the git
# repo (all gitignored, generated on the CB host):
#   - token-services/keys/<owner>          the idemix wallets the CB provisioned
#   - network/organizations/peerOrganizations/<org>   peer + admin crypto
#   - network/organizations/ordererOrganizations      orderer TLS CA (to reach CB)
#   - network/organizations/fabric-ca/<org>           the org's Fabric CA data
#   - network/channel-artifacts/settlement.block      genesis block to join
#
# Output: dist-bank-bundles/banka.tar.gz and bankb.tar.gz
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
OUT="$ROOT/dist-bank-bundles"
mkdir -p "$OUT"

pack() {
  local bank="$1"; shift
  local tarfile="$OUT/${bank}.tar.gz"
  log_info "packing $bank bundle -> $tarfile"
  tar -czf "$tarfile" -C "$ROOT" "$@"
}

log_info() { printf '[%s] INFO: %s\n' "$(date +'%H:%M:%S')" "$*"; }

pack banka \
  token-services/keys/owner1 \
  network/organizations/peerOrganizations/banka.sworna.example.com \
  network/organizations/ordererOrganizations/sworna.example.com \
  network/organizations/fabric-ca/org2 \
  network/channel-artifacts/settlement.block

pack bankb \
  token-services/keys/owner2 \
  network/organizations/peerOrganizations/bankb.sworna.example.com \
  network/organizations/ordererOrganizations/sworna.example.com \
  network/addOrg3/fabric-ca/org3 \
  network/channel-artifacts/settlement.block

log_info "bundles ready in $OUT — copy each tarball to its bank VM and extract under the repo root."
log_info "  scp $OUT/banka.tar.gz sapiens@<BANKA-IP>:~/CBDC/  &&  (cd ~/CBDC && tar xzf banka.tar.gz)"
log_info "  scp $OUT/bankb.tar.gz sapiens@<BANKB-IP>:~/CBDC/  &&  (cd ~/CBDC && tar xzf bankb.tar.gz)"