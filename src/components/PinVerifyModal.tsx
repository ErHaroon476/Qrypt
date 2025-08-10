"use client";

import { useState } from "react";
import { decrypt } from "@/lib/crypto";

interface PinVerifyModalProps {
  storedEncryptedPin: string;
  onClose: () => void;
  onSuccess: (enteredPin: string) => void;
}

export default function PinVerifyModal({
  storedEncryptedPin,
  onClose,
  onSuccess,
}: PinVerifyModalProps) {
  const [enteredPin, setEnteredPin] = useState("");
  const [error, setError] = useState("");

  const handleVerify = () => {
    try {
      const storedPin = decrypt(storedEncryptedPin); // decrypt stored encrypted PIN
      if (enteredPin === storedPin) {
        setError("");
        onSuccess(enteredPin);
        onClose();
      } else {
        setError("Incorrect PIN.");
      }
    } catch {
      setError("Failed to verify PIN.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-sm text-white shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Enter PIN</h2>
        <input
          type="password"
          placeholder="Enter PIN"
          value={enteredPin}
          onChange={(e) => setEnteredPin(e.target.value)}
          className="w-full px-4 py-2 mb-4 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            onClick={handleVerify}
            className="px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-500 transition"
          >
            Verify
          </button>
        </div>
      </div>
    </div>
  );
}
