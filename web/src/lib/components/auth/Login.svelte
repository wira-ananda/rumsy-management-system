<script lang="ts">
  import { authenticate } from "../../services/auth";
  import type { Session } from "../../types/rms";
  let { onlogin }: { onlogin: (session: Session) => void } = $props();
  let email = $state("");
  let password = $state("");
  let submitting = $state(false);
  let error = $state("");
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    error = "";
    submitting = true;
    try {
      onlogin(await authenticate(email, password));
    } catch (reason) {
      error = reason instanceof Error ? reason.message : "Login gagal.";
    } finally {
      submitting = false;
    }
  }
</script>

<div class="login">
  <div class="login-left">
    <div class="login-brand">
      <img src="/rms-mark.svg" alt="Rumsy" />
      <div><b>RUMSY</b><small>INTERNAL MANAGEMENT SYSTEM</small></div>
    </div>
    <div class="login-copy">
      <div class="tag">PRODUCTION • CLOUDFLARE</div>
      <h1>Masuk ke RMS.</h1>
      <p>
        Sistem internal Rumsy menggunakan Cloudflare Workers, D1 Database dan
        private R2 Storage.
      </p>
    </div>
    <div class="login-foot">Data tersimpan terpusat di Cloudflare</div>
  </div>
  <div class="login-right">
    <div class="login-card">
      <span class="badge info">RMS PRODUCTION</span>
      <h2>Login RMS</h2>
      <p>Masukkan akun internal yang dibuat oleh Super Admin.</p>
      <form id="loginForm" onsubmit={submit}>
        <label class="field"
          ><span>EMAIL</span><input
            class="input"
            id="loginEmail"
            type="email"
            autocomplete="username"
            bind:value={email}
            required
          /></label
        >
        <label class="field"
          ><span>PASSWORD</span><input
            class="input"
            id="loginPassword"
            type="password"
            autocomplete="current-password"
            bind:value={password}
            required
          /></label
        >
        <button
          class="btn primary"
          style="width:100%;padding:12px"
          disabled={submitting}
          >{submitting ? "Memproses..." : "Masuk →"}</button
        >
        <div id="loginError" class="login-error" role="alert">{error}</div>
      </form>
    </div>
  </div>
</div>
