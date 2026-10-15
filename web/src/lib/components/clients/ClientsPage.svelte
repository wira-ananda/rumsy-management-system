<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import Info from "../shared/Info.svelte";
  import ProjectCards from "../projects/ProjectCards.svelte";
  import { runtime } from "../../stores/runtime.js";
  import { currentContract } from "../../domain/models.js";
  import { money } from "../../utils/format.js";
  import type { Route } from "../../types/rms";
  let { route }: { route: Route } = $props();
  let client = $derived(
    runtime.data!.clients.find((item: any) => item.id === route.id),
  );
  let projects = $derived(
    client
      ? runtime.data!.projects.filter(
          (project: any) => project.clientId === client.id,
        )
      : [],
  );
</script>

{#if route.id && client}<PageHeader
    title={client.name}
    description={`${client.id} • ${client.phone}`}
  />
  <div class="grid2">
    <Card title="Client Profile"
      ><div class="grid2eq">
        <Info label="Nama" value={client.name} /><Info
          label="WhatsApp"
          value={client.phone}
        /><Info label="Email" value={client.email || "-"} /><Info
          label="Alamat"
          value={client.address}
        /><Info label="Catatan" value={client.notes || "-"} />
      </div></Card
    ><Card title="Project Summary"
      ><div class="grid2eq">
        <Info label="Total Project" value={projects.length} /><Info
          label="Nilai Total"
          value={money(
            projects.reduce(
              (sum: number, project: any) => sum + currentContract(project),
              0,
            ),
          )}
        /><Info
          label="Aktif"
          value={projects.filter(
            (project: any) => project.status !== "COMPLETED",
          ).length}
        /><Info
          label="Selesai"
          value={projects.filter(
            (project: any) => project.status === "COMPLETED",
          ).length}
        />
      </div></Card
    >
  </div>
  <div class="mt"><ProjectCards {projects} /></div>
{:else}<PageHeader
    title="Client Database"
    description="Client terpisah dari Project sehingga satu client dapat memiliki banyak proyek."
  />
  <div class="project-grid">
    {#each runtime.data!.clients as item}{@const owned =
        runtime.data!.projects.filter(
          (project: any) => project.clientId === item.id,
        )}<a
        class="client-card"
        href={`#/clients/${item.id}`}
        style="text-decoration:none;color:inherit"
        ><h3>{item.name}</h3>
        <div class="meta">{item.phone} • {item.address}</div>
        <div class="project-count">
          {owned.length} Project • {money(
            owned.reduce(
              (sum: number, project: any) => sum + currentContract(project),
              0,
            ),
          )}
        </div></a
      >{/each}
  </div>{/if}
