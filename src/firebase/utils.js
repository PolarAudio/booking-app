// src/firebase/utils.js
import { app } from './init'; // Import the initialized Firebase app instance

/**
 * Safely retrieves the Firebase Project ID from the initialized Firebase app.
 * This is more reliable than environment variables in some deployment contexts.
 * @returns {string | null} The Firebase Project ID, or null if the app is not initialized or projectId is missing.
 */
export const getFirebaseProjectId = () => {
    if (app && app.options && app.options.projectId) {
        return app.options.projectId;
    }
    console.warn("Firebase app or projectId not available from app.options.");
    return null;
};
