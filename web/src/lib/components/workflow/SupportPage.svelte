<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Badge from "../shared/Badge.svelte";
  import { runtime } from "../../stores/runtime.js";
  import { supportForm } from "../../features/workflow/actions";
  import { save } from "../../services/api.js";
  import { date } from "../../utils/format.js";
  const categories = ["FINANCE", "PURCHASING", "HRD", "LEGAL", "ARDA"];
  async function advance(item: any) {
    const sequence = ["SUBMITTED", "RECEIVED", "ON_PROCESS", "COMPLETED"];
    item.status =
      sequence[
        Math.min(sequence.length - 1, sequence.indexOf(item.status) + 1)
      ];
    await save();
  }
</script>

<PageHeader
  title="Support Holding"
  description="Request ke Shared Service Holding dengan status workflow."
  >{#snippet actions()}<button
      class="btn primary"
      id="newSup"
      onclick={supportForm}>＋ Support Request</button
    >{/snippet}</PageHeader
>
<div class="summary-strip">
  {#each categories as category}<div class="summary-chip">
      <small>{category}</small><b
        >{runtime.data!.support.filter(
          (item: any) => item.category === category,
        ).length} request</b
      >
    </div>{/each}
</div>
<div class="stack mt">
  {#each runtime.data!.support as item}<div class="approval-card">
      <div class="top">
        <div>
          <b>{item.subject}</b>
          <div class="tiny muted">
            {item.id} • {item.projectId || "Non-project"} • {item.category}
          </div>
        </div>
        <Badge status={item.status} />
      </div>
      <div class="small muted" style="margin-top:7px">
        {item.description}<br />Request by {item.requester} → {item.assigned} • Due
        {date(item.due)}
      </div>
      {#if item.status !== "COMPLETED"}<button
          class="btn ghost small supNext mt"
          onclick={() => advance(item)}>Advance Status</button
        >{/if}
    </div>{/each}
</div>
