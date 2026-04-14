const db = require("../db");

/**
 * Calculate date range based on report type
 */
function getDateRange(type, customPeriod = null) {
  const now = new Date();
  let startDate, endDate;
  const periodValue = typeof customPeriod === "string" ? customPeriod : "";
  
  switch (type) {
    case 'hourly':
      if (periodValue.startsWith('hour:')) {
        const customHourMatch = periodValue.match(/^hour:(\d{4}-\d{2}-\d{2})\|(\d{2}:\d{2})\|(\d{2}:\d{2})$/);
        const legacyHourMatch = periodValue.match(/^hour:(\d{4})-(\d{2})-(\d{2})-(\d{2})$/);

        if (customHourMatch) {
          const [startHour, startMinute] = customHourMatch[2].split(':').map(Number);
          const [endHour, endMinute] = customHourMatch[3].split(':').map(Number);
          const parsedStart = new Date(`${customHourMatch[1]}T${customHourMatch[2]}:00`);
          const parsedEnd = new Date(`${customHourMatch[1]}T${customHourMatch[3]}:59.999`);

          if (!Number.isNaN(parsedStart.getTime()) && !Number.isNaN(parsedEnd.getTime()) && parsedStart <= parsedEnd && [startHour, startMinute, endHour, endMinute].every(Number.isFinite)) {
            startDate = parsedStart;
            endDate = parsedEnd;
            break;
          }
        } else if (legacyHourMatch) {
          const year = Number(legacyHourMatch[1]);
          const month = Number(legacyHourMatch[2]) - 1;
          const day = Number(legacyHourMatch[3]);
          const hour = Number(legacyHourMatch[4]);
          const parsedStart = new Date(year, month, day, hour, 0, 0, 0);
          const parsedEnd = new Date(year, month, day, hour, 59, 59, 999);

          if (!Number.isNaN(parsedStart.getTime()) && !Number.isNaN(parsedEnd.getTime())) {
            startDate = parsedStart;
            endDate = parsedEnd;
            break;
          }
        }
      }

      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
      endDate = now;
      break;

    case 'daily':
      if (periodValue.startsWith('day:')) {
        const dayMatch = periodValue.match(/^day:(\d{4})-(\d{2})-(\d{2})$/);
        if (dayMatch) {
          const year = Number(dayMatch[1]);
          const month = Number(dayMatch[2]) - 1;
          const day = Number(dayMatch[3]);
          const parsedStart = new Date(year, month, day, 0, 0, 0, 0);
          const parsedEnd = new Date(year, month, day, 23, 59, 59, 999);

          if (!Number.isNaN(parsedStart.getTime()) && !Number.isNaN(parsedEnd.getTime())) {
            startDate = parsedStart;
            endDate = parsedEnd;
            break;
          }
        }
      }

      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = now;
      break;

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
    case 'hourly':
      return `${start.toLocaleString()} - ${end.toLocaleString()}`;
    case 'daily':
      return `${start.toLocaleDateString()}`;
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

function formatReportTypeTitle(type) {
  switch (type) {
    case 'hourly':
      return 'Hourly';
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'annual':
      return 'Annual';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

/**
 * Get statistics from database for date range
 */
function getStatistics(startDate, endDate, siteKey = null) {
  return new Promise((resolve, reject) => {
    const hasSiteFilter = typeof siteKey === "string" && siteKey.trim().length > 0;
    const readingsQuery = hasSiteFilter
      ? `SELECT 
        COUNT(DISTINCT timestamp) as totalSites,
        AVG(turbidity) as avgTurbidity,
        AVG(temperature) as avgTemperature,
        AVG(ph) as avgPh
      FROM readings 
      WHERE timestamp BETWEEN ? AND ? AND site_key = ?`
      : `SELECT 
        COUNT(DISTINCT timestamp) as totalSites,
        AVG(turbidity) as avgTurbidity,
        AVG(temperature) as avgTemperature,
        AVG(ph) as avgPh
      FROM readings 
      WHERE timestamp BETWEEN ? AND ?`;
    const readingsParams = hasSiteFilter ? [startDate, endDate, siteKey] : [startDate, endDate];

    // Get readings statistics
    db.get(
      readingsQuery,
      readingsParams,
      (err, readingsRow) => {
        if (err) {
          return reject(err);
        }

        const alertsQuery = hasSiteFilter
          ? `SELECT COUNT(*) as alertsGenerated
          FROM alerts 
          WHERE timestamp BETWEEN ? AND ? AND site_key = ?`
          : `SELECT COUNT(*) as alertsGenerated
          FROM alerts 
          WHERE timestamp BETWEEN ? AND ?`;
        const alertsParams = hasSiteFilter ? [startDate, endDate, siteKey] : [startDate, endDate];
        
        // Get alerts count
        db.get(
          alertsQuery,
          alertsParams,
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

function getSiteSnapshot(siteKey = null) {
  return new Promise((resolve, reject) => {
    const hasSiteFilter = typeof siteKey === "string" && siteKey.trim().length > 0;

    if (hasSiteFilter) {
      db.get(
        `SELECT site_key, site_name, address
         FROM site_registry
         WHERE site_key = ?
         LIMIT 1`,
        [siteKey],
        (siteErr, siteRow) => {
          if (siteErr) {
            return reject(siteErr);
          }

          const siteName =
            (siteRow && (siteRow.site_name || siteRow.address)) ||
            "System Summary Report";
          const address = (siteRow && siteRow.address) || null;

          resolve({ siteKey, siteName, address });
        }
      );
      return;
    }

    db.get("SELECT value FROM settings WHERE key = ?", ["device_name"], (settingsErr, settingsRow) => {
      if (settingsErr) {
        return reject(settingsErr);
      }

      db.get(
        `SELECT site_name, address
         FROM site_registry
         ORDER BY COALESCE(last_seen, first_seen) DESC, id DESC
         LIMIT 1`,
        [],
        (siteErr, siteRow) => {
          if (siteErr) {
            return reject(siteErr);
          }

          const siteName =
            (settingsRow && settingsRow.value) ||
            (siteRow && siteRow.site_name) ||
            "System Summary Report";
          const address = (siteRow && siteRow.address) || null;

          resolve({ siteKey: null, siteName, address });
        }
      );
    });
  });
}

/**
 * Generate report data
 */
async function generateReportData(type, customPeriod = null, siteKey = null) {
  try {
    // Get date range
    const { startDate, endDate } = getDateRange(type, customPeriod);
    
    // Get statistics
    const normalizedSiteKey = typeof siteKey === "string" ? siteKey.trim() : "";
    const selectedSiteKey = normalizedSiteKey || null;
    const stats = await getStatistics(startDate, endDate, selectedSiteKey);
    
    // Calculate risk level
    const riskLevel = calculateRiskLevel(
      parseFloat(stats.avgTurbidity),
      parseFloat(stats.avgTemperature),
      parseFloat(stats.avgPh)
    );

    // Snapshot header metadata at generation time.
    const snapshot = await getSiteSnapshot(selectedSiteKey);
    
    // Format period
    const period = formatPeriod(type, startDate, endDate);
    
    // Generate title
      const typeTitle = formatReportTypeTitle(type);
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
      riskLevel,
      siteKey: snapshot.siteKey,
      siteName: snapshot.siteName,
      address: snapshot.address
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
