"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";

interface AudioChatButtonProps {
  sessionId: string;
  onStatusChange?: (
    status: "connecting" | "connected" | "disconnected" | "recording"
  ) => void;
}

export function AudioChatButton({
  sessionId,
  onStatusChange,
}: AudioChatButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const audioInitializedRef = useRef(false);
  const websocketRef = useRef<WebSocket | null>(null);
  const audioPlayerNodeRef = useRef<any>(null);
  const audioRecorderNodeRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Initialize the audio components when the button is clicked
  const handleAudioButtonClick = async () => {
    if (isRecording) {
      stopAudio();
      return;
    }

    try {
      await startAudio();
      setIsRecording(true);
      if (onStatusChange) onStatusChange("recording");
    } catch (error) {
      console.error("Failed to start audio:", error);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  // Start audio recording and playback
  const startAudio = async () => {
    try {
      // Only initialize audio once
      if (!audioInitializedRef.current) {
        // Start audio output
        const audioPlayerModule = await import("../public/audio-player.js");
        const [playerNode, playerCtx] =
          await audioPlayerModule.startAudioPlayerWorklet();
        audioPlayerNodeRef.current = playerNode;

        // Start audio input
        const audioRecorderModule = await import("../public/audio-recorder.js");
        const [recorderNode, recorderCtx, stream] =
          await audioRecorderModule.startAudioRecorderWorklet(
            audioRecorderHandler
          );
        audioRecorderNodeRef.current = recorderNode;
        micStreamRef.current = stream;

        audioInitializedRef.current = true;
      }

      // Close existing WebSocket if any
      if (websocketRef.current) {
        websocketRef.current.close();
      }

      // Connect WebSocket with audio mode enabled
      connectWebSocket(true);

      return true;
    } catch (error) {
      console.error("Error starting audio:", error);
      throw error;
    }
  };

  // Stop audio recording
  const stopAudio = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    // Reconnect WebSocket without audio
    connectWebSocket(false);

    setIsRecording(false);
    if (onStatusChange)
      onStatusChange(isConnected ? "connected" : "disconnected");
  };

  // Connect to WebSocket
  const connectWebSocket = (isAudio: boolean) => {
    // Create WebSocket URL with the format ws://localhost:8000/ws/12345?is_audio=true
    const wsUrl = `ws://localhost:8000/ws/${sessionId}?is_audio=${isAudio}`;

    // Connect websocket
    const ws = new WebSocket(wsUrl);
    websocketRef.current = ws;

    // Handle connection open
    ws.onopen = () => {
      console.log("WebSocket connection opened with is_audio=" + isAudio);
      setIsConnected(true);
      if (onStatusChange) onStatusChange(isAudio ? "recording" : "connected");
    };

    // Handle incoming messages
    ws.onmessage = (event) => {
      try {
        // Parse the incoming message
        const messageFromServer = JSON.parse(event.data);
        console.log("[AGENT TO CLIENT] ", messageFromServer);

        // If it's audio, play it
        if (
          messageFromServer.mime_type === "audio/pcm" &&
          audioPlayerNodeRef.current
        ) {
          audioPlayerNodeRef.current.port.postMessage(
            base64ToArray(messageFromServer.data)
          );
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };

    // Handle connection close
    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setIsConnected(false);
      if (onStatusChange) onStatusChange("disconnected");

      // Automatically reconnect after a delay if not intentionally stopped
      if (isAudio && isRecording) {
        setTimeout(() => {
          if (isRecording) {
            connectWebSocket(true);
          }
        }, 3000);
      }
    };

    // Handle connection errors
    ws.onerror = (e) => {
      console.log("WebSocket error: ", e);
      if (onStatusChange) onStatusChange("disconnected");
    };
  };

  // Audio recorder handler
  const audioRecorderHandler = (pcmData: ArrayBuffer) => {
    if (
      websocketRef.current &&
      websocketRef.current.readyState === WebSocket.OPEN
    ) {
      // Send the pcm data as base64
      const message = {
        mime_type: "audio/pcm",
        data: arrayBufferToBase64(pcmData),
      };
      websocketRef.current.send(JSON.stringify(message));
      console.log("[CLIENT TO AGENT] sent %s bytes", pcmData.byteLength);
    }
  };

  // Encode an array buffer with Base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Decode Base64 data to Array
  const base64ToArray = (base64: string): ArrayBuffer => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  return (
    <Button
      type="button"
      variant={isRecording ? "destructive" : "outline"}
      size="icon"
      onClick={handleAudioButtonClick}
      className={
        isRecording ? "bg-red-500 text-white" : "bg-gray-100 text-gray-700"
      }
    >
      {isRecording ? (
        <MicOff className="h-5 w-5" />
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </Button>
  );
}
