"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import { Lock, KeyRound, Clock } from "lucide-react";
import LockerList, { Locker } from "@/components/LockerList";
import LockerModal from "@/components/LockerModal";

import {
  subscribeToUserLockers,
  addLocker as addLockerService,
  deleteLocker as deleteLockerService,
  updateLocker as updateLockerService,
} from "@/services/lockerService";

import { decrypt } from "@/lib/crypto";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [lastLogin, setLastLogin] = useState<string>("");
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [modalLocker, setModalLocker] = useState<Locker | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lockerToDelete, setLockerToDelete] = useState<Locker | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Auth + Real-time data subscription
  useEffect(() => {
    let unsubscribeLockers: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser || !currentUser.emailVerified) {
        router.push("/auth/login");
      } else {
        setUser(currentUser);
        if (currentUser.metadata?.lastSignInTime) {
          setLastLogin(new Date(currentUser.metadata.lastSignInTime).toLocaleString());
        }

        unsubscribeLockers = subscribeToUserLockers(
          currentUser.uid,
          (updatedLockers: Locker[]) => {
            const decryptedLockers = updatedLockers.map((locker) => ({
              ...locker,
              password: (() => {
                try {
                  return decrypt(locker.password);
                } catch {
                  return locker.password;
                }
              })(),
            }));
            setLockers(decryptedLockers);
          },
          (error: Error) => {
            console.error("Error fetching lockers:", error);
          }
        );
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeLockers) unsubscribeLockers();
    };
  }, [router]);

  // Add locker
  const addLocker = async (locker: Omit<Locker, "id">) => {
    if (!user) return;
    try {
      await addLockerService(user.uid, locker);
    } catch (error) {
      console.error("Failed to add locker:", error);
    }
  };

  // Delete locker
  const deleteLocker = async () => {
    if (!user || !lockerToDelete) return;
    try {
      await deleteLockerService(user.uid, lockerToDelete.id);
      setLockerToDelete(null);
    } catch (error) {
      console.error("Failed to delete locker:", error);
    }
  };

  // Update locker
  const updateLocker = async (updatedLocker: Omit<Locker, "id">) => {
    if (!user || !modalLocker) return;
    try {
      await updateLockerService(user.uid, modalLocker.id, updatedLocker);
      setModalLocker(null);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update locker:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white transition-colors duration-500">
      <Navbar />

      <main className="max-w-6xl mx-auto p-6">
        <div className="bg-gray-800/80 rounded-2xl shadow-2xl p-8 backdrop-blur-md border border-gray-700">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            Welcome, <span className="text-indigo-400">{user?.displayName || "User"}</span> 🔐
          </h1>
          <p className="text-gray-400 mb-8">
            Manage your lockers and passwords securely. This page is protected and only accessible after login and email verification.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-indigo-600/20 to-indigo-500/10 hover:scale-105 transition-transform duration-300 rounded-xl p-6 flex flex-col items-center text-center border border-indigo-500/30 shadow-lg">
              <Lock className="text-indigo-400 mb-3 animate-pulse" size={36} />
              <h2 className="font-semibold text-lg">Total Lockers</h2>
              <p className="text-3xl font-bold text-indigo-400 mt-2">{lockers.length}</p>
            </div>

            <div className="bg-gradient-to-br from-green-600/20 to-green-500/10 hover:scale-105 transition-transform duration-300 rounded-xl p-6 flex flex-col items-center text-center border border-green-500/30 shadow-lg">
              <KeyRound className="text-green-400 mb-3 animate-bounce" size={36} />
              <h2 className="font-semibold text-lg">Encrypted Passwords</h2>
              <p className="text-3xl font-bold text-green-400 mt-2">{lockers.length}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-600/20 to-purple-500/10 hover:scale-105 transition-transform duration-300 rounded-xl p-6 flex flex-col items-center text-center border border-purple-500/30 shadow-lg">
              <Clock className="text-purple-400 mb-3 animate-spin-slow" size={36} />
              <h2 className="font-semibold text-lg">Last Login</h2>
              <p className="text-lg text-purple-400 mt-2">{lastLogin || "Loading..."}</p>
            </div>
          </div>

          {/* Locker List */}
          <LockerList
            lockers={lockers}
            onCreate={() => {
              setShowCreateModal(true);
              setIsEditing(false);
            }}
            onView={(locker) => {
              setModalLocker(locker);
              setIsEditing(false);
            }}
            onEdit={(locker) => {
              setModalLocker(locker);
              setIsEditing(true);
            }}
            onRequestDelete={setLockerToDelete}
          />
        </div>
      </main>

      {/* Create Locker Modal */}
      {showCreateModal && (
        <LockerModal
          onClose={() => setShowCreateModal(false)}
          onSave={(locker) => {
            addLocker(locker);
            setShowCreateModal(false);
          }}
        />
      )}

      {/* View/Edit Locker Modal */}
      {modalLocker && (
        <LockerModal
          locker={modalLocker}
          onClose={() => {
            setModalLocker(null);
            setIsEditing(false);
          }}
          onUpdate={updateLocker}
          onDelete={() => {
            setLockerToDelete(modalLocker);
            setModalLocker(null);
          }}
          isEditing={isEditing}
        />
      )}

      {/* Delete Confirmation Modal */}
      {lockerToDelete && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 animate-fadeIn">
          <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-sm transform scale-95 animate-scaleIn border border-gray-700">
            <h2 className="text-lg font-bold mb-4">
              Are you sure you want to delete{" "}
              <span className="text-red-400">{lockerToDelete.name}</span>?
            </h2>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setLockerToDelete(null)}
                className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={deleteLocker}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
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
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.25s ease-out;
        }
        .animate-spin-slow {
          animation: spin-slow 6s linear infinite;
        }
      `}</style>
    </div>
  );
}
