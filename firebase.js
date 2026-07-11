import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCOHFNh6YsabEjfuOwSXRA0C9IKs7u1pac",
  authDomain: "speak-coach-e9a6c.firebaseapp.com",
  projectId: "speak-coach-e9a6c",
  storageBucket: "speak-coach-e9a6c.firebasestorage.app",
  messagingSenderId: "25469449",
  appId: "1:25469449:web:f86fbe0d13a061bf104ed8",
  measurementId: "G-MBXR4XGML3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export let currentUser = null;

// Auth Functions
export const loginWithGoogle = async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login failed:", error);
        alert(`Login failed: ${error.message} (Code: ${error.code})`);
    }
};

export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout failed:", error);
    }
};

export const onAuthChange = (callback) => {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        callback(user);
    });
};

// Database Functions
export const saveMessageToDB = async (role, text, correction = null) => {
    if (!currentUser) return;
    
    try {
        await addDoc(collection(db, `users/${currentUser.uid}/messages`), {
            role: role,
            text: text,
            correction: correction,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Error saving message:", error);
    }
};

export const loadChatHistory = async (callback) => {
    if (!currentUser) return;

    const q = query(collection(db, `users/${currentUser.uid}/messages`), orderBy("timestamp", "asc"));
    
    // Use getDocs for initial load to avoid duplicate rendering on snapshot changes
    try {
        const querySnapshot = await getDocs(q);
        const messages = [];
        querySnapshot.forEach((doc) => {
            messages.push(doc.data());
        });
        callback(messages);
    } catch (error) {
        console.error("Error loading history:", error);
    }
};
