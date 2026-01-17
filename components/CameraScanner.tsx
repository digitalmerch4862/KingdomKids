
import React, { useRef, useState, useEffect } from 'react';

interface CameraScannerProps {
  onCapture: (base64: string) => void;
  label?: string;
  isScanning?: boolean;
}

const CameraScanner: React.FC<CameraScannerProps> = ({ onCapture, label, isScanning }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const setupCamera = async () => {
    setError(null);
    stopStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera API is not supported in this browser or environment (check if HTTPS)');
      return;
    }

    try {
      // First, check if any video input devices exist at all
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoDevice = devices.some(device => device.kind === 'videoinput');
      
      if (!hasVideoDevice) {
        setError('No camera device detected. Please plug in a webcam.');
        return;
      }

      // Progressive constraints: Start specific, end generic
      const constraintOptions = [
        { video: { facingMode: { ideal: 'user' } }, audio: false },
        { video: { facingMode: 'user' }, audio: false },
        { video: true, audio: false },
        { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }
      ];

      let lastErr: any = null;
      let successStream: MediaStream | null = null;

      for (const constraints of constraintOptions) {
        try {
          successStream = await navigator.mediaDevices.getUserMedia(constraints);
          if (successStream) break;
        } catch (err: any) {
          lastErr = err;
          console.warn('Camera constraint failed, trying next...', constraints, err.name);
        }
      }

      if (successStream) {
        handleStream(successStream);
      } else {
        throw lastErr || new Error('All camera constraints failed');
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow access in browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('Camera hardware not found or disconnected.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is already in use by another application.');
      } else {
        setError(`Camera Error: ${err.message || 'Unknown initialization error'}`);
      }
    }
  };

  const handleStream = (s: MediaStream) => {
    setStream(s);
    if (videoRef.current) {
      videoRef.current.srcObject = s;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(e => console.warn("Video play failed:", e));
      };
    }
  };

  useEffect(() => {
    setupCamera();
    return () => stopStream();
  }, []);

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current && stream) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const videoWidth = videoRef.current.videoWidth || 640;
        const videoHeight = videoRef.current.videoHeight || 480;
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;
        
        ctx.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);
        
        const data = canvasRef.current.toDataURL('image/jpeg', 0.8);
        onCapture(data);
      }
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto aspect-video bg-gray-900 rounded-2xl overflow-hidden border-4 border-pink-200 shadow-xl">
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-gray-800">
          <span className="text-4xl animate-pulse">⚠️</span>
          <div>
            <p className="text-white font-black uppercase tracking-tight text-sm">{error}</p>
            <p className="text-gray-400 text-[9px] uppercase font-bold mt-2 leading-relaxed">
              Ensure your webcam is connected and you have granted browser permissions.
            </p>
          </div>
          <button 
            onClick={setupCamera}
            className="bg-pink-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-pink-700 transition-all shadow-lg active:scale-95"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover"
        />
      )}
      
      <canvas ref={canvasRef} className="hidden" />
      
      {isScanning && !error && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 border-4 border-pink-500/30 animate-pulse"></div>
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-pink-400 to-transparent absolute top-0 animate-[scan_2.5s_ease-in-out_infinite] shadow-[0_0_20px_rgba(236,72,153,0.9)]" />
        </div>
      )}

      {!error && (
        <div className="absolute bottom-6 inset-x-0 flex justify-center">
          <button 
            onClick={captureFrame}
            disabled={!stream || isScanning}
            className="bg-pink-600 hover:bg-pink-700 text-white px-10 py-4 rounded-full font-black shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-[11px]"
          >
            {isScanning ? "Processing..." : (label || "Capture Frame")}
          </button>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default CameraScanner;
