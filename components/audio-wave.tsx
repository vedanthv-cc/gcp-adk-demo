"use client";

import { useEffect, useRef } from "react";

interface AudioWaveProps {
  isRecording: boolean;
  micStream?: MediaStream | null;
}

export function AudioWave({ isRecording, micStream }: AudioWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Initialize and cleanup audio analyzer
  useEffect(() => {
    if (!isRecording || !micStream) {
      // Cleanup when not recording
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }

      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }

      return;
    }

    // Setup audio analyzer
    if (!audioContextRef.current) {
      try {
        // Create a new AudioContext
        audioContextRef.current = new AudioContext();

        // Create an analyzer node
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;

        // Create a media stream source from the microphone stream
        // This is the key part that fixes the type error - we're explicitly using the micStream parameter
        // which is properly typed as MediaStream | null | undefined
        sourceRef.current =
          audioContextRef.current.createMediaStreamSource(micStream);

        // Connect the source to the analyzer
        sourceRef.current.connect(analyserRef.current);

        // Start the visualization
        startVisualization();
      } catch (error) {
        console.error("Error initializing audio analyzer:", error);
      }
    }

    return () => {
      // Cleanup on unmount
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, [isRecording, micStream]);

  const startVisualization = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      // Request next frame
      animationRef.current = requestAnimationFrame(draw);

      // Get frequency data
      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Set background
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate bar width
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      // Draw bars
      for (let i = 0; i < bufferLength; i++) {
        // Make the visualization more dynamic by using a non-linear scale
        const barHeight = Math.pow(dataArray[i] / 255, 1.5) * canvas.height;

        // Create a more interesting gradient
        const gradient = ctx.createLinearGradient(
          0,
          canvas.height - barHeight,
          0,
          canvas.height
        );
        gradient.addColorStop(0, "#0071e3"); // Blue at top
        gradient.addColorStop(0.6, "#60a5fa"); // Light blue in middle
        gradient.addColorStop(1, "rgba(96, 165, 250, 0.5)"); // Transparent at bottom

        ctx.fillStyle = gradient;

        // Draw rounded bars
        const barX = x + barWidth * 0.1;
        const barW = barWidth * 0.8;

        // Draw rounded rectangle
        ctx.beginPath();
        ctx.moveTo(barX + barW / 2, canvas.height);
        ctx.lineTo(barX + barW / 2, canvas.height - barHeight);
        ctx.arc(
          barX + barW / 2,
          canvas.height - barHeight,
          barW / 2,
          Math.PI,
          0,
          true
        );
        ctx.lineTo(barX + barW, canvas.height);
        ctx.fill();

        x += barWidth;
      }

      // Add a reflection effect
      ctx.globalAlpha = 0.2;
      ctx.scale(1, -0.2);
      ctx.drawImage(canvas, 0, -canvas.height * 5);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1.0;
    };

    draw();
  };

  if (!isRecording) {
    return null;
  }

  return (
    <div className="w-full h-20 mb-4 rounded-lg overflow-hidden bg-gray-50 shadow-inner">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        width={500}
        height={100}
      ></canvas>
    </div>
  );
}
