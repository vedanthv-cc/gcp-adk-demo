export function WaitingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="flex space-x-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
            style={{ animationDelay: `${i * 0.15}s` }}
          ></div>
        ))}
      </div>
      <p className="text-sm text-gray-500 mt-2">Waiting for response...</p>
    </div>
  );
}
