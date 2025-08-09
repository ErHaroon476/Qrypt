"use client";

import { useEffect, useState, useRef } from "react";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { ChevronDown, LogOut, User as UserIcon, Lock, Shield, Key } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [typingComplete, setTypingComplete] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const router = useRouter();
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Animated typing effect
    const texts = ["Qrypt", "Encrypt your Passwords", "Highly Secure"];
    let currentTextIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 150;

    const type = () => {
      const currentText = texts[currentTextIndex];

      if (isDeleting) {
        setDisplayText(currentText.substring(0, charIndex - 1));
        charIndex--;
      } else {
        setDisplayText(currentText.substring(0, charIndex + 1));
        charIndex++;
      }

      if (!isDeleting && charIndex === currentText.length) {
        isDeleting = true;
        typingSpeed = 100;
        setTimeout(type, 2000); // Pause at end of text
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        currentTextIndex = (currentTextIndex + 1) % texts.length;
        typingSpeed = 150;
        setTimeout(type, 500);
      } else {
        setTimeout(type, typingSpeed);
      }

      if (currentTextIndex === texts.length - 1 && charIndex === currentText.length) {
        setTypingComplete(true);
      }
    };

    setTimeout(type, 1000);

    return () => {
      clearTimeout(typingSpeed as any);
    };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return parts[0][0].toUpperCase() + parts[1][0].toUpperCase();
    }
    return name[0]?.toUpperCase() || "?";
  };

  return (
    <nav className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-6 py-1 flex justify-between items-center shadow-lg relative z-50">
      {/* Animated Logo/App Name */}
      <div className="flex items-center gap-3">
        <motion.div
          animate={{
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 5,
          }}
        >
          <Lock className="h-6 w-6" />
        </motion.div>
        
        <div className="text-lg font-bold tracking-wide relative">
          <div ref={textRef} className="min-w-[120px] h-6">
            {displayText}
            {!typingComplete && (
              <motion.span
                className="ml-1 inline-block w-1 h-6 bg-white"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Right side */}
      {user && (
        <div className="flex items-center gap-4 relative">
          <div className="relative">
            {/* Profile button */}
            <motion.button
              onClick={() => setMenuOpen((prev) => !prev)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition px-3 py-1.5 rounded-full backdrop-blur-sm"
            >
              <motion.div
                className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center font-semibold text-sm"
                animate={{
                  boxShadow: [
                    "0 0 0 0px rgba(59, 130, 246, 0.7)",
                    "0 0 0 3px rgba(59, 130, 246, 0)",
                    "0 0 0 0px rgba(59, 130, 246, 0.7)",
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              >
                {getInitials(user.displayName || user.email || "")}
              </motion.div>
              <motion.div
                animate={{ rotate: menuOpen ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <ChevronDown size={16} />
              </motion.div>
            </motion.button>

            {/* Animated Dropdown Menu */}
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  className="absolute right-0 mt-2 w-56 bg-gray-800 text-white rounded-lg shadow-xl overflow-hidden border border-gray-700"
                >
                  <div className="px-4 py-3 border-b border-gray-700">
                    <p className="font-semibold flex items-center gap-2">
                      <UserIcon size={16} />
                      {user.displayName || "User"}
                    </p>
                    <p className="text-sm text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                  
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 hover:bg-red-900/50 text-sm text-red-400 transition-colors"
                    >
                      <motion.div
                        animate={{ x: [0, 2, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <LogOut size={16} />
                      </motion.div>
                      Logout
                    </button>
                  </motion.div>
                  
                  <div className="border-t border-gray-700 px-4 py-2 flex justify-between">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="text-blue-400"
                    >
                      <Shield size={18} />
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="text-green-400"
                    >
                      <Key size={18} />
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="text-purple-400"
                    >
                      <Lock size={18} />
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </nav>
  );
}