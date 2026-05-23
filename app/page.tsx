'use client';

import { useState, useRef, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { processImageAndSave } from './actions/processImage';

export default function CameraDashboard() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [mockUser] = useState('member@pup.edu.ph');

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const startCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facingMode }, // uses current facing mode
      audio: false,
    });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      setCameraActive(true);
      setStatus('');
    }
  } catch (err) {
    fileInputRef.current?.click();
  }
};

const flipCamera = async () => {
  stopCamera();
  const newMode = facingMode === 'environment' ? 'user' : 'environment';
  setFacingMode(newMode);
  
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: newMode },
    audio: false,
  });
  if (videoRef.current) {
    videoRef.current.srcObject = stream;
    setCameraActive(true);
  }
};

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);

    stopCamera();

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `snapshot_${Date.now()}.jpg`, { type: 'image/jpeg' });
      await uploadFile(file);
    }, 'image/jpeg', 0.9);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      setStatus('Uploading snapshot to storage...');

      const fileName = `${Date.now()}.jpg`;
      const { error: storageError } = await supabase.storage
        .from('event_gallery')
        .upload(fileName, file);

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from('event_gallery')
        .getPublicUrl(fileName);

      setStatus('AI is analyzing composition and awarding points...');

      const response = await processImageAndSave(publicUrl, mockUser);

      if (response.success && response.result) {
        setStatus(`✨ Success! Gemini awarded you ${response.result.points} points! Tagged: ${response.result.tags.join(', ')}`);
      } else {
        setStatus('Photo saved, but AI assessment timed out.');
      }
    } catch (err: any) {
      console.error(err);
      setStatus(`Upload failed: ${err.message || 'Error encountered'}`);
    } finally {
      setUploading(false);
    }
  };

  

  // Cleanup camera on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-between p-6">
      <header className="w-full text-center py-4">
        <h1 className="text-2xl font-bold tracking-tight text-emerald-400">CrowdLens</h1>
        <p className="text-xs text-slate-400 mt-1">Build with AI Documentation Portal</p>
      </header>

      {/* Viewfinder */}
      <div className="w-full max-w-sm aspect-square bg-slate-800 rounded-2xl border-2 border-dashed border-slate-700 overflow-hidden flex flex-col items-center justify-center text-center shadow-xl relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
        />
        <canvas ref={canvasRef} className="hidden" />

        {!cameraActive && (
          <div className="space-y-2 p-6">
            <p className="text-sm text-slate-300 px-4">
              {uploading
                ? <span className="animate-pulse">{status}</span>
                : status || 'Ready for action. Tap below to open camera!'}
            </p>
            {uploading && (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mt-4"></div>
            )}
          </div>
        )}
      </div>

      {/* Hidden fallback file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Buttons */}
      <div className="w-full max-w-sm pb-8 flex flex-col gap-3">
        {cameraActive ? (
          <>
            <button
              onClick={capturePhoto}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-lg transition shadow-lg active:scale-95"
            >
              📸 Capture Photo
            </button>
            <button
              onClick={stopCamera}
              className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-lg transition active:scale-95"
            >
              ✕ Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={startCamera}
              disabled={uploading}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 text-slate-950 font-bold rounded-xl text-lg transition shadow-lg active:scale-95"
            >
              {uploading ? 'Processing...' : '📷 Snap & Upload'}
            </button>
            
<a href="/gallery" className="text-xs text-slate-400 underline text-center block mt-4">
  View Gallery →
</a>
          </>
        )}
      </div>
    </main>
  );
}