const express = require("express");
const router  = express.Router();
const Activity = require("../models/Activity");
const Project  = require("../models/Project");

async function syncInitiationMilestone(activity) {
  if (!activity?.initiationMilestoneId) return;
  const project = await Project.findById(activity.project);
  if (!project) return;
  const milestone = project.milestones.id(activity.initiationMilestoneId);
  if (!milestone) return;
  milestone.title = activity.title;
  milestone.description = activity.description || "";
  milestone.dueDate = activity.endDate;
  milestone.responsiblePerson = activity.assignedTo || "";
  milestone.status = activity.status;
  milestone.completed = activity.status === "Completed";
  milestone.actualCompletionDate = activity.status === "Completed"
    ? (activity.actualCompletionDate || milestone.actualCompletionDate || new Date())
    : undefined;
  milestone.remarks = activity.notes || "";
  await project.save();
}

// ── Deadline constant: 16 weeks from project start ─────────────────
const DEADLINE_WEEKS = 16;

// ── Helper: verify project exists ──────────────────────────────────
async function projectExists(id, res) {
  const p = await Project.findById(id);
  if (!p) { res.status(404).json({ error: "Project not found" }); return null; }
  return p;
}

// ── Helper: validate ObjectId-style string ─────────────────────────
function isValidId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}

// ── Helper: find all activities that depend on a given set of IDs ──
// Returns flat list of affected activities with recalculated schedule impact
async function findDownstream(changedIds, allActivities, delayMap) {
  const affected = [];
  const visited  = new Set(changedIds.map(String));

  let frontier = changedIds.map(String);
  while (frontier.length) {
    const next = [];
    for (const act of allActivities) {
      const id = String(act._id);
      if (visited.has(id)) continue;
      const deps = act.dependencies.map(String);
      if (deps.some(d => frontier.includes(d))) {
        // This activity depends on a delayed one
        const maxParentDelay = Math.max(
          ...deps.filter(d => delayMap[d] !== undefined).map(d => delayMap[d]),
          0
        );
        delayMap[id] = (act.delayDays || 0) + maxParentDelay;
        affected.push({
          _id:           act._id,
          title:         act.title,
          assignedTo:    act.assignedTo,
          originalStart: act.startDate,
          originalEnd:   act.endDate,
          cascadedDelayDays: delayMap[id],
          newEstimatedStart: new Date(new Date(act.startDate).getTime() + delayMap[id] * 86400000),
          newEstimatedEnd:   new Date(new Date(act.endDate).getTime()   + delayMap[id] * 86400000),
        });
        visited.add(id);
        next.push(id);
      }
    }
    frontier = next;
  }
  return affected;
}

