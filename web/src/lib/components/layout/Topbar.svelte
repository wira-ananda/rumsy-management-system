<script lang="ts">
  import { roles } from "../../constants/catalog.js";
  import SearchDialog from "../management/SearchDialog.svelte";
  import AccountDialog from "../system/AccountDialog.svelte";
  import { showDialog } from "../../stores/dialog";
  import type { Session } from "../../types/rms";
  let {
    session,
    ontoggle,
    onlogout,
  }: { session: Session; ontoggle: () => void; onlogout: () => Promise<void> } =
    $props();
  let query = $state("");
  function account() {
    showDialog("Akun Aktif", AccountDialog, { session, onlogout });
  }
  function globalSearch(query: string) {
    showDialog("Global Search", SearchDialog, { query });
  }
</script>

<header class="topbar">
  <button
    class="hamb icon-btn"
    id="hamb"
    aria-label="Buka navigasi"
    onclick={ontoggle}>☰</button
  >
  <div class="search">
    ⌕ <input
      id="globalSearch"
      placeholder="Cari client / project / transaksi..."
      bind:value={query}
      onkeydown={(event) => {
        if (event.key === "Enter" && query.trim()) globalSearch(query.trim());
      }}
    />
  </div>
  <div class="spacer"></div>
  <button class="user-chip" id="userMenu" onclick={account}
    ><b>{session.name}</b><small
      >{roles[session.role as keyof typeof roles]}</small
    ></button
  >
  <button
    class="icon-btn"
    id="notifBtn"
    aria-label="Notifikasi"
    onclick={() => {
      location.hash = "#/notifications";
    }}>♢<span class="dot"></span></button
  >
  <button class="icon-btn" id="logout" title="Keluar" onclick={onlogout}
    >⇥</button
  >
</header>
