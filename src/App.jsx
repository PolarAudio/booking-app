// src/App.jsx

// Import necessary React hooks
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

// Import Moment.js for date/time handling
import moment from 'moment';
import 'moment-timezone'; // Import moment-timezone to extend moment

// Import Firebase and Firestore modules
// Import app, db, auth from the new firebase/init.js file
import { app, db, auth } from './firebase/init'; 

// Import specific Firebase Auth functions needed in this file
import { 
    onAuthStateChanged, 
    signInWithCustomToken, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    GoogleAuthProvider, 
    signInWithPopup, 
    updateProfile,
    updatePassword
} from 'firebase/auth'; 

// Import specific Firebase Firestore functions needed in this file
import { 
    collection, 
    query, 
    addDoc, 
    onSnapshot, 
    serverTimestamp, 
    doc, 
    deleteDoc, 
    setDoc, 
    getDoc 
} from 'firebase/firestore'; 
import { getFunctions, httpsCallable } from 'firebase/functions'; 

// Import constants and utilities
import { DJ_EQUIPMENT, ROOM_RATE_PER_HOUR } from './constants';
import { formatIDR, formatDate, formatTime, getEndTime } from './utils';

// Import the new Firebase project ID utility
import { getFirebaseProjectId } from './firebase/utils'; // <--- NEW IMPORT

// Import sub-components
import Modal from './components/Modal';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import ConfirmationModal from './components/ConfirmationModal';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import EquipmentItem from './components/EquipmentItem';
import { Link, Routes, Route } from 'react-router-dom';
import PaymentOption from './components/PaymentOption';


// --- Canvas Environment Variables ---
// Use getFirebaseProjectId for the most reliable APP_ID
const APP_ID_FOR_FIRESTORE_PATH = getFirebaseProjectId() || 'default-app-id'; // <--- UPDATED APP_ID DEFINITION
const INITIAL_AUTH_TOKEN_FROM_CANVAS = null;

// --- Backend API Base URL ---
// IMPORTANT: For production, this should also be an environment variable.
const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL || 'https://back-end-bahe.onrender.com';

