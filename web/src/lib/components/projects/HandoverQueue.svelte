<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import Stat from "../shared/Stat.svelte";
  import Info from "../shared/Info.svelte";
  import Badge from "../shared/Badge.svelte";
  import { runtime } from "../../stores/runtime.js";

  import { visibleProjects } from "../../access/permissions.js";
  let projects = $derived(visibleProjects());
</script>

<PageHeader
  title="Project Handover"
  description="Flow: Sales Submit → Manager Operasional Review → Accept / Return. Pembangunan baru dapat aktif setelah DP VERIFIED + Contract Signed + Handover Accepted + Project Start."
/><Card title="Handover Queue"
  ><div class="table-wrap">
    <table class="table">
      <thead
        ><tr
          >{#each ["Project", "Client", "DP Proyek", "Contract", "Handover", "Start", "Aksi"] as h}<th
              >{h}</th
            >{/each}</tr
        ></thead
      ><tbody
        >{#each projects as p}<tr
            ><td
              ><a class="link" href={`#/projects/${p.id}/handover`}>{p.id}</a
              ></td
            ><td>{p.client}</td><td
              ><Badge
                status={p.transactions.some(
                  (t: any) => t.type === "DP_PROYEK" && t.status === "VERIFIED",
                )
                  ? "VERIFIED"
                  : "PENDING"}
              /></td
            ><td><Badge status={p.contract.status} /></td><td
              ><Badge status={p.handover.status} /></td
            ><td><Badge status={p.started ? "RUNNING" : "PENDING"} /></td><td
              ><a class="btn ghost small" href={`#/projects/${p.id}/handover`}
                >Buka</a
              ></td
            ></tr
          >{/each}</tbody
      >
    </table>
  </div></Card
>
