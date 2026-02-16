"use client";
import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Loader2, Play } from "lucide-react";
import LoginPage from "./components/LoginPage";
import ReelItem from "./components/ReelItem";

export default function ReelFeed() {
  const { data: session, status } = useSession();
  const [emails, setEmails] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    if (session) {
      fetch('/api/emails')
        .then(res => res.json())
        .then(data => {
          if (data.messages) setEmails(data.messages);
          setLoading(false);
        })
        .catch(err => {
            console.error(err);
            setLoading(false);
        });
    }
  }, [session]);

  const handleNext = () => {
    if (currentIndex < emails.length - 1) setCurrentIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  if (status === "loading") return null;
  if (!session) return <LoginPage />;
  
  if (loading) return (
    <div className="h-screen bg-black flex items-center justify-center text-white">
      <Loader2 className="animate-spin w-10 h-10 text-blue-500" />
    </div>
  );

  // User gesture required to unlock audio
  if (!hasInteracted) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white space-y-6 cursor-pointer" onClick={() => setHasInteracted(true)}>
         <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
            <Play className="w-10 h-10 fill-white" />
         </div>
         <h1 className="text-2xl font-bold tracking-tighter">Click to Enter Brainrot</h1>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden font-sans">
      <div className="relative w-full h-full md:w-[400px] md:h-[85vh] md:rounded-[3rem] bg-black overflow-hidden shadow-2xl border-0 md:border-[8px] border-[#222]">
        
        {/* Dynamic Island */}
        <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black z-50 rounded-b-2xl" />

        <div className="relative h-full w-full">
          <motion.div 
            className="h-full w-full"
            animate={{ y: -currentIndex * 100 + "%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {emails.map((email, index) => (
              <ReelItem 
                key={email.id} 
                email={email} 
                isActive={index === currentIndex}
                // Preload logic: Load current AND next one. 
                // As you scroll down (currentIndex increases), the next index becomes true.
                shouldLoad={index <= currentIndex + 1}
                onSwipeUp={handleNext}
                onSwipeDown={handlePrev}
              />
            ))}
          </motion.div>
        </div>

        {/* Indicator */}
        <div className="absolute top-12 left-6 z-40">
            <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">
                Inbox • {currentIndex + 1}/{emails.length}
            </div>
        </div>

      </div>
    </div>
  );
}
