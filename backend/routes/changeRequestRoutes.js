const express = require("express");
const router = express.Router();
const ChangeRequest = require("../models/ChangeRequest");
const Project = require("../models/Project");
const Requirement = require("../models/Requirement");

async function applyApprovedChangeRequest(cr) {
  const project = await Project.findById(cr.project).select("_id budget.total deadline.durationWeeks appliedChangeRequests");
  if (!project) throw new Error("Project not found for approved change request");
  if (project.appliedChangeRequests?.some(id => String(id) === String(cr._id))) return;

  const nextBudget = Number(project.budget?.total || 0) + Number(cr.estimatedCostImpact || 0);
  const nextDuration = Number(project.deadline?.durationWeeks || 0) + Number(cr.estimatedTimeImpactWeeks || 0);
  if (nextBudget < 0 || nextDuration < 0) {
    const error = new Error("Approved impact cannot make the project budget or schedule baseline negative");
    error.statusCode = 400;
    throw error;
  }

  const addsScope = cr.scopeImpact !== "None";
  if (addsScope) {
    await Requirement.findOneAndUpdate(
      { changeRequestApplicationKey: String(cr._id) },
      { $setOnInsert: {
        changeRequestApplicationKey: String(cr._id),
        project: cr.project,
        title: cr.title,
        description: cr.description,
        type: "Functional",
        priority: "Medium",
        approvalStatus: "Approved",
        approvedBy: cr.reviewedBy || "",
        approvedAt: cr.reviewedAt || new Date(),
      } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const costImpact = Number(cr.estimatedCostImpact || 0);
  const weekImpact = Number(cr.estimatedTimeImpactWeeks || 0);
  // Update-pipeline arithmetic uses the current baseline and the marker in one
  // atomic write, so retries cannot apply an impact twice.
  const pipeline = [{ $set: {
    appliedChangeRequests: { $setUnion: [{ $ifNull: ["$appliedChangeRequests", []] }, [cr._id]] },
    "budget.total": { $add: [{ $ifNull: ["$budget.total", 0] }, costImpact] },
    "deadline.durationWeeks": { $max: [0, { $add: [{ $ifNull: ["$deadline.durationWeeks", 0] }, weekImpact] }] },
    __v: { $add: [{ $ifNull: ["$__v", 0] }, 1] },
    ...(weekImpact ? { "deadline.endDate": { $cond: [
      { $ne: [{ $ifNull: ["$deadline.endDate", null] }, null] },
      { $dateAdd: { startDate: "$deadline.endDate", unit: "week", amount: weekImpact } },
      "$deadline.endDate",
    ] } } : {}),
    ...(addsScope ? {
      scopeIncluded: { $setUnion: [{ $ifNull: ["$scopeIncluded", []] }, [cr.title]] },
      "scopeDetails.proposedChanges": { $filter: {
        input: { $ifNull: ["$scopeDetails.proposedChanges", []] },
        as: "proposal",
        cond: { $ne: ["$$proposal", cr.title] },
      } },
    } : {}),
  } }];
  await Project.updateOne({ _id: cr.project, appliedChangeRequests: { $ne: cr._id } }, pipeline);
}

async function validateChangeRequestImpact(cr) {
  const project = await Project.findById(cr.project).select("budget.total deadline.durationWeeks appliedChangeRequests");
  if (!project) throw new Error("Project not found for approved change request");
  if (project.appliedChangeRequests?.some(id => String(id) === String(cr._id))) return;
  const nextBudget = Number(project.budget?.total || 0) + Number(cr.estimatedCostImpact || 0);
  const nextDuration = Number(project.deadline?.durationWeeks || 0) + Number(cr.estimatedTimeImpactWeeks || 0);
  if (!Number.isFinite(nextBudget) || !Number.isFinite(nextDuration) || nextBudget < 0 || nextDuration < 0) {
    const error = new Error("Approved impact cannot make the project budget or schedule baseline negative");
    error.statusCode = 400;
    throw error;
  }
}

// Helper — verify project exists
async function projectExists(id, res) {
  const p = await Project.findById(id);
  if (!p) { res.status(404).json({ error: "Project not found" }); return false; }
  return true;
}

// POST /api/change-requests — Create a change request
router.post("/", async (req, res) => {
  try {
    const { project, title, description } = req.body;
    if (!project) return res.status(400).json({ error: "project is required" });
    if (!title || !title.trim()) return res.status(400).json({ error: "title is required" });
    if (!description || !description.trim()) return res.status(400).json({ error: "description is required" });
    if (!Number.isFinite(Number(req.body.estimatedCostImpact ?? 0))) return res.status(400).json({ error: "estimatedCostImpact must be a valid number" });
    if (!Number.isInteger(Number(req.body.estimatedTimeImpactWeeks ?? 0))) return res.status(400).json({ error: "estimatedTimeImpactWeeks must be a whole number" });
    if (!await projectExists(project, res)) return;
    const cr = await ChangeRequest.create(req.body);
    res.status(201).json(cr);
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/change-requests?project=<id>&status=<status> — List change requests
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.project) filter.project = req.query.project;
    if (req.query.status) filter.status = req.query.status;
    const crs = await ChangeRequest.find(filter).sort({ createdAt: -1 });
    res.json(crs);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/change-requests/:id — Single change request
router.get("/:id", async (req, res) => {
  try {
    const cr = await ChangeRequest.findById(req.params.id);
    if (!cr) return res.status(404).json({ error: "Change request not found" });
    res.json(cr);
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/change-requests/:id — Update CR (only if Pending or Under Review)
router.put("/:id", async (req, res) => {
  try {
    const cr = await ChangeRequest.findById(req.params.id);
    if (!cr) return res.status(404).json({ error: "Change request not found" });
    if (cr.status === "Approved" || cr.status === "Rejected") {
      return res.status(400).json({ error: "Finalized change requests cannot be edited" });
    }
    if (req.body.estimatedCostImpact !== undefined && !Number.isFinite(Number(req.body.estimatedCostImpact))) {
      return res.status(400).json({ error: "estimatedCostImpact must be a valid number" });
    }
    if (req.body.estimatedTimeImpactWeeks !== undefined && !Number.isInteger(Number(req.body.estimatedTimeImpactWeeks))) {
      return res.status(400).json({ error: "estimatedTimeImpactWeeks must be a whole number" });
    }
    Object.assign(cr, req.body);
    await cr.save();
    res.json(cr);
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/change-requests/:id/approve — Approve CR
router.patch("/:id/approve", async (req, res) => {
  try {
    const cr = await ChangeRequest.findById(req.params.id);
    if (!cr) return res.status(404).json({ error: "Change request not found" });
    if (cr.status === "Rejected") return res.status(400).json({ error: "Rejected change requests cannot be approved" });
    await validateChangeRequestImpact(cr);
    if (cr.status !== "Approved") {
      cr.status = "Approved";
      cr.reviewedBy = req.body.reviewedBy || "";
      cr.reviewedAt = new Date();
      cr.rejectionReason = undefined;
      await cr.save();
    }
    await applyApprovedChangeRequest(cr);
    res.json(cr);
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    console.error("[PATCH /change-requests/:id/approve]", err);
    res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "Server error" });
  }
});

// PATCH /api/change-requests/:id/reject — Reject CR
router.patch("/:id/reject", async (req, res) => {
  try {
    const cr = await ChangeRequest.findById(req.params.id);
    if (!cr) return res.status(404).json({ error: "Change request not found" });
    if (cr.status === "Approved") {
      return res.status(400).json({ error: "Approved change requests cannot be rejected" });
    }
    cr.status = "Rejected";
    cr.reviewedBy = req.body.reviewedBy || "";
    cr.reviewedAt = new Date();
    cr.rejectionReason = req.body.rejectionReason || "";
    await cr.save();
    res.json(cr);
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
