"use client";
import { useState, useEffect } from 'react';
import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { Loader2, Play, MailWarning } from "lucide-react";
import LoginPage from "./components/LoginPage";
import ReelItem from "./components/ReelItem";

export default function ReelFeed() {
  const { data: session, status } = useSession();
  const [emails, setEmails] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetch('/api/emails')
        .then(async (res) => {
          if (res.status === 401) {
            // Token is expired or missing Gmail scopes
            console.error("Unauthorized: Signing out to reset session...");
            signOut();
            return;
          }
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to fetch emails");
          }
          return res.json();
        })
        .then(data => {
          if (data && data.messages) {
            setEmails(data.messages);
          }
          setLoadingEmails(false);
        })
        .catch(err => {
          console.error("Email Fetch Error:", err);
          setError(err.message);
          setLoadingEmails(false);
        });
    }
  }, [status]);

  // 1. Loading State (NextAuth is checking session)
  if (status === "loading") {
    return (
      <div className="h-screen bg-black flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin w-12 h-12 text-blue-500" />
          <p className="text-sm font-medium text-gray-400 animate-pulse">Checking Brainrot Status...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State (Show Login Page)
  if (status === "unauthenticated" || !session) {
    return <LoginPage />;
  }

  // 3. Authenticated but Loading Emails
  if (loadingEmails) {
    return (
      <div className="h-screen bg-black flex items-center justify-center text-white p-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="animate-spin w-16 h-16 text-purple-500" />
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-8 h-8 bg-purple-500/20 rounded-full blur-xl" />
            </div>
          </div>
          <h2 className="text-xl font-bold tracking-tighter">Initializing Doomscroll...</h2>
          <p className="text-gray-500 text-sm max-w-[200px]">Converting your professional emails into pure brainrot.</p>
        </div>
      </div>
    );
  }

  // 4. Handle Errors (e.g., API issues)
  if (error && emails.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white p-10 text-center">
        <MailWarning className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Inbox Connection Failed</h2>
        <p className="text-gray-400 mb-8">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // 5. User Gesture Gate (Browser Autoplay Requirement)
  if (!hasInteracted) {
    return (
      <div 
        className="h-screen bg-black flex flex-col items-center justify-center text-white space-y-8 cursor-pointer overflow-hidden relative" 
        onClick={() => setHasInteracted(true)}
      >
         {/* Background Glow */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-600/20 rounded-full blur-[120px]" />
         
         <motion.div 
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="w-32 h-32 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.4)] z-10"
         >
            <Play className="w-12 h-12 fill-white ml-2 text-white" />
         </motion.div>
         
         <div className="text-center z-10">
            <h1 className="text-4xl font-black tracking-tighter mb-2 italic">READY?</h1>
            <p className="text-gray-400 font-medium animate-bounce">Click to Enter the Feed</p>
         </div>
      </div>
    );
  }

  // 6. The Main Feed
  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center overflow-hidden font-sans">
      {/* Phone Mockup Wrapper */}
      <div className="relative w-full h-full md:w-[420px] md:h-[90vh] md:max-h-[850px] md:rounded-[3rem] bg-black overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border-0 md:border-[10px] border-[#1a1a1a]">
        
        {/* iPhone Style Dynamic Island */}
        <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black z-50 rounded-b-2xl" />

        <div className="relative h-full w-full bg-black">
          {emails.length > 0 ? (
            <motion.div 
              className="h-full w-full"
              animate={{ y: -currentIndex * 100 + "%" }}
              transition={{ type: "spring", stiffness: 250, damping: 30 }}
            >
              {emails.map((email, index) => (
                <ReelItem 
                  key={email.id} 
                  email={email} 
                  isActive={index === currentIndex}
                  // Preload the next 2 reels for smoothness
                  shouldLoad={index >= currentIndex - 1 && index <= currentIndex + 2}
                  onSwipeUp={() => {
                    if (currentIndex < emails.length - 1) setCurrentIndex(prev => prev + 1);
                  }}
                  onSwipeDown={() => {
                    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
                  }}
                />
              ))}
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 p-10 text-center gap-4">
              <div className="w-20 h-20 bg-gray-900 rounded-3xl flex items-center justify-center">
                 <MailWarning className="w-10 h-10 text-gray-700" />
              </div>
              <p className="font-bold text-white">Your inbox is too clean.</p>
              <p className="text-sm">We couldn't find any primary emails to rot your brain with.</p>
            </div>
          )}
        </div>

        {/* Top Header UI */}
        <div className="absolute top-10 left-0 right-0 px-6 flex justify-between items-center z-40 pointer-events-none">
            <div className="bg-black/20 backdrop-blur-xl px-4 py-1.5 rounded-full text-[11px] font-black text-white border border-white/10 tracking-widest uppercase">
                Inbox • {currentIndex + 1}/{emails.length}
            </div>
            <div className="flex gap-2">
               <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
               <span className="text-[10px] font-bold text-white/50 uppercase tracking-tighter">Live Feed</span>
            </div>
        </div>

        {/* Bottom Home Indicator (Mobile look) */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-white/20 rounded-full z-50 md:hidden" />
      </div>
    </div>
  );
}
