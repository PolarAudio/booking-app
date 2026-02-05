// src/components/AuthModal.jsx
import React from 'react';
import Modal from './Modal'; // Import the base Modal component
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'; // Import necessary auth functions

const AuthModal = ({ show, onClose, isLoginMode, setIsLoginMode, email, setEmail, password, setPassword, guestName, setGuestName, handleAuthAction, handleGoogleSignIn, handleGuestLogin, authError, isLoading }) => {
    console.log("AuthModal: show prop is", show);
    return (
        <Modal show={show} onClose={onClose} title={isLoginMode ? 'Sign In' : 'Sign Up'}>
            {authError && <div className="bg-red-800 text-white px-4 py-2 rounded-lg mb-4 text-sm">{authError}</div>}
            
            <div className="space-y-4">
                <div className="border-b border-gray-700 pb-4 mb-4">
                    <h3 className="text-gray-300 text-sm font-semibold mb-2 uppercase tracking-wider">Email Login</h3>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full p-3 border border-gray-600 rounded-xl bg-gray-700 text-white mb-2" />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full p-3 border border-gray-600 rounded-xl bg-gray-700 text-white" />
                    <button onClick={() => handleAuthAction(isLoginMode ? () => signInWithEmailAndPassword(getAuth(), email, password) : () => createUserWithEmailAndPassword(getAuth(), email, password))} className="w-full py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 mt-3" disabled={isLoading}>
                        {isLoading ? (isLoginMode ? 'Signing In...' : 'Signing Up...') : (isLoginMode ? 'Sign In' : 'Sign Up')}
                    </button>
                    <button onClick={() => setIsLoginMode(p => !p)} className="w-full py-2 text-sm text-gray-400 hover:text-white mt-1" disabled={isLoading}>{isLoginMode ? 'Need an account? Sign Up' : 'Have an account? Sign In'}</button>
                </div>

                <div className="border-b border-gray-700 pb-4 mb-4">
                    <h3 className="text-gray-300 text-sm font-semibold mb-2 uppercase tracking-wider">Quick Access</h3>
                    <button onClick={handleGoogleSignIn} className="w-full py-3 bg-red-700 text-white rounded-xl font-semibold hover:bg-red-800 flex items-center justify-center gap-2" disabled={isLoading}>
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" className="w-5 h-5" /> Sign In with Google
                    </button>
                </div>

                <div>
                    <h3 className="text-gray-300 text-sm font-semibold mb-2 uppercase tracking-wider">Guest Access</h3>
                    <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Your Name" className="w-full p-3 border border-gray-600 rounded-xl bg-gray-700 text-white mb-2" />
                    <button onClick={handleGuestLogin} className="w-full py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700" disabled={isLoading}>
                        {isLoading ? 'Connecting...' : 'Continue as Guest'}
                    </button>
                    <p className="text-[10px] text-gray-500 mt-2 text-center italic">Guest accounts are temporary and limited to this session.</p>
                </div>
            </div>
        </Modal>
    );
};

export default AuthModal;