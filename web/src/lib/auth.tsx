import * as React from "react";
import { api, setToken, type LoginResponse } from "@/lib/api";

interface AuthState {
  user: LoginResponse | null;
  loading: boolean;
}

const AuthContext = React.createContext<{
  user: LoginResponse | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
}>({ user: null, loading: true, login: async () => ({ token: "", role: "customer", username: "", bank_code: null, account_number: null }), logout: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({ user: null, loading: true });

  React.useEffect(() => {
    if (!localStorage.getItem("sworna_token")) {
      setState({ user: null, loading: false });
      return;
    }
    api
      .me()
      .then((user) => setState({ user, loading: false }))
      .catch(() => setState({ user: null, loading: false }));
  }, []);

  const login = async (username: string, password: string) => {
    const user = await api.login(username, password);
    setToken(user.token);
    setState({ user, loading: false });
    return user;
  };

  const logout = () => {
    setToken(null);
    setState({ user: null, loading: false });
  };

  return (
    <AuthContext.Provider value={{ user: state.user, loading: state.loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}