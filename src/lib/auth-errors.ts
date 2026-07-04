import { FirebaseError } from "firebase/app";

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Incorrect email or password. Use the same credentials from storefront sign-up, or reset your password.";
      case "auth/email-already-in-use":
        return "This email is already registered. Try signing in instead.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/too-many-requests":
        return "Too many attempts. Wait a few minutes, then try again.";
      case "auth/user-disabled":
        return "This account has been disabled. Contact support.";
      case "auth/unauthorized-domain":
        return "This site domain is not authorized for sign-in. Add it in Firebase Console → Authentication → Settings → Authorized domains.";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      case "auth/invalid-api-key":
      case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
        return "Firebase is not configured correctly on this site. Check environment variables.";
      default:
        break;
    }
  }

  return error instanceof Error ? error.message : "Authentication failed";
}
