const express = require("express");
const router = express.Router();
const QualityCheck = require("../models/QualityCheck");
const Project = require("../models/Project");

async function projectExists(id, res) {
  const p = await Project.findById(id);
  if (!p) { res.status(404).json({ error: "Project not found" }); return false; }
  return true;
}

// POST /api/quality — Create quality check / inspection
router.post("/", async (req, res) => {
  try {
    const { project, title } = req.body;
    if (!project)       return res.status(400).json({ error: "project is required" });
    if (!title?.trim()) return res.status(400).json({ error: "title is required" });
    if (!await projectExists(project, res)) return;

    const qc = await QualityCheck.create(req.body);
    res.status(201).json(qc);
  } catch (err) {
    console.error("[POST /api/quality]", err);
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    if (err.kind === "ObjectId")        return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// GET /api/quality?project=&result=&relatedModule=
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.project)       filter.project       = req.query.project;
    if (req.query.result)        filter.result        = req.query.result;
    if (req.query.relatedModule) filter.relatedModule = new RegExp(req.query.relatedModule, "i");
    const checks = await QualityCheck.find(filter).sort({ createdAt: -1 });
    res.json(checks);
  } catch (err) {
    console.error("[GET /api/quality]", err);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// GET /api/quality/:id
router.get("/:id", async (req, res) => {
  try {
    const qc = await QualityCheck.findById(req.params.id);
    if (!qc) return res.status(404).json({ error: "Quality check not found" });
    res.json(qc);
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// PUT /api/quality/:id — Update (e.g. fill in checklist results, set result/checkedBy)
router.put("/:id", async (req, res) => {
  try {
    const qc = await QualityCheck.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!qc) return res.status(404).json({ error: "Quality check not found" });
    res.json(qc);
  } catch (err) {
    console.error("[PUT /api/quality/:id]", err);
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    if (err.kind === "ObjectId")        return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// PATCH /api/quality/:id/result — Finalise inspection result
router.patch("/:id/result", async (req, res) => {
  try {
    const allowed = ["Pending", "Passed", "Failed"];
    const { result, checkedBy, notes } = req.body;
    if (!result || !allowed.includes(result)) {
      return res.status(400).json({ error: `result must be one of: ${allowed.join(", ")}` });
    }
    const update = { result };
    if (checkedBy) update.checkedBy = checkedBy;
    if (notes)     update.notes     = notes;
    if (result !== "Pending") update.checkedAt = new Date();

    const qc = await QualityCheck.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!qc) return res.status(404).json({ error: "Quality check not found" });
    res.json(qc);
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// DELETE /api/quality/:id
router.delete("/:id", async (req, res) => {
  try {
    const qc = await QualityCheck.findByIdAndDelete(req.params.id);
    if (!qc) return res.status(404).json({ error: "Quality check not found" });
    res.json({ message: "Quality check deleted", id: req.params.id });
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

module.exports = router;
