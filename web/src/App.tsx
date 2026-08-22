import * as React from "react";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Building2, LayoutDashboard, Blocks, Wallet } from "lucide-react";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { LoginPage } from "@/pages/login";
import { CBDashboard } from "@/pages/cb/dashboard";
import { CBBanks } from "@/pages/cb/banks";
import { CBLedger } from "@/pages/cb/ledger";
import { BankDashboard } from "@/pages/bank/dashboard";
import { CustomerView } from "@/pages/customer";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireRole({ role, children }: { role: string; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || user.role !== role) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function CBPortal() {
  const [tab, setTab] = React.useState("dashboard");
  const nav = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "banks", label: "Banks", icon: Building2 },
    { key: "ledger", label: "Ledger", icon: Blocks },
  ];
  return (
    <AppShell title="Central bank" subtitle="operator console" nav={nav} active={tab} onNavigate={setTab}>
      {tab === "dashboard" && <CBDashboard />}
      {tab === "banks" && <CBBanks />}
      {tab === "ledger" && <CBLedger />}
    </AppShell>
  );
}

function BankPortal({ code }: { code: string }) {
  const { user } = useAuth();
  if (user?.role === "customer") {
    return (
      <AppShell
        title={`Bank ${user.bank_code}`}
        subtitle="customer view"
        nav={[{ key: "account", label: "My account", icon: Wallet }]}
        active="account"
        onNavigate={() => {}}
      >
        <CustomerView />
      </AppShell>
    );
  }
  const nav = [{ key: "accounts", label: "Accounts", icon: LayoutDashboard }];
  return (
    <AppShell
      title={`Bank ${code}`}
      subtitle="staff console"
      nav={nav}
      active="accounts"
      onNavigate={() => {}}
    >
      <BankDashboard bankCode={code} />
    </AppShell>
  );
}

function GuardedBankPortal() {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  if (!user || user.role === "cb_admin") return <Navigate to="/cb" replace />;
  if (user.bank_code && user.bank_code !== code) return <Navigate to={`/b/${user.bank_code}`} replace />;
  return <BankPortal code={code ?? ""} />;
}

function LoginRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm">Loading…</div>;
  if (user) {
    if (user.role === "cb_admin") return <Navigate to="/cb" replace />;
    return <Navigate to={`/b/${user.bank_code ?? "001"}`} replace />;
  }
  return <LoginPage />;
}

// Each portal instance can be served under its own URL by running the dev
// server (or build) with a VITE_DEFAULT_PORTAL env var from an .env file,
// e.g. .env.portal-banka sets VITE_DEFAULT_PORTAL=banka.
function defaultPath(): string {
  switch (import.meta.env.VITE_DEFAULT_PORTAL) {
    case "cb":
      return "/cb";
    case "banka":
      return "/b/001";
    case "bankb":
      return "/b/002";
    default:
      return "/login";
  }
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRedirect />} />
          <Route
            path="/cb"
            element={
              <RequireAuth>
                <RequireRole role="cb_admin">
                  <CBPortal />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/b/:code"
            element={
              <RequireAuth>
                <GuardedBankPortal />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to={defaultPath()} replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}