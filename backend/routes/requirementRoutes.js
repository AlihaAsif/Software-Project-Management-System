const express = require("express");
const router = express.Router();
const Requirement = require("../models/Requirement");
const Project = require("../models/Project");

// Helper — verify project exists
async function projectExists(id, res) {
  const p = await Project.findById(id);
  if (!p) { res.status(404).json({ error: "Project not found" }); return false; }
  return true;
}

// POST /api/requirements — Create requirement
router.post("/", async (req, res) => {
  try {
    const { project, title } = req.body;
    if (!project) return res.status(400).json({ error: "project is required" });
    if (!title || !title.trim()) return res.status(400).json({ error: "title is required" });
    if (!await projectExists(project, res)) return;
    const req_ = await Requirement.create(req.body);
    res.status(201).json(req_);
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/requirements?project=<id> — List requirements (filter by project)
router.get("/", async (req, res) => {
  try {
    const filter = req.query.project ? { project: req.query.project } : {};
    const requirements = await Requirement.find(filter).sort({ createdAt: -1 });
    res.json(requirements);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/requirements/:id — Single requirement
router.get("/:id", async (req, res) => {
  try {
    const r = await Requirement.findById(req.params.id);
    if (!r) return res.status(404).json({ error: "Requirement not found" });
    res.json(r);
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/requirements/:id — Update requirement (only if still Pending)
router.put("/:id", async (req, res) => {
  try {
    const r = await Requirement.findById(req.params.id);
    if (!r) return res.status(404).json({ error: "Requirement not found" });
    if (r.approvalStatus === "Approved") {
      return res.status(400).json({ error: "Approved requirements cannot be edited directly. Submit a Change Request." });
    }
    Object.assign(r, req.body);
    await r.save();
    res.json(r);
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/requirements/:id/priority — Update priority only
router.patch("/:id/priority", async (req, res) => {
  try {
    const allowed = ["Low", "Medium", "High", "Critical"];
    const { priority } = req.body;
    if (!priority || !allowed.includes(priority)) {
      return res.status(400).json({ error: `priority must be one of: ${allowed.join(", ")}` });
    }
    const r = await Requirement.findByIdAndUpdate(
      req.params.id,
      { priority },
      { new: true }
    );
    if (!r) return res.status(404).json({ error: "Requirement not found" });
    res.json(r);
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/requirements/:id/approve — Approve requirement (adds to approved scope)
router.patch("/:id/approve", async (req, res) => {
  try {
    const { approvedBy } = req.body;
    const r = await Requirement.findById(req.params.id);
    if (!r) return res.status(404).json({ error: "Requirement not found" });
    if (r.approvalStatus === "Approved") {
      return res.status(400).json({ error: "Requirement is already approved" });
    }
    r.approvalStatus = "Approved";
    r.approvedBy = approvedBy || "";
    r.approvedAt = new Date();
    r.rejectionReason = undefined;
    await r.save();
    res.json(r);
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/requirements/:id/reject — Reject requirement
router.patch("/:id/reject", async (req, res) => {
  try {
    const r = await Requirement.findById(req.params.id);
    if (!r) return res.status(404).json({ error: "Requirement not found" });
    if (r.approvalStatus === "Approved") {
      return res.status(400).json({ error: "Cannot reject an already-approved requirement. Submit a Change Request." });
    }
    r.approvalStatus = "Rejected";
    r.rejectionReason = req.body.rejectionReason || "";
    await r.save();
    res.json(r);
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/requirements/project/:projectId/scope — Approved scope only
router.get("/project/:projectId/scope", async (req, res) => {
  try {
    if (!await projectExists(req.params.projectId, res)) return;
    const approved = await Requirement.find({
      project: req.params.projectId,
      approvalStatus: "Approved",
    }).sort({ priority: 1 });
    res.json(approved);
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/requirements/:id — Delete (only if not Approved)
router.delete("/:id", async (req, res) => {
  try {
    const r = await Requirement.findById(req.params.id);
    if (!r) return res.status(404).json({ error: "Requirement not found" });
    if (r.approvalStatus === "Approved") {
      return res.status(400).json({ error: "Approved requirements cannot be deleted. Submit a Change Request." });
    }
    await Requirement.findByIdAndDelete(req.params.id);
    res.json({ message: "Requirement deleted", id: req.params.id });
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
