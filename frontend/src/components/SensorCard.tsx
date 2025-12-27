import { Thermometer, Waves, Droplet } from "lucide-react";

interface SensorReading {
  turbidity: number;
  temperature: number;
  ph: number;
}

interface SensorCardProps {
  readings: SensorReading;
}

const SensorCard: React.FC<SensorCardProps> = ({ readings }) => {
  return (
    <div className="flex gap-4 justify-center w-full">
      {/* Temperature Card */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-8 mx-1 min-w-[250px]">
        <div className="text-md font-bold text-schistoguard-navy mb-4 pb-2 text-center">Temperature</div>
            <Thermometer className="h-10 w-10 text-red-500 mb-8" />
        {(() => {
          const temp = readings.temperature;
          let color = "text-green-600"; // safe
          if (temp >= 30 && temp < 35) color = "text-yellow-500"; // warning
          else if (temp >= 35 && temp < 38) color = "text-orange-500"; // alert
          else if (temp >= 38) color = "text-red-600"; // critical
          return (
            <div className={`text-3xl font-bold mt-6 mb-1 text-center ${color}`}>
              {temp?.toFixed(2)}<span className="text-2xl font-bold align-top">°C</span>
            </div>
          );
        })()}
      </div>
      {/* Turbidity Card */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-8 mx-1 min-w-[250px]">
        <div className="text-md font-bold text-schistoguard-navy mb-4 text-center">Turbidity</div>
            <Waves className="h-10 w-10 text-blue-500 mb-8" />
        <div className="text-3xl font-bold text-schistoguard-navy mt-6 mb-1 text-center">{readings.turbidity} <span className="text-2xl font-bold align-top">NTU</span></div>
      </div>
      {/* pH Level Card */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-8 mx-1 min-w-[250px]">
        <div className="text-md font-bold text-schistoguard-navy mb-4 text-center">pH Level</div>
            <Droplet className="h-10 w-10 text-cyan-500 mb-8" style={{ color: '#78c2cfff' }} />
        <div className="text-3xl font-bold text-schistoguard-navy mt-6 mb-1 text-center">{readings.ph}</div>
      </div>
    </div>
  );
};

export default SensorCard;
