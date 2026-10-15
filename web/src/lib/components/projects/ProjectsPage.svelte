<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import ProjectCards from "./ProjectCards.svelte";
  import Card from "../shared/Card.svelte";
  import {
    visibleProjects,
    canManageProject,
  } from "../../access/permissions.js";
  import { projectForm } from "../../features/projects/actions";
  import type { Route } from "../../types/rms";
  let { route }: { route: Route } = $props();
  let projects = $derived(
    visibleProjects().filter((project: any) =>
      route.page === "projects-active"
        ? project.status !== "COMPLETED"
        : route.page === "projects-completed"
          ? project.status === "COMPLETED"
          : true,
    ),
  );
  let title = $derived(
    route.page === "projects-active"
      ? "Project Aktif"
      : route.page === "projects-completed"
        ? "Project Selesai"
        : "Semua Project",
  );
</script>

<PageHeader
  {title}
  description={route.page === "projects-active"
    ? `${projects.length} project aktif saat ini.`
    : route.page === "projects-completed"
      ? "Project selesai tetap tersimpan sebagai arsip digital."
      : "Satu project menjadi arsip digital lengkap untuk kontrak, pembayaran, dokumen, operasional, QC dan serah terima."}
  >{#snippet actions()}{#if route.page === "projects" && canManageProject()}<button
        class="btn primary"
        id="newProject"
        onclick={() => projectForm()}>＋ Tambah Project</button
      >{/if}{/snippet}</PageHeader
>{#if route.page === "projects-completed" && !projects.length}<Card
    title="Belum ada completed project"
    ><div class="empty">
      Gunakan Project 360 → Handover untuk finalisasi project setelah BAST.
    </div></Card
  >{:else}<ProjectCards {projects} />{/if}
