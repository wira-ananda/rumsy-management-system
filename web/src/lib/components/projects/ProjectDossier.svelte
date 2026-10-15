<script lang="ts">
  import { projectTabComponents } from "./tabs";
  import Badge from "../shared/Badge.svelte";
  import Stat from "../shared/Stat.svelte";
  import { runtime } from "../../stores/runtime.js";
  import {
    projectById,
    currentContract,
    verifiedPaid,
  } from "../../domain/models.js";
  import { canManageProject } from "../../access/permissions.js";
  import { projectTabs, projectTabLabels } from "../../constants/catalog.js";
  import { projectForm, deleteProject } from "../../features/projects/actions";
  import { money } from "../../utils/format.js";
  import type { Route } from "../../types/rms";
  let { route }: { route: Route } = $props();
  let project = $derived(projectById(route.id));
  let tab = $derived(
    projectTabs.includes(route.tab || "") ? route.tab! : "overview",
  );
  let canManage = $derived(canManageProject());
  let canDelete = $derived(
    ["HEAD_BU", "SUPER_ADMIN"].includes(runtime.session?.role || ""),
  );
</script>

{#if project}
  <div class="card dossier-card" style="overflow:hidden">
    <div class="dossier-top">
      <div class="split dossier-actions">
        <div class="dossier">{project.id}</div>
        {#if canManage}<div class="action-row">
            <button
              class="btn ghost"
              id="editProject"
              onclick={() => projectForm(project)}>✎ Edit Project</button
            >
            <button
              class="btn primary"
              id="quickUploadDoc"
              onclick={() => {
                location.hash = `#/projects/${project.id}/document`;
              }}>＋ Upload Dokumen</button
            >
            {#if canDelete}<button
                class="btn danger"
                id="deleteProject"
                onclick={() => deleteProject(project)}>Hapus Project</button
              >{/if}
          </div>{/if}
      </div>
      <div class="dossier-flex">
        <div>
          <h1>{project.name}</h1>
          <div class="dossier-meta">
            <span>{project.client}</span><span>{project.location}</span><span
              >Sales: {project.sales || "-"}</span
            ><span>Operasional: {project.ops || "-"}</span>
          </div>
        </div>
        <div><Badge status={project.status} /></div>
      </div>
      <div class="stats five mt">
        <Stat
          label="Kontrak Awal"
          value={money(project.originalContract)}
        /><Stat
          label="Adendum"
          value={money(currentContract(project) - project.originalContract)}
        /><Stat
          label="Kontrak Berjalan"
          value={money(currentContract(project))}
        /><Stat
          label="Total Dibayar"
          value={money(verifiedPaid(project))}
          tone="success"
        /><Stat
          label="Sisa Pembayaran"
          value={money(currentContract(project) - verifiedPaid(project))}
          tone="warning"
        />
      </div>
    </div>
    <div class="tabs">
      {#each projectTabs as item}<a
          class="tab"
          class:active={item === tab}
          href={`#/projects/${project.id}/${item}`}
          style="text-decoration:none"
          >{projectTabLabels[item as keyof typeof projectTabLabels]}</a
        >{/each}
    </div>
    <div class="tab-body" id="projectTab">
      {#key `${project.id}/${tab}`}{@const Tab = projectTabComponents[tab]}<Tab
          {project}
        />{/key}
    </div>
  </div>
{:else}
  <div class="pagehead">
    <div>
      <div class="eyebrow">RUMSY INTERNAL • PRODUCTION</div>
      <h1>Project tidak ditemukan</h1>
    </div>
  </div>
{/if}
