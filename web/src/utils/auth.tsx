import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, setAuthToken } from './http';
import { jwtDecode } from 'jwt-decode';

type User = { id: number; name: string; email: string; role: 'ADMIN'|'ENGINEER'|'VIEWER' };

type Ctx = {
  user: User | null;
  token: string | null;
  login(email: string, password: string): Promise<void>;
  logout(): void;
};

const AuthContext = createContext<Ctx>({} as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setAuthToken(token);
    if (token) {
      try {
        const payload: any = jwtDecode(token);
        setUser({ id: payload.sub, name: payload.name ?? 'User', email: payload.email ?? '', role: payload.role });
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [token]);

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

