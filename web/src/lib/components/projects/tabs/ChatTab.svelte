<script lang="ts">
  import ChatThread from "../../shared/ChatThread.svelte";
  let { project }: { project: any } = $props();
</script>

<div style="margin-bottom:14px">
  <h3>Chat Internal Project</h3>
  <div class="small muted">
    Diskusi internal melekat permanen pada Project dossier dan tidak tercampur
    dengan chat lead.
  </div>
</div>
<ChatThread entity={project} kind="PROJECT" />
