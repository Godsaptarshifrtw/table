import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";

function formatPrivateKey(key?: string) {
  if (!key) return undefined;
  return key.replace(/\\n/g, "\n");
}

const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
const privateKey = formatPrivateKey(rawPrivateKey);
const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  "table-b3614";

export const isFirebaseAdminConfigured = Boolean(clientEmail && privateKey);

let app: App | undefined;
let adminAuthInstance: Auth | undefined;
let adminDbInstance: Firestore | undefined;
let adminStorageInstance: Storage | undefined;

if (isFirebaseAdminConfigured) {
  try {
    if (getApps().length === 0) {
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail: clientEmail!,
          privateKey: privateKey!,
        }),
      });
    } else {
      app = getApps()[0];
    }

    adminAuthInstance = getAuth(app);
    adminDbInstance = getFirestore(app);
    adminStorageInstance = getStorage(app);
    console.log("[Firebase Admin] Initialized with Service Account credentials.");
  } catch (error) {
    console.warn("[Firebase Admin] Initialization failed, falling back to local memory store:", error);
  }
} else {
  // Graceful no-op fallback when running locally with Firebase Web Client SDK only
  // This prevents GCP metadata server timeouts (ETIMEDOUT / ENOTFOUND 169.254.169.254)
}

export const adminAuth = (adminAuthInstance || {}) as Auth;
export const adminDb = (adminDbInstance || {}) as Firestore;
export const adminStorage = (adminStorageInstance || {}) as Storage;
