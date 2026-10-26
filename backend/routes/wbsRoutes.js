const express = require("express");
const router = express.Router();
const WBSTask = require("../models/WBSTask");
const Requirement = require("../models/Requirement");
const Project = require("../models/Project");

// Helper — verify project exists
async function projectExists(id, res) {
  const p = await Project.findById(id);
  if (!p) { res.status(404).json({ error: "Project not found" }); return false; }
  return true;
}

// POST /api/wbs — Create WBS task
router.post("/", async (req, res) => {
  try {
    const { project, title, wbsCode, requirement, parent } = req.body;
    if (!project) return res.status(400).json({ error: "project is required" });
    if (!title || !title.trim()) return res.status(400).json({ error: "title is required" });
    if (!wbsCode || !wbsCode.trim()) return res.status(400).json({ error: "wbsCode is required" });
    if (!await projectExists(project, res)) return;

    // If a requirement is linked, it must be Approved
    if (requirement) {
      const req_ = await Requirement.findById(requirement);
      if (!req_) return res.status(404).json({ error: "Requirement not found" });
      if (req_.approvalStatus !== "Approved") {
        return res.status(400).json({ error: "Only Approved requirements can be linked to WBS tasks" });
      }
    }

    // If parent is given, verify it exists and belongs to same project
    if (parent) {
      const parentTask = await WBSTask.findById(parent);
      if (!parentTask) return res.status(404).json({ error: "Parent WBS task not found" });
      if (String(parentTask.project) !== String(project)) {
        return res.status(400).json({ error: "Parent task must belong to the same project" });
      }
    }

    const duplicateCode = await WBSTask.exists({ project, wbsCode: wbsCode.trim() });
    if (duplicateCode) return res.status(409).json({ error: "WBS code already exists in this project" });

    const task = await WBSTask.create(req.body);
    res.status(201).json(task);
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/wbs?project=<id> — List WBS tasks (flat, filter by project)
router.get("/", async (req, res) => {
  try {
    const filter = req.query.project ? { project: req.query.project } : {};
    const tasks = await WBSTask.find(filter)
      .populate("parent", "wbsCode title")
      .populate("requirement", "title approvalStatus")
      .sort({ wbsCode: 1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/wbs/project/:projectId/tree — Hierarchical tree
router.get("/project/:projectId/tree", async (req, res) => {
  try {
    if (!await projectExists(req.params.projectId, res)) return;
    let all = await WBSTask.find({ project: req.params.projectId })
      .populate("requirement", "title approvalStatus")
      .lean().sort({ wbsCode: 1 });

    // Backfill missing legacy parent links from conventional WBS numbering, without
    // changing any existing explicit parent relationship or deleting records.
    const byCode = new Map(all.map(t => [t.wbsCode, t]));
    const backfills = [];
    for (const task of all) {
      if (task.parent) continue;
      const parts = task.wbsCode.split(".");
      const parentCode = parts.length === 2
        ? `${parts[0]}.0`
        : parts.length > 2 ? parts.slice(0, -1).join(".") : null;
      const parentTask = parentCode && byCode.get(parentCode);
      if (parentTask && String(parentTask._id) !== String(task._id)) {
        backfills.push({ updateOne: { filter: { _id: task._id, parent: null }, update: { $set: { parent: parentTask._id } } } });
      }
    }
    if (backfills.length) {
      await WBSTask.bulkWrite(backfills);
      all = await WBSTask.find({ project: req.params.projectId })
        .populate("requirement", "title approvalStatus")
        .lean().sort({ wbsCode: 1 });
    }

    // Build tree
    const map = {};
    all.forEach(t => { map[t._id] = { ...t, children: [] }; });
    const roots = [];
    all.forEach(t => {
      if (t.parent && map[t.parent]) {
        map[t.parent].children.push(map[t._id]);
      } else {
        roots.push(map[t._id]);
      }
    });
    res.json(roots);
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/wbs/:id — Single WBS task
router.get("/:id", async (req, res) => {
  try {
    const task = await WBSTask.findById(req.params.id)
      .populate("parent", "wbsCode title")
      .populate("requirement", "title approvalStatus");
    if (!task) return res.status(404).json({ error: "WBS task not found" });
    res.json(task);
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/wbs/:id — Update WBS task
router.put("/:id", async (req, res) => {
  try {
    if (req.body.parent) {
      const [taskBeingUpdated, parentTask] = await Promise.all([
        WBSTask.findById(req.params.id), WBSTask.findById(req.body.parent),
      ]);
      if (!taskBeingUpdated) return res.status(404).json({ error: "WBS task not found" });
      if (!parentTask) return res.status(404).json({ error: "Parent WBS task not found" });
      if (String(parentTask.project) !== String(taskBeingUpdated.project)) return res.status(400).json({ error: "Parent task must belong to the same project" });
      if (String(parentTask._id) === String(taskBeingUpdated._id)) return res.status(400).json({ error: "A WBS item cannot be its own parent" });
      let ancestor = parentTask;
      while (ancestor?.parent) {
        if (String(ancestor.parent) === String(taskBeingUpdated._id)) return res.status(400).json({ error: "Parent assignment would create a cycle" });
        ancestor = await WBSTask.findById(ancestor.parent);
      }
    }
    // If changing requirement, verify it's Approved
    if (req.body.requirement) {
      const req_ = await Requirement.findById(req.body.requirement);
      if (!req_) return res.status(404).json({ error: "Requirement not found" });
      if (req_.approvalStatus !== "Approved") {
        return res.status(400).json({ error: "Only Approved requirements can be linked to WBS tasks" });
      }
    }
    const task = await WBSTask.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!task) return res.status(404).json({ error: "WBS task not found" });
    res.json(task);
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/wbs/:id/status — Update task status
router.patch("/:id/status", async (req, res) => {
  try {
    const allowed = ["Not Started", "In Progress", "Completed", "On Hold"];
    const { status } = req.body;
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
    }
    const task = await WBSTask.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!task) return res.status(404).json({ error: "WBS task not found" });
    res.json(task);
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/wbs/:id — Delete a leaf task (no children allowed)
router.delete("/:id", async (req, res) => {
  try {
    const hasChildren = await WBSTask.exists({ parent: req.params.id });
    if (hasChildren) {
      return res.status(400).json({ error: "Cannot delete a task that has child tasks. Delete children first." });
    }
    const task = await WBSTask.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: "WBS task not found" });
    res.json({ message: "WBS task deleted", id: req.params.id });
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
