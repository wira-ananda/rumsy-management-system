<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import PeriodFilter from "../shared/PeriodFilter.svelte";
  import { matchesDate } from "../../utils/calendar";
  import { visibleLeads } from "../../access/permissions.js";
  import { stageNames, stages } from "../../constants/catalog.js";
  import { nextStageInfo } from "../../domain/pipeline.js";
  import { money, pct } from "../../utils/format.js";
  let month = $state("");
  let day = $state("");
  let leads = $derived(visibleLeads());
  let filtered = $derived(
    leads.filter((lead: any) => matchesDate(lead.dateIn, month, day)),
  );
</script>

<PageHeader
  title="Sales Kanban — Otomatis"
  description="Kanban hanya visualisasi. Tidak ada drag & drop. Stage berubah dari milestone, payment VERIFIED, handover, project start dan completion gate."
/>
<div class="kanban-toolbar">
  <div class="kanban-note">
    <span class="readonly-tag">READ ONLY</span>
    <p>
      Stage ditentukan otomatis. Buka kartu untuk melihat langkah berikutnya.
    </p>
  </div>
  <div class="kanban-filters">
    <span class="lead-total" role="status" aria-live="polite"
      >{filtered.length} lead</span
    >
    <PeriodFilter id="kanban" bind:month bind:day compact />
  </div>
</div>
<div class="kanban-wrap mt">
  <div
    class="kanban"
    style="grid-template-columns:repeat(7,210px);min-width:1540px"
  >
    {#each [...stages, "HOLD_BATAL"] as stage}
      {@const columnLeads = filtered.filter(
        (lead: any) => lead.stage === stage,
      )}
      <div class="kcol" class:side={stage === "HOLD_BATAL"} data-stage={stage}>
        <div class="khead">
          <span>{stageNames[stage as keyof typeof stageNames]}</span><span
            >{columnLeads.length}</span
          >
        </div>
        {#each columnLeads as lead}{@const next = nextStageInfo(lead)}
          <div class="kcard">
            <b>{lead.client}</b>
            <div class="tiny muted">{lead.location} • {lead.sales}</div>
            <div class="kv">
              <div>Est. RAB<b>{money(lead.estRab)}</b></div>
              <div>Est. ASST CR<b>{money(lead.estAsstCr)}</b></div>
              <div>DP<b>{pct(lead.dp)}</b></div>
              <div>Margin<b>{pct(lead.margin)}</b></div>
            </div>
            <div class="next"><b>Next: {next.next}</b><br />{next.text}</div>
            <a class="btn ghost small mt" href={`#/leads/${lead.id}`}
              >Buka Lead</a
            >
          </div>{/each}
      </div>{/each}
  </div>
</div>

<style>
  .kanban-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 12px 16px;
    border: 1px solid #dce6f2;
    border-radius: 12px;
    background: #eef4fb;
  }
  .kanban-note {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .readonly-tag {
    flex-shrink: 0;
    padding: 5px 7px;
    border-radius: 5px;
    background: #dfeafa;
    color: #2862a4;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
  .kanban-note p {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: #537091;
  }
  .kanban-filters {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .lead-total {
    font-size: 12px;
    font-weight: 600;
    color: var(--slate);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  @media (max-width: 1100px) {
    .kanban-toolbar {
      align-items: stretch;
      flex-direction: column;
      gap: 10px;
    }
    .kanban-filters {
      justify-content: flex-end;
    }
  }
  @media (max-width: 540px) {
    .kanban-toolbar {
      padding: 12px;
    }
    .kanban-note {
      align-items: flex-start;
      gap: 8px;
    }
    .kanban-note p {
      font-size: 11px;
    }
    .kanban-filters {
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 8px;
    }
    .kanban-filters :global(.period-filter) {
      flex-basis: 100%;
    }
    .lead-total {
      order: 3;
      flex-basis: 100%;
      text-align: right;
      font-size: 11px;
    }
  }
</style>
