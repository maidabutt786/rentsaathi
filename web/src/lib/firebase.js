import { initializeApp, getApps } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "rentsaathi-demo.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "rentsaathi-demo",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "rentsaathi-demo.appspot.com",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: env.VITE_FIREBASE_APP_ID || "1:000000000000:web:demo",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
};

export const isFirebaseConfigured = Boolean(
  env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_APP_ID,
);

export const useEmulators = String(env.VITE_USE_EMULATORS || "false") === "true";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, env.VITE_FUNCTIONS_REGION || "asia-south1");

const CONNECTED = "__rentsaathiEmulatorsConnected";
if (useEmulators && !globalThis[CONNECTED]) {
  const host = env.VITE_EMULATOR_HOST || "127.0.0.1";
  try {
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
    connectStorageEmulator(storage, host, 9199);
    connectFunctionsEmulator(functions, host, 5001);
    globalThis[CONNECTED] = true;
  } catch (error) {
    console.warn("[rentsaathi] Emulator connection skipped", error);
  }
}

// "auto" keeps the public portal usable before Firebase is configured. With emulators on we
// always use Firestore so the seeded data is exercised.
export const demoMode =
  String(env.VITE_DEMO_MODE || "auto") === "true" || (!isFirebaseConfigured && !useEmulators);

export const aiServiceUrl = (env.VITE_AI_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
export const googleMapsKey = env.VITE_GOOGLE_MAPS_API_KEY || "";

export default app;
