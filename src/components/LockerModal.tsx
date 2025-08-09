"use client";

import { useEffect, useState } from "react";
import { X, Eye, EyeOff, ShieldPlus, Trash2, Save } from "lucide-react";
import { encrypt } from "@/lib/crypto";

interface Props {
  onClose: () => void;
  onSave?: (locker: { name: string; username: string; password: string }) => void;
  onUpdate?: (locker: { name: string; username: string; password: string }) => void;
  onDelete?: () => void;
  locker?: { name: string; username: string; password: string };
  isEditing?: boolean;
}

export default function LockerModal({
  onClose,
  onSave,
  onUpdate,
  onDelete,
  locker,
  isEditing = false,
}: Props) {
  const [name, setName] = useState(locker?.name || "");
  const [username, setUsername] = useState(locker?.username || "");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (locker?.password) {
      setPassword(locker.password);
    } else {
      setPassword("");
    }
  }, [locker]);

  const handleSave = () => {
    if (!name || !username || !password) return;

    const encryptedPassword = encrypt(password);
    const lockerData = { name, username, password: encryptedPassword };

    if (isEditing && onUpdate) {
      onUpdate(lockerData);
    } else if (onSave) {
      onSave(lockerData);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 animate-fadeIn">
      <div className="bg-gray-900/90 rounded-xl shadow-2xl p-6 w-full max-w-md relative transform animate-slideUp border border-gray-700">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition"
          aria-label="Close modal"
        >
          <X size={22} />
        </button>

        <h2 className="text-2xl font-bold mb-5 flex items-center gap-2 text-white">
          {isEditing ? "Edit Locker" : locker ? "Locker Details" : "Create Locker"}{" "}
          {!locker && <ShieldPlus className="text-indigo-400" size={22} />}
        </h2>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Locker Name"
            value={name}
            readOnly={!!locker && !isEditing}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-800 text-white border border-gray-700 p-2 rounded-lg focus:outline-none focus:border-indigo-500"
          />
          <input
            type="text"
            placeholder="Username / Email"
            value={username}
            readOnly={!!locker && !isEditing}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-gray-800 text-white border border-gray-700 p-2 rounded-lg focus:outline-none focus:border-indigo-500"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              readOnly={!!locker && !isEditing}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-700 p-2 rounded-lg focus:outline-none focus:border-indigo-500"
              autoComplete="off"
            />
            <button
              type="button"
              className="absolute right-3 top-2 text-gray-500 hover:text-white"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {(isEditing || !locker) && (
            <button
              onClick={handleSave}
              className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] transition-all"
            >
              <Save size={18} />
              {isEditing ? "Update Locker" : "Save Locker"}
            </button>
          )}

          {locker && !isEditing && (
            <div className="flex justify-center mt-3">
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-3 bg-red-600/20 text-red-400 rounded-full hover:bg-red-600/30 transition-all duration-200 shadow-sm hover:scale-110"
                title="Delete Locker"
              >
                <Trash2 size={20} />
              </button>
            </div>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-[60] animate-fadeIn">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl shadow-2xl w-full max-w-sm text-center animate-scaleIn">
            <h3 className="text-lg font-semibold mb-4 text-white">
              Are you sure you want to delete this locker?
            </h3>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setConfirmDelete(false)}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onDelete) onDelete();
                  setConfirmDelete(false);
                  onClose();
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out forwards;
        }
        .animate-slideUp {
          animation: slideUp 0.25s ease-out forwards;
        }
        .animate-scaleIn {
          animation: scaleIn 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
