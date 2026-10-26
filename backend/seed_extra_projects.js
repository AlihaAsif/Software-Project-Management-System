require("dotenv").config();
const mongoose = require("mongoose");

const Project       = require("./models/Project");
const Requirement   = require("./models/Requirement");
const WBSTask       = require("./models/WBSTask");
const Activity      = require("./models/Activity");
const ChangeRequest = require("./models/ChangeRequest");
const Defect        = require("./models/Defect");
const QualityCheck  = require("./models/QualityCheck");
const Risk          = require("./models/Risk");

async function seedExtra() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for extra project seeding...");

    // Check existing projects
    const existingProjects = await Project.find({});
    console.log(`Found ${existingProjects.length} existing project(s).`);

    // 1. Ensure Telemedicine project has full risks if missing
    const teleProject = existingProjects.find(p => p.projectName.toLowerCase().includes("telemedicine"));
    if (teleProject) {
      const riskCount = await Risk.countDocuments({ project: teleProject._id });
      if (riskCount === 0) {
        console.log(`Adding risks for "${teleProject.projectName}"...`);
        await Risk.insertMany([
          {
            project: teleProject._id,
            title: "Cellular Bandwidth Throttling During Rural Tele-Consultations",
            description: "High packet drop rates on 3G/4G networks causing video freeze and audio distortion during remote patient examinations.",
            category: "Technical",
            likelihood: 4,
            impact: 4,
            riskScore: 16,
            riskLevel: "High",
            responseStrategy: "Mitigate",
            mitigationPlan: "Implement dynamic WebRTC bitrate adaptation with low-bandwidth fallback audio-only mode.",
            preventiveAction: "Adaptive resolution scaling and regional edge TURN/STUN servers.",
            contingencyAction: "Immediate downgrade to encrypted voice-only mode with asynchronous photo upload.",
            owner: "Sara Khan",
            status: "Open"
          },
          {
            project: teleProject._id,
            title: "Digital Prescription Regulatory Non-Compliance",
            description: "Scheduled narcotics (controlled substances) mistakenly prescribed via telehealth without mandatory biometric doctor verification.",
            category: "Compliance",
            likelihood: 2,
            impact: 5,
            riskScore: 10,
            riskLevel: "Medium",
            responseStrategy: "Avoid",
            mitigationPlan: "Enforce strict blacklisting of controlled Schedule-IV substances from remote digital prescription pads.",
            preventiveAction: "Automated drug dictionary filter blocking restricted prescriptions online.",
            contingencyAction: "Prompt mandatory in-person hospital referral banner for restricted narcotics.",
            owner: "Faizan Asif",
            status: "Open"
          },
          {
            project: teleProject._id,
            title: "Video Stream Eavesdropping / Man-in-the-Middle Attack",
            description: "Interception of confidential psychiatric or sensitive patient-doctor video streams over untrusted networks.",
            category: "Compliance",
            likelihood: 2,
            impact: 5,
            riskScore: 10,
            riskLevel: "Medium",
            responseStrategy: "Mitigate",
            mitigationPlan: "Enforce end-to-end SRTP/DTLS encryption with ephemeral session keys for every consultation.",
            preventiveAction: "Automated quarterly cryptographic penetration audits.",
            contingencyAction: "Emergency kill-switch terminating compromised WebRTC rooms.",
            owner: "Bilal Sheikh",
            status: "Open"
          },
          {
            project: teleProject._id,
            title: "Doctor Hardware Incompatibility in Peripheral Outposts",
            description: "Outpost clinics have legacy webcam drivers and incompatible browser versions unable to negotiate WebRTC video.",
            category: "Operational",
            likelihood: 4,
            impact: 3,
            riskScore: 12,
            riskLevel: "Medium",
            responseStrategy: "Mitigate",
            mitigationPlan: "Deploy pre-configured standardized Android tablets with locked enterprise kiosk firmware.",
            preventiveAction: "Hardware compatibility test tool run during doctor check-in.",
            contingencyAction: "Dispatch pre-tested backup tablets from Mayo Central IT reserves.",
            owner: "Ahmed Raza",
            status: "Open"
          }
        ]);
        console.log(`Successfully added 4 risks to "${teleProject.projectName}".`);
      }
    }

    // Clean up partial Pharmacy project if exists without requirements
    const existingPharm = await Project.findOne({ projectName: "Pharmacy & Smart Dispensing System" });
    if (existingPharm) {
      const pReqCount = await Requirement.countDocuments({ project: existingPharm._id });
      if (pReqCount === 0) {
        console.log("Removing partial pharmacy project...");
        await Project.deleteOne({ _id: existingPharm._id });
      }
    }

    let pharmacyProject = await Project.findOne({ projectName: "Pharmacy & Smart Dispensing System" });
    if (!pharmacyProject) {
      console.log("Creating new project: 'Pharmacy & Smart Dispensing System'...");
      const now = new Date();
      const startDate = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000); // started 3 weeks ago
      const endDate = new Date(startDate.getTime() + 14 * 7 * 24 * 60 * 60 * 1000); // 14 weeks duration

      pharmacyProject = await Project.create({
        projectName: "Pharmacy & Smart Dispensing System",
        charter: {
          purpose: "Automate pharmacy inventory tracking, barcoded medication dispensing, cold-chain temperature surveillance, and supplier PO reconciliation across 5 hospital pharmacies.",
          background: "The 5 hospital branches currently experience 4.2% inventory shrinkage, frequent stock-outs of vital emergency medicines, and high manual dispensing workloads leading to potential dosage errors.",
          projectManager: "Faizan Asif",
          sponsor: "Consortium Medical Supplies & Logistics Directorate"
        },
        objectives: [
          "Eliminate medication dispensing and dosage errors by 99% through 2D barcode scanning.",
          "Automate real-time stock deductions directly from doctor electronic prescriptions.",
          "Implement IoT-based continuous cold-chain temperature alerts for insulin and biologics.",
          "Reduce pharmaceutical expired stock write-offs by PKR 1,200,000 annually via FEFO (First-Expired, First-Out) logic."
        ],
        stakeholders: [
          { name: "Faizan Asif", role: "Project Manager", responsibilities: "Project governance, schedule control, budget & EVM tracking" },
          { name: "Dr. Noman Bashir", role: "Sponsor", responsibilities: "Logistics budget approval, regulatory compliance sign-off" },
          { name: "Dr. Maria Siddiqui", role: "Chief Pharmacist", responsibilities: "Clinical drug formulary, dispensing workflow, user acceptance" },
          { name: "Ahmed Raza", role: "Backend Developer", responsibilities: "Inventory microservice, batch tracking APIs, supplier webhooks" },
          { name: "Sara Khan", role: "Frontend Developer", responsibilities: "High-speed barcode dispensing UI, POS cashier interface" },
          { name: "Bilal Sheikh", role: "Database Developer", responsibilities: "MongoDB transactions for stock decrements, audit logs" },
          { name: "Zainab Fatima", role: "QA Engineer", responsibilities: "Accuracy testing, edge-case load tests, barcode scanner latency" }
        ],
        scopeIncluded: [
          "Central Drug Formulary & Master Medicine Catalog",
          "GS1 2D DataMatrix Barcode Verification at point of dispensing",
          "Automated Inventory Replenishment & Vendor Purchase Order Engine",
          "Real-Time EMR Prescription Fulfillment Integration",
          "Cold-Chain Refrigerator IoT Sensor Monitoring & SMS Alerting",
          "Narcotics & Controlled Substance Biometric Dispensing Vault Log"
        ],
        scopeExcluded: [
          "Automated robotic conveyor belt mechanical hardware manufacturing",
          "International customs clearance logistics management",
          "Over-the-counter retail loyalty card mobile apps"
        ],
        budget: {
          total: 4200000,
          currency: "PKR",
          notes: "Approved Baseline Budget (BAC) of PKR 4,200,000 across 14 delivery weeks."
        },
        deadline: {
          startDate,
          endDate,
          durationWeeks: 14
        },
        managementPlan: {
          communicationPlan: "Weekly supplier sync on Mondays; bi-weekly hospital pharmacy head demonstrations; instant Telegram alert on inventory discrepancies > PKR 10,000.",
          riskManagementApproach: "Strict 5x5 matrix evaluation focusing on patient medication safety, stock outages, and supplier delivery delays.",
          qualityStandards: "WHO Good Pharmacy Practice (GPP), DRAP (Drug Regulatory Authority) guidelines, sub-300ms barcode scanner response."
        },
        status: "Execution",
        milestones: [
          { title: "M1: Drug Catalog & Database Architecture Approved", dueDate: new Date(startDate.getTime() + 14 * 86400000), completed: true, status: "Completed" },
          { title: "M2: Core Barcode Dispensing Engine & POS MVP", dueDate: new Date(startDate.getTime() + 35 * 86400000), completed: true, status: "Completed" },
          { title: "M3: EMR Prescription Auto-Deduction & Vendor PO Engine", dueDate: new Date(startDate.getTime() + 56 * 86400000), completed: false, status: "In Progress" },
          { title: "M4: Cold-Chain IoT Sensor Alerting & Controlled Substances Vault", dueDate: new Date(startDate.getTime() + 77 * 86400000), completed: false, status: "Not Started" },
          { title: "M5: Consortium Final Go-Live & Pharmacist Training", dueDate: endDate, completed: false, status: "Not Started" }
        ],
        closure: {
          isClosed: false
        }
      });
      console.log(`Created Project: "${pharmacyProject.projectName}" (${pharmacyProject._id})`);

      const pId = pharmacyProject._id;

      // 3. Requirements for Pharmacy Project
      const reqs = await Requirement.insertMany([
        {
          project: pId,
          title: "GS1 2D DataMatrix Barcode Scanning & Verification",
          description: "Scan medicine packaging at checkout to verify batch number, expiry date, and manufacturer authentic serial before release.",
          type: "Functional",
          priority: "High",
          approvalStatus: "Approved",
          approvedBy: "Faizan Asif",
          approvedAt: new Date(startDate.getTime() + 3 * 86400000)
        },
        {
          project: pId,
          title: "FEFO (First-Expired, First-Out) Automated Batch Allocation",
          description: "System must automatically select nearest expiring batches during prescription fulfillment to prevent medication write-offs.",
          type: "Functional",
          priority: "High",
          approvalStatus: "Approved",
          approvedBy: "Faizan Asif",
          approvedAt: new Date(startDate.getTime() + 4 * 86400000)
        },
        {
          project: pId,
          title: "EMR e-Prescription Auto-Synchronization",
          description: "Instant push notification to pharmacy terminal when a consulting doctor submits an e-prescription in OPD or IPD.",
          type: "Functional",
          priority: "High",
          approvalStatus: "Approved",
          approvedBy: "Dr. Maria Siddiqui",
          approvedAt: new Date(startDate.getTime() + 6 * 86400000)
        },
        {
          project: pId,
          title: "IoT Cold-Chain Storage Surveillance & Critical Alerts",
          description: "Continuous telemetry monitoring of pharmacy refrigerators (2°C - 8°C); trigger automated SMS/call alerts if temperature crosses threshold for > 15 mins.",
          type: "Technical",
          priority: "High",
          approvalStatus: "Approved",
          approvedBy: "Dr. Noman Bashir",
          approvedAt: new Date(startDate.getTime() + 7 * 86400000)
        },
        {
          project: pId,
          title: "Narcotics Vault Biometric Access & Double-Signoff Log",
          description: "Mandatory biometric scan and dual-pharmacist authentication for dispensing high-potency controlled substances.",
          type: "Non-Functional",
          priority: "High",
          approvalStatus: "Approved",
          approvedBy: "Faizan Asif",
          approvedAt: new Date(startDate.getTime() + 8 * 86400000)
        },
        {
          project: pId,
          title: "Sub-Second Barcode Scanner Ingestion & Offline Resilience",
          description: "High-speed optical scanning pipeline capable of handling 50 items/minute with offline SQLite buffer during WAN loss.",
          type: "Non-Functional",
          priority: "Medium",
          approvalStatus: "Pending"
        }
      ]);
      console.log(`Created ${reqs.length} requirements for Pharmacy project.`);

      // 4. WBS Tasks
      const wbs = await WBSTask.insertMany([
        { project: pId, wbsCode: "1.0", title: "Pharmacy Project Initiation & Drug Master Setup", estimatedHours: 60, assignedTo: "Faizan Asif", status: "Completed" },
        { project: pId, wbsCode: "2.0", title: "Barcode Scanner Integration & POS Terminal UI", requirement: reqs[0]._id, estimatedHours: 110, assignedTo: "Sara Khan", status: "Completed" },
        { project: pId, wbsCode: "3.0", title: "FEFO Batch Engine & Inventory Decrement APIs", requirement: reqs[1]._id, estimatedHours: 130, assignedTo: "Ahmed Raza", status: "In Progress" },
        { project: pId, wbsCode: "4.0", title: "EMR e-Prescription Real-Time Queue Service", requirement: reqs[2]._id, estimatedHours: 95, assignedTo: "Ahmed Raza", status: "In Progress" },
        { project: pId, wbsCode: "5.0", title: "IoT Refrigerator Telemetry & SMS Warning Gateway", requirement: reqs[3]._id, estimatedHours: 105, assignedTo: "Bilal Sheikh", status: "Not Started" },
        { project: pId, wbsCode: "6.0", title: "Controlled Substances Vault Biometrics & Audit", requirement: reqs[4]._id, estimatedHours: 85, assignedTo: "Ahmed Raza", status: "Not Started" },
        { project: pId, wbsCode: "7.0", title: "Full Consortium User Acceptance & Pharmacist Pilot", estimatedHours: 120, assignedTo: "Zainab Fatima", status: "Not Started" }
      ]);
      console.log(`Created ${wbs.length} WBS tasks for Pharmacy project.`);

      // 5. Activities & EVM Baseline (BAC = 4,200,000)
      const activities = await Activity.insertMany([
        {
          project: pId,
          wbsTask: wbs[0]._id,
          title: "Drug Master Catalog & Database Normalization",
          description: "Ingest 12,000 approved brand and generic SKUs with dosage forms, contraindications, and storage requirements.",
          assignedTo: "Faizan Asif",
          role: "Project Manager",
          startDate: new Date(startDate.getTime()),
          endDate: new Date(startDate.getTime() + 14 * 86400000),
          durationDays: 14,
          status: "Completed",
          delayDays: 0,
          estimatedCost: 500000,
          plannedCost: 500000,
          actualCost: 480000,
          percentComplete: 100
        },
        {
          project: pId,
          wbsTask: wbs[1]._id,
          title: "High-Speed Barcode Scanning Engine & Cashier POS UI",
          description: "USB and Bluetooth 2D barcode scanner parser, instant sound feedback, and itemized checkout screen.",
          assignedTo: "Sara Khan",
          role: "Frontend Developer",
          startDate: new Date(startDate.getTime() + 7 * 86400000),
          endDate: new Date(startDate.getTime() + 21 * 86400000),
          durationDays: 14,
          status: "Completed",
          delayDays: 0,
          estimatedCost: 650000,
          plannedCost: 650000,
          actualCost: 640000,
          percentComplete: 100
        },
        {
          project: pId,
          wbsTask: wbs[2]._id,
          title: "FEFO Inventory Engine & Multi-Branch Stock Ledger",
          description: "Automated batch picking prioritizing nearest expiry dates, branch transfer requests, and stock audits.",
          assignedTo: "Ahmed Raza",
          role: "Backend Developer",
          startDate: new Date(startDate.getTime() + 14 * 86400000),
          endDate: new Date(startDate.getTime() + 35 * 86400000),
          durationDays: 21,
          status: "In Progress",
          delayDays: 1,
          estimatedCost: 750000,
          plannedCost: 700000,
          actualCost: 690000,
          percentComplete: 80
        },
        {
          project: pId,
          wbsTask: wbs[3]._id,
          title: "EMR e-Prescription Real-Time Webhook & Dispense Station Queue",
          description: "WebSocket connection feeding incoming OPD prescriptions to designated pharmacy prep stations.",
          assignedTo: "Ahmed Raza",
          role: "Backend Developer",
          startDate: new Date(startDate.getTime() + 21 * 86400000),
          endDate: new Date(startDate.getTime() + 42 * 86400000),
          durationDays: 21,
          status: "In Progress",
          delayDays: 2,
          estimatedCost: 600000,
          plannedCost: 500000,
          actualCost: 520000,
          percentComplete: 60
        },
        {
          project: pId,
          wbsTask: wbs[4]._id,
          title: "IoT Cold-Chain Telemetry Integration & Emergency SMS Service",
          description: "MQTT sensor gateway for vaccine freezers, threshold violations, and automated escalation phone calls.",
          assignedTo: "Bilal Sheikh",
          role: "Database Developer",
          startDate: new Date(startDate.getTime() + 35 * 86400000),
          endDate: new Date(startDate.getTime() + 56 * 86400000),
          durationDays: 21,
          status: "Not Started",
          delayDays: 0,
          estimatedCost: 550000,
          plannedCost: 150000,
          actualCost: 0,
          percentComplete: 0
        },
        {
          project: pId,
          wbsTask: wbs[5]._id,
          title: "Controlled Substances Vault Biometrics & Audit Ledger",
          description: "Fingerprint scanner verification, dual-signoff PIN code logic, and automated DRAP narcotic return logs.",
          assignedTo: "Ahmed Raza",
          role: "Backend Developer",
          startDate: new Date(startDate.getTime() + 49 * 86400000),
          endDate: new Date(startDate.getTime() + 70 * 86400000),
          durationDays: 21,
          status: "Not Started",
          delayDays: 0,
          estimatedCost: 500000,
          plannedCost: 0,
          actualCost: 0,
          percentComplete: 0
        },
        {
          project: pId,
          wbsTask: wbs[6]._id,
          title: "Consortium-Wide Pharmacy Dry-Run & Pharmacist Staff Certification",
          description: "End-to-end simulated emergency rush hours across all 5 hospital pharmacies with QA sign-off.",
          assignedTo: "Zainab Fatima",
          role: "QA Engineer",
          startDate: new Date(startDate.getTime() + 70 * 86400000),
          endDate: new Date(startDate.getTime() + 98 * 86400000),
          durationDays: 28,
          status: "Not Started",
          delayDays: 0,
          estimatedCost: 650000,
          plannedCost: 0,
          actualCost: 0,
          percentComplete: 0
        }
      ]);
      console.log(`Created ${activities.length} activities for Pharmacy project.`);

      // 6. Change Requests
      await ChangeRequest.insertMany([
        {
          project: pId,
          title: "Automated Wholesaler EDI Purchase Order Integration",
          description: "Direct EDI integration with top 3 pharmaceutical suppliers to generate auto-PO whenever stock reaches safety re-order threshold.",
          justification: "Prevents critical drug shortages of lifesaving IV fluids and antibiotics during supply chain disruptions.",
          estimatedCostImpact: 350000,
          estimatedTimeImpactWeeks: 2,
          scopeImpact: "Minor",
          status: "Approved",
          reviewedBy: "Dr. Noman Bashir",
          reviewedAt: new Date(now.getTime() - 4 * 86400000)
        },
        {
          project: pId,
          title: "Patient Medication Pill Reminder WhatsApp Service",
          description: "Automated WhatsApp messages sent to discharged patients regarding dosage timings and refill reminders.",
          justification: "Improves chronic patient drug compliance and drives repeated outpatient pharmacy refills.",
          estimatedCostImpact: 180000,
          estimatedTimeImpactWeeks: 1,
          scopeImpact: "Minor",
          status: "Pending"
        }
      ]);
      console.log("Created Change Requests for Pharmacy project.");

      // 7. Defects
      await Defect.insertMany([
        {
          project: pId,
          title: "Barcode Scanner Misreads High-Density 2D Matrix Under Dim Hospital Lighting",
          description: "At Mayo Central night dispensary, optical scanners exhibit 15% fail rate reading small 2D codes on ampoules.",
          relatedModule: "Barcode Scanning",
          severity: "High",
          status: "In Progress",
          assignedTo: "Sara Khan",
          reportedAt: new Date(now.getTime() - 2 * 86400000),
          resolutionNotes: "Upgrading camera thresholding algorithm and adjusting LED illuminator timing on scanner firmware."
        },
        {
          project: pId,
          title: "Negative Stock Decrement Under Concurrent Dispense Rush",
          description: "When two cashiers simultaneously dispense the last box of Insulin Glargine, stock counter decrements to -1 instead of throwing concurrency conflict.",
          relatedModule: "Inventory Management",
          severity: "Critical",
          status: "Open",
          assignedTo: "Bilal Sheikh",
          reportedAt: new Date(now.getTime() - 1 * 86400000),
          resolutionNotes: "Apply MongoDB atomic $inc with condition { quantity: { $gte: reqQty } }."
        },
        {
          project: pId,
          title: "Receipt Printer Cut Margin Cuts Off Batch Expiry Timestamp",
          description: "Thermal receipt printer at Jinnah branch trims the bottom 4mm of the thermal paper cutting off the printed expiry date.",
          relatedModule: "POS & Invoicing",
          severity: "Medium",
          status: "Resolved",
          assignedTo: "Ahmed Raza",
          reportedAt: new Date(now.getTime() - 6 * 86400000),
          resolvedAt: new Date(now.getTime() - 2 * 86400000),
          resolutionNotes: "Configured bottom padding in thermal ESC/POS raw printer command."
        }
      ]);
      console.log("Created Defects for Pharmacy project.");

      // 8. Quality Checks
      await QualityCheck.insertMany([
        {
          project: pId,
          title: "GS1 Barcode Compliance & Verification Audit",
          relatedModule: "Barcode Scanning",
          checklistItems: [
            { item: "Validates 14-digit Global Trade Item Number (GTIN)", passed: true },
            { item: "Correctly parses Julian date expiry format", passed: true },
            { item: "Sub-300 millisecond optical decode latency", passed: false },
            { item: "Rejects unlisted counterfeit serial numbers", passed: true }
          ],
          result: "Pending",
          notes: "Scanner latency at 420ms exceeds target 300ms under battery power; awaiting firmware patch.",
          checkedBy: "Zainab Fatima",
          checkedAt: new Date(now.getTime() - 1 * 86400000)
        },
        {
          project: pId,
          title: "Cold-Chain Refrigerator Sensor Calibration Check",
          relatedModule: "Cold-Chain Surveillance",
          checklistItems: [
            { item: "NIST-traceable thermometer temperature cross-check", passed: true },
            { item: "SMS dispatch triggered within 60 seconds of simulated door open", passed: true },
            { item: "Backup battery backup sustains sensor for > 12 hours", passed: true }
          ],
          result: "Passed",
          notes: "All 5 hospital refrigerator telemetry systems calibrated and verified successfully.",
          checkedBy: "Zainab Fatima",
          checkedAt: new Date(now.getTime() - 5 * 86400000)
        }
      ]);
      console.log("Created Quality Checks for Pharmacy project.");

      // 9. Risks
      await Risk.insertMany([
        {
          project: pId,
          title: "Active Cold-Chain Vaccine Spoilage During Power Grid Failure",
          description: "Suburban hospital backup diesel generators experience delay starting during blackouts, putting PKR 2,000,000 worth of biologics at risk.",
          category: "Operational",
          likelihood: 4,
          impact: 5,
          riskScore: 20,
          riskLevel: "Critical",
          responseStrategy: "Mitigate",
          mitigationPlan: "Install dedicated online solar-powered uninterruptible power supplies (UPS) specifically for cold-chain freezers.",
          preventiveAction: "Phase-change PCM thermal cold-pack lining inside refrigerators providing 8 hours passive insulation.",
          contingencyAction: "Immediate automatic dispatch of mobile refrigerated transport van from central depot.",
          owner: "Dr. Noman Bashir",
          status: "Open"
        },
        {
          project: pId,
          title: "Counterfeit Medication Penetration Through Local Wholesalers",
          description: "Short supply of imported cancer immunotherapy drugs forces local emergency spot-buying with potential counterfeit exposure.",
          category: "Compliance",
          likelihood: 2,
          impact: 5,
          riskScore: 10,
          riskLevel: "Medium",
          responseStrategy: "Avoid",
          mitigationPlan: "Enforce mandatory manufacturer serial API verification before accepting any emergency batch into the central ledger.",
          preventiveAction: "Pre-approved vendor whitelist with strict legal indemnities.",
          contingencyAction: "Immediate quarantine of unverified batches and automated DRAP notification.",
          owner: "Dr. Maria Siddiqui",
          status: "Open"
        },
        {
          project: pId,
          title: "High Peak-Hour Dispense Queuing Causing Outpatient Frustration",
          description: "Morning outpatient surge between 10 AM and 1 PM creates 30+ patient lines outside pharmacy windows.",
          category: "Operational",
          likelihood: 4,
          impact: 3,
          riskScore: 12,
          riskLevel: "Medium",
          responseStrategy: "Mitigate",
          mitigationPlan: "Introduce automated digital queue numbering displays and mobile express pickup window.",
          preventiveAction: "Split prep stations into Fast-Track (single medication) and Complex Regimens.",
          contingencyAction: "Deploy floating pharmacy tech during rush hours for queue triage.",
          owner: "Faizan Asif",
          status: "Open"
        }
      ]);
      console.log("Created Risks for Pharmacy project.");
    } else {
      console.log("Pharmacy project already exists.");
    }

    console.log("\n==========================================");
    console.log("DATA SEEDING COMPLETED SUCCESSFULLY!");
    console.log("==========================================");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seedExtra();
