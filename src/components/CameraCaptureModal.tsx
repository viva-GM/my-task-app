import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Check } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

interface Props {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export const CameraCaptureModal: React.FC<Props> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let localStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        setIsInitializing(true);
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        setStream(localStream);
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }
        setIsInitializing(false);
      } catch (err: any) {
        console.error('Camera access error:', err);
        setCameraError('Unable to access webcam. Please check browser permissions or upload an image file.');
        setIsInitializing(false);
      }
    };

    startCamera();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const takePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async blob => {
      if (blob) {
        try {
          const compressed = await compressImage(blob);
          setCapturedPhoto(compressed);
        } catch {
          setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.8));
        }
      }
    }, 'image/jpeg', 0.85);
  };

  const handleConfirm = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Take Photo from Camera
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="p-4 bg-slate-950 flex flex-col items-center justify-center min-h-[300px] relative">
          {cameraError ? (
            <div className="p-4 text-center text-rose-300 text-xs max-w-sm">
              <p>{cameraError}</p>
            </div>
          ) : capturedPhoto ? (
            <img
              src={capturedPhoto}
              alt="Camera snapshot"
              className="max-h-[340px] w-auto rounded-lg object-contain shadow-lg"
            />
          ) : (
            <>
              {isInitializing && (
                <div className="text-xs text-slate-400 absolute">
                  Connecting to camera...
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-h-[340px] w-full rounded-lg object-cover"
              />
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium cursor-pointer"
          >
            Cancel
          </button>

          {capturedPhoto ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetake}
                className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 stroke-3" />
                <span>Attach Photo</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!!cameraError || isInitializing}
              onClick={takePhoto}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Capture Photo</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
