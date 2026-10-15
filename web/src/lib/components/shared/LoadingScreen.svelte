<script lang="ts">
  let {
    title = "Memuat RMS",
    description = "Sedang menyiapkan data dan ruang kerjamu.",
  }: { title?: string; description?: string } = $props();
</script>

<section class="loading-screen" aria-label={title} aria-busy="true">
  <div class="loading-panel">
    <img
      class="loading-logo"
      src="/rms-mark.svg"
      alt="Rumsy"
      width="56"
      height="56"
    />
    <div class="loading-brand">RMS RUMSY</div>
    <div role="status" aria-live="polite" aria-atomic="true">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    <div class="loading-track" aria-hidden="true"><span></span></div>
    <div class="loading-note">
      <span aria-hidden="true"></span>Mohon tunggu sebentar
    </div>
  </div>
</section>

<style>
  .loading-screen {
    min-height: 100vh;
    min-height: 100svh;
    display: grid;
    place-items: center;
    padding: 24px 16px;
    background:
      radial-gradient(ellipse at 50% 40%, #e7effa, transparent 65%),
      var(--canvas, #f6f8fb);
  }
  .loading-panel {
    width: min(100%, 400px);
    padding: 40px 32px 30px;
    border: 1px solid var(--line, #e1e7f0);
    border-radius: 24px;
    background: var(--surface, #fff);
    box-shadow: 0 16px 56px #14335c08;
    text-align: center;
  }
  .loading-logo {
    display: block;
    margin: 0 auto 18px;
    border-radius: 12px;
    box-shadow: 0 6px 16px #14335c16;
  }
  .loading-brand {
    color: var(--accent, #2b6cb5);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.16em;
  }
  h1 {
    margin: 12px 0 8px;
    color: var(--ink, #0b1f3a);
    font-size: 23px;
    font-weight: 750;
    line-height: 1.3;
  }
  p {
    max-width: 270px;
    margin: 0 auto;
    color: var(--slate, #64748b);
    font-size: 13px;
    line-height: 1.7;
    text-wrap: pretty;
  }
  .loading-track {
    height: 4px;
    margin: 28px auto 18px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--accent50, #eaf1fa);
  }
  .loading-track span {
    display: block;
    width: 36%;
    height: 100%;
    border-radius: inherit;
    background: var(--accent, #2b6cb5);
    animation: loading-progress 1.6s ease-in-out infinite;
  }
  .loading-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    color: var(--slate, #64748b);
    font-size: 11px;
  }
  .loading-note span {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent, #2b6cb5);
  }
  @keyframes loading-progress {
    from {
      transform: translateX(-110%);
    }
    to {
      transform: translateX(390%);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .loading-track span {
      animation: none;
      margin: 0 auto;
    }
  }
  @media (max-width: 480px) {
    .loading-panel {
      padding: 32px 24px 26px;
      border-radius: 20px;
    }
    h1 {
      font-size: 21px;
    }
  }
</style>
