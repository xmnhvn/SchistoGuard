// WHO schistosomiasis risk: high (22-28°C), possible (20-22°C, 28-32°C), low otherwise
function classifyWater(temperature) {
    if (temperature == null) return "unknown";
    if (temperature >= 22 && temperature <= 28) return "high-risk";
    if ((temperature >= 20 && temperature < 22) || (temperature > 28 && temperature <= 32)) return "possible-risk";
    return "low-risk";
}

module.exports = classifyWater;
