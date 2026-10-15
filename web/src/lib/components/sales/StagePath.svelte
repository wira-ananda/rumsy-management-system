<script lang="ts">
  import { stages, stageNames } from "../../constants/catalog.js";
  let { stage }: { stage: string } = $props();
</script>

<div class="stage-path">
  {#each stages as item}<span
      class="stage-step"
      class:current={item === stage}
      class:done={stages.indexOf(item) < stages.indexOf(stage)}
      >{stageNames[item as keyof typeof stageNames]}</span
    >{/each}
</div>
