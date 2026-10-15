<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Stat from "../shared/Stat.svelte";
  import { runtime } from "../../stores/runtime.js";
  import {
    belongsToSales,
    canManageSalesDaily,
    currentActor,
  } from "../../access/permissions.js";
  import {
    dailyReportForm,
    salesReportMetrics,
  } from "../../features/sales/actions";
  import { TODAY } from "../../constants/catalog.js";
  import { date } from "../../utils/format.js";
  import { addAudit } from "../../domain/models.js";
  import { save } from "../../services/api.js";
  let selectedDate = $state(""),
    search = $state("");
  let rows = $derived(
    [...runtime.data!.salesDailyReports]
      .filter(
        (report: any) =>
          runtime.session!.role !== "SALES_EXECUTIVE" ||
          belongsToSales(report.sales),
      )
      .sort((a: any, b: any) =>
        (String(b.date) + String(b.createdAt || "")).localeCompare(
          String(a.date) + String(a.createdAt || ""),
        ),
      ),
  );
  let today = $derived(rows.filter((report: any) => report.date === TODAY));
  let filtered = $derived(
    rows.filter(
      (report: any) =>
        (!selectedDate || report.date === selectedDate) &&
        (!search ||
          [
            report.sales,
            report.activityDescription,
            report.result,
            report.obstacle,
            report.nextPlan,
          ].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(search.toLowerCase()),
          )),
    ),
  );
  async function remove(report: any) {
    if (!confirm(`Hapus laporan ${report.sales} tanggal ${date(report.date)}?`))
      return;
    runtime.data!.salesDailyReports = runtime.data!.salesDailyReports.filter(
      (item: any) => item.id !== report.id,
    );
    addAudit(
      currentActor(),
      "SALES_DAILY_REPORT",
      report.id,
      "DELETE",
      `${report.sales} • ${report.date}`,
    );
    await save();
  }
</script>

<PageHeader
  title="Laporan Harian Sales"
  description="Laporan harian Sales terhubung dengan data Lead dan Activity. Sales menuliskan kegiatan, hasil/capaian, kendala, dan rencana tindak lanjut; angka aktivitas dihitung otomatis dari RMS."
  >{#snippet actions()}{#if canManageSalesDaily()}<button
        class="btn primary"
        id="newSalesDaily"
        onclick={() => dailyReportForm()}>＋ Buat Laporan Hari Ini</button
      >{/if}{/snippet}</PageHeader
>
<div class="stats">
  <Stat label="Laporan Hari Ini" value={today.length} /><Stat
    label="Lead Baru Hari Ini"
    value={today.reduce(
      (sum: number, report: any) => sum + (report.metrics?.newLeads || 0),
      0,
    )}
  /><Stat
    label="Aktivitas Hari Ini"
    value={today.reduce(
      (sum: number, report: any) => sum + (report.metrics?.activities || 0),
      0,
    )}
  /><Stat
    label="Meeting Hari Ini"
    value={today.reduce(
      (sum: number, report: any) =>
        sum +
        (report.metrics?.meetingOffline || 0) +
        (report.metrics?.meetingOnline || 0),
      0,
    )}
  />
</div>
<div class="card mt">
  <div class="card-body">
    <div class="filterbar">
      <label class="field"
        ><span>TANGGAL</span><input
          type="date"
          class="input"
          id="dailyDate"
          bind:value={selectedDate}
        /></label
      ><label class="field grow"
        ><span>CARI</span><input
          class="input"
          id="dailySearch"
          bind:value={search}
          placeholder="Nama Sales, kegiatan, hasil, kendala, rencana..."
        /></label
      >
    </div>
  </div>
  <div class="table-wrap">
    <table class="table">
      <thead
        ><tr
          >{#each ["Tanggal", "Sales", "Lead Baru", "Chat", "Telepon", "Meeting", "Total Aktivitas", "Kegiatan & Hasil", "Aksi"] as label}<th
              >{label}</th
            >{/each}</tr
        ></thead
      ><tbody id="dailyRows"
        >{#each filtered as report}{@const metrics =
            report.metrics || salesReportMetrics(report.date, report.sales)}<tr
            ><td>{date(report.date)}</td><td><b>{report.sales}</b></td><td
              >{metrics.newLeads || 0}</td
            ><td>{metrics.chat || 0}</td><td>{metrics.calls || 0}</td><td
              >{(metrics.meetingOffline || 0) +
                (metrics.meetingOnline || 0)}</td
            ><td><b>{metrics.activities || 0}</b></td><td
              ><div><b>Kegiatan:</b> {report.activityDescription || "-"}</div>
              <div class="tiny"><b>Hasil:</b> {report.result || "-"}</div>
              {#if report.obstacle}<div class="tiny danger">
                  <b>Kendala:</b>
                  {report.obstacle}
                </div>{/if}{#if report.nextPlan}<div class="tiny muted">
                  <b>Rencana:</b>
                  {report.nextPlan}
                </div>{/if}</td
            ><td
              >{#if canManageSalesDaily(report)}<div class="action-row">
                  <button
                    class="btn ghost small editDaily"
                    onclick={() => dailyReportForm(report)}>Edit</button
                  ><button
                    class="btn danger small delDaily"
                    onclick={() => remove(report)}>Hapus</button
                  >
                </div>{:else}-{/if}</td
            ></tr
          >{:else}<tr
            ><td colspan="9" class="empty">Belum ada laporan harian.</td></tr
          >{/each}</tbody
      >
    </table>
  </div>
</div>
