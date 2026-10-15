<script lang="ts">
  import Badge from "../../shared/Badge.svelte";
  import { runtime } from "../../../stores/runtime.js";
  import { currentContract } from "../../../domain/models.js";
  import {
    addendumForm,
    deleteAddendum,
    approveAddendum,
    billAddendum,
  } from "../../../features/projects/addendums";
  import { date, money } from "../../../utils/format.js";
  let { project }: { project: any } = $props();
  let canEdit = $derived(
    ["HEAD_BU", "MANAGER_OPERASIONAL", "ADMIN_GENERAL", "SUPER_ADMIN"].includes(
      runtime.session!.role,
    ),
  );
  let canApprove = $derived(
    ["HEAD_BU", "SUPER_ADMIN"].includes(runtime.session!.role),
  );
</script>

<div class="split" style="margin-bottom:14px">
  <div>
    <h3>Addendum</h3>
    <div class="small muted">
      Hanya APPROVED/SIGNED yang mengubah Current Contract Value.
    </div>
  </div>
  {#if canEdit}<button
      class="btn primary"
      id="addAdd"
      onclick={() => addendumForm(project)}>＋ Addendum</button
    >{/if}
</div>
<div class="stack">
  {#each project.addendums as item}<div class="add-item">
      <div>
        <b>Adendum {item.number}</b>
        <div class="small muted">{item.description || "-"}</div>
        <div class="tiny muted">{date(item.date)} • {item.fileName || "-"}</div>
      </div>
      <div class="right">
        <b class="mono"
          >{Number(item.value) >= 0 ? "+" : ""}{money(item.value)}</b
        >
        <div style="margin-top:5px"><Badge status={item.status} /></div>
        {#if item.rejectionReason}<div class="tiny muted">
            Alasan: {item.rejectionReason}
          </div>{/if}
        <div class="action-row mt">
          {#if canEdit && ["DRAFT", "REJECTED"].includes(item.status)}<button
              class="btn ghost small editAdd"
              onclick={() => addendumForm(project, item)}>Edit</button
            >{/if}{#if canApprove && ["DRAFT", "REJECTED"].includes(item.status)}<button
              class="btn danger small deleteAdd"
              onclick={() => deleteAddendum(project, item)}>Hapus</button
            >{/if}{#if canApprove && item.status === "DRAFT"}<button
              class="btn primary small approveAdd"
              onclick={() => approveAddendum(item)}>Approve</button
            >{/if}{#if ["APPROVED", "SIGNED"].includes(item.status)}<button
              class="btn ghost small billAdd"
              onclick={() => billAddendum(project, item)}>Buat Tagihan</button
            >{/if}
        </div>
      </div>
    </div>{:else}<div class="empty">Belum ada addendum.</div>{/each}
</div>
<div class="notice info mt">
  <b>Current Contract Value:</b>
  {money(currentContract(project))}
</div>
