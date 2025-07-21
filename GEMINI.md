# GEMINI.md - Project Overview

This document provides a high-level overview of the `vite-project` frontend application, intended for context when interacting with other Gemini instances.

## 1. Project Purpose

This is a **React-based booking application** designed for users to schedule and manage DJ studio sessions. It allows users to:

*   Select dates and time slots for booking.
*   Specify session duration.
*   View booking summaries and total costs.
*   Manage their personal profile (display name, password).
*   View and manage their past and upcoming bookings.
*   Authenticate via email/password, Google, or as a guest.

## 2. Technology Stack

*   **Frontend Framework:** React.js (with Vite for fast development)
*   **Styling:** Tailwind CSS
*   **State Management:** React Hooks (`useState`, `useMemo`, `useCallback`, `useEffect`, `useRef`)
*   **Routing:** React Router DOM
*   **Date/Time Handling:** Moment.js and Moment-timezone
*   **Backend Communication:** Native Fetch API
*   **Authentication & Database:** Firebase (Authentication and Firestore)

## 3. Key Features & Components

*   **Booking Flow:** Users select date, time, and duration. Equipment is included. Summary and total cost are displayed.
*   **Authentication (`AuthModal`):** Handles user sign-up, login (email/password, Google, guest), and state management.
*   **Profile Management (`ProfileModal`):** Allows authenticated users to update their display name and change their password.
*   **Booking Display:** Authenticated users can view a list of their past and current bookings.
*   **Booking Actions:** Users can edit or cancel their own bookings.
*   **Firebase Integration:**
    *   **Authentication:** Manages user sessions, sign-in/out, and profile updates.
    *   **Firestore:** Stores user profiles and booking data. Data is structured under `artifacts/{appId}/users/{userId}/bookings` and `artifacts/{appId}/users/{userId}/profiles/userProfile`.
*   **Backend API Interaction:** Communicates with a separate backend API for operations like checking booked slots, confirming bookings, updating profiles, and canceling bookings. Authentication tokens are passed via `Authorization` headers.

## 4. Project Structure Highlights

*   `src/App.jsx`: Main application component, handles overall state, routing, and orchestrates sub-components.
*   `src/components/`: Contains reusable UI components (e.g., `AuthModal`, `ProfileModal`, `EquipmentItem`).
*   `src/firebase/`: Contains Firebase initialization (`init.js`), security rules (`rules.js`), and utility functions (`utils.js`).
*   `src/constants.js`: Defines application-wide constants.
*   `src/utils.js`: Contains general utility functions (e.g., date formatting, currency formatting).

## 5. Development & Deployment Notes

*   **Environment Variables:** Backend API URL is configured via `VITE_BACKEND_API_BASE_URL` in `.env`.
*   **Firebase Project ID:** The Firebase project ID is dynamically retrieved via `getFirebaseProjectId()` but is also hardcoded as a fallback (`default-app-id`) and explicitly used in Firestore Security Rules.
*   **Firebase Security Rules:** Crucial for data access control. Rules are defined in `src/firebase/rules.js` and must be published to Firebase Firestore.

## 6. Related Projects

*   **Admin Dashboard:** A separate, standalone frontend project (`admin-front-end`) exists for administrative tasks.
*   **Backend API:** A separate backend API (e.g., `https://back-end-bahe.onrender.com`) handles business logic and secure interactions with Firebase.
