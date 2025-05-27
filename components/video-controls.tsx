"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, MonitorOff, FlipHorizontal } from "lucide-react";

interface VideoControlsProps {
  onStartWebcam: (videoElement: HTMLVideoElement) => Promise<boolean>;
  onStartScreenShare: (videoElement: HTMLVideoElement) => Promise<boolean>;
  onSwitchCamera: () => Promise<boolean>;
  onStopVideo: () => void;
  isVideoActive?: boolean;
  isScreenShareActive?: boolean;
}

export function VideoControls({
  onStartWebcam,
  onStartScreenShare,
  onSwitchCamera,
  onStopVideo,
  isVideoActive = false,
  isScreenShareActive = false,
}: VideoControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleStartWebcam = async () => {
    if (!videoRef.current) return;

    setIsLoading(true);
    try {
      await onStartWebcam(videoRef.current);
    } catch (error) {
      console.error("Failed to start webcam:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartScreenShare = async () => {
    if (!videoRef.current) return;

    setIsLoading(true);
    try {
      await onStartScreenShare(videoRef.current);
    } catch (error) {
      console.error("Failed to start screen share:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchCamera = async () => {
    setIsLoading(true);
    try {
      await onSwitchCamera();
    } catch (error) {
      console.error("Failed to switch camera:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isActive = isVideoActive || isScreenShareActive;

  return (
    <div className="relative w-full h-full">
      {/* Video element - always present but only visible when active */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${
          isActive ? "block" : "hidden"
        }`}
      />

      {/* Overlay controls when video is active */}
      {isActive && (
        <div className="absolute bottom-3 left-3 right-3 flex justify-center space-x-2">
          {isVideoActive && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSwitchCamera}
              disabled={isLoading}
              className="bg-black/50 text-white border-white/20 hover:bg-black/70"
            >
              <FlipHorizontal className="h-4 w-4 mr-1" />
              Switch
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onStopVideo}
            className="bg-red-500/80 text-white hover:bg-red-600/80"
          >
            {isVideoActive ? (
              <CameraOff className="h-4 w-4 mr-1" />
            ) : (
              <MonitorOff className="h-4 w-4 mr-1" />
            )}
            Stop
          </Button>
        </div>
      )}

      {/* Placeholder when no video */}
      {!isActive && (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
          <div className="text-center">
            <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No video active</p>
          </div>
        </div>
      )}
    </div>
  );
}