// ══════════════════════════════════════════════════════════════════
// POST /api/activities — Create activity
// ══════════════════════════════════════════════════════════════════
router.post("/", async (req, res) => {
  try {
    const { project, title, startDate, endDate, dependencies } = req.body;
    if (!project)             return res.status(400).json({ error: "project is required" });
    if (!title?.trim())       return res.status(400).json({ error: "title is required" });
    if (!startDate)           return res.status(400).json({ error: "startDate is required" });
    if (!endDate)             return res.status(400).json({ error: "endDate is required" });

    if (!isValidId(project))  return res.status(400).json({ error: "Invalid project ID" });
    const proj = await projectExists(project, res);
    if (!proj) return;

    // Validate dependency IDs exist and belong to same project
    if (Array.isArray(dependencies) && dependencies.length) {
      for (const depId of dependencies) {
        if (!isValidId(depId)) return res.status(400).json({ error: `Invalid dependency ID: ${depId}` });
        const dep = await Activity.findById(depId);
        if (!dep) return res.status(404).json({ error: `Dependency activity not found: ${depId}` });
        if (String(dep.project) !== String(project)) {
          return res.status(400).json({ error: `Dependency ${depId} belongs to a different project` });
        }
      }
    }

    const activity = await Activity.create(req.body);
    res.status(201).json(activity);
  } catch (err) {
    console.error("[POST /api/activities]", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    // Pre-save hook throws a plain Error for date logic
    if (err.name === "Error" && err.message.includes("endDate")) {
      return res.status(400).json({ error: err.message });
    }
    // Bad ObjectId cast (e.g. invalid wbsTask or dependency id format)
    if (err.name === "CastError" || err.kind === "ObjectId") {
      return res.status(400).json({ error: `Invalid ID format: ${err.path || "unknown field"}` });
    }
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/activities?project=<id>&status=<status>&assignedTo=<name>
// ══════════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.project)    filter.project    = req.query.project;
    if (req.query.status)     filter.status     = req.query.status;
    if (req.query.assignedTo) filter.assignedTo = new RegExp(req.query.assignedTo, "i");

    const activities = await Activity.find(filter)
      .populate("dependencies", "title startDate endDate status")
      .populate("wbsTask", "wbsCode title")
      .sort({ startDate: 1 });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/activities/:id — Single activity
// ══════════════════════════════════════════════════════════════════
router.get("/:id", async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate("dependencies", "title startDate endDate status delayDays")
      .populate("wbsTask", "wbsCode title");
    if (!activity) return res.status(404).json({ error: "Activity not found" });
    res.json(activity);
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════════
// PUT /api/activities/:id — Full update
// ══════════════════════════════════════════════════════════════════
router.put("/:id", async (req, res) => {
  try {
    // Validate deps if being changed
    if (Array.isArray(req.body.dependencies)) {
      for (const depId of req.body.dependencies) {
        if (!isValidId(depId)) return res.status(400).json({ error: `Invalid dependency ID: ${depId}` });
        const dep = await Activity.findById(depId);
        if (!dep) return res.status(404).json({ error: `Dependency not found: ${depId}` });
      }
    }
    // Prevent self-dependency
    if (req.body.dependencies?.includes(req.params.id)) {
      return res.status(400).json({ error: "An activity cannot depend on itself" });
    }

    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ error: "Activity not found" });
    if (activity.initiationMilestoneId && req.body.project && String(req.body.project) !== String(activity.project)) {
      return res.status(400).json({ error: "A linked initiation milestone cannot be moved to another project" });
    }
    Object.assign(activity, req.body);
    await activity.save(); // triggers pre-save validation
    await syncInitiationMilestone(activity);
    res.json(activity);
  } catch (err) {
    if (err.name === "ValidationError" || err.message.includes("endDate")) {
      return res.status(400).json({ error: err.message });
    }
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════════
// PATCH /api/activities/:id/status — Update status only
// ══════════════════════════════════════════════════════════════════
router.patch("/:id/status", async (req, res) => {
  try {
    const allowed = ["Not Started", "In Progress", "Completed", "Delayed", "On Hold"];
    const { status } = req.body;
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
    }
    const activity = await Activity.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!activity) return res.status(404).json({ error: "Activity not found" });
    await syncInitiationMilestone(activity);
    res.json(activity);
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════════
// PATCH /api/activities/:id/cost — Update EVM cost fields
// Body: { plannedCost, actualCost, estimatedCost, percentComplete }
// ══════════════════════════════════════════════════════════════════
router.patch("/:id/cost", async (req, res) => {
  try {
    const { plannedCost, actualCost, estimatedCost, percentComplete } = req.body;

    // At least one cost field must be provided
    const hasCostField = [plannedCost, actualCost, estimatedCost, percentComplete]
      .some(v => v !== undefined);
    if (!hasCostField) {
      return res.status(400).json({
        error: "Provide at least one of: plannedCost, actualCost, estimatedCost, percentComplete",
      });
    }

    // Validate numeric ranges
    for (const [key, val] of Object.entries({ plannedCost, actualCost, estimatedCost })) {
      if (val !== undefined && (typeof val !== "number" || val < 0)) {
        return res.status(400).json({ error: `${key} must be a non-negative number` });
      }
    }
    if (percentComplete !== undefined) {
      if (typeof percentComplete !== "number" || percentComplete < 0 || percentComplete > 100) {
        return res.status(400).json({ error: "percentComplete must be a number between 0 and 100" });
      }
    }

    const update = {};
    if (plannedCost    !== undefined) update.plannedCost    = plannedCost;
    if (actualCost     !== undefined) update.actualCost     = actualCost;
    if (estimatedCost  !== undefined) update.estimatedCost  = estimatedCost;
    if (percentComplete !== undefined) update.percentComplete = percentComplete;

    const activity = await Activity.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );
    if (!activity) return res.status(404).json({ error: "Activity not found" });
    res.json(activity);
  } catch (err) {
    console.error("[PATCH /api/activities/:id/cost]", err);
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// DELETE /api/activities/:id — Delete (block if others depend on it)
// ══════════════════════════════════════════════════════════════════
router.delete("/:id", async (req, res) => {
  try {
    const dependents = await Activity.find({ dependencies: req.params.id });
    if (dependents.length) {
      return res.status(400).json({
        error: "Cannot delete: other activities depend on this one",
        dependents: dependents.map(d => ({ _id: d._id, title: d.title })),
      });
    }
    const activity = await Activity.findByIdAndDelete(req.params.id);
    if (!activity) return res.status(404).json({ error: "Activity not found" });
    res.json({ message: "Activity deleted", id: req.params.id });
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════════
// PATCH /api/activities/:id/delay — Mark delayed + cascade impact
// Body: { delayDays: <number> }
// ══════════════════════════════════════════════════════════════════
router.patch("/:id/delay", async (req, res) => {
  try {
    const delayDays = Number(req.body.delayDays);
    if (!delayDays || delayDays <= 0) {
      return res.status(400).json({ error: "delayDays must be a positive number" });
    }

    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ error: "Activity not found" });

    // Update the delayed activity itself
    activity.delayDays = delayDays;
    activity.status    = "Delayed";
    activity.endDate   = new Date(new Date(activity.endDate).getTime() + delayDays * 86400000);
    await activity.save();
    await syncInitiationMilestone(activity);

    // Fetch all project activities for cascade calculation
    const allActivities = await Activity.find({ project: activity.project }).lean();
    const delayMap = { [String(activity._id)]: delayDays };

    const affectedActivities = await findDownstream(
      [activity._id],
      allActivities,
      delayMap
    );

    // Check if project deadline is breached (16 weeks from earliest startDate)
    const earliest = allActivities.reduce((min, a) =>
      new Date(a.startDate) < new Date(min) ? a.startDate : min,
      allActivities[0]?.startDate || new Date()
    );
    const projectDeadline = new Date(new Date(earliest).getTime() + DEADLINE_WEEKS * 7 * 86400000);

    const deadlineBreached = affectedActivities.some(
      a => new Date(a.newEstimatedEnd) > projectDeadline
    ) || new Date(activity.endDate) > projectDeadline;

    res.json({
      updatedActivity: activity,
      cascadeImpact: {
        delayDays,
        affectedActivitiesCount: affectedActivities.length,
        affectedActivities,
        projectDeadline,
        deadlineBreached,
        message: deadlineBreached
          ? `⚠️ Delay of ${delayDays} day(s) cascades to ${affectedActivities.length} dependent activity(s) and BREACHES the 16-week project deadline.`
          : `Delay of ${delayDays} day(s) affects ${affectedActivities.length} dependent activity(s). Project deadline is still on track.`,
      },
    });
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/activities/project/:projectId/gantt — Gantt chart data
// ══════════════════════════════════════════════════════════════════
router.get("/project/:projectId/gantt", async (req, res) => {
  try {
    if (!isValidId(req.params.projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }
    const proj = await projectExists(req.params.projectId, res);
    if (!proj) return;

    const activities = await Activity.find({ project: req.params.projectId })
      .populate("dependencies", "title")
      .populate("wbsTask", "wbsCode title")
      .sort({ startDate: 1 });

    // Calculate project-level dates
    const starts = activities.map(a => new Date(a.startDate));
    const ends   = activities.map(a => new Date(a.endDate));
    const projectStart    = starts.length ? new Date(Math.min(...starts)) : null;
    const projectEnd      = ends.length   ? new Date(Math.max(...ends))   : null;
    const projectDeadline = projectStart
      ? new Date(projectStart.getTime() + DEADLINE_WEEKS * 7 * 86400000)
      : null;

    const ganttTasks = activities.map(a => ({
      id:           String(a._id),
      title:        a.title,
      assignedTo:   a.assignedTo,
      role:         a.role,
      wbsCode:      a.wbsTask?.wbsCode || null,
      startDate:    a.startDate,
      endDate:      a.endDate,
      durationDays: a.durationDays,
      status:       a.status,
      delayDays:    a.delayDays,
      estimatedCost: a.estimatedCost,
      dependencies: a.dependencies.map(d => String(d._id)),
      isDelayed:    a.status === "Delayed" || a.delayDays > 0,
    }));

    res.json({
      project: {
        _id:              proj._id,
        projectName:      proj.projectName,
        projectStart,
        projectEnd,
        projectDeadline,
        deadlineWeeks:    DEADLINE_WEEKS,
        totalActivities:  activities.length,
        budget:           proj.budget,
      },
      tasks: ganttTasks,
    });
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/activities/project/:projectId/summary — Resource summary
// ══════════════════════════════════════════════════════════════════
router.get("/project/:projectId/summary", async (req, res) => {
  try {
    if (!isValidId(req.params.projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }
    const proj = await projectExists(req.params.projectId, res);
    if (!proj) return;

    const activities = await Activity.find({ project: req.params.projectId }).lean();

    // Group by assignedTo
    const byMember = {};
    let totalCost = 0;
    for (const a of activities) {
      const member = a.assignedTo || "Unassigned";
      if (!byMember[member]) byMember[member] = { activities: 0, totalDays: 0, estimatedCost: 0, statuses: {} };
      byMember[member].activities++;
      byMember[member].totalDays   += a.durationDays || 0;
      byMember[member].estimatedCost += a.estimatedCost || 0;
      const st = a.status || "Not Started";
      byMember[member].statuses[st] = (byMember[member].statuses[st] || 0) + 1;
      totalCost += a.estimatedCost || 0;
    }

    const statusCounts = activities.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      projectId:       req.params.projectId,
      totalActivities: activities.length,
      totalEstimatedCost: totalCost,
      statusBreakdown: statusCounts,
      resourceAllocation: byMember,
    });
  } catch (err) {
    if (err.kind === "ObjectId") return res.status(400).json({ error: "Invalid ID" });
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
