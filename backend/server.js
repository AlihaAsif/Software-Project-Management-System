
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = 5000;

// Allow cross-origin requests from the React dev server
app.use(cors());

// Read JSON data from requests
app.use(express.json());

// Routes — Module 1
const projectRoutes = require("./routes/projectRoutes");
app.use("/api/projects", projectRoutes);

// Routes — Module 2
const requirementRoutes = require("./routes/requirementRoutes");
const wbsRoutes = require("./routes/wbsRoutes");
const changeRequestRoutes = require("./routes/changeRequestRoutes");
app.use("/api/requirements", requirementRoutes);
app.use("/api/wbs", wbsRoutes);
app.use("/api/change-requests", changeRequestRoutes);

// Routes — Module 3
const activityRoutes = require("./routes/activityRoutes");
app.use("/api/activities", activityRoutes);

// Routes — Module 4
const evmRoutes = require("./routes/evmRoutes");
app.use("/api/evm", evmRoutes);

// Routes — Module 5
const defectRoutes     = require("./routes/defectRoutes");
const qualityRoutes    = require("./routes/qualityRoutes");
const riskRoutes       = require("./routes/riskRoutes");
const qrSummaryRoutes  = require("./routes/qrSummaryRoutes");
app.use("/api/defects",     defectRoutes);
app.use("/api/quality",     qualityRoutes);
app.use("/api/risks",       riskRoutes);
app.use("/api/qr-summary",  qrSummaryRoutes);

// Routes — Module 6: Integration, Validation & Reporting
const dashboardRoutes  = require("./routes/dashboardRoutes");
app.use("/api/dashboard",   dashboardRoutes);

// Home route
app.get("/", (req, res) => {
  res.send("Smart Healthcare Project Management System Backend is Running!");
});

// Connect to MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });
