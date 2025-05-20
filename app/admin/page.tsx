"use client";

import type React from "react";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, LogOut, ChevronDown, MessageSquare } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AutoPartsLogo } from "@/components/auto-parts-logo-apple";
import chatChannel, { type ChatMessage } from "@/lib/chat-channel";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeCustomer, setActiveCustomer] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [customerTyping, setCustomerTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/");
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.type !== "admin") {
      router.push("/");
      return;
    }

    setUser(parsedUser);

    // Check for active chats in localStorage
    const activeChats = localStorage.getItem("activeChats");
    if (activeChats) {
      try {
        const parsedChats = JSON.parse(activeChats);
        setCustomers(parsedChats);
        if (parsedChats.length > 0 && !activeCustomer) {
          setActiveCustomer(parsedChats[0]);
        }
      } catch (error) {
        console.error("Error parsing active chats:", error);
      }
    }

    // Set up BroadcastChannel listeners
    chatChannel.addEventListener("NEW_MESSAGE", handleNewMessage);
    chatChannel.addEventListener("MESSAGE_UPDATE", handleMessageUpdate);
    chatChannel.addEventListener("CUSTOMER_STATUS", handleCustomerStatus);
    chatChannel.addEventListener("CUSTOMER_TYPING", handleCustomerTyping);

    // Set up storage event listener for active chats
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "activeChats" && e.newValue) {
        try {
          const newChats = JSON.parse(e.newValue);
          setCustomers(newChats);

          if (newChats.length > 0 && !activeCustomer) {
            setActiveCustomer(newChats[0]);
          }
        } catch (error) {
          console.error("Error handling storage change:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);

      // Remove BroadcastChannel listeners
      chatChannel.removeEventListener("NEW_MESSAGE", handleNewMessage);
      chatChannel.removeEventListener("MESSAGE_UPDATE", handleMessageUpdate);
      chatChannel.removeEventListener("CUSTOMER_STATUS", handleCustomerStatus);
      chatChannel.removeEventListener("CUSTOMER_TYPING", handleCustomerTyping);
    };
  }, [router]);

  useEffect(() => {
    if (activeCustomer) {
      // Load chat history for this customer
      const messages = chatChannel.getMessages(activeCustomer.id);
      setMessages(messages);
    }
  }, [activeCustomer]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, customerTyping]);

  const handleNewMessage = (event: any) => {
    if (activeCustomer && event.customerId === activeCustomer.id) {
      setMessages((prev) => [...prev, event.data]);
    }
  };

  const handleMessageUpdate = (event: any) => {
    if (activeCustomer && event.customerId === activeCustomer.id) {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === event.data.id ? event.data : msg))
      );
    }
  };

  const handleCustomerStatus = (event: any) => {
    setCustomers((prev) =>
      prev.map((customer) =>
        customer.id === event.customerId
          ? { ...customer, status: event.data.status }
          : customer
      )
    );
  };

  const handleCustomerTyping = (event: any) => {
    if (activeCustomer && event.customerId === activeCustomer.id) {
      setCustomerTyping(event.data.isTyping);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeCustomer) return;

    // Add message to UI
    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      sender: "agent",
      content: inputMessage,
      timestamp: new Date().toISOString(),
      customerId: activeCustomer.id,
    };

    // Add to messages
    setMessages((prev) => [...prev, newMessage]);

    // Send via BroadcastChannel
    chatChannel.sendNewMessage(newMessage);

    setInputMessage("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);

    // Send typing indicator
    if (activeCustomer) {
      chatChannel.sendTypingIndicator(
        activeCustomer.id,
        e.target.value.length > 0,
        true
      );

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to clear typing indicator after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        if (activeCustomer) {
          chatChannel.sendTypingIndicator(activeCustomer.id, false, true);
        }
      }, 2000);
    }
  };

  const handleCustomerSelect = (customer: any) => {
    setActiveCustomer(customer);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  if (!user) return null;

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 apple-header">
        <div className="flex items-center space-x-3">
          <AutoPartsLogo />
          <h1 className="text-xl font-semibold text-gray-900">
            CC Auto Parts Admin Dashboard
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          {customers.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-gray-100 border-gray-200 text-gray-800"
                >
                  {activeCustomer?.name || "Select Customer"}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-white border border-gray-200"
              >
                {customers.map((customer) => (
                  <DropdownMenuItem
                    key={customer.id}
                    onClick={() => handleCustomerSelect(customer)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          customer.status === "online"
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      />
                      {customer.name}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <span className="text-sm text-gray-700">
            Logged in as {user.username}
          </span>
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

      {/* Dashboard content */}
      <div className="flex flex-1 overflow-hidden p-6 gap-6 bg-[#f5f5f7]">
        {/* Chat column */}
        <div className="flex flex-1 flex-col apple-card overflow-hidden">
          {activeCustomer ? (
            <>
              <div className="p-4 border-b border-gray-100 bg-white">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-600">
                      {activeCustomer.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">
                      {activeCustomer.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {activeCustomer.status === "online"
                        ? "Online"
                        : "Offline"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-gray-400">
                    <p>
                      No messages yet. Wait for the customer to start the
                      conversation.
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`mb-4 flex ${
                        message.sender === "agent"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`flex max-w-[80%] ${
                          message.sender === "agent"
                            ? "flex-row-reverse"
                            : "flex-row"
                        }`}
                      >
                        <Avatar
                          className={`${
                            message.sender === "agent" ? "ml-2" : "mr-2"
                          } h-8 w-8`}
                        >
                          <AvatarFallback
                            className={
                              message.sender === "agent"
                                ? "bg-blue-600"
                                : "bg-gray-400"
                            }
                          >
                            {message.sender === "agent"
                              ? "A"
                              : activeCustomer.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`p-3 ${
                            message.sender === "agent"
                              ? "apple-message-bubble-customer"
                              : "apple-message-bubble-agent"
                          }`}
                        >
                          {message.content}
                          <div
                            className={`mt-1 text-xs ${
                              message.sender === "agent"
                                ? "text-blue-100"
                                : "text-gray-500"
                            }`}
                          >
                            {new Date(message.timestamp).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Typing indicator */}
                {customerTyping && (
                  <div className="flex items-center space-x-2 text-gray-500 text-sm mb-2">
                    <div className="flex space-x-1">
                      <span className="animate-bounce">•</span>
                      <span
                        className="animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      >
                        •
                      </span>
                      <span
                        className="animate-bounce"
                        style={{ animationDelay: "0.4s" }}
                      >
                        •
                      </span>
                    </div>
                    <span>Customer is typing</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-gray-100 bg-white">
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                  <Input
                    value={inputMessage}
                    onChange={handleInputChange}
                    placeholder="Type your message..."
                    className="apple-input"
                  />
                  <Button
                    type="submit"
                    disabled={!inputMessage.trim()}
                    className="apple-button"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6 text-gray-500">
              <MessageSquare className="h-16 w-16 mb-4 text-gray-400" />
              <h3 className="text-xl font-medium mb-2 text-gray-900">
                No Active Chats
              </h3>
              <p className="text-center max-w-md">
                There are currently no customers chatting. When customers start
                a conversation, they will appear here.
              </p>
            </div>
          )}
        </div>

        {/* AI assist column (empty as requested) */}
        <div className="w-1/4 apple-card p-6">
          <h2 className="text-lg font-medium mb-4 text-gray-900">AI Assist</h2>
          <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-gray-500 h-full flex items-center justify-center">
            <p>AI assistance will be available in future updates</p>
          </div>
        </div>

        {/* Customer details column */}
        <div className="w-1/4 apple-card p-6">
          {activeCustomer ? (
            <>
              <h2 className="text-lg font-medium mb-4 text-gray-900">
                Customer Details
              </h2>
              <Card className="border-gray-200 bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-blue-600">
                        {activeCustomer.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-gray-900">
                      {activeCustomer.name}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Contact Information
                    </h3>
                    <Separator className="my-2 bg-gray-200" />
                    <div className="space-y-1">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Email:</span>{" "}
                        {activeCustomer.email}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Phone:</span>{" "}
                        {activeCustomer.phone}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Vehicle Information
                    </h3>
                    <Separator className="my-2 bg-gray-200" />
                    <p className="text-sm text-gray-700">
                      {activeCustomer.vehicleInfo}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Purchase History
                    </h3>
                    <Separator className="my-2 bg-gray-200" />
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Last Purchase:</span>{" "}
                      {activeCustomer.lastPurchase}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-gray-500">
              <h3 className="text-lg font-medium mb-2 text-gray-900">
                No Customer Selected
              </h3>
              <p className="text-center">
                Customer details will appear here when a chat is active.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
