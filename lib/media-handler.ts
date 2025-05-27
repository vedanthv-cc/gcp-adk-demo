/**
 * Media Handler for webcam and screen sharing
 */

export class MediaHandler {
  videoElement: HTMLVideoElement | null = null;
  currentStream: MediaStream | null = null;
  isWebcamActive = false;
  isScreenActive = false;
  frameCapture: NodeJS.Timeout | null = null;
  frameCallback: ((base64Image: string) => void) | null = null;
  usingFrontCamera = true;

  initialize(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
  }

  async startWebcam(useFrontCamera = true) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 1280,
          height: 720,
          facingMode: useFrontCamera ? "user" : "environment",
        },
      });
      this.handleNewStream(stream);
      this.isWebcamActive = true;
      this.usingFrontCamera = useFrontCamera;
      return true;
    } catch (error) {
      console.error("Error accessing webcam:", error);
      return false;
    }
  }

  async startScreenShare() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      this.handleNewStream(stream);
      this.isScreenActive = true;

      // Handle when user stops sharing via browser controls
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        this.stopAll();
      });

      return true;
    } catch (error) {
      console.error("Error sharing screen:", error);
      return false;
    }
  }

  async switchCamera() {
    if (!this.isWebcamActive) return false;
    const newFacingMode = !this.usingFrontCamera;
    await this.stopAll();
    const success = await this.startWebcam(newFacingMode);
    if (success && this.frameCallback) {
      this.startFrameCapture(this.frameCallback);
    }
    return success;
  }

  handleNewStream(stream: MediaStream) {
    if (this.currentStream) {
      this.stopAll();
    }
    this.currentStream = stream;
    if (this.videoElement) {
      this.videoElement.srcObject = stream;
      this.videoElement.classList.remove("hidden");
    }
  }

  stopAll() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement.classList.add("hidden");
    }
    this.isWebcamActive = false;
    this.isScreenActive = false;
    this.stopFrameCapture();
  }

  startFrameCapture(onFrame: (base64Image: string) => void) {
    this.frameCallback = onFrame;
    const captureFrame = () => {
      if (!this.currentStream || !this.videoElement) return;

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.width = this.videoElement.videoWidth;
      canvas.height = this.videoElement.videoHeight;

      context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

      // Convert to JPEG and base64 encode
      const base64Image = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
      this.frameCallback(base64Image);
    };

    // Capture frames at 1fps
    this.frameCapture = setInterval(captureFrame, 1000);
  }

  stopFrameCapture() {
    if (this.frameCapture) {
      clearInterval(this.frameCapture);
      this.frameCapture = null;
    }
  }
}

// Create a singleton instance
const mediaHandler = new MediaHandler();
export default mediaHandler;
