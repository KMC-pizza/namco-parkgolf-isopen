import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { getMessaging, isSupported } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging.js";

const config = window.NAMCO_CONFIG;

if (!config?.firebase?.projectId) {
  throw new Error("Firebase 설정값이 없습니다.");
}

export const firebaseApp = getApps().length
  ? getApp()
  : initializeApp(config.firebase);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

export async function ensureAnonymousUser() {
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
}

export async function getSupportedMessaging() {
  const supported = await isSupported().catch(() => false);
  return supported ? getMessaging(firebaseApp) : null;
}
