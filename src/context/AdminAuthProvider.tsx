"use client";

import { useRef, useEffect, type ReactNode } from "react";
import { AuthProvider } from "./AuthContext";
import { adminAuth, adminDb } from "@/lib/firebase";
import { bindFirestore } from "@/lib/firestore";

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const boundRef = useRef(false);

  if (typeof window !== "undefined" && adminDb && !boundRef.current) {
    bindFirestore(adminDb);
    boundRef.current = true;
  }

  useEffect(() => {
    if (adminDb) {
      bindFirestore(adminDb);
      boundRef.current = true;
    }
  }, []);

  return <AuthProvider authInstance={adminAuth}>{children}</AuthProvider>;
}
