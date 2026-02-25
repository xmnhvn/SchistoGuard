// WHO/DOH schistosomiasis risk classification based on temperature
// High risk: 25-30°C (optimal for snail reproduction and cercariae survival)
// Moderate risk: 20-25°C or 30-32°C (snails can survive but less active)
// Low risk: <20°C or >32°C (snail activity significantly reduced)
function classifyWater(temperature) {
    if (temperature == null) return "unknown";
    if (temperature >= 25 && temperature <= 30) return "high-risk";
    if ((temperature >= 20 && temperature < 25) || (temperature > 30 && temperature <= 32)) return "possible-risk";
    return "low-risk";
}

module.exports = classifyWater;
