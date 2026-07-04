"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
  getAdditionalUserInfo,
  reload,
  type User,
} from "firebase/auth";
import type { Auth } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { storefrontAuth, db as storefrontDb, adminDb } from "@/lib/firebase";
import { getAuthEmailActionSettings } from "@/lib/auth-email-settings";
import {
  createUserProfile,
  getUserProfile,
  ensureUserProfile,
  subscribeUserProfile,
  subscribeIsAdmin,
} from "@/lib/firestore";
import type { UserProfile } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isStorefront: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  }) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  authInstance = storefrontAuth,
}: {
  children: ReactNode;
  authInstance?: Auth | null;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminFlag, setAdminFlag] = useState(false);
  const ensuringProfile = useRef(false);

  useEffect(() => {
    if (!authInstance) {
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(authInstance, (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setAdminFlag(false);
        setLoading(false);
      }
    });

    return unsub;
  }, [authInstance]);

  const isStorefront = authInstance === storefrontAuth;
  const firestoreDb = isStorefront ? storefrontDb : adminDb;

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    setLoading(true);

    let profileReady = false;
    let adminReady = false;

    const tryFinishLoading = () => {
      if (!cancelled && profileReady && adminReady) {
        setLoading(false);
      }
    };

    const unsubProfile = subscribeUserProfile(
      user.uid,
      async (p) => {
        if (cancelled) return;

        if (!p && !ensuringProfile.current) {
          ensuringProfile.current = true;
          try {
            const name = user.displayName?.split(" ") || [];
            p = await ensureUserProfile(
              user.uid,
              {
                email: user.email || "",
                firstName: name[0] || "Guest",
                lastName: name.slice(1).join(" ") || "",
                phoneNumber: "",
              },
              firestoreDb
            );
          } catch (err) {
            console.error("ensureUserProfile error:", err);
          } finally {
            ensuringProfile.current = false;
          }
        }

        if (isStorefront && p?.disabled) {
          await firebaseSignOut(authInstance!);
          setProfile(null);
          profileReady = true;
          adminReady = true;
          setLoading(false);
          return;
        }

        setProfile(p);
        profileReady = true;
        tryFinishLoading();
      },
      firestoreDb
    );

    let unsubAdmin = () => {};

    unsubAdmin = subscribeIsAdmin(
      user.uid,
      (admin) => {
        if (!cancelled) {
          setAdminFlag(admin);
          adminReady = true;
          tryFinishLoading();
        }
      },
      firestoreDb
    );

    return () => {
      cancelled = true;
      unsubProfile();
      unsubAdmin();
    };
  }, [user, authInstance, isStorefront, firestoreDb]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<User> => {
      if (!authInstance) throw new Error("Authentication unavailable.");

      let cred;
      try {
        cred = await signInWithEmailAndPassword(authInstance, email, password);
      } catch (err) {
        if (err instanceof FirebaseError && err.code === "auth/user-disabled") {
          throw new Error("This account has been disabled. Contact support.");
        }
        throw err;
      }

      if (isStorefront) {
        const p = await getUserProfile(cred.user.uid, storefrontDb);
        if (p?.disabled) {
          await firebaseSignOut(authInstance);
          throw new Error("This account has been disabled. Contact support.");
        }
      }

      return cred.user;
    },
    [authInstance, isStorefront]
  );

  const signUp = useCallback(
    async (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phoneNumber: string;
    }) => {
      if (!authInstance) throw new Error("Authentication unavailable.");

      const cred = await createUserWithEmailAndPassword(authInstance, data.email, data.password);

      await createUserProfile({
        uid: cred.user.uid,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        savedWishlist: [],
        savedCart: [],
        savedAddresses: [],
        backInStockAlerts: [],
        orderHistory: [],
        notifications: [],
      });

      await sendEmailVerification(cred.user, getAuthEmailActionSettings());
    },
    [authInstance]
  );

  const signInWithGoogle = useCallback(async () => {
    if (!authInstance) throw new Error("Authentication unavailable.");
    if (!isStorefront) throw new Error("Google sign-in is only available on the storefront.");

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const cred = await signInWithPopup(authInstance, provider);
    const extra = getAdditionalUserInfo(cred);

    if (extra?.isNewUser) {
      const name = cred.user.displayName?.split(" ") || [];
      await createUserProfile({
        uid: cred.user.uid,
        firstName: name[0] || "Guest",
        lastName: name.slice(1).join(" ") || "",
        email: cred.user.email || "",
        phoneNumber: cred.user.phoneNumber || "",
        savedWishlist: [],
        savedCart: [],
        savedAddresses: [],
        backInStockAlerts: [],
        orderHistory: [],
        notifications: [],
      });
    } else if (isStorefront) {
      const p = await getUserProfile(cred.user.uid, storefrontDb);
      if (p?.disabled) {
        await firebaseSignOut(authInstance);
        throw new Error("This account has been disabled. Contact support.");
      }
    }
  }, [authInstance, isStorefront]);

  const signOut = useCallback(async () => {
    if (!authInstance) return;
    await firebaseSignOut(authInstance);
  }, [authInstance]);

  const resetPassword = useCallback(
    async (email: string) => {
      if (!authInstance) throw new Error("Authentication unavailable.");
      await sendPasswordResetEmail(authInstance, email, getAuthEmailActionSettings());
    },
    [authInstance]
  );

  const resendVerificationEmail = useCallback(async () => {
    if (!authInstance || !user) throw new Error("Not signed in.");
    if (user.emailVerified) return;
    await sendEmailVerification(user, getAuthEmailActionSettings());
  }, [authInstance, user]);

  const reloadUser = useCallback(async () => {
    if (!authInstance || !user) return;
    await reload(user);
    setUser(authInstance.currentUser);
  }, [authInstance, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin: adminFlag,
        isStorefront,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        resendVerificationEmail,
        reloadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
