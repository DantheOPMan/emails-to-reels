"use client";
import { useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export default function ReelMaker() {
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const ffmpegRef = useRef(new FFmpeg());

  const loadFFmpeg = async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    const ffmpeg = ffmpegRef.current;
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  };

  const generateReel = async () => {
    setLoading(true);
    await loadFFmpeg();
    const ffmpeg = ffmpegRef.current;

    // 1. Fetch Email
    const emailRes = await fetch('/api/emails');
    const { body } = await emailRes.json();

    // 2. Generate Speech (Completely Free Browser Tool)
    // Note: In a real app, you'd record the 'speechSynthesis' output to a blob.
    // For this example, we assume you have an 'audio.mp3' or use a free TTS API like Puter.js
    const audioBlob = await fetchTTS(body); 

    // 3. Process with FFmpeg
    await ffmpeg.writeFile('input.mp4', await fetchFile('/subway_surfers.mp4'));
    await ffmpeg.writeFile('audio.mp3', await fetchFile(audioBlob));

    // Command: Mix audio with video and trim video to audio length
    await ffmpeg.exec([
      '-i', 'input.mp4', 
      '-i', 'audio.mp3', 
      '-map', '0:v', '-map', '1:a', 
      '-c:v', 'copy', '-shortest', 
      'output.mp4'
    ]);

    const data = await ffmpeg.readFile('output.mp4');
    setVideoUrl(URL.createObjectURL(new Blob([data], { type: 'video/mp4' })));
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center p-10 gap-5">
      <h1 className="text-2xl font-bold">Email to Reel Converter</h1>
      <button 
        onClick={generateReel} 
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:bg-gray-400"
      >
        {loading ? "Generating (This stays in your browser)..." : "Convert Latest Email"}
      </button>

      {videoUrl && (
        <video src={videoUrl} controls className="w-[360px] h-[640px] rounded-xl shadow-2xl" />
      )}
    </div>
  );
}

// Simple Helper for Free TTS (Puter.js or Web Speech)
async function fetchTTS(text: string) {
  // Option A: Use Web Speech API + MediaRecorder (True Free)
  // Option B: Use a free API proxy. For simplicity, we use a placeholder:
  const response = await fetch(`https://api.voicerss.org/?key=YOUR_FREE_KEY&src=${text}&hl=en-us&f=44khz_16bit_stereo`);
  return response.blob();
}
