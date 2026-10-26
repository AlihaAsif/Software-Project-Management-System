const mongoose = require("mongoose");

// ── Sub-schemas ──────────────────────────────────────────────────────

const stakeholderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    responsibilities: { type: String, trim: true },
    organization: { type: String, trim: true },
    contact: { type: String, trim: true },
  },
  { _id: false }
);

const milestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    dueDate: { type: Date },
    completed: { type: Boolean, default: false },
    description: { type: String, trim: true },
    responsiblePerson: { type: String, trim: true },
    status: { type: String, enum: ["Not Started", "In Progress", "Completed", "Delayed", "On Hold"] },
    actualCompletionDate: { type: Date },
    remarks: { type: String, trim: true },
    scheduleActivityId: { type: String, trim: true },
  },
  { _id: true }
);

// ── Main Project Schema ─────────────────────────────────────────────

const projectSchema = new mongoose.Schema(
  {
    // --- Project Charter ---
    projectName: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
    },
    charter: {
      purpose: { type: String, trim: true },
      description: { type: String, trim: true },
      background: { type: String, trim: true },
      projectManager: { type: String, trim: true },
      sponsor: { type: String, trim: true },
    },

    // --- Objectives ---
    objectives: [{ type: String, trim: true }],

    // --- Stakeholders & Roles ---
    stakeholders: [stakeholderSchema],

    // --- Scope ---
    scopeIncluded: [{ type: String, trim: true }],
    scopeExcluded: [{ type: String, trim: true }],
    scopeDetails: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    // --- Budget ---
    budget: {
      total: { type: Number, default: 0 },
      currency: { type: String, default: "PKR" },
      notes: { type: String, trim: true },
    },

    // --- Deadline / Timeline ---
    deadline: {
      startDate: { type: Date },
      endDate: { type: Date },
      durationWeeks: { type: Number },
    },

    // --- Management Plan ---
    managementPlan: {
      communicationPlan: { type: String, trim: true },
      riskManagementApproach: { type: String, trim: true },
      qualityStandards: { type: String, trim: true },
    },
    plans: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    teamResponsibilities: [{ type: mongoose.Schema.Types.Mixed }],

    // --- Status ---
    status: {
      type: String,
      enum: [
        "Initiation",
        "Planning",
        "Execution",
        "Monitoring",
        "Closing",
        "Closed",
        "Planned",
        "In Progress",
        "On Hold",
        "Completed",
        "Cancelled",
      ],
      default: "Initiation",
    },

    // --- Milestones ---
    milestones: [milestoneSchema],
    appliedChangeRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "ChangeRequest" }],

    // --- Closure ---
    closure: {
      isClosed: { type: Boolean, default: false },
      closedAt: { type: Date },
      closureNotes: { type: String, trim: true },
      lessonsLearned: { type: String, trim: true },
      signedOffBy: { type: String, trim: true },
      finalStatus: { type: String, trim: true },
      actualCompletionDate: { type: Date },
      actualTotalCost: { type: Number, min: 0 },
      deliverablesSummary: { type: String, trim: true },
      outstandingIssues: { type: String, trim: true },
      closureDate: { type: Date },
    },
  },
  { timestamps: true, optimisticConcurrency: true }
);

module.exports = mongoose.model("Project", projectSchema);
