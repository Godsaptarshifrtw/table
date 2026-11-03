"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Staff } from "@/types";
import { auth, googleProvider } from "@/lib/firebase/client";
import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged, User } from "firebase/auth";

interface AuthContextType {
  staff: Staff | null;
  firebaseUser: User | null;
  login: (staff: Staff) => void;
  logout: () => Promise<void>;
  loginWithGoogle: (requestedRole?: "admin" | "waiter" | "kitchen") => Promise<Staff>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  staff: null,
  firebaseUser: null,
  login: () => {},
  logout: async () => {},
  loginWithGoogle: async () => { throw new Error("Not implemented"); },
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
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

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
    });

    return () => unsubscribe();
  }, []);

  const login = (staffData: Staff) => {
    setStaff(staffData);
    localStorage.setItem("restaurant_staff", JSON.stringify(staffData));
  };

  const logout = async () => {
    setStaff(null);
    localStorage.removeItem("restaurant_staff");
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.error("Sign out error", e);
    }
  };

  const loginWithGoogle = async (requestedRole: "admin" | "waiter" | "kitchen" = "admin"): Promise<Staff> => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          displayName: user.displayName || user.email?.split("@")[0],
          uid: user.uid,
          photoURL: user.photoURL,
          requestedRole,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Google login verification failed.");
      }

      login(data.staff);
      return data.staff;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ staff, firebaseUser, login, logout, loginWithGoogle, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
