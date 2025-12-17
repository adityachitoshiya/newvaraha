import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyAXXWe9-oXBLoUAVxCTrVrCLvOcQlNOV7M",
    authDomain: "varaha-jewels.firebaseapp.com",
    databaseURL: "https://varaha-jewels-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "varaha-jewels",
    storageBucket: "varaha-jewels.firebasestorage.app",
    messagingSenderId: "791760530552",
    appId: "1:791760530552:web:6bd6cf05e7a7004cdc918d",
    measurementId: "G-RQNTDTJ1LL"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Analytics (only on client side)
if (typeof window !== "undefined") {
    isSupported().then((yes) => {
        if (yes) {
            getAnalytics(app);
        }
    });
}

export { auth, db, googleProvider };
