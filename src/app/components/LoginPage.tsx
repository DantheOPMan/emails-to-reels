"use client";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Mail, Sparkles } from "lucide-react";

export default function LoginPage() {
    return (
        <div className="h-screen bg-[#000] flex flex-col items-center justify-center p-6 text-center overflow-hidden relative font-sans">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] left-[10%] w-72 h-72 bg-blue-600/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[20%] right-[10%] w-72 h-72 bg-purple-600/20 rounded-full blur-[100px]" />
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="z-10 max-w-sm"
            >
              <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-[2.5rem] mx-auto mb-8 shadow-2xl flex items-center justify-center rotate-3 hover:rotate-6 transition-transform">
                <Sparkles className="text-white w-12 h-12" />
              </div>
              <h1 className="text-5xl font-black text-white mb-6 tracking-tighter">
                Gmail<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Brainrot</span>
              </h1>
              <p className="text-gray-400 text-lg mb-10 leading-relaxed">
                Turn your boring inbox into a doom-scrollable feed of attention-span destroying content.
              </p>
              
              <button 
                onClick={() => signIn("google")}
                className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 rounded-2xl hover:bg-gray-200 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                <Mail className="w-5 h-5" />
                Continue with Google
              </button>
            </motion.div>
        </div>
    );
}
