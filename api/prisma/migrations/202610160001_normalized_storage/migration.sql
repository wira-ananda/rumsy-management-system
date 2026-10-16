-- CreateTable
CREATE TABLE "rms_clients" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "id" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "rms_leads" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "id" TEXT,
    "dateIn" TEXT,
    "client" TEXT,
    "phone" TEXT,
    "source" TEXT,
    "location" TEXT,
    "need" TEXT,
    "sales" TEXT,
    "nextFollowUp" TEXT,
    "notes" TEXT,
    "stage" TEXT,
    "lastActivity" TEXT,
    "pipelineSide" TEXT,
    "previousStage" TEXT,
    "sideReason" TEXT,
    "dp" REAL,
    "margin" REAL,
    "estGambar" REAL,
    "estRab" REAL,
    "estAsstCr" REAL,
    "milestones" JSONB
);

-- CreateTable
CREATE TABLE "rms_crm_activities" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "id" TEXT,
    "date" TEXT,
    "leadId" TEXT,
    "client" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "category" TEXT,
    "channel" TEXT,
    "subject" TEXT,
    "pic" TEXT,
    "next" TEXT,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "rms_projects" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "id" TEXT,
    "clientId" TEXT,
    "leadId" TEXT,
    "name" TEXT,
    "client" TEXT,
    "location" TEXT,
    "sales" TEXT,
    "salesUserId" TEXT,
    "ops" TEXT,
    "opsUserId" TEXT,
    "qc" TEXT,
    "qcUserId" TEXT,
    "status" TEXT,
    "startDate" TEXT,
    "targetFinish" TEXT,
    "actualFinish" TEXT,
    "progress" REAL,
    "originalContract" REAL,
    "started" BOOLEAN,
    "completionApproved" BOOLEAN
);

-- CreateTable
CREATE TABLE "rms_tasks" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "id" TEXT,
    "title" TEXT,
    "description" TEXT,
    "projectId" TEXT,
    "reviewerUserId" TEXT,
    "startDate" TEXT,
    "due" TEXT,
    "priority" TEXT,
    "picUserId" TEXT,
    "pic" TEXT,
    "picEmail" TEXT,
    "reviewerName" TEXT,
    "reviewerEmail" TEXT,
    "creator" TEXT,
    "creatorUserId" TEXT,
    "status" TEXT,
    "submittedAt" TEXT,
    "completedAt" TEXT,
    "reviewNote" TEXT,
    "emailStatus" TEXT,
    "startedAt" TEXT,
    "updatedAt" TEXT,
    "cancelledAt" TEXT,
    "updatedBy" TEXT,
    "revisionCount" INTEGER,
    "picUserIds" JSONB
);

-- CreateTable
CREATE TABLE "rms_approvals" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "id" TEXT,
    "type" TEXT,
    "reference" TEXT,
    "projectId" TEXT,
    "subject" TEXT,
    "requestedBy" TEXT,
    "approver" TEXT,
    "status" TEXT,
    "comment" TEXT,
    "requestedAt" TEXT,
    "decisionAt" TEXT
);

-- CreateTable
CREATE TABLE "rms_support_tickets" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "id" TEXT,
    "title" TEXT,
    "description" TEXT,
    "category" TEXT,
    "priority" TEXT,
    "due" TEXT,
    "requester" TEXT,
    "assigned" TEXT,
    "status" TEXT,
    "projectId" TEXT
);

-- CreateTable
CREATE TABLE "rms_escalations" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "id" TEXT,
    "projectId" TEXT,
    "category" TEXT,
    "subject" TEXT,
    "description" TEXT,
    "risk" TEXT,
    "recommendation" TEXT,
    "status" TEXT,
    "submittedAt" TEXT,
    "reviewedAt" TEXT,
    "reviewer" TEXT,
    "note" TEXT,
    "confidential" BOOLEAN
);

-- CreateTable
CREATE TABLE "rms_notifications" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "id" TEXT,
    "type" TEXT,
    "text" TEXT,
    "date" TEXT,
    "read" BOOLEAN
);

