# ADR-0009: SWR token definition

**Status:** Accepted
**Date:** 2026-08-18
**Applies to:** Phase 3 onward

## Context

The prototype needs a concrete currency definition for the token layer. The concept currency is the Nepali rupee; the user specified a token code **SWR**, symbol **रू**, and **2 decimal places** (matching the paisa convention of the NPR).

## Decision

Define the Sworna token as:

| Field | Value |
|---|---|
| Token code | `SWR` |
| Token name | Sworna |
| Symbol | रू (NPR rupee sign) |
| Decimals | 2 (smallest unit = 0.01 SWR) |
| Underlying concept | Nepali rupee |

This is configured as the token type in the token-sdk services and used consistently across the FastAPI backend, admin console, and wallet UI (see [API.md](API.md)).

## Consequences

**Positive:** consistent, well-defined currency across all layers; realistic 2-decimal behavior.
**Negative/risks:** none significant; the token definition is a configuration, easy to change before the network goes live.

## References

- Token-type configuration and amount format in the token-sdk sample: https://github.com/hyperledger/fabric-samples/tree/main/token-sdk [R13]
