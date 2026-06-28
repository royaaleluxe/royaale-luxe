"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useUI } from "@/context/UIContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { SPRING_TRANSITION } from "@/lib/constants";

export function AuthModal() {
  const { authModalOpen, closeAuthModal } = useUI();
  const { signIn, signUp, resetPassword } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(form.email, form.password);
        showToast("Welcome back to Royaale Luxe", "success");
        closeAuthModal();
      } else if (mode === "signup") {
        await signUp(form);
        showToast("Account created successfully", "success");
        closeAuthModal();
      } else {
        await resetPassword(form.email);
        showToast("Password reset email sent", "success");
        setMode("login");
      }
    } catch (err) {
      showToast(getAuthErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {authModalOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-[80] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAuthModal}
          />
          <motion.div
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-[90] bg-white/95 backdrop-blur-xl border border-white/30 rounded-3xl shadow-glass overflow-hidden"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="font-script text-3xl text-brand-charcoal">
                    {mode === "login" ? "Welcome" : mode === "signup" ? "Join Us" : "Recover"}
                  </h2>
                  <p className="text-sm text-brand-muted mt-1">
                    {mode === "login"
                      ? "Sign in to your luxury account"
                      : mode === "signup"
                        ? "Create your Royaale Luxe profile"
                        : "We'll send a recovery link"}
                  </p>
                </div>
                <button onClick={closeAuthModal}>
                  <X className="w-5 h-5 text-brand-muted" />
                </button>
              </div>

              <motion.form
                onSubmit={handleSubmit}
                className="space-y-4"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.06 } },
                }}
              >
                {mode === "signup" && (
                  <>
                    <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                      <input
                        required
                        placeholder="First Name"
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink-accent/50"
                      />
                    </motion.div>
                    <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                      <input
                        required
                        placeholder="Last Name"
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink-accent/50"
                      />
                    </motion.div>
                    <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                      <input
                        required
                        placeholder="Phone Number"
                        value={form.phoneNumber}
                        onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink-accent/50"
                      />
                    </motion.div>
                  </>
                )}
                <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                  <input
                    required
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink-accent/50"
                  />
                </motion.div>
                {mode !== "forgot" && (
                  <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                    <input
                      required
                      type="password"
                      placeholder="Password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink-accent/50"
                    />
                  </motion.div>
                )}

                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-brand-muted hover:text-brand-charcoal"
                  >
                    Forgot Password?
                  </button>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-brand-charcoal text-white font-semibold text-sm uppercase tracking-wider rounded-full disabled:opacity-50"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={SPRING_TRANSITION}
                >
                  {loading
                    ? "Please wait..."
                    : mode === "login"
                      ? "Sign In"
                      : mode === "signup"
                        ? "Create Account"
                        : "Send Reset Link"}
                </motion.button>
              </motion.form>

              <p className="text-center text-sm text-brand-muted mt-6">
                {mode === "login" ? (
                  <>
                    New to Royaale?{" "}
                    <button onClick={() => setMode("signup")} className="text-black font-semibold">
                      Sign Up
                    </button>
                  </>
                ) : (
                  <>
                    Already a member?{" "}
                    <button onClick={() => setMode("login")} className="text-black font-semibold">
                      Sign In
                    </button>
                  </>
                )}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
