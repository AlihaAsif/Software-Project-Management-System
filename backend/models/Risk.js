const mongoose = require("mongoose");

// ── Risk level classifier ──────────────────────────────────────────
// Score = likelihood (1-5) × impact (1-5) → max 25
// Low: 1-5 | Medium: 6-12 | High: 13-19 | Critical: 20-25
function classifyRisk(score) {
  if (score >= 20) return "Critical";
  if (score >= 13) return "High";
  if (score >= 6)  return "Medium";
  return "Low";
}

const riskSchema = new mongoose.Schema(
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

    category: {
      type: String,
      trim: true,
      default: "General",
    },

    // Qualitative scoring
    likelihood: {
      type: Number,
      required: [true, "likelihood is required"],
      min: [1, "likelihood min is 1"],
      max: [5, "likelihood max is 5"],
    },
    impact: {
      type: Number,
      required: [true, "impact is required"],
      min: [1, "impact min is 1"],
      max: [5, "impact max is 5"],
    },
    // Auto-computed on save
    riskScore: { type: Number, default: 0 },
    riskLevel: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Low",
    },

    // Response planning
    responseStrategy: {
      type: String,
      enum: ["Avoid", "Transfer", "Mitigate", "Accept"],
      default: "Mitigate",
    },
    mitigationPlan: { type: String, trim: true },
    // PDPC — Preventive & contingency actions
    preventiveAction: { type: String, trim: true },
    contingencyAction: { type: String, trim: true },

    owner: { type: String, trim: true },
    status: {
      type: String,
      enum: ["Open", "Mitigated", "Closed", "Identified", "Analysed", "Mitigating"],
      default: "Open",
    },
  },
  { timestamps: true }
);

// Auto-compute score and level on save (Mongoose 9 async style)
riskSchema.pre("save", async function () {
  this.riskScore = this.likelihood * this.impact;
  this.riskLevel = classifyRisk(this.riskScore);
});

module.exports = mongoose.model("Risk", riskSchema);
