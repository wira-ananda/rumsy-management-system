<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import PeriodFilter from "../shared/PeriodFilter.svelte";
  import { matchesDate } from "../../utils/calendar";
  import Badge from "../shared/Badge.svelte";
  import { visibleLeads } from "../../access/permissions.js";
  import { stageNames } from "../../constants/catalog.js";
  import { leadForecastValue } from "../../domain/pipeline.js";
  import { date, money, pct } from "../../utils/format.js";
  import { leadDpAmount, leadNeedLabel } from "../../domain/lead-terms";
  let search = $state(""),
    sales = $state(""),
    source = $state(""),
    stage = $state(""),
    month = $state(""),
    day = $state("");
  let leads = $derived(visibleLeads());
  let filtered = $derived(
    leads.filter(
      (lead: any) =>
        (lead.client + lead.phone + lead.location + leadNeedLabel(lead))
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (!sales || lead.sales === sales) &&
        (!source || lead.source === source) &&
        (!stage || lead.stage === stage) &&
        matchesDate(lead.dateIn, month, day),
    ),
  );
</script>

<PageHeader
  title="Sales Pipeline"
  description="Tabel ini mengikuti kolom utama sheet Pipeline pada Dashboard Rumsy 2026. Kanban tetap terpisah dan read-only."
/>
<div class="summary-strip">
  {#each Object.entries(stageNames) as [key, label]}<div class="summary-chip">
      <small>{label}</small><b
        >{filtered.filter((lead: any) => lead.stage === key).length} lead</b
      >
      <div class="tiny muted">
        {money(
          filtered
            .filter((lead: any) => lead.stage === key)
            .reduce(
              (sum: number, lead: any) => sum + leadForecastValue(lead),
              0,
            ),
        )}
      </div>
    </div>{/each}
</div>
<div class="card mt">
  <div class="card-body">
    <div class="filterbar">
      <label class="field grow"
        ><span>SEARCH</span><input
          class="input"
          id="pSearch"
          bind:value={search}
          placeholder="Client / WA / lokasi / kebutuhan"
        /></label
      ><label class="field"
        ><span>SALES</span><select class="input" id="pSales" bind:value={sales}
          ><option value="">Semua</option
          >{#each [...new Set(leads.map((lead: any) => lead.sales))] as name}<option
              >{name}</option
            >{/each}</select
        ></label
      ><label class="field"
        ><span>SUMBER</span><select
          class="input"
          id="pSource"
          bind:value={source}
          ><option value="">Semua</option
          >{#each [...new Set(leads.map((lead: any) => lead.source))] as name}<option
              >{name}</option
            >{/each}</select
        ></label
      ><label class="field"
        ><span>STATUS</span><select class="input" id="pStage" bind:value={stage}
          ><option value="">Semua</option
          >{#each Object.entries(stageNames) as [key, label]}<option value={key}
              >{label}</option
            >{/each}</select
        ></label
      >
      <PeriodFilter id="p" bind:month bind:day />
    </div>
  </div>
  <div class="scroll-wide">
    <table class="table pipeline-table">
      <thead
        ><tr
          >{#each ["TGL MASUK", "NAMA CLIENT", "NO WA", "SUMBER", "LOKASI", "KEBUTUHAN", "EST RAB", "% MARGIN", "% DP", "DP (Rp)", "EST ASST CR", "CATATAN", "SALES", "STATUS"] as label}<th
              >{label}</th
            >{/each}</tr
        ></thead
      ><tbody id="pRows"
        >{#each filtered as lead}<tr
            ><td class="sticky-left nowrap">{date(lead.dateIn)}</td><td
              ><a class="link" href={`#/leads/${lead.id}`}>{lead.client}</a></td
            ><td>{lead.phone}</td><td>{lead.source}</td><td>{lead.location}</td
            ><td>{leadNeedLabel(lead)}</td><td class="mono right"
              >{money(lead.estRab)}</td
            ><td>{pct(lead.margin)}</td><td>{pct(lead.dp)}</td><td
              class="mono right">{money(leadDpAmount(lead))}</td
            ><td class="mono right">{money(lead.estAsstCr)}</td><td
              >{lead.notes}</td
            ><td>{lead.sales}</td><td><Badge status={lead.stage} /></td></tr
          >{:else}<tr><td colspan="14" class="empty">Tidak ada data.</td></tr
          >{/each}</tbody
      >
    </table>
  </div>
</div>
