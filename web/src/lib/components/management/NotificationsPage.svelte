<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import Stat from "../shared/Stat.svelte";
  import Info from "../shared/Info.svelte";
  import Badge from "../shared/Badge.svelte";
  import { runtime } from "../../stores/runtime.js";
  import { date } from "../../utils/format.js";
  import { save } from "../../services/api.js";
  async function mark(n: any) {
    n.read = true;
    await save();
  }
</script>

<PageHeader
  title="Notification Center"
  description="In-app notification untuk payment, follow-up, QC, approval, document dan deadline."
/>
<div class="notice-center">
  {#each runtime.data!.notifications as n}<div
      class="notif"
      class:unread={!n.read}
    >
      <div class="split">
        <div>
          <b>{n.type}</b>
          <div class="small" style="margin-top:4px">{n.text}</div>
          <div class="tiny muted">{n.date}</div>
        </div>
        {#if n.read}<Badge status="READ" />{:else}<button
            class="btn ghost small markRead"
            data-id={n.id}
            onclick={() => mark(n)}>Tandai Dibaca</button
          >{/if}
      </div>
    </div>{/each}
</div>
