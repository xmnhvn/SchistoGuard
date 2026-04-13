const router = require("express").Router();
const db = require("../db");
const { generateReportData } = require("../utils/generateReport");

// Get all reports
router.get("/", (req, res) => {
  db.all(
    "SELECT * FROM reports ORDER BY generatedDate DESC",
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      
      // Convert rows to match frontend interface
      const reports = rows.map(row => ({
        id: row.id.toString(),
        title: row.title,
        type: row.type,
        period: row.period,
        generatedDate: row.generatedDate,
        siteKey: row.siteKey || null,
        siteName: row.siteName || null,
        address: row.address || null,
        status: 'published', // Frontend expects this
        summary: {
          totalSites: row.totalSites || 0,
          alertsGenerated: row.alertsGenerated || 0,
          avgTurbidity: row.avgTurbidity || 0,
          avgTemperature: row.avgTemperature || 0,
          avgPh: row.avgPh || 0,
          riskLevel: row.riskLevel || 'low'
        },
        downloadUrl: row.downloadUrl
      }));
      
      res.json({ success: true, reports });
    }
  );
});

// Get single report by ID
router.get("/:id", (req, res) => {
  const { id } = req.params;
  
  db.get(
    "SELECT * FROM reports WHERE id = ?",
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      if (!row) {
        return res.status(404).json({ success: false, message: "Report not found" });
      }
      
      const report = {
        id: row.id.toString(),
        title: row.title,
        type: row.type,
        period: row.period,
        generatedDate: row.generatedDate,
        siteKey: row.siteKey || null,
        siteName: row.siteName || null,
        address: row.address || null,
        status: 'published',
        summary: {
          totalSites: row.totalSites || 0,
          alertsGenerated: row.alertsGenerated || 0,
          avgTurbidity: row.avgTurbidity || 0,
          avgTemperature: row.avgTemperature || 0,
          avgPh: row.avgPh || 0,
          riskLevel: row.riskLevel || 'low'
        },
        downloadUrl: row.downloadUrl
      };
      
      res.json({ success: true, report });
    }
  );
});

// Create new report
router.post("/", async (req, res) => {
  const { type, period, siteKey } = req.body;
  
  if (!type) {
    return res.status(400).json({ success: false, message: "Report type is required" });
  }
  
  try {
    // Generate report data based on type
    const reportData = await generateReportData(type, period, siteKey || null);
    
    // Insert into database
    db.run(
      `INSERT INTO reports (
        title, type, period, startDate, endDate, generatedDate, 
        generatedBy, totalSites, alertsGenerated, 
        avgTurbidity, avgTemperature, avgPh, riskLevel, siteKey, siteName, address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        reportData.title,
        reportData.type,
        reportData.period,
        reportData.startDate,
        reportData.endDate,
        reportData.generatedDate,
        req.session.userId || null,
        reportData.totalSites,
        reportData.alertsGenerated,
        reportData.avgTurbidity,
        reportData.avgTemperature,
        reportData.avgPh,
        reportData.riskLevel,
        reportData.siteKey,
        reportData.siteName,
        reportData.address
      ],
      function (err, result) {
        if (err) {
          return res.status(500).json({ success: false, message: err.message });
        }

        const newReportId = result?.lastID;
        if (!newReportId) {
          return res.status(500).json({ success: false, message: "Report saved but failed to resolve new report ID" });
        }
        
        // Get the newly created report
        db.get(
          "SELECT * FROM reports WHERE id = ?",
          [newReportId],
          (err, row) => {
            if (err) {
              return res.status(500).json({ success: false, message: err.message });
            }
            if (!row) {
              return res.status(404).json({ success: false, message: "Newly created report not found" });
            }
            
            const report = {
              id: row.id.toString(),
              title: row.title,
              type: row.type,
              period: row.period,
              generatedDate: row.generatedDate,
              siteKey: row.siteKey || null,
              siteName: row.siteName || null,
              address: row.address || null,
              status: 'published',
              summary: {
                totalSites: row.totalSites || 0,
                alertsGenerated: row.alertsGenerated || 0,
                avgTurbidity: row.avgTurbidity || 0,
                avgTemperature: row.avgTemperature || 0,
                avgPh: row.avgPh || 0,
                riskLevel: row.riskLevel || 'low'
              },
              downloadUrl: row.downloadUrl
            };
            
            res.json({ success: true, report, message: "Report generated successfully" });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete report
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  
  db.run(
    "DELETE FROM reports WHERE id = ?",
    [id],
    function (err, result) {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      if (!result || result.changes === 0) {
        return res.status(404).json({ success: false, message: "Report not found" });
      }
      
      res.json({ success: true, message: "Report deleted successfully" });
    }
  );
});

module.exports = router;
