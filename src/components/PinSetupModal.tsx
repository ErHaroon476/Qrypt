"use client";

import { useState } from "react";

interface PinSetupModalProps {
  onClose: () => void;
  onSave: (pin: string) => void;  // pass raw PIN string to parent
  isChanging?: boolean;
}
export default function PinSetupModal({ onClose, onSave, isChanging }: PinSetupModalProps) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  const handleSave = () => {
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }
    setError("");
    onSave(pin);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-sm text-white shadow-lg">
        <h2 className="text-xl font-semibold mb-4">
          {isChanging ? "Change Your PIN" : "Set Your PIN"}
        </h2>
        <input
          type="password"
          placeholder="Enter PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full px-4 py-2 mb-3 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="password"
          placeholder="Confirm PIN"
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value)}
          className="w-full px-4 py-2 mb-3 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-500 transition"
          >
            Save PIN
          </button>
        </div>
      </div>
    </div>
  );
}
