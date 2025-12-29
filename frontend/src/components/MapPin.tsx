import { MapPin as MapPinIcon } from "lucide-react";

interface MapPinProps {
  riskLevel: "safe" | "warning" | "critical";
  size?: "sm" | "md" | "lg";
  siteName?: string;
  onClick?: () => void;
}

function getPinColor(riskLevel: string) {
  switch (riskLevel) {
    case "safe": return "text-green-500";
    case "warning": return "text-yellow-500";
    case "critical": return "text-red-500";
    default: return "text-gray-500";
  }
}

function getPinSize(size: string) {
  switch (size) {
    case "sm": return "w-4 h-4";
    case "md": return "w-6 h-6";
    case "lg": return "w-8 h-8";
    default: return "w-6 h-6";
  }
}

function getPinBg(riskLevel: string) {
  switch (riskLevel) {
    case "safe": return "bg-green-500";
    case "warning": return "bg-yellow-500";
    case "critical": return "bg-red-500";
    default: return "bg-gray-500";
  }
}

export function MapPin({ riskLevel, size = "md", siteName, onClick }: MapPinProps) {
  return (
    <div 
      className={`relative cursor-pointer ${onClick ? 'hover:scale-110 transition-transform' : ''}`}
      onClick={onClick}
      title={siteName}
      >

      <div className={`absolute inset-0 ${getPinBg(riskLevel)} opacity-20 rounded-full blur-sm`}></div>
      <div className={`relative flex items-center justify-center rounded-full ${getPinBg(riskLevel)} p-1`}>
        <MapPinIcon 
          className={`${getPinSize(size)} text-white fill-current`}
        />
      </div>

      {riskLevel === "critical" && (
        <div className={`absolute inset-0 ${getPinBg(riskLevel)} rounded-full animate-ping opacity-75`}></div>
      )}
    </div>
  );
}

export function MapPinDetailed({ riskLevel, size = "md", siteName, value, onClick }: MapPinProps & { value?: string }) {
  return (
    <div 
      className={`relative cursor-pointer ${onClick ? 'hover:scale-105 transition-transform' : ''}`}
      onClick={onClick}
    >
      <div className={`flex flex-col items-center gap-1`}>
        {value && (
          <div className={`px-2 py-1 rounded text-xs font-medium text-white ${getPinBg(riskLevel)}`}>
            {value}
          </div>
        )}

        <div className={`relative flex items-center justify-center rounded-full ${getPinBg(riskLevel)} p-1.5`}>
          <MapPinIcon 
            className={`${getPinSize(size)} text-white fill-current`}
          />
        </div>

        {siteName && (
          <div className="text-xs font-medium text-center max-w-20 truncate bg-white px-1 py-0.5 rounded shadow-sm">
            {siteName}
          </div>
        )}
      </div>

      {riskLevel === "critical" && (
        <div className={`absolute top-6 left-1/2 transform -translate-x-1/2 w-6 h-6 ${getPinBg(riskLevel)} rounded-full animate-ping opacity-75`}></div>
      )}
    </div>
  );
}
