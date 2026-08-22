const BASE = "/api/v1";

async function request(path, options = {}) {
  const resp = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.detail || JSON.stringify(data));
  }
  return data;
}

export const api = {
  banks: () => request("/banks"),
  customers: () => request("/customers"),
  balance: (username) => request(`/customers/${username}/balance`),
  history: (username) => request(`/customers/${username}/transactions`),
  setStatus: (username, status) =>
    request(`/customers/${username}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  transfer: (body) =>
    request("/payments/transfer", { method: "POST", body: JSON.stringify(body) }),
  redeem: (body) =>
    request("/payments/redeem", { method: "POST", body: JSON.stringify(body) }),
  issue: (body) =>
    request("/admin/issue", { method: "POST", body: JSON.stringify(body) }),
  overview: () => request("/admin/overview"),
  transactions: () => request("/admin/transactions"),
  ledger: () => request("/admin/ledger"),
};