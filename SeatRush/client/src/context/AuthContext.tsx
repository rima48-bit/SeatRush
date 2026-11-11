
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("seatrush_token");
      const savedUser = localStorage.getItem("seatrush_user");

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } else {
        localStorage.removeItem("seatrush_token");
        localStorage.removeItem("seatrush_user");
      }
    } catch {
      localStorage.removeItem("seatrush_token");
      localStorage.removeItem("seatrush_user");
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSession = (data: AuthResponse) => {
    if (!data.success || !data.token || !data.user) {
      throw new Error(data.message || "Authentication failed.");
    }

    localStorage.setItem("seatrush_token", data.token);
    localStorage.setItem("seatrush_user", JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);
  };

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data: AuthResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed.");
    }

    saveSession(data);
  };

  const signup = async (
    name: string,
    email: string,
    password: string
  ) => {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, password })
    });

    const data: AuthResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Signup failed.");
    }

    saveSession(data);
  };

  const logout = () => {
    localStorage.removeItem("seatrush_token");
    localStorage.removeItem("seatrush_user");

    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
}
