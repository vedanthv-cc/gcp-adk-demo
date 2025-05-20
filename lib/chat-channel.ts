/**
 * Chat Channel Service
 *
 * This service uses the BroadcastChannel API to enable real-time
 * communication between customer and admin tabs without relying on WebSockets.
 */

export type MessageType =
  | "NEW_MESSAGE"
  | "MESSAGE_UPDATE"
  | "CUSTOMER_STATUS"
  | "ADMIN_TYPING"
  | "CUSTOMER_TYPING";

export interface ChatMessage {
  id: string;
  sender: "customer" | "agent";
  content: string;
  timestamp: string;
  customerId: string;
}

export interface ChannelEvent {
  type: MessageType;
  data: any;
  customerId: string;
}

export class ChatChannelService {
  private channel: BroadcastChannel;
  private listeners: Map<string, ((event: ChannelEvent) => void)[]> = new Map();

  constructor() {
    this.channel = new BroadcastChannel("cc-auto-parts-chat");
    this.channel.onmessage = this.handleMessage.bind(this);
  }

  private handleMessage(event: MessageEvent) {
    const channelEvent = event.data as ChannelEvent;

    // Notify all listeners for this event type
    const listeners = this.listeners.get(channelEvent.type) || [];
    listeners.forEach((listener) => {
      try {
        listener(channelEvent);
      } catch (error) {
        console.error("Error in chat channel listener:", error);
      }
    });
  }

  /**
   * Add a listener for a specific event type
   */
  addEventListener(type: MessageType, callback: (event: ChannelEvent) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }

    this.listeners.get(type)!.push(callback);
  }

  /**
   * Remove a listener for a specific event type
   */
  removeEventListener(
    type: MessageType,
    callback: (event: ChannelEvent) => void
  ) {
    if (!this.listeners.has(type)) return;

    const listeners = this.listeners.get(type)!;
    const index = listeners.indexOf(callback);

    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Send a new message event
   */
  sendNewMessage(message: ChatMessage) {
    this.channel.postMessage({
      type: "NEW_MESSAGE",
      data: message,
      customerId: message.customerId,
    });

    // Also save to localStorage for persistence
    this.saveMessageToStorage(message);
  }

  /**
   * Update an existing message
   */
  updateMessage(message: ChatMessage) {
    this.channel.postMessage({
      type: "MESSAGE_UPDATE",
      data: message,
      customerId: message.customerId,
    });

    // Update in localStorage
    this.updateMessageInStorage(message);
  }

  /**
   * Update customer status (online/offline)
   */
  updateCustomerStatus(customerId: string, status: "online" | "offline") {
    this.channel.postMessage({
      type: "CUSTOMER_STATUS",
      data: { status },
      customerId,
    });
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(customerId: string, isTyping: boolean, isAdmin: boolean) {
    this.channel.postMessage({
      type: isAdmin ? "ADMIN_TYPING" : "CUSTOMER_TYPING",
      data: { isTyping },
      customerId,
    });
  }

  /**
   * Save message to localStorage
   */
  private saveMessageToStorage(message: ChatMessage) {
    try {
      const chatKey = `chat_${message.customerId}`;
      const existingChat = localStorage.getItem(chatKey);
      let messages: ChatMessage[] = [];

      if (existingChat) {
        messages = JSON.parse(existingChat);
      }

      messages.push(message);
      localStorage.setItem(chatKey, JSON.stringify(messages));
    } catch (error) {
      console.error("Error saving message to storage:", error);
    }
  }

  /**
   * Update message in localStorage
   */
  private updateMessageInStorage(updatedMessage: ChatMessage) {
    try {
      const chatKey = `chat_${updatedMessage.customerId}`;
      const existingChat = localStorage.getItem(chatKey);

      if (!existingChat) return;

      const messages: ChatMessage[] = JSON.parse(existingChat);
      const messageIndex = messages.findIndex(
        (msg) => msg.id === updatedMessage.id
      );

      if (messageIndex !== -1) {
        messages[messageIndex] = updatedMessage;
        localStorage.setItem(chatKey, JSON.stringify(messages));
      }
    } catch (error) {
      console.error("Error updating message in storage:", error);
    }
  }

  /**
   * Get all messages for a customer
   */
  getMessages(customerId: string): ChatMessage[] {
    try {
      const chatKey = `chat_${customerId}`;
      const existingChat = localStorage.getItem(chatKey);

      if (!existingChat) return [];

      return JSON.parse(existingChat);
    } catch (error) {
      console.error("Error getting messages from storage:", error);
      return [];
    }
  }

  /**
   * Close the channel
   */
  close() {
    this.channel.close();
  }
}

// Create a singleton instance
const chatChannel = new ChatChannelService();
export default chatChannel;
