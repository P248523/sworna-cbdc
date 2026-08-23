#!/usr/bin/env bash
#
# Bring up (or tear down) a commercial bank's Fabric peer + CA on the bank's
# OWN VM, join the `settlement` channel (which lives on the central-bank host),
# and install the CCAAS token-chaincode container for this peer.
#
# The channel + chaincode definition are already committed on the CB host, so a
# bank only needs to: start CA + peer, join the channel, install the chaincode
# package (same PACKAGE_ID the CB used) and run its chaincode container.
#
# Usage: ./scripts/bank-network.sh up|down
# Env:   BANK_NUM=2|3     (2 = banka, 3 = bankb)  -- required
#        SWORNA_CB_HOST   IP of the central-bank host -- required for `up`
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
NETWORK="$ROOT/network"
cd "$NETWORK"
export PATH="$ROOT/bin:$PATH"
export FABRIC_CFG_PATH="$ROOT/config"

MODE="${1:-up}"
CHANNEL=settlement
CC_NAME=tokenchaincode
CC_VERSION=1
CC_SEQUENCE=1
CCAAS_SERVER_PORT=9999

case "${BANK_NUM:-}" in
  2)
    BANK_PROFILE=banka
    BANK_ORG=banka; BANK_MSP=BankAMSP
    BANK_PEER_PORT=9051; BANK_CC_PORT=9052; BANK_CA_PORT=8054
    BANK_CA_NAME=ca-org2; BANK_CA_CONT=ca_org2
    CCAAS_PEERNAME=peer0org2
    ;;
  3)
    BANK_PROFILE=bankb
    BANK_ORG=bankb; BANK_MSP=BankBMSP
    BANK_PEER_PORT=11051; BANK_CC_PORT=11052; BANK_CA_PORT=9054
    BANK_CA_NAME=ca-org3; BANK_CA_CONT=ca_org3
    CCAAS_PEERNAME=peer0org3
    ;;
  *)
    echo "ERROR: BANK_NUM must be 2 (banka) or 3 (bankb)" >&2
    exit 1
    ;;
esac

log_info() { printf '[%s] INFO: %s\n' "$(date +'%H:%M:%S')" "$*"; }
log_error() { printf '[%s] ERROR: %s\n' "$(date +'%H:%M:%S')" "$*" >&2; }

org_dir="$NETWORK/organizations/peerOrganizations/${BANK_ORG}.sworna.example.com"
orderer_dir="$NETWORK/organizations/ordererOrganizations/sworna.example.com"
block_file="$NETWORK/channel-artifacts/${CHANNEL}.block"

check_bundle() {
  local missing=0
  [[ -d "$org_dir" ]] || { log_error "join bundle missing: $org_dir"; missing=1; }
  [[ -d "$orderer_dir" ]] || { log_error "join bundle missing: $orderer_dir"; missing=1; }
  [[ -f "$block_file" ]] || { log_error "join bundle missing: $block_file"; missing=1; }
  [[ $missing -eq 0 ]]
}

peer_up() {
  check_bundle
  export SWORNA_CB_HOST="${SWORNA_CB_HOST:?SWORNA_CB_HOST (CB host IP) must be set}" \
         DOCKER_SOCK="${DOCKER_SOCK:-/var/run/docker.sock}"

  log_info "starting ${BANK_ORG} CA + peer containers"
  docker compose --profile "$BANK_PROFILE" -f compose/compose-bank-peer.yaml up -d

  log_info "waiting for the ${BANK_ORG} peer to accept connections"
  . "$NETWORK/scripts/envVar.sh"
  export TEST_NETWORK_HOME="$NETWORK"
  local ok=0
  for i in $(seq 1 30); do
    if setGlobals "${BANK_NUM}" >/dev/null 2>&1 && peer lifecycle chaincode queryinstalled >/dev/null 2>&1; then
      ok=1; break
    fi
    sleep 2
  done
  [[ $ok -eq 1 ]] || { log_error "peer did not come up"; return 1; }

  log_info "joining peer0.${BANK_ORG} to channel '${CHANNEL}'"
  setGlobals "${BANK_NUM}" >/dev/null 2>&1
  peer channel join -b "$block_file"

  install_ccaas
}

install_ccaas() {
  log_info "building the ${CC_NAME} CCAAS image (first run only)"
  if ! docker image inspect "${CC_NAME}_ccaas_image:latest" >/dev/null 2>&1; then
    docker build -f "$ROOT/token-services/tokenchaincode/Dockerfile" \
      -t "${CC_NAME}_ccaas_image:latest" --build-arg CC_SERVER_PORT="$CCAAS_SERVER_PORT" \
      "$ROOT/token-services/tokenchaincode"
  fi

  log_info "packaging + installing chaincode on the ${BANK_ORG} peer"
  tempdir=$(mktemp -d)
  trap 'rm -rf -- "$tempdir"' RETURN
  mkdir -p "$tempdir/src" "$tempdir/pkg"
  printf '{"address":"%s_%s_ccaas:%s","dial_timeout":"10s","tls_required":false}\n' \
    "$CCAAS_PEERNAME" "$CC_NAME" "$CCAAS_SERVER_PORT" > "$tempdir/src/connection.json"
  printf '{"type":"ccaas","label":"%s_%s"}\n' "$CC_NAME" "$CC_VERSION" > "$tempdir/pkg/metadata.json"
  tar -C "$tempdir/src" -czf "$tempdir/pkg/code.tar.gz" .
  tar -C "$tempdir/pkg" -czf "$NETWORK/${CC_NAME}.tar.gz" metadata.json code.tar.gz

  PACKAGE_ID=$(peer lifecycle chaincode calculatepackageid "$CC_NAME.tar.gz")

  if peer lifecycle chaincode queryinstalled --output json \
       | jq -r 'try (.installed_chaincodes[].package_id)' | grep -qx "$PACKAGE_ID"; then
    log_info "chaincode already installed (${PACKAGE_ID})"
  else
    peer lifecycle chaincode install "$CC_NAME.tar.gz"
  fi

  log_info "starting ${CCAAS_PEERNAME}_${CC_NAME}_ccaas chaincode container"
  docker run --rm -d --name "${CCAAS_PEERNAME}_${CC_NAME}_ccaas" --network fabric_test \
    -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:${CCAAS_SERVER_PORT} \
    -e CHAINCODE_ID="$PACKAGE_ID" -e CORE_CHAINCODE_ID_NAME="$PACKAGE_ID" \
    "${CC_NAME}_ccaas_image:latest"
}

peer_down() {
  docker rm -f "${CCAAS_PEERNAME}_${CC_NAME}_ccaas" 2>/dev/null || true
  export SWORNA_CB_HOST="${SWORNA_CB_HOST:-127.0.0.1}" \
         DOCKER_SOCK="${DOCKER_SOCK:-/var/run/docker.sock}"
  docker compose --profile "$BANK_PROFILE" -f compose/compose-bank-peer.yaml down
}

case "$MODE" in
  up)   peer_up ;;
  down) peer_down ;;
  *)    echo "usage: $0 up|down" >&2; exit 1 ;;
esac

log_info "done."