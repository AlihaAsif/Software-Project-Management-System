const mongoose = require("mongoose");

const changeRequestSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "project ID is required"],
    },
    title: {
      type: String,
      required: [true, "title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "description is required"],
      trim: true,
    },
    justification: { type: String, trim: true },
    // Cost impact in PKR
    estimatedCostImpact: { type: Number, default: 0 },
    // Time impact in weeks
    estimatedTimeImpactWeeks: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Pending", "Under Review", "Approved", "Rejected"],
      default: "Pending",
    },
    reviewedBy: { type: String, trim: true },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    // Flag: approved CRs can be acted on; pending/rejected ones cannot touch scope
    scopeImpact: {
      type: String,
      enum: ["None", "Minor", "Major"],
      default: "None",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChangeRequest", changeRequestSchema);
