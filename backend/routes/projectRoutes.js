const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const Activity = require("../models/Activity");

const activityStatus = status => ({
  "Not Started": "Not Started", "In Progress": "In Progress",
  Completed: "Completed", Delayed: "Delayed", "On Hold": "On Hold",
}[status] || status);

async function syncProjectMilestones(project) {
  let linksChanged = false;
  const retainedIds = (project.milestones || []).map(milestone => String(milestone._id));
  for (const milestone of project.milestones || []) {
    if (!milestone.dueDate) continue;
    const milestoneId = String(milestone._id);
    let activity = milestone.scheduleActivityId
      ? await Activity.findOne({ _id: milestone.scheduleActivityId, project: project._id })
      : await Activity.findOne({ project: project._id, initiationMilestoneId: milestoneId });
    if (!activity) {
      // Attach a same-title legacy activity rather than creating a duplicate.
      activity = await Activity.findOne({ project: project._id, title: milestone.title, initiationMilestoneId: null });
    }
    const due = new Date(milestone.dueDate);
    const plannedStart = project.deadline?.startDate ? new Date(project.deadline.startDate) : due;
    const start = activity?.startDate || (plannedStart <= due ? plannedStart : due);
    if (activity) {
      activity.title = milestone.title;
      activity.description = milestone.description || activity.description;
      activity.assignedTo = milestone.responsiblePerson || activity.assignedTo;
      activity.status = activityStatus(milestone.status || (milestone.completed ? "Completed" : activity.status));
      activity.endDate = due;
      if (activity.startDate && activity.startDate > due) activity.startDate = due;
      activity.actualCompletionDate = activity.status === "Completed"
        ? (milestone.actualCompletionDate || activity.actualCompletionDate || new Date())
        : undefined;
      activity.initiationMilestoneId = milestoneId;
      if (milestone.remarks) activity.notes = milestone.remarks;
      await activity.save();
    } else {
      activity = await Activity.create({
        project: project._id,
        initiationMilestoneId: milestoneId,
        title: milestone.title,
        description: milestone.description,
        assignedTo: milestone.responsiblePerson,
        startDate: start,
        endDate: due,
        status: activityStatus(milestone.status || (milestone.completed ? "Completed" : "Not Started")),
        actualCompletionDate: (milestone.status === "Completed" || milestone.completed) ? (milestone.actualCompletionDate || new Date()) : undefined,
        notes: milestone.remarks,
      });
    }
    if (milestone.scheduleActivityId !== String(activity._id)) {
      milestone.scheduleActivityId = String(activity._id);
      linksChanged = true;
    }
  }
  if (linksChanged) {
    for (const milestone of project.milestones || []) {
      if (milestone.scheduleActivityId) {
        await Project.updateOne(
          { _id: project._id, "milestones._id": milestone._id },
          { $set: { "milestones.$.scheduleActivityId": milestone.scheduleActivityId } }
        );
      }
    }
  }
  await Activity.updateMany(
    { project: project._id, initiationMilestoneId: { $type: "string", $nin: retainedIds } },
    { $set: { initiationMilestoneId: null } }
  );
}

function validateProjectInput(body, res) {
  if (body.projectName !== undefined && !String(body.projectName).trim()) {
    res.status(400).json({ error: "Project name is required" }); return false;
  }
  const budget = body.budget?.total ?? body["budget.total"];
  if (budget !== undefined && (!Number.isFinite(Number(budget)) || Number(budget) < 0)) {
    res.status(400).json({ error: "Approved budget must be a non-negative number" }); return false;
  }
  const start = body.deadline?.startDate ?? body["deadline.startDate"];
  const end = body.deadline?.endDate ?? body["deadline.endDate"];
  if (start && end && new Date(start) > new Date(end)) {
    res.status(400).json({ error: "Project deadline must be on or after the start date" }); return false;
  }
  if (body.stakeholders && body.stakeholders.some(s => !s.name?.trim() || !s.role?.trim())) {
    res.status(400).json({ error: "Each stakeholder needs a name and role" }); return false;
  }
  return true;
}

// ── POST /api/projects — Create a new project ──────────────────────
router.post("/", async (req, res) => {
  try {
    if (!validateProjectInput(req.body, res)) return;
    const { projectName } = req.body;
    if (!projectName || !projectName.trim()) {
      return res.status(400).json({ error: "projectName is required" });
    }
    const project = await Project.create(req.body);
    res.status(201).json(project);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Server error" });
  }
});

// ── GET /api/projects — List all projects ───────────────────────────
router.get("/", async (_req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── GET /api/projects/:id — Get single project ─────────────────────
router.get("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid project ID" });
    }
    res.status(500).json({ error: "Server error" });
  }
});

// ── PUT /api/projects/:id — Update project ──────────────────────────
router.put("/:id", async (req, res) => {
  try {
    if (!validateProjectInput(req.body, res)) return;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (req.body.__v !== undefined && Number(req.body.__v) !== project.__v) {
      return res.status(409).json({ error: "Project changed in another module. Refresh and retry." });
    }
    Object.assign(project, req.body);
    await project.save();
    if (Object.prototype.hasOwnProperty.call(req.body, "milestones")) {
      await syncProjectMilestones(project);
    }
    res.json(await Project.findById(project._id));
  } catch (err) {
    if (err.name === "VersionError") return res.status(409).json({ error: "Project changed in another module. Refresh and retry." });
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    if (err.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid project ID" });
    }
    res.status(500).json({ error: "Server error" });
  }
});

// ── PATCH /api/projects/:id/status — Update status only ─────────────
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = [
      "Initiation",
      "Planning",
      "Execution",
      "Monitoring",
      "Closing",
      "Closed",
    ];
    if (!status || !allowed.includes(status)) {
      return res
        .status(400)
        .json({ error: `status must be one of: ${allowed.join(", ")}` });
    }
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid project ID" });
    }
    res.status(500).json({ error: "Server error" });
  }
});

// ── PATCH /api/projects/:id/close — Close a project ─────────────────
router.patch("/:id/close", async (req, res) => {
  try {
    const { closureNotes, lessonsLearned, signedOffBy } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (project.closure.isClosed) {
      return res.status(400).json({ error: "Project is already closed" });
    }

    project.closure = {
      isClosed: true,
      closedAt: new Date(),
      closureNotes: closureNotes || "",
      lessonsLearned: lessonsLearned || "",
      signedOffBy: signedOffBy || "",
    };
    project.status = "Closed";
    await project.save();
    res.json(project);
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid project ID" });
    }
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
