"use client";

import type { ReactNode } from "react";
import { AdminAuthProvider } from "@/context/AdminAuthProvider";

export default function AdminPortalLayout({ children }: { children: ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
