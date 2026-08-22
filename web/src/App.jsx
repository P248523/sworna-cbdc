import React, { useEffect, useState } from "react";
import { api } from "./api.js";

const fmt = (minor, decimals = 2) =>
  (Number(minor) / 10 ** decimals).toFixed(decimals);

function CustomerWallet() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState("");
  const [data, setData] = useState(null);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.customers().then(setCustomers).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selected) {
      setData(null);
      return;
    }
    Promise.all([api.balance(selected), api.history(selected)])
      .then(([balance, history]) => setData({ balance, history }))
      .catch((e) => setError(e.message));
  }, [selected]);

  async function send(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    try {
      const tx = await api.transfer({
        from_wallet: data.balance.wallet,
        to_wallet: to,
        amount,
        message: msg,
      });
      setNotice(`Sent ${amount} SWR — tx ${tx.txid.slice(0, 12)}…`);
      setTo("");
      setAmount("");
      setMsg("");
      const [balance, history] = await Promise.all([
        api.balance(selected),
        api.history(selected),
      ]);
      setData({ balance, history });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card">
      <h2>Customer wallet</h2>
      <label>
        Customer{" "}
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">— select —</option>
          {customers.map((c) => (
            <option key={c.username} value={c.username}>
              {c.full_name} ({c.wallet} @ {c.bank_name})
            </option>
          ))}
        </select>
      </label>
      {data && (
        <div className="grid">
          <div className="card">
            <h3>Balance</h3>
            <p className="big">
              रू {data.balance.balance} <small>SWR</small>
            </p>
            <p className="muted">
              {data.balance.wallet} · {data.balance.bank_name}
            </p>
          </div>
          <div className="card">
            <h3>Send</h3>
            <form onSubmit={send}>
              <label>
                To customer
                <select value={to} onChange={(e) => setTo(e.target.value)}>
                  <option value="">— select recipient —</option>
                  {customers
                    .filter((c) => c.wallet !== data.balance.wallet)
                    .map((c) => (
                      <option key={c.wallet} value={c.wallet}>
                        {c.full_name} ({c.wallet} @ {c.bank_name})
                      </option>
                    ))}
                </select>
              </label>
              <input
                placeholder="amount SWR (e.g. 10.00)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <input
                placeholder="message (optional)"
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
              />
              <button type="submit" disabled={!to || !amount}>
                Transfer
              </button>
            </form>
            {notice && <p className="ok">{notice}</p>}
          </div>
          <div className="card wide">
            <h3>History</h3>
            <table>
              <thead>
                <tr>
                  <th>Tx</th>
                  <th>Amount</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Message</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.history.slice(0, 20).map((t, i) => (
                  <tr key={i}>
                    <td className="mono">{t.txid.slice(0, 12)}…</td>
                    <td>{fmt(t.amount)} SWR</td>
                    <td>{t.sender || "CB"}</td>
                    <td>{t.recipient || "—"}</td>
                    <td>{t.message}</td>
                    <td>{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {error && <p className="err">{error}</p>}
    </div>
  );
}

function BankConsole() {
  const [customers, setCustomers] = useState([]);
  const [balances, setBalances] = useState({});
  const [error, setError] = useState("");

  async function load() {
    try {
      const cs = await api.customers();
      setCustomers(cs);
      const bs = {};
      for (const c of cs) {
        bs[c.username] = await api.balance(c.username);
      }
      setBalances(bs);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function toggle(c) {
    const next = c.status === "active" ? "flagged" : "active";
    await api.setStatus(c.username, next);
    load();
  }

  return (
    <div className="card">
      <h2>Bank console</h2>
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Wallet</th>
            <th>Bank</th>
            <th>Balance</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.username}>
              <td>{c.full_name}</td>
              <td className="mono">{c.wallet}</td>
              <td>{c.bank_name}</td>
              <td>{balances[c.username] ? `${balances[c.username].balance} SWR` : "…"}</td>
              <td>
                <span className={`pill ${c.status}`}>{c.status}</span>
              </td>
              <td>
                <button onClick={() => toggle(c)}>
                  {c.status === "active" ? "Flag" : "Activate"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {error && <p className="err">{error}</p>}
    </div>
  );
}

function CentralBankConsole() {
  const [overview, setOverview] = useState(null);
  const [txns, setTxns] = useState([]);
  const [ledger, setLedger] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [wallet, setWallet] = useState("");
  const [bank, setBank] = useState("banka");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadAll() {
    try {
      const [ov, tr, lg, cs] = await Promise.all([
        api.overview(),
        api.transactions(),
        api.ledger(),
        api.customers(),
      ]);
      setOverview(ov);
      setTxns(tr);
      setLedger(lg);
      setCustomers(cs);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    loadAll();
  }, []);

  async function issue(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    try {
      const tx = await api.issue({
        recipient_wallet: wallet,
        bank_name: bank,
        amount,
        message: msg,
      });
      setNotice(`Issued ${amount} SWR → ${wallet} (tx ${tx.txid.slice(0, 12)}…)`);
      setWallet("");
      setAmount("");
      setMsg("");
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card">
      <h2>Central bank console</h2>
      {overview && (
        <div className="grid">
          <div className="card">
            <h3>Total supply</h3>
            <p className="big">रू {Number(overview.total_supply).toFixed(2)}</p>
            <h4>Circulation per bank</h4>
            {overview.circulation.map((r) => (
              <p key={r.bank_name} className="muted">
                {r.bank_name}: रू {Number(r.total).toFixed(2)} SWR
              </p>
            ))}
          </div>
          <div className="card">
            <h3>Issue SWR</h3>
            <form onSubmit={issue}>
              <label>
                To bank
                <select
                  value={bank}
                  onChange={(e) => {
                    setBank(e.target.value);
                    setWallet("");
                  }}
                >
                  <option value="banka">banka</option>
                  <option value="bankb">bankb</option>
                </select>
              </label>
              <label>
                Recipient
                <select
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                >
                  <option value="">— select customer of {bank} —</option>
                  {customers
                    .filter((c) => c.bank_name === bank)
                    .map((c) => (
                      <option key={c.wallet} value={c.wallet}>
                        {c.full_name} ({c.wallet})
                      </option>
                    ))}
                </select>
              </label>
              <input
                placeholder="amount SWR (e.g. 100.00)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <input
                placeholder="message (optional)"
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
              />
              <button type="submit" disabled={!wallet || !amount}>
                Issue
              </button>
            </form>
            {notice && <p className="ok">{notice}</p>}
          </div>
        </div>
      )}
      <div className="grid">
        <div className="card">
          <h3>Ledger monitor</h3>
          {ledger ? (
            <>
              <p className="muted">
                channel <span className="mono">{ledger.channel}</span> · height{" "}
                {ledger.height}
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Block</th>
                    <th>Tx</th>
                    <th>Tx ids</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.blocks
                    .slice()
                    .reverse()
                    .map((b) => (
                      <tr key={b.number}>
                        <td>{b.number}</td>
                        <td>{b.tx_count}</td>
                        <td className="mono">
                          {b.txids.map((t) => t.slice(0, 10) + "…").join(", ") || "config"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="muted">loading…</p>
          )}
        </div>
        <div className="card wide">
          <h3>Recent transactions</h3>
          <table>
            <thead>
              <tr>
                <th>Tx</th>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.txid}>
                  <td className="mono">{t.txid.slice(0, 12)}…</td>
                  <td>{t.tx_type}</td>
                  <td>{t.from_wallet || "CB"}</td>
                  <td>{t.to_wallet || "CB"}</td>
                  <td>{Number(t.amount).toFixed(2)} SWR</td>
                  <td>{t.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {error && <p className="err">{error}</p>}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("wallet");
  return (
    <div className="app">
      <header>
        <h1>
          <span className="brand">रू</span> Sworna CBDC
        </h1>
        <nav>
          <button className={tab === "wallet" ? "active" : ""} onClick={() => setTab("wallet")}>
            Wallet
          </button>
          <button className={tab === "bank" ? "active" : ""} onClick={() => setTab("bank")}>
            Bank
          </button>
          <button className={tab === "cb" ? "active" : ""} onClick={() => setTab("cb")}>
            Central bank
          </button>
        </nav>
      </header>
      <main>
        {tab === "wallet" && <CustomerWallet />}
        {tab === "bank" && <BankConsole />}
        {tab === "cb" && <CentralBankConsole />}
      </main>
    </div>
  );
}