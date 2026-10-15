<script lang="ts">
  import Card from "../../shared/Card.svelte";
  import Badge from "../../shared/Badge.svelte";
  import { runtime } from "../../../stores/runtime.js";
  import {
    progressForm,
    deleteProgress,
  } from "../../../features/projects/documents";
  import { fileUrl } from "../../../services/api.js";
  import { date } from "../../../utils/format.js";
  let { project }: { project: any } = $props();
  let canEdit = $derived(
    ["HEAD_BU", "MANAGER_OPERASIONAL", "ADMIN_GENERAL", "SUPER_ADMIN"].includes(
      runtime.session!.role,
    ),
  );
</script>

<div class="split">
  <div>
    <h3>Laporan Progress</h3>
    <div class="small muted">
      Laporan harian dan mingguan yang dapat dipublikasikan langsung ke Portal
      Client.
    </div>
  </div>
  {#if canEdit}<div class="action-row">
      <button
        class="btn primary"
        id="addDaily"
        onclick={() => progressForm(project, "DAILY")}>＋ Laporan Harian</button
      ><button
        class="btn ghost"
        id="addWeekly"
        onclick={() => progressForm(project, "WEEKLY")}
        >＋ Laporan Mingguan</button
      >
    </div>{/if}
</div>
<div class="grid2 mt">
  {#each ["DAILY", "WEEKLY"] as kind}<Card
      title={kind === "DAILY" ? "Laporan Harian" : "Laporan Mingguan"}
      >{#each project[kind === "DAILY" ? "progressDaily" : "progressWeekly"] as report}<div
          class="report-item"
        >
          <div class="split">
            <div>
              <b
                >{kind === "DAILY"
                  ? date(report.date)
                  : `${date(report.start)} – ${date(report.end)}`} • {report.progress}%</b
              >
              <div class="tiny muted">
                {kind === "WEEKLY"
                  ? `Target ${report.targetProgress || 0}% • `
                  : ""}{report.published !== false
                  ? "Tampil di Portal Client"
                  : "Internal saja"} • {report.createdBy ||
                  report.updatedBy ||
                  "-"}
              </div>
            </div>
            <Badge
              status={report.published !== false ? "PUBLISHED" : "INTERNAL"}
            />
          </div>
          <div class="small report-text">{report.activities || "-"}</div>
          <div class="action-row">
            {#if report.photos?.length || report.fileId}<div
                class="progress-photo-preview"
              >
                {#each report.photos || [{ id: report.fileId, name: report.fileName }] as photo}<a
                    href={fileUrl(photo.id || photo.fileId)}
                    target="_blank"
                    rel="noreferrer"
                    ><img
                      class="progress-photo-thumb"
                      src={fileUrl(photo.id || photo.fileId)}
                      alt="Foto Progress"
                      loading="lazy"
                    /></a
                  >{/each}<a
                  class="btn ghost small"
                  target="_blank"
                  rel="noreferrer"
                  href={fileUrl(report.photos?.[0]?.id || report.fileId)}
                  >Buka Foto</a
                >
              </div>{/if}{#if canEdit}<button
                class="btn ghost small editProgress"
                onclick={() =>
                  progressForm(project, kind as "DAILY" | "WEEKLY", report)}
                >Edit</button
              ><button
                class="btn danger small delProgress"
                onclick={() => deleteProgress(project, kind, report)}
                >Hapus</button
              >{/if}
          </div>
        </div>{:else}<div class="empty">
          Belum ada laporan {kind === "DAILY" ? "harian" : "mingguan"}.
        </div>{/each}</Card
    >{/each}
</div>
