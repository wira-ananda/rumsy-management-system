<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import Stat from "../shared/Stat.svelte";
  import Badge from "../shared/Badge.svelte";
  import FindingTable from "./FindingTable.svelte";
  import { runtime } from "../../stores/runtime.js";
  import { allFindings, allInspections } from "../../domain/models.js";
  import { inspectionForm, escalationForm } from "../../features/qc/actions";
  import { save } from "../../services/api.js";
  import { TODAY } from "../../constants/catalog.js";
  import { date } from "../../utils/format.js";
  import type { Route } from "../../types/rms";
  let { route }: { route: Route } = $props();
  let findings = $derived(allFindings());
  let inspections = $derived(allInspections());
  let title = $derived(
    (
      {
        qc: "QC / IC Dashboard",
        "qc-inspection": "QC Inspection",
        "qc-findings": "QC Findings",
        "qc-corrective": "Corrective Action",
        "qc-escalation": "QC Escalation — Confidential",
      } as Record<string, string>
    )[route.page],
  );
  async function reviewed(item: any) {
    item.reviewedAt = TODAY;
    item.status = "REVIEWED";
    await save();
  }
</script>

<PageHeader
  {title}
  description={route.page === "qc"
    ? "QC Sipil & Interior terhubung ke Project ID."
    : route.page === "qc-inspection"
      ? "Buat inspection, pilih PASS atau buat Finding."
      : route.page === "qc-corrective"
        ? "Worklist temuan yang belum Closed."
        : route.page === "qc-escalation"
          ? "Akses khusus Manager QC dan Super Admin."
          : "Finding memiliki corrective action dan verification."}
  >{#snippet actions()}{#if route.page === "qc-inspection"}<button
        class="btn primary"
        id="newInsp"
        onclick={inspectionForm}>＋ Inspection</button
      >{:else if route.page === "qc-escalation"}<button
        class="btn primary"
        id="newEsc"
        onclick={escalationForm}>＋ Escalate to Super Admin</button
      >{/if}{/snippet}</PageHeader
>
{#if route.page === "qc"}<div class="stats five">
    <Stat label="Inspection" value={inspections.length} /><Stat
      label="Open"
      value={findings.filter((item: any) => item.status === "OPEN").length}
    /><Stat
      label="Major/Critical"
      value={findings.filter((item: any) =>
        ["MAJOR", "CRITICAL"].includes(item.severity),
      ).length}
      tone="warning"
    /><Stat
      label="Overdue"
      value={findings.filter((item: any) => item.status === "OVERDUE").length}
      tone="danger"
    /><Stat
      label="Waiting Verify"
      value={findings.filter(
        (item: any) => item.status === "WAITING_VERIFICATION",
      ).length}
    />
  </div>
  <div class="mt"><FindingTable {findings} /></div>
{:else if route.page === "qc-inspection"}<Card title="Inspection Register"
    ><div class="table-wrap">
      <table class="table">
        <thead
          ><tr
            >{#each ["ID", "Project", "Date", "Category", "Area", "Work Item", "Inspector", "Result"] as label}<th
                >{label}</th
              >{/each}</tr
          ></thead
        ><tbody
          >{#each inspections as item}<tr
              ><td>{item.id}</td><td
                ><a class="link" href={`#/projects/${item.projectId}/qc`}
                  >{item.projectId}</a
                ></td
              ><td>{date(item.date)}</td><td>{item.category}</td><td
                >{item.area}</td
              ><td>{item.item}</td><td>{item.inspector}</td><td
                ><Badge status={item.result} /></td
              ></tr
            >{/each}</tbody
        >
      </table>
    </div></Card
  >
{:else if route.page === "qc-escalation"}<div class="stack">
    {#each runtime.data!.escalations as item}<div class="approval-card">
        <div class="top">
          <div>
            <b>{item.subject}</b>
            <div class="tiny muted">
              {item.projectId} • Finding {item.finding}
            </div>
          </div>
          <Badge status={item.status} />
        </div>
        <div class="notice warn mt">CONFIDENTIAL • {item.notes}</div>
        {#if runtime.session!.role === "SUPER_ADMIN" && !item.reviewedAt}<button
            class="btn primary small reviewEsc mt"
            onclick={() => reviewed(item)}>Tandai Ditinjau</button
          >{/if}
      </div>{/each}
  </div>
{:else}<FindingTable
    findings={route.page === "qc-corrective"
      ? findings.filter((item: any) =>
          ["OPEN", "OVERDUE", "ON_PROGRESS", "WAITING_VERIFICATION"].includes(
            item.status,
          ),
        )
      : findings}
    actions
  />{/if}
