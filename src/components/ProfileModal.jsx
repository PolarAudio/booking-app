// src/components/ProfileModal.jsx
import React, { useState } from 'react';
import Modal from './Modal'; // Import the base Modal component

const ProfileModal = ({ show, onClose, newDisplayName, setNewDisplayName, handleUpdateProfile, handleUpdatePassword, profileLoading, profileError }) => {
    const [newPassword, setNewPassword] = useState('');
    const [passwordUpdateLoading, setPasswordUpdateLoading] = useState(false);
    const [passwordUpdateError, setPasswordUpdateError] = useState(null);
    const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState(null);

    const onPasswordUpdate = async () => {
        setPasswordUpdateLoading(true);
        setPasswordUpdateError(null);
        setPasswordUpdateSuccess(null);
        try {
            await handleUpdatePassword(newPassword);
            setPasswordUpdateSuccess('Password updated successfully!');
            setNewPassword(''); // Clear password field on success
        } catch (error) {
            setPasswordUpdateError(error.message);
        } finally {
            setPasswordUpdateLoading(false);
        }
    };

    return (
        <Modal show={show} onClose={onClose} title="Manage Profile">
            {profileError && <div className="bg-red-800 text-white px-4 py-2 rounded-lg mb-4 text-sm">{profileError}</div>}
            {passwordUpdateError && <div className="bg-red-800 text-white px-4 py-2 rounded-lg mb-4 text-sm">{passwordUpdateError}</div>}
            {passwordUpdateSuccess && <div className="bg-green-800 text-white px-4 py-2 rounded-lg mb-4 text-sm">{passwordUpdateSuccess}</div>}

            <h3 className="text-lg font-semibold text-gray-300 mb-2">Update Display Name</h3>
            <input type="text" value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} placeholder="Your Display Name" className="w-full p-3 border border-gray-600 rounded-xl bg-gray-700 text-white" />
            <div className="mt-4 flex gap-4">
                <button onClick={handleUpdateProfile} disabled={profileLoading} className="w-full py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 disabled:bg-gray-500">{profileLoading ? 'Updating...' : 'Update Display Name'}</button>
            </div>

            <h3 className="text-lg font-semibold text-gray-300 mt-6 mb-2">Change Password</h3>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New Password (min 6 characters)" className="w-full p-3 border border-gray-600 rounded-xl bg-gray-700 text-white" />
            <div className="mt-4 flex gap-4">
                <button onClick={onPasswordUpdate} disabled={passwordUpdateLoading || newPassword.length < 6} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-500">{passwordUpdateLoading ? 'Updating...' : 'Change Password'}</button>
            </div>

            <div className="mt-6">
                <button onClick={onClose} className="w-full py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700">Close</button>
            </div>
        </Modal>
    );
};

export default ProfileModal;