
import React, { useState, useEffect, useRef } from 'react';
import CameraScanner from '../components/CameraScanner';
import { db, formatError } from '../services/db.service';
import { MinistryService } from '../services/ministry.service';
import { audio } from '../services/audio.service';
import jsQR from 'jsqr';

const getFirstName = (fullName: string) => {
  if (!fullName) return "Student";
  if (fullName.includes(',')) {
    const parts = fullName.split(',');
    return parts[1].trim().split(' ')[0];
  }
  return fullName.split(' ')[0];
};

const QRScanPage: React.FC<{ username: string }> = ({ username }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{ name: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);

  const handleCapture = async (base64: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Decode QR from base64 string
      const image = new Image();
      image.src = base64;
      await new Promise(resolve => image.onload = resolve);

      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not initialize QR decoder");
      ctx.drawImage(image, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        const accessKey = code.data.trim().toUpperCase();
        const student = await db.getStudentByNo(accessKey);
        
        if (student) {
          try {
            await MinistryService.checkIn(student.id, username);
            audio.playYehey();
            setLastResult({ name: getFirstName(student.fullName).toUpperCase(), status: 'CHECKED-IN SUCCESS' });
          } catch (e: any) {
            setLastResult({ name: getFirstName(student.fullName).toUpperCase(), status: 'ALREADY PRESENT' });
            audio.playClick();
          }
        } else {
          setError(`INVALID ACCESS KEY: ${accessKey}`);
        }
      } else {
        setError("NO QR CODE DETECTED IN FRAME");
      }
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsProcessing(false);
      // Auto-clear success after 3 seconds
      setTimeout(() => setLastResult(null), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">QR Scanner</h2>
        <p className="text-gray-400 font-medium uppercase tracking-widest text-[10px]">Instant check-in via Access Key</p>
      </div>

      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-pink-50">
        <div className="max-w-md mx-auto space-y-8">
          <CameraScanner 
            onCapture={handleCapture}
            isScanning={isProcessing}
            label={isProcessing ? 'READING KEY...' : 'SCAN ACCESS QR NOW'}
          />

          <div className="min-h-[140px] flex flex-col items-center justify-center border-2 border-dashed border-pink-50 rounded-[2.5rem] p-8 text-center bg-gray-50/30">
            {isProcessing && (
              <div className="animate-pulse flex flex-col items-center gap-2">
                <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-pink-500 font-black text-[10px] uppercase tracking-widest">Validating Key...</p>
              </div>
            )}

            {!isProcessing && lastResult && (
              <div className="animate-in zoom-in-95 duration-300">
                <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-100">✓</div>
                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">{lastResult.name}</h3>
                <p className="text-green-600 font-black text-[10px] uppercase tracking-widest mt-1">{lastResult.status}</p>
              </div>
            )}

            {!isProcessing && error && (
              <div className="animate-in shake duration-300">
                <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">❌</div>
                <p className="text-red-500 font-black text-[10px] uppercase tracking-widest">{error}</p>
                <p className="text-gray-400 text-[8px] font-black uppercase mt-1">Expected: KK-####-###</p>
              </div>
            )}

            {!isProcessing && !lastResult && !error && (
              <p className="text-gray-300 font-black text-[10px] uppercase tracking-widest">Awaiting scan from camera...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanPage;