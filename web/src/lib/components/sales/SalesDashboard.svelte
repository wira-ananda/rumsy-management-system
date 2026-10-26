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

<div class="sales-dashboard" id="salesDashboard">
  <PageHeader
    title="Sales Dashboard"
    description="Nilai pipeline memakai Est. ASST CR. Jika Est. ASST CR belum diisi/0, sistem otomatis memakai Est. RAB agar nominal pipeline tetap terbaca."
  />
  <div class="dashboard-filter">
    <div class="filter-caption">
      <b>Ringkasan pipeline</b><span role="status" aria-live="polite"
        >{leads.length} lead • {month
          ? "Sesuai bulan masuk"
          : "Semua bulan"}</span
      >
    </div>
    <div class="filter-controls">
      <label class="month-filter"
        ><span>Bulan masuk</span><input
          class="input"
          id="salesMonth"
          type="month"
          bind:value={month}
        /></label
      >
      <button
        class="btn ghost reset-month"
        type="button"
        onclick={() => (month = "")}
        disabled={!month}>Semua bulan</button
      >
    </div>
  </div>
  <div class="stats five sales-stats">
    {#each ["WARM", "HOT", "DP_GAMBAR", "DP_PROYEK", "PEMBANGUNAN"] as stage}<Stat
        label={stageNames[stage as keyof typeof stageNames]}
        value={money(
          leads
            .filter((lead: any) => lead.stage === stage)
            .reduce(
              (sum: number, lead: any) => sum + leadForecastValue(lead),
              0,
            ),
        )}
      />{/each}
  </div>
  {#if runtime.session!.role === "SALES_EXECUTIVE"}<div
      class="notice report-notice"
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
    </div>{:else}<div class="notice info report-notice">
      <b>Laporan Harian Sales hari ini:</b>
      {reports.length} laporan sudah masuk.
      <a class="link" href="#/sales-daily-report">Buka rekap</a>
    </div>{/if}
  <div class="dashboard-content">
    <div class="forecast-panel">
      <Card title="Forecast per Sales"
        ><ForecastTable {leads} />
        <div class="tiny muted mt">
          Dasar nilai: Est. ASST CR; fallback ke Est. RAB bila Est. ASST CR
          belum tersedia.
        </div></Card
      >
    </div>
    <div class="activity-panel">
      <Card title="Sales Activity Mix"
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
  </div>
</div>

<style>
  .sales-dashboard {
    --dashboard-radius: var(--radius, 15px);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .sales-dashboard :global(.pagehead) {
    margin-bottom: 6px;
  }
  .dashboard-filter {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 13px 16px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--dashboard-radius);
  }
  .filter-caption {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .filter-caption b {
    font-size: 13px;
    color: var(--ink);
  }
  .filter-caption span {
    font-size: 11px;
    color: var(--slate);
    font-variant-numeric: tabular-nums;
  }
  .filter-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .month-filter {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .month-filter > span {
    font-size: 11px;
    font-weight: 600;
    color: var(--slate);
    white-space: nowrap;
  }
  .month-filter .input {
    width: 160px;
    height: 38px;
    min-height: 38px;
    padding: 7px 10px;
    border-radius: 10px;
    font-size: 12px;
    background: var(--surface);
  }
  .reset-month {
    height: 38px;
    min-height: 38px;
    padding: 7px 11px;
    border-radius: 10px;
    font-size: 11px;
    white-space: nowrap;
  }
  .sales-dashboard :global(.stat),
  .sales-dashboard :global(.card),
  .report-notice {
    border-radius: var(--dashboard-radius);
  }
  .sales-dashboard :global(.stat) {
    padding: 16px;
  }
  .sales-dashboard :global(.stat-value) {
    font-size: clamp(16px, 1.25vw, 22px);
    line-height: 1.3;
    font-variant-numeric: tabular-nums;
  }
  .report-notice {
    margin: 0;
  }
  .dashboard-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, 0.3fr);
    gap: 16px;
    align-items: stretch;
  }
  .forecast-panel,
  .activity-panel {
    min-width: 0;
  }
  .dashboard-content :global(.card) {
    height: 100%;
    overflow: hidden;
  }
  .forecast-panel :global(.table) {
    min-width: 820px;
  }
  .forecast-panel :global(th:not(:first-child)),
  .forecast-panel :global(td:not(:first-child)) {
    text-align: right;
    white-space: nowrap;
  }
  .activity-panel :global(.metric-list) {
    gap: 16px;
  }
  .activity-panel :global(.metric-row) {
    grid-template-columns: minmax(0, 1fr) 64px 24px;
    gap: 10px;
    font-size: 12px;
  }
  .activity-panel :global(.metric-row > b) {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  @media (max-width: 1180px) {
    .sales-stats {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .dashboard-content {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  @media (max-width: 700px) {
    .dashboard-filter {
      align-items: stretch;
      flex-direction: column;
      gap: 10px;
    }
    .filter-controls {
      justify-content: flex-end;
    }
    .sales-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 540px) {
    .sales-dashboard {
      gap: 12px;
    }
    .dashboard-filter {
      padding: 12px;
    }
    .filter-caption {
      justify-content: space-between;
      gap: 6px;
    }
    .month-filter {
      flex: 1;
      min-width: 0;
    }
    .month-filter > span {
      font-size: 10px;
    }
    .month-filter .input {
      flex: 1;
      min-width: 0;
      width: 100%;
    }
    .sales-stats {
      grid-template-columns: minmax(0, 1fr);
      gap: 10px;
    }
    .sales-stats :global(.stat) {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 16px;
    }
    .sales-stats :global(.stat-value) {
      margin-top: 0;
      font-size: 18px;
      text-align: right;
    }
    .activity-panel :global(.metric-row) {
      grid-template-columns: minmax(0, 1fr) 90px 24px;
    }
  }
</style>
