<script lang="ts">
  import { onMount } from "svelte";
  import ProgressReportCard from "./ProgressReportCard.svelte";
  import LoadingScreen from "../shared/LoadingScreen.svelte";
  import type { PublicProject } from "../../types/rms";
  let token = $state("");
  let project = $state<PublicProject | null>(null);
  let status = $state<"loading" | "invalid" | "error" | "ready">("loading");
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
  onMount(() => {
    let alive = true;
    document.body.classList.add("client-body");
    token = new URLSearchParams(location.search).get("token") || "";
    if (!token) status = "invalid";
    else {
      fetch("/api/client/project?token=" + encodeURIComponent(token), {
        cache: "no-store",
      })
        .then(async (response) => {
          const body = await response.json().catch(() => ({}));
          if (!response.ok)
            throw new Error(body.error || "Link tidak tersedia");
          if (alive) {
            project = body.project;
            status = "ready";
          }
        })
        .catch(() => {
          if (alive) status = "error";
        });
    }
    return () => {
      alive = false;
      document.body.classList.remove("client-body");
    };
  });
</script>

<svelte:head><title>Progress Proyek • Rumsy</title></svelte:head>

<div id="clientRoot" class="client-portal-shell">
  {#if status === "loading"}<LoadingScreen
      title="Memuat progress proyek"
      description="Sedang menyiapkan laporan terbaru untukmu."
    />
  {:else if status === "invalid"}<div class="client-error">
      <h2>Link tidak valid</h2>
      <p>Silakan gunakan link progress yang diberikan oleh tim Rumsy.</p>
    </div>
  {:else if status === "error"}<div class="client-error">
      <img src="/rms-mark.svg" alt="Rumsy" />
      <h2>Portal tidak dapat dibuka</h2>
      <p>
        Link mungkin sudah dinonaktifkan atau diperbarui. Hubungi tim Rumsy
        untuk mendapatkan link terbaru.
      </p>
    </div>
  {:else if project}
    <header class="client-header">
      <div class="client-brand">
        <img src="/rms-mark.svg" alt="Rumsy" />
        <div><b>RUMSY</b><span>Progress Proyek</span></div>
      </div>
      <span class="client-secure">Portal Client</span>
    </header>
    <main class="client-main">
      <section class="client-hero">
        <div>
          <div class="client-kicker">{project.id}</div>
          <h1>{project.name}</h1>
          <p>{project.location || ""}</p>
        </div>
        <div class="client-big-progress">
          <strong>{Number(project.progress || 0)}%</strong><span
            >Progress Aktual</span
          >
        </div>
      </section>
      <section class="client-summary">
        <div><span>Status</span><b>{project.status || "-"}</b></div>
        <div><span>Tanggal Mulai</span><b>{date(project.startDate)}</b></div>
        <div>
          <span>Target Selesai</span><b>{date(project.targetFinish)}</b>
        </div>
        <div>
          <span>Update Dipublikasikan</span><b
            >{(project.daily || []).length + (project.weekly || []).length} laporan</b
          >
        </div>
      </section>
      <section class="client-progressbar" aria-label="Progress aktual">
        <div
          style:width={`${Math.max(0, Math.min(100, Number(project.progress || 0)))}%`}
        ></div>
      </section>
      <section class="client-section">
        <div class="client-section-title">
          <div>
            <span>Update Lapangan</span>
            <h2>Laporan Harian</h2>
          </div>
          <span>{(project.daily || []).length} laporan</span>
        </div>
        <div class="client-report-grid">
          {#each project.daily || [] as report}<ProgressReportCard
              {report}
              {token}
            />{:else}<div class="client-empty">
              Belum ada laporan harian yang dipublikasikan.
            </div>{/each}
        </div>
      </section>
      <section class="client-section">
        <div class="client-section-title">
          <div>
            <span>Ringkasan Proyek</span>
            <h2>Laporan Mingguan</h2>
          </div>
          <span>{(project.weekly || []).length} laporan</span>
        </div>
        <div class="client-report-grid">
          {#each project.weekly || [] as report}<ProgressReportCard
              {report}
              {token}
              weekly
            />{:else}<div class="client-empty">
              Belum ada laporan mingguan yang dipublikasikan.
            </div>{/each}
        </div>
      </section>
      <footer class="client-footer">
        Informasi pada halaman ini berasal dari RMS Rumsy dan hanya menampilkan
        laporan yang dipublikasikan untuk client.
      </footer>
    </main>
  {/if}
</div>
