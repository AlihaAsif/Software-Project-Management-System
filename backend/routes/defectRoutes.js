const express = require("express");
const router = express.Router();
const Defect = require("../models/Defect");
const Project = require("../models/Project");

async function projectExists(id, res) {
  const p = await Project.findById(id);
  if (!p) { res.status(404).json({ error: "Project not found" }); return false; }
  return true;
}

// POST /api/defects — Create defect
router.post("/", async (req, res) => {
  try {
    const { project, title, severity } = req.body;
    if (!project)          return res.status(400).json({ error: "project is required" });
    if (!title?.trim())    return res.status(400).json({ error: "title is required" });
    if (!severity)         return res.status(400).json({ error: "severity is required" });
    if (!await projectExists(project, res)) return;

    const defect = await Defect.create(req.body);
    res.status(201).json(defect);
  } catch (err) {
    console.error("[POST /api/defects]", err);
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    if (err.kind === "ObjectId")        return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// GET /api/defects?project=&severity=&status=&relatedModule=
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.project)       filter.project       = req.query.project;
    if (req.query.severity)      filter.severity      = req.query.severity;
    if (req.query.status)        filter.status        = req.query.status;
    if (req.query.relatedModule) filter.relatedModule = new RegExp(req.query.relatedModule, "i");
    const defects = await Defect.find(filter).sort({ createdAt: -1 });
    res.json(defects);
  } catch (err) {
    console.error("[GET /api/defects]", err);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// GET /api/defects/:id
router.get("/:id", async (req, res) => {
  try {
    const defect = await Defect.findById(req.params.id);
    if (!defect) return res.status(404).json({ error: "Defect not found" });
    res.json(defect);
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// PUT /api/defects/:id — Full update
router.put("/:id", async (req, res) => {
  try {
    const defect = await Defect.findById(req.params.id);
    if (!defect) return res.status(404).json({ error: "Defect not found" });
    Object.assign(defect, req.body);
    await defect.save();
    res.json(defect);
  } catch (err) {
    console.error("[PUT /api/defects/:id]", err);
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    if (err.kind === "ObjectId")        return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// PATCH /api/defects/:id/status
router.patch("/:id/status", async (req, res) => {
  try {
    const allowed = ["Open", "In Progress", "Resolved", "Closed"];
    const { status } = req.body;
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
    }
    const defect = await Defect.findById(req.params.id);
    if (!defect) return res.status(404).json({ error: "Defect not found" });
    defect.status = status;
    if (req.body.resolutionNotes) defect.resolutionNotes = req.body.resolutionNotes;
    await defect.save(); // triggers pre-save for resolvedAt
    res.json(defect);
  } catch (err) {
    console.error("[PATCH /api/defects/:id/status]", err);
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// DELETE /api/defects/:id
router.delete("/:id", async (req, res) => {
  try {
    const defect = await Defect.findByIdAndDelete(req.params.id);
    if (!defect) return res.status(404).json({ error: "Defect not found" });
    res.json({ message: "Defect deleted", id: req.params.id });
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

module.exports = router;
