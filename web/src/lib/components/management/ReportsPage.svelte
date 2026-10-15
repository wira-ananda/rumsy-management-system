<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import Stat from "../shared/Stat.svelte";
  import Info from "../shared/Info.svelte";
  import Badge from "../shared/Badge.svelte";
  import { runtime } from "../../stores/runtime.js";
  import { money } from "../../utils/format.js";
  import {
    metrics,
    allTransactions,
    allFindings,
    installmentStatus,
  } from "../../domain/models.js";
  import { leadForecastValue } from "../../domain/pipeline.js";
  import ProjectCards from "../projects/ProjectCards.svelte";
  import FindingTable from "../qc/FindingTable.svelte";
  let tab = $state("Sales");
  let m = $derived(metrics());
  function completeness(p: any) {
    return Math.round(
      (runtime.data!.settings.requiredDocs.filter(
        (t: any) =>
          p.documents.some((d: any) => d.type === t && d.name) ||
          (t === "Payment Schedule" && p.installments.length),
      ).length /
        runtime.data!.settings.requiredDocs.length) *
        100,
    );
  }
</script>

<PageHeader
  title="Reports"
  description="Enam report utama: Sales, Project, Payment, QC, Document, Management."
/>
<div class="mini-tabs">
  {#each ["Sales", "Project", "Payment", "QC", "Document", "Management"] as name}<button
      class="mini-tab"
      class:active={tab === name}
      data-rpt={name}
      onclick={() => (tab = name)}>{name}</button
    >{/each}
</div>
<div id="reportBody">
  {#if tab === "Sales"}<Card title="Sales Report"
      ><div class="table-wrap">
        <table class="table">
          <thead
            ><tr
              >{#each ["Sales", "Lead", "Pipeline Value", "Warm", "Hot", "DP Project", "Selesai"] as h}<th
                  >{h}</th
                >{/each}</tr
            ></thead
          ><tbody
            >{#each [...new Set(runtime.data!.leads.map((l: any) => l.sales))] as sales}{@const leads =
                runtime.data!.leads.filter((l: any) => l.sales === sales)}<tr
                ><td>{sales}</td><td>{leads.length}</td><td class="mono"
                  >{money(
                    leads.reduce(
                      (s: any, l: any) => s + leadForecastValue(l),
                      0,
                    ),
                  )}</td
                >{#each ["WARM", "HOT", "DP_PROYEK", "SELESAI"] as stage}<td
                    >{leads.filter((l: any) => l.stage === stage).length}</td
                  >{/each}</tr
              >{/each}</tbody
          >
        </table>
      </div></Card
    >
  {:else if tab === "Project"}<Card title="Project Report"
      ><ProjectCards projects={runtime.data!.projects} /></Card
    >
  {:else if tab === "Payment"}<Card title="Payment Report"
      ><div class="grid2eq">
        <Info
          label="Verified"
          value={money(
            allTransactions()
              .filter((t: any) => t.status === "VERIFIED")
              .reduce((s: any, t: any) => s + t.amount, 0),
          )}
        /><Info
          label="Pending"
          value={money(
            allTransactions()
              .filter((t: any) => t.status === "PENDING_VERIFICATION")
              .reduce((s: any, t: any) => s + t.amount, 0),
          )}
        /><Info label="Outstanding" value={money(m.outstanding)} /><Info
          label="Overdue Installment"
          value={runtime.data!.projects.flatMap((p: any) =>
            p.installments.filter(
              (i: any) => installmentStatus(p, i) === "OVERDUE",
            ),
          ).length}
        />
      </div></Card
    >
  {:else if tab === "QC"}<FindingTable findings={allFindings()} />
  {:else if tab === "Document"}<Card title="Document Completeness"
      >{#each runtime.data!.projects as p}<div class="metric-row">
          <span>{p.id}</span>
          <div class="bar"><i style:width={`${completeness(p)}%`}></i></div>
          <b>{completeness(p)}%</b>
        </div>{/each}</Card
    >
  {:else}<div class="stats">
      <Stat label="Current Contract" value={money(m.contract)} /><Stat
        label="Verified Paid"
        value={money(m.paid)}
        tone="success"
      /><Stat
        label="Outstanding"
        value={money(m.outstanding)}
        tone="warning"
      /><Stat label="QC Overdue" value={m.qcOver} tone="danger" />
    </div>{/if}
</div>
