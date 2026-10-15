<script lang="ts">
  import { onMount } from "svelte";
  import Login from "../auth/Login.svelte";
  import LoadingScreen from "../shared/LoadingScreen.svelte";
  import Sidebar from "./Sidebar.svelte";
  import Topbar from "./Topbar.svelte";
  import DialogHost from "../shared/DialogHost.svelte";
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import { runtime } from "../../stores/runtime.js";
  import ProjectDossier from "../projects/ProjectDossier.svelte";
  import { features } from "../../features/registry";
  import { restoreSession, logout } from "../../services/auth";
  import { registerAppEvents } from "../../services/app-events.js";
  import { closeDialog } from "../../stores/dialog";
  import { openPasswordModal } from "../../features/system/actions";
  import { ensureDataShape } from "../../domain/models.js";
  import { normalizeLeadStages } from "../../domain/pipeline.js";
  import { parseRoute } from "../../routing/hash.js";
  import { nav } from "../../constants/catalog.js";
  import type { Route, Session } from "../../types/rms";

  let reactiveData = $state<any>(null);
  function prepare() {
    reactiveData = runtime.data;
    runtime.data = reactiveData;
    ensureDataShape();
  }
  let session = $state<Session | null>(null);
  let loading = $state(true);
  let current = $state<Route>({ page: "dashboard" });
  let revision = $state(0);
  let mobileOpen = $state(false);
  let renderError = $state("");
  let activePage = $derived(
    (
      {
        project: "projects",
        "lead-detail": "leads",
        "client-detail": "clients",
      } as Record<string, string>
    )[current.page] || current.page,
  );
  let blocked = $derived.by(() => {
    const item = nav.find((item) => item.route === activePage);
    return Boolean(item && session && !item.roles.includes(session.role));
  });
  function refresh() {
    try {
      normalizeLeadStages();
      current = parseRoute();
      revision += 1;
      renderError = "";
    } catch (error) {
      renderError = error instanceof Error ? error.message : String(error);
    }
  }
  function enter(user: Session, afterLogin = false) {
    prepare();
    session = user;
    refresh();
    if (afterLogin && user.mustChangePassword)
      setTimeout(() => openPasswordModal(true), 200);
  }
  async function leave() {
    await logout();
    closeDialog();
    session = null;
  }
  onMount(() => {
    let alive = true;
    const unregister = registerAppEvents({
      route: refresh,
      render: () => {
        prepare();
        refresh();
      },
      login: () => {
        session = null;
      },
    });
    window.addEventListener("hashchange", refresh);
    restoreSession().then((user) => {
      if (!alive) return;
      try {
        if (user) enter(user);
      } catch (error) {
        renderError = error instanceof Error ? error.message : String(error);
      } finally {
        loading = false;
      }
    });
    return () => {
      alive = false;
      unregister();
      closeDialog();
      window.removeEventListener("hashchange", refresh);
    };
  });
</script>

<svelte:head><title>RMS Rumsy — V5</title></svelte:head>

{#if loading}
  <LoadingScreen />
{:else if !session}
  <Login onlogin={(user) => enter(user, true)} />
{:else}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="mobile-overlay"
    class:open={mobileOpen}
    id="overlay"
    role="presentation"
    onclick={() => {
      mobileOpen = false;
    }}
  ></div>
  <div class="app">
    <Sidebar {session} {activePage} open={mobileOpen} onrefresh={refresh} />
    <main class="main">
      <Topbar
        {session}
        ontoggle={() => {
          mobileOpen = true;
        }}
        onlogout={leave}
      />
      <section class="content">
        <div class="page" id="view">
          {#if renderError}
            <div class="login">
              <h2>RMS mengalami error tampilan</h2>
              <p>{renderError}</p>
              <button onclick={() => location.reload()}>Refresh</button>
            </div>
          {:else}
            {#key revision}
              {#if blocked}<PageHeader title="Akses dibatasi" /><Card
                  title="Tidak memiliki akses"
                  ><div class="empty">
                    Role Anda tidak memiliki akses ke menu ini.
                  </div></Card
                >
              {:else if current.page === "project"}<ProjectDossier
                  route={current}
                />
              {:else}{@const Page =
                  features[current.page] || features.dashboard}<Page
                  route={current}
                />{/if}
            {/key}
          {/if}
        </div>
      </section>
    </main>
  </div>
{/if}

<DialogHost />