-- CreateTable
CREATE TABLE "rms_business_audit" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "at" TEXT,
    "actor" TEXT,
    "entity" TEXT,
    "entityId" TEXT,
    "action" TEXT,
    "detail" TEXT
);

-- CreateTable
CREATE TABLE "rms_correspondence" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "id" TEXT,
    "direction" TEXT,
    "date" TEXT,
    "number" TEXT,
    "party" TEXT,
    "subject" TEXT,
    "projectId" TEXT,
    "notes" TEXT,
    "fileId" TEXT,
    "fileName" TEXT,
    "createdBy" TEXT,
    "createdAt" TEXT,
    "updatedBy" TEXT
);

-- CreateTable
CREATE TABLE "rms_sales_daily_reports" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "id" TEXT,
    "date" TEXT,
    "sales" TEXT,
    "salesUserId" TEXT,
    "notes" TEXT,
    "activities" TEXT,
    "obstacles" TEXT,
    "nextPlan" TEXT,
    "createdAt" TEXT,
    "createdBy" TEXT,
    "updatedAt" TEXT,
    "updatedBy" TEXT,
    "metrics" JSONB
);

-- CreateTable
CREATE TABLE "rms_user_access_overrides" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "userId" INTEGER,
    "add" JSONB,
    "remove" JSONB
);

