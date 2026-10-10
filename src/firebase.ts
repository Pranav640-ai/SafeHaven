import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCvldgBJUaAKjNsD0OToLHO0nHi_LYJlo0",
  authDomain: "safe-havenai.firebaseapp.com",
  projectId: "safe-havenai",
  storageBucket: "safe-havenai.firebasestorage.app",
  messagingSenderId: "724792279710",
  appId: "1:724792279710:web:b9a0d496a95da9c5c2318f",
  measurementId: "G-BP7FW7Y6JQ"
};

const app: FirebaseApp = initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const googleProvider: GoogleAuthProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
