import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, login as loginService, logout as logoutService } from '../services/authService';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  employeeId?: string;
  hourlyRate?: number;
  status?: string;
  workMode?: 'WFO' | 'WFH';
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, location?: { latitude?: number; longitude?: number }) => Promise<any>;
  logout: () => void;
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (localStorage.getItem('token')) {
        try {
          const userData = await getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error("Auth init failed", error);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string, location?: { latitude?: number; longitude?: number }) => {
    const data = await loginService(email, password, location);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    logoutService();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


