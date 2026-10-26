const mongoose = require("mongoose");

const defectSchema = new mongoose.Schema(
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
    description: { type: String, trim: true },
    // Which module/feature this defect belongs to
    relatedModule: {
      type: String,
      trim: true,
      // e.g. "Appointment Scheduling", "Patient Record Management"
    },
    severity: {
      type: String,
      enum: ["Critical", "High", "Medium", "Low"],
      required: [true, "severity is required"],
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Closed"],
      default: "Open",
    },
    assignedTo: { type: String, trim: true },
    reportedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date, default: null },
    // Free-text notes on resolution
    resolutionNotes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Auto-set resolvedAt when status becomes Resolved or Closed
defectSchema.pre("save", async function () {
  if (
    (this.status === "Resolved" || this.status === "Closed") &&
    !this.resolvedAt
  ) {
    this.resolvedAt = new Date();
  }
  if (this.status === "Open" || this.status === "In Progress") {
    this.resolvedAt = null;
  }
});

module.exports = mongoose.model("Defect", defectSchema);
