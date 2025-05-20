import { CircleDashed } from "lucide-react";

export function AutoPartsLogo() {
  return (
    <div className="relative flex items-center justify-center h-10 w-10">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-700 rounded-md shadow-sm"></div>
      <CircleDashed className="h-6 w-6 text-white" strokeWidth={2} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-2.5 w-2.5 bg-white rounded-full"></div>
      </div>
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500 rounded-t-md"></div>
    </div>
  );
}
