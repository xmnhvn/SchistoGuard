const db = require("../db");
const classifyWater = require("./classifyWater");
const REPORT_TIMEZONE = process.env.REPORT_TIMEZONE || process.env.SMS_SUMMARY_TIMEZONE || "Asia/Manila";
const REPORT_LOCALE = process.env.REPORT_LOCALE || "en-US";

function getZonedDateTimeParts(date, timeZone = REPORT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat(REPORT_LOCALE, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const readPart = (type) => Number(parts.find((entry) => entry.type === type)?.value || "0");
  return {
    year: readPart("year"),
    month: readPart("month"),
    day: readPart("day"),
    hour: readPart("hour"),
    minute: readPart("minute"),
    second: readPart("second"),
  };
}

function getTimezoneOffsetMs(date, timeZone = REPORT_TIMEZONE) {
  const zoned = getZonedDateTimeParts(date, timeZone);
  const zonedAsUtcMs = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
    0
  );
  return zonedAsUtcMs - date.getTime();
}

function buildDateInTimeZone(
  { year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0 },
  timeZone = REPORT_TIMEZONE
) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
  const offset = getTimezoneOffsetMs(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset);
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function formatInReportTimeZone(date, options) {
  return new Intl.DateTimeFormat(REPORT_LOCALE, {
    timeZone: REPORT_TIMEZONE,
    ...options,
  }).format(date);
}

/**
 * Calculate date range based on report type
 */
