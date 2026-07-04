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

  type User,

} from "firebase/auth";

import type { Auth } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { storefrontAuth, db as storefrontDb, adminDb } from "@/lib/firebase";
import { getApiUrl } from "@/lib/api-base";

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

  signIn: (email: string, password: string) => Promise<User>;

  signUp: (data: {

    email: string;

    password: string;

    firstName: string;

    lastName: string;

    phoneNumber: string;

  }) => Promise<void>;

  signOut: () => Promise<void>;

  resetPassword: (email: string) => Promise<void>;

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

    if (isStorefront) {
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
    } else {
      user
        .getIdToken()
        .then((token) =>
          fetch(getApiUrl("/api/admin/session"), {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          })
        )
        .then((res) => {
          if (cancelled) return;
          setAdminFlag(res.ok);
          adminReady = true;
          tryFinishLoading();
        })
        .catch((err) => {
          console.error("admin access verification error:", err);
          if (!cancelled) {
            setAdminFlag(false);
            adminReady = true;
            tryFinishLoading();
          }
        });
    }

    return () => {
      cancelled = true;
      unsubProfile();
      unsubAdmin();
    };
  }, [user, authInstance, isStorefront, firestoreDb]);



  const signIn = useCallback(async (email: string, password: string): Promise<User> => {

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

  }, [authInstance, isStorefront]);



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

    },

    [authInstance]

  );



  const signOut = useCallback(async () => {

    if (!authInstance) return;

    await firebaseSignOut(authInstance);

  }, [authInstance]);



  const resetPassword = useCallback(async (email: string) => {

    if (!authInstance) throw new Error("Authentication unavailable.");

    await sendPasswordResetEmail(authInstance, email);

  }, [authInstance]);



  return (

    <AuthContext.Provider

      value={{

        user,

        profile,

        loading,

        isAdmin: adminFlag,

        signIn,

        signUp,

        signOut,

        resetPassword,

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

