<script lang="ts">
  import { nav, roles } from "../../constants/catalog.js";
  import type { Session, NavigationItem } from "../../types/rms";
  let {
    session,
    activePage,
    open,
    onrefresh,
  }: {
    session: Session;
    activePage: string;
    open: boolean;
    onrefresh: () => void;
  } = $props();
  let groups = $derived.by(() => {
    const result: Record<string, NavigationItem[]> = {};
    for (const item of nav)
      if (item.roles.includes(session.role))
        (result[item.section] ??= []).push(item);
    return Object.entries(result);
  });
</script>

<aside class:open class="sidebar" id="sidebar">
  <div class="brand">
    <img src="/rms-mark.svg" alt="RMS" />
    <div>
      <b>RMS <span class="demo-pill">LIVE</span></b><small
        >Rumsy Internal System</small
      >
    </div>
  </div>
  <nav class="nav">
    {#each groups as [section, items]}
      {#if section}<div class="nav-title">{section}</div>{/if}
      {#each items as item}
        <a
          href={`#/${item.route}`}
          data-route={item.route}
          class:active={activePage === item.route}
          onclick={(event) => {
            if (item.route === "project-dashboard") {
              event.preventDefault();
              if (location.hash !== "#/project-dashboard")
                location.hash = "#/project-dashboard";
              onrefresh();
            }
          }}><span class="nav-icon">{item.icon}</span>{item.label}</a
        >
      {/each}
    {/each}
  </nav>
  <div class="role-card">
    <div class="role-inner">
      <small>Pengguna aktif</small><b id="roleText">{session.name}</b><span
        class="tiny">{roles[session.role as keyof typeof roles]}</span
      >
    </div>
  </div>
</aside>
