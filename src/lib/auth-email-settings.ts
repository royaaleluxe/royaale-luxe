import type { ActionCodeSettings } from "firebase/auth";

function getAppBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || "http://localhost:3000"
  );
}

/** Redirect target after Firebase email verification or password reset. */
export function getAuthEmailActionSettings(): ActionCodeSettings {
  return {
    url: `${getAppBaseUrl()}/account`,
    handleCodeInApp: false,
  };
}
