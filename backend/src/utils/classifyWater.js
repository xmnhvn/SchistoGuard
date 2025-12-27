// Classifies water status based on temperature only (for now)
function classifyWater(temperature) {
	if (temperature == null) return "unknown";
	if (temperature < 20) return "cold";
	if (temperature < 30) return "normal";
	return "hot";
}

module.exports = classifyWater;
