"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface RouteGuardProps {
  children: React.ReactNode;
  requiredUserType?: "customer" | "admin";
}

export function RouteGuard({ children, requiredUserType }: RouteGuardProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      setAuthorized(false);
      router.push("/");
      return;
    }

    const user = JSON.parse(storedUser);

    // Check if user type matches required type
    if (requiredUserType && user.type !== requiredUserType) {
      setAuthorized(false);
      router.push("/");
      return;
    }

    setAuthorized(true);
  }, [router, requiredUserType]);

  return authorized ? <>{children}</> : null;
}
