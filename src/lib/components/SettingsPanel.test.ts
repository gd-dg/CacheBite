import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SettingsPanel from './SettingsPanel.svelte';

const settings = {
  primaryProvider: 'claude',
  selectedPetId: 'tabby',
  bubblesEnabled: true,
  startAtLogin: false,
  notificationsEnabled: false,
  secondaryNotificationsEnabled: false,
} as const;

describe('SettingsPanel', () => {
  afterEach(cleanup);
  it('emits immutable setting changes', async () => {
    const onChange = vi.fn();
    const onThemeChange = vi.fn();
    render(SettingsPanel, {
      props: {
        settings,
        theme: 'system',
        pets: [
          { id: 'corgi', displayName: 'Corgi' },
          { id: 'tabby', displayName: 'Tabby' },
        ],
        onChange,
        onThemeChange,
      },
    });
    await fireEvent.change(screen.getByLabelText('화면 모드'), {
      target: { value: 'dark' },
    });
    await fireEvent.change(screen.getByLabelText('기본 제공자'), {
      target: { value: 'codex' },
    });
    await fireEvent.change(screen.getByLabelText('펫'), {
      target: { value: 'corgi' },
    });
    await fireEvent.click(screen.getByLabelText('말풍선'));
    await fireEvent.click(screen.getByLabelText('네이티브 알림'));
    await fireEvent.click(screen.getByLabelText('보조 제공자 알림'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ primaryProvider: 'codex' }),
    );
    // The pet is picked on its own; the primary provider rides along unchanged.
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedPetId: 'corgi',
        primaryProvider: 'claude',
      }),
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ bubblesEnabled: false }),
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ notificationsEnabled: true }),
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ secondaryNotificationsEnabled: true }),
    );
    expect(onThemeChange).toHaveBeenCalledWith('dark');
  });

  it('shows the fixed shortcut the way the running platform spells it', () => {
    render(SettingsPanel, {
      props: {
        settings,
        pets: [{ id: 'tabby', displayName: 'Tabby' }],
        hideShowHotkeyLabel: 'Cmd+Shift+H',
      },
    });

    expect(screen.getByLabelText('펫 숨기기/표시 단축키').textContent).toBe(
      'Cmd+Shift+H',
    );
    // The two sentences sit on their own lines, split by a <br>, so match each
    // against the paragraph rather than expecting one exact text node.
    expect(
      screen.queryByText(/펫을 숨기거나 다시 표시합니다\./),
    ).not.toBeNull();
    expect(screen.queryByText(/숨겨진 동안에도 사용량은 계속/)).not.toBeNull();
    // Guards the regression this screen exists to prevent: an editable field
    // here is what let one failed registration persist as "no shortcut active".
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('explains how to recover when another app owns the shortcut', () => {
    const conflictMessage =
      '다른 앱이 이 단축키를 사용 중입니다. 해당 앱을 종료한 뒤 CacheBite를 다시 실행하세요.';
    const { unmount } = render(SettingsPanel, {
      props: {
        settings,
        pets: [{ id: 'tabby', displayName: 'Tabby' }],
        hideShowHotkeyAvailable: false,
      },
    });

    expect(screen.queryByText(conflictMessage)).not.toBeNull();

    unmount();
    render(SettingsPanel, {
      props: {
        settings,
        pets: [{ id: 'tabby', displayName: 'Tabby' }],
        hideShowHotkeyAvailable: true,
      },
    });

    expect(screen.queryByText(conflictMessage)).toBeNull();
  });
});