function getDateRange(type, customPeriod = null) {
  const now = new Date();
  const zonedNow = getZonedDateTimeParts(now);
  let startDate, endDate;
  const periodValue = typeof customPeriod === "string" ? customPeriod : "";
  
  switch (type) {
    case 'hourly':
      if (periodValue.startsWith('hour:')) {
        const customHourMatch = periodValue.match(/^hour:(\d{4}-\d{2}-\d{2})\|(\d{2}:\d{2})\|(\d{2}:\d{2})$/);
        const legacyHourMatch = periodValue.match(/^hour:(\d{4})-(\d{2})-(\d{2})-(\d{2})$/);

        if (customHourMatch) {
          const [year, month, day] = customHourMatch[1].split("-").map(Number);
          const [startHour, startMinute] = customHourMatch[2].split(':').map(Number);
          const [endHour, endMinute] = customHourMatch[3].split(':').map(Number);
          const parsedStart = buildDateInTimeZone({
            year,
            month,
            day,
            hour: startHour,
            minute: startMinute,
          });
          const parsedEnd = buildDateInTimeZone({
            year,
            month,
            day,
            hour: endHour,
            minute: endMinute,
            second: 59,
            millisecond: 999,
          });

          if (!Number.isNaN(parsedStart.getTime()) && !Number.isNaN(parsedEnd.getTime()) && parsedStart <= parsedEnd && [startHour, startMinute, endHour, endMinute].every(Number.isFinite)) {
            startDate = parsedStart;
            endDate = parsedEnd;
            break;
          }
        } else if (legacyHourMatch) {
          const year = Number(legacyHourMatch[1]);
          const month = Number(legacyHourMatch[2]);
          const day = Number(legacyHourMatch[3]);
          const hour = Number(legacyHourMatch[4]);
          const parsedStart = buildDateInTimeZone({ year, month, day, hour });
          const parsedEnd = buildDateInTimeZone({
            year,
            month,
            day,
            hour,
            minute: 59,
            second: 59,
            millisecond: 999,
          });

          if (!Number.isNaN(parsedStart.getTime()) && !Number.isNaN(parsedEnd.getTime())) {
            startDate = parsedStart;
            endDate = parsedEnd;
            break;
          }
        }
      }

      startDate = buildDateInTimeZone({
        year: zonedNow.year,
        month: zonedNow.month,
        day: zonedNow.day,
        hour: zonedNow.hour,
      });
      endDate = now;
      break;

    case 'daily':
      if (periodValue.startsWith('day:')) {
        const dayMatch = periodValue.match(/^day:(\d{4})-(\d{2})-(\d{2})$/);
        if (dayMatch) {
          const year = Number(dayMatch[1]);
          const month = Number(dayMatch[2]);
          const day = Number(dayMatch[3]);
          const parsedStart = buildDateInTimeZone({ year, month, day });
          const parsedEnd = buildDateInTimeZone({
            year,
            month,
            day,
            hour: 23,
            minute: 59,
            second: 59,
            millisecond: 999,
          });

          if (!Number.isNaN(parsedStart.getTime()) && !Number.isNaN(parsedEnd.getTime())) {
            startDate = parsedStart;
            endDate = parsedEnd;
            break;
          }
        }
      }

      startDate = buildDateInTimeZone({
        year: zonedNow.year,
        month: zonedNow.month,
        day: zonedNow.day,
      });
      endDate = now;
      break;

    case 'weekly':
      // Custom weekly range: range:YYYY-MM-DD:YYYY-MM-DD
      if (periodValue.startsWith('range:')) {
        const weeklyMatch = periodValue.match(/^range:(\d{4})-(\d{2})-(\d{2}):(\d{4})-(\d{2})-(\d{2})$/);
        if (weeklyMatch) {
          const parsedStart = buildDateInTimeZone({
            year: Number(weeklyMatch[1]),
            month: Number(weeklyMatch[2]),
            day: Number(weeklyMatch[3]),
          });
          const parsedEnd = buildDateInTimeZone({
            year: Number(weeklyMatch[4]),
            month: Number(weeklyMatch[5]),
            day: Number(weeklyMatch[6]),
            hour: 23,
            minute: 59,
            second: 59,
            millisecond: 999,
          });
          const isValidRange = !Number.isNaN(parsedStart.getTime()) && !Number.isNaN(parsedEnd.getTime()) && parsedStart <= parsedEnd;

          if (isValidRange) {
            startDate = parsedStart;
            endDate = parsedEnd;
            break;
          }
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
          const month = Number(monthMatch[2]);
          if (month >= 1 && month <= 12) {
            startDate = buildDateInTimeZone({ year, month, day: 1 });
            endDate = buildDateInTimeZone({
              year,
              month,
              day: getDaysInMonth(year, month),
              hour: 23,
              minute: 59,
              second: 59,
              millisecond: 999,
            });
            break;
          }
        }
      }

      // Backward compatibility: current month or last month
      if (periodValue === 'last-month') {
        const prevMonth = zonedNow.month === 1 ? 12 : zonedNow.month - 1;
        const prevYear = zonedNow.month === 1 ? zonedNow.year - 1 : zonedNow.year;
        startDate = buildDateInTimeZone({ year: prevYear, month: prevMonth, day: 1 });
        endDate = buildDateInTimeZone({
          year: prevYear,
          month: prevMonth,
          day: getDaysInMonth(prevYear, prevMonth),
          hour: 23,
          minute: 59,
          second: 59,
          millisecond: 999,
        });
      } else {
        startDate = buildDateInTimeZone({ year: zonedNow.year, month: zonedNow.month, day: 1 });
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
          const startMonth = ((quarterNumber - 1) * 3) + 1;
          const endMonth = startMonth + 2;
          startDate = buildDateInTimeZone({ year, month: startMonth, day: 1 });
          endDate = buildDateInTimeZone({
            year,
            month: endMonth,
            day: getDaysInMonth(year, endMonth),
            hour: 23,
            minute: 59,
            second: 59,
            millisecond: 999,
          });
          break;
        }
      }

      // Default: current quarter
      const quarter = Math.floor((zonedNow.month - 1) / 3);
      const startMonth = (quarter * 3) + 1;
      startDate = buildDateInTimeZone({ year: zonedNow.year, month: startMonth, day: 1 });
      endDate = now;
      break;
      
    case 'annual':
      // Optional year: year:YYYY
      if (periodValue.startsWith('year:')) {
        const yearMatch = periodValue.match(/^year:(\d{4})$/);
        if (yearMatch) {
          const year = Number(yearMatch[1]);
          startDate = buildDateInTimeZone({ year, month: 1, day: 1 });
          endDate = buildDateInTimeZone({
            year,
            month: 12,
            day: 31,
            hour: 23,
            minute: 59,
            second: 59,
            millisecond: 999,
          });
          break;
        }
      }

      // Default: current year
      startDate = buildDateInTimeZone({ year: zonedNow.year, month: 1, day: 1 });
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
  
  switch (type) {
    case 'hourly':
      return `${formatInReportTimeZone(start, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })} - ${formatInReportTimeZone(end, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })}`;
    case 'daily':
      return formatInReportTimeZone(start, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      });
    case 'weekly':
      return `${formatInReportTimeZone(start, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      })} - ${formatInReportTimeZone(end, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      })}`;
    case 'monthly':
      return formatInReportTimeZone(start, { month: "long", year: "numeric" });
    case 'quarterly': {
      const zonedStart = getZonedDateTimeParts(start);
      const quarter = Math.floor((zonedStart.month - 1) / 3) + 1;
      return `Q${quarter} ${zonedStart.year}`;
    }
    case 'annual':
      return `Year ${getZonedDateTimeParts(start).year}`;
    default:
      return `${formatInReportTimeZone(start, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      })} - ${formatInReportTimeZone(end, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      })}`;
  }
}

