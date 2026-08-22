# ADR-0004: Central bank operates both the issuer and the auditor roles

**Status:** Accepted
**Date:** 2026-08-18
**Applies to:** Phase 3 onward

## Context

The token-sdk model has three layer-2 roles: **issuer** (mints/creates tokens), **owner** (holds wallets and transfers), and **auditor** (validates and signs every transaction; sees all amounts and parties) [R13]. In a real CBDC, only the central bank may create currency, and the central bank has supervisory/AML authority over all transactions — mirrored by the audit function in the BSP Project Agila design and the global two-tier CBDC model [R18][R19][R20][R21].

## Decision

The central bank operates both the **issuer node** and the **auditor node**. Commercial banks operate **owner nodes** holding customer wallets. In Phase 4, the auditor layer becomes the compliance/AML rule engine (limits, holds, sanctions).

## Consequences

**Positive:** matches the real-world role of a central bank; central bank has full oversight via the auditor; no separate compliance organization needed for the prototype.
**Negative/risks:** central bank becomes a single point of trust for supervision — acceptable for a prototype; the auditor is a bottleneck by design (every transaction must be signed), so its throughput is a Phase-5 benchmark target.

## References

- token-sdk roles (issuer/auditor/owner): https://github.com/hyperledger/fabric-samples/tree/main/token-sdk [R13]
- Project Agila (BSP wholesale CBDC on Fabric): https://bitpinas.com/regulation/bsp-reveals-blockchain-tapped-cbdc/ [R18]; https://www.bworldonline.com/banking-finance/2023/09/08/544321/bsp-picks-technology-for-central-bank-digital-currency-pilot-run/ [R19]
- CBDC landscape: https://www.linuxfoundation.org/hubfs/Hyperledger_CBDC%20ebook_V2.pdf [R20]
