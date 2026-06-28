import type { Metadata } from "next";
import { AdminAuthProvider } from "@/context/AdminAuthProvider";

export const metadata: Metadata = {
  title: "Admin Portal | Royaale Luxe",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
