// src/components/PaymentOption.jsx
import React from 'react';

const PaymentOption = ({ value, label, selected, onSelect, creditBalance }) => { // Added creditBalance prop
    const isCreditOption = value === 'credits';
    const isDisabled = isCreditOption && creditBalance === 0;

    const handleClick = () => {
        if (!isDisabled) {
            onSelect(value);
        }
    };

    return (
        <div 
            onClick={handleClick} 
            className={`p-4 rounded-xl border-2 transition-all 
                        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} 
                        ${selected === value ? 'border-orange-500 bg-orange-900' : 'border-gray-700 bg-gray-700 hover:border-orange-400'}`}
        >
            <label className="flex items-center space-x-3 cursor-pointer">
                <input 
                    type="radio" 
                    name="paymentMethod" 
                    value={value} 
                    checked={selected === value} 
                    onChange={handleClick} // Use handleClick to respect disabled state
                    className="form-radio h-5 w-5 text-orange-600 bg-gray-800 border-gray-600 focus:ring-orange-500" 
                    disabled={isDisabled} // Disable the actual input
                />
                <span className="font-medium text-white">{label}</span>
            </label>
            {isDisabled && isCreditOption && ( // Display message only for disabled credit option
                <p className="text-sm text-gray-400 mt-2 ml-8">
                    You have no credits. Contact us to get some via the "Contact Us" button below.
                </p>
            )}
        </div>
    );
};

export default PaymentOption;
