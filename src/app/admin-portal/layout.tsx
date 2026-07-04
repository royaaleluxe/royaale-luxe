"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { adminAuth } from "@/lib/firebase";

export default function AdminPortalLayout({ children }: { children: ReactNode }) {
  return <AuthProvider authInstance={adminAuth}>{children}</AuthProvider>;
}
