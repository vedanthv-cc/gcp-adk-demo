export class WebSocketService {
  private websocket: WebSocket | null = null;
  private sessionId: string;
  private isAudio = false;
  private isVideo = false;
  private currentMessageId: string | null = null;
  private messageHandler: ((message: any) => void) | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connectionStatus:
    | "connecting"
    | "connected"
    | "disconnected"
    | "failed" = "disconnected";
  private customerId: string | null = null;

  // Audio components
  private audioPlayerNode: any = null;
  private audioPlayerContext: any = null;
  private audioRecorderNode: any = null;
  private audioRecorderContext: any = null;
  private micStream: MediaStream | null = null;

  // Video components
  private videoStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private videoInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = Math.random().toString().substring(2, 10);
  }

  setCustomerId(id: string) {
    this.customerId = id;
  }

  connect(messageHandler: (message: any) => void) {
    this.messageHandler = messageHandler;
    this.connectionStatus = "connecting";

    // Notify about connection attempt
    try {
      messageHandler({
        mime_type: "text/plain",
        data: "Connecting to support...",
        system: true,
      });
    } catch (error) {
      console.error("Error in message handler:", error);
    }

    try {
      // Create WebSocket URL with the format ws://localhost:8000/ws/12345?is_audio=false&customer_id=xyz
      const wsUrl = `ws://localhost:8000/ws/${this.sessionId}?is_audio=${
        this.isAudio
      }${this.customerId ? `&customer_id=${this.customerId}` : ""}`;

      // Connect websocket
      this.websocket = new WebSocket(wsUrl);

      // Handle connection open
      this.websocket.onopen = () => {
        console.log("WebSocket connection opened.");
        this.connectionStatus = "connected";
        this.reconnectAttempts = 0;

        try {
          messageHandler({
            mime_type: "text/plain",
            data: "Connected to support",
            system: true,
            status: "connected",
          });
        } catch (error) {
          console.error("Error in message handler:", error);
        }
      };

      // Handle incoming messages
      this.websocket.onmessage = (event) => {
        try {
          // Parse the incoming message
          const messageFromServer = JSON.parse(event.data);
          console.log("[AGENT TO CLIENT] ", messageFromServer);

          // Check if the turn is complete
          if (
            messageFromServer.turn_complete &&
            messageFromServer.turn_complete === true
          ) {
            this.currentMessageId = null;
            return;
          }

          // If it's audio, play it
          if (
            messageFromServer.mime_type === "audio/pcm" &&
            this.audioPlayerNode
          ) {
            this.audioPlayerNode.port.postMessage(
              this.base64ToArray(messageFromServer.data)
            );
          }

          // If it's text, send it to the handler
          if (messageFromServer.mime_type === "text/plain") {
            // For a new message, generate a new ID
            if (this.currentMessageId === null) {
              this.currentMessageId = Math.random().toString(36).substring(7);
              try {
                messageHandler({
                  id: this.currentMessageId,
                  mime_type: "text/plain",
                  data: messageFromServer.data,
                  new_message: true,
                });
              } catch (error) {
                console.error("Error in message handler:", error);
              }
            } else {
              // For continuing messages, use the same ID
              try {
                messageHandler({
                  id: this.currentMessageId,
                  mime_type: "text/plain",
                  data: messageFromServer.data,
                  new_message: false,
                });
              } catch (error) {
                console.error("Error in message handler:", error);
              }
            }
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      };

      // Handle connection close
      this.websocket.onclose = (event) => {
        console.log("WebSocket connection closed.", event);
        this.connectionStatus = "disconnected";

        // Only attempt to reconnect if it wasn't a normal closure
        if (event.code !== 1000) {
          this.attemptReconnect(messageHandler);
        } else {
          try {
            messageHandler({
              mime_type: "text/plain",
              data: "Connection closed",
              system: true,
              status: "disconnected",
            });
          } catch (error) {
            console.error("Error in message handler:", error);
          }
        }
      };

      // Handle connection errors
      this.websocket.onerror = (e) => {
        console.log("WebSocket error: ", e);
        this.connectionStatus = "failed";

        try {
          messageHandler({
            mime_type: "text/plain",
            data: "Connection error. Please try again later.",
            system: true,
            status: "failed",
          });
        } catch (error) {
          console.error("Error in message handler:", error);
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      this.connectionStatus = "failed";

      // Simulate WebSocket for development/demo purposes
      this.simulateWebSocket(messageHandler);
    }
  }

  private attemptReconnect(messageHandler: (message: any) => void) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      messageHandler({
        mime_type: "text/plain",
        data: "Unable to connect after several attempts. Please refresh the page to try again.",
        system: true,
        status: "failed",
      });
      return;
    }

    this.reconnectAttempts++;

    messageHandler({
      mime_type: "text/plain",
      data: `Connection lost. Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
      system: true,
      status: "reconnecting",
    });

    // Clear any existing timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Try to reconnect after a delay (with exponential backoff)
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );
    this.reconnectTimeout = setTimeout(() => {
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
      this.connect(messageHandler);
    }, delay);
  }

  // Simulate WebSocket for development/demo purposes
  private simulateWebSocket(messageHandler: (message: any) => void) {
    console.log("Using simulated WebSocket for development");

    // Simulate connection success after a short delay
    setTimeout(() => {
      try {
        messageHandler({
          mime_type: "text/plain",
          data: "Connected to support (simulated)",
          system: true,
          status: "connected",
        });
      } catch (error) {
        console.error("Error in message handler:", error);
      }

      // If we have a customer ID, simulate receiving their messages
      if (this.customerId) {
        // Check for existing messages in localStorage
        const chatHistory = localStorage.getItem(`chat_${this.customerId}`);
        if (chatHistory) {
          try {
            const messages = JSON.parse(chatHistory);
            // Find the last customer message
            const lastCustomerMessage = [...messages]
              .reverse()
              .find((m) => m.sender === "customer");

            if (lastCustomerMessage) {
              // Simulate receiving this message
              setTimeout(() => {
                try {
                  messageHandler({
                    id: lastCustomerMessage.id,
                    mime_type: "text/plain",
                    data: lastCustomerMessage.content,
                    new_message: true,
                  });
                } catch (error) {
                  console.error("Error in message handler:", error);
                }
              }, 1000);
            }
          } catch (e) {
            console.error("Error parsing chat history:", e);
          }
        }
      } else {
        // Send welcome message if no customer ID
        setTimeout(() => {
          const welcomeId = Math.random().toString(36).substring(7);
          try {
            messageHandler({
              id: welcomeId,
              mime_type: "text/plain",
              data: "Welcome to CC Auto Parts support! How can I help you today?",
              new_message: true,
            });
          } catch (error) {
            console.error("Error in message handler:", error);
          }
        }, 1000);
      }
    }, 1500);

    // Create a fake WebSocket object for the rest of the code to use
    this.websocket = {
      send: (data: string) => {
        console.log("Simulated WebSocket message sent:", data);

        // Simulate response after a delay
        setTimeout(() => {
          if (messageHandler) {
            try {
              const parsedData = JSON.parse(data);
              if (parsedData.mime_type === "text/plain") {
                // Simulate agent response
                const responses = [
                  "I'll check our inventory for that part right away.",
                  "Could you provide more details about your vehicle?",
                  "We have that part in stock. Would you like to place an order?",
                  "Let me find the right specifications for your vehicle model.",
                  "I'm checking our database for compatible parts for your car.",
                ];
                const randomResponse =
                  responses[Math.floor(Math.random() * responses.length)];
                const responseId = Math.random().toString(36).substring(7);

                messageHandler({
                  id: responseId,
                  mime_type: "text/plain",
                  data: randomResponse,
                  new_message: true,
                });
              } else if (parsedData.mime_type === "image/jpeg") {
                // Simulate response to image
                const responseId = Math.random().toString(36).substring(7);
                messageHandler({
                  id: responseId,
                  mime_type: "text/plain",
                  data: "I can see your image. It looks like a car part. Let me analyze it for you.",
                  new_message: true,
                });
              }
            } catch (error) {
              console.error("Error processing simulated message:", error);
            }
          }
        }, 1000);
      },
      close: () => {
        console.log("Simulated WebSocket connection closed");
      },
      readyState: WebSocket.OPEN,
    } as unknown as WebSocket;

    this.connectionStatus = "connected";
  }

  getConnectionStatus() {
    return this.connectionStatus;
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.stopAudio();
    this.stopVideo();
    this.connectionStatus = "disconnected";
  }

  sendMessage(message: any) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      const messageJson = JSON.stringify(message);
      this.websocket.send(messageJson);
      return true;
    } else if (this.connectionStatus === "failed" && this.websocket) {
      // If we're using the simulated WebSocket
      const messageJson = JSON.stringify(message);
      this.websocket.send(messageJson);
      return true;
    } else {
      console.warn("Cannot send message: WebSocket is not connected");
      if (this.messageHandler) {
        this.messageHandler({
          mime_type: "text/plain",
          data: "Cannot send message: Not connected to support",
          system: true,
          status: "error",
        });
      }
      return false;
    }
  }

  // Update the startAudio method to fix the type error
  async startAudio() {
    try {
      // Dynamically import the audio modules
      const { startAudioPlayerWorklet } = await import(
        "../public/audio-player.js"
      );
      const { startAudioRecorderWorklet } = await import(
        "../public/audio-recorder.js"
      );

      // Start audio output
      const result = await startAudioPlayerWorklet();
      this.audioPlayerNode = result[0];
      this.audioPlayerContext = result[1];

      // Start audio input with proper typing
      const recorderResult = await startAudioRecorderWorklet(
        this.audioRecorderHandler.bind(this)
      );
      this.audioRecorderNode = recorderResult[0];
      this.audioRecorderContext = recorderResult[1];
      // Explicitly cast the stream to MediaStream to fix the type error
      this.micStream = recorderResult[2] as MediaStream;

      // Set is_audio to true
      this.isAudio = true;

      // Disconnect existing WebSocket
      if (this.websocket) {
        this.websocket.close();
        this.websocket = null;
      }

      // Reconnect with audio mode enabled - exactly like the reference code
      if (this.messageHandler) {
        this.connect(this.messageHandler);
      }

      return true;
    } catch (error) {
      console.error("Error starting audio:", error);
      if (this.messageHandler) {
        this.messageHandler({
          mime_type: "text/plain",
          data: "Could not access microphone. Please check your permissions.",
          system: true,
          status: "error",
        });
      }
      throw error;
    }
  }

  stopAudio() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    this.isAudio = false;
  }

  // Start video streaming - following the reference implementation
  async startVideo(videoElement: HTMLVideoElement) {
    try {
      if (this.isVideo) return true;

      // Get user media for video
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      });
      this.videoElement = videoElement;
      this.videoElement.srcObject = this.videoStream;

      // Ensure video plays
      await this.videoElement.play();

      // Create canvas for frame capture
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d");

      // Set video flag
      this.isVideo = true;

      // Start capturing and sending frames at 1fps (like the reference)
      this.videoInterval = setInterval(() => {
        this.captureAndSendFrame();
      }, 1000);

      console.log("Video started");
      return true;
    } catch (error) {
      console.error("Error starting video:", error);
      if (this.messageHandler) {
        this.messageHandler({
          mime_type: "text/plain",
          data: "Could not access camera. Please check your permissions.",
          system: true,
          status: "error",
        });
      }
      throw error;
    }
  }

  // Start screen sharing
  async startScreenShare(videoElement: HTMLVideoElement) {
    try {
      if (this.isVideo) return true;

      // Get display media for screen sharing
      this.videoStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 15 },
        },
      });
      this.videoElement = videoElement;
      this.videoElement.srcObject = this.videoStream;

      // Ensure video plays
      await this.videoElement.play();

      // Create canvas for frame capture
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d");

      // Set video flag
      this.isVideo = true;

      // Handle when user stops sharing via browser controls
      this.videoStream.getVideoTracks()[0].addEventListener("ended", () => {
        this.stopVideo();
      });

      // Start capturing and sending frames at 1fps
      this.videoInterval = setInterval(() => {
        this.captureAndSendFrame();
      }, 1000);

      console.log("Screen sharing started");
      return true;
    } catch (error) {
      console.error("Error starting screen share:", error);
      if (this.messageHandler) {
        this.messageHandler({
          mime_type: "text/plain",
          data: "Could not share screen. Please try again.",
          system: true,
          status: "error",
        });
      }
      throw error;
    }
  }

  // Switch camera (front/back) - simplified version
  async switchCamera() {
    try {
      if (!this.isVideo || !this.videoElement) return false;

      // Stop current video
      if (this.videoStream) {
        this.videoStream.getTracks().forEach((track) => track.stop());
      }

      // Try to get the opposite camera
      const currentFacingMode = this.videoStream
        ?.getVideoTracks()[0]
        ?.getSettings()?.facingMode;
      const newFacingMode =
        currentFacingMode === "user" ? "environment" : "user";

      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
      });

      this.videoElement.srcObject = this.videoStream;
      this.videoElement.play();

      return true;
    } catch (error) {
      console.error("Error switching camera:", error);
      // Fallback to any available camera
      try {
        this.videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (this.videoElement) {
          this.videoElement.srcObject = this.videoStream;
          this.videoElement.play();
        }
        return true;
      } catch (fallbackError) {
        console.error("Fallback camera failed:", fallbackError);
        return false;
      }
    }
  }

  // Stop video streaming
  stopVideo() {
    if (this.videoInterval) {
      clearInterval(this.videoInterval);
      this.videoInterval = null;
    }

    if (this.videoStream) {
      this.videoStream.getTracks().forEach((track) => track.stop());
      this.videoStream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    this.isVideo = false;
    console.log("Video stopped");
  }

  // Capture and send video frame - following the reference implementation
  private captureAndSendFrame() {
    if (
      !this.videoElement ||
      !this.canvas ||
      !this.ctx ||
      this.videoElement.readyState < 2
    ) {
      return;
    }

    try {
      // Set canvas size to match video
      this.canvas.width = this.videoElement.videoWidth;
      this.canvas.height = this.videoElement.videoHeight;

      // Draw current video frame to canvas
      this.ctx.drawImage(
        this.videoElement,
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );

      // Convert canvas to blob and send as base64
      this.canvas.toBlob(
        (blob) => {
          if (!blob) return;

          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64data = result.split(",")[1]; // Remove data:image/jpeg;base64, prefix

            // Send the frame via WebSocket
            this.sendMessage({
              mime_type: "image/jpeg",
              data: base64data,
            });

            console.log("[CLIENT TO AGENT] sent image/jpeg frame");
          };
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.8 // JPEG quality
      );
    } catch (error) {
      console.error("Error capturing video frame:", error);
    }
  }

  // Audio recorder handler
  private audioRecorderHandler(pcmData: ArrayBuffer) {
    // Send the pcm data as base64
    this.sendMessage({
      mime_type: "audio/pcm",
      data: this.arrayBufferToBase64(pcmData),
    });
    console.log("[CLIENT TO AGENT] sent %s bytes", pcmData.byteLength);
  }

  // Encode an array buffer with Base64
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Decode Base64 data to Array
  private base64ToArray(base64: string): ArrayBuffer {
    try {
      // Safety check - limit the size of base64 strings we process
      if (base64.length > 500000) {
        // ~375KB after decoding
        console.warn(
          "Base64 string too large, truncating to prevent memory issues"
        );
        base64 = base64.substring(0, 500000);
      }

      const binaryString = window.atob(base64);
      const len = binaryString.length;

      // Another safety check on decoded length
      if (len > 1000000) {
        // ~1MB limit
        console.error("Decoded binary too large, cannot create array buffer");
        return new ArrayBuffer(0); // Return empty buffer
      }

      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (error) {
      console.error("Error decoding base64 to array:", error);
      return new ArrayBuffer(0); // Return empty buffer on error
    }
  }
}
