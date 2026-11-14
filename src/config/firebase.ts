import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore/lite";

const firebaseConfig = {
  apiKey: "AIzaSyCWjEUeC1Qo6YsRbJ49B5m0UjgdOARrbzc",
  authDomain: "ppk-praktikum-2026-32690.firebaseapp.com",
  projectId: "ppk-praktikum-2026-32690",
  storageBucket: "ppk-praktikum-2026-32690.firebasestorage.app",
  messagingSenderId: "913813945120",
  appId: "1:913813945120:web:1730094757e78fbb357545",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();