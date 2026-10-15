<script lang="ts">
  import Card from "../../shared/Card.svelte";
  import Info from "../../shared/Info.svelte";
  import Badge from "../../shared/Badge.svelte";
  import { runtime } from "../../../stores/runtime.js";
  import { currentActor, userById } from "../../../access/permissions.js";
  import { scheduleForm } from "../../../features/projects/actions";
  import { addProjectActivity } from "../../../domain/models.js";
  import { save } from "../../../services/api.js";
  import { date } from "../../../utils/format.js";
  let { project }: { project: any } = $props();
  let canUpdate = $derived(
    ["HEAD_BU", "MANAGER_OPERASIONAL", "SUPER_ADMIN"].includes(
      runtime.session!.role,
    ),
  );
  async function progress(event: Event) {
    project.progress = Number((event.currentTarget as HTMLInputElement).value);
    project.status =
      project.progress >= 100
        ? "HANDOVER"
        : project.progress >= 90
          ? "FINISHING"
          : project.progress > 0
            ? "RUNNING"
            : "PREPARATION";
    addProjectActivity(
      project,
      currentActor(),
      `Progress diubah menjadi ${project.progress}%.`,
    );
    await save();
  }
</script>

<div class="split">
  <div>
    <h3>Operasional</h3>
    <div class="small muted">
      Atur jadwal, target selesai, PIC dan progress proyek.
    </div>
  </div>
  {#if canUpdate}<button
      class="btn ghost"
      id="editSchedule"
      onclick={() => scheduleForm(project)}>✎ Edit Jadwal Project</button
    >{/if}
</div>
<Card title="Progress & Jadwal"
  ><div class="split">
    <span class="small">Progress Aktual</span><b id="progText"
      >{project.progress}%</b
    >
  </div>
  {#if canUpdate}<input
      id="prog"
      type="range"
      min="0"
      max="100"
      value={project.progress}
      onchange={progress}
      style="width:100%;margin-top:15px;accent-color:#2b6cb5"
    />{:else}<div class="progress mt">
      <div style:width={`${project.progress}%`}></div>
    </div>{/if}
  <div class="grid2eq mt">
    <Info label="Status Operasional"><Badge status={project.status} /></Info
    ><Info label="Tanggal Mulai" value={date(project.startDate)} /><Info
      label="Target Selesai"
      value={date(project.targetFinish)}
    /><Info label="PIC Operasional"
      >{project.ops || "-"}
      <div class="tiny muted">
        {userById(project.opsUserId)?.email || ""}
      </div></Info
    ><Info label="PIC QC"
      >{project.qc || "-"}
      <div class="tiny muted">
        {userById(project.qcUserId)?.email || ""}
      </div></Info
    ><Info label="Persetujuan Mulai"
      ><Badge status={project.started ? "APPROVED" : "PENDING"} /></Info
    >
  </div>
  <div class="notice warn mt">
    Progress 100% belum otomatis menyelesaikan project. Tetap diperlukan QC
    selesai, BAST Final, dan persetujuan penyelesaian.
  </div></Card
>
