// src/components/ContactFormModal.jsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { auth } from '../firebase/init'; // NEW: Import auth
const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL || 'https://back-end-bahe.onrender.com'; // NEW: Import backend URL

const ContactFormModal = ({ show, onClose, userEmail, userName }) => {
    const [category, setCategory] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(null); // true for success, false for error

    useEffect(() => {
        if (!show) {
            // Reset form when modal closes
            setCategory('');
            setSubject('');
            setMessage('');
            setSendSuccess(null);
        } else {
            // Pre-fill subject based on category if selected
            if (!subject && category) {
                setSubject(`[${category}]`);
            }
        }
    }, [show, category, subject]); // Added subject to dependency array

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSending(true);
        setSendSuccess(null);

        try {
            let idToken = null;
            if (auth.currentUser) {
                idToken = await auth.currentUser.getIdToken();
            }

            const response = await fetch(`${BACKEND_API_BASE_URL}/api/contact-us`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': idToken ? `Bearer ${idToken}` : '' // Include token if available
                },
                body: JSON.stringify({
                    category,
                    subject,
                    message,
                    userEmail, 
                    userName,
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send message.');
            }

            setSendSuccess(true);
            // Clear form after successful send
            setCategory('');
            setSubject('');
            setMessage('');
        } catch (error) {
            console.error('Contact form submission error:', error);
            setSendSuccess(false);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Modal show={show} onClose={onClose} title="Contact Us">
            <form onSubmit={handleSubmit} className="space-y-4">
                {sendSuccess === true && (
                    <div className="bg-green-500 text-white p-3 rounded-md">
                        Message sent successfully! We'll get back to you soon.
                    </div>
                )}
                {sendSuccess === false && (
                    <div className="bg-red-500 text-white p-3 rounded-md">
                        Failed to send message. Please try again later.
                    </div>
                )}

                <div>
                    <label htmlFor="category" className="block text-gray-300 text-sm font-bold mb-2">
                        Category:
                    </label>
                    <select
                        id="category"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        required
                    >
                        <option value="">Select a category</option>
                        <option value="Problem">Problem</option>
                        <option value="Feedback">Feedback</option>
                        <option value="Question">Question</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="subject" className="block text-gray-300 text-sm font-bold mb-2">
                        Subject:
                    </label>
                    <input
                        type="text"
                        id="subject"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="message" className="block text-gray-300 text-sm font-bold mb-2">
                        Message:
                    </label>
                    <textarea
                        id="message"
                        rows="5"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                    ></textarea>
                </div>
                <div className="flex items-center justify-between">
                    <button
                        type="submit"
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        disabled={isSending}
                    >
                        {isSending ? 'Sending...' : 'Send Message'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        disabled={isSending}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ContactFormModal;
