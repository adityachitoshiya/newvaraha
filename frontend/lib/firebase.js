import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { getPerformance } from "firebase/performance";

const firebaseConfig = {
    apiKey: "AIzaSyBKr-u6vC3MgSe0wzrHlZlBYDboKYEsHqc",
    authDomain: "varaha-jewels-online.firebaseapp.com",
    projectId: "varaha-jewels-online",
    storageBucket: "varaha-jewels-online.firebasestorage.app",
    messagingSenderId: "146018955833",
    appId: "1:146018955833:web:92f55eb70edbc4eca693e8"
};

// Initialize Firebase only once
let app;
let analytics;
let perf;

if (typeof window !== "undefined" && !getApps().length) {
    app = initializeApp(firebaseConfig);

    // Initialize Analytics conditionally (safeguard)
    isAnalyticsSupported().then((supported) => {
        if (supported) {
            analytics = getAnalytics(app);
            console.log("Firebase Analytics Initialized 🚀");
        }
    });

    // Initialize Performance Monitoring
    perf = getPerformance(app);
    console.log("Firebase Performance Monitoring Initialized ⚡");
} else if (getApps().length) {
    app = getApps()[0];
}

export { app, analytics, perf };
