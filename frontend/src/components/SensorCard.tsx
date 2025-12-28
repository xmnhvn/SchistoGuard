import { Thermometer, Waves, Droplet } from "lucide-react";

interface SensorReading {
  turbidity: number;
  temperature: number;
  ph: number;
}


interface SensorCardProps {
  readings: SensorReading;
  alerts?: Array<{
    id: string;
    parameter: string;
    level: "critical" | "warning" | "info" | string;
    isAcknowledged: boolean;
    message?: string;
    [key: string]: any;
  }>;
  summary?: {
    avgTurbidity?: number;
    avgTemperature?: number;
    avgPh?: number;
    totalReadings?: number;
  };
}

const SensorCard: React.FC<SensorCardProps> = ({ readings, alerts, summary }) => {
  // Use real data if provided, fallback to mock if not
  const turbidity = readings.turbidity ?? summary?.avgTurbidity ?? 8.5;
  const ph = readings.ph ?? summary?.avgPh ?? 7.2;
  const temperature = readings.temperature ?? summary?.avgTemperature ?? 26.0;
  const totalReadings = summary?.totalReadings;
  return (
    <div className="flex gap-4 justify-center w-full">
      {/* Temperature Card (real data) */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-8 mx-1 min-w-[250px]">
        <div className="text-md font-bold text-schistoguard-navy mb-4 pb-2 text-center">Temperature</div>
        <Thermometer className="h-10 w-10 text-red-500 mb-4" />
        {(() => {
          const temp = temperature;
          // WHO schistosomiasis risk label and color
          let riskLabel = "Low schisto risk";
          let riskColor = "text-green-600";
          if (temp >= 22 && temp <= 28) {
            riskLabel = "High schisto risk";
            riskColor = "text-red-600";
          } else if ((temp >= 20 && temp < 22) || (temp > 28 && temp <= 32)) {
            riskLabel = "Possible Schistosomiasis Risk";
            riskColor = "text-yellow-500";
          }
          return (
            <>
              <div className={`text-3xl font-bold mt-6 mb-1 text-center ${riskColor}`}>
                {temp?.toFixed(2)}<span className="text-2xl font-bold align-top">°C</span>
              </div>
              <div className={`text-sm font-semibold text-center ${riskColor}`}>{riskLabel}</div>
              {alerts && alerts.length > 0 && (
                <div className="mt-2 text-xs text-red-500 text-center">{alerts.filter(a => !a.isAcknowledged).length} active alerts</div>
              )}
            </>
          );
        })()}
      </div>
      {/* Turbidity Card */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-8 mx-1 min-w-[250px]">
        <div className="text-md font-bold text-schistoguard-navy mb-4 text-center">Turbidity</div>
        <Waves className="h-10 w-10 text-blue-500 mb-4" />
        <div className="text-3xl font-bold text-schistoguard-navy mt-6 mb-1 text-center">{turbidity} <span className="text-2xl font-bold align-top">NTU</span></div>
      </div>
      {/* pH Level Card */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-8 mx-1 min-w-[250px]">
        <div className="text-md font-bold text-schistoguard-navy mb-4 text-center">pH Level</div>
        <Droplet className="h-10 w-10 text-cyan-500 mb-4" style={{ color: '#78c2cfff' }} />
        <div className="text-3xl font-bold text-schistoguard-navy mt-6 mb-1 text-center">{ph}</div>
      </div>
    </div>
  );
};

export default SensorCard;
