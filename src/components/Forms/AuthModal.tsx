"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail } from "lucide-react";
import { useUI } from "@/context/UIContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { PasswordInput } from "@/components/Forms/PasswordInput";
import { storefrontAuth } from "@/lib/firebase";
import { SPRING_TRANSITION } from "@/lib/constants";

type AuthMode = "login" | "signup" | "forgot" | "verify";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function AuthModal() {
  const { authModalOpen, closeAuthModal } = useUI();
  const { signIn, signUp, signInWithGoogle, resetPassword, resendVerificationEmail, reloadUser, isStorefront } =
    useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
  });

  const resetModal = () => {
    setMode("login");
    setVerifyEmail("");
    setForm({ email: "", password: "", firstName: "", lastName: "", phoneNumber: "" });
  };

  const handleClose = () => {
    closeAuthModal();
    resetModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(form.email, form.password);
        showToast("Welcome back to Royaale Luxe", "success");
        handleClose();
      } else if (mode === "signup") {
        await signUp(form);
        setVerifyEmail(form.email);
        setMode("verify");
        showToast("Check your email to verify your account", "success");
      } else if (mode === "forgot") {
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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      showToast("Welcome to Royaale Luxe", "success");
      handleClose();
    } catch (err) {
      showToast(getAuthErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    try {
      await resendVerificationEmail();
      showToast("Verification email sent", "success");
    } catch (err) {
      showToast(getAuthErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerified = async () => {
    setLoading(true);
    try {
      await reloadUser();
      const verified = storefrontAuth?.currentUser?.emailVerified;
      if (verified) {
        showToast("Email verified successfully", "success");
        handleClose();
      } else {
        showToast("Email not verified yet. Check your inbox.", "error");
      }
    } catch (err) {
      showToast(getAuthErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === "login"
      ? "Welcome"
      : mode === "signup"
        ? "Join Us"
        : mode === "forgot"
          ? "Recover"
          : "Verify Email";

  const subtitle =
    mode === "login"
      ? "Sign in to your luxury account"
      : mode === "signup"
        ? "Create your Royaale Luxe profile"
        : mode === "forgot"
          ? "We'll send a recovery link"
          : "One more step to complete your account";

  return (
    <AnimatePresence>
      {authModalOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-[80] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
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
                  <h2 className="font-script text-3xl text-brand-charcoal">{title}</h2>
                  <p className="text-sm text-brand-muted mt-1">{subtitle}</p>
                </div>
                <button onClick={handleClose} aria-label="Close">
                  <X className="w-5 h-5 text-brand-muted" />
                </button>
              </div>

              {mode === "verify" ? (
                <div className="text-center space-y-5">
                  <div className="mx-auto w-14 h-14 rounded-full bg-brand-pink flex items-center justify-center">
                    <Mail className="w-7 h-7 text-brand-charcoal" />
                  </div>
                  <p className="text-sm text-brand-muted leading-relaxed">
                    We sent a verification link to{" "}
                    <span className="font-semibold text-brand-charcoal">{verifyEmail}</span>. Click the
                    link in your email, then return here to continue.
                  </p>
                  <motion.button
                    type="button"
                    onClick={handleCheckVerified}
                    disabled={loading}
                    className="w-full py-3.5 bg-brand-charcoal text-white font-semibold text-sm uppercase tracking-wider rounded-full disabled:opacity-50"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={SPRING_TRANSITION}
                  >
                    {loading ? "Checking..." : "I've Verified My Email"}
                  </motion.button>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={loading}
                    className="text-sm text-brand-muted hover:text-brand-charcoal disabled:opacity-50"
                  >
                    Resend verification email
                  </button>
                </div>
              ) : (
                <>
                  {isStorefront && mode !== "forgot" && (
                    <>
                      <motion.button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full py-3 mb-4 flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-full text-sm font-medium text-brand-charcoal hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        transition={SPRING_TRANSITION}
                      >
                        <GoogleIcon />
                        Continue with Google
                      </motion.button>
                      <div className="relative mb-4">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-brand-pink-accent/60" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase tracking-wider">
                          <span className="bg-white/95 px-3 text-brand-muted">or</span>
                        </div>
                      </div>
                    </>
                  )}

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
                        <PasswordInput
                          required
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
                </>
              )}

              {mode !== "verify" && (
                <p className="text-center text-sm text-brand-muted mt-6">
                  {mode === "login" ? (
                    <>
                      New to Royaale?{" "}
                      <button onClick={() => setMode("signup")} className="text-black font-semibold">
                        Sign Up
                      </button>
                    </>
                  ) : mode === "signup" ? (
                    <>
                      Already a member?{" "}
                      <button onClick={() => setMode("login")} className="text-black font-semibold">
                        Sign In
                      </button>
                    </>
                  ) : (
                    <>
                      Remember your password?{" "}
                      <button onClick={() => setMode("login")} className="text-black font-semibold">
                        Sign In
                      </button>
                    </>
                  )}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
