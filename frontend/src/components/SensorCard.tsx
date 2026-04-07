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
  offline?: boolean;
}


const SensorCard: React.FC<SensorCardProps> = ({ readings, alerts, summary, offline }) => {
  const turbidity = readings.turbidity;
  const ph = readings.ph;
  const temperature = readings.temperature;
  const totalReadings = summary?.totalReadings;
  function getRiskLabel(risk: 'critical' | 'warning' | 'safe'): string {
    if (risk === 'critical') return 'High Possible Risk';
    if (risk === 'warning') return 'Moderate Possible Risk';
    return 'Safe';
  }

  if (offline) {
    return (
      <div className="flex gap-4 justify-center w-full">
        <div className="flex-1 flex flex-col items-center justify-center py-8 mx-1 min-w-[200px]" style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid #e8e8e8', fontFamily: "'Inter', sans-serif" }}>
          <div className="text-md font-bold text-schistoguard-navy mb-4 pb-2 text-center">Temperature</div>
          <Thermometer className="h-10 w-10 text-gray-300 mb-4" />
          <div className="text-3xl font-bold mt-2 mb-1 text-center text-gray-300">--<span className="text-2xl font-bold align-top">°C</span></div>
          <div className="text-sm font-medium text-center text-gray-300">Offline</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-8 mx-1 min-w-[200px]" style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid #e8e8e8', fontFamily: "'Inter', sans-serif" }}>
          <div className="text-md font-bold text-schistoguard-navy mb-4 text-center">Turbidity</div>
          <Waves className="h-10 w-10 text-gray-300 mb-4" />
          <div className="text-3xl font-bold mt-2 mb-1 text-center text-gray-300">-- <span className="text-2xl font-bold align-top">NTU</span></div>
          <div className="text-sm font-medium text-center text-gray-300">Offline</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-8 mx-1 min-w-[200px]" style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid #e8e8e8', fontFamily: "'Inter', sans-serif" }}>
          <div className="text-md font-bold text-schistoguard-navy mb-4 text-center">pH Level</div>
          <Droplet className="h-10 w-10 text-gray-300 mb-4" />
          <div className="text-3xl font-bold mt-2 mb-1 text-center text-gray-300">--</div>
          <div className="text-sm font-medium text-center text-gray-300">Offline</div>
        </div>
      </div>
    );
  }

  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    borderRadius: '24px',
    border: '1px solid #e8e8e8',
    fontFamily: "'Inter', sans-serif",
    minHeight: '220px',
  };

  const titleStyle = { fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.02em' };

  return (
    <div className="flex gap-4 justify-center w-full">
      <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-8 mx-1 min-w-[250px]">
        <div className="text-md font-bold text-schistoguard-navy mb-4 pb-2 text-center">Temperature</div>
        <Thermometer className="h-10 w-10 text-red-500 mb-4" />
        {(() => {
          const temp = temperature;
          let riskLabel = getRiskLabel('safe');
          let riskColor = "text-green-600";
          if (temp >= 22 && temp <= 30) {
            riskLabel = "High Possible Risk";
            riskColor = "text-red-600";
          } else if ((temp >= 20 && temp < 22) || (temp > 30 && temp <= 35)) {
            riskLabel = "Moderate Possible Risk";
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
      <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-8 mx-1 min-w-[250px]">
        <div className="text-md font-bold text-schistoguard-navy mb-4 text-center">Turbidity</div>
        <Waves className="h-10 w-10 text-blue-500 mb-4" />
        {(() => {
          let turbidityRiskLabel = getRiskLabel('safe');
          let turbidityRiskColor = "text-green-600";
          if (turbidity < 5) {
            turbidityRiskLabel = "Clear Water - Higher Schisto Risk";
            turbidityRiskColor = "text-red-600";
          } else if (turbidity >= 5 && turbidity <= 15) {
            turbidityRiskLabel = "Moderate Clarity";
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
      <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-8 mx-1 min-w-[250px]">
        <div className="text-md font-bold text-schistoguard-navy mb-4 text-center">pH Level</div>
        <Droplet className="h-10 w-10 text-cyan-500 mb-4" style={{ color: '#78c2cfff' }} />
        {(() => {
          let phRiskLabel = "Safe";
          let phRiskColor = "text-green-600";
          if (ph >= 6.5 && ph <= 8.0) {
            phRiskLabel = "High Possible Risk";
            phRiskColor = "text-red-600";
          } else if ((ph >= 6.0 && ph < 6.5) || (ph > 8.0 && ph <= 8.5)) {
            phRiskLabel = "Moderate Possible Risk";
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
