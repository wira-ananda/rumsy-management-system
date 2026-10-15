<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import Info from "../shared/Info.svelte";
  import Badge from "../shared/Badge.svelte";
  import { runtime } from "../../stores/runtime.js";

  import { roles } from "../../constants/catalog.js";
  import { openPasswordModal } from "../../features/system/actions";
  import { closeDialog } from "../../stores/dialog";
  let { session, onlogout }: { session: any; onlogout: () => Promise<void> } =
    $props();
</script>

<div class="grid2eq">
  <Info label="Nama" value={session.name} /><Info
    label="Email"
    value={session.email || "-"}
  /><Info label="Role" value={roles[session.role as keyof typeof roles]} /><Info
    label="Backend"
    value="Cloudflare D1 + R2"
  />
</div>
<button
  class="btn ghost"
  id="changePassword"
  style="width:100%;margin-top:14px"
  onclick={() => openPasswordModal(false)}>Ganti Password</button
><button
  class="btn ghost"
  id="switchAccount"
  style="width:100%;margin-top:8px"
  onclick={async () => {
    closeDialog();
    await onlogout();
  }}>Keluar & Ganti Akun</button
>
