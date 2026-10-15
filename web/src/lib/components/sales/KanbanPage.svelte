<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import { visibleLeads } from "../../access/permissions.js";
  import { stageNames, stages } from "../../constants/catalog.js";
  import { nextStageInfo } from "../../domain/pipeline.js";
  import { money, pct } from "../../utils/format.js";
  let leads = $derived(visibleLeads());
</script>

<PageHeader
  title="Sales Kanban — Otomatis"
  description="Kanban hanya visualisasi. Tidak ada drag & drop. Stage berubah dari milestone, payment VERIFIED, handover, project start dan completion gate."
/>
<div class="notice info">
  <b>READ ONLY:</b> user melakukan pekerjaan; sistem menentukan posisi client. Buka
  kartu untuk melihat syarat stage berikutnya.
</div>
<div class="kanban-wrap mt">
  <div
    class="kanban"
    style="grid-template-columns:repeat(7,210px);min-width:1540px"
  >
    {#each [...stages, "HOLD_BATAL"] as stage}<div
        class="kcol"
        class:side={stage === "HOLD_BATAL"}
      >
        <div class="khead">
          <span>{stageNames[stage as keyof typeof stageNames]}</span><span
            >{leads.filter((lead: any) => lead.stage === stage).length}</span
          >
        </div>
        {#each leads.filter((lead: any) => lead.stage === stage) as lead}{@const next =
            nextStageInfo(lead)}
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
