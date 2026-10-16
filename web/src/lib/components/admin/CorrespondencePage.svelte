<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Stat from "../shared/Stat.svelte";
  import Badge from "../shared/Badge.svelte";
  import { runtime } from "../../stores/runtime.js";
  import { TODAY } from "../../constants/catalog.js";
  import FileLink from "../shared/FileLink.svelte";
  import { letterForm, deleteLetter } from "../../features/admin/actions";
  import { date } from "../../utils/format.js";
  let search = $state(""),
    direction = $state("");
  let canEdit = $derived(
    ["ADMIN_GENERAL", "HEAD_BU", "SUPER_ADMIN"].includes(runtime.session!.role),
  );
  let rows = $derived(
    [...runtime.data!.correspondence].sort((a: any, b: any) =>
      String(b.date || "").localeCompare(String(a.date || "")),
    ),
  );
  let filtered = $derived(
    rows.filter(
      (item: any) =>
        (!direction || item.direction === direction) &&
        (!search ||
          [
            item.number,
            item.party,
            item.subject,
            item.projectId,
            item.notes,
          ].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(search.toLowerCase()),
          )),
    ),
  );
</script>

<PageHeader
  title="Arsip Surat"
  description="Pengarsipan surat masuk dan surat keluar Rumsy dalam satu tempat."
  >{#snippet actions()}{#if canEdit}<button
        class="btn primary"
        id="newLetter"
        onclick={() => letterForm()}>＋ Tambah Surat</button
      >{/if}{/snippet}</PageHeader
>
<div class="stats">
  <Stat
    label="Surat Masuk"
    value={rows.filter((item: any) => item.direction === "MASUK").length}
  /><Stat
    label="Surat Keluar"
    value={rows.filter((item: any) => item.direction === "KELUAR").length}
  /><Stat
    label="Bulan Ini"
    value={rows.filter(
      (item: any) => String(item.date || "").slice(0, 7) === TODAY.slice(0, 7),
    ).length}
  /><Stat label="Total Arsip" value={rows.length} />
</div>
<div class="card mt">
  <div class="card-body">
    <div class="filterbar">
      <label class="field grow"
        ><span>CARI SURAT</span><input
          class="input"
          id="letterSearch"
          bind:value={search}
          placeholder="Nomor surat, perihal, pengirim/penerima..."
        /></label
      ><label class="field"
        ><span>JENIS</span><select
          class="input"
          id="letterType"
          bind:value={direction}
          ><option value="">Semua</option><option value="MASUK"
            >Surat Masuk</option
          ><option value="KELUAR">Surat Keluar</option></select
        ></label
      >
    </div>
  </div>
  <div class="table-wrap">
    <table class="table">
      <thead
        ><tr
          >{#each ["Jenis", "Tanggal", "Nomor Surat", "Dari / Kepada", "Perihal", "Project", "File", "Aksi"] as label}<th
              >{label}</th
            >{/each}</tr
        ></thead
      ><tbody id="letterRows"
        >{#each filtered as item}<tr
            ><td
              ><Badge
                status={item.direction === "MASUK"
                  ? "SURAT MASUK"
                  : "SURAT KELUAR"}
              /></td
            ><td>{date(item.date)}</td><td><b>{item.number}</b></td><td
              >{item.party}</td
            ><td
              >{item.subject}{#if item.notes}<div class="tiny muted">
                  {item.notes}
                </div>{/if}</td
            ><td
              >{#if item.projectId}<a
                  class="link"
                  href={`#/projects/${item.projectId}`}>{item.projectId}</a
                >{:else}-{/if}</td
            ><td
              >{#if item.fileId}<FileLink
                  class="btn ghost small"
                  fileId={item.fileId}
                  filename={item.fileName || ""}>Lihat</FileLink
                >{:else}-{/if}</td
            ><td
              >{#if canEdit}<div class="action-row">
                  <button
                    class="btn ghost small editLetter"
                    onclick={() => letterForm(item)}>Edit</button
                  ><button
                    class="btn danger small delLetter"
                    onclick={() => deleteLetter(item)}>Hapus</button
                  >
                </div>{:else}-{/if}</td
            ></tr
          >{:else}<tr
            ><td colspan="8" class="empty">Belum ada arsip surat.</td></tr
          >{/each}</tbody
      >
    </table>
  </div>
</div>
