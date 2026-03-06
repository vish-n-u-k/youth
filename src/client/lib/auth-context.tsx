'use client';

// ============================================
// AUTH CONTEXT
// ============================================

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

import { clearPermissions } from './permission-service';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
}

interface MeResponse {
  user: User;
}

interface AuthResponse {
  user: User;
  token: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  organizationId?: string;
  setOrganizationId: (id: string | undefined) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    name?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);

  // Fetch current user on mount
  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const json = (await response.json()) as ApiResponse<MeResponse>;
        if (json.data?.user) {
          setUser(json.data.user);
        }
      } else {
        setUser(null);
        clearPermissions();
      }
    } catch {
      setUser(null);
      clearPermissions();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        });

        const json = (await response.json()) as ApiResponse<AuthResponse>;

        if (response.ok && json.data?.user) {
          setUser(json.data.user);
          return { success: true };
        }

        return { success: false, error: json.error ?? 'Login failed' };
      } catch {
        return { success: false, error: 'Network error' };
      }
    },
    []
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      name?: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
          credentials: 'include',
        });

        const json = (await response.json()) as ApiResponse<AuthResponse>;

        if (response.ok && json.data?.user) {
          setUser(json.data.user);
          return { success: true };
        }

        return { success: false, error: json.error ?? 'Registration failed' };
      } catch {
        return { success: false, error: 'Network error' };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setUser(null);
      clearPermissions();
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        organizationId,
        setOrganizationId,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
