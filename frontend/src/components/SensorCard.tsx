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
  // Only use real sensor readings
  const turbidity = readings.turbidity;
  const ph = readings.ph;
  const temperature = readings.temperature;
  const totalReadings = summary?.totalReadings;
  function getRiskLabel(risk: 'critical' | 'warning' | 'safe'): string {
    if (risk === 'critical') return 'Critical';
    if (risk === 'warning') return 'Warning';
    return 'Safe';
  }

  return (
    <div className="flex gap-4 justify-center w-full">
      {/* Temperature Card (real data) */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-8 mx-1 min-w-[250px]">
        <div className="text-md font-bold text-schistoguard-navy mb-4 pb-2 text-center">Temperature</div>
        <Thermometer className="h-10 w-10 text-red-500 mb-4" />
        {/* Helper to get risk label (always use 'safe' for lowest risk) */}
        {(() => {
          const temp = temperature;
          // WHO schistosomiasis risk label and color
          let riskLabel = getRiskLabel('safe');
          let riskColor = "text-green-600";
          if (temp >= 22 && temp <= 28) {
            riskLabel = "High Schistosomiasis Risk";
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
        {(() => {
          // WHO-based risk for turbidity
          let turbidityRiskLabel = getRiskLabel('safe');
          let turbidityRiskColor = "text-green-600";
          if (turbidity > 15) {
            turbidityRiskLabel = "High Schistosomiasis Risk";
            turbidityRiskColor = "text-red-600";
          } else if (turbidity > 5) {
            turbidityRiskLabel = "Possible Schistosomiasis Risk";
            turbidityRiskColor = "text-yellow-500";
          }
          return (
            <>
              <div className={`text-3xl font-bold mt-6 mb-1 text-center ${turbidityRiskColor}`}>
                {turbidity} <span className="text-2xl font-bold align-top">NTU</span>
              </div>
              <div className={`text-sm font-semibold text-center ${turbidityRiskColor}`}>{turbidityRiskLabel}</div>
            </>
          );
        })()}
      </div>
      {/* pH Level Card */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-8 mx-1 min-w-[250px]">
        <div className="text-md font-bold text-schistoguard-navy mb-4 text-center">pH Level</div>
        <Droplet className="h-10 w-10 text-cyan-500 mb-4" style={{ color: '#78c2cfff' }} />
        {(() => {
          // WHO-based risk for pH: Safe 6.5-8.5, Warning 6.5-7.0 or 8.0-8.5, Critical <6.5 or >8.5
          let phRiskLabel = "Safe";
          let phRiskColor = "text-green-600";
          if (ph < 6.5 || ph > 8.5) {
            phRiskLabel = "High Schistosomiasis Risk";
            phRiskColor = "text-red-600";
          } else if ((ph >= 6.5 && ph < 7) || (ph > 8 && ph <= 8.5)) {
            phRiskLabel = "Possible Schistosomiasis Risk";
            phRiskColor = "text-yellow-500";
          }
          return (
            <>
              <div className={`text-3xl font-bold mt-6 mb-1 text-center ${phRiskColor}`}>{ph}</div>
              <div className={`text-sm font-semibold text-center ${phRiskColor}`}>{phRiskLabel}</div>
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default SensorCard;
