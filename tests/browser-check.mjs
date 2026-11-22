/*
 * Browser smoke check — drives a real Chrome over CDP.
 *
 * Playwright is not installed here, and a headless Chromium download would be
 * a large, network-dependent step. Chrome is already on the machine, so we
 * speak CDP directly: launch headless, navigate to the showcase, run a script
 * in the page that exercises the components, and capture screenshots.
 *
 * The probe navigates the way a user does — sidebar to a page, tablist to a
 * sub-page — so it also proves that navigation switches pages instead of
 * scrolling, and that hidden surfaces are not being clicked by accident.
 *
 *   node tests/browser-check.mjs [url]
 *
 * Exit code 0 = every assertion passed.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, mkdir, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const URL_UNDER_TEST = process.argv[2] ?? 'http://127.0.0.1:4173/';
const PORT = Number(process.env.CDP_PORT ?? 9333);

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

async function findBrowser() {
  for (const candidate of CHROME_CANDIDATES) {
    try { await access(candidate); return candidate; } catch { /* keep looking */ }
  }
  return null;
}

class Cdp {
  #ws;
  #seq = 0;
  #pending = new Map();
  #listeners = new Map();

  constructor(ws) {
    this.#ws = ws;
    ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id != null) {
        const slot = this.#pending.get(message.id);
        if (!slot) return;
        this.#pending.delete(message.id);
        message.error ? slot.reject(new Error(`${message.error.message} (${message.error.code})`)) : slot.resolve(message.result);
        return;
      }
      for (const handler of this.#listeners.get(message.method) ?? []) handler(message.params);
    });
  }

  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', () => reject(new Error(`CDP socket failed: ${url}`)), { once: true });
    });
    return new Cdp(ws);
  }

  send(method, params = {}) {
    const id = ++this.#seq;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, handler) {
    if (!this.#listeners.has(method)) this.#listeners.set(method, []);
    this.#listeners.get(method).push(handler);
  }

  close() { this.#ws.close(); }
}

async function waitForJson(url, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error(`timed out waiting for ${url}`);
}

// Runs inside the page. One round trip, one result object.
async function probeInPage() {
  const results = {};
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const fail = message => { results.failure = message; };

  // An unloaded or error page has no app root. Say so plainly instead of
  // throwing a null dereference thirty lines later.
  if (!document.querySelector('#sideNav')) {
    results.failure = 'showcase page did not load — is the server running?';
    return results;
  }

  const showPage = async name => {
    document.querySelector(`#sideNav [data-view="${name}"]`)?.click();
    await wait(70);
  };
  const showTab = async id => {
    document.querySelector(`#${id}`)?.click();
    await wait(70);
  };

  const style = document.querySelector('link[href="/core/index.css"]');
  results.cssLinkPresent = Boolean(style);
  results.cssTokensResolved = getComputedStyle(document.documentElement).getPropertyValue('--ui-accent').trim().length > 0;

  /* ── navigation: sidebar switches pages ─────────────────────────────── */
  const foundations = document.querySelector('#view-foundations');
  const components = document.querySelector('#view-components');
  results.startsOnFirstPage = foundations.hidden === false && components.hidden === true;

  await showPage('components');
  results.sidebarSwitchesPage = components.hidden === false && foundations.hidden === true;
  results.sidebarMarksCurrent = document.querySelector('#sideNav [data-view="components"]')?.getAttribute('aria-current') === 'page';
  results.pageTitleFollowsNav = document.querySelector('#pageTitle')?.textContent === 'Components';
  results.sidebarDoesNotScroll = window.scrollY === 0;

  /* ── sub-tabs inside the page ────────────────────────────────────────── */
  const controlsPanel = document.querySelector('#cpanel-controls');
  const formsPanel = document.querySelector('#cpanel-forms');
  results.subTabStartsOnFirst = controlsPanel.hidden === false && formsPanel.hidden === true;

  // The sliding thumb: one element, recreated nowhere, whose transform moves
  // with the selection. Reading offsetLeft rather than computed transform
  // keeps this independent of whether the animation has finished.
  const tabStrip = document.querySelector('#componentTabs');
  const thumbNode = tabStrip?.querySelector(':scope > .ui-thumb');
  results.thumbExists = Boolean(thumbNode);
  if (thumbNode) {
    const before = thumbNode.style.transform;
    await showTab('ctab-forms');
    await wait(420);                       // the glide is 280ms
    const selected = tabStrip.querySelector('[role="tab"][aria-selected="true"]');
    results.thumbMovesWithSelection = thumbNode.style.transform !== before;
    results.thumbTracksSelected = selected?.id === 'ctab-forms'
      && Math.abs(parseFloat(thumbNode.style.width) - selected.offsetWidth) < 1;
  } else {
    await showTab('ctab-forms');
  }
  results.subTabSwitchesPanel = formsPanel.hidden === false && controlsPanel.hidden === true;

  // The sidebar's secondary list mirrors the tab state.
  results.subnavVisibleOnItsPage = document.querySelector('#componentSubnav')?.hidden === false;
  results.subnavFollowsTab = document.querySelector('#componentSubnav [data-subtab="ctab-forms"]')?.getAttribute('aria-current') === 'page';

  /* ── navigation mode: tabs vs scroll ──────────────────────────────────── */
  const tablistNode = document.querySelector('#componentTabs');
  const sectionNavNode = document.querySelector('#componentSections');
  const panels = () => [...document.querySelectorAll('#view-components > .ui-tabpanel')];
  const visiblePanels = () => panels().filter(panel => !panel.hidden).length;

  results.tabsModeIsDefault = tablistNode.hidden === false
    && sectionNavNode.hidden === true
    && visiblePanels() === 1;

  document.querySelector('#navMode [data-value="scroll"]').click();
  await wait(120);
  results.scrollModeShowsEverySection = sectionNavNode.hidden === false
    && tablistNode.hidden === true
    && visiblePanels() === panels().length;
  // The scroll nav reports position with aria-current=location, never
  // aria-selected: several sections are on screen at once.
  results.scrollNavUsesLocation = (() => {
    const item = sectionNavNode.querySelector('[data-section-target]');
    return item.getAttribute('aria-current') === 'location'
      && !sectionNavNode.querySelector('[role="tab"]');
  })();

  // Clicking a section must actually move the page. A click handler bound to
  // the view container itself re-runs navigation and snaps back to the top, so
  // asserting aria-current alone would miss it — scroll position is the check.
  document.querySelector('#navMode [data-value="scroll"]').click();
  await wait(140);
  const scrollBefore = Math.round(window.scrollY);
  sectionNavNode.querySelector('[data-section-target="cpanel-forms"]').click();
  await wait(500);
  results.sectionNavClickScrolls = Math.round(window.scrollY) > scrollBefore + 100;
  results.sectionNavMarksTarget = sectionNavNode
    .querySelector('[data-section-target="cpanel-forms"]')
    ?.getAttribute('aria-current') === 'location';

  // Scroll-spy: moving the page by hand updates the marker.
  window.scrollTo(0, 0);
  await wait(120);
  window.scrollTo(0, document.getElementById('cpanel-overlays').offsetTop - 40);
  await wait(320);
  results.sectionNavFollowsScroll = sectionNavNode
    .querySelector('[data-section-target="cpanel-overlays"]')
    ?.getAttribute('aria-current') === 'location';
  window.scrollTo(0, 0);
  await wait(120);

  document.querySelector('#navMode [data-value="tabs"]').click();
  await wait(120);
  results.backToTabsRestoresOnePanel = tablistNode.hidden === false
    && sectionNavNode.hidden === true
    && visiblePanels() === 1;

  /* ── forms sub-page ─────────────────────────────────────────────────── */
  const radios = [...document.querySelectorAll('#demoRadios input[type="radio"]')];
  if (radios.length) {
    const compact = radios.find(input => input.value === 'compact');
    compact.click();
    await wait(40);
    results.radioSelects = compact.checked === true && radios.filter(i => i !== compact).every(i => i.checked === false);
    results.radioDisabledInert = radios.find(i => i.disabled)?.checked === false;
  }

  const slider = document.querySelector('#demoSlider');
  if (slider) {
    slider.value = '72';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(40);
    results.sliderMirrorsValue = document.querySelector('#sliderValue')?.textContent === '72%';
    results.sliderAriaValueText = slider.getAttribute('aria-valuetext') === '72%';
    // The filled track is drawn from this variable; setting it without a rule
    // that consumes it leaves a flat, uninformative track.
    results.sliderFillPublished = slider.style.getPropertyValue('--ui-range-fill').trim() === '72%';
  }

  results.selectPresent = document.querySelector('#demoSelect')?.classList.contains('ui-select') === true;
  results.textareaPresent = document.querySelector('#demoTextarea')?.classList.contains('ui-textarea') === true;

  const chip = document.querySelector('.ui-chip--action[aria-pressed="false"]');
  if (chip) {
    chip.click();
    await wait(30);
    results.chipToggles = chip.getAttribute('aria-pressed') === 'true';
    chip.click();
  }

  const copyButton = document.querySelector('#copyButton');
  if (copyButton) {
    results.copyButtonWired = await new Promise(resolve => {
      const timer = setTimeout(() => resolve(false), 1200);
      copyButton.addEventListener('ui-copy', () => { clearTimeout(timer); resolve(true); }, { once: true });
      copyButton.click();
    });
    await wait(60);
    results.copyShowsState = copyButton.hasAttribute('data-copied');
  }

  /* ── controls sub-page ──────────────────────────────────────────────── */
  await showTab('ctab-controls');

  const all = document.querySelector('#checkAll');
  const items = [...document.querySelectorAll('#checkGroup .check-item')];
  if (!all || items.length === 0) fail('checkbox group missing');
  else {
    all.click();
    await wait(40);
    results.selectAllChecksEnabled = items.filter(i => !i.disabled).every(i => i.checked);
    const firstEnabled = items.find(i => !i.disabled);
    firstEnabled.click();
    await wait(40);
    results.uncheckingOneMakesMixed = all.indeterminate === true;
    results.selectAllClearsWhenAllOff = (() => {
      items.filter(i => !i.disabled).forEach(i => { i.checked = false; i.dispatchEvent(new Event('change', { bubbles: true })); });
      return all.checked === false && all.indeterminate === false;
    })();
  }

  const tabB = document.querySelector('#tab-b');
  const panelA = document.querySelector('#panel-a');
  const panelB = document.querySelector('#panel-b');
  if (!tabB || !panelA || !panelB) fail('demo tabs missing');
  else {
    results.tabSwitchesPanel = (() => {
      tabB.click();
      return panelA.hidden === true && panelB.hidden === false && tabB.getAttribute('aria-selected') === 'true';
    })();
  }

  /* ── overlays sub-page ──────────────────────────────────────────────── */
  await showTab('ctab-overlays');

  const input = document.querySelector('#commandInput');
  if (input) {
    input.value = 'delete';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(60);
    const visible = [...document.querySelectorAll('#commandList [role="option"]')].filter(o => !o.hidden);
    results.commandFilterNarrowsToOne = visible.length === 1 && visible[0].dataset.value === 'delete';
    input.value = 'zzzz';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(40);
    results.commandEmptyStateShown = document.querySelector('#commandEmpty')?.hidden === false;
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const disclosure = document.querySelector('#disc-1');
  const disclosurePanel = document.querySelector('#disc-panel-1');
  if (disclosure && disclosurePanel) {
    disclosure.click();
    await wait(40);
    results.disclosureOpens = disclosure.getAttribute('aria-expanded') === 'true' && disclosurePanel.hidden === false;
    disclosure.click();
  }

  const menu = document.querySelector('#demoMenu');
  if (menu) {
    const checkbox = menu.querySelector('[role="menuitemcheckbox"]');
    const wasChecked = checkbox.getAttribute('aria-checked') === 'true';
    checkbox.click();
    await wait(30);
    results.menuCheckboxToggles = (checkbox.getAttribute('aria-checked') === 'true') !== wasChecked;

    const menuRadios = [...menu.querySelectorAll('[role="menuitemradio"]')];
    const off = menuRadios.find(item => item.getAttribute('aria-checked') === 'false');
    if (off) {
      off.click();
      await wait(30);
      results.menuRadioExclusive = off.getAttribute('aria-checked') === 'true'
        && menuRadios.filter(item => item !== off).every(item => item.getAttribute('aria-checked') === 'false');
    }

    const disabled = menu.querySelector('[aria-disabled="true"]');
    const before = disabled.getAttribute('aria-checked');
    disabled.click();
    await wait(30);
    results.menuDisabledInert = disabled.getAttribute('aria-checked') === before;
  }

  const popoverTrigger = document.querySelector('#popoverButton');
  const popover = document.querySelector('#popover');
  if (popoverTrigger && popover) {
    popoverTrigger.click();
    await wait(80);
    results.popoverOpens = popover.hidden === false && popoverTrigger.getAttribute('aria-expanded') === 'true';
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await wait(60);
    results.popoverClosesOnEscape = popover.hidden === true;
  }

  const sheetButton = document.querySelector('#sheetButton');
  const sheet = document.querySelector('#demoSheet');
  if (sheetButton && sheet) {
    sheetButton.click();
    await wait(120);
    results.sheetOpensModal = sheet.open === true;
    sheet.querySelector('[data-ui-sheet-close]').click();
    await wait(80);
    results.sheetCloses = sheet.open === false;
    results.sheetNotVisibleWhenClosed = getComputedStyle(sheet).display === 'none';
  }

  /* ── composition sub-page ───────────────────────────────────────────── */
  await showTab('ctab-composition');

  results.sparklineDrawn = (document.querySelector('#sparkline')?.querySelectorAll('path').length ?? 0) >= 2;

  const resizer = document.querySelector('#resizer');
  const pane = document.querySelector('#resizeTarget');
  if (resizer && pane) {
    const before = pane.getBoundingClientRect().width;
    resizer.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await wait(50);
    results.resizerKeyboard = pane.getBoundingClientRect().width > before;
    results.resizerAria = resizer.getAttribute('role') === 'separator' && resizer.getAttribute('aria-orientation') === 'vertical';
  }

  const arm = document.querySelector('#armButton');
  if (arm) {
    let confirmed = false;
    arm.addEventListener('ui-confirm', () => { confirmed = true; }, { once: true });
    arm.click();
    await wait(40);
    results.armFirstClickDoesNotConfirm = arm.dataset.armed === 'true' && confirmed === false;
    // The label is wrapped in a span; a textContent swap would destroy it and
    // any listener on it, so the disarm has to restore the original nodes.
    arm.click();
    await wait(40);
    results.armSecondClickConfirms = confirmed === true && arm.dataset.armed === undefined;
    results.armRestoresChildNodes = arm.querySelector('[data-arm-label]') !== null;
  }

  // Roving tabindex: exactly one menu entry is reachable by Tab.
  const menuRoot = document.querySelector('#demoMenu');
  if (menuRoot) {
    const tabbable = [...menuRoot.querySelectorAll('[role^="menuitem"]')].filter(item => item.tabIndex === 0);
    results.menuRovingTabindex = tabbable.length === 1;
  }

  const dragList = document.querySelector('#dragList');
  if (dragList) {
    const orderBefore = [...dragList.querySelectorAll('[data-drag-item]')].map(i => i.dataset.dragItem);
    dragList.querySelector('[data-drag-item]:last-child').insertAdjacentElement('afterend', dragList.querySelector('[data-drag-item]'));
    const orderAfter = [...dragList.querySelectorAll('[data-drag-item]')].map(i => i.dataset.dragItem);
    results.dragListReordered = orderBefore[0] !== orderAfter[0];
  }

  document.querySelector('#stackToastButton')?.click();
  await wait(80);
  results.toastStackQueues = document.querySelectorAll('.ui-toast-stack .ui-toast').length >= 2;

  /* ── panel page ─────────────────────────────────────────────────────── */
  await showPage('panel');
  const panel = document.querySelector('.ui-panel');
  results.panelRenders = panel !== null && panel.getBoundingClientRect().width > 0;

  /* ── behavior page ──────────────────────────────────────────────────── */
  await showPage('behavior');
  const confirmTrigger = document.querySelector('#confirmButton');
  const confirmDialog = document.querySelector('#confirmDialog');
  if (confirmTrigger && confirmDialog) {
    confirmTrigger.focus();
    confirmTrigger.click();
    await wait(120);
    results.dialogOpens = confirmDialog.open === true;
    results.dialogFocusesCancel = document.activeElement?.id === 'confirmCancel';
    // A native <dialog> does not associate its heading; without these the
    // screen reader announces an unnamed dialog.
    results.dialogHasAccessibleName = (() => {
      const labelId = confirmDialog.getAttribute('aria-labelledby');
      return Boolean(labelId && document.getElementById(labelId)?.textContent.trim());
    })();
    results.dialogHasDescription = Boolean(confirmDialog.getAttribute('aria-describedby'));
    results.confirmDialogIsAlertRole = confirmDialog.getAttribute('role') === 'alertdialog';
    confirmDialog.querySelector('[data-ui-close]').click();
    await wait(60);
    results.dialogReturnsFocus = document.activeElement?.id === 'confirmButton';
  }

  document.querySelector('#toastButton')?.click();
  await wait(40);
  results.toastAppears = document.querySelector('.ui-toast') !== null;

  /* ── states page ────────────────────────────────────────────────────── */
  await showPage('states');
  // Scope every lookup to the visible page: an identical component inside a
  // hidden panel measures 0 and would report a false failure.
  const visibleBox = selector => {
    const node = document.querySelector(`#view-states ${selector}`) ?? document.querySelector(selector);
    if (!node) return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  results.statusRenders = visibleBox('.ui-status');
  results.spinnerRenders = visibleBox('.ui-spinner');
  results.ringRenders = visibleBox('.ui-ring');
  results.fieldErrorRenders = visibleBox('.ui-field__error');
  results.kbdRenders = visibleBox('.ui-kbd');
  results.dividerRenders = visibleBox('.ui-divider:not(.ui-divider--vertical)');
  results.spinnerAnimated = getComputedStyle(document.querySelector('#view-states .ui-spinner')).animationName !== 'none';
  results.ringUsesConicFill = getComputedStyle(document.querySelector('#view-states .ui-ring')).backgroundImage.includes('conic-gradient');
  results.alertRenders = visibleBox('.ui-alert');
  results.alertDismisses = (() => {
    const before = document.querySelectorAll('#view-states .ui-alert').length;
    const alert = document.querySelector('#view-states .ui-alert');
    alert?.querySelector('.ui-alert__close')?.click();
    return document.querySelectorAll('#view-states .ui-alert').length === before - 1;
  })();

  await showPage('components');
  await showTab('ctab-composition');
  results.tileRenders = visibleBox('.ui-tile');

  await showPage('foundations');

  /* ── shell breakpoints ───────────────────────────────────────────────── */
  // The showcase hides .ui-topbar at desktop width at app level: as a grid
  // child it would otherwise push .ui-main to a new row. This asserts the
  // showcase's own choice and the grid stays two-column.
  results.desktopTopbarHidden = getComputedStyle(document.querySelector('.ui-topbar')).display === 'none';
  results.desktopNoHorizontalOverflow = document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1;

  /* ── interaction polish ──────────────────────────────────────────────── */
  // A top-level page must enter with the fade-and-rise, not as an instant swap.
  results.viewHasEnterAnimation = (() => {
    const view = [...document.querySelectorAll('.ui-view')].find(v => !v.hidden);
    return view ? getComputedStyle(view).animationName === 'ui-view-in' : false;
  })();
  // The sidebar highlight must be a gliding pill, not a per-item repaint:
  // the thumb exists in the nav and moves when the selection moves.
  {
    const nav = document.querySelector('#sideNav');
    const thumb = nav?.querySelector(':scope > .ui-thumb');
    results.navThumbExists = thumb !== null;
    if (thumb) {
      const topAt = () => Math.round(thumb.getBoundingClientRect().top);
      // Land on a known row and wait out any glide still in flight from the
      // navigation above — otherwise `before` is a mid-flight value and the
      // comparison is a coin toss.
      document.querySelector('#sideNav [data-view="foundations"]').click();
      await wait(340);
      const before = topAt();
      document.querySelector('#sideNav [data-view="components"]').click();
      await wait(340);
      const after = topAt();
      results.navThumbGlides = after !== before && thumb.getBoundingClientRect().height > 0;
      // The :has() upgrade hands the selection colour to the pill.
      results.navThumbOwnsSelection = (() => {
        const current = nav.querySelector('[aria-current="page"]');
        return current && getComputedStyle(current).backgroundColor === 'rgba(0, 0, 0, 0)';
      })();
      document.querySelector('#sideNav [data-view="foundations"]').click();
      await wait(340);
    }
  }

  /* ── defensive contracts ─────────────────────────────────────────────── */
  // bindThumb: a static control must gain a positioning context, or the thumb
  // anchors to some ancestor and lands nowhere useful. The host starts as a
  // plain in-flow block (position:static) so the guard is what gets exercised.
  const ui = await import('/vanilla/index.js');
  {
    const host = document.createElement('div');
    host.style.cssText = 'visibility:hidden;width:120px;height:32px;';
    host.innerHTML = '<button type="button">A</button><button type="button">B</button>';
    document.body.append(host);
    results.thumbProbeStartsStatic = getComputedStyle(host).position === 'static';
    ui.bindThumb(host);
    results.thumbCreatesPositioningContext = getComputedStyle(host).position === 'relative';
    host.remove();
  }

  // A fixed tooltip cannot follow its anchor through a scroll; it must leave
  // instead of floating over unrelated content.

  {
    const target = document.createElement('button');
    target.textContent = 'tooltip probe';
    document.body.append(target);
    const dispose = ui.createTooltip(target, 'probe', { delay: 0 });
    target.dispatchEvent(new MouseEvent('mouseenter'));
    await wait(60);
    const shown = document.querySelector('.ui-tooltip') !== null;
    document.dispatchEvent(new Event('scroll'));
    await wait(60);
    results.tooltipShows = shown;
    results.tooltipHidesOnScroll = shown && document.querySelector('.ui-tooltip') === null;
    dispose();
    target.remove();
  }

  /* ── window backdrop contract ────────────────────────────────────────────
     When the host paints the window material it sets data-ui-backdrop; the
     page background must clear, the chrome must go fully transparent (a heavy
     tint reads as a separate colour block over the material), a faint
     separator takes over as the shell/content boundary, and content cards
     must stay opaque — text on cards keeps its contrast contract regardless
     of the desktop behind. */
  results.backdropClearsPageBackground = (() => {
    const root = document.documentElement;
    const body = document.body;
    const card = document.querySelector('.ui-card');
    const sidebar = document.querySelector('.ui-sidebar');
    const before = getComputedStyle(body).backgroundColor;
    root.setAttribute('data-ui-backdrop', 'mica');
    const cleared = getComputedStyle(body).backgroundColor === 'rgba(0, 0, 0, 0)';
    const chromeTransparent = getComputedStyle(sidebar).backgroundColor === 'rgba(0, 0, 0, 0)';
    const separatorPresent = parseFloat(getComputedStyle(sidebar).borderInlineEndWidth) > 0;
    const cardOpaque = getComputedStyle(card).backgroundColor.startsWith('rgb(') && !getComputedStyle(card).backgroundColor.includes('rgba');
    root.removeAttribute('data-ui-backdrop');
    const restored = getComputedStyle(body).backgroundColor === before;
    return cleared && chromeTransparent && separatorPresent && cardOpaque && restored;
  })();

  /* ── performance contracts ───────────────────────────────────────────────
     Each of these was a measured cost, not a guess. They are cheap to assert
     and expensive to rediscover. */

  // setTheme must not leave a listener behind. A `{ once: true }` transitionend
  // listener never fires when the timeout removes the class first, so one
  // listener accumulated per theme change for the life of the page.
  {
    const root = document.createElement('div');
    document.body.append(root);
    const originalAdd = root.addEventListener.bind(root);
    const originalRemove = root.removeEventListener.bind(root);
    let adds = 0;
    let removes = 0;
    root.addEventListener = (type, fn, opts) => { if (type === 'transitionend') adds++; return originalAdd(type, fn, opts); };
    root.removeEventListener = (type, fn, opts) => { if (type === 'transitionend') removes++; return originalRemove(type, fn, opts); };
    for (let i = 0; i < 4; i++) {
      ui.setTheme(i % 2 ? 'light' : 'dark', { root, duration: 10 });
      await wait(30);
    }
    results.themeRemovesItsListener = adds > 0 && removes === adds;
    results.themeNoListenerLeak = adds - removes === 0;
    root.remove();
  }

  // The theme crossfade touches the whole tree, so it must not pull the
  // `background` shorthand (and with it background-image) into the transition.
  results.themeTransitionIsColourOnly = (() => {
    const style = document.querySelector('link[href="/core/index.css"]');
    if (!style) return false;
    const probe = document.createElement('div');
    probe.className = 'ui-theme-transition';
    document.body.append(probe);
    const value = getComputedStyle(probe).transitionProperty;
    probe.remove();
    return value.includes('background-color') && !/(^|,|\s)background(\s|,|$)/.test(value);
  })();

  // A drag must not write to localStorage per frame: setItem is synchronous and
  // reaches disk. One commit at the end of the gesture is the contract.
  {
    const host = document.createElement('div');
    host.style.cssText = 'display:flex;';
    const pane = document.createElement('div');
    pane.style.width = '200px';
    const handle = document.createElement('div');
    host.append(pane, handle);
    document.body.append(host);
    const key = `ui-perf-probe-${Date.now()}`;
    const dispose = ui.bindResizer(handle, pane, { min: 120, max: 320, storageKey: key });
    const originalSet = Storage.prototype.setItem;
    let writes = 0;
    Storage.prototype.setItem = function (...args) { writes++; return originalSet.apply(this, args); };
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, clientX: 200, clientY: 10 }));
    for (let i = 0; i < 30; i++) handle.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 7, clientX: 200 + i, clientY: 10 }));
    const duringDrag = writes;
    handle.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7 }));
    const afterDrag = writes;
    Storage.prototype.setItem = originalSet;
    results.resizerNoStorageWritePerFrame = duringDrag === 0;
    results.resizerCommitsOnceOnRelease = afterDrag === 1;
    dispose();
    localStorage.removeItem(key);
    host.remove();
  }

  // A burst of scroll events in one task must collapse into a single
  // reposition. Each place() reads two rects, so two reads means one run;
  // without coalescing a 60-event burst would read 120 times.
  {
    const anchor = document.createElement('button');
    anchor.textContent = 'popover anchor';
    const popover = document.createElement('div');
    popover.className = 'ui-popover';
    popover.hidden = true; // openPopover refuses a popover that is already visible
    popover.innerHTML = '<button type="button">item</button>';
    document.body.append(anchor, popover);
    let rectReads = 0;
    const originalRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (...args) { rectReads++; return originalRect.apply(this, args); };
    const close = ui.openPopover(popover, anchor);
    const openReads = rectReads;
    rectReads = 0;
    for (let i = 0; i < 60; i++) window.dispatchEvent(new Event('scroll'));
    // The contract that matters is that a scroll event does not reposition
    // synchronously — that is what turned a scroll burst into 120 forced
    // layout reads. Reading the counter before yielding proves it without
    // depending on frame timing, which is throttled under automation.
    const syncReads = rectReads;
    await Promise.race([
      new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      wait(300),
    ]);
    const asyncReads = rectReads;
    Element.prototype.getBoundingClientRect = originalRect;
    results.popoverScrollCoalescesDebug = `open=${openReads} sync=${syncReads} async=${asyncReads}`;
    // openReads proves the probe actually opened a popover; without it this
    // whole check would pass vacuously (a hidden:false popover makes
    // openPopover return early and nothing at all happens).
    results.popoverOpensAndPositions = openReads > 0 && popover.style.top !== '';
    results.popoverScrollCoalesces = openReads > 0 && syncReads === 0;
    close({ reason: 'probe' });
    anchor.remove();
    popover.remove();
  }

  return results;
}

