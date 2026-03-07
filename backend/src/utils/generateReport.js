const db = require("../db");

/**
 * Calculate date range based on report type
 */
function getDateRange(type, customPeriod = null) {
  const now = new Date();
  let startDate, endDate;
  const periodValue = typeof customPeriod === "string" ? customPeriod : "";
  
  switch (type) {
    case 'weekly':
      // Custom weekly range: range:YYYY-MM-DD:YYYY-MM-DD
      if (periodValue.startsWith('range:')) {
        const [, start, end] = periodValue.split(':');
        const parsedStart = new Date(`${start}T00:00:00`);
        const parsedEnd = new Date(`${end}T23:59:59.999`);
        const isValidRange = !Number.isNaN(parsedStart.getTime()) && !Number.isNaN(parsedEnd.getTime()) && parsedStart <= parsedEnd;

        if (isValidRange) {
          startDate = parsedStart;
          endDate = parsedEnd;
          break;
        }
      }

      // Default: last 7 days
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
      
    case 'monthly':
      // Custom month: month:YYYY-MM
      if (periodValue.startsWith('month:')) {
        const monthMatch = periodValue.match(/^month:(\d{4})-(\d{2})$/);
        if (monthMatch) {
          const year = Number(monthMatch[1]);
          const month = Number(monthMatch[2]) - 1;
          if (month >= 0 && month <= 11) {
            startDate = new Date(year, month, 1, 0, 0, 0, 0);
            endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
            break;
          }
        }
      }

      // Backward compatibility: current month or last month
      if (periodValue === 'last-month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
      }
      break;
      
    case 'quarterly':
      // Custom quarter: quarter:YYYY-QN
      if (periodValue.startsWith('quarter:')) {
        const quarterMatch = periodValue.match(/^quarter:(\d{4})-Q([1-4])$/);
        if (quarterMatch) {
          const year = Number(quarterMatch[1]);
          const quarterNumber = Number(quarterMatch[2]);
          const startMonth = (quarterNumber - 1) * 3;
          startDate = new Date(year, startMonth, 1, 0, 0, 0, 0);
          endDate = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
          break;
        }
      }

      // Default: current quarter
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = now;
      break;
      
    case 'annual':
      // Optional year: year:YYYY
      if (periodValue.startsWith('year:')) {
        const yearMatch = periodValue.match(/^year:(\d{4})$/);
        if (yearMatch) {
          const year = Number(yearMatch[1]);
          startDate = new Date(year, 0, 1, 0, 0, 0, 0);
          endDate = new Date(year, 11, 31, 23, 59, 59, 999);
          break;
        }
      }

      // Default: current year
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
function formatPeriod(type, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  
  switch (type) {
    case 'weekly':
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    case 'monthly':
      return `${monthNames[start.getMonth()]} ${start.getFullYear()}`;
    case 'quarterly':
      const quarter = Math.floor(start.getMonth() / 3) + 1;
      return `Q${quarter} ${start.getFullYear()}`;
    case 'annual':
      return `Year ${start.getFullYear()}`;
    default:
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
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
    const period = formatPeriod(type, startDate, endDate);
    
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
