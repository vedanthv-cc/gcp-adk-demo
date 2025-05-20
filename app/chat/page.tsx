"use client";

import type React from "react";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, LogOut, Mic, MicOff, AlertCircle, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AutoPartsLogo } from "@/components/auto-parts-logo-apple";

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "failed" | "recording"
  >("disconnected");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket and audio refs
  const websocketRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string>(
    Math.random().toString().substring(2, 10)
  );
  const currentMessageIdRef = useRef<string | null>(null);
  const isAudioRef = useRef<boolean>(false);

  // Audio components
  const audioPlayerNodeRef = useRef<any>(null);
  const audioPlayerContextRef = useRef<any>(null);
  const audioRecorderNodeRef = useRef<any>(null);
  const audioRecorderContextRef = useRef<any>(null);
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
    connectWebsocket();

    return () => {
      // Clean up WebSocket and audio on unmount
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      stopAudio();
    };
  }, [router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Connect to WebSocket
  const connectWebsocket = () => {
    setConnectionStatus("connecting");

    // Create WebSocket URL with the format ws://localhost:8000/ws/12345?is_audio=false
    const wsUrl = `ws://localhost:8000/ws/${sessionIdRef.current}?is_audio=${isAudioRef.current}`;

    // Connect websocket
    const ws = new WebSocket(wsUrl);
    websocketRef.current = ws;

    // Handle connection open
    ws.onopen = () => {
      console.log(
        "WebSocket connection opened with is_audio=" + isAudioRef.current
      );
      setConnectionStatus(isAudioRef.current ? "recording" : "connected");
    };

    // Handle incoming messages
    ws.onmessage = (event) => {
      try {
        // Parse the incoming message
        const messageFromServer = JSON.parse(event.data);
        console.log("[AGENT TO CLIENT] ", messageFromServer);

        // Check if the turn is complete
        if (
          messageFromServer.turn_complete &&
          messageFromServer.turn_complete === true
        ) {
          currentMessageIdRef.current = null;
          return;
        }

        // If it's audio, play it
        if (
          messageFromServer.mime_type === "audio/pcm" &&
          audioPlayerNodeRef.current
        ) {
          audioPlayerNodeRef.current.port.postMessage(
            base64ToArray(messageFromServer.data)
          );
        }

        // If it's text, display it
        if (messageFromServer.mime_type === "text/plain") {
          // For a new message, generate a new ID
          if (currentMessageIdRef.current === null) {
            currentMessageIdRef.current = Math.random()
              .toString(36)
              .substring(7);

            // Create a new message
            setMessages((prev) => [
              ...prev,
              {
                id: currentMessageIdRef.current,
                sender: "agent",
                content: messageFromServer.data,
                timestamp: new Date().toISOString(),
              },
            ]);
          } else {
            // For continuing messages, update the existing message
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === currentMessageIdRef.current
                  ? { ...msg, content: msg.content + messageFromServer.data }
                  : msg
              )
            );
          }
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };

    // Handle connection close
    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setConnectionStatus("disconnected");

      // Automatically reconnect after a delay
      setTimeout(() => {
        console.log("Reconnecting...");
        connectWebsocket();
      }, 5000);
    };

    // Handle connection errors
    ws.onerror = (e) => {
      console.log("WebSocket error: ", e);
      setConnectionStatus("failed");
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !inputMessage.trim() ||
      !websocketRef.current ||
      websocketRef.current.readyState !== WebSocket.OPEN
    )
      return;

    // Send message via WebSocket
    sendMessage({
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
    if (websocketRef.current) {
      websocketRef.current.close();
    }
    stopAudio();
    localStorage.removeItem("user");
    router.push("/");
  };

  // Send a message to the server as a JSON string
  const sendMessage = (message: any) => {
    if (
      websocketRef.current &&
      websocketRef.current.readyState === WebSocket.OPEN
    ) {
      const messageJson = JSON.stringify(message);
      websocketRef.current.send(messageJson);
      console.log("[CLIENT TO AGENT]", message);
    }
  };

  // Toggle audio recording
  const toggleRecording = async () => {
    if (isRecording) {
      stopAudio();
      return;
    }

    try {
      await startAudio();
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start audio:", error);
    }
  };

  // Start audio recording and playback
  const startAudio = async () => {
    try {
      // Start audio output
      const audioPlayerModule = await import("../../public/audio-player.js");
      const [playerNode, playerCtx] =
        await audioPlayerModule.startAudioPlayerWorklet();
      audioPlayerNodeRef.current = playerNode;
      audioPlayerContextRef.current = playerCtx;

      // Start audio input
      const audioRecorderModule = await import(
        "../../public/audio-recorder.js"
      );
      const [recorderNode, recorderCtx, stream] =
        await audioRecorderModule.startAudioRecorderWorklet(
          audioRecorderHandler
        );
      audioRecorderNodeRef.current = recorderNode;
      audioRecorderContextRef.current = recorderCtx;
      micStreamRef.current = stream;

      // Set is_audio to true and reconnect
      isAudioRef.current = true;

      // Close existing WebSocket
      if (websocketRef.current) {
        websocketRef.current.close();
      }

      // Connect with audio mode
      connectWebsocket();

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

    // Set is_audio to false and reconnect
    isAudioRef.current = false;

    // Only reconnect if we're currently recording
    if (isRecording) {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      connectWebsocket();
      setIsRecording(false);
    }
  };

  // Audio recorder handler
  const audioRecorderHandler = (pcmData: ArrayBuffer) => {
    // Send the pcm data as base64
    sendMessage({
      mime_type: "audio/pcm",
      data: arrayBufferToBase64(pcmData),
    });
    console.log("[CLIENT TO AGENT] sent %s bytes", pcmData.byteLength);
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
                onClick={connectWebsocket}
                className="p-0 h-auto font-normal text-blue-600"
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
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

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="apple-card p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
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
            >
              {isRecording ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>

            <Input
              value={inputMessage}
              onChange={handleInputChange}
              placeholder="Type your message..."
              disabled={
                connectionStatus !== "connected" &&
                connectionStatus !== "recording"
              }
              className="apple-input"
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
