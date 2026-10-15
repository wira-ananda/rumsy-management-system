<script lang="ts">
  import { onMount } from "svelte";
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import Info from "../shared/Info.svelte";
  import Badge from "../shared/Badge.svelte";
  import { runtime } from "../../stores/runtime.js";
  import { apiCall } from "../../services/api.js";
  let status = $state<any>(null),
    error = $state(""),
    result = $state(""),
    to = $state(runtime.session!.email || ""),
    busy = $state(false);
  async function load() {
    try {
      status = await apiCall("/api/admin/email/status");
      error = "";
    } catch (e) {
      error = (e as Error).message;
    }
  }
  onMount(() => {
    void load();
  });
  async function send(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    result = "Mengirim email...";
    try {
      let r = await apiCall("/api/admin/email/test", {
        method: "POST",
        body: JSON.stringify({ to }),
      });
      result = r.sent
        ? "Email berhasil dikirim." + (r.id ? " ID: " + r.id : "")
        : "Email belum terkirim. " + (r.reason || "Unknown error");
      await load();
    } catch (e) {
      result = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<PageHeader
  title="Email Notification"
  description="Pengiriman email otomatis RMS untuk PIC dan reviewer Task."
/>
<div class="grid2">
  <Card title="Status Pengiriman"
    ><div id="emailStatus">
      {#if error}<div class="notice warn">{error}</div>{:else if !status}<div
          class="empty"
        >
          Memeriksa konfigurasi email...
        </div>{:else}<div class="stack">
          <Info label="Provider" value={status.provider || "Resend"} /><Info
            label="Status"
            value={status.configured ? "AKTIF" : "BELUM AKTIF"}
          /><Info
            label="API Key"
            value={status.apiKeyConfigured
              ? "Tersimpan aman di Cloudflare"
              : "Belum diisi"}
          /><Info
            label="Email Pengirim"
            value={status.from || "Belum diisi"}
          /><Info label="RMS URL" value={status.rmsUrl || "-"} />
        </div>
        <div
          class="notice mt"
          class:success={status.configured}
          class:warn={!status.configured}
        >
          {status.configured
            ? "Siap mengirim. Notifikasi Task akan dikirim otomatis sesuai workflow."
            : "Lengkapi Secret/Variable Cloudflare terlebih dahulu."}
        </div>{/if}
    </div></Card
  ><Card title="Tes Pengiriman Email"
    ><form id="emailTestForm" onsubmit={send}>
      <label class="field"
        ><span>KIRIM EMAIL TES KE</span><input
          class="input"
          type="email"
          name="to"
          bind:value={to}
          required
        /></label
      ><button
        class="btn primary"
        style="width:100%;margin-top:10px"
        disabled={busy}>Kirim Email Tes</button
      >
    </form>
    <div id="emailTestResult" class="mt">
      {#if result}<div class="notice info">{result}</div>{/if}
    </div></Card
  >
</div>
<div class="mt">
  <Card title="Email Otomatis Task"
    ><div class="table-wrap">
      <table class="table">
        <thead
          ><tr><th>Event</th><th>Penerima</th><th>Isi Notifikasi</th></tr
          ></thead
        ><tbody
          >{#each [["ASSIGNED", "PIC", "Tugas baru, deskripsi, project, tanggal mulai dan target selesai."], ["SUBMITTED", "Atasan / Reviewer", "PIC mengajukan tugas selesai dan meminta pemeriksaan."], ["APPROVED", "PIC", "Atasan sudah ACC tugas."], ["REVISION", "PIC", "Tugas belum ACC dan dikembalikan beserta catatan perbaikan."]] as row}<tr
              ><td><Badge status={row[0]} /></td><td>{row[1]}</td><td
                >{row[2]}</td
              ></tr
            >{/each}</tbody
        >
      </table>
    </div></Card
  >
</div>
<div class="mt">
  <Card title="Konfigurasi Sekali Saja"
    ><div class="notice info">
      API key tidak disimpan di database RMS dan tidak ditampilkan di browser.
      Secret tetap disimpan oleh Cloudflare.
    </div>
    <div class="stack mt">
      <Info label="Secret" value="RESEND_API_KEY" /><Info
        label="Alamat Pengirim"
        value="EMAIL_FROM"
      /><Info label="Link RMS" value="RMS_URL" />
    </div>
    <div class="notice warn mt">
      Jika Status masih BELUM AKTIF, buka Cloudflare → rms-rumsy-app → Settings
      → Variables and Secrets. Isi tiga variable tersebut, lalu redeploy.
      Setelah itu kembali ke halaman ini dan tekan Tes Pengiriman Email.
    </div></Card
  >
</div>
