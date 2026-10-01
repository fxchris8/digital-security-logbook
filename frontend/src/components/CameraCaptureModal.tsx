"use client";

import * as React from "react";
import { Camera, Check, RefreshCw, SwitchCamera, VideoOff, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CameraCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
  title?: string;
}

export function CameraCaptureModal({
  open,
  onOpenChange,
  onCapture,
  title = "Ambil Foto Kamera",
}: CameraCaptureModalProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = React.useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = React.useState<Blob | null>(null);
  const [facingMode, setFacingMode] = React.useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [isStarting, setIsStarting] = React.useState<boolean>(false);

  const stopStream = React.useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = React.useCallback(async (facing: "user" | "environment") => {
    setCameraError(null);
    setIsStarting(true);
    setCapturedDataUrl(null);
    setCapturedBlob(null);

    // Stop existing stream first
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser Anda tidak mendukung akses kamera.");
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal mengunduh atau membuka kamera. Pastikan izin kamera telah diberikan.";
      setCameraError(msg);
    } finally {
      setIsStarting(false);
    }
  }, [stream]);

  React.useEffect(() => {
    if (open) {
      startCamera(facingMode);
    } else {
      stopStream();
      setCapturedDataUrl(null);
      setCapturedBlob(null);
      setCameraError(null);
    }
    // eslint-disable-next-deps
  }, [open, facingMode]);

  // Handle closing modal cleanly
  const handleClose = () => {
    stopStream();
    onOpenChange(false);
  };

  const handleToggleFacingMode = () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
  };

  const handleSnap = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvasRef.current = canvas;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Flip horizontally if front camera (user facing)
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setCapturedDataUrl(dataUrl);
      }
    }, "image/jpeg", 0.9);
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
    setCapturedBlob(null);
  };

  const handleConfirm = () => {
    if (!capturedBlob) return;

    const filename = `camera-photo-${Date.now()}.jpg`;
    const file = new File([capturedBlob], filename, { type: "image/jpeg" });

    stopStream();
    onCapture(file);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-slate-900 border-slate-800 text-white">
        <DialogHeader className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
            <Camera className="h-5 w-5 text-emerald-400" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="relative aspect-[4/3] w-full bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-slate-300 flex flex-col items-center gap-3">
              <div className="p-3 bg-red-500/20 text-red-400 rounded-full">
                <VideoOff className="h-8 w-8" />
              </div>
              <div className="font-semibold text-white">Kamera Tidak Tersedia</div>
              <div className="text-xs text-slate-400 max-w-xs">{cameraError}</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => startCamera(facingMode)}
                className="mt-2 text-xs border-slate-700 text-slate-200 hover:bg-slate-800"
              >
                Coba Lagi
              </Button>
            </div>
          ) : capturedDataUrl ? (
            /* Captured Photo Preview */
            <img
              src={capturedDataUrl}
              alt="Hasil foto kamera"
              className="w-full h-full object-cover"
            />
          ) : (
            /* Live Camera Stream Viewfinder */
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === "user" ? "-scale-x-100" : ""
                }`}
              />
              {/* Overlay Face/Document Guide */}
              <div className="pointer-events-none absolute inset-0 border-2 border-white/30 rounded-2xl m-6 flex items-center justify-center">
                <div className="text-[11px] text-white/70 bg-black/50 px-3 py-1 rounded-full backdrop-blur-xs">
                  Posisikan wajah / tanda pengenal di area kamera
                </div>
              </div>
            </>
          )}

          {/* Loading Indicator */}
          {isStarting && !cameraError && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 flex items-center justify-between gap-3">
          {!capturedDataUrl ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleToggleFacingMode}
                disabled={!stream || isStarting}
                className="text-slate-300 hover:text-white hover:bg-slate-800"
                title="Putar Kamera"
              >
                <SwitchCamera className="h-5 w-5" />
              </Button>

              <Button
                type="button"
                onClick={handleSnap}
                disabled={!stream || isStarting || !!cameraError}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-2 rounded-full flex items-center gap-2 shadow-lg shadow-emerald-900/30"
              >
                <Camera className="h-4 w-4" />
                Ambil Foto
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Batal
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetake}
                className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 flex items-center gap-2 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Ambil Ulang
              </Button>

              <Button
                type="button"
                onClick={handleConfirm}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 text-xs flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Gunakan Foto Ini
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
