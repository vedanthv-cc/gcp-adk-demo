"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  X,
  Mic,
  MicOff,
  Video,
  Phone,
  Wrench,
  Settings,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProductRecommendation } from "@/components/product-recommendation";
import { WebSocketService } from "@/lib/websocket-service";
import { AudioWave } from "@/components/audio-wave";

// Sample product data
const recommendedProducts = [
  {
    id: "1",
    name: "Premium Brake Pads",
    price: 49.99,
    imageUrl: "/brake-pads-close-up.png",
  },
  {
    id: "2",
    name: "Performance Oil Filter",
    price: 12.99,
    imageUrl: "/oil-filter.png",
  },
];

interface ChatWidgetProps {
  onClose: () => void;
  onToggle?: (isOpen: boolean) => void;
  isOpen?: boolean;
  width?: string;
  headerHeight?: string;
}

export function ChatWidget({
  onClose,
  onToggle,
  isOpen = true,
  width = "35%",
  headerHeight = "64px",
}: ChatWidgetProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isScreenShareActive, setIsScreenShareActive] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "failed" | "recording"
  >("disconnected");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // WebSocket service
  const websocketServiceRef = useRef<WebSocketService>(new WebSocketService());
  const micStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Connect WebSocket
    const websocketService = websocketServiceRef.current;
    websocketService.connect(handleWebSocketMessage);

    return () => {
      // Clean up WebSocket and media on unmount
      websocketService.disconnect();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (onToggle) {
      onToggle(isOpen && !isChatMinimized);
    }
  }, [isOpen, isChatMinimized, onToggle]);

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

  const handleMinimize = () => {
    setIsChatMinimized(true);
    if (onToggle) {
      onToggle(false);
    }
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
  const handleStartWebcam = async () => {
    if (!videoRef.current) return false;

    const websocketService = websocketServiceRef.current;
    const success = await websocketService.startVideo(videoRef.current);
    setIsVideoActive(success);
    return success;
  };

  const handleStartScreenShare = async () => {
    if (!videoRef.current) return false;

    const websocketService = websocketServiceRef.current;
    const success = await websocketService.startScreenShare(videoRef.current);
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

  const handleProductSelect = (product: any) => {
    // Add message about selected product
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        sender: "customer",
        content: `I'm interested in the ${product.name}`,
        timestamp: new Date().toISOString(),
      },
    ]);

    // Send via WebSocket
    const websocketService = websocketServiceRef.current;
    websocketService.sendMessage({
      mime_type: "text/plain",
      data: `I'm interested in the ${product.name}`,
    });
  };

  if (isChatMinimized) {
    return null; // We'll use the button from the main page instead
  }

  return (
    <div
      className="fixed top-0 right-0 bottom-0 flex flex-col bg-[#1e2124] rounded-tl-3xl rounded-bl-3xl shadow-xl z-50 overflow-hidden chat-container"
      style={{
        width,
        marginTop: headerHeight,
        height: `calc(100vh - ${headerHeight})`,
      }}
    >
      {/* Header with metallic gradient */}
      <div className="flex items-center justify-between p-4 border-b border-[#3a3c3e] bg-gradient-to-r from-[#2a2d30] to-[#23262a]">
        <div className="flex items-center">
          <div className="bg-[#e63946] rounded-full p-1 mr-2 shadow-inner">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-[#1e2124] text-white">
                <Wrench className="h-4 w-4" />
              </AvatarFallback>
              <AvatarImage src="/business-agent.png" />
            </Avatar>
          </div>
          <div>
            <h2 className="text-white font-medium flex items-center">
              <span>Auto Parts Support</span>
              <Settings className="h-4 w-4 ml-2 text-[#e63946]" />
            </h2>
            <div className="text-xs text-gray-400">
              {connectionStatus === "connected" && <span>Connected</span>}
              {connectionStatus === "connecting" && <span>Connecting...</span>}
              {connectionStatus === "disconnected" && <span>Disconnected</span>}
              {connectionStatus === "failed" && <span>Connection failed</span>}
              {connectionStatus === "recording" && (
                <span className="text-[#e63946]">Recording audio</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleMinimize}
            className="text-gray-400 hover:text-white"
          >
            <span className="block w-4 h-0.5 bg-current"></span>
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Chat content with subtle texture */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#1e2124] bg-opacity-95 chat-bg-pattern">
        {/* Product recommendations */}
        {recommendedProducts.length > 0 && (
          <div className="mb-4">
            <h3 className="text-[#e63946] text-center mb-3 font-medium">
              Recommended Parts
            </h3>
            <div className="space-y-2">
              {recommendedProducts.map((product) => (
                <ProductRecommendation
                  key={product.id}
                  product={product}
                  onSelect={handleProductSelect}
                />
              ))}
            </div>
          </div>
        )}

        {/* Video display */}
        {(isVideoActive || isScreenShareActive) && (
          <div className="mb-4 relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-lg shadow-md"
            />
            <div className="absolute top-2 right-2 flex space-x-2">
              {isVideoActive && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleSwitchCamera}
                  className="bg-[#1e2124]/70 text-white hover:bg-[#1e2124]/90 rounded-full h-8 w-8"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleStopVideo}
                className="bg-[#e63946]/70 text-white hover:bg-[#e63946]/90 rounded-full h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "customer" ? "justify-end" : "justify-start"
              }`}
            >
              {message.sender === "agent" && (
                <Avatar className="h-8 w-8 mr-2 flex-shrink-0 border-2 border-[#e63946]">
                  <AvatarFallback className="bg-[#2a2d30] text-white">
                    <Wrench className="h-4 w-4" />
                  </AvatarFallback>
                  <AvatarImage src="/business-agent.png" />
                </Avatar>
              )}
              <div
                className={`p-3 rounded-xl max-w-[80%] ${
                  message.sender === "customer"
                    ? "bg-gradient-to-r from-[#e63946] to-[#d62b39] text-white shadow-md"
                    : "bg-gradient-to-r from-[#2a2d30] to-[#23262a] text-white border border-[#3a3c3e] shadow-md"
                }`}
              >
                {message.content}
                <div
                  className={`mt-1 text-xs ${
                    message.sender === "customer"
                      ? "text-gray-200"
                      : "text-gray-400"
                  }`}
                >
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              {message.sender === "customer" && (
                <Avatar className="h-8 w-8 ml-2 flex-shrink-0 border-2 border-[#e63946]">
                  <AvatarFallback className="bg-[#e63946] text-white">
                    U
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {/* Audio wave visualization */}
          {isRecording && (
            <div className="flex justify-center">
              <AudioWave
                isRecording={isRecording}
                micStream={micStreamRef.current}
              />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Vehicle selector section */}
      <div className="p-3 border-t border-[#3a3c3e] bg-[#23262a]">
        <div className="flex items-center justify-between">
          <span className="text-white text-sm font-medium">
            Find parts for your vehicle:
          </span>
          <Button
            size="sm"
            className="bg-[#e63946] hover:bg-[#d62b39] text-white text-xs py-1 h-7"
          >
            Select Vehicle
          </Button>
        </div>
      </div>

      {/* Input area with metallic look */}
      <div className="p-4 border-t border-[#3a3c3e] bg-gradient-to-r from-[#2a2d30] to-[#23262a]">
        <form onSubmit={handleSendMessage} className="flex items-center">
          <Input
            value={inputMessage}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1 bg-[#16181a] border-[#3a3c3e] text-white placeholder-gray-400 focus:ring-[#e63946] focus:border-[#e63946]"
          />
          <div className="flex space-x-2 ml-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleRecording}
              className={`${
                isRecording
                  ? "bg-[#e63946] text-white hover:bg-[#d62b39]"
                  : "text-gray-400 hover:text-white hover:bg-[#16181a]"
              } rounded-full`}
            >
              {isRecording ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={isVideoActive ? handleStopVideo : handleStartWebcam}
              className={`${
                isVideoActive
                  ? "bg-[#e63946] text-white hover:bg-[#d62b39]"
                  : "text-gray-400 hover:text-white hover:bg-[#16181a]"
              } rounded-full`}
            >
              <Video className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={
                isScreenShareActive ? handleStopVideo : handleStartScreenShare
              }
              className={`${
                isScreenShareActive
                  ? "bg-[#e63946] text-white hover:bg-[#d62b39]"
                  : "text-gray-400 hover:text-white hover:bg-[#16181a]"
              } rounded-full`}
            >
              <Phone className="h-5 w-5" />
            </Button>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="bg-[#e63946] text-white hover:bg-[#d62b39] rounded-full"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
