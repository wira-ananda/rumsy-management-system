<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Badge from "../shared/Badge.svelte";
  import { runtime } from "../../stores/runtime.js";
  import { decideApproval } from "../../features/workflow/actions";
  let canDecide = $derived(
    ["HEAD_BU", "MANAGER_OPERASIONAL", "MANAGER_SALES", "SUPER_ADMIN"].includes(
      runtime.session!.role,
    ),
  );
</script>

<PageHeader
  title="Approval Queue"
  description="Reusable approval engine untuk Addendum, Handover, Completion, Payment Correction dan exceptional override."
/>
<div class="stack">
  {#each runtime.data!.approvals as approval}<div class="approval-card">
      <div class="top">
        <div>
          <b>{approval.subject}</b>
          <div class="tiny muted">
            {approval.type} • {approval.reference} • {approval.projectId || "-"}
          </div>
        </div>
        <Badge status={approval.status} />
      </div>
      <div class="small muted" style="margin-top:8px">
        Requested by {approval.requestedBy} → {approval.approver}<br
        />{approval.requestedAt}
      </div>
      {#if approval.status === "PENDING" && canDecide}<div
          class="action-row mt"
        >
          <button
            class="btn primary small appApprove"
            onclick={() => decideApproval(approval, "APPROVED")}>Approve</button
          ><button
            class="btn ghost small appReturn"
            onclick={() => decideApproval(approval, "RETURNED")}>Return</button
          ><button
            class="btn danger small appReject"
            onclick={() => decideApproval(approval, "REJECTED")}>Reject</button
          >
        </div>{/if}
    </div>{/each}
</div>
