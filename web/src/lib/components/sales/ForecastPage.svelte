<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import Info from "../shared/Info.svelte";
  import ForecastTable from "./ForecastTable.svelte";
  import { visibleLeads } from "../../access/permissions.js";
  import { leadForecastValue } from "../../domain/pipeline.js";
  import { money } from "../../utils/format.js";
  let leads = $derived(visibleLeads());
</script>

<PageHeader
  title="Forecast"
  description="Matriks nilai per Sales dan stage berdasarkan Est. ASST CR; layout mengacu pada konsep Forecast Excel."
/><Card title="Forecast Value"><ForecastTable {leads} hold /></Card>
<div class="grid2 mt">
  <Card title="Lead by Source"
    ><div class="metric-list">
      {#each [...new Set(leads.map((lead: any) => lead.source))] as source}{@const count =
          leads.filter((lead: any) => lead.source === source).length}
        <div class="metric-row">
          <span>{source}</span>
          <div class="bar">
            <i style:width={`${(count / Math.max(1, leads.length)) * 100}%`}
            ></i>
          </div>
          <b>{count}</b>
        </div>{/each}
    </div></Card
  ><Card title="Quick Metrics"
    ><div class="grid2eq">
      <Info
        label="Total Pipeline"
        value={money(
          leads.reduce(
            (sum: number, lead: any) => sum + leadForecastValue(lead),
            0,
          ),
        )}
      /><Info
        label="Avg Est. RAB"
        value={money(
          leads.reduce((sum: number, lead: any) => sum + lead.estRab, 0) /
            Math.max(1, leads.length),
        )}
      /><Info
        label="Closing/Selesai"
        value={leads.filter((lead: any) => lead.stage === "SELESAI").length}
      /><Info
        label="Hold/Batal"
        value={leads.filter((lead: any) => lead.stage === "HOLD_BATAL").length}
      />
    </div></Card
  >
</div>
