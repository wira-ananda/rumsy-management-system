import type { Component } from "svelte";
import Dashboard from "../components/management/Dashboard.svelte";
import SalesDashboard from "../components/sales/SalesDashboard.svelte";
import LeadsPage from "../components/sales/LeadsPage.svelte";
import LeadDetail from "../components/sales/LeadDetail.svelte";
import PipelinePage from "../components/sales/PipelinePage.svelte";
import KanbanPage from "../components/sales/KanbanPage.svelte";
import ForecastPage from "../components/sales/ForecastPage.svelte";
import ActivityPage from "../components/sales/ActivityPage.svelte";
import DailyReportsPage from "../components/sales/DailyReportsPage.svelte";
import ClientsPage from "../components/clients/ClientsPage.svelte";
import ProjectsPage from "../components/projects/ProjectsPage.svelte";
import ProjectDashboard from "../components/projects/ProjectDashboard.svelte";
import HandoverQueue from "../components/projects/HandoverQueue.svelte";
import FinancePage from "../components/finance/FinancePage.svelte";
import QcPage from "../components/qc/QcPage.svelte";
import TasksPage from "../components/workflow/TasksPage.svelte";
import ApprovalsPage from "../components/workflow/ApprovalsPage.svelte";
import SupportPage from "../components/workflow/SupportPage.svelte";
import CorrespondencePage from "../components/admin/CorrespondencePage.svelte";
import GuidePage from "../components/management/GuidePage.svelte";
import ReportsPage from "../components/management/ReportsPage.svelte";
import NotificationsPage from "../components/management/NotificationsPage.svelte";
import OrganizationPage from "../components/management/OrganizationPage.svelte";
import AuditPage from "../components/management/AuditPage.svelte";
import UserAccessPage from "../components/system/UserAccessPage.svelte";
import SystemCheckPage from "../components/system/SystemCheckPage.svelte";
import EmailPage from "../components/system/EmailPage.svelte";
import SettingsPage from "../components/system/SettingsPage.svelte";
export const features: Record<string, Component<any>> = {
  dashboard: Dashboard,
  "sales-dashboard": SalesDashboard,
  leads: LeadsPage,
  "lead-detail": LeadDetail,
  pipeline: PipelinePage,
  kanban: KanbanPage,
  forecast: ForecastPage,
  activity: ActivityPage,
  "sales-daily-report": DailyReportsPage,
  clients: ClientsPage,
  "client-detail": ClientsPage,
  projects: ProjectsPage,
  "projects-active": ProjectsPage,
  "projects-completed": ProjectsPage,
  "project-dashboard": ProjectDashboard,
  handover: HandoverQueue,
  "finance-verification": FinancePage,
  "finance-schedule": FinancePage,
  "finance-ledger": FinancePage,
  "finance-outstanding": FinancePage,
  qc: QcPage,
  "qc-inspection": QcPage,
  "qc-findings": QcPage,
  "qc-corrective": QcPage,
  "qc-escalation": QcPage,
  tasks: TasksPage,
  approvals: ApprovalsPage,
  support: SupportPage,
  correspondence: CorrespondencePage,
  guide: GuidePage,
  reports: ReportsPage,
  notifications: NotificationsPage,
  organization: OrganizationPage,
  audit: AuditPage,
  "user-access": UserAccessPage,
  "system-check": SystemCheckPage,
  "email-notification": EmailPage,
  settings: SettingsPage,
};
