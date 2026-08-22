# Token network — UTXO & zero-knowledge model

## UTXO accounting

Money is a set of unspent transaction outputs. Each UTXO is identified by a
transaction id + index and carries:

```
{ owner: <idemix credential commitment>
  data:  <Pedersen commitment: g0^H(SWR) · g1^value · g2^blinding>
}
```

| Rule | Enforced by |
|---|---|
| Sum of inputs = sum of outputs | chaincode (on commitments) |
| An input can be spent only once | chaincode (delete on spend) |
| Outputs are non-negative and bounded | range proofs in the transfer |
| Only the owner can spend | ownership proof (prove the committed key) |
| Issuer can mint, auditor signs | public params in the chaincode |

## Change splitting

A transfer of 500 SWR from a 5000 SWR input produces **two** outputs:

```
input  5000 SWR (bob)              ┐
output 500 SWR  (carlos)           ├  sum preserved
output 4500 SWR (bob, change)      ┘
```

This is why balances in the owner services are sums over unspent outputs, not a
single running number.

## Zero-knowledge privacy (zkatdlog)

- **Hidden values** — Pedersen commitments are computationally hiding: observers
  learn nothing about `value` from `g1^value·g2^r`.
- **Hidden types** — token type maps through `H(type)` into the scalar field.
- **Hidden parties** — owners are idemix credentials; on the ledger the owner is
  a commitment, not a name.
- **Auditor** — the auditor is a privileged party with the authorized metadata;
  it signs every transaction and can open commitments for supervision (AML).

## What the auditor can do

The auditor's REST API reveals full amounts + sender/recipient for any account
(`/api/v1/auditor/accounts/{id}/transactions`). This is the oversight mechanism
that balances the privacy: the ledger is blind to everyone **except** the
auditor and the transacting parties.

## Security notes (what we did NOT reimplement)

This privacy is provided by the **Fabric Token SDK's** zkatdlog driver — an
audited, battle-tested implementation. We deliberately did **not** write our own
ZK scheme: it is a multi-month crypto project with severe risk of subtle bugs.
Our contribution is owning the *system* around it (network, services, banking
API, UI), not the cryptography itself.