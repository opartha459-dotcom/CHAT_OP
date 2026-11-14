import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  Sliders,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  CheckCircle2,
  RefreshCw,
  Crop,
  Layers,
  Sparkles
} from 'lucide-react';

export const ImageCropModal = ({
  isOpen,
  onClose,
  imageSrc,
  initialAspectRatio = '16:9',
  token,
  title = 'Crop & Adjust Image',
  onCropComplete
}) => {
  const [aspectRatio, setAspectRatio] = useState(initialAspectRatio);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 800, height: 600 });
  const [uploading, setUploading] = useState(false);

  const imgRef = useRef(null);
  const boxRef = useRef(null);
  const dragStartRef = useRef(null);
  const pinchStartDistRef = useRef(null);
  const pinchStartScaleRef = useRef(1);

  // Sync aspect ratio whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setAspectRatio(initialAspectRatio);
      setScale(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setDragging(false);
    }
  }, [isOpen, initialAspectRatio]);

  // Probe natural image dimensions
  useEffect(() => {
    if (!imageSrc) return;
    const probe = new Image();
    probe.crossOrigin = 'anonymous';
    probe.onload = () => {
      setNaturalSize({
        width: probe.naturalWidth || 800,
        height: probe.naturalHeight || 600
      });
    };
    probe.onerror = () => {
      setNaturalSize({ width: 800, height: 600 });
    };
    probe.src = imageSrc;
  }, [imageSrc]);

  // Determine viewport box dimensions based on chosen aspect ratio
  const getBoxDimensions = () => {
    const maxWidth = 380;
    if (aspectRatio === '1:1') {
      return { width: 300, height: 300, outputW: 600, outputH: 600, rounded: 'rounded-2xl' };
    }
    if (aspectRatio === '4:3') {
      return { width: 360, height: 270, outputW: 960, outputH: 720, rounded: 'rounded-2xl' };
    }
    // Default 16:9 banner / screenshot
    return { width: 380, height: 214, outputW: 1280, outputH: 720, rounded: 'rounded-2xl' };
  };

  const { width: boxWidth, height: boxHeight, outputW, outputH, rounded } = getBoxDimensions();

  // Natural cover calculation
  const scaleCover = Math.max(
    boxWidth / (naturalSize.width || 1),
    boxHeight / (naturalSize.height || 1)
  );
  const baseWidth = (naturalSize.width || 800) * scaleCover;
  const baseHeight = (naturalSize.height || 600) * scaleCover;

  // Pointer drag handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y
    };
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      pinchStartScaleRef.current = scale;
      setDragging(true);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      setDragging(true);
      dragStartRef.current = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        offsetX: offset.x,
        offsetY: offset.y
      };
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setScale((s) => Math.min(4, Math.max(1, +(s + delta).toFixed(2))));
  };

  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (e) => {
      if (e.touches && e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (pinchStartDistRef.current) {
          const ratio = dist / pinchStartDistRef.current;
          setScale(Math.min(4, Math.max(1, +(pinchStartScaleRef.current * ratio).toFixed(2))));
        }
        return;
      }

      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;
      if (clientX == null || clientY == null || !dragStartRef.current) return;

      const dx = clientX - dragStartRef.current.clientX;
      const dy = clientY - dragStartRef.current.clientY;

      const currentW = baseWidth * scale;
      const currentH = baseHeight * scale;
      const maxDragX = Math.max(60, (currentW - boxWidth) / 2 + 100);
      const maxDragY = Math.max(60, (currentH - boxHeight) / 2 + 100);

      const nextX = Math.max(-maxDragX, Math.min(maxDragX, dragStartRef.current.offsetX + dx));
      const nextY = Math.max(-maxDragY, Math.min(maxDragY, dragStartRef.current.offsetY + dy));

      setOffset({ x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      setDragging(false);
      dragStartRef.current = null;
      pinchStartDistRef.current = null;
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [dragging, baseWidth, baseHeight, boxWidth, boxHeight, scale]);

  // Apply crop & upload
  const handleApply = () => {
    const imgEl = imgRef.current;
    if (!imgEl) return;

    const canvas = document.createElement('canvas');
    canvas.width = outputW;
    canvas.height = outputH;
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const displayToCanvasRatio = outputW / boxWidth;

    const imgCenterX = outputW / 2 + offset.x * displayToCanvasRatio;
    const imgCenterY = outputH / 2 + offset.y * displayToCanvasRatio;

    const drawW = baseWidth * scale * displayToCanvasRatio;
    const drawH = baseHeight * scale * displayToCanvasRatio;

    ctx.save();
    ctx.translate(imgCenterX, imgCenterY);
    if (rotation) {
      ctx.rotate((rotation * Math.PI) / 180);
    }
    ctx.drawImage(imgEl, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        setUploading(true);
        try {
          const formData = new FormData();
          formData.append('file', blob, 'cropped-asset.jpg');

          const storedToken = token || localStorage.getItem('pulsechat_token');
          const headers = {};
          if (storedToken) {
            headers['Authorization'] = `Bearer ${storedToken}`;
          }

          let res = await fetch('/api/admin/upload', {
            method: 'POST',
            headers,
            credentials: 'include',
            body: formData
          });

          if (!res.ok && res.status !== 400) {
            res = await fetch('/api/users/upload', {
              method: 'POST',
              headers,
              credentials: 'include',
              body: formData
            });
          }

          const data = await res.json();
          const finalUrl = data.url || data.fileUrl || data.file?.url;

          if (data.success && finalUrl) {
            onCropComplete(finalUrl);
            onClose();
          } else {
            alert(data.message || 'Failed to upload cropped image.');
          }
        } catch (err) {
          console.error('Crop upload error:', err);
          alert('Upload failed: ' + (err.message || 'Network error'));
        } finally {
          setUploading(false);
        }
      },
      'image/jpeg',
      0.92
    );
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[94vh] overflow-y-auto rounded-3xl border border-indigo-500/40 bg-[#0B0F19] p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 scrollbar-thin scrollbar-thumb-indigo-900/50 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-bold text-white uppercase tracking-wider">{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Aspect Ratio Switcher Pills */}
        <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-950/60 rounded-xl border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 pl-1.5 flex items-center gap-1">
            <Layers className="w-3 h-3 text-indigo-400" /> Aspect Ratio
          </span>
          <div className="flex items-center gap-1">
            {[
              { id: '16:9', label: '16:9 Banner' },
              { id: '4:3', label: '4:3 Standard' },
              { id: '1:1', label: '1:1 Square' }
            ].map((ratio) => (
              <button
                key={ratio.id}
                type="button"
                onClick={() => {
                  setAspectRatio(ratio.id);
                  setOffset({ x: 0, y: 0 });
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  aspectRatio === ratio.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {ratio.label}
              </button>
            ))}
          </div>
        </div>

        {/* Crop Viewport Box */}
        <div className="flex flex-col items-center justify-center py-2">
          <div
            ref={boxRef}
            className={`relative overflow-hidden border-2 border-indigo-500/70 bg-slate-950 cursor-grab active:cursor-grabbing shadow-2xl touch-none ${rounded}`}
            style={{ width: boxWidth, height: boxHeight }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onWheel={handleWheel}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              crossOrigin="anonymous"
              draggable={false}
              style={{
                position: 'absolute',
                width: `${Math.round(baseWidth * scale)}px`,
                height: `${Math.round(baseHeight * scale)}px`,
                maxWidth: 'none',
                maxHeight: 'none',
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) rotate(${rotation}deg)`,
                userSelect: 'none',
                pointerEvents: 'none',
                transition: dragging ? 'none' : 'transform 0.05s ease-out'
              }}
            />

            {/* Rule-of-thirds grid */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white" />
              <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white" />
              <div className="absolute top-1/3 left-0 right-0 h-px bg-white" />
              <div className="absolute top-2/3 left-0 right-0 h-px bg-white" />
            </div>

            {/* Center crosshair */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
              <div className="w-5 h-px bg-white" />
              <div className="h-5 w-px bg-white absolute" />
            </div>
          </div>

          <p className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Sliders className="w-3 h-3 text-indigo-400" />
            <span>Drag image to position &bull; use slider below to zoom &amp; rotate</span>
          </p>
        </div>

        {/* Zoom Slider */}
        <div className="space-y-1.5 bg-[#0E1422] p-3 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-medium flex items-center gap-1.5">
              <ZoomIn className="w-3.5 h-3.5 text-indigo-400" /> Zoom Scale
            </span>
            <span className="font-mono text-indigo-400 font-semibold">{scale.toFixed(2)}&times;</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(1, +(s - 0.2).toFixed(2)))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="1"
              max="4"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 accent-indigo-500 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(4, +(s + 0.2).toFixed(2)))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Rotation & Reset Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Rotate 90&deg;</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOffset({ x: 0, y: 0 });
                setScale(1);
                setRotation(0);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 rounded-xl transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
          {rotation !== 0 && (
            <span className="text-[11px] text-indigo-400 font-mono">{rotation}&deg;</span>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex gap-2.5 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl transition shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
          >
            {uploading ? (
              <>
                <RefreshCw className="animate-spin w-4 h-4 text-white" />
                <span>Cropping &amp; Uploading...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Apply Crop &amp; Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
