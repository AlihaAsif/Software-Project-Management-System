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

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    // Clear existing data
    await Promise.all([
      Project.deleteMany({}),
      Requirement.deleteMany({}),
      WBSTask.deleteMany({}),
      Activity.deleteMany({}),
      ChangeRequest.deleteMany({}),
      Defect.deleteMany({}),
      QualityCheck.deleteMany({}),
      Risk.deleteMany({})
    ]);
    console.log("Cleared existing collections.");

    const now = new Date();
    const startDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000); // 4 weeks ago
    const endDate = new Date(startDate.getTime() + 16 * 7 * 24 * 60 * 60 * 1000); // 16 weeks total

    // 1. Create Project
    const project = await Project.create({
      projectName: "Smart Healthcare Project Management System",
      charter: {
        purpose: "Design, build, and deploy an integrated Healthcare Management Information System across five teaching and general hospitals.",
        background: "A consortium of five hospitals (Mayo Central, Jinnah Memorial, Services General, Fatima Medical, and City Care) currently operates on disparate legacy paper and siloed systems, leading to double-bookings, delayed lab reports, and billing leakages.",
        projectManager: "Faizan Asif",
        sponsor: "Healthcare Regulatory & Hospital Consortium Board"
      },
      objectives: [
        "Unify patient appointments, doctor schedules, and electronic records across 5 hospital branches.",
        "Implement real-time lab report delivery and integrated telehealth consultations.",
        "Automate billing and claim reconciliation to reduce invoicing delays by 80%.",
        "Deliver the baseline solution within 16 weeks and the PKR 5,000,000 approved budget."
      ],
      stakeholders: [
        { name: "Faizan Asif", role: "Project Manager", responsibilities: "Overall project governance, schedule & EVM tracking, risk & change management" },
        { name: "Dr. Tariq Mahmood", role: "Sponsor", responsibilities: "Consortium executive sponsorship, milestone sign-off, budget authorization" },
        { name: "Ahmed Raza", role: "Backend Developer", responsibilities: "Microservices architecture, REST APIs, database schemas, and integration" },
        { name: "Sara Khan", role: "Frontend Developer", responsibilities: "React single-page application, responsive dashboard, UX/UI workflows" },
        { name: "Bilal Sheikh", role: "Database Developer", responsibilities: "MongoDB replication, data models, indexing, and FHIR data compliance" },
        { name: "Zainab Fatima", role: "QA Engineer", responsibilities: "Test automation, quality gate validation, defect lifecycle tracking" },
        { name: "Dr. Ayesha Malik", role: "Client", responsibilities: "Hospital clinical lead, user acceptance testing, operational workflows" }
      ],
      scopeIncluded: [
        "Centralized Patient Registration & Master Patient Index (MPI)",
        "Doctor Rostering, Availability & Appointment Scheduling",
        "Electronic Patient Medical Record (EMR) Management",
        "Diagnostic Lab Reports Management & Automated Notification",
        "Online Video Consultations (Telehealth) & Digital Prescriptions",
        "Hospital Billing, Invoice Generation & Multi-Branch Payment Tracking",
        "Project Management Governance: WBS, Schedule, EVM, Quality & Risks"
      ],
      scopeExcluded: [
        "Direct robotic surgical hardware integration",
        "Pharmaceutical warehouse supply chain logistics",
        "Physical biometric hardware manufacturing"
      ],
      budget: {
        total: 5000000,
        currency: "PKR",
        notes: "Approved Baseline Budget (BAC) of PKR 5,000,000 for 16-week delivery across 5 hospital branches."
      },
      deadline: {
        startDate,
        endDate,
        durationWeeks: 16
      },
      managementPlan: {
        communicationPlan: "Bi-weekly sprint reviews with hospital representatives; weekly EVM status dashboards to the sponsor; instant Slack alerts for critical defects.",
        riskManagementApproach: "Continuous risk log updates with qualitative impact/likelihood scoring (5x5 matrix); contingency reserves allocated for server infrastructure.",
        qualityStandards: "ISO 27001 & HIPAA health data standards; zero critical defects before deployment; mandatory pass rate > 90% across quality checklists."
      },
      status: "Execution",
      milestones: [
        { title: "M1: Project Charter & Architecture Baseline Approved", dueDate: new Date(startDate.getTime() + 14 * 86400000), completed: true },
        { title: "M2: Core Patient EMR & Doctor Scheduling MVP", dueDate: new Date(startDate.getTime() + 42 * 86400000), completed: true },
        { title: "M3: Lab Reports, Telehealth & Billing Integration", dueDate: new Date(startDate.getTime() + 70 * 86400000), completed: false },
        { title: "M4: Comprehensive Multi-Hospital Pilot Testing", dueDate: new Date(startDate.getTime() + 98 * 86400000), completed: false },
        { title: "M5: Final Go-Live Sign-Off & Project Closure", dueDate: endDate, completed: false }
      ],
      closure: {
        isClosed: false
      }
    });

    const projectId = project._id;
    console.log(`Created Project: "${project.projectName}" (${projectId})`);

    // 2. Requirements
    const reqData = [
      {
        project: projectId,
        title: "Multi-Hospital Central Patient Registration",
        description: "Allow patients to register online or at reception across any of the 5 hospital branches with unified CNIC/ID validation.",
        type: "Functional",
        priority: "High",
        approvalStatus: "Approved",
        approvedBy: "Faizan Asif",
        approvedAt: new Date(startDate.getTime() + 5 * 86400000)
      },
      {
        project: projectId,
        title: "Real-Time Appointment Scheduling & Concurrency Control",
        description: "Enable doctor slot booking with distributed lock mechanisms to strictly prevent double-booking for OPD and specialized clinics.",
        type: "Functional",
        priority: "High",
        approvalStatus: "Approved",
        approvedBy: "Faizan Asif",
        approvedAt: new Date(startDate.getTime() + 7 * 86400000)
      },
      {
        project: projectId,
        title: "Electronic Patient Medical Record (EMR) Management",
        description: "Maintain historical diagnoses, prescription history, allergies, and clinical vitals compliant with HL7 FHIR standards.",
        type: "Functional",
        priority: "High",
        approvalStatus: "Approved",
        approvedBy: "Faizan Asif",
        approvedAt: new Date(startDate.getTime() + 8 * 86400000)
      },
      {
        project: projectId,
        title: "Doctor Schedule Rostering & Leave Management",
        description: "Dynamic duty roaster for 250+ doctors across emergency, inpatient, and outpatient shifts with automated cover notifications.",
        type: "Functional",
        priority: "Medium",
        approvalStatus: "Approved",
        approvedBy: "Faizan Asif",
        approvedAt: new Date(startDate.getTime() + 10 * 86400000)
      },
      {
        project: projectId,
        title: "Diagnostic Lab Reports Dispatch & SMS Notifications",
        description: "Pathology and radiology report uploads with automated patient SMS and secure PDF download link.",
        type: "Functional",
        priority: "Medium",
        approvalStatus: "Approved",
        approvedBy: "Faizan Asif",
        approvedAt: new Date(startDate.getTime() + 11 * 86400000)
      },
      {
        project: projectId,
        title: "Telehealth Video Consultations & e-Prescriptions",
        description: "WebRTC peer-to-peer encrypted video consultation with interactive prescription builder during consultation.",
        type: "Functional",
        priority: "High",
        approvalStatus: "Approved",
        approvedBy: "Faizan Asif",
        approvedAt: new Date(startDate.getTime() + 12 * 86400000)
      },
      {
        project: projectId,
        title: "Centralized Billing, Invoicing & Claim Reconciliation",
        description: "Itemized billing for lab, pharmacy, OPD, and room charges supporting cash, card, and health insurance claims.",
        type: "Functional",
        priority: "High",
        approvalStatus: "Approved",
        approvedBy: "Faizan Asif",
        approvedAt: new Date(startDate.getTime() + 14 * 86400000)
      },
      {
        project: projectId,
        title: "Healthcare Data Encryption & HIPAA/ISO Privacy Compliance",
        description: "AES-256 encryption at rest and TLS 1.3 in transit for all patient medical records and diagnostic files.",
        type: "Non-Functional",
        priority: "High",
        approvalStatus: "Approved",
        approvedBy: "Dr. Tariq Mahmood",
        approvedAt: new Date(startDate.getTime() + 14 * 86400000)
      },
      {
        project: projectId,
        title: "System Performance Under Peak Concurrency",
        description: "Sub-1.5 second API response time under 1,500 simultaneous concurrent users across the 5 hospitals.",
        type: "Technical",
        priority: "Medium",
        approvalStatus: "Pending"
      }
    ];

    const createdReqs = await Requirement.insertMany(reqData);
    console.log(`Created ${createdReqs.length} Requirements.`);

    // 3. Work Breakdown Structure (WBS)
    const wbsData = [
      { project: projectId, wbsCode: "1.0", title: "Project Initiation & Architecture Baseline", estimatedHours: 80, assignedTo: "Faizan Asif", status: "Completed" },
      { project: projectId, wbsCode: "1.1", title: "Infrastructure & MongoDB Cluster Setup", estimatedHours: 60, assignedTo: "Bilal Sheikh", status: "Completed" },
      { project: projectId, wbsCode: "2.0", title: "Patient Registration & EMR Module", requirement: createdReqs[0]._id, estimatedHours: 120, assignedTo: "Ahmed Raza", status: "In Progress" },
      { project: projectId, wbsCode: "2.1", title: "EMR Concurrency & Medical Data Access Control", requirement: createdReqs[2]._id, estimatedHours: 90, assignedTo: "Ahmed Raza", status: "In Progress" },
      { project: projectId, wbsCode: "3.0", title: "Doctor Rostering & Appointment Engine", requirement: createdReqs[1]._id, estimatedHours: 140, assignedTo: "Sara Khan", status: "In Progress" },
      { project: projectId, wbsCode: "4.0", title: "Diagnostic Lab Reports & Notification Service", requirement: createdReqs[4]._id, estimatedHours: 100, assignedTo: "Ahmed Raza", status: "Not Started" },
      { project: projectId, wbsCode: "5.0", title: "Telehealth Consultation & e-Prescription Module", requirement: createdReqs[5]._id, estimatedHours: 130, assignedTo: "Sara Khan", status: "Not Started" },
      { project: projectId, wbsCode: "6.0", title: "Billing, Invoicing & Insurance Claim Engine", requirement: createdReqs[6]._id, estimatedHours: 110, assignedTo: "Ahmed Raza", status: "Not Started" },
      { project: projectId, wbsCode: "7.0", title: "Quality Assurance & Multi-Hospital Pilot Testing", estimatedHours: 150, assignedTo: "Zainab Fatima", status: "Not Started" }
    ];

    const createdWBS = await WBSTask.insertMany(wbsData);
    console.log(`Created ${createdWBS.length} WBS Tasks.`);

    // 4. Activities & Earned Value Management (EVM) Baseline
    // Total BAC sums to PKR 5,000,000 across 16 weeks
    const activitiesData = [
      {
        project: projectId,
        wbsTask: createdWBS[0]._id,
        title: "Project Charter, Governance & Architectural Blueprint",
        description: "Formalize project charter, stakeholder RACI matrix, and microservice container topology.",
        assignedTo: "Faizan Asif",
        role: "Project Manager",
        startDate: new Date(startDate.getTime()),
        endDate: new Date(startDate.getTime() + 14 * 86400000),
        durationDays: 14,
        status: "Completed",
        delayDays: 0,
        estimatedCost: 400000, // BAC
        plannedCost: 400000,   // PV
        actualCost: 390000,    // AC
        percentComplete: 100
      },
      {
        project: projectId,
        wbsTask: createdWBS[1]._id,
        title: "Cloud Infrastructure, MongoDB Atlas & Security hardening",
        description: "Set up production MongoDB replica set, TLS certificates, and CI/CD pipelines.",
        assignedTo: "Bilal Sheikh",
        role: "Database Developer",
        startDate: new Date(startDate.getTime() + 7 * 86400000),
        endDate: new Date(startDate.getTime() + 21 * 86400000),
        durationDays: 14,
        status: "Completed",
        delayDays: 0,
        estimatedCost: 450000,
        plannedCost: 450000,
        actualCost: 460000,
        percentComplete: 100
      },
      {
        project: projectId,
        wbsTask: createdWBS[2]._id,
        title: "Patient Registration & EMR Database Schema Implementation",
        description: "Patient profile APIs, demographic indexes, and medical record versioning.",
        assignedTo: "Ahmed Raza",
        role: "Backend Developer",
        startDate: new Date(startDate.getTime() + 14 * 86400000),
        endDate: new Date(startDate.getTime() + 35 * 86400000),
        durationDays: 21,
        status: "In Progress",
        delayDays: 2,
        estimatedCost: 650000,
        plannedCost: 650000,
        actualCost: 670000,
        percentComplete: 85
      },
      {
        project: projectId,
        wbsTask: createdWBS[4]._id,
        title: "Doctor Schedule Rostering & Slot Allocation Engine",
        description: "Calendar view for doctors across 5 branches, shift templates, and leave overrides.",
        assignedTo: "Sara Khan",
        role: "Frontend Developer",
        startDate: new Date(startDate.getTime() + 21 * 86400000),
        endDate: new Date(startDate.getTime() + 42 * 86400000),
        durationDays: 21,
        status: "In Progress",
        delayDays: 3,
        estimatedCost: 600000,
        plannedCost: 550000,
        actualCost: 580000,
        percentComplete: 70
      },
      {
        project: projectId,
        wbsTask: createdWBS[4]._id,
        title: "Real-Time Appointment Booking & Anti-Double-Booking Guard",
        description: "Booking API with transactional isolation to guarantee zero slot conflicts during peak morning rush.",
        assignedTo: "Ahmed Raza",
        role: "Backend Developer",
        startDate: new Date(startDate.getTime() + 28 * 86400000),
        endDate: new Date(startDate.getTime() + 49 * 86400000),
        durationDays: 21,
        status: "In Progress",
        delayDays: 4,
        estimatedCost: 700000,
        plannedCost: 400000,
        actualCost: 480000,
        percentComplete: 50
      },
      {
        project: projectId,
        wbsTask: createdWBS[5]._id,
        title: "Diagnostic Lab Reports Engine & Automated SMS Dispatch",
        description: "Integration with hospital laboratory analyzers, PDF report stamping, and patient SMS gateway.",
        assignedTo: "Ahmed Raza",
        role: "Backend Developer",
        startDate: new Date(startDate.getTime() + 42 * 86400000),
        endDate: new Date(startDate.getTime() + 63 * 86400000),
        durationDays: 21,
        status: "Not Started",
        delayDays: 0,
        estimatedCost: 550000,
        plannedCost: 100000,
        actualCost: 0,
        percentComplete: 0
      },
      {
        project: projectId,
        wbsTask: createdWBS[6]._id,
        title: "Telehealth WebRTC Video Consultations & e-Prescriptions",
        description: "Encrypted browser-to-browser clinical consultations with embedded digital Rx signing.",
        assignedTo: "Sara Khan",
        role: "Frontend Developer",
        startDate: new Date(startDate.getTime() + 49 * 86400000),
        endDate: new Date(startDate.getTime() + 77 * 86400000),
        durationDays: 28,
        status: "Not Started",
        delayDays: 0,
        estimatedCost: 650000,
        plannedCost: 0,
        actualCost: 0,
        percentComplete: 0
      },
      {
        project: projectId,
        wbsTask: createdWBS[7]._id,
        title: "Multi-Hospital Centralized Billing & Claims Engine",
        description: "Consolidated POS, payment gateway, insurance claim verification, and receipt printing.",
        assignedTo: "Ahmed Raza",
        role: "Backend Developer",
        startDate: new Date(startDate.getTime() + 63 * 86400000),
        endDate: new Date(startDate.getTime() + 91 * 86400000),
        durationDays: 28,
        status: "Not Started",
        delayDays: 0,
        estimatedCost: 550000,
        plannedCost: 0,
        actualCost: 0,
        percentComplete: 0
      },
      {
        project: projectId,
        wbsTask: createdWBS[8]._id,
        title: "System Integration, Security Audit & User Acceptance Testing",
        description: "Hospital-wide end-to-end UAT across all 5 hospital branches with clinical staff.",
        assignedTo: "Zainab Fatima",
        role: "QA Engineer",
        startDate: new Date(startDate.getTime() + 84 * 86400000),
        endDate: new Date(startDate.getTime() + 112 * 86400000),
        durationDays: 28,
        status: "Not Started",
        delayDays: 0,
        estimatedCost: 450000,
        plannedCost: 0,
        actualCost: 0,
        percentComplete: 0
      }
    ];

    const createdActivities = await Activity.insertMany(activitiesData);
    console.log(`Created ${createdActivities.length} Activities (Total BAC = PKR 5,000,000).`);

    // 5. Change Request (Proposed AI & Mobile App addition)
    const cr = await ChangeRequest.create({
      project: projectId,
      title: "AI-Based Preliminary Diagnosis & Patient Mobile Application",
      description: "Integrate an AI-assisted symptom checker for preliminary triage before OPD visits, along with cross-platform iOS and Android mobile apps for patients.",
      justification: "Allows remote triage to reduce non-emergency overcrowding in hospital waiting rooms and enables patients across remote regions to access telemedicine seamlessly.",
      estimatedCostImpact: 800000,
      estimatedTimeImpactWeeks: 3,
      scopeImpact: "Major",
      status: "Pending",
      impactAnalysis: {
        scopeEffect: "Adds AI model inference microservice, Flutter/React Native mobile codebase, and push notification infrastructure.",
        scheduleEffect: "Increases baseline schedule from 16 weeks to 19 weeks.",
        costEffect: "Increases baseline budget from PKR 5,000,000 to PKR 5,800,000 (16% budget increase).",
        riskEffect: "Moderate clinical liability risk; requires regulatory disclaimers and rigorous model validation."
      }
    });
    console.log(`Created Change Request: "${cr.title}"`);

    // 6. Critical Defects (Both appointment scheduling & patient record management)
    const defectsData = [
      {
        project: projectId,
        title: "Appointment Double-Booking Under High Concurrency",
        description: "When two patients book the same doctor slot at Mayo Central within milliseconds, the transaction commits both, creating overlapping appointments.",
        relatedModule: "Appointment Scheduling",
        severity: "Critical",
        status: "In Progress",
        assignedTo: "Ahmed Raza",
        reportedAt: new Date(now.getTime() - 3 * 86400000),
        resolutionNotes: "Implementing distributed MongoDB optimistic locking with unique compound indexes on (doctorId, slotDateTime)."
      },
      {
        project: projectId,
        title: "Patient Medical Record Concurrency Overwrite & Data Loss",
        description: "Concurrent updates by the attending doctor and lab technician cause partial overwrite of historical diagnosis notes.",
        relatedModule: "Patient Record Management",
        severity: "Critical",
        status: "Open",
        assignedTo: "Bilal Sheikh",
        reportedAt: new Date(now.getTime() - 2 * 86400000),
        resolutionNotes: "Requires document versioning (optimistic lock field) and sub-document patching rather than full document replacement."
      },
      {
        project: projectId,
        title: "Diagnostic Lab PDF Generation Memory Spike",
        description: "Large radiology multi-page reports cause node process memory to exceed 1.2 GB during peak batch exports.",
        relatedModule: "Lab Reports",
        severity: "High",
        status: "Open",
        assignedTo: "Ahmed Raza",
        reportedAt: new Date(now.getTime() - 5 * 86400000)
      },
      {
        project: projectId,
        title: "Billing Invoice Rounding Discrepancy on Split Payments",
        description: "Split payments between cash and insurance lead to 1-rupee fractional roundoff errors in daily reconciliation.",
        relatedModule: "Billing",
        severity: "Medium",
        status: "Resolved",
        assignedTo: "Ahmed Raza",
        reportedAt: new Date(now.getTime() - 8 * 86400000),
        resolvedAt: new Date(now.getTime() - 1 * 86400000),
        resolutionNotes: "Adjusted math to standard integer paisas calculation before formatting."
      }
    ];

    const createdDefects = await Defect.insertMany(defectsData);
    console.log(`Created ${createdDefects.length} Defects (including 2 Critical).`);

    // 7. Quality Checks
    const qualityData = [
      {
        project: projectId,
        title: "Patient Record Management & HIPAA Security Audit",
        relatedModule: "Patient Record Management",
        checklistItems: [
          { item: "AES-256 field encryption for confidential diagnosis", passed: true },
          { item: "Role-based access control (Doctor vs Nurse vs Receptionist)", passed: true },
          { item: "Audit logging on every patient record read/write", passed: true },
          { item: "HL7 FHIR JSON payload format validation", passed: false }
        ],
        result: "Pending",
        notes: "FHIR schema validator failed on international ICD-10 code mapping; scheduled for sprint 3 patch.",
        checkedBy: "Zainab Fatima",
        checkedAt: new Date(now.getTime() - 2 * 86400000)
      },
      {
        project: projectId,
        title: "Appointment Scheduling Concurrency Stress Test",
        relatedModule: "Appointment Scheduling",
        checklistItems: [
          { item: "Simulate 500 simultaneous bookings on single doctor slot", passed: false },
          { item: "Slot cancellation and waitlist promotion within 2 seconds", passed: true },
          { item: "Doctor emergency schedule override with patient SMS alerts", passed: true }
        ],
        result: "Failed",
        notes: "Failed concurrency test due to appointment double-booking bug DEF-01.",
        checkedBy: "Zainab Fatima",
        checkedAt: new Date(now.getTime() - 3 * 86400000)
      },
      {
        project: projectId,
        title: "Diagnostic Lab Reports Integrity & Dispatch Verification",
        relatedModule: "Lab Reports",
        checklistItems: [
          { item: "Verified PDF watermark and doctor digital signature", passed: true },
          { item: "Automated SMS delivery within 30 seconds of approval", passed: true },
          { item: "Abnormal result critical alert flag to attending physician", passed: true }
        ],
        result: "Passed",
        notes: "All laboratory dispatch criteria successfully passed QA validation.",
        checkedBy: "Zainab Fatima",
        checkedAt: new Date(now.getTime() - 4 * 86400000)
      }
    ];

    const createdQuality = await QualityCheck.insertMany(qualityData);
    console.log(`Created ${createdQuality.length} Quality Checks.`);

    // 8. Risks (with PDPC / mitigation strategies)
    const risksData = [
      {
        project: projectId,
        title: "Hospital Central Server & Connectivity Outage",
        description: "Unstable internet or local server power failure in suburban hospital branches disrupts live appointment check-ins and billing.",
        category: "Operational",
        likelihood: 4,
        impact: 5,
        riskScore: 20,
        riskLevel: "Critical",
        responseStrategy: "Mitigate",
        preventiveAction: "Implement local PWA offline storage with automated background sync once connection is restored; install dual redundant ISP failovers.",
        contingencyAction: "Switch immediately to cellular LTE 4G gateway backup with manual queue numbering protocol.",
        owner: "Bilal Sheikh",
        status: "Open"
      },
      {
        project: projectId,
        title: "Healthcare Data Breach & Regulatory Penalties",
        description: "Exposure of electronic patient records due to misconfigured API permissions or credential compromise.",
        category: "Compliance",
        likelihood: 3,
        impact: 5,
        riskScore: 15,
        riskLevel: "High",
        responseStrategy: "Mitigate",
        preventiveAction: "Enforce JWT expiry within 15 minutes, strict role-based access, and automated penetration testing before deployment.",
        contingencyAction: "Immediate token invalidation, automated incident response isolation, and regulatory disclosure within 24 hours.",
        owner: "Faizan Asif",
        status: "Open"
      },
      {
        project: projectId,
        title: "Senior Doctor Resistance to New Scheduling System",
        description: "Senior medical consultants reluctant to use digital rosters, preferring existing paper or personal assistant channels.",
        category: "Technical",
        likelihood: 4,
        impact: 3,
        riskScore: 12,
        riskLevel: "High",
        responseStrategy: "Mitigate",
        preventiveAction: "Provide 1-on-1 mobile assistant onboarding for department heads; allow doctor assistants to manage calendar on their behalf.",
        contingencyAction: "Designated hospital clinical IT concierges stationed at OPD departments during first 3 weeks of go-live.",
        owner: "Dr. Ayesha Malik",
        status: "Open"
      },
      {
        project: projectId,
        title: "Third-Party Pathology Analyzer Protocol Discrepancies",
        description: "Legacy laboratory hardware in Jinnah Memorial uses outdated serial COM interfaces instead of modern TCP/IP HL7 output.",
        category: "Technical",
        likelihood: 3,
        impact: 3,
        riskScore: 9,
        riskLevel: "Medium",
        responseStrategy: "Mitigate",
        preventiveAction: "Develop lightweight middleware driver adapter for legacy RS-232 serial data ingestion.",
        contingencyAction: "Provide simplified manual batch CSV report upload interface for lab technicians.",
        owner: "Ahmed Raza",
        status: "Open"
      }
    ];

    const createdRisks = await Risk.insertMany(risksData);
    console.log(`Created ${createdRisks.length} Risks.`);

    console.log("\n==========================================");
    console.log("SMART HEALTHCARE SEED DATA POPULATED SUCCESSFULLY!");
    console.log(`Project ID: ${projectId}`);
    console.log("==========================================");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

seed();
