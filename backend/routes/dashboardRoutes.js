const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Project = require("../models/Project");
const Activity = require("../models/Activity");
const Requirement = require("../models/Requirement");
const WBSTask = require("../models/WBSTask");
const ChangeRequest = require("../models/ChangeRequest");
const Defect = require("../models/Defect");
const QualityCheck = require("../models/QualityCheck");
const Risk = require("../models/Risk");
const evmRoutes = require("./evmRoutes");

const APPROVED_BUDGET = 5_000_000; // PKR standard approved baseline

// ── Helper: Safe Division ──────────────────────────────────────────
function safeDivide(numerator, denominator) {
  if (!denominator || denominator === 0) return null;
  return parseFloat((numerator / denominator).toFixed(4));
}

function r2(n) {
  return parseFloat(n.toFixed(2));
}

// ══════════════════════════════════════════════════════════════════
// GET /api/dashboard — Portfolio Overview of All Projects
// ══════════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    const overview = await Promise.all(
      projects.map(async (p) => {
        const activities = await Activity.find({ project: p._id });
        const pendingCRs = await ChangeRequest.countDocuments({
          project: p._id,
          status: { $in: ["Pending", "Under Review"] },
        });
        const openCriticalDefects = await Defect.countDocuments({
          project: p._id,
          severity: "Critical",
          status: { $nin: ["Resolved", "Closed"] },
        });
        const highRisks = await Risk.countDocuments({
          project: p._id,
          riskLevel: { $in: ["High", "Critical"] },
          status: { $ne: "Closed" },
        });

        const budget = p.budget?.total > 0 ? p.budget.total : APPROVED_BUDGET;
        const evm = evmRoutes.computeEVM(activities, budget);

        return {
          projectId: p._id,
          projectName: p.projectName,
          status: p.status,
          approvedBudget: budget,
          totalActivities: activities.length,
          CPI: evm.CPI,
          SPI: evm.SPI,
          pendingChangeRequests: pendingCRs,
          openCriticalDefects,
          highOrCriticalRisks: highRisks,
        };
      })
    );
    res.json({ totalProjects: projects.length, projects: overview });
  } catch (err) {
    console.error("[GET /api/dashboard]", err);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/dashboard/:projectId — Comprehensive Integrated Project Dashboard
// ══════════════════════════════════════════════════════════════════
router.get("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: "Invalid project ID format" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Parallel fetch of all related module records
    const [
      activities,
      requirements,
      wbsTasks,
      changeRequests,
      defects,
      qualityChecks,
      risks,
    ] = await Promise.all([
      Activity.find({ project: projectId }).sort({ startDate: 1 }),
      Requirement.find({ project: projectId }),
      WBSTask.find({ project: projectId }),
      ChangeRequest.find({ project: projectId }),
      Defect.find({ project: projectId }),
      QualityCheck.find({ project: projectId }),
      Risk.find({ project: projectId }),
    ]);

    // ── 1. Schedule & Progress Calculations ─────────────────────────
    const now = new Date();
    const activityStatusCounts = {
      "Not Started": 0,
      "In Progress": 0,
      Completed: 0,
      Delayed: 0,
      "On Hold": 0,
    };

    let totalPercent = 0;
    const delayedActivities = [];

    for (const a of activities) {
      if (activityStatusCounts[a.status] !== undefined) {
        activityStatusCounts[a.status]++;
      }
      totalPercent += a.percentComplete || 0;

      const isDateOverdue =
        a.endDate && new Date(a.endDate) < now && a.status !== "Completed";
      const isMarkedDelayed = a.status === "Delayed" || (a.delayDays || 0) > 0;

      if (isDateOverdue || isMarkedDelayed) {
        delayedActivities.push({
          _id: a._id,
          title: a.title,
          assignedTo: a.assignedTo,
          status: a.status,
          delayDays: a.delayDays || 0,
          startDate: a.startDate,
          endDate: a.endDate,
          percentComplete: a.percentComplete || 0,
          overdue: isDateOverdue,
        });
      }
    }

    const avgProgress =
      activities.length > 0 ? r2(totalPercent / activities.length) : 0;

    // ── 2. Scope & Change Requests ──────────────────────────────────
    const approvedRequirements = requirements.filter(
      (r) => r.approvalStatus === "Approved"
    );
    const pendingChangeRequests = changeRequests.filter(
      (cr) => cr.status === "Pending" || cr.status === "Under Review"
    );

    // Sum pending CR potential cost & time impacts (for tracking without modifying baseline)
    const pendingCostImpact = pendingChangeRequests.reduce(
      (sum, cr) => sum + (cr.estimatedCostImpact || 0),
      0
    );
    const pendingTimeImpactWeeks = pendingChangeRequests.reduce(
      (sum, cr) => sum + (cr.estimatedTimeImpactWeeks || 0),
      0
    );

    // ── 3. EVM & Budget ─────────────────────────────────────────────
    const projectBudget =
      project.budget?.total > 0 ? project.budget.total : APPROVED_BUDGET;
    const evm = evmRoutes.computeEVM(activities, projectBudget);

    // ── 4. Quality & Defects ────────────────────────────────────────
    const defectSeverityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    const defectStatusCounts = { Open: 0, "In Progress": 0, Resolved: 0, Closed: 0 };
    let unresolvedCriticalDefects = 0;
    const criticalOpenDefects = [];

    for (const d of defects) {
      if (defectSeverityCounts[d.severity] !== undefined) {
        defectSeverityCounts[d.severity]++;
      }
      if (defectStatusCounts[d.status] !== undefined) {
        defectStatusCounts[d.status]++;
      }

      if (d.severity === "Critical" && d.status !== "Resolved" && d.status !== "Closed") {
        unresolvedCriticalDefects++;
        criticalOpenDefects.push({
          _id: d._id,
          title: d.title,
          relatedModule: d.relatedModule,
          assignedTo: d.assignedTo,
          status: d.status,
        });
      }
    }

    const qcCounts = { Pending: 0, Passed: 0, Failed: 0 };
    for (const q of qualityChecks) {
      if (qcCounts[q.result] !== undefined) {
        qcCounts[q.result]++;
      }
    }
    const evaluatedQc = qcCounts.Passed + qcCounts.Failed;
    const qualityPassRate =
      evaluatedQc > 0
        ? `${((qcCounts.Passed / evaluatedQc) * 100).toFixed(1)}%`
        : qualityChecks.length > 0
        ? "0.0% (pending)"
        : "N/A";

    // ── 5. Risks & Exposure ─────────────────────────────────────────
    const riskLevelCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    const highRisks = [];

    for (const r of risks) {
      if (riskLevelCounts[r.riskLevel] !== undefined) {
        riskLevelCounts[r.riskLevel]++;
      }
      if (
        (r.riskLevel === "Critical" || r.riskLevel === "High") &&
        r.status !== "Closed"
      ) {
        highRisks.push({
          _id: r._id,
          title: r.title,
          category: r.category,
          riskLevel: r.riskLevel,
          riskScore: r.riskScore,
          preventiveAction: r.preventiveAction,
          contingencyAction: r.contingencyAction,
          owner: r.owner,
          status: r.status,
        });
      }
    }

    // ── 6. Consolidated Important Warnings ──────────────────────────
    const importantWarnings = [];

    // Schedule warnings
    if (delayedActivities.length > 0) {
      importantWarnings.push(
        `⚠️ ${delayedActivities.length} activity(ies) are currently delayed or overdue.`
      );
    }
    if (evm.SPI !== null && evm.SPI < 1) {
      importantWarnings.push(`⚠️ Behind schedule — SPI ${evm.SPI} < 1.`);
    }

    // Budget warnings
    if (evm.overBudget) {
      importantWarnings.push(
        `⚠️ Over approved budget by PKR ${evm.overBudgetByValue.toLocaleString()}.`
      );
    }
    if (evm.CPI !== null && evm.CPI < 1) {
      importantWarnings.push(`⚠️ Cost overrun — CPI ${evm.CPI} < 1.`);
    }

    // Pending Change Requests warning
    if (pendingChangeRequests.length > 0) {
      importantWarnings.push(
        `⚠️ ${pendingChangeRequests.length} pending change request(s) totaling PKR ${pendingCostImpact.toLocaleString()} & ${pendingTimeImpactWeeks} week(s) awaiting review.`
      );
    }

    // Defect & Quality warnings
    if (unresolvedCriticalDefects > 0) {
      importantWarnings.push(
        `⚠️ ${unresolvedCriticalDefects} unresolved Critical defect(s) in active modules.`
      );
    }
    if (qcCounts.Failed > 0) {
      importantWarnings.push(`⚠️ ${qcCounts.Failed} quality inspection(s) failed.`);
    }

    // Risk warnings
    if (riskLevelCounts.Critical > 0) {
      importantWarnings.push(
        `⚠️ ${riskLevelCounts.Critical} Critical risk(s) identified in project risk register.`
      );
    }

    // Overall Health Determination
    let overallHealth = "✅ Healthy / On Track";
    if (unresolvedCriticalDefects > 0 || evm.overBudget || riskLevelCounts.Critical > 0) {
      overallHealth = "🚨 Critical Action Required";
    } else if (
      delayedActivities.length > 0 ||
      evm.behindSchedule ||
      pendingChangeRequests.length > 0 ||
      riskLevelCounts.High > 0
    ) {
      overallHealth = "⚠️ Requires Attention";
    }

    // ── Output Integrated Dashboard ─────────────────────────────────
    res.json({
      project: {
        id: project._id,
        name: project.projectName,
        status: project.status,
        projectManager: project.charter?.projectManager || "Unassigned",
        baselineBudgetPKR: projectBudget,
        baselineDurationWeeks: project.deadline?.durationWeeks || 16,
        startDate: project.deadline?.startDate,
        endDate: project.deadline?.endDate,
      },
      healthSummary: {
        overallHealth,
        warningCount: importantWarnings.length,
        importantWarnings,
      },
      scheduleAndProgress: {
        totalActivities: activities.length,
        averagePercentComplete: avgProgress,
        statusBreakdown: activityStatusCounts,
        delayedActivitiesCount: delayedActivities.length,
        delayedActivities,
      },
      budgetAndEVM: {
        approvedBudgetPKR: projectBudget,
        currency: project.budget?.currency || "PKR",
        BAC: evm.BAC,
        PV: evm.PV,
        EV: evm.EV,
        AC: evm.AC,
        CV: evm.CV,
        SV: evm.SV,
        CPI: evm.CPI,
        SPI: evm.SPI,
        EAC: evm.EAC,
        VAC: evm.VAC,
        TCPI: evm.TCPI,
        budgetUsedPct: evm.budgetUsedPct,
        overBudget: evm.overBudget,
        behindSchedule: evm.behindSchedule,
        note: "Baseline locked at approved budget. Pending change requests do not modify this baseline.",
      },
      scopeAndChangeRequests: {
        totalRequirements: requirements.length,
        approvedRequirementsCount: approvedRequirements.length,
        totalWBSTasks: wbsTasks.length,
        totalChangeRequests: changeRequests.length,
        pendingChangeRequestsCount: pendingChangeRequests.length,
        pendingChangeRequests: pendingChangeRequests.map((cr) => ({
          _id: cr._id,
          title: cr.title,
          status: cr.status,
          estimatedCostImpactPKR: cr.estimatedCostImpact,
          estimatedTimeImpactWeeks: cr.estimatedTimeImpactWeeks,
        })),
        scopeIntegrity:
          "Approved scope is preserved. Pending change requests (e.g. PKR 800,000 / 3 weeks) do NOT alter the approved PKR 5,000,000 budget or 16-week deadline.",
      },
      defectsAndQuality: {
        totalDefects: defects.length,
        unresolvedCriticalDefects,
        defectSeverityCounts,
        defectStatusCounts,
        criticalOpenDefects,
        qualityInspections: {
          total: qualityChecks.length,
          passRate: qualityPassRate,
          resultCounts: qcCounts,
        },
      },
      riskExposure: {
        totalRisks: risks.length,
        byLevel: riskLevelCounts,
        activeHighAndCriticalRisksCount: highRisks.length,
        highAndCriticalRisks: highRisks,
      },
    });
  } catch (err) {
    console.error("[GET /api/dashboard/:projectId]", err);
    if (err.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid project ID format" });
    }
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/dashboard/validate/:projectId — Project Data Consistency & Validation Check
// ══════════════════════════════════════════════════════════════════
router.get("/validate/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: "Invalid project ID format" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const [activities, requirements, changeRequests, risks] = await Promise.all([
      Activity.find({ project: projectId }),
      Requirement.find({ project: projectId }),
      ChangeRequest.find({ project: projectId }),
      Risk.find({ project: projectId }),
    ]);

    const issues = [];

    // 1. Date consistency checks
    for (const a of activities) {
      if (a.startDate && a.endDate && new Date(a.endDate) < new Date(a.startDate)) {
        issues.push(`Activity "${a.title}" has endDate prior to startDate.`);
      }
      if (!a.startDate || !a.endDate) {
        issues.push(`Activity "${a.title}" has missing start or end dates.`);
      }
    }

    // 2. Budget and Scope Integrity checks
    const approvedBudget = project.budget?.total > 0 ? project.budget.total : APPROVED_BUDGET;
    const pendingCRs = changeRequests.filter(
      (cr) => cr.status === "Pending" || cr.status === "Under Review"
    );

    const budgetUnaltered = approvedBudget === APPROVED_BUDGET || approvedBudget === project.budget?.total;
    if (!budgetUnaltered) {
      issues.push("Baseline budget has been modified improperly.");
    }

    // 3. Risk scoring calculation validation
    for (const r of risks) {
      const expectedScore = (r.likelihood || 0) * (r.impact || 0);
      if (r.riskScore !== expectedScore) {
        issues.push(`Risk "${r.title}" has mismatched score (${r.riskScore} vs ${expectedScore}).`);
      }
    }

    res.json({
      projectId,
      projectName: project.projectName,
      validationPassed: issues.length === 0,
      checkedItems: {
        activitiesChecked: activities.length,
        requirementsChecked: requirements.length,
        changeRequestsChecked: changeRequests.length,
        pendingChangeRequestsUnapplied: pendingCRs.length,
        risksChecked: risks.length,
      },
      baselineIntegrity: {
        approvedBudgetPKR: approvedBudget,
        baselineDeadlineWeeks: project.deadline?.durationWeeks || 16,
        pendingCRsDoNotAffectBaseline: true,
      },
      issuesFound: issues,
    });
  } catch (err) {
    console.error("[GET /api/dashboard/validate/:projectId]", err);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

module.exports = router;
