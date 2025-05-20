"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AutoPartsLogo } from "@/components/auto-parts-logo-apple";

export default function LoginPage() {
  const router = useRouter();
  const [customerUsername, setCustomerUsername] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState("");

  const handleCustomerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerUsername && customerPassword === "customer") {
      // Generate a unique ID for the customer
      const userId = `customer_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      localStorage.setItem(
        "user",
        JSON.stringify({
          id: userId,
          type: "customer",
          username: customerUsername,
          name: customerUsername,
          email: `${customerUsername}@example.com`,
          phone: "555-123-4567",
          lastPurchase: "Brake Pads (2 days ago)",
          vehicleInfo: "2018 Toyota Camry",
          status: "online",
        })
      );
      router.push("/chat");
    } else {
      setError(
        'Invalid credentials. Use any username with password "customer"'
      );
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUsername && adminPassword === "admin") {
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: `admin_${Date.now()}`,
          type: "admin",
          username: adminUsername,
        })
      );
      router.push("/admin");
    } else {
      setError('Invalid credentials. Use any username with password "admin"');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 apple-gradient">
      <div className="mb-8 flex items-center space-x-3">
        <AutoPartsLogo />
        <h1 className="text-2xl font-semibold text-gray-900">
          CC Auto Parts Support
        </h1>
      </div>

      <Tabs defaultValue="customer" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-[#f1f1f3] p-1 rounded-xl">
          <TabsTrigger
            value="customer"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Customer
          </TabsTrigger>
          <TabsTrigger
            value="admin"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Admin
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customer">
          <Card className="apple-card border-none">
            <CardHeader>
              <CardTitle className="text-gray-900">Customer Login</CardTitle>
              <CardDescription className="text-gray-500">
                Login to chat with our support team about your auto parts needs.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCustomerLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-username" className="text-gray-700">
                    Username
                  </Label>
                  <Input
                    id="customer-username"
                    placeholder="Enter your username"
                    value={customerUsername}
                    onChange={(e) => setCustomerUsername(e.target.value)}
                    required
                    className="apple-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-password" className="text-gray-700">
                    Password
                  </Label>
                  <Input
                    id="customer-password"
                    type="password"
                    placeholder="Enter your password"
                    value={customerPassword}
                    onChange={(e) => setCustomerPassword(e.target.value)}
                    required
                    className="apple-input"
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full apple-button">
                  Sign In
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="admin">
          <Card className="apple-card border-none">
            <CardHeader>
              <CardTitle className="text-gray-900">Admin Login</CardTitle>
              <CardDescription className="text-gray-500">
                Login to access the admin dashboard and support customers.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleAdminLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-username" className="text-gray-700">
                    Username
                  </Label>
                  <Input
                    id="admin-username"
                    placeholder="Enter admin username"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    required
                    className="apple-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password" className="text-gray-700">
                    Password
                  </Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="Enter admin password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                    className="apple-input"
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full apple-button">
                  Sign In
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
