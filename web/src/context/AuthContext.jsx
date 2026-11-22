import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as updateAuthProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

import { auth, db, demoMode } from "../lib/firebase.js";
import { DEMO_CREDENTIALS } from "../lib/constants.js";
import { demoUsers } from "../data/demoListings.js";

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: false,
  role: null,
  isAuthenticated: false,
  signup: async () => {},
  login: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  updateUserProfile: async () => {},
  refreshProfile: async () => {},
});

const FRIENDLY_ERRORS = {
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Use a password with at least 8 characters.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "Network problem. Check your connection and try again.",
  "auth/operation-not-allowed": "Email/password sign-in is not enabled in Firebase yet.",
};

export function friendlyAuthError(error) {
  return FRIENDLY_ERRORS[error?.code] || error?.message || "Something went wrong. Please try again.";
}

const DEMO_SESSION_KEY = "rentsaathi.demoSession";

function demoProfileForEmail(email) {
  const account = DEMO_CREDENTIALS.find((item) => item.email === email.toLowerCase());
  if (!account) return null;
  return demoUsers.find((user) => user.email === email.toLowerCase()) || null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setProfile(null);
      return null;
    }
    const snapshot = await getDoc(doc(db, "users", firebaseUser.uid));
    if (!snapshot.exists()) {
      setProfile(null);
      return null;
    }
    const data = { uid: firebaseUser.uid, ...snapshot.data() };
    setProfile(data);
    return data;
  }, []);

  useEffect(() => {
    if (demoMode) {
      const stored = typeof localStorage !== "undefined" ? localStorage.getItem(DEMO_SESSION_KEY) : null;
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUser({ uid: parsed.uid, email: parsed.email, displayName: parsed.name });
          setProfile(parsed);
        } catch {
          localStorage.removeItem(DEMO_SESSION_KEY);
        }
      }
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          await loadProfile(firebaseUser);
        } catch (error) {
          console.warn("[rentsaathi] Could not load profile", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [loadProfile]);

  const login = useCallback(
    async (email, password) => {
      if (demoMode) {
        const account = DEMO_CREDENTIALS.find(
          (item) => item.email === email.trim().toLowerCase() && item.password === password,
        );
        if (!account) {
          const error = new Error("Use one of the demo accounts listed on this page.");
          error.code = "auth/invalid-credential";
          throw error;
        }
        const demoProfile = demoProfileForEmail(account.email);
        const session = { ...demoProfile };
        setUser({ uid: session.uid, email: session.email, displayName: session.name });
        setProfile(session);
        localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
        return session;
      }

      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const nextProfile = await loadProfile(credential.user);
      return nextProfile || { uid: credential.user.uid, email: credential.user.email };
    },
    [loadProfile],
  );

  const signup = useCallback(
    async ({ name, email, password, role, phone, university }) => {
      if (!["student", "landlord"].includes(role)) {
        throw new Error("Choose whether you are a student or a landlord.");
      }
      if (demoMode) {
        const session = {
          uid: `demo-${role}-${Date.now()}`,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone || "",
          role,
          university: university || "",
          verificationStatus: role === "landlord" ? "pending" : "approved",
          documents: [],
          suspended: false,
          createdAt: new Date().toISOString(),
        };
        setUser({ uid: session.uid, email: session.email, displayName: session.name });
        setProfile(session);
        localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
        return session;
      }

      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateAuthProfile(credential.user, { displayName: name.trim() });
      const data = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone || "",
        role,
        university: university || "",
        verificationStatus: role === "landlord" ? "pending" : "approved",
        documents: [],
        suspended: false,
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, "users", credential.user.uid), data);
      const nextProfile = { uid: credential.user.uid, ...data };
      setProfile(nextProfile);
      return nextProfile;
    },
    [],
  );

  const logout = useCallback(async () => {
    if (demoMode) {
      localStorage.removeItem(DEMO_SESSION_KEY);
      setUser(null);
      setProfile(null);
      return;
    }
    await signOut(auth);
  }, []);

  const resetPassword = useCallback(async (email) => {
    if (demoMode) return { demo: true };
    return sendPasswordResetEmail(auth, email.trim());
  }, []);

  const updateUserProfile = useCallback(
    async (changes) => {
      if (!user) throw new Error("Sign in first.");
      if (demoMode) {
        const next = { ...profile, ...changes };
        setProfile(next);
        localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(next));
        return next;
      }
      await updateDoc(doc(db, "users", user.uid), changes);
      return loadProfile(user);
    },
    [loadProfile, profile, user],
  );

  const refreshProfile = useCallback(async () => {
    if (demoMode) return profile;
    return loadProfile(auth.currentUser);
  }, [loadProfile, profile]);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      role: profile?.role || null,
      isAuthenticated: Boolean(user),
      signup,
      login,
      logout,
      resetPassword,
      updateUserProfile,
      refreshProfile,
    }),
    [user, profile, loading, signup, login, logout, resetPassword, updateUserProfile, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