-- CreateTable
CREATE TABLE "rms_lead_chat" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "parentKey" TEXT NOT NULL,
    "id" TEXT,
    "actor" TEXT,
    "role" TEXT,
    "text" TEXT,
    "attachment" TEXT,
    "attachmentFileId" TEXT,
    "at" TEXT,
    "system" BOOLEAN,
    CONSTRAINT "rms_lead_chat_parentKey_fkey" FOREIGN KEY ("parentKey") REFERENCES "rms_leads" ("storageKey") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rms_project_contracts" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "parentKey" TEXT NOT NULL,
    "number" TEXT,
    "date" TEXT,
    "status" TEXT,
    "dp" REAL,
    "margin" REAL,
    "tenor" REAL,
    CONSTRAINT "rms_project_contracts_parentKey_fkey" FOREIGN KEY ("parentKey") REFERENCES "rms_projects" ("storageKey") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rms_project_handovers" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "parentKey" TEXT NOT NULL,
    "status" TEXT,
    "submittedAt" TEXT,
    "reviewedAt" TEXT,
    "note" TEXT,
    CONSTRAINT "rms_project_handovers_parentKey_fkey" FOREIGN KEY ("parentKey") REFERENCES "rms_projects" ("storageKey") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rms_project_portals" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "parentKey" TEXT NOT NULL,
    "token" TEXT,
    "createdAt" TEXT,
    "enabled" BOOLEAN,
    CONSTRAINT "rms_project_portals_parentKey_fkey" FOREIGN KEY ("parentKey") REFERENCES "rms_projects" ("storageKey") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rms_payments" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "parentKey" TEXT NOT NULL,
    "id" TEXT,
    "installmentId" TEXT,
    "type" TEXT,
    "label" TEXT,
    "date" TEXT,
    "status" TEXT,
    "proofName" TEXT,
    "proofFileId" TEXT,
    "bank" TEXT,
    "sender" TEXT,
    "reference" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TEXT,
    "notes" TEXT,
    "amount" REAL,
    "proofData" JSONB,
    CONSTRAINT "rms_payments_parentKey_fkey" FOREIGN KEY ("parentKey") REFERENCES "rms_projects" ("storageKey") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rms_installments" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "parentKey" TEXT NOT NULL,
    "id" TEXT,
    "type" TEXT,
    "seq" TEXT,
    "due" TEXT,
    "dueAmount" REAL,
    CONSTRAINT "rms_installments_parentKey_fkey" FOREIGN KEY ("parentKey") REFERENCES "rms_projects" ("storageKey") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rms_addendums" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "parentKey" TEXT NOT NULL,
    "id" TEXT,
    "number" TEXT,
    "date" TEXT,
    "description" TEXT,
    "status" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TEXT,
    "rejectedBy" TEXT,
    "rejectedAt" TEXT,
    "rejectionReason" TEXT,
    "fileId" TEXT,
    "fileName" TEXT,
    "value" REAL,
    "addendumFile" JSONB,
    CONSTRAINT "rms_addendums_parentKey_fkey" FOREIGN KEY ("parentKey") REFERENCES "rms_projects" ("storageKey") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rms_project_documents" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "parentKey" TEXT NOT NULL,
    "id" TEXT,
    "category" TEXT,
    "type" TEXT,
    "name" TEXT,
    "fileId" TEXT,
    "status" TEXT,
    "date" TEXT,
    "version" INTEGER,
    CONSTRAINT "rms_project_documents_parentKey_fkey" FOREIGN KEY ("parentKey") REFERENCES "rms_projects" ("storageKey") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rms_inspections" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "parentKey" TEXT NOT NULL,
    "id" TEXT,
    "date" TEXT,
    "category" TEXT,
    "area" TEXT,
    "item" TEXT,
    "result" TEXT,
    "inspector" TEXT,
    CONSTRAINT "rms_inspections_parentKey_fkey" FOREIGN KEY ("parentKey") REFERENCES "rms_projects" ("storageKey") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rms_qc_findings" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "parentKey" TEXT NOT NULL,
    "id" TEXT,
    "inspectionId" TEXT,
    "category" TEXT,
    "area" TEXT,
    "item" TEXT,
    "severity" TEXT,
    "description" TEXT,
    "pic" TEXT,
    "target" TEXT,
    "status" TEXT,
    "beforeName" TEXT,
    "afterName" TEXT,
    "corrective" TEXT,
    "beforeFileId" TEXT,
    "afterFileId" TEXT,
    CONSTRAINT "rms_qc_findings_parentKey_fkey" FOREIGN KEY ("parentKey") REFERENCES "rms_projects" ("storageKey") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rms_daily_reports" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "parentKey" TEXT NOT NULL,
    "id" TEXT,
    "activities" TEXT,
    "issues" TEXT,
    "nextPlan" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TEXT,
    "date" TEXT,
    "fileId" TEXT,
    "fileName" TEXT,
    "createdBy" TEXT,
    "createdAt" TEXT,
    "progress" REAL,
    "published" BOOLEAN,
    CONSTRAINT "rms_daily_reports_parentKey_fkey" FOREIGN KEY ("parentKey") REFERENCES "rms_projects" ("storageKey") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rms_weekly_reports" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "parentKey" TEXT NOT NULL,
    "id" TEXT,
    "start" TEXT,
    "end" TEXT,
    "activities" TEXT,
    "issues" TEXT,
    "nextPlan" TEXT,
    "fileId" TEXT,
    "fileName" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TEXT,
    "createdBy" TEXT,
    "createdAt" TEXT,
    "progress" REAL,
    "targetProgress" REAL,
    "published" BOOLEAN,
    CONSTRAINT "rms_weekly_reports_parentKey_fkey" FOREIGN KEY ("parentKey") REFERENCES "rms_projects" ("storageKey") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rms_daily_photos" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "parentKey" TEXT NOT NULL,
    "id" TEXT,
    "name" TEXT,
    "caption" TEXT,
    "uploadedAt" TEXT,
    "uploadedBy" TEXT,
    CONSTRAINT "rms_daily_photos_parentKey_fkey" FOREIGN KEY ("parentKey") REFERENCES "rms_daily_reports" ("storageKey") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rms_weekly_photos" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "parentKey" TEXT NOT NULL,
    "id" TEXT,
    "name" TEXT,
    "caption" TEXT,
    "uploadedAt" TEXT,
    "uploadedBy" TEXT,
    CONSTRAINT "rms_weekly_photos_parentKey_fkey" FOREIGN KEY ("parentKey") REFERENCES "rms_weekly_reports" ("storageKey") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rms_project_activity" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "parentKey" TEXT NOT NULL,
    "at" TEXT,
    "actor" TEXT,
    "text" TEXT,
    CONSTRAINT "rms_project_activity_parentKey_fkey" FOREIGN KEY ("parentKey") REFERENCES "rms_projects" ("storageKey") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rms_project_chat" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "parentKey" TEXT NOT NULL,
    "id" TEXT,
    "actor" TEXT,
    "role" TEXT,
    "text" TEXT,
    "attachment" TEXT,
    "attachmentFileId" TEXT,
    "at" TEXT,
    "system" BOOLEAN,
    CONSTRAINT "rms_project_chat_parentKey_fkey" FOREIGN KEY ("parentKey") REFERENCES "rms_projects" ("storageKey") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rms_task_history" (
    "storageKey" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "legacyShape" JSONB NOT NULL,
    "extra" JSONB NOT NULL,
    "parentKey" TEXT NOT NULL,
    "at" TEXT,
    "actor" TEXT,
    "from" TEXT,
    "to" TEXT,
    "note" TEXT,
    "action" TEXT,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    CONSTRAINT "rms_task_history_parentKey_fkey" FOREIGN KEY ("parentKey") REFERENCES "rms_tasks" ("storageKey") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rms_storage_meta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "version" INTEGER NOT NULL,
    "format" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "writeToken" TEXT NOT NULL,
    "rootShape" JSONB NOT NULL
);

