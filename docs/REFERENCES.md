# References — Sworna CBDC planning sources

Canonical bibliography. Every claim in this documentation set traces to one of the sources below. All links were fetched and verified during the planning session (August 2026).

## Hyperledger Fabric official documentation

| ID | Source | URL |
|---|---|---|
| R1 | Hyperledger Fabric — "What's new" (v3.1 write/read batching, v3.0 SmartBFT + Ed25519, v2.5 LTS) | https://hyperledger-fabric.readthedocs.io/en/latest/whatsnew.html |
| R2 | Hyperledger Fabric — "Configuring and operating a BFT ordering service" (4 consenters, V3_0 channel capability) | https://hyperledger-fabric.readthedocs.io/en/latest/bft_configuration.html |
| R3 | Hyperledger Fabric — "Using the Fabric test network" (Raft default, `-bft` → 4 orderers, `-ca`, `-s couchdb`) | https://hyperledger-fabric.readthedocs.io/en/latest/test_network.html |
| R4 | Hyperledger Fabric — "Writing Your First Chaincode" (supported languages: Go, Node.js, Java) | https://hyperledger-fabric.readthedocs.io/en/latest/chaincode4ade.html |
| R5 | Hyperledger Fabric v2.5 — "What's new" (LTS release notes) | https://hyperledger-fabric.readthedocs.io/en/release-2.5/whatsnew.html |
| R6 | Hyperledger Fabric v3.1.5 release notes | https://github.com/hyperledger/fabric/releases/tag/v3.1.5 |

## Hyperledger / LF projects and repositories

| ID | Source | URL |
|---|---|---|
| R7 | LF Decentralized Trust — Hyperledger Fabric project page (Fabric vs Fabric-X positioning) | https://www.lfdecentralizedtrust.org/projects/fabric |
| R8 | Hyperledger Fabric-X repository (peer decomposition, Arma BFT, single-channel namespaces, 200k+ TPS CBDC benchmark) | https://github.com/hyperledger/fabric-x |
| R9 | Fabric-X whitepaper (IACR ePrint 2023/1717) | https://eprint.iacr.org/2023/1717.pdf |
| R10 | Arma consensus paper (arXiv 2405.16575) | https://arxiv.org/abs/2405.16575 |
| R11 | SmartBFT consensus paper (arXiv 2107.06922) | https://arxiv.org/abs/2107.06922 |
| R12 | Panurus (formerly Fabric Token SDK) — tokenization APIs, Fabric Smart Client | https://github.com/LFDT-Panurus/panurus |
| R13 | fabric-samples `token-sdk` sample — REST services, UTXO, ZK proofs, auditor, tokengen | https://github.com/hyperledger/fabric-samples/tree/main/token-sdk |
| R14 | Hyperledger Fabric Gateway (client APIs: Go, Node, Java) | https://github.com/hyperledger/fabric-gateway |
| R15 | Hyperledger Caliper (blockchain performance benchmark framework) | https://github.com/hyperledger-caliper/caliper |
| R16 | Fabric-X samples | https://github.com/hyperledger/fabric-x-samples |
| R17 | Fabric-X Ansible collection (deployment) | https://github.com/LF-Decentralized-Trust-labs/fabric-x-ansible-collection |

## CBDC and central-bank references

| ID | Source | URL |
|---|---|---|
| R18 | BSP (Philippines) selects Hyperledger Fabric for Project Agila wholesale CBDC pilot — BitPinas | https://bitpinas.com/regulation/bsp-reveals-blockchain-tapped-cbdc/ |
| R19 | BSP picks Hyperledger Fabric for CBDC pilot — BusinessWorld | https://www.bworldonline.com/banking-finance/2023/09/08/544321/bsp-picks-technology-for-central-bank-digital-currency-pilot-run/ |
| R20 | Linux Foundation — "Hyperledger CBDC" ebook | https://www.linuxfoundation.org/hubfs/Hyperledger_CBDC%20ebook_V2.pdf |
| R21 | Linux Foundation webinar — "How Hyperledger Technologies Can Help Build CBDCs" | https://www.linuxfoundation.org/webinars/moving-central-bank-digital-currency |
| R22 | Nepal CBDC performance study on Hyperledger Fabric (queueing-theory thesis, context) | https://github.com/HritikChaudhary04/CDDC_SIMULATION |

## Key claims backing the plan

- Fabric v3.1.x is the current release; **SmartBFT** BFT ordering and **Ed25519** arrived in v3.0; v2.5 remains the LTS [R1][R6].
- SmartBFT requires channel capability **V3_0** and a cluster of **4 consenters** configured via `ConsenterMapping` [R1][R2].
- The Fabric test network runs a single-node Raft orderer by default; `network.sh up -bft` starts **4 BFT orderers** (not available in Fabric v2.x) [R3].
- Fabric chaincode is written in **Go, Node.js, or Java** — Python is not supported [R4].
- Fabric Gateway client APIs exist for **Go, Node, and Java** only — there is no official Python gateway SDK [R14].
- The `token-sdk` sample ships a prebuilt token chaincode plus REST services for **issue / transfer / redeem / swap** using a **UTXO model with Zero-Knowledge Proofs** (zkatdlog), an **auditor** role that signs every transaction, idemix wallets, and a blockchain explorer; it is built on the standard single-channel test network and documents a path to "use another Fabric network" [R13].
- **Fabric-X** re-architects Fabric for digital assets: decomposed peer microservices, the **Arma** BFT orderer, single channel partitioned into namespaces, and a benchmarked **UTXO-based CBDC** application exceeding **200,000 TPS** [R7][R8][R9][R10].
- **Project Agila** (Bangko Sentral ng Pilipinas) is a wholesale CBDC pilot using Hyperledger Fabric for interbank transfers when the RTGS system (PhilPaSSplus) is unavailable — a real-world validation of Fabric for two-tier wholesale CBDC [R18][R19].
- **Hyperledger Caliper** measures TPS, latency, success rate, and resource consumption for Fabric (currently targeting the v2.x Gateway SDK path) [R15].
