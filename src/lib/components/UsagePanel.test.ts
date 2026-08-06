import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UsagePanel from './UsagePanel.svelte';

import type { SystemState } from '../state/engine';

const NOW = Date.parse('2026-07-16T12:02:00Z');

const provider = (system: SystemState, stale = false) => ({
  provider: 'claude' as const,
  system,
  stale,
  planType: 'pro',
  session: { usedPercent: 74, severity: 'warn' as const, resetsAt: null },
  weekly: { usedPercent: 20, severity: 'ok' as const, resetsAt: null },
  capturedAt: '2026-07-16T12:00:00Z',
  source: 'oauth_api' as const,
  isCached: false,
});

const bothProviders = (system: SystemState) => ({
  claude: provider(system),
  codex: { ...provider(system), provider: 'codex' as const, source: 'cli_rpc' },
});

describe('UsagePanel', () => {
  afterEach(cleanup);

  it('shows both provider columns at once, with per-column loading skeletons', async () => {
    const { rerender } = render(UsagePanel, {
      props: {
        providers: {
          claude: provider('loading'),
          codex: {
            ...provider('active'),
            provider: 'codex',
            source: 'cli_rpc',
          },
        },
        primary: 'claude',
        refreshing: false,
      },
    });
    // Both columns render together — a loading Claude never hides Codex.
    expect(screen.getByRole('article', { name: 'Claude usage' })).toBeTruthy();
    expect(screen.getByRole('article', { name: 'Codex usage' })).toBeTruthy();
    expect(screen.getByTestId('usage-skeleton-claude')).toBeTruthy();
    expect(screen.queryByTestId('usage-skeleton-codex')).toBeNull();
    expect(screen.getAllByTestId('usage-gauge')).toHaveLength(2);
    await rerender({
      providers: bothProviders('active'),
      primary: 'claude',
      refreshing: false,
    });
    expect(screen.queryByTestId('usage-skeleton-claude')).toBeNull();
    expect(screen.getAllByTestId('usage-gauge')).toHaveLength(4);
  });

  it('marks the primary column with a chip and sets primary from the other column only', async () => {
    const onRefresh = vi.fn();
    const onPrimary = vi.fn();
    render(UsagePanel, {
      props: {
        providers: bothProviders('active'),
        primary: 'codex',
        refreshing: false,
        nowMs: NOW,
        onRefresh,
        onPrimary,
      },
    });
    // Exactly one primary chip, and no set-primary control for that column.
    expect(screen.getByText('Primary')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Set Codex as primary' }),
    ).toBeNull();
    await fireEvent.click(
      screen.getByRole('button', { name: 'Set Claude as primary' }),
    );
    expect(onPrimary).toHaveBeenCalledWith('claude');
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('refreshes both providers through one control and disables it while refreshing', async () => {
    const onRefresh = vi.fn();
    const { rerender } = render(UsagePanel, {
      props: {
        providers: bothProviders('active'),
        primary: 'claude',
        refreshing: false,
        nowMs: NOW,
        onRefresh,
      },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    await rerender({
      providers: bothProviders('active'),
      primary: 'claude',
      refreshing: true,
      nowMs: NOW,
      onRefresh,
    });
    expect(
      (screen.getByRole('button', { name: 'Refreshing…' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('shows per-column freshness without source or cache details', () => {
    const staleCached = {
      ...provider('active', true),
      isCached: true,
    };
    const { container } = render(UsagePanel, {
      props: {
        providers: {
          claude: staleCached,
          codex: {
            ...provider('active'),
            provider: 'codex' as const,
            source: 'cli_rpc',
          },
        },
        primary: 'claude',
        refreshing: false,
        nowMs: NOW,
      },
    });

    const freshness = [
      ...container.querySelectorAll<HTMLElement>('.freshness'),
    ];
    expect(freshness).toHaveLength(2);
    expect(freshness[0]?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      '● Stale · 2 min ago',
    );
    expect(freshness[1]?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      '● Fresh · 2 min ago',
    );
    for (const entry of freshness)
      expect(entry.textContent).not.toMatch(/oauth_api|cli_rpc|cached/);
    expect(
      container.querySelector('.freshness time')?.getAttribute('datetime'),
    ).toBe('2026-07-16T12:00:00Z');
  });

  it('hides the panel through the close control and quits through the footer button', async () => {
    const onClose = vi.fn();
    const onQuit = vi.fn();
    render(UsagePanel, {
      props: {
        providers: bothProviders('active'),
        primary: 'claude',
        refreshing: false,
        nowMs: NOW,
        onClose,
        onQuit,
      },
    });

    await fireEvent.click(
      screen.getByRole('button', { name: 'Close usage panel' }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onQuit).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByRole('button', { name: 'Quit' }));
    expect(onQuit).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens settings through its callback and exposes the panel close control', async () => {
    const onSettings = vi.fn();
    render(UsagePanel, {
      props: {
        providers: bothProviders('active'),
        primary: 'claude',
        refreshing: false,
        nowMs: NOW,
        onSettings,
      },
    });

    expect(
      screen.getByRole('button', { name: 'Close usage panel' }),
    ).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(onSettings).toHaveBeenCalledTimes(1);
  });

  it('announces an available settings update with a decorative dot', () => {
    render(UsagePanel, {
      props: {
        providers: bothProviders('active'),
        primary: 'claude',
        refreshing: false,
        nowMs: NOW,
        updateAvailable: true,
      },
    });

    expect(screen.getByTestId('settings-update-dot')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Settings, update available' }),
    ).toBeTruthy();
  });

  it('keeps the update dot inside the visible settings label wrapper', () => {
    const { container } = render(UsagePanel, {
      props: {
        providers: bothProviders('active'),
        primary: 'claude',
        refreshing: false,
        nowMs: NOW,
        updateAvailable: true,
      },
    });

    const dot = screen.getByTestId('settings-update-dot');
    const label = container.querySelector('.settings-label');

    expect(label).toBeTruthy();
    expect(label?.contains(dot)).toBe(true);
  });

  it('keeps the default settings control queryable without an update dot', () => {
    render(UsagePanel, {
      props: {
        providers: bothProviders('active'),
        primary: 'claude',
        refreshing: false,
        nowMs: NOW,
      },
    });

    expect(screen.queryByTestId('settings-update-dot')).toBeNull();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
  });

  it.each([
    ['auth_required' as const, 'Sign in to the Claude CLI: claude login'],
    ['unavailable' as const, 'The Claude CLI is not installed'],
    ['error' as const, 'Could not fetch usage. Retrying shortly.'],
    ['offline' as const, 'Cannot reach the network'],
  ])(
    'shows per-column recovery guidance for %s without hiding the other column',
    (system, expected) => {
      render(UsagePanel, {
        props: {
          providers: {
            claude: provider(system),
            codex: {
              ...provider('active'),
              provider: 'codex' as const,
              source: 'cli_rpc',
            },
          },
          primary: 'claude',
          refreshing: false,
          nowMs: NOW,
        },
      });

      expect(screen.getByRole('status').textContent).toBe(expected);
      // Provider independence: the healthy column keeps its gauges.
      expect(screen.getAllByTestId('usage-gauge')).toHaveLength(2);
    },
  );

  it('renders no guidance live region while both providers are displayable', () => {
    render(UsagePanel, {
      props: {
        providers: bothProviders('active'),
        primary: 'claude',
        refreshing: false,
        nowMs: NOW,
      },
    });

    expect(screen.queryByRole('status')).toBeNull();
  });
});
