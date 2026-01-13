
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // ✅ Import Firestore

const firebaseConfig = {
  apiKey: "AIzaSyBcOQOJ0_chLQqvkBNxmnltuUGUzWAQ678",
  authDomain: "tracker-94247.firebaseapp.com",
  projectId: "tracker-94247",
  storageBucket: "tracker-94247.firebasestorage.app",
  messagingSenderId: "895251557580",
  appId: "1:895251557580:web:af13331f6c55c8f4c0a669",
  measurementId: "G-EPQV246DR1",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app); // ✅ Export Database