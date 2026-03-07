const db = require("../db");

/**
 * Calculate date range based on report type
 */
function getDateRange(type, customPeriod = null) {
  const now = new Date();
  let startDate, endDate;
  
  switch (type) {
    case 'weekly':
      // Last 7 days
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
      
    case 'monthly':
      // Current month or last month
      if (customPeriod === 'last-month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
      }
      break;
      
    case 'quarterly':
      // Current quarter
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = now;
      break;
      
    case 'annual':
      // Current year
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = now;
      break;
      
    default:
      // Default to last 30 days
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
  }
  
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
}

/**
 * Format period name for display
 */
function formatPeriod(type, startDate) {
  const date = new Date(startDate);
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  
  switch (type) {
    case 'weekly':
      return `Week of ${date.toLocaleDateString()}`;
    case 'monthly':
      return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    case 'quarterly':
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${date.getFullYear()}`;
    case 'annual':
      return `Year ${date.getFullYear()}`;
    default:
      return `${date.toLocaleDateString()} - ${new Date().toLocaleDateString()}`;
  }
}

/**
 * Determine risk level based on averages
 */
function calculateRiskLevel(avgTurbidity, avgTemperature, avgPh) {
  let riskScore = 0;
  
  // Turbidity risk (0-100 NTU scale)
  if (avgTurbidity > 50) riskScore += 3;
  else if (avgTurbidity > 25) riskScore += 2;
  else if (avgTurbidity > 10) riskScore += 1;
  
  // Temperature risk (optimal: 20-30°C)
  if (avgTemperature > 35 || avgTemperature < 15) riskScore += 2;
  else if (avgTemperature > 32 || avgTemperature < 18) riskScore += 1;
  
  // pH risk (optimal: 6.5-8.5)
  if (avgPh > 9 || avgPh < 6) riskScore += 2;
  else if (avgPh > 8.5 || avgPh < 6.5) riskScore += 1;
  
  // Determine risk level
  if (riskScore >= 5) return 'high';
  if (riskScore >= 3) return 'moderate';
  return 'low';
}

/**
 * Get statistics from database for date range
 */
function getStatistics(startDate, endDate) {
  return new Promise((resolve, reject) => {
    // Get readings statistics
    db.get(
      `SELECT 
        COUNT(DISTINCT timestamp) as totalSites,
        AVG(turbidity) as avgTurbidity,
        AVG(temperature) as avgTemperature,
        AVG(ph) as avgPh
      FROM readings 
      WHERE timestamp BETWEEN ? AND ?`,
      [startDate, endDate],
      (err, readingsRow) => {
        if (err) {
          return reject(err);
        }
        
        // Get alerts count
        db.get(
          `SELECT COUNT(*) as alertsGenerated
          FROM alerts 
          WHERE timestamp BETWEEN ? AND ?`,
          [startDate, endDate],
          (err, alertsRow) => {
            if (err) {
              return reject(err);
            }
            
            resolve({
              totalSites: readingsRow?.totalSites || 0,
              avgTurbidity: parseFloat(readingsRow?.avgTurbidity || 0).toFixed(2),
              avgTemperature: parseFloat(readingsRow?.avgTemperature || 0).toFixed(2),
              avgPh: parseFloat(readingsRow?.avgPh || 0).toFixed(2),
              alertsGenerated: alertsRow?.alertsGenerated || 0
            });
          }
        );
      }
    );
  });
}

/**
 * Generate report data
 */
async function generateReportData(type, customPeriod = null) {
  try {
    // Get date range
    const { startDate, endDate } = getDateRange(type, customPeriod);
    
    // Get statistics
    const stats = await getStatistics(startDate, endDate);
    
    // Calculate risk level
    const riskLevel = calculateRiskLevel(
      parseFloat(stats.avgTurbidity),
      parseFloat(stats.avgTemperature),
      parseFloat(stats.avgPh)
    );
    
    // Format period
    const period = formatPeriod(type, startDate);
    
    // Generate title
    const typeTitle = type.charAt(0).toUpperCase() + type.slice(1);
    const title = `${typeTitle} Water Quality Report - ${period}`;
    
    return {
      title,
      type,
      period,
      startDate,
      endDate,
      generatedDate: new Date().toISOString(),
      totalSites: stats.totalSites,
      alertsGenerated: stats.alertsGenerated,
      avgTurbidity: parseFloat(stats.avgTurbidity),
      avgTemperature: parseFloat(stats.avgTemperature),
      avgPh: parseFloat(stats.avgPh),
      riskLevel
    };
  } catch (error) {
    throw new Error(`Failed to generate report: ${error.message}`);
  }
}

module.exports = {
  generateReportData,
  getDateRange,
  calculateRiskLevel
};
