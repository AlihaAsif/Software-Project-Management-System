const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "project is required"],
    },
    initiationMilestoneId: { type: String, trim: true, default: null },
    actualCompletionDate: { type: Date },
    // Optional link to a WBS task
    wbsTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WBSTask",
      default: null,
    },
    title: {
      type: String,
      required: [true, "title is required"],
      trim: true,
    },
    description: { type: String, trim: true },

    // Team member assigned (name / role string — no auth yet)
    assignedTo: { type: String, trim: true },
    role: {
      type: String,
      enum: [
        "Project Manager",
        "Backend Developer",
        "Frontend Developer",
        "Database Developer",
        "QA Engineer",
        "Other",
      ],
      default: "Other",
    },

    // Schedule
    startDate: { type: Date, required: [true, "startDate is required"] },
    endDate:   { type: Date, required: [true, "endDate is required"] },
    // Duration in days — auto-computed on save if not provided
    durationDays: { type: Number, default: 0 },

    // Dependencies — list of Activity _ids that must finish before this one starts
    dependencies: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Activity" },
    ],

    status: {
      type: String,
      enum: ["Not Started", "In Progress", "Completed", "Delayed", "On Hold"],
      default: "Not Started",
    },

    // Delay tracking
    delayDays: { type: Number, default: 0 }, // actual slip in days

    // ── EVM Cost Fields ────────────────────────────────────────────
    // BAC  — Budget at Completion for this activity (same as estimatedCost)
    estimatedCost: { type: Number, default: 0 },
    // BCWS — Budgeted Cost of Work Scheduled (Planned Value for this activity)
    plannedCost: { type: Number, default: 0 },
    // AC   — Actual Cost spent so far on this activity
    actualCost: { type: Number, default: 0 },
    // % work actually completed (0–100); used to derive EV = BAC × (percentComplete/100)
    percentComplete: { type: Number, default: 0, min: 0, max: 100 },

    // Notes / comments
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

activitySchema.index(
  { project: 1, initiationMilestoneId: 1 },
  { unique: true, partialFilterExpression: { initiationMilestoneId: { $type: "string" } } }
);

// ── Pre-save: compute durationDays & validate dates ────────────────
// Mongoose 9+: use async hooks and throw errors instead of calling next()
activitySchema.pre("save", async function () {
  if (this.startDate && this.endDate) {
    if (this.endDate < this.startDate) {
      throw new Error("endDate must be on or after startDate");
    }
    const diffMs = this.endDate - this.startDate;
    this.durationDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) || 1;
  }
});

module.exports = mongoose.model("Activity", activitySchema);
