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
    if (risk === 'critical') return 'Critical';
    if (risk === 'warning') return 'Warning';
    return 'Safe';
  }

  if (offline) {
    return (
      <div className="flex gap-4 justify-center w-full">
        <div className="flex-1 flex flex-col items-center justify-center py-8 mx-1 min-w-[200px]" style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid #e8e8e8', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', fontFamily: "'Inter', sans-serif" }}>
          <div className="text-md font-bold text-schistoguard-navy mb-4 pb-2 text-center">Temperature</div>
          <Thermometer className="h-10 w-10 text-gray-300 mb-4" />
          <div className="text-3xl font-bold mt-2 mb-1 text-center text-gray-300">--<span className="text-2xl font-bold align-top">°C</span></div>
          <div className="text-sm font-medium text-center text-gray-300">Offline</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-8 mx-1 min-w-[200px]" style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid #e8e8e8', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', fontFamily: "'Inter', sans-serif" }}>
          <div className="text-md font-bold text-schistoguard-navy mb-4 text-center">Turbidity</div>
          <Waves className="h-10 w-10 text-gray-300 mb-4" />
          <div className="text-3xl font-bold mt-2 mb-1 text-center text-gray-300">-- <span className="text-2xl font-bold align-top">NTU</span></div>
          <div className="text-sm font-medium text-center text-gray-300">Offline</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-8 mx-1 min-w-[200px]" style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid #e8e8e8', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', fontFamily: "'Inter', sans-serif" }}>
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
    boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
    fontFamily: "'Inter', sans-serif",
    minHeight: '220px',
  };

  const titleStyle = { fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.02em' };

  return (
    <div className="flex gap-4 justify-center w-full items-stretch">
      {/* Temperature */}
      <div className="flex-1 flex flex-col items-center justify-center py-8 mx-1 min-w-[200px]" style={cardStyle}>
        {/* Row 1: Title */}
        <div style={titleStyle} className="text-schistoguard-navy text-center h-6 flex items-center">Temperature</div>
        {/* Row 2: Icon */}
        <div className="flex items-center justify-center h-14 mt-3">
          <Thermometer className="h-8 w-8 text-red-500" />
        </div>
        {/* Row 3: Value */}
        <div className="flex items-center justify-center h-10 mt-2">
          {(() => {
            const temp = temperature;
            let riskColor = "text-green-600";
            if (temp >= 22 && temp <= 28) riskColor = "text-red-600";
            else if ((temp >= 20 && temp < 22) || (temp > 28 && temp <= 32)) riskColor = "text-yellow-500";
            return <span className={`text-3xl font-bold text-center ${riskColor}`}>{temp?.toFixed(2)}<span className="text-xl align-top">°C</span></span>;
          })()}
        </div>
        {/* Row 4: Risk Label */}
        <div className="flex items-center justify-center mt-1 min-h-[20px]">
          {(() => {
            const temp = temperature;
            let riskLabel = getRiskLabel('safe');
            let riskColor = "text-green-600";
            if (temp >= 22 && temp <= 28) { riskLabel = "High Schistosomiasis Risk"; riskColor = "text-red-600"; }
            else if ((temp >= 20 && temp < 22) || (temp > 28 && temp <= 32)) { riskLabel = "Possible Schistosomiasis Risk"; riskColor = "text-yellow-500"; }
            return <span className={`text-xs font-semibold text-center ${riskColor}`}>{riskLabel}</span>;
          })()}
        </div>
      </div>

      {/* Turbidity */}
      <div className="flex-1 flex flex-col items-center justify-center py-8 mx-1 min-w-[200px]" style={cardStyle}>
        {/* Row 1: Title */}
        <div style={titleStyle} className="text-schistoguard-navy text-center h-6 flex items-center">Turbidity</div>
        {/* Row 2: Icon */}
        <div className="flex items-center justify-center h-14 mt-3">
          <Waves className="h-8 w-8 text-blue-500" />
        </div>
        {/* Row 3: Value */}
        <div className="flex items-center justify-center h-10 mt-2">
          {(() => {
            let riskColor = "text-green-600";
            if (turbidity > 15) riskColor = "text-red-600";
            else if (turbidity > 5) riskColor = "text-yellow-500";
            return <span className={`text-3xl font-bold text-center ${riskColor}`}>{turbidity}<span className="text-xl align-top"> NTU</span></span>;
          })()}
        </div>
        {/* Row 4: Risk Label */}
        <div className="flex items-center justify-center mt-1 min-h-[20px]">
          {(() => {
            let riskLabel = getRiskLabel('safe');
            let riskColor = "text-green-600";
            if (turbidity > 15) { riskLabel = "High Schistosomiasis Risk"; riskColor = "text-red-600"; }
            else if (turbidity > 5) { riskLabel = "Possible Schistosomiasis Risk"; riskColor = "text-yellow-500"; }
            return <span className={`text-xs font-semibold text-center ${riskColor}`}>{riskLabel}</span>;
          })()}
        </div>
      </div>

      {/* pH Level */}
      <div className="flex-1 flex flex-col items-center justify-center py-8 mx-1 min-w-[200px]" style={cardStyle}>
        {/* Row 1: Title */}
        <div style={titleStyle} className="text-schistoguard-navy text-center h-6 flex items-center">pH Level</div>
        {/* Row 2: Icon */}
        <div className="flex items-center justify-center h-14 mt-3">
          <Droplet className="h-8 w-8" style={{ color: '#78c2cf' }} />
        </div>
        {/* Row 3: Value */}
        <div className="flex items-center justify-center h-10 mt-2">
          {(() => {
            let riskColor = "text-green-600";
            if (ph < 6.5 || ph > 8.5) riskColor = "text-red-600";
            else if ((ph >= 6.5 && ph < 7) || (ph > 8 && ph <= 8.5)) riskColor = "text-yellow-500";
            return <span className={`text-3xl font-bold text-center ${riskColor}`}>{ph}</span>;
          })()}
        </div>
        {/* Row 4: Risk Label */}
        <div className="flex items-center justify-center mt-1 min-h-[20px]">
          {(() => {
            let phRiskLabel = "Safe";
            let riskColor = "text-green-600";
            if (ph < 6.5 || ph > 8.5) { phRiskLabel = "High Schistosomiasis Risk"; riskColor = "text-red-600"; }
            else if ((ph >= 6.5 && ph < 7) || (ph > 8 && ph <= 8.5)) { phRiskLabel = "Possible Schistosomiasis Risk"; riskColor = "text-yellow-500"; }
            return <span className={`text-xs font-semibold text-center ${riskColor}`}>{phRiskLabel}</span>;
          })()}
        </div>
      </div>
    </div>
  );
};

export default SensorCard;
