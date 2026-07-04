"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { adminAuth } from "@/lib/firebase";
import { getApiUrl } from "@/lib/api-base";
import { GLASS_CLASS, SPRING_TRANSITION } from "@/lib/constants";

async function establishAdminSession() {
  const token = await adminAuth?.currentUser?.getIdToken();
  if (!token) return;
  await fetch(getApiUrl("/api/admin/session"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ idToken: token }),
  });
}

export function AdminLogin() {
  const { signIn } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      await establishAdminSession();
    } catch (err) {
      showToast(getAuthErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-pink via-brand-pink-accent/40 to-white flex items-center justify-center p-6">
      <motion.div
        className={`${GLASS_CLASS} w-full max-w-md rounded-3xl p-8 border border-brand-pink-accent/50`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING_TRANSITION}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-full bg-brand-pink-accent/60">
            <Lock className="w-5 h-5 text-brand-charcoal" />
          </div>
          <h1 className="font-script text-3xl text-brand-charcoal">Royaale Admin</h1>
        </div>
        <p className="text-sm text-brand-muted mb-8">Authorized personnel only.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            required
            type="email"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/70 border border-brand-pink-accent/40 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink-accent"
          />
          <input
            required
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/70 border border-brand-pink-accent/40 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink-accent"
          />
          <motion.button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-brand-charcoal text-white font-semibold text-sm uppercase tracking-wider rounded-full disabled:opacity-50"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={SPRING_TRANSITION}
          >
            {loading ? "Verifying..." : "Sign In to Admin"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

export async function clearAdminSession() {
  await fetch(getApiUrl("/api/admin/session"), {
    method: "DELETE",
    credentials: "include",
  });
}