/**
 * Determine risk level based on averages
 */
function calculateRiskLevel(avgTurbidity, avgTemperature, avgPh) {
  const normalizedStatus = classifyWater(avgTemperature, avgPh, avgTurbidity);

  if (normalizedStatus === 'high-risk') return 'high';
  if (normalizedStatus === 'possible-risk') return 'moderate';
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
    const timestampExpr = `NULLIF("timestamp", '')::timestamptz`;
    const readingsQuery = hasSiteFilter
      ? `SELECT 
        CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END as totalSites,
        COUNT(*) as totalReadings,
        AVG(CASE WHEN turbidity > -50 THEN turbidity END) as avgTurbidity,
        AVG(CASE WHEN temperature > -50 THEN temperature END) as avgTemperature,
        AVG(CASE WHEN ph > -10 THEN ph END) as avgPh
      FROM readings 
      WHERE site_key = ? AND ${timestampExpr} BETWEEN ?::timestamptz AND ?::timestamptz`
      : `SELECT 
        CASE
          WHEN COUNT(*) > 0 THEN COUNT(DISTINCT COALESCE(NULLIF(site_key, ''), 'unknown-site'))
          ELSE 0
        END as totalSites,
        COUNT(*) as totalReadings,
        AVG(CASE WHEN turbidity > -50 THEN turbidity END) as avgTurbidity,
        AVG(CASE WHEN temperature > -50 THEN temperature END) as avgTemperature,
        AVG(CASE WHEN ph > -10 THEN ph END) as avgPh
      FROM readings 
      WHERE ${timestampExpr} BETWEEN ?::timestamptz AND ?::timestamptz`;
    const readingsParams = hasSiteFilter ? [siteKey, startDate, endDate] : [startDate, endDate];

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
          WHERE site_key = ? AND ${timestampExpr} BETWEEN ?::timestamptz AND ?::timestamptz`
          : `SELECT COUNT(*) as alertsGenerated
          FROM alerts 
          WHERE ${timestampExpr} BETWEEN ?::timestamptz AND ?::timestamptz`;
        const alertsParams = hasSiteFilter ? [siteKey, startDate, endDate] : [startDate, endDate];
        
        // Get alerts count
        db.get(
          alertsQuery,
          alertsParams,
          (err, alertsRow) => {
            if (err) {
              return reject(err);
            }
            
            resolve({
              totalSites: Number(readingsRow?.totalSites || 0),
              totalReadings: Number(readingsRow?.totalReadings || 0),
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
    const riskLevel = Number(stats.totalReadings || 0) > 0
      ? calculateRiskLevel(
          parseFloat(stats.avgTurbidity),
          parseFloat(stats.avgTemperature),
          parseFloat(stats.avgPh)
        )
      : 'low';

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
