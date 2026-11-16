import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  Auth,
  getAuth,
  GoogleAuthProvider,
  initializeAuth,
} from "firebase/auth";
// @ts-ignore: ada saat runtime di React Native, tapi tidak ada di tipe
import { getReactNativePersistence } from "firebase/auth";
import { Platform } from "react-native";
import { getFirestore } from "firebase/firestore/lite";

const firebaseConfig = {
  apiKey: "AIzaSyCWjEUeC1Qo6YsRbJ49B5m0UjgdOARrbzc",
  authDomain: "ppk-praktikum-2026-32690.firebaseapp.com",
  projectId: "ppk-praktikum-2026-32690",
  storageBucket: "ppk-praktikum-2026-32690.firebasestorage.app",
  messagingSenderId: "913813945120",
  appId: "1:913813945120:web:1730094757e78fbb357545",
};

// getApps() mencegah inisialisasi ganda saat Fast Refresh
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let authInstance: Auth;
if (Platform.OS === "web") {
  // Web: persistence bawaan (IndexedDB) sudah cukup
  authInstance = getAuth(app);
} else {
  // Android/iOS: simpan sesi di AsyncStorage agar tidak hilang saat aplikasi ditutup
  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Sudah diinisialisasi (mis. setelah Fast Refresh)
    authInstance = getAuth(app);
  }
}

export const auth = authInstance;
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
