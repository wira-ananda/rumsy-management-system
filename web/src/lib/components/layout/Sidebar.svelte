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
    <img
      class="brand-mark"
      src="/rumsy-mark.svg"
      alt="Rumsy Indonesia"
      width="32"
      height="36"
    />
    <div class="brand-copy">
      <div class="brand-heading">
        <b>RMS</b><span class="brand-live">LIVE</span>
      </div>
      <small>Rumsy Internal System</small>
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

<style>
  .brand {
    gap: 14px;
    min-height: 88px;
    padding: 20px 24px;
    flex-shrink: 0;
  }
  .brand .brand-mark {
    width: 32px;
    height: 36px;
    flex: 0 0 32px;
    object-fit: contain;
  }
  .brand-copy {
    min-width: 0;
  }
  .brand-heading {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .brand b {
    font-size: 18px;
    line-height: 1.2;
    letter-spacing: 0.06em;
  }
  .brand-live {
    padding: 3px 7px;
    border: 1px solid #ffffff12;
    border-radius: 6px;
    background: #ffffff16;
    color: #edf4ff;
    font-size: 9px;
    font-weight: 750;
    line-height: 1;
    letter-spacing: 0.12em;
  }
  .brand small {
    margin-top: 5px;
    color: #bdcce0;
    font-size: 11px;
    line-height: 1.4;
    white-space: nowrap;
  }
</style>
