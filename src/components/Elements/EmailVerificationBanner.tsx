"use client";

import { useState } from "react";
import { Mail, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { storefrontAuth } from "@/lib/firebase";

export function EmailVerificationBanner() {
  const { user, resendVerificationEmail, reloadUser, isStorefront } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!isStorefront || !user || user.emailVerified || user.providerData.some((p) => p.providerId === "google.com")) {
    return null;
  }

  const handleResend = async () => {
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

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await reloadUser();
      const verified = storefrontAuth?.currentUser?.emailVerified;
      if (verified) {
        showToast("Email verified!", "success");
      } else {
        showToast("Not verified yet — check your inbox", "error");
      }
    } catch (err) {
      showToast(getAuthErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <Mail className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold">Verify your email</p>
        <p className="mt-0.5 text-amber-800/80">
          We sent a link to <span className="font-medium">{user.email}</span>. Verify your email to place
          orders.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={loading}
            className="font-semibold underline underline-offset-2 hover:no-underline disabled:opacity-50"
          >
            Resend email
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:no-underline disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            I&apos;ve verified
          </button>
        </div>
      </div>
    </div>
  );
}
