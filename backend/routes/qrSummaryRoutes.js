const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const Defect = require("../models/Defect");
const QualityCheck = require("../models/QualityCheck");
const Risk = require("../models/Risk");

// GET /api/qr-summary/:projectId
// Combined quality + risk dashboard summary for a project
router.get("/:projectId", async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const pid = req.params.projectId;

    // ── Defect stats ────────────────────────────────────────────────
    const defects = await Defect.find({ project: pid }).lean();
    const defectSeverityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    const defectStatusCounts   = { Open: 0, "In Progress": 0, Resolved: 0, Closed: 0 };
    let unresolvedCritical = 0;

    for (const d of defects) {
      defectSeverityCounts[d.severity] = (defectSeverityCounts[d.severity] || 0) + 1;
      defectStatusCounts[d.status]     = (defectStatusCounts[d.status] || 0) + 1;
      if (d.severity === "Critical" && d.status !== "Resolved" && d.status !== "Closed") {
        unresolvedCritical++;
      }
    }

    // Critical unresolved defects by module (for appointment scheduling / patient records)
    const criticalOpenByModule = defects
      .filter(d => d.severity === "Critical" && d.status !== "Resolved" && d.status !== "Closed")
      .map(d => ({ _id: d._id, title: d.title, relatedModule: d.relatedModule, status: d.status }));

    // ── Quality check stats ─────────────────────────────────────────
    const qualityChecks = await QualityCheck.find({ project: pid }).lean();
    const qcResultCounts = { Pending: 0, Passed: 0, Failed: 0 };
    for (const q of qualityChecks) {
      qcResultCounts[q.result] = (qcResultCounts[q.result] || 0) + 1;
    }
    const evaluatedQc = qcResultCounts.Passed + qcResultCounts.Failed;
    const passRate = evaluatedQc > 0
      ? `${((qcResultCounts.Passed / evaluatedQc) * 100).toFixed(1)}%`
      : qualityChecks.length > 0 ? "0.0% (all pending)" : "0.0%";

    // ── Risk stats & Exposure Matrix ─────────────────────────────────
    const risks = await Risk.find({ project: pid }).lean();
    const riskLevelCounts  = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    const riskStatusCounts = {};
    const matrix = Array.from({ length: 5 }, () => Array(5).fill(0));

    for (const r of risks) {
      riskLevelCounts[r.riskLevel] = (riskLevelCounts[r.riskLevel] || 0) + 1;
      riskStatusCounts[r.status]   = (riskStatusCounts[r.status]   || 0) + 1;

      const l = Math.min(Math.max((r.likelihood || 1) - 1, 0), 4);
      const i = Math.min(Math.max((r.impact || 1) - 1, 0), 4);
      matrix[l][i]++;
    }

    const labels = ["1 (Very Low)", "2 (Low)", "3 (Medium)", "4 (High)", "5 (Very High)"];
    const riskExposureMatrix = {
      axes: { rows: "Likelihood (1-5)", cols: "Impact (1-5)" },
      grid: matrix.map((row, li) => ({
        likelihood: labels[li],
        cells: row.map((count, ii) => ({
          impact: labels[ii],
          riskCount: count,
          score: (li + 1) * (ii + 1),
        })),
      })),
    };

    const highRisks = risks
      .filter(r => r.riskLevel === "Critical" || r.riskLevel === "High")
      .map(r => ({
        _id: r._id,
        title: r.title,
        category: r.category,
        riskLevel: r.riskLevel,
        riskScore: r.riskScore,
        preventiveAction: r.preventiveAction,
        contingencyAction: r.contingencyAction,
        status: r.status,
      }));

    // ── Warnings ────────────────────────────────────────────────────
    const warnings = [];
    if (unresolvedCritical > 0) {
      warnings.push(`⚠️ ${unresolvedCritical} unresolved Critical defect(s)`);
    }
    if (qcResultCounts.Failed > 0) {
      warnings.push(`⚠️ ${qcResultCounts.Failed} quality check(s) failed`);
    }
    if (riskLevelCounts.Critical > 0) {
      warnings.push(`⚠️ ${riskLevelCounts.Critical} Critical risk(s) identified`);
    }
    if (riskLevelCounts.High > 0) {
      warnings.push(`⚠️ ${riskLevelCounts.High} High risk(s) identified`);
    }

    res.json({
      projectId:   pid,
      projectName: project.projectName,
      health:      warnings.length === 0 ? "✅ No critical quality/risk issues" : "⚠️ Attention required",
      warnings,

      defects: {
        total:              defects.length,
        unresolvedCritical,
        bySeverity:         defectSeverityCounts,
        byStatus:           defectStatusCounts,
        criticalOpenItems:  criticalOpenByModule,
      },

      qualityChecks: {
        total:    qualityChecks.length,
        passRate,
        byResult: qcResultCounts,
      },

      risks: {
        total:              risks.length,
        byLevel:            riskLevelCounts,
        byStatus:           riskStatusCounts,
        riskExposureMatrix,
        highRisks,
      },
    });
  } catch (err) {
    console.error("[GET /api/qr-summary/:projectId]", err);
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid project ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

module.exports = router;
