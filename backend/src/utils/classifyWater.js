// WHO/DOH Schistosomiasis Water Quality Risk Classification
// Combines temperature, pH, and turbidity parameters for comprehensive risk assessment

/**
 * Classifies water risk level based on all three environmental parameters
 * @param {number} temperature - Water temperature in °C
 * @param {number} ph - Water pH level (0-14)
 * @param {number} turbidity - Water turbidity in NTU (Nephelometric Turbidity Units)
 * @returns {string} Risk classification: "high-risk", "possible-risk", or "low-risk"
 */
function classifyWater(temperature, pH, turbidity) {
    // Handle missing data
    const parameterCount = [temperature, pH, turbidity].filter(p => p != null).length;
    if (parameterCount === 0) return "unknown";

    let riskLevels = [];

    // Temperature classification (25-30°C optimal for snail/cercariae)
    if (temperature != null) {
        if (temperature >= 25 && temperature <= 30) {
            riskLevels.push("high-risk");
        } else if ((temperature >= 20 && temperature < 25) || (temperature > 30 && temperature <= 32)) {
            riskLevels.push("possible-risk");
        } else {
            riskLevels.push("low-risk");
        }
    }

    // pH classification (6.5-8.0 optimal for snail survival)
    if (pH != null) {
        if (pH >= 6.5 && pH <= 8.0) {
            riskLevels.push("high-risk");
        } else if ((pH >= 6.0 && pH < 6.5) || (pH > 8.0 && pH <= 8.5)) {
            riskLevels.push("possible-risk");
        } else {
            riskLevels.push("low-risk");
        }
    }

    // Turbidity classification (low turbidity = slower water, favors snails)
    if (turbidity != null) {
        if (turbidity < 5) {
            riskLevels.push("high-risk");    // Clear/stagnant water
        } else if (turbidity >= 5 && turbidity <= 15) {
            riskLevels.push("possible-risk"); // Moderate clarity
        } else {
            riskLevels.push("low-risk");      // High turbidity inhibits transmission
        }
    }

    // Overall classification: highest risk level detected
    if (riskLevels.includes("high-risk")) return "high-risk";
    if (riskLevels.includes("possible-risk")) return "possible-risk";
    return "low-risk";
}

module.exports = classifyWater;
