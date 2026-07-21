import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { authApi, meApi, type User } from "../lib/api";

type AuthState = {
  user: User | null;
  loading: boolean;
  likes: Set<string>;
  login: (login: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleLike: (trackId: string) => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState<Set<string>>(new Set());

  const loadLikes = useCallback(async () => {
    try {
      const lib = await meApi.library();
      setLikes(new Set(lib.likes.map((t) => t.id)));
    } catch {
      setLikes(new Set());
    }
  }, []);

  useEffect(() => {
    authApi
      .me()
      .then(async ({ user }) => {
        setUser(user);
        if (user) await loadLikes();
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [loadLikes]);

  const login = async (login: string, password: string) => {
    await authApi.login({ login, password });
    const { user } = await authApi.me();
    setUser(user);
    await loadLikes();
  };

  const signup = async (username: string, email: string, password: string) => {
    await authApi.signup({ username, email, password });
    const { user } = await authApi.me();
    setUser(user);
    await loadLikes();
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    setLikes(new Set());
  };

  const toggleLike = async (trackId: string) => {
    if (!user) throw new Error("нужно войти");
    const { liked } = await meApi.toggleLike(trackId);
    setLikes((prev) => {
      const next = new Set(prev);
      if (liked) next.add(trackId);
      else next.delete(trackId);
      return next;
    });
  };

  const value: AuthState = { user, loading, likes, login, signup, logout, toggleLike };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
