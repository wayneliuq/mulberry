import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { verifyAdminPassword } from "../../lib/api/admin";

type AdminSessionContextValue = {
  status: "checking" | "authenticated" | "unauthenticated";
  isAdmin: boolean;
  password: string | null;
  error: string | null;
  isSubmitting: boolean;
  login: (password: string) => Promise<boolean>;
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
  const [status, setStatus] = useState<AdminSessionContextValue["status"]>(
    "checking",
  );
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const storedPassword = window.localStorage.getItem(STORAGE_KEY);

    if (!storedPassword) {
      setStatus("unauthenticated");
      return;
    }

    let isMounted = true;

    void (async () => {
      try {
        await verifyAdminPassword(storedPassword);

        if (!isMounted) {
          return;
        }

        setPassword(storedPassword);
        setStatus("authenticated");
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);

        if (!isMounted) {
          return;
        }

        setPassword(null);
        setStatus("unauthenticated");
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (nextPassword: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await verifyAdminPassword(nextPassword);
      window.localStorage.setItem(STORAGE_KEY, nextPassword);
      setPassword(nextPassword);
      setStatus("authenticated");
      return true;
    } catch (loginError) {
      window.localStorage.removeItem(STORAGE_KEY);
      setPassword(null);
      setStatus("unauthenticated");
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Unable to verify admin password.",
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setPassword(null);
    setError(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AdminSessionContextValue>(
    () => ({
      status,
      isAdmin: status === "authenticated" && Boolean(password),
      password,
      error,
      isSubmitting,
      login,
      logout,
    }),
    [error, isSubmitting, login, logout, password, status],
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
