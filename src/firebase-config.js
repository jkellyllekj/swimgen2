// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB8rh3jBQddKCsP__NEI98wg0AKkp-xiX4",
  authDomain: "swimsum-production.firebaseapp.com",
  projectId: "swimsum-production",
  storageBucket: "swimsum-production.firebasestorage.app",
  messagingSenderId: "660683677456",
  appId: "1:660683677456:web:4099e24d17229d0a6e4f95",
  measurementId: "G-TT6NRVFG18"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
