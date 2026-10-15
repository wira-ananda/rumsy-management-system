import type { Component } from "svelte";
import OverviewTab from "./OverviewTab.svelte";
import ClientTab from "./ClientTab.svelte";
import SalesHistoryTab from "./SalesHistoryTab.svelte";
import ChatTab from "./ChatTab.svelte";
import ContractTab from "./ContractTab.svelte";
import PaymentsTab from "./PaymentsTab.svelte";
import InstallmentsTab from "./InstallmentsTab.svelte";
import AddendumsTab from "./AddendumsTab.svelte";
import DocumentsTab from "./DocumentsTab.svelte";
import OperationsTab from "./OperationsTab.svelte";
import ProgressReportsTab from "./ProgressReportsTab.svelte";
import QcTab from "./QcTab.svelte";
import HandoverTab from "./HandoverTab.svelte";
import ActivityTab from "./ActivityTab.svelte";
export const projectTabComponents: Record<
  string,
  Component<{ project: any }>
> = {
  overview: OverviewTab,
  client: ClientTab,
  "sales-history": SalesHistoryTab,
  chat: ChatTab,
  contract: ContractTab,
  transaction: PaymentsTab,
  installment: InstallmentsTab,
  addendum: AddendumsTab,
  document: DocumentsTab,
  operation: OperationsTab,
  "progress-report": ProgressReportsTab,
  qc: QcTab,
  handover: HandoverTab,
  "activity-log": ActivityTab,
};
