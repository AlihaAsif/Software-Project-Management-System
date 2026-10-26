const mongoose = require("mongoose");

const requirementSchema = new mongoose.Schema(
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
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: ["Functional", "Non-Functional", "Technical", "Business"],
      default: "Functional",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    // Approval status — only Approved requirements go into scope
    approvalStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    approvedBy: { type: String, trim: true },
    approvedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    changeRequestApplicationKey: { type: String, unique: true, sparse: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Requirement", requirementSchema);
