// src/components/MissingInfoModal.jsx
import React from 'react';
import Modal from './Modal'; // Import the base Modal component

const MissingInfoModal = ({ show, onClose, missingItems = [], onCompleteProfile }) => {
    return (
        <Modal show={show} onClose={onClose} title="Missing Information">
            <div className="bg-yellow-900/40 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg mb-4 text-sm">
                Your account is missing information required to complete this action. Please add the following:
            </div>

            <ul className="space-y-3 mb-6">
                {missingItems.map((item) => (
                    <li key={item.label} className="bg-gray-700 border border-gray-600 rounded-xl p-4">
                        <p className="font-semibold text-orange-300">{item.label}</p>
                        <p className="text-sm text-gray-300 mt-1">{item.reason}</p>
                    </li>
                ))}
            </ul>

            <div className="flex flex-col gap-3">
                <button onClick={onCompleteProfile} className="w-full py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700">
                    Complete Profile Now
                </button>
                <button onClick={onClose} className="w-full py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700">
                    Close
                </button>
            </div>
        </Modal>
    );
};

export default MissingInfoModal;
