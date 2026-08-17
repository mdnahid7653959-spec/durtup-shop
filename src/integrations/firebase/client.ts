import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getDataConnect } from "firebase/data-connect";
import { connectorConfig } from "./dataconnect";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCIcvphAtwx7rup-aV3MZPDK0w-xCN1Xoc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "eshop-app-6119d.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "eshop-app-6119d",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "eshop-app-6119d.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "18064875571",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:18064875571:web:0cd166f0bc0446c7bc0346"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app);
export const dataConnect = getDataConnect(app, connectorConfig);

// Google Auth Setup
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const registerUserLocally = (u: { id: string; email: string; full_name?: string | null; avatar_url?: string | null; role?: string; phone?: string | null }) => {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("durtup_registered_users");
    let users = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(users)) users = [];
    const idx = users.findIndex((item: any) => item.id === u.id || item.email === u.email);
    const entry = {
      id: u.id,
      user_id: u.id,
      email: u.email,
      full_name: u.full_name || "Registered User",
      phone: u.phone || null,
      avatar_url: u.avatar_url || null,
      role: u.role || "customer",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...entry };
    } else {
      users.unshift(entry);
    }
    localStorage.setItem("durtup_registered_users", JSON.stringify(users));
    window.dispatchEvent(new CustomEvent("admin_users_updated"));
  } catch (e) {
    console.warn("Failed caching user locally:", e);
  }
};

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  if (result.user) {
    const userProf = {
      id: result.user.uid,
      email: result.user.email || "",
      full_name: result.user.displayName || "Google User",
      avatar_url: result.user.photoURL || null,
      role: "customer"
    };
    registerUserLocally(userProf);

    try {
      const userDoc = doc(db, "profiles", result.user.uid);
      const userSnap = await getDoc(userDoc);
      if (!userSnap.exists()) {
        await setDoc(userDoc, {
          ...userProf,
          user_id: result.user.uid,
          created_at: new Date().toISOString()
        }, { merge: true });
      }
    } catch (profileErr) {
      console.warn("Firestore profile sync notice (non-fatal):", profileErr);
    }
  }
  return result;
};
