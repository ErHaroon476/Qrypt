"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FiLock, FiLogIn, FiUserPlus, FiShield, FiLoader, FiKey } from "react-icons/fi";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function HomePage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/dashboard");
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, [router]);

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const buttonHover = {
    scale: 1.05,
    transition: { duration: 0.2 },
  };

  const buttonTap = {
    scale: 0.98,
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <FiLoader className="text-4xl text-blue-400 animate-spin" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => {
          const duration = 15 + Math.random() * 30;
          const delay = Math.random() * 5;
          const size = 1 + Math.random();
          const icon = [<FiLock />, <FiKey />, <FiShield />][Math.floor(Math.random() * 3)];
          
          return (
            <motion.div
              key={i}
              initial={{
                x: Math.random() * 100,
                y: Math.random() * 100,
                opacity: 0.1,
                scale: size,
              }}
              animate={{
                x: [null, Math.random() * 100],
                y: [null, Math.random() * 100],
                rotate: [0, 360],
              }}
              transition={{
                duration: duration,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "linear",
                delay: delay,
              }}
              className="absolute text-blue-400/20"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                fontSize: `${size}rem`,
              }}
            >
              {icon}
            </motion.div>
          );
        })}
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        <main className="flex-grow flex flex-col justify-center items-center px-4 py-12">
          {/* Logo/Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <FiLock className="mx-auto text-6xl text-blue-400 mb-4" />
            <h1 className="text-5xl font-bold text-white">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">
                Qrypt
              </span>
            </h1>
            <p className="mt-2 text-gray-400">Secure password management</p>
          </motion.div>

          {/* Buttons - Centered */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={container}
            className="flex flex-col sm:flex-row gap-4 w-full max-w-xs mb-16"
          >
            <motion.button
              variants={item}
              whileHover={buttonHover}
              whileTap={buttonTap}
              onClick={() => router.push("/auth/login")}
              className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all"
            >
              <FiLogIn />
              Login
            </motion.button>

            <motion.button
              variants={item}
              whileHover={buttonHover}
              whileTap={buttonTap}
              onClick={() => router.push("/auth/signup")}
              className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/30 transition-all"
            >
              <FiUserPlus />
              Sign Up
            </motion.button>
          </motion.div>

          {/* Features - Below buttons */}
          <motion.div
            variants={container}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl"
          >
            {[
              { 
                icon: <FiLock className="text-3xl text-blue-400" />, 
                title: "Military-Grade Security", 
                description: "AES-256 encryption keeps your data safe" 
              },
              { 
                icon: <FiShield className="text-3xl text-green-400" />, 
                title: "Zero-Knowledge", 
                description: "We never see or store your master password" 
              },
              { 
                icon: <FiKey className="text-3xl text-purple-400" />, 
                title: "Cross-Platform", 
                description: "Access your passwords anywhere" 
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                variants={item}
                whileHover={{ y: -5 }}
                className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg border border-gray-700 hover:border-blue-400/30 transition-all"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </main>

        {/* Simple Footer */}
        <footer className="py-6 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} Qrypt. All rights reserved.</p>
        </footer>
      </div>
    </div>
  

);
}