const browser = await findBrowser();
if (!browser) {
  console.error('No Chrome/Edge found. Set CHROME_PATH to run the browser check.');
  process.exit(2);
}

// `npm run check` must be runnable on its own. If the target is the local
// showcase and nothing answers, start it here and stop it afterwards; any
// other target is the caller's responsibility.
async function ensureServer(url) {
  const reachable = async () => {
    try { const response = await fetch(url, { signal: AbortSignal.timeout(1500) }); return response.ok; }
    catch { return false; }
  };
  if (await reachable()) return null;
  if (!/^http:\/\/127\.0\.0\.1:\d+\/?$/.test(url)) {
    throw new Error(`nothing is serving ${url}`);
  }
  const { fileURLToPath } = await import('node:url');
  const server = spawn(process.execPath, [fileURLToPath(new URL('../apps/showcase/server.mjs', import.meta.url))], { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) {
    await sleep(200);
    if (await reachable()) return server;
  }
  server.kill();
  throw new Error('the showcase server did not come up');
}

let ownedServer = null;
try {
  ownedServer = await ensureServer(URL_UNDER_TEST);
  if (ownedServer) console.log('started the showcase server for this run\n');
} catch (error) {
  console.error(`browser check failed: ${error.message}`);
  process.exit(2);
}

const profile = await mkdtemp(join(tmpdir(), 'uui-cdp-'));
const child = spawn(browser, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--disable-extensions',
  '--disable-background-networking',
  '--window-size=1280,900',
  'about:blank',
], { stdio: 'ignore' });

