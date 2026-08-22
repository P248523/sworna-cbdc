# ADR-0008: Two-tier retail + wholesale hybrid model

**Status:** Accepted
**Date:** 2026-08-18
**Applies to:** all phases

## Context

CBDC deployments are either **one-tier** (central bank holds accounts for all end users directly) or **two-tier** (central bank issues to commercial banks, which distribute to customers). Two-tier is the globally dominant model and keeps the central bank out of the retail relationship. It also supports **wholesale** flows (interbank settlement) on the same network. The user chose a two-tier hybrid with both retail and wholesale use cases, consistent with the BSP Project Agila wholesale pilot on Hyperledger Fabric [R18][R19].

## Decision

Adopt a **two-tier hybrid** model: Tier 1 — central bank issues/redeems SWR with commercial banks and supports interbank (wholesale) settlement; Tier 2 — commercial banks serve retail customers through owner nodes and wallets. Both tiers run on the same Fabric network.

## Consequences

**Positive:** realistic and globally accepted model; supports both retail and wholesale demo flows; central bank retains monetary-policy authority.
**Negative/risks:** two-tier introduces the bank layer as an intermediary (end-user privacy vs. bank visibility trade-offs, handled by ADR-0006); more moving parts than a one-tier prototype.

## References

- Project Agila (BSP wholesale CBDC on Fabric): https://bitpinas.com/regulation/bsp-reveals-blockchain-tapped-cbdc/ [R18]; https://www.bworldonline.com/banking-finance/2023/09/08/544321/bsp-picks-technology-for-central-bank-digital-currency-pilot-run/ [R19]
- CBDC landscape: https://www.linuxfoundation.org/hubfs/Hyperledger_CBDC%20ebook_V2.pdf [R20]
