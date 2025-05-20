import { Car, Cog, ShieldCheck } from "lucide-react";

export function AutoPartsLogo() {
  return (
    <div className="relative flex items-center justify-center h-10 w-10 rounded-md bg-gradient-to-br from-blue-600 to-blue-700 shadow-sm">
      <Car className="h-5 w-5 text-white absolute" strokeWidth={2} />
      <div className="absolute -top-1 -right-1">
        <div className="bg-red-500 rounded-full h-4 w-4 flex items-center justify-center">
          <Cog className="h-3 w-3 text-white" strokeWidth={2.5} />
        </div>
      </div>
      <div className="absolute -bottom-1 -left-1">
        <div className="bg-gray-800 rounded-full h-4 w-4 flex items-center justify-center">
          <ShieldCheck className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}
