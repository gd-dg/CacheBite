// No bundled webfonts: the UI renders in the platform's system face (SF Pro
// on macOS, Segoe UI on Windows) per the HIG, via `--font-ui` in tokens.css.
import './lib/styles/tokens.css';
import './lib/styles/global.css';
import { mount } from 'svelte';

import App from './App.svelte';
import { applyThemePreference, loadThemePreference } from './lib/state/theme';

// Apply the stored appearance before mount to avoid a flash, and re-apply when
// another window (overlay/panel share this origin) changes the preference.
const syncTheme = () =>
  applyThemePreference(
    document.documentElement,
    loadThemePreference(globalThis.localStorage),
  );
syncTheme();
window.addEventListener('storage', syncTheme);

const target = document.getElementById('app');

if (!target) {
  throw new Error('CacheBite application root was not found');
}

mount(App, { target });
