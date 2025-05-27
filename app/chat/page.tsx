"use client";

import type React from "react";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  LogOut,
  Mic,
  MicOff,
  AlertCircle,
  Loader2,
  Video,
  Monitor,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AutoPartsLogo } from "@/components/auto-parts-logo-apple";
import { AudioWave } from "@/components/audio-wave";
import { VideoControls } from "@/components/video-controls";
import { WebSocketService } from "@/lib/websocket-service";

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isScreenShareActive, setIsScreenShareActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "failed" | "recording"
  >("disconnected");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket service
  const websocketServiceRef = useRef<WebSocketService>(new WebSocketService());
  const micStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/");
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.type !== "customer") {
      router.push("/");
      return;
    }

    setUser(parsedUser);

    // Connect WebSocket
    const websocketService = websocketServiceRef.current;
    websocketService.connect(handleWebSocketMessage);

    return () => {
      // Clean up WebSocket and media on unmount
      websocketService.disconnect();
    };
  }, [router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleWebSocketMessage = (message: any) => {
    // Handle system messages
    if (message.system) {
      if (message.status) {
        setConnectionStatus(
          message.status === "recording" ? "recording" : message.status
        );
      }
      return;
    }

    // Handle new messages
    if (message.new_message) {
      setMessages((prev) => [
        ...prev,
        {
          id: message.id,
          sender: "agent",
          content: message.data,
          timestamp: new Date().toISOString(),
        },
      ]);
    } else {
      // Update existing message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id
            ? { ...msg, content: msg.content + message.data }
            : msg
        )
      );
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const websocketService = websocketServiceRef.current;

    // Send message via WebSocket
    websocketService.sendMessage({
      mime_type: "text/plain",
      data: inputMessage,
    });

    // Add message to UI
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        sender: "customer",
        content: inputMessage,
        timestamp: new Date().toISOString(),
      },
    ]);

    setInputMessage("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
  };

  const handleLogout = () => {
    const websocketService = websocketServiceRef.current;
    websocketService.disconnect();
    localStorage.removeItem("user");
    router.push("/");
  };

  // Toggle audio recording
  const toggleRecording = async () => {
    const websocketService = websocketServiceRef.current;

    if (isRecording) {
      websocketService.stopAudio();
      setIsRecording(false);
      setConnectionStatus("connected");
      return;
    }

    try {
      await websocketService.startAudio();
      setIsRecording(true);
      setConnectionStatus("recording");
      // Store the mic stream for visualization
      if (websocketService["micStream"]) {
        micStreamRef.current = websocketService["micStream"];
      }
    } catch (error) {
      console.error("Failed to start audio:", error);
    }
  };

  // Handle video controls
  const handleStartWebcam = async (videoElement: HTMLVideoElement) => {
    const websocketService = websocketServiceRef.current;
    const success = await websocketService.startVideo(videoElement);
    setIsVideoActive(success);
    return success;
  };

  const handleStartScreenShare = async (videoElement: HTMLVideoElement) => {
    const websocketService = websocketServiceRef.current;
    const success = await websocketService.startScreenShare(videoElement);
    setIsScreenShareActive(success);
    return success;
  };

  const handleSwitchCamera = async () => {
    const websocketService = websocketServiceRef.current;
    return await websocketService.switchCamera();
  };

  const handleStopVideo = () => {
    const websocketService = websocketServiceRef.current;
    websocketService.stopVideo();
    setIsVideoActive(false);
    setIsScreenShareActive(false);
  };

  if (!user) return null;

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 apple-header">
        <div className="flex items-center space-x-3">
          <AutoPartsLogo />
          <h1 className="text-xl font-semibold text-gray-900">
            CC Auto Parts Support
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          {/* Connection status indicator */}
          <div className="flex items-center">
            {connectionStatus === "connecting" && (
              <div className="flex items-center text-amber-500 text-sm">
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                <span>Connecting...</span>
              </div>
            )}
            {connectionStatus === "recording" && (
              <div className="flex items-center text-red-500 text-sm">
                <div className="h-2 w-2 rounded-full bg-red-500 mr-1 animate-pulse"></div>
                <span>Recording Audio</span>
              </div>
            )}
            {connectionStatus === "connected" && (
              <div className="flex items-center text-green-500 text-sm">
                <div className="h-2 w-2 rounded-full bg-green-500 mr-1"></div>
                <span>Connected</span>
              </div>
            )}
            {connectionStatus === "disconnected" && (
              <div className="flex items-center text-gray-500 text-sm">
                <div className="h-2 w-2 rounded-full bg-gray-500 mr-1"></div>
                <span>Disconnected</span>
              </div>
            )}
            {connectionStatus === "failed" && (
              <div className="flex items-center text-red-500 text-sm">
                <div className="h-2 w-2 rounded-full bg-red-500 mr-1"></div>
                <span>Connection Failed</span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Logout</span>
          </Button>
        </div>
      </header>

      {/* Chat container */}
      <div className="flex flex-1 flex-col overflow-hidden p-6 bg-[#f5f5f7]">
        {/* Connection error alert */}
        {connectionStatus === "failed" && (
          <Alert
            variant="destructive"
            className="mb-4 bg-red-50 border-red-200"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>
              Could not connect to the support server.
              <Button
                variant="link"
                onClick={() =>
                  websocketServiceRef.current.connect(handleWebSocketMessage)
                }
                className="p-0 h-auto font-normal text-blue-600"
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Video display area - only show when video is active */}
        {(isVideoActive || isScreenShareActive) && (
          <div className="mb-4 apple-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                {isVideoActive ? (
                  <>
                    <Video className="h-4 w-4" />
                    Camera Active
                  </>
                ) : (
                  <>
                    <Monitor className="h-4 w-4" />
                    Screen Share Active
                  </>
                )}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStopVideo}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                Stop Video
              </Button>
            </div>
            <div
              className="relative bg-black rounded-lg overflow-hidden"
              style={{ aspectRatio: "16/9", maxHeight: "300px" }}
            >
              <VideoControls
                onStartWebcam={handleStartWebcam}
                onStartScreenShare={handleStartScreenShare}
                onSwitchCamera={handleSwitchCamera}
                onStopVideo={handleStopVideo}
                isVideoActive={isVideoActive}
                isScreenShareActive={isScreenShareActive}
              />
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto apple-card p-6 mb-4">
          {messages.length === 0 && connectionStatus !== "failed" && (
            <div className="flex h-full items-center justify-center text-gray-400">
              {connectionStatus === "connecting" ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p>Connecting to support...</p>
                </div>
              ) : (
                <p>Start a conversation with our support team</p>
              )}
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 flex ${
                message.sender === "customer" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex max-w-[80%] ${
                  message.sender === "customer"
                    ? "flex-row-reverse"
                    : "flex-row"
                }`}
              >
                <Avatar
                  className={`${
                    message.sender === "customer" ? "ml-2" : "mr-2"
                  } h-8 w-8`}
                >
                  <AvatarFallback
                    className={
                      message.sender === "customer"
                        ? "bg-blue-600"
                        : "bg-gray-300"
                    }
                  >
                    {message.sender === "customer"
                      ? user.username[0].toUpperCase()
                      : "A"}
                  </AvatarFallback>
                  {message.sender === "agent" && (
                    <AvatarImage src="/business-agent.png" />
                  )}
                </Avatar>
                <div
                  className={`p-3 ${
                    message.sender === "customer"
                      ? "apple-message-bubble-customer"
                      : "apple-message-bubble-agent"
                  }`}
                >
                  {message.content}
                  <div
                    className={`mt-1 text-xs ${
                      message.sender === "customer"
                        ? "text-blue-100"
                        : "text-gray-500"
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Audio wave visualization */}
          {isRecording && (
            <AudioWave
              isRecording={isRecording}
              micStream={micStreamRef.current}
            />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="apple-card p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            {/* Audio control */}
            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              onClick={toggleRecording}
              disabled={connectionStatus !== "connected" && !isRecording}
              className={
                isRecording
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-700"
              }
              title={isRecording ? "Stop Recording" : "Start Recording"}
            >
              {isRecording ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>

            {/* Video controls - only show when not active */}
            {!isVideoActive && !isScreenShareActive && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const videoEl = document.createElement("video");
                    handleStartWebcam(videoEl);
                  }}
                  disabled={connectionStatus !== "connected"}
                  className="bg-gray-100 text-gray-700"
                  title="Start Camera"
                >
                  <Video className="h-5 w-5" />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const videoEl = document.createElement("video");
                    handleStartScreenShare(videoEl);
                  }}
                  disabled={connectionStatus !== "connected"}
                  className="bg-gray-100 text-gray-700"
                  title="Start Screen Share"
                >
                  <Monitor className="h-5 w-5" />
                </Button>
              </>
            )}

            <Input
              value={inputMessage}
              onChange={handleInputChange}
              placeholder="Type your message..."
              disabled={
                connectionStatus !== "connected" &&
                connectionStatus !== "recording"
              }
              className="apple-input flex-1"
            />
            <Button
              type="submit"
              disabled={
                !inputMessage.trim() ||
                (connectionStatus !== "connected" &&
                  connectionStatus !== "recording")
              }
              className="apple-button"
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
