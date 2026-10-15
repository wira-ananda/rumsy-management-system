<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Badge from "../shared/Badge.svelte";
  import { runtime } from "../../stores/runtime.js";
  import {
    taskForm,
    taskPicUsers,
    isTaskPic,
    isTaskReviewer,
    taskStatus,
    taskAction,
    taskRevisionForm,
  } from "../../features/workflow/actions";
  import { date } from "../../utils/format.js";
  let canManage = $derived(
    [
      "HEAD_BU",
      "MANAGER_OPERASIONAL",
      "MANAGER_SALES",
      "MANAGER_QC",
      "ADMIN_GENERAL",
      "SUPER_ADMIN",
    ].includes(runtime.session!.role),
  );
  let waiting = $derived(
    runtime.data!.tasks.filter(
      (task: any) =>
        isTaskPic(task) && ["TO_DO", "REVISION"].includes(task.status),
    ).length,
  );
  let review = $derived(
    runtime.data!.tasks.filter(
      (task: any) => isTaskReviewer(task) && task.status === "SUBMITTED",
    ).length,
  );
  const columns = [
    { key: "TO_DO", title: "DIBERIKAN" },
    { key: "ON_PROGRESS", title: "DIKERJAKAN" },
    { key: "SUBMITTED", title: "MENUNGGU REVIEW" },
    { key: "DONE", title: "SELESAI" },
    { key: "CANCELLED", title: "BATAL" },
  ];
</script>

<PageHeader
  title="Tasks"
  description="Workflow: Diberikan → Dikerjakan → Menunggu Review → Selesai."
  >{#snippet actions()}<button
      class="btn primary"
      id="newTask"
      onclick={() => taskForm()}>＋ Task</button
    >{/snippet}</PageHeader
>{#if waiting}<div class="notice info" style="margin-bottom:12px">
    🔔 <b>{waiting} task</b> menunggu Anda. Tekan <b>Mulai Task</b> untuk memulai.
  </div>{/if}{#if review}<div class="notice warn" style="margin-bottom:12px">
    🔔 <b>{review} task</b> menunggu review Anda.
  </div>{/if}
<div class="kanban-board">
  {#each columns as column}<div class="kanban-col" data-status={column.key}>
      <div class="kanban-title">{column.title}</div>
      <div class="kanban-drop">
        {#each runtime.data!.tasks.filter((task: any) => task.status === column.key) as task}<div
            class="task-kanban-card"
            data-id={task.id}
          >
            <div class="split">
              <Badge status={task.priority} /><Badge
                status={taskStatus(task.status)}
              />
            </div>
            <h3>{task.title}</h3>
            <div class="small">{task.description || "-"}</div>
            <div class="task-mini">
              <b>PIC</b><br />{taskPicUsers(task)
                .map((user) => user.name)
                .join(", ") || String(task.pic || "-")}
            </div>
            <div class="task-mini">
              <b>Atasan / Reviewer</b><br />{task.reviewerName || "-"}
            </div>
            <div class="task-mini"><b>Target</b><br />{date(task.due)}</div>
            {#if task.reviewNote}<div
                class="notice warn"
                style="margin-top:8px"
              >
                <b>Catatan review:</b>
                {task.reviewNote}
              </div>{/if}
            <div class="action-row mt">
              {#if ["TO_DO", "REVISION"].includes(task.status) && isTaskPic(task)}<button
                  class="btn primary small startTask"
                  onclick={() => taskAction(task, "START")}>▶ Mulai Task</button
                >{/if}{#if task.status === "ON_PROGRESS" && isTaskPic(task)}<button
                  class="btn primary small submitTask"
                  onclick={() => taskAction(task, "SUBMIT")}
                  >✓ Ajukan Selesai</button
                >{/if}{#if task.status === "SUBMITTED" && isTaskReviewer(task)}<button
                  class="btn primary small approveTask"
                  onclick={() => taskAction(task, "APPROVE")}>✓ Approve</button
                ><button
                  class="btn danger small reviseTask"
                  onclick={() => taskRevisionForm(task)}>↩ Kembalikan</button
                >{/if}{#if canManage && !["DONE", "CANCELLED"].includes(task.status)}<button
                  class="btn ghost small editTask"
                  onclick={() => taskForm(task)}>Edit</button
                >{/if}{#if canManage && ["TO_DO", "REVISION", "ON_PROGRESS"].includes(task.status)}<button
                  class="btn danger small deleteTask"
                  onclick={() => taskAction(task, "DELETE")}>Hapus</button
                >{/if}
            </div>
          </div>{:else}<div class="empty">Kosong</div>{/each}
      </div>
    </div>{/each}
</div>
