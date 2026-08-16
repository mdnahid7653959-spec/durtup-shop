import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { analyzeProductImage } from "@/utils/imageSearch";
import { cn } from "@/lib/utils";

interface ImageSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectKeyword?: (keyword: string) => void;
}

export function ImageSearchModal({ open, onOpenChange, onSelectKeyword }: ImageSearchModalProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [showCameraStream, setShowCameraStream] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setShowCameraStream(false);
  };

  useEffect(() => {
    if (!open) {
      stopCameraStream();
      setAnalyzing(false);
      setShowCameraStream(false);
    }
  }, [open]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        mediaStreamRef.current = stream;
        setShowCameraStream(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        }, 100);
      } else {
        cameraInputRef.current?.click();
      }
    } catch (err: any) {
      console.warn("Camera access fallback:", err);
      setCameraError("Camera preview unavailable. Opening native camera...");
      cameraInputRef.current?.click();
    }
  };

  const capturePhotoFromStream = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
          stopCameraStream();
          handleFileChange(file);
        }
      }, "image/jpeg", 0.92);
    }
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    stopCameraStream();
    setAnalyzing(true);

    try {
      const res = await analyzeProductImage(file);
      
      // Fast ~350ms professional scanning animation, then close modal and navigate directly to products section!
      setTimeout(() => {
        setAnalyzing(false);
        onOpenChange(false);
        const keyword = res.primaryKeyword || "smart watch";
        if (onSelectKeyword) {
          onSelectKeyword(keyword);
        } else {
          navigate(`/products?search=${encodeURIComponent(keyword)}&visualSearch=true`);
        }
      }, 350);
    } catch (err) {
      console.error("Failed to analyze image:", err);
      setAnalyzing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card text-card-foreground p-0 overflow-hidden border border-border/80 shadow-2xl rounded-3xl">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-primary to-slate-900 p-6 text-primary-foreground relative overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight text-white">
              Visual Product Search
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs font-medium text-primary-foreground/90 mt-1.5 leading-relaxed">
            Upload or take a photo of any product to search and display matching items instantly.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Hidden File Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
          />

          {/* Live Camera Stream Mode */}
          {showCameraStream && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-primary/50 shadow-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-md rounded-full text-[10px] uppercase font-bold tracking-wider text-white">
                  Live Camera Feed
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={capturePhotoFromStream}
                  className="flex-1 h-12 rounded-xl font-bold text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-transform active:scale-[0.98]"
                >
                  Snap Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={stopCameraStream}
                  className="h-12 rounded-xl font-semibold border-border/80 text-sm px-6"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Upload Dropzone View */}
          {!analyzing && !showCameraStream && (
            <div className="space-y-5">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed border-primary/30 hover:border-primary rounded-3xl p-10 text-center",
                  "bg-muted/30 hover:bg-primary/5 cursor-pointer transition-all duration-300 group"
                )}
              >
                <h4 className="text-base font-bold text-foreground tracking-tight">
                  Upload Product Image
                </h4>
                <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                  Drag and drop your product photo here, or click to browse files
                </p>
                <p className="text-[11px] text-muted-foreground/70 mt-3 font-semibold uppercase tracking-wider">
                  Supports JPG, PNG, WEBP — Maximum 10MB
                </p>
              </div>

              {cameraError && (
                <p className="text-xs text-amber-600 text-center font-medium bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                  {cameraError}
                </p>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-xl text-xs uppercase font-bold tracking-wider border-border/80 hover:bg-muted transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose from Gallery
                </Button>

                <Button
                  type="button"
                  className="h-12 rounded-xl text-xs uppercase font-bold tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all active:scale-[0.98]"
                  onClick={startCamera}
                >
                  Take Photo with Camera
                </Button>
              </div>
            </div>
          )}

          {/* High-Tech Professional Scanning Animation */}
          {analyzing && (
            <div className="py-12 text-center space-y-5">
              <div className="relative mx-auto w-24 h-24 rounded-3xl overflow-hidden border-2 border-primary shadow-2xl bg-slate-950 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/50 via-primary/10 to-primary/50 animate-pulse" />
                <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 shadow-[0_0_18px_#eab308] animate-bounce top-1/2" />
                <span className="text-[11px] font-black uppercase tracking-widest text-primary-foreground z-10 animate-pulse">
                  AI SCAN
                </span>
              </div>

              <div>
                <h4 className="text-base font-extrabold text-foreground tracking-tight uppercase">
                  AI Visual Recognition Active
                </h4>
                <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                  Matching visual features with store inventory & navigating to product section...
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