// --- Main Booking Application Component ---
function BookingApp() {
    // UI state
    const [selectedDate, setSelectedDate] = useState('');
    const [isBackendOnline, setIsBackendOnline] = useState(true); // New state for backend status
    const previousBackendStatus = useRef(true); // Ref to store previous backend status

    // Effect for backend health check
    useEffect(() => {
        const checkBackendStatus = async () => {
            try {
                const response = await fetch(`${BACKEND_API_BASE_URL}/`); // Ping the backend root
                const data = await response.json();
                const isCurrentlyOnline = response.ok && data.status === 'online';
                setIsBackendOnline(isCurrentlyOnline);

                // If backend was offline and is now online, trigger a full page reload
                if (!previousBackendStatus.current && isCurrentlyOnline) {
                    window.location.reload();
                }
                previousBackendStatus.current = isCurrentlyOnline;

            } catch (error) {
                console.error("Backend health check failed:", error);
                setIsBackendOnline(false);
                previousBackendStatus.current = false;
            }
        };

        // Initial check
        checkBackendStatus();

        // Set up interval for periodic checks (e.g., every 10 seconds)
        const intervalId = setInterval(checkBackendStatus, 60000); 

        return () => clearInterval(intervalId); // Clean up interval on unmount
    }, []);
    const [selectedTime, setSelectedTime] = useState('');
    const [duration, setDuration] = useState(2);
    const [selectedEquipment, setSelectedEquipment] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [currentBooking, setCurrentBooking] = useState(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');
    const [paymentConfirmMessage, setPaymentConfirmMessage] = useState(null);

    // Edit/Cancel specific state
    const [editingBookingId, setEditingBookingId] = useState(null);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [bookingToDelete, setBookingToDelete] = useState(null);

    // Conflict Check state
    const [showConflictModal, setShowConflictModal] = useState(false);
    const [conflictError, setConflictError] = useState(null);
    const [conflictingSlots, setConflictingSlots] = useState([]);
    const [bookedSlotsForDate, setBookedSlotsForDate] = useState([]);

    // Firebase state (managed by onAuthStateChanged listener)
    const [userEmail, setUserEmail] = useState(null);
    const [userId, setUserId] = useState(null);
    const [userName, setUserName] = useState('');
    const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Still needed to track auth readiness
    const [isLoadingBookings, setIsLoadingBookings] = useState(false);
    const [error, setError] = useState(null);
    const [authError, setAuthError] = useState(null);

    // Authentication UI State
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoginMode, setIsLoginMode] = useState(true);

    // Profile Management State
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [newDisplayName, setNewDisplayName] = useState('');
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState(null);
    const [userCredits, setUserCredits] = useState(0);

    // Ref for scrolling to the booking form
    const bookingFormRef = useRef(null);


	// --- EFFECT 1: Handle Auth State and Custom Token ---
    // This effect now only sets up the onAuthStateChanged listener
    // as `app`, `db`, `auth` are globally initialized.
    useEffect(() => {
        let unsubscribeAuth = () => {};
        let unsubscribeProfile = () => {}; // To hold the profile listener unsubscribe function

        // Handle custom token from Canvas environment
        if (INITIAL_AUTH_TOKEN_FROM_CANVAS) {
            try {
                signInWithCustomToken(auth, INITIAL_AUTH_TOKEN_FROM_CANVAS)
                    .then(() => console.log("Signed in with custom token."))
                    .catch(error => console.error("Custom token sign-in error:", error));
            } catch (error) {
                console.error("Error initializing custom token sign-in:", error);
            }
        }

        // Set up auth state listener using the global `auth` instance
        unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            // First, clean up any existing profile listener
            if (unsubscribeProfile) {
                unsubscribeProfile();
            }

            if (user) {
                setUserEmail(user.email);
                setUserId(user.uid);
                setAuthError(null);

                // --- REAL-TIME PROFILE LISTENER ---
                const userProfileDocRef = doc(db, `artifacts/${APP_ID_FOR_FIRESTORE_PATH}/users/${user.uid}/profiles/userProfile`);
                
                unsubscribeProfile = onSnapshot(userProfileDocRef, (profileSnap) => {
                    if (profileSnap.exists()) {
                        const profileData = profileSnap.data();
                        const displayNameToUse = profileData.displayName || user.displayName || user.email || 'New User';
                        setUserName(displayNameToUse);
                        setNewDisplayName(displayNameToUse);
                        setUserCredits(profileData.credits || 0); // Update credits from real-time data
                    } else {
                        // If profile doesn't exist, create it
                        const displayNameToUse = user.displayName || user.email || 'New User';
                        setDoc(userProfileDocRef, {
                            userId: user.uid,
                            displayName: displayNameToUse,
                            email: user.email,
                            credits: 0, // Initialize credits
                            createdAt: serverTimestamp()
                        }, { merge: true }).catch(err => console.error("Error creating user profile:", err));
                        setUserName(displayNameToUse);
                        setNewDisplayName(displayNameToUse);
                        setUserCredits(0);
                    }
                    setShowAuthModal(false);
                }, (error) => {
                    console.error("Error listening to profile updates:", error);
                    setProfileError(`Failed to load profile: ${error.message}`);
                    // Fallback to basic user info if profile listener fails
                    setUserName(user.displayName || user.email || 'New User');
                });

            } else {
                // User is signed out
                setUserId(null);
                setUserName('');
                setNewDisplayName('');
                setUserCredits(0);
                setAuthError(null);
                setProfileError(null);
                setShowAuthModal(false);
            }
            setIsLoadingAuth(false);
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeProfile) {
                unsubscribeProfile();
            }
        };
    }, []); // Empty dependency array because `auth` and `db` are global constants""


    // --- EFFECT 3: Firestore Bookings Real-time Listener (User-specific) ---
    useEffect(() => {
        // Use the global `db` instance
        if (!db || !userId || isLoadingAuth) { // `db` is global, no need for dbInstance state
            setBookings([]);
            return;
        }

        setIsLoadingBookings(true);
        setError(null);

        const collectionPath = `artifacts/${APP_ID_FOR_FIRESTORE_PATH}/users/${userId}/bookings`;
        const q = query(collection(db, collectionPath)); // Use the global `db` instance

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            fetchedBookings.sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0));
            setBookings(fetchedBookings);
            setIsLoadingBookings(false);
        }, (firestoreError) => {
            setError(`Failed to load your bookings: ${firestoreError.message}`);
            setIsLoadingBookings(false);
        });

        return () => unsubscribe();
    }, [userId, isLoadingAuth]);


    // --- EFFECT 4: Fetch Booked Slots for Selected Date from Backend ---
    useEffect(() => {
        const fetchBookedSlots = async () => {
            // Use the global `auth` instance and ensure currentUser exists
            if (!selectedDate || isLoadingAuth || !auth.currentUser) {
                setBookedSlotsForDate([]);
                return;
            }

            try {
                const idToken = await auth.currentUser.getIdToken();
                const response = await fetch(`${BACKEND_API_BASE_URL}/api/check-booked-slots?date=${selectedDate}`, {
                    headers: {
                        'Authorization': `Bearer ${idToken}`
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch booked slots.');
                }

                const data = await response.json();
                setBookedSlotsForDate(data.bookedSlots);
            } catch (fetchError) {
            }
        };

        fetchBookedSlots();
    }, [selectedDate, isLoadingAuth]);


    // --- EFFECT 5: Handle Payment Confirmation Link ---
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const bookingIdFromUrl = urlParams.get('bookingId');
        const confirmPaymentFromUrl = async () => {
            // Use the global `auth` instance and ensure currentUser exists
            if (!bookingIdFromUrl || !auth?.currentUser) return;

            history.replaceState({}, document.title, window.location.pathname);
            setPaymentConfirmMessage('Confirming payment...');
            try {
                const idToken = await auth.currentUser.getIdToken(); // Use the global `auth` instance
                const response = await fetch(`${BACKEND_API_BASE_URL}/api/confirm-payment`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ bookingId: bookingIdFromUrl })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to confirm payment.');
                setPaymentConfirmMessage(data.message || 'Payment confirmed successfully!');
            } catch (err) {
                console.error("Error confirming payment from URL:", err);
                setPaymentConfirmMessage(`Error confirming payment: ${err.message}`);
            } finally {
                setTimeout(() => setPaymentConfirmMessage(null), 5000);
            }
        };

        // Use the global `auth` instance
        if (bookingIdFromUrl && auth && !isLoadingAuth) {
            confirmPaymentFromUrl();
        }
    }, [isLoadingAuth]);


    // Memoized values
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);
    const timeSlots = useMemo(() => Array.from({ length: 8 }, (_, i) => {
        const hour = 9 + i;
        const time24 = `${hour.toString().padStart(2, '0')}:00`;
        const time12 = moment(time24, 'HH:mm').format('h:mm A');
        return { value: time24, label: time12 };
    }), []);

    const availableTimeSlotsForDisplay = useMemo(() => {
        const closingTime = moment(`${selectedDate} 18:00`, 'YYYY-MM-DD HH:mm');
        return timeSlots.map(slot => {
            const slotStartMoment = moment(`${selectedDate} ${slot.value}`, 'YYYY-MM-DD HH:mm');
            const proposedEndMoment = slotStartMoment.clone().add(duration, 'hours');
            let isDisabled = false;
            let disabledReason = '';

            if (proposedEndMoment.isAfter(closingTime)) {
                isDisabled = true;
                disabledReason = `Ends past ${closingTime.format('h:mm A')}`;
            } else if (selectedDate === today && slotStartMoment.isBefore(moment())) {
                isDisabled = true;
                disabledReason = 'Past time';
            } else if (bookedSlotsForDate.length > 0) {
                const isConflicting = bookedSlotsForDate.some(bookedSlot => {
                    if (editingBookingId && bookedSlot.id === editingBookingId) return false;
                    const bookedStartMoment = moment.tz(`${bookedSlot.date} ${bookedSlot.time}`, 'YYYY-MM-DD HH:mm', bookedSlot.userTimeZone || 'UTC');
                    const bookedEndMoment = bookedStartMoment.clone().add(bookedSlot.duration, 'hours');
                    return slotStartMoment.isBefore(bookedEndMoment) && proposedEndMoment.isAfter(bookedStartMoment);
                });
                if (isConflicting) {
                    isDisabled = true;
                    disabledReason = 'Booked';
                }
            }
            return { ...slot, label: slot.label + (isDisabled ? ` (${disabledReason})` : ''), disabled: isDisabled };
        });
    }, [selectedDate, bookedSlotsForDate, timeSlots, duration, editingBookingId, today]);

    const calculateTotal = useCallback(() => ROOM_RATE_PER_HOUR * duration, [duration]);
    const players = useMemo(() => DJ_EQUIPMENT.filter(eq => eq.category === 'player'), []);
    const mixers = useMemo(() => DJ_EQUIPMENT.filter(eq => eq.category === 'mixer'), []);
	const extra = useMemo(() => DJ_EQUIPMENT.filter(eq => eq.category === 'extra'), []);

    const handleDateChange = useCallback((e) => {
        setSelectedDate(e.target.value);
        setSelectedTime('');
    }, []);

    const toggleEquipment = useCallback((equipment) => {
        setSelectedEquipment(prev => prev.some(item => item.id === equipment.id)
            ? prev.filter(item => item.id !== equipment.id)
            : [...prev, equipment]
        );
    }, []);

    // --- Authentication Handlers ---
    const handleAuthAction = useCallback(async (action) => {
        // Use the global `auth` instance
        if (!auth) {
            setAuthError("Auth service not ready.");
            return;
        }
        setAuthError(null);
        try {
            const userCredential = await action(); // `action` itself might use `auth` internally
            if (!isLoginMode) { // After sign-up
                await updateProfile(userCredential.user, { displayName: email.split('@')[0] || 'New User' });
            }
        } catch (error) {
            setAuthError(`Failed: ${error.message}`);
        }
    }, [email, password, isLoginMode]);

    const handleGoogleSignIn = useCallback(async () => {
        // Use the global `auth` instance
        if (!auth) {
            return;
        }
        setAuthError(null);
        try {
            const result = await signInWithPopup(auth, new GoogleAuthProvider()); // Use the global `auth` instance
            // The onAuthStateChanged listener will handle setting user state and closing modal
        } catch (error) {
            setAuthError(`Google Sign-in failed: ${error.message}`);
            // Log specific error codes for debugging
            if (error.code) {
            }
        }
    }, []);

    // --- NEW: Handle Guest Login ---
    const handleGuestLogin = useCallback(async () => {
        // Use the global `auth` instance
        if (!auth) {
            setAuthError("Auth service not ready.");
            return;
        }
        setAuthError(null);
        try {
            await signInAnonymously(auth); // Use the global `auth` instance
            setShowAuthModal(false); // Close auth modal on successful guest login
        } catch (error) {
            setAuthError(`Guest login failed: ${error.message}`);
        }
    }, []);

    // --- IMPROVED LOGOUT HANDLER ---
    const handleLogout = useCallback(async () => {
        // Use the global `auth` instance
        if (!auth) return;
        try {
            await signOut(auth); // Use the global `auth` instance
            // Reset all relevant application state for a clean slate
            setUserId(null);
            setUserName('');
            setNewDisplayName('');
            setBookings([]);
            setBookedSlotsForDate([]);
            setEditingBookingId(null);
            setSelectedDate('');
            setSelectedTime('');
            setDuration(2);
            setSelectedEquipment([]);
            setSelectedPaymentMethod('cash');
            setError(null);
            setAuthError(null);
            setProfileError(null);
            setCurrentBooking(null);
            setShowConfirmation(false);
            setShowDeleteConfirmation(false);
            setShowAuthModal(false);
            setShowProfileModal(false);
        } catch (error) {
            setError(`Logout failed: ${error.message}`);
        }
    }, []);

    // --- Handle User Profile Update ---
    const handleUpdateProfile = useCallback(async () => {
        if (!userId || !newDisplayName.trim()) return;
        setProfileLoading(true);
        setProfileError(null);
        console.log("Attempting to update profile with new display name:", newDisplayName.trim());
        try {
            // 1. Update Firebase Authentication profile
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { displayName: newDisplayName.trim() });
                console.log("Firebase Auth profile updated.");
            }

            // 2. Update Firestore user profile document
            const userProfileDocRef = doc(db, `artifacts/${APP_ID_FOR_FIRESTORE_PATH}/users/${userId}/profiles/userProfile`);
            await setDoc(userProfileDocRef, {
                displayName: newDisplayName.trim(),
                lastUpdated: serverTimestamp() // Add a timestamp for when it was last updated
            }, { merge: true });
            console.log("Firestore profile document updated.");

            setUserName(newDisplayName.trim());
            setShowProfileModal(false);
            console.log("Profile updated successfully!");
        } catch (error) {
            console.error("Error updating profile:", error);
            setProfileError(`Failed to update profile: ${error.message}`);
        } finally {
            setProfileLoading(false);
        }
    }, [userId, newDisplayName]);

    // --- Handle User Password Update ---
    const handleUpdatePassword = useCallback(async (newPassword) => {
        if (!auth.currentUser) {
            throw new Error("No user logged in.");
        }
        if (newPassword.length < 6) {
            throw new Error("Password must be at least 6 characters long.");
        }
        try {
            await updatePassword(auth.currentUser, newPassword);
        } catch (error) {
            throw new Error(`Failed to update password: ${error.message}`);
        }
    }, []); // Dependency array is empty as 'auth' and 'updatePassword' are stable

    // --- Handle Booking Submission (new/update) ---
    const handleBooking = useCallback(async () => {
    // Equipment validation
    const hasPlayer = selectedEquipment.some(eq => eq.category === 'player');
    const hasMixer = selectedEquipment.some(eq => eq.category === 'mixer');

    if (!hasPlayer || !hasMixer) {
        alert('Please select at least one Player and one Mixer before booking.');
        return;
    }

    // Use the global `auth` instance and ensure currentUser exists
    if (!selectedDate || !selectedTime || !userId || !auth.currentUser) {
        setError('Please select date, time and be logged in to book.');
        return;
    }
    setIsLoadingBookings(true);
    setError(null);
    try {
        const idToken = await auth.currentUser.getIdToken(); // Use the global `auth` instance
        const bookingDataToSend = {
            date: selectedDate, time: selectedTime, duration,
            equipment: selectedEquipment.map(eq => ({ id: eq.id, name: eq.name, type: eq.type, category: eq.category })),
            total: calculateTotal(), paymentMethod: selectedPaymentMethod,
            paymentStatus: 'pending',
            userTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        const response = await fetch(`${BACKEND_API_BASE_URL}/api/confirm-booking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
            body: JSON.stringify({ bookingData: bookingDataToSend, userName, editingBookingId })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to confirm booking.');

        // Backend returns success and the actual booking ID (Firestore ID)
        setCurrentBooking({ ...bookingDataToSend, id: data.bookingId, userName: userName, timestamp: new Date(), paymentStatus: 'pending' });
        setShowConfirmation(true);
        setEditingBookingId(null);
        setSelectedDate('');
        setSelectedTime('');
        setDuration(2);
        setSelectedEquipment([]);
    } catch (bookingError) {
        setError(`Failed to book session: ${bookingError.message}`);
    } finally {
        setIsLoadingBookings(false);
    }
}, [selectedDate, selectedTime, duration, selectedEquipment, calculateTotal, userId, userName, editingBookingId, selectedPaymentMethod]);

    const handleEditBooking = useCallback((booking) => {
        setEditingBookingId(booking.id);
        setSelectedDate(booking.date);
        setSelectedTime(booking.time);
        setDuration(booking.duration);
        setSelectedEquipment(booking.equipment || []);
        setSelectedPaymentMethod(booking.paymentMethod || 'cash');
        setError(null);
        bookingFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    const handleCancelBooking = useCallback((booking) => {
        setBookingToDelete(booking);
        setShowDeleteConfirmation(true);
    }, []);

    // --- UPDATED DELETE/CANCEL LOGIC ---
    const confirmDeleteBooking = useCallback(async () => {
        // Use the global `auth` instance and ensure currentUser exists
        if (!bookingToDelete || !auth?.currentUser) return;
        setIsLoadingBookings(true);
        setError(null);
        try {
            const idToken = await auth.currentUser.getIdToken(); // Use the global `auth` instance
            // This now calls the backend to handle all deletions atomically
            const response = await fetch(`${BACKEND_API_BASE_URL}/api/cancel-booking`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ bookingId: bookingToDelete.id })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to cancel booking.');
            }
            // The onSnapshot listener will automatically remove the booking from the UI
        } catch (deleteError) {
            setError(`Failed to cancel booking: ${deleteError.message}`);
        } finally {
            setIsLoadingBookings(false);
            setShowDeleteConfirmation(false);
            setBookingToDelete(null);
        }
    }, [bookingToDelete]);

    // Initial loading state for the entire app
    // Now checks for global `app`, `db`, `auth` and `isLoadingAuth` (which covers auth state determination)
    if (isLoadingAuth || !app || !db || !auth) {
        return (
            <div className="bg-gray-900 min-h-screen flex items-center justify-center text-orange-200 text-2xl p-4 text-center">
                {error ? `Initialization Error: ${error}` : "Authenticating Firebase..."}
            </div>
        );
    }

    // Display backend offline message if applicable
    if (!isBackendOnline) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="bg-red-800 p-8 rounded-lg shadow-xl w-full max-w-md border border-red-700 text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">Server Offline or Under Maintenance</h2>
                    <p className="text-gray-200 mb-6">We are currently working on new features. Please try again in some Minutes.</p>
					<p className="text-gray-200 mb-6">If the Page is not back online after 10 Minutes contact the <a href="mailto:polarsolutions.warehouse@gmail.com">Admin</a></p>
                </div>
            </div>
        );
    }

    // Main App Render
    return (
        <Routes>
            <Route path="*" element={(
                <div className="min-h-screen bg-gray-900 p-4 font-sans">
                    <div className="max-w-4xl mx-auto">
                        {/* Header Section */}
                        <div className="text-center mb-8">
                            <h1 className="text-4xl font-bold text-orange-400 mb-2">POLAR SHOWROOM</h1>
                            <p className="text-gray-300 text-lg">Book your professional DJ room with premium equipment</p>
                            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                                {userId ? (
                                    <>
                                        <p className="text-gray-400 text-sm">Logged In: <span className="font-semibold text-orange-200">{userName}</span></p>
                                        <button onClick={() => setShowProfileModal(true)} className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm hover:bg-orange-700 transition shadow-lg">Edit Profile</button>
                                        <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700 transition shadow-lg">Logout</button>
                                    </>
                                ) : (
                                    // Modified this section to offer guest login or full auth
                                    <>
                                        <button onClick={() => setShowAuthModal(true)} className="px-6 py-3 bg-orange-600 text-white rounded-xl text-lg font-semibold hover:bg-orange-700 transition shadow-lg">Sign In / Sign Up</button>
                                        <button onClick={handleGuestLogin} className="px-6 py-3 bg-gray-700 text-gray-300 rounded-xl text-lg font-semibold hover:bg-gray-600 transition shadow-lg">Login as Guest</button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* General Error/Message Display */}
                        {(error || profileError || paymentConfirmMessage) && (
                            <div className={`px-4 py-3 rounded-xl relative mb-4 ${paymentConfirmMessage ? (paymentConfirmMessage.includes('Error') ? 'bg-red-800' : 'bg-green-800') : 'bg-red-800'} text-white`} role="alert">
                                <strong className="font-bold">{paymentConfirmMessage ? 'Status:' : 'Error!'}</strong>
                                <span className="block sm:inline"> {error || profileError || paymentConfirmMessage}</span>
                            </div>
                        )}

                        {/* Main Booking Card */}
                        <div ref={bookingFormRef} className="bg-gray-800 shadow-2xl rounded-2xl p-8 mb-6 border border-gray-700">
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-semibold text-orange-300 mb-4">📅 Schedule Your Session</h2>
                                    <div>
                                        <label htmlFor="select-date" className="block text-sm font-medium text-gray-300 mb-2">Select Date</label>
                                        <input id="select-date" type="date" min={today} value={selectedDate} onChange={handleDateChange} className="w-full p-3 border border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 bg-gray-700 text-white"/>
                                    </div>
                                    <div>
                                        <label htmlFor="select-time" className="block text-sm font-medium text-gray-300 mb-2">Select Time</label>
                                        <select id="select-time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} className="w-full p-3 border border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 bg-gray-700 text-white">
                                            <option value="">Choose a time...</option>
                                            {availableTimeSlotsForDisplay.map(slot => (
                                                <option key={slot.value} value={slot.value} disabled={slot.disabled} className={slot.disabled ? 'text-gray-500' : ''}>{slot.label}</option>
                                            ))}
                                        </select>
                                        {selectedDate && availableTimeSlotsForDisplay.every(s => s.disabled) && <p className="text-red-300 text-sm mt-2">No available slots for this date with the selected duration.</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="select-duration" className="block text-sm font-medium text-gray-300 mb-2">Duration (hours)</label>
                                        <select id="select-duration" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className="w-full p-3 border border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 bg-gray-700 text-white">
                                            <option value={2}>2 hours</option>
                                            <option value={3}>3 hours</option>
                                            <option value={4}>4 hours</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="bg-gray-700 rounded-xl p-6 border border-gray-600">
                                    <h3 className="text-xl font-semibold text-orange-300 mb-4">💰 Booking Summary</h3>
                                    <div className="space-y-3 text-gray-300">
                                        <div className="flex justify-between text-sm"><span>Room Rate (per hour)</span><span>{formatIDR(ROOM_RATE_PER_HOUR)}</span></div>
                                        <div className="flex justify-between text-sm"><span>Duration</span><span>{duration} hours</span></div>
                                        <div className="flex justify-between text-sm"><span>Equipment</span><span className="text-green-400">Included</span></div>
                                        <hr className="my-3 border-gray-600" />
                                        <div className="flex justify-between font-semibold text-lg"><span>Total</span><span className="text-orange-400">{formatIDR(calculateTotal())}</span></div>
                                    </div>
                                    {selectedDate && selectedTime && (
                                        <div className="mt-6 p-4 bg-gray-600 rounded-lg text-gray-200">
                                            <p className="font-medium">{formatDate(selectedDate)}</p>
                                            <p className="font-medium">{formatTime(selectedTime)} - {formatTime(getEndTime(selectedTime, duration))}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-800 shadow-2xl rounded-2xl p-8 mb-6 border border-gray-700">
                            <h2 className="text-2xl font-semibold text-orange-300 mb-6">🎛️ Select Equipment</h2>
                            <div className="space-y-3 mb-6"> {/* Removed grid, just stacked */}
                                <h3 className="text-lg font-semibold text-gray-300 mb-2">Players</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Optional: add grid here if you want players/mixers side-by-side */}
                                  {players.map(eq => <EquipmentItem key={eq.id} equipment={eq} isSelected={selectedEquipment.some(i => i.id === eq.id)} onToggle={toggleEquipment} />)}
                                </div>

                                <h3 className="text-lg font-semibold text-gray-300 mb-2 mt-4">Mixers</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4"> {/* Optional: add grid here */}
                                  {mixers.map(eq => <EquipmentItem key={eq.id} equipment={eq} isSelected={selectedEquipment.some(i => i.id === eq.id)} onToggle={toggleEquipment} />)}
                                </div>
								
								<h3 className="text-lg font-semibold text-gray-300 mb-2 mt-4">Extra</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Optional: add grid here */}
                                  {extra.map(eq => <EquipmentItem key={eq.id} equipment={eq} isSelected={selectedEquipment.some(i => i.id === eq.id)} onToggle={toggleEquipment} />)}
                                </div>
                            </div>
                        </div>

                        {/* --- NEW SEPARATE PAYMENT SECTION --- */}
                        <div className="bg-gray-800 shadow-2xl rounded-2xl p-8 mb-6 border border-gray-700">
                            <h2 className="text-2xl font-semibold text-orange-300 mb-6">💳 Select Payment Method</h2>
                            <div className="space-y-3">
                                {userCredits > 0 && (
                                    <PaymentOption value="credits" label={`Pay with Credits (${userCredits} available)`} selected={selectedPaymentMethod} onSelect={setSelectedPaymentMethod} />
                                )}
                                <PaymentOption value="cash" label="Cash on Arrival" selected={selectedPaymentMethod} onSelect={setSelectedPaymentMethod} />
                            </div>
                        </div>

                        {/* Book / Update Button */}
                        <div className="text-center">
                            <button onClick={handleBooking} disabled={!selectedDate || !selectedTime || isLoadingBookings || !userId || availableTimeSlotsForDisplay.find(s => s.value === selectedTime)?.disabled}
                                className="px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 bg-gradient-to-r from-orange-600 to-orange-800 text-white hover:from-orange-700 hover:to-orange-900 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:bg-gray-600 disabled:from-gray-600 disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:transform-none">
                                {isLoadingBookings ? (editingBookingId ? 'Updating...' : 'Booking...') : (editingBookingId ? `📝 Update Booking - ${formatIDR(calculateTotal())}` : `🎵 Book DJ Studio - ${formatIDR(calculateTotal())}`)}
                            </button>
                            {editingBookingId && <button onClick={() => setEditingBookingId(null)} className="ml-4 px-6 py-3 bg-gray-700 text-gray-300 rounded-xl font-semibold hover:bg-gray-600">Cancel Edit</button>}
                        </div>

                        {/* Recent Bookings Section */}
                        {userId && (
                            <div className="bg-gray-800 shadow-2xl rounded-2xl p-8 mt-6 border border-gray-700">
                                <h2 className="text-2xl font-semibold text-orange-300 mb-6">📋 Your Bookings</h2>
                                {isLoadingBookings && bookings.length === 0 ? <p className="text-gray-400">Loading bookings...</p> :
                                 bookings.length > 0 ? (
                                    <div className="space-y-4">
                                        {bookings.map(booking => (
                                            <div key={booking.id} className="bg-gray-700 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center border border-gray-600">
                                                <div className="flex-grow mb-4 sm:mb-0">
                                                    <p className="font-medium text-gray-100">{formatDate(booking.date)} at {formatTime(booking.time)}</p>
                                                    <p className="text-xs text-gray-400 mt-1">Payment: {booking.paymentMethod} - <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${booking.paymentStatus === 'paid' ? 'bg-green-700 text-green-200' : 'bg-yellow-700 text-yellow-200'}`}>{booking.paymentStatus}</span></p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-orange-400">{formatIDR(booking.total)}</p>
                                                    <button onClick={() => handleEditBooking(booking)} className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">Edit</button>
                                                    <button onClick={() => handleCancelBooking(booking)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Cancel</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                 ) : <p className="text-gray-400">No bookings yet. Make one above!</p>
                                }
                            </div>
                        )}

                        {/* Modals */}
                        <AuthModal show={showAuthModal} onClose={() => setShowAuthModal(false)} isLoginMode={isLoginMode} setIsLoginMode={setIsLoginMode} email={email} setEmail={setEmail} password={password} setPassword={setPassword} handleAuthAction={handleAuthAction} handleGoogleSignIn={handleGoogleSignIn} handleGuestLogin={handleGuestLogin} authError={authError} />
                        <ProfileModal show={showProfileModal} onClose={() => setShowProfileModal(false)} newDisplayName={newDisplayName} setNewDisplayName={setNewDisplayName} handleUpdateProfile={handleUpdateProfile} handleUpdatePassword={handleUpdatePassword} profileLoading={profileLoading} profileError={profileError} userCredits={userCredits} />
                        <ConfirmationModal show={showConfirmation} onClose={() => setShowConfirmation(false)} booking={currentBooking} isUpdate={!!editingBookingId} />
                        <DeleteConfirmationModal show={showDeleteConfirmation} onClose={() => setShowConfirmation(false)} booking={bookingToDelete} onConfirm={confirmDeleteBooking} />
                    </div>
                </div>
            )} />
        </Routes>
    );
}

export default BookingApp;