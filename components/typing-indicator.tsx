"use client";

import { useEffect, useState } from "react";

export function TypingIndicator() {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev < 3 ? prev + 1 : 1));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center space-x-2 text-gray-500 text-sm mb-2">
      <div className="flex space-x-1">
        <span
          className={`animate-bounce ${
            dots >= 1 ? "opacity-100" : "opacity-30"
          }`}
        >
          •
        </span>
        <span
          className={`animate-bounce delay-100 ${
            dots >= 2 ? "opacity-100" : "opacity-30"
          }`}
        >
          •
        </span>
        <span
          className={`animate-bounce delay-200 ${
            dots >= 3 ? "opacity-100" : "opacity-30"
          }`}
        >
          •
        </span>
      </div>
      <span>Agent is responding</span>
    </div>
  );
}
