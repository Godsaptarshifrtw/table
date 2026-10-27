"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Staff } from "@/types";

interface AuthContextType {
  staff: Staff | null;
  login: (staff: Staff) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  staff: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("restaurant_staff");
      if (stored) {
        setStaff(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (staffData: Staff) => {
    setStaff(staffData);
    localStorage.setItem("restaurant_staff", JSON.stringify(staffData));
  };

  const logout = () => {
    setStaff(null);
    localStorage.removeItem("restaurant_staff");
  };

  return (
    <AuthContext.Provider value={{ staff, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
