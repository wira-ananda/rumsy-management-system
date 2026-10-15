<script lang="ts">
  import { stages, stageNames } from "../../constants/catalog.js";
  import { leadForecastValue } from "../../domain/pipeline.js";
  import { money } from "../../utils/format.js";
  let { leads, hold = false }: { leads: any[]; hold?: boolean } = $props();
  let columns = $derived(hold ? [...stages, "HOLD_BATAL"] : stages);
  let sales = $derived([...new Set(leads.map((lead) => lead.sales))]);
  const sum = (list: any[], stage?: string) =>
    list
      .filter((lead) => !stage || lead.stage === stage)
      .reduce((value, lead) => value + leadForecastValue(lead), 0);
</script>

<div class="table-wrap">
  <table class="table">
    <thead
      ><tr
        ><th>Sales</th>{#each columns as stage}<th
            >{stageNames[stage as keyof typeof stageNames]}</th
          >{/each}<th>Total</th></tr
      ></thead
    ><tbody
      >{#each sales as name}{@const rows = leads.filter(
          (lead) => lead.sales === name,
        )}<tr
          ><td><b>{name}</b></td>{#each columns as stage}<td class="mono"
              >{money(sum(rows, stage))}</td
            >{/each}<td class="mono"><b>{money(sum(rows))}</b></td></tr
        >{/each}{#if hold}<tr
          ><td><b>TOTAL</b></td>{#each columns as stage}<td class="mono"
              ><b>{money(sum(leads, stage))}</b></td
            >{/each}<td class="mono"><b>{money(sum(leads))}</b></td></tr
        >{/if}</tbody
    >
  </table>
</div>
