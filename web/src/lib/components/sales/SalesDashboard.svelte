<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import Stat from "../shared/Stat.svelte";
  import ForecastTable from "./ForecastTable.svelte";
  import { runtime } from "../../stores/runtime.js";
  import { visibleLeads, belongsToSales } from "../../access/permissions.js";
  import { leadForecastValue } from "../../domain/pipeline.js";
  import { TODAY, stageNames } from "../../constants/catalog.js";
  import { money } from "../../utils/format.js";
  let month = $state("");
  let leads = $derived(
    visibleLeads().filter(
      (lead: any) => !month || String(lead.dateIn || "").startsWith(month),
    ),
  );
  let reports = $derived(
    runtime.data!.salesDailyReports.filter(
      (report: any) => report.date === TODAY,
    ),
  );
  let ownDone = $derived(
    reports.some((report: any) => belongsToSales(report.sales)),
  );
</script>

<PageHeader
  title="Sales Dashboard"
  description="Nilai pipeline memakai Est. ASST CR. Jika Est. ASST CR belum diisi/0, sistem otomatis memakai Est. RAB agar nominal pipeline tetap terbaca."
/>
<div class="card mt">
  <label class="field"
    ><span>BULAN</span><input
      class="input"
      id="salesMonth"
      type="month"
      bind:value={month}
    /></label
  >
</div>
<div class="stats five">
  {#each ["WARM", "HOT", "DP_GAMBAR", "DP_PROYEK", "PEMBANGUNAN"] as stage}<Stat
      label={stageNames[stage as keyof typeof stageNames]}
      value={money(
        leads
          .filter((lead: any) => lead.stage === stage)
          .reduce((sum: number, lead: any) => sum + leadForecastValue(lead), 0),
      )}
    />{/each}
</div>
{#if runtime.session!.role === "SALES_EXECUTIVE"}<div
    class="notice mt"
    class:success={ownDone}
    class:warn={!ownDone}
  >
    <div class="split">
      <div>
        <b>Laporan Harian Sales: {ownDone ? "Sudah diisi" : "Belum diisi"}</b>
        <div class="small">
          {ownDone
            ? "Laporan hari ini sudah tersimpan di RMS."
            : "Sebelum selesai kerja, isi deskripsi kegiatan, hasil, kendala dan rencana tindak lanjut."}
        </div>
      </div>
      <a class="btn primary small" href="#/sales-daily-report"
        >{ownDone ? "Lihat Laporan" : "Isi Laporan Hari Ini"}</a
      >
    </div>
  </div>{:else}<div class="notice info mt">
    <b>Laporan Harian Sales hari ini:</b>
    {reports.length} laporan sudah masuk.
    <a class="link" href="#/sales-daily-report">Buka rekap</a>
  </div>{/if}
<div class="grid2 mt">
  <Card title="Forecast per Sales"
    ><ForecastTable {leads} />
    <div class="tiny muted mt">
      Dasar nilai: Est. ASST CR; fallback ke Est. RAB bila Est. ASST CR belum
      tersedia.
    </div></Card
  ><Card title="Sales Activity Mix"
    ><div class="metric-list">
      {#each ["Chat", "Telepon", "Meeting Offline", "Meeting Online"] as channel}{@const count =
          runtime.data!.crm.filter(
            (item: any) =>
              item.channel === channel &&
              (runtime.session!.role !== "SALES_EXECUTIVE" ||
                belongsToSales(item.pic)),
          ).length}
        <div class="metric-row">
          <span>{channel}</span>
          <div class="bar">
            <i style:width={`${Math.min(100, count * 25)}%`}></i>
          </div>
          <b>{count}</b>
        </div>{/each}
    </div></Card
  >
</div>
