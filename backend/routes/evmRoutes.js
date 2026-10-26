const express = require("express");
const router = express.Router();
const Activity = require("../models/Activity");
const Project = require("../models/Project");

// ── Constants ──────────────────────────────────────────────────────
const APPROVED_BUDGET = 5_000_000; // PKR — locked; pending CR not applied

// ── Safe division (returns null if divisor is 0) ──────────────────
function safeDivide(numerator, denominator) {
  if (!denominator || denominator === 0) return null;
  return parseFloat((numerator / denominator).toFixed(4));
}

// ── Round to 2 decimal places ─────────────────────────────────────
function r2(n) {
  return parseFloat(n.toFixed(2));
}

// ── EVM core calculator (works on an array of activity docs) ──────
function computeEVM(activities, projectBudget) {
  let PV = 0; // Planned Value  (BCWS) — sum of plannedCost
  let EV = 0; // Earned Value   (BCWP) — sum of BAC × percentComplete
  let AC = 0; // Actual Cost    (AC)   — sum of actualCost
  let BAC = 0; // Budget at Completion

  for (const a of activities) {
    const bac = a.estimatedCost || 0;
    BAC += bac;
    PV  += a.plannedCost || 0;
    AC  += a.actualCost  || 0;
    EV  += bac * ((a.percentComplete || 0) / 100);
  }

  const CPI = safeDivide(EV, AC);   // Cost Performance Index
  const SPI = safeDivide(EV, PV);   // Schedule Performance Index

  const CV  = r2(EV - AC);          // Cost Variance
  const SV  = r2(EV - PV);          // Schedule Variance

  // Estimate At Completion — EAC = AC + (BAC - EV) / CPI
  const EAC = CPI ? r2(AC + (BAC - EV) / CPI) : null;
  // Variance At Completion
  const VAC = EAC !== null ? r2(BAC - EAC) : null;
  // To-Complete Performance Index — TCPI = (BAC - EV) / (BAC - AC)
  const TCPI = safeDivide(BAC - EV, BAC - AC);

  const budgetUsedPct     = safeDivide(AC, projectBudget) * 100;
  const overBudget        = AC > projectBudget;
  const behindSchedule    = SPI !== null && SPI < 1;
  const overBudgetByValue = r2(AC - projectBudget); // negative means under budget

  const warnings = [];
  if (overBudget)     warnings.push(`⚠️ Over approved budget by PKR ${r2(AC - projectBudget).toLocaleString()}`);
  if (behindSchedule) warnings.push(`⚠️ Behind schedule — SPI ${SPI} < 1`);
  if (CPI !== null && CPI < 1)  warnings.push(`⚠️ Cost overrun — CPI ${CPI} < 1 (spending more than planned per unit of work)`);
  if (TCPI !== null && TCPI > 1.2) warnings.push(`⚠️ Difficult recovery — TCPI ${TCPI} > 1.2`);

  return {
    // Raw EVM metrics
    BAC:  r2(BAC),
    PV:   r2(PV),
    EV:   r2(EV),
    AC:   r2(AC),
    // Indices
    CPI,
    SPI,
    // Variances
    CV,
    SV,
    // Projections
    EAC,
    VAC,
    TCPI,
    // Budget context
    approvedBudget: projectBudget,
    budgetUsedPct:  budgetUsedPct !== null ? r2(budgetUsedPct) : null,
    overBudget,
    overBudgetByValue,
    behindSchedule,
    warnings,
  };
}

// ══════════════════════════════════════════════════════════════════
// GET /api/evm/:projectId/summary
// Full EVM summary for a project
// ══════════════════════════════════════════════════════════════════
router.get("/:projectId/summary", async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    // Use stored budget.total if set; else fall back to approved constant
    const projectBudget =
      project.budget?.total > 0 ? project.budget.total : APPROVED_BUDGET;

    const activities = await Activity.find({ project: req.params.projectId });
    const evm = computeEVM(activities, projectBudget);

    res.json({
      projectId:   req.params.projectId,
      projectName: project.projectName,
      currency:    project.budget?.currency || "PKR",
      totalActivities: activities.length,
      ...evm,
      note: "Pending PKR 800,000 change request is NOT included in this budget.",
    });
  } catch (err) {
    console.error("[GET /api/evm/:projectId/summary]", err);
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid project ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/evm/:projectId/activities
// Activity-level cost report — one row per activity with its EV metrics
// ══════════════════════════════════════════════════════════════════
router.get("/:projectId/activities", async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const activities = await Activity.find({ project: req.params.projectId })
      .sort({ startDate: 1 });

    const report = activities.map(a => {
      const bac = a.estimatedCost || 0;
      const ev  = r2(bac * ((a.percentComplete || 0) / 100));
      const ac  = a.actualCost || 0;
      const pv  = a.plannedCost || 0;
      return {
        _id:             a._id,
        title:           a.title,
        assignedTo:      a.assignedTo,
        status:          a.status,
        percentComplete: a.percentComplete,
        BAC:  bac,
        PV:   pv,
        EV:   ev,
        AC:   ac,
        CV:   r2(ev - ac),
        SV:   r2(ev - pv),
        CPI:  safeDivide(ev, ac),
        SPI:  safeDivide(ev, pv),
        overBudget:     ac > bac,
        behindSchedule: safeDivide(ev, pv) !== null && safeDivide(ev, pv) < 1,
      };
    });

    res.json({
      projectId:   req.params.projectId,
      projectName: project.projectName,
      currency:    project.budget?.currency || "PKR",
      activities:  report,
    });
  } catch (err) {
    console.error("[GET /api/evm/:projectId/activities]", err);
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid project ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/evm/:projectId/warnings
// Only the warnings array — lightweight health check
// ══════════════════════════════════════════════════════════════════
router.get("/:projectId/warnings", async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const projectBudget =
      project.budget?.total > 0 ? project.budget.total : APPROVED_BUDGET;

    const activities = await Activity.find({ project: req.params.projectId });
    const { warnings, overBudget, behindSchedule, CPI, SPI } = computeEVM(
      activities,
      projectBudget
    );

    res.json({
      projectId: req.params.projectId,
      health:    warnings.length === 0 ? "✅ On track" : "⚠️ Attention required",
      overBudget,
      behindSchedule,
      CPI,
      SPI,
      warnings,
    });
  } catch (err) {
    console.error("[GET /api/evm/:projectId/warnings]", err);
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid project ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

router.computeEVM = computeEVM;
router.APPROVED_BUDGET = APPROVED_BUDGET;

module.exports = router;
