// WHO/DOH Schistosomiasis Water Quality Risk Classification
// Combines temperature, pH, and turbidity parameters for comprehensive risk assessment

const {
    DEFAULT_SITE_RISK_THRESHOLDS,
    classifySensorValue,
} = require("./siteRiskConfig");

/**
 * Classifies water risk level based on all three environmental parameters
 * @param {number} temperature - Water temperature in °C
 * @param {number} ph - Water pH level (0-14)
 * @param {number} turbidity - Water turbidity in NTU (Nephelometric Turbidity Units)
 * @param {object} thresholds - Optional per-site thresholds
 * @returns {string} Risk classification: "high-risk", "possible-risk", or "low-risk"
 */
function classifyWater(temperature, pH, turbidity, thresholds = DEFAULT_SITE_RISK_THRESHOLDS) {
    // Handle missing data
    const parameterCount = [temperature, pH, turbidity].filter(p => p != null).length;
    if (parameterCount === 0) return "unknown";

    let riskLevels = [];

    if (temperature != null) {
        const level = classifySensorValue("temperature", temperature, thresholds);
        riskLevels.push(level === "critical" ? "high-risk" : level === "warning" ? "possible-risk" : "low-risk");
    }

    if (pH != null) {
        const level = classifySensorValue("ph", pH, thresholds);
        riskLevels.push(level === "critical" ? "high-risk" : level === "warning" ? "possible-risk" : "low-risk");
    }

    if (turbidity != null) {
        const level = classifySensorValue("turbidity", turbidity, thresholds);
        riskLevels.push(level === "critical" ? "high-risk" : level === "warning" ? "possible-risk" : "low-risk");
    }

    // Overall classification: highest risk level detected
    if (riskLevels.includes("high-risk")) return "high-risk";
    if (riskLevels.includes("possible-risk")) return "possible-risk";
    return "low-risk";
}

module.exports = classifyWater;
