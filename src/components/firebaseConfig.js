// src/components/firebaseConfig.js

// This file should ONLY contain your Firebase configuration object.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Add validation and logging (keep this)
const validateConfig = (config) => {
  const requiredKeys = [
    'apiKey', 'authDomain', 'projectId', 
    'storageBucket', 'messagingSenderId', 'appId'
  ];
  
  let isValid = true;
  
  requiredKeys.forEach(key => {
    if (!config[key]) {
      console.error(`Missing Firebase config: ${key}`);
      isValid = false;
    } else if (config[key].includes('YOUR_') || config[key].includes('example')) {
    }
  });

  return isValid;
};

if (import.meta.env.DEV) {
  if (!validateConfig(firebaseConfig)) {
  }
}

export default firebaseConfig; // Only export the config object
