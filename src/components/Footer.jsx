// src/components/Footer.jsx
import React from 'react';

const Footer = ({ onContactClick }) => {
    return (
        <footer className="bg-gray-800 text-gray-400 py-6 mt-12">
            <div className="max-w-4xl mx-auto px-4 text-center">
                <p>&copy; {new Date().getFullYear()} POLAR SHOWROOM. All rights reserved.</p>
                <button 
                    onClick={onContactClick} 
                    className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition shadow-lg"
                >
                    Contact Us
                </button>
            </div>
        </footer>
    );
};

export default Footer;