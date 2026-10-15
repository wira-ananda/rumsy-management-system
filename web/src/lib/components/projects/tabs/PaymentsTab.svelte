<script lang="ts">
  import Badge from "../../shared/Badge.svelte";
  import { runtime } from "../../../stores/runtime.js";
  import {
    paymentForm,
    proofDialog,
    verifyPayment,
    rejectPayment,
    reversalForm,
  } from "../../../features/projects/payments";
  import { date, money } from "../../../utils/format.js";
  let { project }: { project: any } = $props();
  let canVerify = $derived(
    ["HOLDING_FINANCE", "SUPER_ADMIN"].includes(runtime.session!.role),
  );
  let canUpload = $derived(
    [
      "MANAGER_SALES",
      "ADMIN_GENERAL",
      "SALES_EXECUTIVE",
      "ADMIN_CRM",
      "HOLDING_FINANCE",
      "SUPER_ADMIN",
      "HEAD_BU",
    ].includes(runtime.session!.role),
  );
</script>

<div class="split" style="margin-bottom:14px">
  <div>
    <h3>Transaction Ledger</h3>
    <div class="small muted">
      Setiap DP/cicilan/adendum/pelunasan wajib memiliki bukti. Pending tidak
      dihitung Paid.
    </div>
  </div>
  {#if canUpload}<button
      class="btn primary"
      id="uploadPay"
      onclick={() => paymentForm(project)}>＋ Upload Pembayaran</button
    >{/if}
</div>
<div class="table-wrap">
  <table class="table">
    <thead
      ><tr
        >{#each ["ID", "Tanggal", "Jenis", "Nominal", "Bank/Pengirim", "Bukti", "Status", "Verified", "Aksi"] as label}<th
            >{label}</th
          >{/each}</tr
      ></thead
    ><tbody
      >{#each project.transactions as transaction}<tr
          ><td class="mono">{transaction.id}</td><td
            >{date(transaction.date)}</td
          ><td>{transaction.label}</td><td class="mono"
            ><b>{money(transaction.amount)}</b></td
          ><td
            >{transaction.bank || "-"}
            <div class="tiny muted">{transaction.sender || "-"}</div></td
          ><td
            ><button
              class="btn ghost small proofBtn"
              onclick={() => proofDialog(transaction)}
              >{transaction.proofName ? "Lihat Bukti" : "Tidak ada"}</button
            ></td
          ><td><Badge status={transaction.status} /></td><td class="tiny"
            >{transaction.verifiedBy || "-"}<br />{transaction.verifiedAt ||
              ""}</td
          ><td
            >{#if canVerify && transaction.status === "PENDING_VERIFICATION"}<button
                class="btn primary small verifyPay"
                onclick={() => verifyPayment(project, transaction)}
                >Verify</button
              >
              <button
                class="btn ghost small rejectPay"
                onclick={() => rejectPayment(project, transaction)}
                >Reject</button
              >{:else if canVerify && transaction.status === "VERIFIED"}<button
                class="btn ghost small reversePay"
                onclick={() => reversalForm(project, transaction)}
                >Reversal</button
              >{:else}-{/if}</td
          ></tr
        >{/each}</tbody
    >
  </table>
</div>
