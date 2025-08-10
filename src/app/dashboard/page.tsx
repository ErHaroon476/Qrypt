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
import {
  Lock,
  KeyRound,
  Clock,
  Settings,
  ChevronDown,
} from "lucide-react";
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
  const [lastLogin, setLastLogin] = useState("");
  const [lockers, setLockers] = useState<Locker[]>([]);

  const [modalLocker, setModalLocker] = useState<Locker | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lockerToDelete, setLockerToDelete] = useState<Locker | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | (() => void)>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [forgotState, setForgotState] = useState({
    step: "verifyPassword" as "verifyPassword" | "setNewPin",
    password: "",
    newPin: "",
    confirmPin: "",
    error: null as string | null,
    loading: false,
    open: false,
  });

  const [showCurrentPinVerify, setShowCurrentPinVerify] = useState(false);

  useEffect(() => {
    let unsubscribeLockers: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser || !currentUser.emailVerified) {
        router.push("/auth/login");
        return;
      }
      setUser(currentUser);
      setLastLogin(
        currentUser.metadata?.lastSignInTime
          ? new Date(currentUser.metadata.lastSignInTime).toLocaleString()
          : ""
      );

      const pinDoc = await getDoc(
        doc(db, "users", currentUser.uid, "security", "pin")
      );
      if (pinDoc.exists()) setStoredPin(pinDoc.data().value);
      else setShowPinSetup(true);

      unsubscribeLockers = subscribeToUserLockers(
        currentUser.uid,
        (updated) =>
          setLockers(
            updated.map((l) => {
              try {
                return { ...l, password: decrypt(l.password) };
              } catch {
                return l;
              }
            })
          ),
        (e) => console.error(e)
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeLockers && unsubscribeLockers();
    };
  }, [router]);

  const savePin = async (pin: string) => {
    if (!user) return;
    const encrypted = encrypt(pin);
    await setDoc(doc(db, "users", user.uid, "security", "pin"), {
      value: encrypted,
    });
    setStoredPin(encrypted);
    setShowPinSetup(false);
    setIsChangingPin(false);
  };

  const onPinVerified = () => {
    setShowPinVerify(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const onCurrentPinVerified = () => {
    setShowCurrentPinVerify(false);
    setIsChangingPin(true);
    setShowPinSetup(true);
  };

  const requirePin = (action: () => void) => {
    storedPin ? (setPendingAction(() => action), setShowPinVerify(true)) : action();
  };

  const addLocker = async (locker: Omit<Locker, "id">) => {
    if (!user) return;
    try {
      await addLockerService(user.uid, locker);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteLocker = async () => {
    if (!user || !lockerToDelete) return;
    try {
      await deleteLockerService(user.uid, lockerToDelete.id);
      setLockerToDelete(null);
    } catch (e) {
      console.error(e);
    }
  };

  const updateLocker = async (locker: Omit<Locker, "id">) => {
    if (!user || !modalLocker) return;
    try {
      await updateLockerService(user.uid, modalLocker.id, locker);
      setModalLocker(null);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    }
  };

  const forgotReauthenticate = async () => {
    if (!user) return;
    setForgotState((s) => ({ ...s, loading: true, error: null }));
    try {
      const cred = EmailAuthProvider.credential(user.email!, forgotState.password);
      await reauthenticateWithCredential(user, cred);
      setForgotState((s) => ({ ...s, step: "setNewPin", loading: false }));
    } catch {
      setForgotState((s) => ({ ...s, error: "Incorrect password.", loading: false }));
    }
  };

  const forgotSaveNewPin = async () => {
    if (!user) return;
    if (forgotState.newPin.length < 4) {
      setForgotState((s) => ({ ...s, error: "PIN must be at least 4 digits." }));
      return;
    }
    if (forgotState.newPin !== forgotState.confirmPin) {
      setForgotState((s) => ({ ...s, error: "PINs do not match." }));
      return;
    }
    setForgotState((s) => ({ ...s, loading: true, error: null }));
    try {
      const encrypted = encrypt(forgotState.newPin);
      await setDoc(doc(db, "users", user.uid, "security", "pin"), { value: encrypted });
      setStoredPin(encrypted);
      setForgotState({
        step: "verifyPassword",
        password: "",
        newPin: "",
        confirmPin: "",
        error: null,
        loading: false,
        open: false,
      });
    } catch {
      setForgotState((s) => ({ ...s, error: "Failed to save new PIN.", loading: false }));
    }
  };

  const resetForgot = () =>
    setForgotState({
      step: "verifyPassword",
      password: "",
      newPin: "",
      confirmPin: "",
      error: null,
      loading: false,
      open: false,
    });

  // Simple floating animation for icons
  const iconAnim = "animate-[float_3s_ease-in-out_infinite]";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white select-none">
      <Navbar />

      <main className="max-w-6xl mx-auto p-6">
        <div className="bg-gray-800/80 rounded-2xl p-8 border border-gray-700 shadow-lg shadow-indigo-900/20">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold tracking-wide flex items-center gap-3">
              Welcome, <span className="text-indigo-400">{user?.displayName || "User"}</span>{" "}
              <Lock className={`${iconAnim} text-indigo-400`} size={32} />
            </h1>

            {storedPin && (
              <div className="relative">
                <button
                  aria-label="Settings menu"
                  onClick={() => setIsSettingsOpen((o) => !o)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded shadow-md hover:bg-indigo-500 transition-transform duration-300 active:scale-95"
                >
                  <Settings
                    size={20}
                    className={`text-white transition-transform duration-500 ${
                      isSettingsOpen ? "rotate-180" : "rotate-0"
                    }`}
                  />
                  <ChevronDown
                    size={16}
                    className={`text-white transition-transform duration-300 ${
                      isSettingsOpen ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </button>
                <div
                  role="menu"
                  className={`absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg z-10 origin-top-right transition-all duration-300 ${
                    isSettingsOpen
                      ? "opacity-100 scale-100 pointer-events-auto"
                      : "opacity-0 scale-95 pointer-events-none"
                  }`}
                >
                  <button
                    role="menuitem"
                    className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-indigo-600 transition-colors duration-200"
                    onClick={() => {
                      setShowCurrentPinVerify(true);
                      setIsSettingsOpen(false);
                    }}
                  >
                    Change PIN
                  </button>
                  <button
                    role="menuitem"
                    className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-red-600 transition-colors duration-200"
                    onClick={() => {
                      setForgotState((s) => ({ ...s, open: true }));
                      setIsSettingsOpen(false);
                    }}
                  >
                    Forgot PIN
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="text-gray-400 mb-8 select-text">
            Manage your lockers and passwords securely.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            {[
              { icon: Lock, label: "Total Lockers", value: lockers.length, color: "indigo" },
              { icon: KeyRound, label: "Encrypted Passwords", value: lockers.length, color: "green" },
              { icon: Clock, label: "Last Login", value: lastLogin || "Loading...", color: "purple", isLarge: false },
            ].map(({ icon: Icon, label, value, color, isLarge }, i) => (
              <div
                key={label}
                className={`bg-gradient-to-br from-${color}-600/20 to-${color}-500/10 rounded-xl p-6 text-center border border-${color}-500/30
                  transition-transform duration-500 hover:scale-[1.05] cursor-default opacity-0 animate-fadeIn`}
                style={{ animationDelay: `${i * 150}ms`, animationFillMode: "forwards" }}
              >
                <Icon className={`text-${color}-400 mb-3 mx-auto ${iconAnim}`} size={36} />
                <h2>{label}</h2>
                <p className={`${isLarge === false ? "text-lg" : "text-3xl font-bold"} text-${color}-400`}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          <LockerList
            lockers={lockers}
            onCreate={() => requirePin(() => (setShowCreateModal(true), setIsEditing(false)))}
            onView={(l) => requirePin(() => (setModalLocker(l), setIsEditing(false)))}
            onEdit={(l) => requirePin(() => (setModalLocker(l), setIsEditing(true)))}
            onRequestDelete={(l) => requirePin(() => setLockerToDelete(l))}
          />
        </div>
      </main>

      {/* Modals */}
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
          onClose={() => (setModalLocker(null), setIsEditing(false))}
          onUpdate={updateLocker}
          onDelete={() => (setLockerToDelete(modalLocker), setModalLocker(null))}
          isEditing={isEditing}
        />
      )}
      {lockerToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="deleteLockerTitle"
          className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
        >
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-lg animate-fadeIn">
            <h2 id="deleteLockerTitle" className="mb-4 text-lg font-semibold">
              Delete <span className="text-red-400">{lockerToDelete.name}</span>?
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
                className="px-4 py-2 bg-red-600 rounded hover:bg-red-500 transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showPinVerify && (
        <PinVerifyModal
          storedEncryptedPin={storedPin!}
          onClose={() => setShowPinVerify(false)}
          onSuccess={onPinVerified}
        />
      )}
      {showPinSetup && (
        <PinSetupModal
          onClose={() => setShowPinSetup(false)}
          onSave={savePin}
          isChanging={isChangingPin}
        />
      )}
      {showCurrentPinVerify && (
        <PinVerifyModal
          storedEncryptedPin={storedPin!}
          onClose={() => setShowCurrentPinVerify(false)}
          onSuccess={onCurrentPinVerified}
        />
      )}

      {forgotState.open && user && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgotPinTitle"
          className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4"
        >
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md text-white shadow-lg animate-fadeIn">
            <h2 id="forgotPinTitle" className="text-xl font-bold mb-4">
              Forgot PIN
            </h2>
            {forgotState.step === "verifyPassword" ? (
              <>
                <p className="mb-2">
                  Verify your password for <strong>{user.email}</strong>
                </p>
                <input
                  type="password"
                  placeholder="Enter your account password"
                  value={forgotState.password}
                  onChange={(e) => setForgotState((s) => ({ ...s, password: e.target.value }))}
                  className="w-full p-2 rounded bg-gray-700 mb-4 text-white focus:ring-indigo-500 focus:outline-none transition"
                  autoFocus
                />
                {forgotState.error && <p className="text-red-400 mb-2">{forgotState.error}</p>}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={resetForgot}
                    className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition"
                    disabled={forgotState.loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={forgotReauthenticate}
                    className="px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-500 transition"
                    disabled={forgotState.loading || !forgotState.password}
                  >
                    {forgotState.loading ? "Verifying..." : "Verify"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mb-2">Enter your new PIN</p>
                <input
                  type="password"
                  placeholder="New PIN"
                  value={forgotState.newPin}
                  onChange={(e) => setForgotState((s) => ({ ...s, newPin: e.target.value }))}
                  className="w-full p-2 rounded bg-gray-700 mb-2 text-white focus:ring-green-400 focus:outline-none transition"
                  autoFocus
                />
                <input
                  type="password"
                  placeholder="Confirm New PIN"
                  value={forgotState.confirmPin}
                  onChange={(e) => setForgotState((s) => ({ ...s, confirmPin: e.target.value }))}
                  className="w-full p-2 rounded bg-gray-700 mb-4 text-white focus:ring-green-400 focus:outline-none transition"
                />
                {forgotState.error && <p className="text-red-400 mb-2">{forgotState.error}</p>}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={resetForgot}
                    className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition"
                    disabled={forgotState.loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={forgotSaveNewPin}
                    className="px-4 py-2 bg-green-600 rounded hover:bg-green-500 transition"
                    disabled={
                      forgotState.loading || !forgotState.newPin || !forgotState.confirmPin
                    }
                  >
                    {forgotState.loading ? "Saving..." : "Save PIN"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) }
          50% { transform: translateY(-6px) }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease forwards;
          opacity: 0;
        }
        @keyframes fadeIn {
          to { opacity: 1; }
        }
        .animate-[float_3s_ease-in-out_infinite] {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
