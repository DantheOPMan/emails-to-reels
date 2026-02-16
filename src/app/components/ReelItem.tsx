"use client";
import { useState, useRef, useEffect, useMemo } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Download, Loader2, Heart, Share2 } from "lucide-react";
import { getSmartChunks } from "../lib/utils";

interface ReelItemProps {
  email: {
    id: string;
    sender: string;
    body: string;
  };
  isActive: boolean;
  shouldLoad: boolean; // Controls preloading
  onSwipeUp: () => void;
  onSwipeDown: () => void;
}

export default function ReelItem({ email, isActive, shouldLoad, onSwipeUp, onSwipeDown }: ReelItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [audioUrl, setAudioUrl] = useState("");
  const [activeText, setActiveText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  
  const ffmpegRef = useRef<FFmpeg | null>(null);

  // --- 1. Calculate Schedule Upfront ---
  // Calculates exactly when each chunk starts and ends based on word count
  const schedule = useMemo(() => {
    const chunks = getSmartChunks(email.body.substring(0, 300));
    let currentTime = 0;
    
    return chunks.map(text => {
      const wordCount = text.split(" ").length;
      // 300ms per word is a good baseline for TTS speed
      const duration = Math.max(1000, (wordCount * 300) + 200);
      const start = currentTime;
      const end = currentTime + duration;
      currentTime = end;
      return { text, start, end };
    });
  }, [email.body]);

  // --- 2. Progressive Loading ---
  useEffect(() => {
    if (shouldLoad && !audioUrl) {
      const cleanText = email.body.substring(0, 300); 
      fetch(`/api/tts?text=${encodeURIComponent(cleanText)}`)
        .then(res => res.blob())
        .then(blob => {
          setAudioUrl(URL.createObjectURL(blob));
        });
    }
  }, [shouldLoad, audioUrl, email.body]);

  // --- 3. Playback & Sync Engine ---
  useEffect(() => {
    if (!isActive) {
      videoRef.current?.pause();
      audioRef.current?.pause();
      setActiveText(""); 
      return;
    }

    // Play Assets
    videoRef.current?.play().catch(() => {});

    if (audioUrl && audioRef.current) {
      const audio = audioRef.current;
      audio.currentTime = 0;
      audio.src = audioUrl;
      
      const playPromise = audio.play();
      playPromise.catch(() => console.log("Audio play interrupted"));

      // --- SYNC ENGINE (RequestAnimationFrame) ---
      let startTime = Date.now();
      let animationFrameId: number;

      const tick = () => {
        const elapsed = Date.now() - startTime;
        
        // Find the chunk that should be shown right now
        const currentItem = schedule.find(item => elapsed >= item.start && elapsed < item.end);

        if (currentItem) {
          setActiveText(prev => prev !== currentItem.text ? currentItem.text : prev);
        } else if (elapsed > schedule[schedule.length - 1]?.end) {
          // Finished
          setActiveText(""); 
        }

        if (elapsed < schedule[schedule.length - 1]?.end + 1000) {
          animationFrameId = requestAnimationFrame(tick);
        }
      };

      // Start the loop slightly after play to account for buffering
      const startTimer = setTimeout(() => {
        startTime = Date.now();
        tick();
      }, 100);

      return () => {
        clearTimeout(startTimer);
        cancelAnimationFrame(animationFrameId);
        audio.pause();
      };
    }
  }, [isActive, audioUrl, schedule]);


  // --- 4. FFmpeg Download Logic ---
  const handleDownload = async () => {
    if (downloadUrl) return; 
    setIsProcessing(true);
    
    try {
        if (!ffmpegRef.current) ffmpegRef.current = new FFmpeg();
        const ffmpeg = ffmpegRef.current;
        
        if (!ffmpeg.loaded) {
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
        }

        const videoData = await fetch(new URL('/subway_surfers.mp4', window.location.origin)).then(r => r.arrayBuffer());
        const fontData = await fetch(new URL('/Roboto-Bold.ttf', window.location.origin)).then(r => r.arrayBuffer());
        const audioBlob = await fetch(audioUrl).then(r => r.blob());

        await ffmpeg.writeFile('input.mp4', new Uint8Array(videoData));
        await ffmpeg.writeFile('audio.mp3', await fetchFile(audioBlob));
        await ffmpeg.writeFile('font.ttf', new Uint8Array(fontData));

        const cleanText = email.body.substring(0, 150).replace(/'/g, "").replace(/(\r\n|\n|\r)/gm, " ");
        
        await ffmpeg.exec([
            '-stream_loop', '-1', '-i', 'input.mp4',
            '-i', 'audio.mp3',
            '-map', '0:v', '-map', '1:a',
            '-vf', `drawtext=fontfile=font.ttf:text='${cleanText}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.6:boxborderw=20:line_spacing=20`,
            '-c:v', 'libx264', '-preset', 'ultrafast',
            '-shortest',
            'output.mp4'
        ]);

        const data = await ffmpeg.readFile('output.mp4');
        const videoBlob = new Blob([data as Uint8Array], { type: 'video/mp4' });
        setDownloadUrl(URL.createObjectURL(videoBlob));
    } catch (e) {
        console.error(e);
        alert("Render failed");
    } finally {
        setIsProcessing(false);
    }
  };

  const y = useMotionValue(0);
  const opacity = useTransform(y, [-100, 0, 100], [0.5, 1, 0.5]);

  return (
    <motion.div 
      className="relative h-full w-full bg-gray-900 overflow-hidden"
      style={{ opacity }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      onDragEnd={(e, { offset }) => {
        if (offset.y < -100) onSwipeUp();
        if (offset.y > 100) onSwipeDown();
      }}
    >
        <video 
            ref={videoRef}
            src="/subway_surfers.mp4"
            loop
            muted 
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90" />
        <audio ref={audioRef} />

        {/* Content Layer */}
        <div className="absolute inset-0 flex flex-col z-10 pointer-events-none">
            
            {/* CENTRAL TEXT */}
            <div className="flex-1 flex items-center justify-center px-6">
                <div className="w-full text-center">
                  <AnimatePresence mode="wait">
                      {activeText && (
                        <motion.div 
                            key={activeText}
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 1.1, position: 'absolute', left: 0, right: 0 }}
                            transition={{ duration: 0.15 }} // Fast snappy transitions
                        >
                            <span 
                              className="inline-block text-3xl md:text-4xl font-black text-white leading-tight drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] px-4 py-2 bg-black/40 backdrop-blur-sm rounded-2xl"
                              style={{ 
                                textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
                                fontFamily: 'sans-serif'
                              }}
                            >
                                {activeText}
                            </span>
                        </motion.div>
                      )}
                  </AnimatePresence>
                </div>
            </div>

            {/* BOTTOM INFO (Pointer events allowed) */}
            <div className="p-4 pb-16 flex items-end justify-between pointer-events-auto">
                <div className="flex-1 mr-8">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                            {email.sender[0]?.toUpperCase() || 'G'}
                        </div>
                        <div className="flex flex-col">
                           <span className="font-bold text-white text-sm drop-shadow-md">{email.sender}</span>
                           <span className="text-[10px] text-gray-300">Suggested for you</span>
                        </div>
                    </div>
                    
                    <div className="bg-black/30 backdrop-blur-sm p-3 rounded-xl border border-white/5">
                        <h2 className="text-white text-xs opacity-90 line-clamp-2 leading-relaxed">
                           {email.body.substring(0, 60)}...
                        </h2>
                    </div>
                </div>

                <div className="flex flex-col gap-6 items-center pb-2">
                    <button className="flex flex-col items-center gap-1 group">
                         <div className="p-3 bg-black/40 rounded-full backdrop-blur-md group-active:scale-90 transition-transform border border-white/10">
                            <Heart className="w-7 h-7 text-white" />
                         </div>
                         <span className="text-[10px] font-bold text-white">Like</span>
                    </button>

                    <div className="relative">
                        {downloadUrl ? (
                            <a 
                                href={downloadUrl} 
                                download={`brainrot-${email.id}.mp4`}
                                className="flex flex-col items-center gap-1 group"
                            >
                                <div className="p-3 bg-green-500 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.6)] animate-[bounce_1s_infinite]">
                                    <Download className="w-7 h-7 text-black fill-current" />
                                </div>
                                <span className="text-[10px] font-bold text-green-400">Save</span>
                            </a>
                        ) : (
                            <button 
                                onClick={handleDownload}
                                disabled={isProcessing}
                                className="flex flex-col items-center gap-1 group"
                            >
                                 <div className="p-3 bg-black/40 rounded-full backdrop-blur-md group-active:scale-90 transition-transform border border-white/10">
                                    {isProcessing ? (
                                        <Loader2 className="w-7 h-7 animate-spin text-white" />
                                    ) : (
                                        <Share2 className="w-7 h-7 text-white" />
                                    )}
                                 </div>
                                 <span className="text-[10px] font-bold text-white">Share</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </motion.div>
  );
}
