import React, { useState, useRef, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, X, Maximize2, Minimize2, RotateCcw, ChevronLeft, ChevronRight, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProductZoomViewerProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  productName?: string;
}

export function ProductZoomViewer({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  productName = "Product Image",
}: ProductZoomViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHint, setShowHint] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchDistanceRef = useRef<number | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTapRef = useRef<number>(0);

  // Sync initial index
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setShowHint(true);
    }
  }, [isOpen, initialIndex]);

  // Hide hint after 3 seconds
  useEffect(() => {
    if (isOpen && showHint) {
      const timer = setTimeout(() => setShowHint(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, showHint]);

  // Reset zoom & pan helper
  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Change image helper
  const goToImage = useCallback(
    (index: number) => {
      if (index >= 0 && index < images.length) {
        setCurrentIndex(index);
        resetZoom();
      }
    },
    [images.length, resetZoom]
  );

  // Zoom to specific scale & clamp
  const setClampedScale = useCallback((newScale: number, focalPoint?: { x: number; y: number }) => {
    const clamped = Math.min(Math.max(newScale, 1), 4);
    setScale(clamped);
    if (clamped === 1) {
      setPosition({ x: 0, y: 0 });
    } else if (focalPoint && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const originX = focalPoint.x - rect.left - rect.width / 2;
      const originY = focalPoint.y - rect.top - rect.height / 2;
      setPosition({
        x: -originX * (clamped - 1) * 0.5,
        y: -originY * (clamped - 1) * 0.5,
      });
    }
  }, []);

  const handleZoomIn = () => setClampedScale(Math.min(scale + 0.6, 4));
  const handleZoomOut = () => setClampedScale(Math.max(scale - 0.6, 1));

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation & controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        goToImage(currentIndex - 1);
      } else if (e.key === "ArrowRight") {
        goToImage(currentIndex + 1);
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn();
      } else if (e.key === "-") {
        handleZoomOut();
      } else if (e.key === "0") {
        resetZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, goToImage, resetZoom, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.3 : 0.3;
    setClampedScale(scale + delta, { x: e.clientX, y: e.clientY });
  };

  // Double click / tap toggle
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (scale > 1) {
      resetZoom();
    } else {
      setClampedScale(2.5, { x: e.clientX, y: e.clientY });
    }
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    const maxBound = 300 * (scale - 1);
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setPosition({
      x: Math.min(Math.max(newX, -maxBound), maxBound),
      y: Math.min(Math.max(newY, -maxBound), maxBound),
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch handlers for Pinch-to-Zoom & Pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        // Double tap detected
        if (scale > 1) {
          resetZoom();
        } else {
          setClampedScale(2.5, { x: e.touches[0].clientX, y: e.touches[0].clientY });
        }
      }
      lastTapRef.current = now;

      touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (scale > 1) {
        setIsDragging(true);
        setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
      }
    } else if (e.touches.length === 2) {
      // Two finger pinch start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && scale > 1) {
      const maxBound = 300 * (scale - 1);
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      setPosition({
        x: Math.min(Math.max(newX, -maxBound), maxBound),
        y: Math.min(Math.max(newY, -maxBound), maxBound),
      });
    } else if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchDistanceRef.current;
      setClampedScale(scale * factor);
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsDragging(false);
    touchDistanceRef.current = null;

    // Swipe between images when not zoomed
    if (scale === 1 && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartPosRef.current.x;
      if (deltaX > 60) {
        goToImage(currentIndex - 1);
      } else if (deltaX < -60) {
        goToImage(currentIndex + 1);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col justify-between select-none animate-in fade-in duration-200 touch-none">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between text-white px-4 py-3 sm:px-6 sm:py-4 z-20 max-w-7xl mx-auto w-full bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
          <span className="text-xs sm:text-sm font-bold bg-white/15 px-2.5 py-1 rounded-full backdrop-blur-md border border-white/10 shrink-0">
            {currentIndex + 1} / {images.length}
          </span>
          <span className="text-xs sm:text-sm font-medium text-white/80 truncate hidden sm:inline">
            {productName}
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Zoom Level Indicator */}
          <span className="text-xs font-mono font-bold text-white/90 bg-white/10 px-2 py-1 rounded-lg mr-1 border border-white/10">
            {Math.round(scale * 100)}%
          </span>

          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
            disabled={scale <= 1}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 transition-all text-white active:scale-95 touch-manipulation"
            title="Zoom Out (-)"
            aria-label="Zoom Out"
          >
            <ZoomOut className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          </button>

          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            disabled={scale >= 4}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 transition-all text-white active:scale-95 touch-manipulation"
            title="Zoom In (+)"
            aria-label="Zoom In"
          >
            <ZoomIn className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          </button>

          {/* Reset Zoom */}
          {scale > 1 && (
            <button
              onClick={resetZoom}
              className="p-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-95 flex items-center gap-1 px-2.5 text-xs font-bold shadow-lg"
              title="Reset 100% (0)"
              aria-label="Reset Zoom"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">100%</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white active:scale-95 hidden sm:flex touch-manipulation"
            title="Fullscreen"
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition-all active:scale-95 ml-1 touch-manipulation shadow-md"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X className="h-5 w-5 sm:h-5 sm:w-5" />
          </button>
        </div>
      </header>

      {/* Main Interactive Stage */}
      <main
        ref={containerRef}
        className={cn(
          "relative flex-1 flex items-center justify-center overflow-hidden my-auto w-full h-full",
          scale > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
        )}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Navigation Prev Button */}
        {images.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToImage(currentIndex - 1);
            }}
            disabled={currentIndex === 0}
            className="absolute left-2 sm:left-6 z-30 p-3 rounded-full bg-black/60 hover:bg-primary text-white disabled:opacity-20 transition-all active:scale-90 backdrop-blur-md shadow-2xl border border-white/10"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>
        )}

        {/* Zoomed & Pinned Image */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-100 ease-out will-change-transform"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          <img
            src={images[currentIndex]}
            alt={productName}
            className="max-h-[72vh] sm:max-h-[78vh] max-w-[92vw] object-contain drop-shadow-[0_15px_35px_rgba(0,0,0,0.8)] pointer-events-none select-none rounded-lg"
            draggable={false}
          />
        </div>

        {/* Navigation Next Button */}
        {images.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToImage(currentIndex + 1);
            }}
            disabled={currentIndex === images.length - 1}
            className="absolute right-2 sm:right-6 z-30 p-3 rounded-full bg-black/60 hover:bg-primary text-white disabled:opacity-20 transition-all active:scale-90 backdrop-blur-md shadow-2xl border border-white/10"
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>
        )}

        {/* Interactive Helper Toast/Badge */}
        {showHint && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full border border-white/20 shadow-2xl flex items-center gap-2 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Hand className="h-4 w-4 text-primary animate-bounce" />
            <span>Double tap to zoom • Drag to pan details</span>
          </div>
        )}
      </main>

      {/* Bottom Thumbnail Strip */}
      {images.length > 1 && (
        <footer className="z-20 max-w-4xl mx-auto w-full px-4 pb-4 pt-2 bg-gradient-to-t from-black/90 to-transparent">
          <div className="flex justify-center items-center gap-2 sm:gap-3 overflow-x-auto py-1 px-2 no-scrollbar">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => goToImage(idx)}
                className={cn(
                  "w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 active:scale-95 bg-muted/20 relative",
                  currentIndex === idx
                    ? "border-primary ring-2 ring-primary/60 scale-105 shadow-xl opacity-100"
                    : "border-white/20 opacity-50 hover:opacity-90"
                )}
                aria-label={`View image ${idx + 1}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover select-none pointer-events-none" />
              </button>
            ))}
          </div>
        </footer>
      )}
    </div>
  );
}
