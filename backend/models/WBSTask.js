const mongoose = require("mongoose");

const wbsTaskSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "project ID is required"],
    },
    // Optional: link WBS task to an approved requirement
    requirement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Requirement",
      default: null,
    },
    // Parent task — null means this is a top-level WBS element
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WBSTask",
      default: null,
    },
    wbsCode: {
      type: String,
      required: [true, "wbsCode is required (e.g. 1, 1.1, 1.1.2)"],
      trim: true,
    },
    title: {
      type: String,
      required: [true, "title is required"],
      trim: true,
    },
    description: { type: String, trim: true },
    assignedTo: { type: String, trim: true },
    estimatedHours: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Not Started", "In Progress", "Completed", "On Hold"],
      default: "Not Started",
    },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WBSTask", wbsTaskSchema);
