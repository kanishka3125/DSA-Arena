import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWwN07xYK_4IWkApwp0zhBKymBvA0zoY8",
  authDomain: "dsa-arena.firebaseapp.com",
  projectId: "dsa-arena",
  storageBucket: "dsa-arena.firebasestorage.app",
  messagingSenderId: "910535993522",
  appId: "1:910535993522:web:b25102c2ce99659a5d41ab",
  measurementId: "G-1XDTFXVQK9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
