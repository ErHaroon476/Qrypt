"use client";

import { Lock, Plus, Eye, Trash2, Pencil } from "lucide-react";

export interface Locker {
  id: string;
  name: string;
  username: string;
  password: string;
}

interface LockerListProps {
  lockers: Locker[];
  onCreate: () => void;
  onView: (locker: Locker) => void;
  onEdit: (locker: Locker) => void;
  onRequestDelete: (locker: Locker) => void;
}

export default function LockerList({
  lockers,
  onCreate,
  onView,
  onEdit,
  onRequestDelete,
}: LockerListProps) {
  return (
    <div className="bg-gray-800/80 rounded-xl shadow-xl p-6 mt-6 border border-gray-700 backdrop-blur-md transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Lock className="text-indigo-400 animate-pulse" /> Your Lockers
        </h2>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-md hover:scale-105 active:scale-95 transition-all"
          aria-label="Create Locker"
        >
          <Plus size={18} /> Create Locker
        </button>
      </div>

      {/* Lockers grid */}
      {lockers.length === 0 ? (
        <p className="text-gray-400 text-center py-6">No lockers yet. Create one!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {lockers.map((locker, index) => (
            <div
              key={locker.id}
              style={{ animationDelay: `${index * 0.05}s` }}
              className="border border-gray-700 rounded-lg p-4 bg-gray-900/70 shadow-md hover:shadow-xl hover:border-indigo-500 hover:scale-[1.03] transition-all duration-300 animate-fadeIn"
            >
              <h3 className="font-semibold text-lg text-white">{locker.name}</h3>
              <p className="text-sm text-gray-400">{locker.username}</p>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => onView(locker)}
                  className="p-2 rounded hover:bg-indigo-600/20 text-indigo-400 transition"
                  title={`View Locker: ${locker.name}`}
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={() => onEdit(locker)}
                  className="p-2 rounded hover:bg-green-600/20 text-green-400 transition"
                  title={`Edit Locker: ${locker.name}`}
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => onRequestDelete(locker)}
                  className="p-2 rounded hover:bg-red-600/20 text-red-400 transition"
                  title={`Delete Locker: ${locker.name}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
