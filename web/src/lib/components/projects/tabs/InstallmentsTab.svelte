<script lang="ts">
  import Badge from "../../shared/Badge.svelte";
  import { runtime } from "../../../stores/runtime.js";
  import {
    installmentPaid,
    installmentStatus,
  } from "../../../domain/models.js";
  import { installmentForm } from "../../../features/projects/payments";
  import { date, money } from "../../../utils/format.js";
  let { project }: { project: any } = $props();
</script>

<div class="split" style="margin-bottom:14px">
  <div>
    <h3>Payment Schedule</h3>
    <div class="small muted">
      Satu installment dapat memiliki beberapa payment record. Status dihitung
      otomatis dari VERIFIED payments.
    </div>
  </div>
  {#if ["HOLDING_FINANCE", "SUPER_ADMIN"].includes(runtime.session!.role)}<button
      class="btn primary"
      id="addIns"
      onclick={() => installmentForm(project)}>＋ Jadwal</button
    >{/if}
</div>
<div class="table-wrap">
  <table class="table">
    <thead
      ><tr
        >{#each ["Cicilan", "Due Date", "Amount Due", "Verified Paid", "Balance", "Status", "Payment Count"] as label}<th
            >{label}</th
          >{/each}</tr
      ></thead
    ><tbody
      >{#each project.installments as installment}{@const paid =
          installmentPaid(project, installment)}<tr
          ><td
            ><b>{installment.seq}</b>
            <div class="tiny muted">{installment.type}</div></td
          ><td>{date(installment.due)}</td><td class="mono"
            >{money(installment.dueAmount)}</td
          ><td class="mono success">{money(paid)}</td><td class="mono warning"
            >{money(Math.max(0, installment.dueAmount - paid))}</td
          ><td><Badge status={installmentStatus(project, installment)} /></td
          ><td
            >{project.transactions.filter(
              (item: any) => item.installmentId === installment.id,
            ).length}</td
          ></tr
        >{/each}</tbody
    >
  </table>
</div>
