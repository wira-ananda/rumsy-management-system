<script lang="ts">
  import { onMount } from "svelte";
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import Info from "../shared/Info.svelte";
  import Badge from "../shared/Badge.svelte";
  import { runtime } from "../../stores/runtime.js";
  import { apiCall } from "../../services/api.js";
  import { userForm } from "../../features/system/actions";
  let users = $state<any[]>([]),
    error = $state(""),
    loading = $state(true);
  async function load() {
    try {
      users = (await apiCall("/api/admin/users")).users;
      error = "";
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }
  onMount(() => {
    if (runtime.session!.role === "SUPER_ADMIN") void load();
  });
</script>

<PageHeader
  title="Settings"
  description="Master Data dan User Management Cloudflare."
/>
<div class="grid2">
  <Card title="Master Data"
    ><div class="stack">
      <Info
        label="Lead Sources"
        value={runtime.data!.settings.leadSources.join(", ")}
      /><Info
        label="Bank Accounts"
        value={runtime.data!.settings.banks.join(" • ")}
      /><Info
        label="Required Docs"
        value={runtime.data!.settings.requiredDocs.join(", ")}
      />
    </div></Card
  ><Card title="Pipeline Rules"
    ><div class="stack">
      {#each ["warm", "hot", "dp"] as rule}<Info
          label={rule.toUpperCase()}
          value={runtime.data!.settings.pipelineRules[rule]}
        />{/each}
    </div></Card
  >
</div>
{#if runtime.session!.role === "SUPER_ADMIN"}<div class="mt">
    <Card title="User Management"
      ><div class="notice info" style="margin-bottom:12px">
        <b>Khusus Sales Executive:</b> kolom Scope / Nama Sales harus sama dengan
        Sales PIC pada Lead. Assignment memakai daftar akun Sales aktif.
      </div>
      <button
        class="btn primary"
        id="newUser"
        onclick={() => userForm(null, load)}>＋ Buat User</button
      >
      <div id="userTable" class="mt">
        {#if error}<div class="notice warn">{error}</div>{:else if loading}<div
            class="empty"
          >
            Memuat user...
          </div>{:else}<div class="table-wrap">
            <table class="table">
              <thead
                ><tr
                  >{#each ["Nama", "Email", "Role", "Scope / Nama Sales", "Status", "Aksi"] as h}<th
                      >{h}</th
                    >{/each}</tr
                ></thead
              ><tbody
                >{#each users as u}<tr
                    ><td>{u.full_name}</td><td class="mono">{u.email}</td><td
                      ><Badge status={u.role} /></td
                    ><td>{u.scope_name || "-"}</td><td
                      ><Badge status={u.active ? "ACTIVE" : "INACTIVE"} /></td
                    ><td
                      ><button
                        class="btn ghost small editUser"
                        data-id={u.id}
                        onclick={() => userForm(u, load)}>Edit</button
                      ></td
                    ></tr
                  >{/each}</tbody
              >
            </table>
          </div>{/if}
      </div></Card
    >
  </div>{/if}