-- CreateTable
CREATE TABLE "rms_root_fields" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" JSONB NOT NULL
);

-- CreateTable
CREATE TABLE "rms_migration_history" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "checksum" TEXT NOT NULL,
    "appliedAt" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "rms_clients_sortOrder_idx" ON "rms_clients"("sortOrder");

-- CreateIndex
CREATE INDEX "rms_clients_name_idx" ON "rms_clients"("name");

-- CreateIndex
CREATE INDEX "rms_leads_sortOrder_idx" ON "rms_leads"("sortOrder");

-- CreateIndex
CREATE INDEX "rms_leads_stage_idx" ON "rms_leads"("stage");

-- CreateIndex
CREATE INDEX "rms_leads_sales_idx" ON "rms_leads"("sales");

-- CreateIndex
CREATE INDEX "rms_leads_nextFollowUp_idx" ON "rms_leads"("nextFollowUp");

-- CreateIndex
CREATE INDEX "rms_crm_activities_sortOrder_idx" ON "rms_crm_activities"("sortOrder");

-- CreateIndex
CREATE INDEX "rms_crm_activities_leadId_idx" ON "rms_crm_activities"("leadId");

-- CreateIndex
CREATE INDEX "rms_crm_activities_date_idx" ON "rms_crm_activities"("date");

-- CreateIndex
CREATE INDEX "rms_projects_sortOrder_idx" ON "rms_projects"("sortOrder");

-- CreateIndex
CREATE INDEX "rms_projects_clientId_idx" ON "rms_projects"("clientId");

-- CreateIndex
CREATE INDEX "rms_projects_leadId_idx" ON "rms_projects"("leadId");

-- CreateIndex
CREATE INDEX "rms_projects_status_idx" ON "rms_projects"("status");

-- CreateIndex
CREATE INDEX "rms_projects_salesUserId_idx" ON "rms_projects"("salesUserId");

-- CreateIndex
CREATE INDEX "rms_projects_opsUserId_idx" ON "rms_projects"("opsUserId");

-- CreateIndex
CREATE INDEX "rms_tasks_sortOrder_idx" ON "rms_tasks"("sortOrder");

-- CreateIndex
CREATE INDEX "rms_tasks_projectId_idx" ON "rms_tasks"("projectId");

-- CreateIndex
CREATE INDEX "rms_tasks_picUserId_idx" ON "rms_tasks"("picUserId");

-- CreateIndex
CREATE INDEX "rms_tasks_reviewerUserId_idx" ON "rms_tasks"("reviewerUserId");

-- CreateIndex
CREATE INDEX "rms_tasks_status_idx" ON "rms_tasks"("status");

