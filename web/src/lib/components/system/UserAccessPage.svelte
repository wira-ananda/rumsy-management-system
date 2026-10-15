<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import Info from "../shared/Info.svelte";
  import Badge from "../shared/Badge.svelte";
  import { runtime } from "../../stores/runtime.js";

  import { roles } from "../../constants/catalog.js";
  import { showDialog } from "../../stores/dialog";
  import AccessDialog from "./AccessDialog.svelte";
</script>

<PageHeader
  title="User Access"
  description="Tambah atau kurangi akses tanpa mengubah role utama."
/>
<div class="stack">
  {#each (runtime.userDirectory || []).filter((u: any) => u.id) as u}<div
      class="approval-card"
    >
      <b>{u.name || u.email || "-"}</b>
      <div class="small muted">
        Role: {roles[u.role as keyof typeof roles] || u.role || "-"}
      </div>
      <div class="small muted">{u.email || ""}</div>
      <button
        class="btn primary small manageAccess"
        data-id={u.id}
        onclick={() =>
          showDialog("Akses " + (u.name || ""), AccessDialog, { user: u })}
        >Kelola Akses</button
      >
    </div>{:else}<div class="empty">Belum ada data user.</div>{/each}
</div>
