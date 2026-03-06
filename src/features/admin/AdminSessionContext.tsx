import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AdminSessionContextValue = {
  isAdmin: boolean;
  password: string | null;
  login: (password: string) => void;
  logout: () => void;
};

const STORAGE_KEY = "mulberry.admin-password";

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

type AdminSessionProviderProps = {
  children: ReactNode;
};

export function AdminSessionProvider({
  children,
}: AdminSessionProviderProps) {
  const [password, setPassword] = useState<string | null>(null);

  useEffect(() => {
    const storedPassword = window.localStorage.getItem(STORAGE_KEY);
    if (storedPassword) {
      setPassword(storedPassword);
    }
  }, []);

  const login = useCallback((nextPassword: string) => {
    window.localStorage.setItem(STORAGE_KEY, nextPassword);
    setPassword(nextPassword);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setPassword(null);
  }, []);

  const value = useMemo<AdminSessionContextValue>(
    () => ({
      isAdmin: Boolean(password),
      password,
      login,
      logout,
    }),
    [login, logout, password],
  );

  return (
    <AdminSessionContext.Provider value={value}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  const context = useContext(AdminSessionContext);

  if (!context) {
    throw new Error(
      "useAdminSession must be used within an AdminSessionProvider",
    );
  }

  return context;
}
