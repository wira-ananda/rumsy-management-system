<script lang="ts">
  import Info from "../shared/Info.svelte";
  import Badge from "../shared/Badge.svelte";
  import FileLink from "../shared/FileLink.svelte";
  import { money, date } from "../../utils/format.js";
  let { transaction }: { transaction: any } = $props();
</script>

{#if transaction.proofFileId}<div class="notice info">
    <b>File:</b>
    {transaction.proofName}
    <div class="action-row mt">
      <FileLink
        class="btn primary"
        fileId={transaction.proofFileId}
        filename={transaction.proofName}>Lihat Bukti</FileLink
      >
      <FileLink
        class="btn ghost"
        fileId={transaction.proofFileId}
        filename={transaction.proofName}
        download>Download</FileLink
      >
    </div>
  </div>{:else}<div class="notice warn">
    <b>File:</b>
    {transaction.proofName || "Tidak ada"}<br />Bukti lama belum memiliki file
    R2. Upload ulang bila diperlukan.
  </div>{/if}
<div class="grid2eq mt">
  <Info label="Nominal" value={money(transaction.amount)} /><Info
    label="Tanggal"
    value={date(transaction.date)}
  /><Info label="Bank" value={transaction.bank || "-"} /><Info
    label="Pengirim"
    value={transaction.sender || "-"}
  /><Info label="Reference" value={transaction.reference || "-"} /><Info
    label="Status"><Badge status={transaction.status} /></Info
  >
</div>