let cdp;
let exitCode = 0;
try {
  const list = await waitForJson(`http://127.0.0.1:${PORT}/json/list`);
  const page = list.find(target => target.type === 'page');
  if (!page) throw new Error('no page target');

  cdp = await Cdp.connect(page.webSocketDebuggerUrl);
  const problems = [];
  cdp.on('Runtime.exceptionThrown', params => problems.push(params.exceptionDetails?.exception?.description ?? params.exceptionDetails?.text ?? 'exception'));
  cdp.on('Runtime.consoleAPICalled', params => {
    if (params.type === 'error') problems.push(params.args?.map(arg => arg.value ?? arg.description).join(' '));
  });
  cdp.on('Log.entryAdded', params => { if (params.entry.level === 'error') problems.push(params.entry.text); });

  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Page.enable');

  const loaded = new Promise(resolve => cdp.on('Page.loadEventFired', resolve));
  await cdp.send('Page.navigate', { url: URL_UNDER_TEST });
  await Promise.race([loaded, sleep(8000)]);
  await sleep(400);

  const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', {
    expression: `(${probeInPage.toString()})()`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (exceptionDetails) throw new Error(`probe threw: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);

  const results = result.value ?? {};
  const failed = Object.entries(results).filter(([, value]) => value === false);
  const passed = Object.entries(results).filter(([, value]) => value === true);

  console.log(`browser: ${browser}`);
  console.log(`url:     ${URL_UNDER_TEST}`);
  console.log('');
  for (const [name] of passed) console.log(`  PASS  ${name}`);
  for (const [name] of failed) console.log(`  FAIL  ${name}`);
  // Non-boolean results are diagnostics, not verdicts — a probe that reports a
  // count or a measurement lands here so a failing threshold can be reasoned
  // about without re-running the whole suite.
  for (const [name, value] of Object.entries(results)) {
    if (value === true || value === false || name === 'failure') continue;
    console.log(`  INFO  ${name}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
  }
  if (results.failure) console.log(`  FAIL  ${results.failure}`);
  if (problems.length) {
    console.log('');
    console.log('  console errors:');
    for (const problem of [...new Set(problems)]) console.log(`    ${problem}`);
  }

  await mkdir('test-results', { recursive: true }).catch(() => {});
  const shoot = async name => {
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const file = join(process.cwd(), 'test-results', `${name}.png`);
    await writeFile(file, Buffer.from(shot.data, 'base64'));
    return file;
  };
  const evaluate = expression => cdp.send('Runtime.evaluate', { expression });

  /* ── real-pointer drag sort ──────────────────────────────────────────────
     bindDragSort is the one behaviour a page-in probe cannot exercise: it calls
     setPointerCapture, which rejects synthetic pointer ids and would surface as
     a console error. Driving it with real CDP mouse input is the only way to
     cover the reorder path — the in-page `dragListReordered` check only proves
     that DOM insertion reorders a list, not that dragging does. */
  const dragProbeBox = async expression => (await cdp.send('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true,
  })).result?.value ?? {};

  await evaluate(`(async () => {
    const mod = await import('/vanilla/index.js');
    const list = document.createElement('div');
    list.id = 'dragProbe';
    list.style.cssText = 'position:fixed;top:70px;left:30px;width:240px;z-index:9999;'
      + 'background:var(--ui-surface);border:1px solid var(--ui-line)';
    list.innerHTML = ['alpha', 'beta', 'gamma'].map(id =>
      '<div data-drag-item="' + id + '" style="height:36px;border-bottom:1px solid #ccc">'
      + '<span data-drag-handle style="display:block;height:36px;line-height:36px;padding-left:8px">' + id + '</span></div>').join('');
    document.body.append(list);
    window.__dragProbeDispose = mod.bindDragSort(list, { onOrder: order => { window.__dragProbeOrder = order; } });
    return true;
  })()`);
  await sleep(150);
  const dragFrom = await dragProbeBox(`(() => {
    const items = [...document.querySelectorAll('#dragProbe [data-drag-item]')];
    const h = items[0].querySelector('[data-drag-handle]').getBoundingClientRect();
    const t = items[2].getBoundingClientRect();
    return {
      before: items.map(item => item.dataset.dragItem),
      from: { x: Math.round(h.x + 30), y: Math.round(h.y + h.height / 2) },
      to: { x: Math.round(t.x + 30), y: Math.round(t.y + t.height * 0.8) },
    };
  })()`);
  const dragMouse = (type, x, y) => cdp.send('Input.dispatchMouseEvent', {
    type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1,
  });
  await dragMouse('mouseMoved', dragFrom.from.x, dragFrom.from.y);
  await dragMouse('mousePressed', dragFrom.from.x, dragFrom.from.y);
  for (let i = 1; i <= 10; i++) {
    await dragMouse('mouseMoved',
      Math.round(dragFrom.from.x + (dragFrom.to.x - dragFrom.from.x) * (i / 10)),
      Math.round(dragFrom.from.y + (dragFrom.to.y - dragFrom.from.y) * (i / 10)));
    await sleep(16);
  }
  const dragMark = await dragProbeBox(`document.querySelector('#dragProbe [data-drop]')?.dataset.drop ?? null`);
  await dragMouse('mouseReleased', dragFrom.to.x, dragFrom.to.y);
  await sleep(150);
  const dragEnd = await dragProbeBox(`(() => {
    const list = document.querySelector('#dragProbe');
    return {
      after: [...list.querySelectorAll('[data-drag-item]')].map(item => item.dataset.dragItem),
      emitted: window.__dragProbeOrder ?? null,
      leftoverMarks: list.querySelectorAll('[data-drop]').length,
      leftoverDragging: list.querySelectorAll('[data-dragging]').length,
    };
  })()`);
  await evaluate(`(() => { window.__dragProbeDispose?.(); document.querySelector('#dragProbe')?.remove(); })()`);

  results.dragSortShowsDropMark = dragMark === 'after';
  results.dragSortReordersWithRealPointer = dragEnd.after[0] !== dragFrom.before[0]
    && dragEnd.after.includes('alpha')
    && dragEnd.after.length === dragFrom.before.length;
  results.dragSortEmitsOrder = Array.isArray(dragEnd.emitted) && dragEnd.emitted.length === 3;
  results.dragSortClearsStateAfterDrop = dragEnd.leftoverMarks === 0 && dragEnd.leftoverDragging === 0;

  // Screenshots must start from a known state: the probe leaves dialogs,
  // toasts, a scrolled viewport and a stray hover behind, and a baseline that
  // drifts between runs is worse than no baseline. Reset first, then capture.
  await evaluate(`(() => {
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    document.querySelectorAll('.ui-toast').forEach(node => node.remove());
    document.querySelector('#sideNav [data-view="foundations"]').click();
    window.scrollTo(0, 0);
  })()`);
  // The real-pointer drag tests leave the mouse somewhere on the page; park it
  // in the corner so no row is hovered when a baseline is captured.
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0, button: 'none', buttons: 0 });;
  await sleep(150);

  await evaluate(`document.documentElement.dataset.uiTheme = 'light'`);
  await sleep(120);
  const light = await shoot('showcase-light');

  await evaluate(`document.documentElement.dataset.uiTheme = 'dark'`);
  await sleep(120);
  const dark = await shoot('showcase-dark');
  await evaluate(`delete document.documentElement.dataset.uiTheme`);

  // Components page with a sub-tab open, which is the densest screen.
  await evaluate(`document.querySelector('#sideNav [data-view="components"]').click()`);
  await sleep(280); // the view entrance runs 220ms; wait it out
  await shoot('showcase-components');
  await evaluate(`document.querySelector('#ctab-controls').click()`);
  await sleep(140);
  const controlsShot = await shoot('showcase-controls');

  // The same page in scroll mode: every section stacked, nav reports position.
  await evaluate(`document.querySelector('#navMode [data-value="scroll"]').click()`);
  await sleep(200);
  const scrollShot = await shoot('showcase-scroll');
  await evaluate(`document.querySelector('#navMode [data-value="tabs"]').click()`);
  await sleep(160);
  await evaluate(`document.querySelector('#ctab-overlays').click()`);
  await sleep(120);
  const overlays = await shoot('showcase-overlays');

  await evaluate(`document.querySelector('#sideNav [data-view="panel"]').click()`);
  await sleep(280);
  const panelShot = await shoot('showcase-panel');

  await evaluate(`document.querySelector('#sideNav [data-view="states"]').click()`);
  await sleep(280);
  const statesShot = await shoot('showcase-states');
  await evaluate(`document.querySelector('#sideNav [data-view="components"]').click()`);
  await sleep(120);

  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await sleep(160);
  const mobile = await shoot('showcase-mobile');

  // The compact-shell drawer: below the shell breakpoint the topbar replaces
  // the hidden sidebar, the trigger opens the page list as a left sheet, and
  // choosing a page closes the sheet and switches the view.
  // cdp.send already unwraps to `{ result, exceptionDetails }`, so the value
  // sits at `response.result.value` — one level deeper returns undefined and
  // the drawer assertions would silently vanish from the tally.
  const drawerProbe = async expression => {
    const response = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(`drawer probe threw: ${response.exceptionDetails.exception?.description ?? response.exceptionDetails.text}`);
    return response.result?.value ?? {};
  };
  Object.assign(results, await drawerProbe(`(() => ({
    mobileTopbarVisible: getComputedStyle(document.querySelector('.ui-topbar')).display !== 'none',
    mobileSidebarHidden: getComputedStyle(document.querySelector('.ui-sidebar')).display === 'none',
    mobileTopbarSeamless: getComputedStyle(document.querySelector('.ui-topbar')).borderBottomWidth === '0px',
    mobileNoHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  }))()`));
  await evaluate(`document.querySelector('#navTrigger').click()`);
  await sleep(300);
  Object.assign(results, await drawerProbe(`(() => {
    const sheet = document.querySelector('#navSheet');
    return { mobileDrawerOpens: sheet.open && sheet.getBoundingClientRect().width > 0 };
  })()`));
  // Capture the drawer while it is open — a closed sheet photographs as the
  // page behind it, which is the state the assertions already cover.
  const drawerShot = await shoot('showcase-drawer');
  await evaluate(`document.querySelector('#navSheet [data-view="states"]').click()`);
  await sleep(200);
  Object.assign(results, await drawerProbe(`(() => ({
    mobileDrawerClosesOnNavigate: !document.querySelector('#navSheet').open,
    mobileNavSwitchesView: !document.querySelector('#view-states').hidden,
  }))()`));
  await cdp.send('Emulation.clearDeviceMetricsOverride');

  // Overlays get their own baseline: an edge sheet that renders as a centred
  // box still passes every DOM assertion, so only a screenshot catches it.
  // The drawer test left the states page showing; restore the overlays page
  // the sheet baseline has always had behind it.
  await evaluate(`document.querySelector('#sideNav [data-view="components"]').click()`);
  await sleep(280);
  await evaluate(`document.querySelector('#ctab-overlays').click()`);
  await sleep(120);
  await evaluate(`document.querySelector('#sheetButton').click()`);
  await sleep(260);
  const sheetShot = await shoot('showcase-sheet');
  await evaluate(`document.querySelector('#demoSheet').close()`);
  await sleep(120);

  console.log('\n  screenshots:');
  for (const file of [light, dark, overlays, controlsShot, scrollShot, panelShot, statesShot, mobile, drawerShot, sheetShot]) console.log(`    ${file}`);

  // The drawer checks ran after the first tally; the extra results join the
  // verdict here so a late failure still fails the run.
  const latePassed = Object.entries(results).filter(([name, value]) => value === true && !passed.some(([p]) => p === name));
  const lateFailed = Object.entries(results).filter(([name, value]) => value === false && !failed.some(([f]) => f === name));
  for (const [name] of [...latePassed, ...lateFailed]) console.log(`  ${lateFailed.some(([f]) => f === name) ? 'FAIL' : 'PASS'}  ${name}`);

  if (failed.length + lateFailed.length || results.failure || problems.length) exitCode = 1;
  else console.log(`\n  ${passed.length + latePassed.length} checks passed`);
} catch (error) {
  console.error(`browser check failed: ${error.message}`);
  exitCode = 1;
} finally {
  cdp?.close();
  child.kill();
  ownedServer?.kill();
}

process.exit(exitCode);