-- CreateIndex
CREATE INDEX "rms_tasks_due_idx" ON "rms_tasks"("due");

-- CreateIndex
CREATE INDEX "rms_approvals_sortOrder_idx" ON "rms_approvals"("sortOrder");

-- CreateIndex
CREATE INDEX "rms_approvals_projectId_idx" ON "rms_approvals"("projectId");

-- CreateIndex
CREATE INDEX "rms_approvals_status_idx" ON "rms_approvals"("status");

-- CreateIndex
CREATE INDEX "rms_support_tickets_sortOrder_idx" ON "rms_support_tickets"("sortOrder");

-- CreateIndex
CREATE INDEX "rms_support_tickets_status_idx" ON "rms_support_tickets"("status");

-- CreateIndex
CREATE INDEX "rms_support_tickets_projectId_idx" ON "rms_support_tickets"("projectId");

-- CreateIndex
CREATE INDEX "rms_escalations_sortOrder_idx" ON "rms_escalations"("sortOrder");

-- CreateIndex
CREATE INDEX "rms_escalations_projectId_idx" ON "rms_escalations"("projectId");

-- CreateIndex
CREATE INDEX "rms_escalations_status_idx" ON "rms_escalations"("status");

-- CreateIndex
CREATE INDEX "rms_notifications_sortOrder_idx" ON "rms_notifications"("sortOrder");

-- CreateIndex
CREATE INDEX "rms_notifications_read_idx" ON "rms_notifications"("read");

-- CreateIndex
CREATE INDEX "rms_notifications_date_idx" ON "rms_notifications"("date");

-- CreateIndex
CREATE INDEX "rms_business_audit_sortOrder_idx" ON "rms_business_audit"("sortOrder");

-- CreateIndex
CREATE INDEX "rms_business_audit_entityId_idx" ON "rms_business_audit"("entityId");

-- CreateIndex
CREATE INDEX "rms_business_audit_at_idx" ON "rms_business_audit"("at");

-- CreateIndex
CREATE INDEX "rms_correspondence_sortOrder_idx" ON "rms_correspondence"("sortOrder");

-- CreateIndex
CREATE INDEX "rms_correspondence_projectId_idx" ON "rms_correspondence"("projectId");

-- CreateIndex
CREATE INDEX "rms_correspondence_date_idx" ON "rms_correspondence"("date");

-- CreateIndex
CREATE INDEX "rms_sales_daily_reports_sortOrder_idx" ON "rms_sales_daily_reports"("sortOrder");

-- CreateIndex
CREATE INDEX "rms_sales_daily_reports_sales_idx" ON "rms_sales_daily_reports"("sales");

-- CreateIndex
CREATE INDEX "rms_sales_daily_reports_date_idx" ON "rms_sales_daily_reports"("date");

-- CreateIndex
CREATE INDEX "rms_user_access_overrides_sortOrder_idx" ON "rms_user_access_overrides"("sortOrder");

-- CreateIndex
CREATE INDEX "rms_user_access_overrides_userId_idx" ON "rms_user_access_overrides"("userId");

