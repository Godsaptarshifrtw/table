import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";

function formatPrivateKey(key?: string) {
  if (!key) return undefined;
  let formatted = key.replace(/\\n/g, "\n").trim();
  // Strip outer quotes if pasted with quotes
  if (
    (formatted.startsWith('"') && formatted.endsWith('"')) ||
    (formatted.startsWith("'") && formatted.endsWith("'"))
  ) {
    formatted = formatted.slice(1, -1);
  }
  return formatted;
}

const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
const privateKey = formatPrivateKey(rawPrivateKey);
const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  "table-b3614";

let app: App | undefined;
let adminAuthInstance: Auth | undefined;
let adminDbInstance: Firestore | undefined;
let adminStorageInstance: Storage | undefined;

// Only attempt initialization if email and private key are valid strings
if (
  clientEmail &&
  privateKey &&
  clientEmail.length > 5 &&
  privateKey.includes("BEGIN PRIVATE KEY")
) {
  try {
    if (getApps().length === 0) {
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
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
    console.warn("[Firebase Admin] Initialization failed, using local store fallback:", error);
    adminAuthInstance = undefined;
    adminDbInstance = undefined;
    adminStorageInstance = undefined;
  }
}

// True ONLY when adminDbInstance is successfully initialized and has collection method
export const isFirebaseAdminConfigured = Boolean(
  adminDbInstance && typeof adminDbInstance.collection === "function"
);

export const adminAuth = (adminAuthInstance || {}) as Auth;
export const adminDb = (adminDbInstance || {}) as Firestore;
export const adminStorage = (adminStorageInstance || {}) as Storage;
