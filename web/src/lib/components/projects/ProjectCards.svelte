<script lang="ts">
  import { currentContract, verifiedPaid } from "../../domain/models.js";
  import { money, date } from "../../utils/format.js";
  let { projects }: { projects: any[] } = $props();
</script>

<div class="project-grid">
  {#each projects as project}<a
      class="project-card"
      href={`#/projects/${project.id}`}
      style="text-decoration:none;color:inherit"
      ><div class="dossier">{project.id}</div>
      <h3>{project.name}</h3>
      <div class="project-meta">{project.client} • {project.location}</div>
      <div class="mini-grid">
        <div>
          <div class="mini-label">Kontrak</div>
          <div class="mini-value">{money(currentContract(project))}</div>
        </div>
        <div>
          <div class="mini-label">Dibayar</div>
          <div class="mini-value">{money(verifiedPaid(project))}</div>
        </div>
        <div>
          <div class="mini-label">Status</div>
          <div class="mini-value">{project.status}</div>
        </div>
        <div>
          <div class="mini-label">Target Selesai</div>
          <div class="mini-value">{date(project.targetFinish)}</div>
        </div>
      </div>
      <div class="progress">
        <div style:width={`${project.progress}%`}></div>
      </div>
      <div class="tiny muted" style="margin-top:5px">
        Progress {project.progress}%
      </div></a
    >{/each}
</div>
