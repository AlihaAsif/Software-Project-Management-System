const express = require("express");
const router = express.Router();
const Risk = require("../models/Risk");
const Project = require("../models/Project");

async function projectExists(id, res) {
  const p = await Project.findById(id);
  if (!p) { res.status(404).json({ error: "Project not found" }); return false; }
  return true;
}

// ── Risk matrix helper ─────────────────────────────────────────────
// Returns a 5×5 matrix: riskMatrix[likelihood-1][impact-1] = level
function buildRiskMatrix(risks) {
  // Initialise 5×5 grid with counts
  const matrix = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (const r of risks) {
    const l = (r.likelihood || 1) - 1;
    const i = (r.impact || 1) - 1;
    matrix[l][i]++;
  }
  // Build labelled rows for easy rendering
  const labels = ["1 (Very Low)", "2 (Low)", "3 (Medium)", "4 (High)", "5 (Very High)"];
  return {
    axes: { rows: "Likelihood (1-5)", cols: "Impact (1-5)" },
    rows: matrix.map((row, li) => ({
      likelihood: labels[li],
      cells: row.map((count, ii) => ({
        impact: labels[ii],
        riskCount: count,
        level: classifyScore((li + 1) * (ii + 1)),
      })),
    })),
  };
}

function classifyScore(score) {
  if (score >= 20) return "Critical";
  if (score >= 13) return "High";
  if (score >= 6)  return "Medium";
  return "Low";
}

// POST /api/risks — Create risk
router.post("/", async (req, res) => {
  try {
    const { project, title, likelihood, impact } = req.body;
    if (!project)                    return res.status(400).json({ error: "project is required" });
    if (!title?.trim())              return res.status(400).json({ error: "title is required" });
    if (likelihood === undefined)    return res.status(400).json({ error: "likelihood is required (1-5)" });
    if (impact === undefined)        return res.status(400).json({ error: "impact is required (1-5)" });
    if (!await projectExists(project, res)) return;

    const risk = await Risk.create(req.body);
    res.status(201).json(risk);
  } catch (err) {
    console.error("[POST /api/risks]", err);
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    if (err.kind === "ObjectId")        return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// GET /api/risks?project=&riskLevel=&status=&category=
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.project)   filter.project   = req.query.project;
    if (req.query.riskLevel) filter.riskLevel  = req.query.riskLevel;
    if (req.query.status)    filter.status     = req.query.status;
    if (req.query.category)  filter.category   = new RegExp(req.query.category, "i");
    const risks = await Risk.find(filter).sort({ riskScore: -1 });
    res.json(risks);
  } catch (err) {
    console.error("[GET /api/risks]", err);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// GET /api/risks/:id
router.get("/:id", async (req, res) => {
  try {
    const risk = await Risk.findById(req.params.id);
    if (!risk) return res.status(404).json({ error: "Risk not found" });
    res.json(risk);
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// PUT /api/risks/:id — Full update (score/level auto-recomputed by pre-save)
router.put("/:id", async (req, res) => {
  try {
    const risk = await Risk.findById(req.params.id);
    if (!risk) return res.status(404).json({ error: "Risk not found" });
    Object.assign(risk, req.body);
    await risk.save(); // triggers pre-save → recomputes riskScore/riskLevel
    res.json(risk);
  } catch (err) {
    console.error("[PUT /api/risks/:id]", err);
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    if (err.kind === "ObjectId")        return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// PATCH /api/risks/:id/status — Update risk status only
router.patch("/:id/status", async (req, res) => {
  try {
    const allowed = ["Open", "Mitigated", "Closed", "Identified", "Analysed", "Mitigating"];
    const { status } = req.body;
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
    }
    const risk = await Risk.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!risk) return res.status(404).json({ error: "Risk not found" });
    res.json(risk);
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// PATCH /api/risks/:id/response — Update PDPC response fields only
router.patch("/:id/response", async (req, res) => {
  try {
    const { responseStrategy, mitigationPlan, preventiveAction, contingencyAction, owner } = req.body;
    const update = {};
    if (responseStrategy)  update.responseStrategy  = responseStrategy;
    if (mitigationPlan)    update.mitigationPlan    = mitigationPlan;
    if (preventiveAction)  update.preventiveAction  = preventiveAction;
    if (contingencyAction) update.contingencyAction = contingencyAction;
    if (owner)             update.owner             = owner;

    if (!Object.keys(update).length) {
      return res.status(400).json({
        error: "Provide at least one of: responseStrategy, mitigationPlan, preventiveAction, contingencyAction, owner",
      });
    }
    const risk = await Risk.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!risk) return res.status(404).json({ error: "Risk not found" });
    res.json(risk);
  } catch (err) {
    console.error("[PATCH /api/risks/:id/response]", err);
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    if (err.kind === "ObjectId")        return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// DELETE /api/risks/:id
router.delete("/:id", async (req, res) => {
  try {
    const risk = await Risk.findByIdAndDelete(req.params.id);
    if (!risk) return res.status(404).json({ error: "Risk not found" });
    res.json({ message: "Risk deleted", id: req.params.id });
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// GET /api/risks/project/:projectId/matrix — Risk matrix view
router.get("/project/:projectId/matrix", async (req, res) => {
  try {
    if (!await projectExists(req.params.projectId, res)) return;
    const risks = await Risk.find({ project: req.params.projectId }).lean();
    res.json({
      projectId: req.params.projectId,
      totalRisks: risks.length,
      riskMatrix: buildRiskMatrix(risks),
      byLevel: {
        Critical: risks.filter(r => r.riskLevel === "Critical").length,
        High:     risks.filter(r => r.riskLevel === "High").length,
        Medium:   risks.filter(r => r.riskLevel === "Medium").length,
        Low:      risks.filter(r => r.riskLevel === "Low").length,
      },
    });
  } catch (err) {
    console.error("[GET /api/risks/project/:projectId/matrix]", err);
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

module.exports = router;
