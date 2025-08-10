"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  User,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import { Lock, KeyRound, Clock } from "lucide-react";
import LockerList, { Locker } from "@/components/LockerList";
import LockerModal from "@/components/LockerModal";
import PinVerifyModal from "@/components/PinVerifyModal";
import PinSetupModal from "@/components/PinSetupModal";

import {
  subscribeToUserLockers,
  addLocker as addLockerService,
  deleteLocker as deleteLockerService,
  updateLocker as updateLockerService,
} from "@/services/lockerService";

import { encrypt, decrypt } from "@/lib/crypto";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [lastLogin, setLastLogin] = useState<string>("");
  const [lockers, setLockers] = useState<Locker[]>([]);

  // Locker modals
  const [modalLocker, setModalLocker] = useState<Locker | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lockerToDelete, setLockerToDelete] = useState<Locker | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // PIN management
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | (() => void)>(null);

  // NEW: Show current PIN verification before changing PIN
  const [showCurrentPinVerify, setShowCurrentPinVerify] = useState(false);

  // NEW: Forgot PIN modal
  const [showForgotPin, setShowForgotPin] = useState(false);

  // Forgot PIN modal internal states
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotNewPin, setForgotNewPin] = useState("");
  const [forgotConfirmPin, setForgotConfirmPin] = useState("");
  const [forgotStep, setForgotStep] = useState<"verifyPassword" | "setNewPin">(
    "verifyPassword"
  );
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    let unsubscribeLockers: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser || !currentUser.emailVerified) {
        router.push("/auth/login");
      } else {
        setUser(currentUser);

        if (currentUser.metadata?.lastSignInTime) {
          setLastLogin(
            new Date(currentUser.metadata.lastSignInTime).toLocaleString()
          );
        }

        // Load PIN from Firestore
        const pinDoc = await getDoc(
          doc(db, "users", currentUser.uid, "security", "pin")
        );
        if (pinDoc.exists()) {
          setStoredPin(pinDoc.data().value);
        } else {
          setShowPinSetup(true); // First-time setup
        }

        // Subscribe to lockers updates
        unsubscribeLockers = subscribeToUserLockers(
          currentUser.uid,
          (updatedLockers: Locker[]) => {
            setLockers(
              updatedLockers.map((locker) => ({
                ...locker,
                password: (() => {
                  try {
                    return decrypt(locker.password);
                  } catch {
                    return locker.password;
                  }
                })(),
              }))
            );
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

  /** Save PIN (encrypt and store in Firestore) */
  const handleSavePin = async (pin: string) => {
    if (!user) return;
    const encryptedPin = encrypt(pin);
    await setDoc(doc(db, "users", user.uid, "security", "pin"), {
      value: encryptedPin,
    });
    setStoredPin(encryptedPin);
    setShowPinSetup(false);
    setIsChangingPin(false);
  };

  /** Verify PIN before allowing sensitive actions */
  const handleVerifyPin = (enteredPin: string) => {
    setShowPinVerify(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  // Called when current PIN is successfully verified to allow PIN change
  const handleCurrentPinVerified = () => {
    setShowCurrentPinVerify(false);
    setIsChangingPin(true);
    setShowPinSetup(true);
  };

  /** Require PIN before running an action */
  const requirePin = (action: () => void) => {
    if (storedPin) {
      setPendingAction(() => action);
      setShowPinVerify(true);
    } else {
      action();
    }
  };

  // CRUD operations
  const addLocker = async (locker: Omit<Locker, "id">) => {
    if (!user) return;
    try {
      await addLockerService(user.uid, locker);
    } catch (error) {
      console.error("Failed to add locker:", error);
    }
  };

  const deleteLocker = async () => {
    if (!user || !lockerToDelete) return;
    try {
      await deleteLockerService(user.uid, lockerToDelete.id);
      setLockerToDelete(null);
    } catch (error) {
      console.error("Failed to delete locker:", error);
    }
  };

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

  // --- Forgot PIN Handlers ---

  const forgotReauthenticate = async () => {
    if (!user) return;
    setForgotLoading(true);
    setForgotError(null);
    try {
      const credential = EmailAuthProvider.credential(user.email!, forgotPassword);
      await reauthenticateWithCredential(user, credential);
      setForgotStep("setNewPin");
    } catch {
      setForgotError("Incorrect password. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const forgotSaveNewPin = async () => {
    if (!user) return;
    if (forgotNewPin.length < 4) {
      setForgotError("PIN must be at least 4 digits.");
      return;
    }
    if (forgotNewPin !== forgotConfirmPin) {
      setForgotError("PIN and confirm PIN do not match.");
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      const encryptedPin = encrypt(forgotNewPin);
      await setDoc(doc(db, "users", user.uid, "security", "pin"), {
        value: encryptedPin,
      });
      setStoredPin(encryptedPin);
      resetForgotPinModal();
    } catch {
      setForgotError("Failed to save new PIN. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const resetForgotPinModal = () => {
    setShowForgotPin(false);
    setForgotPassword("");
    setForgotNewPin("");
    setForgotConfirmPin("");
    setForgotStep("verifyPassword");
    setForgotError(null);
    setForgotLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <Navbar />

      <main className="max-w-6xl mx-auto p-6">
        <div className="bg-gray-800/80 rounded-2xl p-8 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">
              Welcome,{" "}
              <span className="text-indigo-400">
                {user?.displayName || "User"}
              </span>{" "}
              🔐
            </h1>
            {storedPin && (
              <div className="flex gap-4">
                <button
                  onClick={() => setShowCurrentPinVerify(true)}
                  className="px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-500"
                >
                  Change PIN
                </button>
                <button
                  onClick={() => setShowForgotPin(true)}
                  className="px-4 py-2 bg-red-600 rounded hover:bg-red-500"
                >
                  Forgot PIN
                </button>
              </div>
            )}
          </div>
          <p className="text-gray-400 mb-8">
            Manage your lockers and passwords securely.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-indigo-600/20 to-indigo-500/10 rounded-xl p-6 text-center border border-indigo-500/30">
              <Lock className="text-indigo-400 mb-3" size={36} />
              <h2>Total Lockers</h2>
              <p className="text-3xl font-bold text-indigo-400">{lockers.length}</p>
            </div>
            <div className="bg-gradient-to-br from-green-600/20 to-green-500/10 rounded-xl p-6 text-center border border-green-500/30">
              <KeyRound className="text-green-400 mb-3" size={36} />
              <h2>Encrypted Passwords</h2>
              <p className="text-3xl font-bold text-green-400">{lockers.length}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-600/20 to-purple-500/10 rounded-xl p-6 text-center border border-purple-500/30">
              <Clock className="text-purple-400 mb-3" size={36} />
              <h2>Last Login</h2>
              <p className="text-lg text-purple-400">{lastLogin || "Loading..."}</p>
            </div>
          </div>

          {/* Locker List */}
          <LockerList
            lockers={lockers}
            onCreate={() =>
              requirePin(() => {
                setShowCreateModal(true);
                setIsEditing(false);
              })
            }
            onView={(locker) =>
              requirePin(() => {
                setModalLocker(locker);
                setIsEditing(false);
              })
            }
            onEdit={(locker) =>
              requirePin(() => {
                setModalLocker(locker);
                setIsEditing(true);
              })
            }
            onRequestDelete={(locker) =>
              requirePin(() => setLockerToDelete(locker))
            }
          />
        </div>
      </main>

      {/* Locker Modals */}
      {showCreateModal && (
        <LockerModal
          onClose={() => setShowCreateModal(false)}
          onSave={(locker) => {
            addLocker(locker);
            setShowCreateModal(false);
          }}
        />
      )}
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
      {lockerToDelete && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm">
            <h2 className="mb-4">
              Delete <span className="text-red-400">{lockerToDelete.name}</span>?
            </h2>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setLockerToDelete(null)}
                className="px-4 py-2 bg-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={deleteLocker}
                className="px-4 py-2 bg-red-600 rounded"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Modals */}
      {showPinVerify && (
        <PinVerifyModal
          storedEncryptedPin={storedPin!}
          onClose={() => setShowPinVerify(false)}
          onSuccess={handleVerifyPin}
        />
      )}
      {showPinSetup && (
        <PinSetupModal
          onClose={() => setShowPinSetup(false)}
          onSave={handleSavePin}
          isChanging={isChangingPin}
        />
      )}
      {/* Current PIN verification modal before changing PIN */}
      {showCurrentPinVerify && (
        <PinVerifyModal
          storedEncryptedPin={storedPin!}
          onClose={() => setShowCurrentPinVerify(false)}
          onSuccess={handleCurrentPinVerified}
        />
      )}

      {/* Forgot PIN Modal */}
      {showForgotPin && user && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md text-white">
            <h2 className="text-xl font-bold mb-4">Forgot PIN</h2>

            {forgotStep === "verifyPassword" && (
              <>
                <p className="mb-2">
                  Verify your password for <strong>{user.email}</strong>
                </p>
                <input
                  type="password"
                  placeholder="Enter your account password"
                  value={forgotPassword}
                  onChange={(e) => setForgotPassword(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 mb-4 text-white"
                  autoFocus
                />
                {forgotError && (
                  <p className="text-red-400 mb-2">{forgotError}</p>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={resetForgotPinModal}
                    className="px-4 py-2 bg-gray-700 rounded"
                    disabled={forgotLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={forgotReauthenticate}
                    className="px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-500"
                    disabled={forgotLoading || !forgotPassword}
                  >
                    {forgotLoading ? "Verifying..." : "Verify"}
                  </button>
                </div>
              </>
            )}

            {forgotStep === "setNewPin" && (
              <>
                <p className="mb-2">Enter your new PIN</p>
                <input
                  type="password"
                  placeholder="New PIN"
                  value={forgotNewPin}
                  onChange={(e) => setForgotNewPin(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 mb-2 text-white"
                  autoFocus
                />
                <input
                  type="password"
                  placeholder="Confirm New PIN"
                  value={forgotConfirmPin}
                  onChange={(e) => setForgotConfirmPin(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 mb-4 text-white"
                />
                {forgotError && (
                  <p className="text-red-400 mb-2">{forgotError}</p>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={resetForgotPinModal}
                    className="px-4 py-2 bg-gray-700 rounded"
                    disabled={forgotLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={forgotSaveNewPin}
                    className="px-4 py-2 bg-green-600 rounded hover:bg-green-500"
                    disabled={
                      forgotLoading || !forgotNewPin || !forgotConfirmPin
                    }
                  >
                    {forgotLoading ? "Saving..." : "Save PIN"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
