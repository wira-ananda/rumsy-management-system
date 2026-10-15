<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import { runtime } from "../../stores/runtime.js";
  import { belongsToSales } from "../../access/permissions.js";
  import { activityForm } from "../../features/sales/actions";
  import { date } from "../../utils/format.js";
  import { TODAY } from "../../constants/catalog.js";
  let rows = $derived(
    runtime.session!.role === "SALES_EXECUTIVE"
      ? runtime.data!.crm.filter((item: any) => belongsToSales(item.pic))
      : runtime.data!.crm,
  );
</script>

<PageHeader
  title="Activity / Backlog"
  description="Struktur mengikuti sheet Backlog: Tanggal, Client, Kategori, Jenis Layanan, Perihal, PIC, Catatan."
  >{#snippet actions()}<button
      class="btn primary"
      id="addAct"
      onclick={activityForm}>＋ Activity</button
    >{/snippet}</PageHeader
><Card title="CRM Backlog"
  ><div class="table-wrap">
    <table class="table">
      <thead
        ><tr
          >{#each ["Tanggal", "Nama Client", "Kategori", "Jenis Layanan", "Perihal", "PIC", "Catatan", "Next Follow-up"] as label}<th
              >{label}</th
            >{/each}</tr
        ></thead
      ><tbody
        >{#each rows as row}<tr
            ><td>{date(row.date)}</td><td><b>{row.client}</b></td><td
              >{row.category}</td
            ><td>{row.channel}</td><td>{row.subject}</td><td>{row.pic}</td><td
              >{row.notes || "-"}</td
            ><td
              >{date(row.next)}{#if row.next && row.next <= TODAY}<div
                  class="tiny danger"
                >
                  <b>DUE</b>
                </div>{/if}</td
            ></tr
          >{/each}</tbody
      >
    </table>
  </div></Card
>
