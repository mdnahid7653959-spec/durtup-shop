import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import { 
  User as FirebaseUser, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/integrations/firebase/client";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
}

interface AuthContextType {
  user: (FirebaseUser & { id: string }) | null;
  session: any | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSeller: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache profile data in memory
const profileCache = new Map<string, Profile>();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const cached = profileCache.get(userId);
    if (cached) {
      setProfile(cached);
      return;
    }

    try {
      const docRef = doc(db, "profiles", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Profile;
        profileCache.set(userId, data);
        setProfile(data);
      } else {
        const defaultProf: Profile = {
          id: userId,
          user_id: userId,
          email: auth.currentUser?.email || "",
          full_name: auth.currentUser?.displayName || null,
          role: "customer",
          avatar_url: auth.currentUser?.photoURL || null
        };
        setProfile(defaultProf);
      }
    } catch (error) {
      console.error("Error fetching profile from Firebase:", error);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userWithId = Object.assign(firebaseUser, { id: firebaseUser.uid });
        setUser(userWithId as any);
        fetchProfile(firebaseUser.uid);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    if (firebaseUser) {
      await updateProfile(firebaseUser, { displayName: fullName });
      
      const newProf: Profile = {
        id: firebaseUser.uid,
        user_id: firebaseUser.uid,
        email: email,
        full_name: fullName,
        role: "customer",
        avatar_url: null
      };

      const { registerUserLocally } = await import("@/integrations/firebase/client");
      registerUserLocally(newProf);

      try {
        await setDoc(doc(db, "profiles", firebaseUser.uid), newProf, { merge: true });
        profileCache.set(firebaseUser.uid, newProf);
        setProfile(newProf);
      } catch (err) {
        console.error("Error creating Firebase profile document:", err);
      }
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setProfile(null);
    profileCache.clear();
  }, []);

  const userWithId = useMemo(() => {
    if (!user) return null;
    return new Proxy(user, {
      get(target, prop) {
        if (prop === 'id') return target.uid;
        const val = (target as any)[prop];
        return typeof val === 'function' ? val.bind(target) : val;
      }
    }) as any;
  }, [user]);

  const isAdmin = profile?.role === "admin";
  const isSeller = profile?.role === "seller" || isAdmin;

  const handleGoogleSignIn = useCallback(async () => {
    const { signInWithGoogle } = await import("@/integrations/firebase/client");
    await signInWithGoogle();
  }, []);

  const value = useMemo(() => ({
    user: userWithId,
    session: userWithId ? { user: userWithId } : null,
    profile,
    loading,
    signUp,
    signIn,
    signInWithGoogle: handleGoogleSignIn,
    signOut,
    isAdmin,
    isSeller
  }), [userWithId, profile, loading, signUp, signIn, handleGoogleSignIn, signOut, isAdmin, isSeller]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
