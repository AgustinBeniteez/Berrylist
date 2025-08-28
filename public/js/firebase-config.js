// Configuración de Firebase para Berrylist
// Las credenciales se obtienen desde variables de entorno del servidor

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// Función para obtener la configuración de Firebase desde el servidor
async function getFirebaseConfig() {
    try {
        const response = await fetch('/api/firebase-config');
        if (!response.ok) {
            throw new Error('Failed to fetch Firebase config');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching Firebase config:', error);
        throw new Error('Firebase configuration not available. Please check environment variables.');
    }
}

// Initialize Firebase asynchronously
async function initializeFirebase() {
    const firebaseConfig = await getFirebaseConfig();
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const database = getDatabase(app);
    const analytics = getAnalytics(app);
    
    // Make Firebase services globally available
    window.firebaseAuth = auth;
    window.firebaseDatabase = database;
    window.firebaseApp = app;
    window.firebaseAnalytics = analytics;
    
    return { app, auth, database, analytics };
}

// Initialize Firebase and export the promise
const firebasePromise = initializeFirebase();

export { firebasePromise };