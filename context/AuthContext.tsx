"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { detachAllFirestoreListeners } from "@/lib/firestoreListeners";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  requireAuth: (redirectTo?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  requireAuth: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const requireAuth = (redirectTo = "/sign-in") => {
    if (!user && !loading) {
      router.push(redirectTo);
    }
  };

  const logout = async () => {
    try {
      // First detach all Firestore listeners to prevent permission errors
      detachAllFirestoreListeners();
      
      // Then sign out the user
      await auth.signOut();
      setUser(null);
      router.push("/sign-in");
    } catch (error) {
      console.error("Logout error:", error);
      // Still attempt to navigate away even if there was an error
      router.push("/sign-in");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, requireAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);