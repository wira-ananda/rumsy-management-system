<script lang="ts">
  import Card from "../shared/Card.svelte";
  import Badge from "../shared/Badge.svelte";
  import { correctiveForm, verifyDialog } from "../../features/qc/actions";
  import { date } from "../../utils/format.js";
  let { findings, actions = false }: { findings: any[]; actions?: boolean } =
    $props();
</script>

<Card title="Finding Register"
  ><div class="table-wrap">
    <table class="table">
      <thead
        ><tr
          ><th>Finding</th><th>Project</th><th>Area / Item</th><th>Severity</th
          ><th>PIC</th><th>Target</th><th>Status</th>{#if actions}<th>Aksi</th
            >{/if}</tr
        ></thead
      ><tbody
        >{#each findings as finding}<tr
            ><td><b>{finding.id}</b></td><td
              ><a class="link" href={`#/projects/${finding.projectId}/qc`}
                >{finding.projectId}</a
              ></td
            ><td
              >{finding.area}
              <div class="tiny muted">{finding.item}</div></td
            ><td><Badge status={finding.severity} /></td><td>{finding.pic}</td
            ><td>{date(finding.target)}</td><td
              ><Badge status={finding.status} /></td
            >{#if actions}<td
                >{#if finding.status === "WAITING_VERIFICATION"}<button
                    class="btn primary small qVerify"
                    onclick={() => verifyDialog(finding.projectId, finding.id)}
                    >Verify</button
                  >{:else if ["OPEN", "OVERDUE"].includes(finding.status)}<button
                    class="btn ghost small qCorrect"
                    onclick={() =>
                      correctiveForm(finding.projectId, finding.id)}
                    >Corrective</button
                  >{:else}-{/if}</td
              >{/if}</tr
          >{/each}</tbody
      >
    </table>
  </div></Card
>
