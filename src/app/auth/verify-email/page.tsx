"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User, sendEmailVerification, deleteUser } from "firebase/auth";
import { CheckCircle2, Mail, RotateCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const VERIFICATION_TIMEOUT = 60 * 60 * 1000; // 1 hour

export default function VerifyEmailPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState(VERIFICATION_TIMEOUT);

  // Simplified verification check without router in dependencies
  useEffect(() => {
    let verificationInterval: NodeJS.Timeout;
    let expirationInterval: NodeJS.Timeout;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        window.location.href = "/auth/register"; // Hard redirect instead of router
        return;
      }

      setUser(currentUser);
      setIsLoading(false);
      await currentUser.reload();

      if (currentUser.emailVerified) {
        setIsVerified(true);
        setTimeout(() => window.location.href = "/auth/login", 5000); // Hard redirect after 5s
      } else {
        verificationInterval = setInterval(async () => {
          await currentUser.reload();
          if (currentUser.emailVerified) {
            setIsVerified(true);
            setTimeout(() => window.location.href = "/auth/login", 5000);
            clearInterval(verificationInterval);
          }
        }, 5000);

        // Expiration timer
        const startTime = Date.now();
        expirationInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const remaining = VERIFICATION_TIMEOUT - elapsed;
          setTimeLeft(remaining);

          if (remaining <= 0) {
            clearInterval(expirationInterval);
            handleExpiredRegistration(currentUser);
          }
        }, 1000);
      }
    });

    const handleExpiredRegistration = async (user: User) => {
      try {
        await deleteUser(user);
        toast.error("Registration expired - please register again");
        window.location.href = "/auth/register";
      } catch (error) {
        console.error("Error cleaning up expired registration:", error);
        window.location.href = "/auth/register";
      }
    };

    return () => {
      unsubscribe();
      clearInterval(verificationInterval);
      clearInterval(expirationInterval);
    };
  }, []); // Empty dependencies array

  const handleResendVerification = async () => {
    if (!user) return;
    
    try {
      setIsResending(true);
      await sendEmailVerification(user);
      setTimeLeft(VERIFICATION_TIMEOUT); // Reset timer
      toast.success("New verification email sent!");
    } catch (error) {
      toast.error("Failed to resend verification email");
      console.error(error);
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isVerified) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center p-6 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
        <h1 className="text-3xl font-bold mb-4 text-white">🎉 Registration Complete!</h1>
        <p className="text-gray-300 max-w-md mb-6">
          Your email has been verified. Redirecting to login...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center p-6 text-center">
      <Mail className="w-16 h-16 text-blue-400 mb-4" />
      <h1 className="text-3xl font-bold mb-4 text-white">📧 Verify Your Email</h1>
      <p className="text-gray-300 max-w-md mb-6">
        Verification link sent to <span className="font-semibold text-white">{user?.email}</span>
      </p>

      <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6 max-w-md">
        <div className="flex items-center justify-center gap-2 text-yellow-400">
          <AlertTriangle className="w-5 h-5" />
          <span>Time remaining: {formatTime(timeLeft)}</span>
        </div>
      </div>

      <button
        onClick={handleResendVerification}
        disabled={isResending}
        className={`px-6 py-2 rounded-lg flex items-center gap-2 transition-colors ${
          isResending 
            ? "bg-gray-700 text-gray-400 cursor-not-allowed" 
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {isResending ? <RotateCw className="animate-spin" /> : <Mail />}
        Resend Email
      </button>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      <p className="mt-4 text-gray-400">Loading...</p>
    </div>
  );
}