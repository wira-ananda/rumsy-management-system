<script lang="ts">
  import type { ProgressReport } from "../../types/rms";
  let {
    report,
    token,
    weekly = false,
  }: { report: ProgressReport; token: string; weekly?: boolean } = $props();
  function date(value?: string) {
    if (!value) return "-";
    const date = new Date(value + "T00:00:00");
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
  }
  function url(id = "") {
    return `/api/client/file/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`;
  }
</script>

<article class="client-report-card">
  <div class="client-report-head">
    <div>
      <div class="client-report-date">
        {weekly
          ? `${date(report.start)} – ${date(report.end)}`
          : date(report.date)}
      </div>
      <h3>{weekly ? "Laporan Mingguan" : "Laporan Harian"}</h3>
    </div>
    <div class="client-progress-pill">{Number(report.progress || 0)}%</div>
  </div>
  {#if weekly}<div class="client-target">
      Target minggu ini: <b>{Number(report.targetProgress || 0)}%</b>
    </div>{/if}
  <div class="client-report-section">
    <b>Progress pekerjaan</b>
    <p>{report.activities || "-"}</p>
  </div>
  {#if report.issues}<div class="client-report-section">
      <b>Kendala / catatan</b>
      <p>{report.issues}</p>
    </div>{/if}
  {#if report.nextPlan}<div class="client-report-section">
      <b>Rencana selanjutnya</b>
      <p>{report.nextPlan}</p>
    </div>{/if}
  {#if report.photos?.length || report.fileId}<div class="client-photo-gallery">
      {#each report.photos || [{ id: report.fileId, name: report.fileName }] as photo}
        <a href={url(photo.id || photo.fileId)} target="_blank" rel="noreferrer"
          ><img
            class="client-progress-photo"
            src={url(photo.id || photo.fileId)}
            alt="Foto progress proyek"
            loading="lazy"
          /></a
        >
      {/each}
    </div>{/if}
</article>
