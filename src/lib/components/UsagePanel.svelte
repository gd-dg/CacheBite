<script>
  import UsageGauge from './UsageGauge.svelte';
  import { capturedAgo } from '../format/time.js';
  import { systemGuidance } from './systemGuidance.js';
  /** @typedef {import('./panelModels').PanelProviderModel} PanelProvider */
  /** @typedef {import('../contracts/domain').Provider} Provider */
  /** @type {{ providers: { claude: PanelProvider; codex: PanelProvider }; primary: Provider; refreshing: boolean; nowMs?: number; updateAvailable?: boolean; onRefresh?: () => void; onPrimary?: (provider: Provider) => void; onSettings?: () => void; onClose?: () => void; onQuit?: () => void }} */
  let {
    providers,
    primary,
    refreshing,
    nowMs = Date.now(),
    updateAvailable = false,
    onRefresh = () => {},
    onPrimary = () => {},
    onSettings = () => {},
    onClose = () => {},
    onQuit = () => {},
  } = $props();

  /** Column order is fixed — the primary marker moves, the columns do not. */
  const PROVIDERS = /** @type {const} */ (['claude', 'codex']);
  /** @param {Provider} provider */
  const displayName = (provider) =>
    provider === 'claude' ? 'Claude' : 'Codex';
  /** @param {PanelProvider} model */
  const freshness = (model) => {
    if (model.capturedAt === null) return null;
    const ago = capturedAgo(model.capturedAt, nowMs);
    return ago === null ? null : { capturedAt: model.capturedAt, ago };
  };
</script>

