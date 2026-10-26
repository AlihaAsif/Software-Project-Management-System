const mongoose = require("mongoose");

// ── Checklist item sub-schema ──────────────────────────────────────
const checklistItemSchema = new mongoose.Schema(
  {
    item: { type: String, required: true, trim: true },
    passed: { type: Boolean, default: false },
  },
  { _id: false }
);

const qualityCheckSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "project is required"],
    },
    title: {
      type: String,
      required: [true, "title is required"],
      trim: true,
    },
    relatedModule: { type: String, trim: true },
    // Array of checklist items
    checklistItems: [checklistItemSchema],
    // Overall inspection result — computed or manually set
    result: {
      type: String,
      enum: ["Pending", "Passed", "Failed"],
      default: "Pending",
    },
    notes: { type: String, trim: true },
    checkedBy: { type: String, trim: true },
    checkedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("QualityCheck", qualityCheckSchema);
