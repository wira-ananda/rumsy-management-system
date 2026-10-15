<script lang="ts">
  import Card from "../../shared/Card.svelte";
  let { project }: { project: any } = $props();
</script>

<Card title="Project Activity Log"
  ><div class="timeline">
    {#each project.activity as activity}<div class="event">
        <div class="event-time">{activity.at}</div>
        <div class="event-text"><b>{activity.actor}</b> — {activity.text}</div>
      </div>{:else}<div class="empty">Belum ada aktivitas.</div>{/each}
  </div></Card
>