<section class="usage-panel" aria-label="Usage panel">
  <button
    class="close-panel"
    type="button"
    aria-label="Close usage panel"
    title="Close usage panel"
    onclick={() => onClose()}>×</button
  >
  <header>
    <h2 class="panel-title">Usage</h2>
  </header>
  <div class="columns">
    {#each PROVIDERS as provider (provider)}
      {@const model = providers[provider]}
      {@const captured = freshness(model)}
      {@const guidance = systemGuidance(model.system, provider)}
      <article
        class="provider-column"
        aria-label={`${displayName(provider)} usage`}
      >
        <div class="provider-heading">
          <span class="provider-name">{displayName(provider)}</span>
          {#if primary === provider}
            <span class="primary-chip">Primary</span>
          {:else}
            <button
              class="make-primary"
              type="button"
              aria-label={`Set ${displayName(provider)} as primary`}
              title={`Set ${displayName(provider)} as primary`}
              onclick={() => onPrimary(provider)}>Set primary</button
            >
          {/if}
        </div>
        {#if model.planType}
          <span class="plan-chip">{model.planType}</span>
        {/if}
        {#if model.system === 'loading'}
          <div
            class="skeleton"
            data-testid={`usage-skeleton-${provider}`}
            aria-label={`Loading ${displayName(provider)} usage`}
          >
            Loading…
          </div>
        {:else if model.system === 'active'}
          <div class="gauges">
            <UsageGauge
              label="5-hour"
              window={model.session}
              stale={model.stale}
              {nowMs}
            />
            <UsageGauge
              label="Weekly"
              window={model.weekly}
              stale={model.stale}
              {nowMs}
            />
          </div>
          <small class:stale={model.stale} class="freshness"
            >● {model.stale ? 'Stale' : 'Fresh'}{#if captured}<span
                >&nbsp;· <time datetime={captured.capturedAt}
                  >{captured.ago}</time
                ></span
              >{/if}</small
          >
        {:else}
          <!-- One quiet block per column: a signed-out Codex must not dim or
               reflow the Claude column beside it (provider independence). -->
          <p class="column-guidance" role="status">{guidance ?? ''}</p>
        {/if}
      </article>
    {/each}
  </div>
  <footer>
    <button
      class="primary-action"
      disabled={refreshing}
      onclick={() => onRefresh()}
      >{refreshing ? 'Refreshing…' : 'Refresh'}</button
    >
    <div class="footer-row">
      <button
        class="ghost-action settings-action"
        type="button"
        aria-label={updateAvailable ? 'Settings, update available' : undefined}
        onclick={() => onSettings()}
      >
        <span class="settings-label">
          Settings
          {#if updateAvailable}
            <span
              class="settings-update-dot"
              data-testid="settings-update-dot"
              aria-hidden="true"
            ></span>
          {/if}
        </span>
      </button>
      <button class="ghost-action quit" onclick={() => onQuit()}>Quit</button>
    </div>
  </footer>
</section>

<style>
  .usage-panel {
    position: relative;
    width: 100%;
    color: var(--color-text);
  }
  /* Out of flow on purpose: the close control layers over the header instead of
     reserving a column, so adding it leaves every existing box — and the height
     the ResizeObserver reports to `resize_panel` — untouched. */
  .close-panel {
    position: absolute;
    z-index: 2;
    top: 0.5rem;
    right: 0.5rem;
    display: grid;
    width: 1.5rem;
    height: 1.5rem;
    min-height: 0;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: var(--color-surface-sunken);
    color: var(--color-text-muted);
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1;
    transition:
      background-color var(--duration-fast) var(--ease-out),
      color var(--duration-fast) var(--ease-out);
  }
  .close-panel:hover,
  .close-panel:focus-visible {
    background: var(--color-border);
    color: var(--color-text);
  }
  header {
    padding: var(--space-4) var(--space-4) 0;
  }
  .panel-title {
    margin: 0;
    font-size: 1.0625rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  /* Two always-visible provider columns split by a hairline, in the platform
     grouped-content idiom — no tabs, nothing to switch. */
  .columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: var(--space-3) 0 var(--space-4);
  }
  .provider-column {
    display: grid;
    min-width: 0;
    align-content: start;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-4) 0;
  }
  .provider-column + .provider-column {
    border-left: 1px solid var(--color-border);
  }
  .provider-heading {
    display: flex;
    min-height: 1.5rem;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }
  .provider-name {
    font-size: 0.9375rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  /* The primary marker reads as a state, the non-primary as an action: a tinted
     chip you cannot press versus a bordered chip you can. */
  .primary-chip,
  .make-primary {
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    font-size: 0.6875rem;
    font-weight: 600;
    white-space: nowrap;
  }
  .primary-chip {
    background: color-mix(in srgb, var(--color-accent) 14%, transparent);
    color: var(--color-accent);
  }
  .make-primary {
    min-height: 0;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition:
      color var(--duration-fast) var(--ease-out),
      border-color var(--duration-fast) var(--ease-out);
  }
  .make-primary:hover,
  .make-primary:focus-visible {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
  .plan-chip {
    justify-self: start;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    background: var(--color-surface-sunken);
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    text-transform: capitalize;
  }
  .gauges {
    display: grid;
    gap: var(--space-3);
    margin-top: var(--space-1);
  }
  .freshness {
    overflow: hidden;
    margin-top: var(--space-1);
    color: var(--sev-ok);
    font-size: 0.6875rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .freshness.stale {
    color: var(--color-text-faint);
  }
  .skeleton {
    padding: 1.5rem 0;
    color: var(--color-text-muted);
    font-size: 0.8125rem;
    text-align: center;
  }
  .column-guidance {
    margin: var(--space-1) 0 0;
    color: var(--color-text-muted);
    font-size: 0.75rem;
    line-height: 1.45;
  }
  footer {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4) 0.875rem;
    border-top: 1px solid var(--color-border);
  }
  .footer-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }
  button {
    min-height: 2.25rem;
    border-radius: 0.625rem;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  button:disabled {
    cursor: default;
    opacity: 0.45;
  }
  /* One prominent filled action per view; everything else stays quiet. */
  .primary-action {
    border: 0;
    background: var(--color-accent);
    color: #ffffff;
    transition:
      opacity var(--duration-fast) var(--ease-out),
      transform var(--duration-fast) var(--ease-out);
  }
  .primary-action:not(:disabled):hover,
  .primary-action:focus-visible {
    opacity: 0.9;
  }
  .primary-action:not(:disabled):active {
    transform: scale(0.98);
  }
  .ghost-action {
    min-height: 1.875rem;
    border: 1px solid transparent;
    background: transparent;
    color: var(--color-text-muted);
    font-weight: 500;
    transition: color var(--duration-fast) var(--ease-out);
  }
  .settings-action {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .settings-label {
    position: relative;
    display: inline-flex;
    align-items: center;
  }
  .settings-update-dot {
    position: absolute;
    top: 0.15rem;
    right: -0.6rem;
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 999px;
    background: var(--sev-exhausted);
    pointer-events: none;
  }
  .ghost-action:hover,
  .ghost-action:focus-visible {
    color: var(--color-text);
  }
  .ghost-action.quit:hover,
  .ghost-action.quit:focus-visible {
    color: var(--sev-exhausted);
  }
  @media (prefers-reduced-motion: reduce) {
    .close-panel,
    .make-primary,
    .primary-action,
    .ghost-action {
      transition: none;
    }
    .primary-action:not(:disabled):active {
      transform: none;
    }
  }
</style>