-- CreateIndex
CREATE INDEX "rms_lead_chat_parentKey_sortOrder_idx" ON "rms_lead_chat"("parentKey", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "rms_project_contracts_parentKey_key" ON "rms_project_contracts"("parentKey");

-- CreateIndex
CREATE INDEX "rms_project_contracts_parentKey_sortOrder_idx" ON "rms_project_contracts"("parentKey", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "rms_project_handovers_parentKey_key" ON "rms_project_handovers"("parentKey");

-- CreateIndex
CREATE INDEX "rms_project_handovers_parentKey_sortOrder_idx" ON "rms_project_handovers"("parentKey", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "rms_project_portals_parentKey_key" ON "rms_project_portals"("parentKey");

-- CreateIndex
CREATE INDEX "rms_project_portals_parentKey_sortOrder_idx" ON "rms_project_portals"("parentKey", "sortOrder");

-- CreateIndex
CREATE INDEX "rms_project_portals_token_idx" ON "rms_project_portals"("token");

-- CreateIndex
CREATE INDEX "rms_payments_parentKey_sortOrder_idx" ON "rms_payments"("parentKey", "sortOrder");

-- CreateIndex
CREATE INDEX "rms_payments_status_idx" ON "rms_payments"("status");

-- CreateIndex
CREATE INDEX "rms_payments_date_idx" ON "rms_payments"("date");

-- CreateIndex
CREATE INDEX "rms_payments_installmentId_idx" ON "rms_payments"("installmentId");

-- CreateIndex
CREATE INDEX "rms_installments_parentKey_sortOrder_idx" ON "rms_installments"("parentKey", "sortOrder");

-- CreateIndex
CREATE INDEX "rms_installments_due_idx" ON "rms_installments"("due");

-- CreateIndex
CREATE INDEX "rms_addendums_parentKey_sortOrder_idx" ON "rms_addendums"("parentKey", "sortOrder");

-- CreateIndex
CREATE INDEX "rms_addendums_status_idx" ON "rms_addendums"("status");

-- CreateIndex
CREATE INDEX "rms_project_documents_parentKey_sortOrder_idx" ON "rms_project_documents"("parentKey", "sortOrder");

-- CreateIndex
CREATE INDEX "rms_project_documents_fileId_idx" ON "rms_project_documents"("fileId");

-- CreateIndex
CREATE INDEX "rms_project_documents_category_idx" ON "rms_project_documents"("category");

-- CreateIndex
CREATE INDEX "rms_inspections_parentKey_sortOrder_idx" ON "rms_inspections"("parentKey", "sortOrder");

-- CreateIndex
CREATE INDEX "rms_qc_findings_parentKey_sortOrder_idx" ON "rms_qc_findings"("parentKey", "sortOrder");

-- CreateIndex
CREATE INDEX "rms_qc_findings_status_idx" ON "rms_qc_findings"("status");

-- CreateIndex
CREATE INDEX "rms_qc_findings_target_idx" ON "rms_qc_findings"("target");

-- CreateIndex
CREATE INDEX "rms_qc_findings_inspectionId_idx" ON "rms_qc_findings"("inspectionId");

-- CreateIndex
CREATE INDEX "rms_daily_reports_parentKey_sortOrder_idx" ON "rms_daily_reports"("parentKey", "sortOrder");

-- CreateIndex
CREATE INDEX "rms_daily_reports_date_idx" ON "rms_daily_reports"("date");

-- CreateIndex
CREATE INDEX "rms_weekly_reports_parentKey_sortOrder_idx" ON "rms_weekly_reports"("parentKey", "sortOrder");

-- CreateIndex
CREATE INDEX "rms_weekly_reports_start_idx" ON "rms_weekly_reports"("start");

-- CreateIndex
CREATE INDEX "rms_daily_photos_parentKey_sortOrder_idx" ON "rms_daily_photos"("parentKey", "sortOrder");

-- CreateIndex
CREATE INDEX "rms_daily_photos_id_idx" ON "rms_daily_photos"("id");

-- CreateIndex
CREATE INDEX "rms_weekly_photos_parentKey_sortOrder_idx" ON "rms_weekly_photos"("parentKey", "sortOrder");

-- CreateIndex
CREATE INDEX "rms_weekly_photos_id_idx" ON "rms_weekly_photos"("id");

-- CreateIndex
CREATE INDEX "rms_project_activity_parentKey_sortOrder_idx" ON "rms_project_activity"("parentKey", "sortOrder");

-- CreateIndex
CREATE INDEX "rms_project_activity_at_idx" ON "rms_project_activity"("at");

-- CreateIndex
CREATE INDEX "rms_project_chat_parentKey_sortOrder_idx" ON "rms_project_chat"("parentKey", "sortOrder");

-- CreateIndex
CREATE INDEX "rms_task_history_parentKey_sortOrder_idx" ON "rms_task_history"("parentKey", "sortOrder");
