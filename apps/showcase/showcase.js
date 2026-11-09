import {
  bindArmButton,
  bindCheckboxGroup,
  bindCommandList,
  bindCopyButton,
  bindDialog,
  bindDisclosure,
  bindDragSort,
  bindMenu,
  bindResizer,
  bindSectionNav,
  bindSegmented,
  bindSheet,
  bindSlider,
  bindSwitch,
  bindTabs,
  createToast,
  createToastStack,
  createTooltip,
  drawSparkline,
  openPopover,
  openSheet,
  setTheme,
} from '/vanilla/index.js';

const status = document.querySelector('#status');
const say = message => { status.textContent = message; };

// One stack for the page: toasts queue instead of covering each other, which
// is what happens when every action appends its own fixed-position element.
const stack = createToastStack({ position: 'bottom-end' });

/* page navigation --------------------------------------------------------- *
 * The sidebar switches pages. It does not scroll: a sidebar that scrolls the
 * current page is indistinguishable from a broken link, and it makes the
 * current location ambiguous. Sub-navigation inside a page is a tablist.   */
const VIEWS = {
  foundations: { title: 'Foundations', subtitle: 'Tokens are the public visual contract.' },
  components: { title: 'Components', subtitle: 'Every control, grouped by role.' },
  behavior: { title: 'Behavior', subtitle: 'Focus, dismissal and confirmation.' },
  panel: { title: 'Tray panel', subtitle: 'The compact surface an icon opens.' },
  states: { title: 'State matrix', subtitle: 'Loading, empty, progress and errors.' },
  motion: { title: 'Motion', subtitle: 'One curve, four durations, reduced motion.' },
};

// Sidebar buttons and their drawer counterparts. The view sections also carry
// data-view, so a bare [data-view] query would bind the page container too —
// and any click inside the page would bubble up, re-run showView and scroll
// back to the top.
const navSheet = document.querySelector('#navSheet');
const navButtons = [...document.querySelectorAll('#sideNav [data-view], #navSheet [data-view]')];
const viewSections = [...document.querySelectorAll('.ui-view[data-view]')];

function showView(name) {
  if (!VIEWS[name]) return;
  navButtons.forEach(button => {
    if (button.dataset.view === name) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  viewSections.forEach(section => { section.hidden = section.dataset.view !== name; });
  // The secondary list belongs to one page only; it disappears with its parent.
  const subnav = document.querySelector('#componentSubnav');
  if (subnav) subnav.hidden = name !== 'components';
  document.querySelector('#pageTitle').textContent = VIEWS[name].title;
  document.querySelector('#pageSubtitle').textContent = VIEWS[name].subtitle;
  // Navigating from the compact-shell drawer dismisses it: the page changed
  // under the sheet, so leaving it open would hide the result.
  if (navSheet?.open) navSheet.close();
  window.scrollTo(0, 0);
  say(`${VIEWS[name].title} page.`);
}

navButtons.forEach(button => {
  if (!button.dataset.view) return;
  button.addEventListener('click', () => showView(button.dataset.view));
});

/* component sub-tabs ------------------------------------------------------
 * Inside the Components page a tablist switches sub-pages. This is the layer
 * that is allowed to change content in place; the sidebar above is not.    */
const componentSubnav = document.querySelector('#componentSubnav');
const subnavItems = [...componentSubnav.querySelectorAll('[data-subtab]')];
const tablist = document.querySelector('#componentTabs');
const sectionNav = document.querySelector('#componentSections');
// Direct children only: the page's sub-sections are its own tabpanels, while
// the Tabs demo inside a card has three of its own that must not be touched.
const componentPanels = () => [...document.querySelectorAll('#view-components > .ui-tabpanel')];

let navMode = 'tabs';

const markSubnav = tabId => {
  subnavItems.forEach(item => {
    if (item.dataset.subtab === tabId) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
};

bindTabs(tablist, {
  onChange: (value, tab) => {
    markSubnav(tab.id);
    say(`Section: ${value}`);
  },
});

// The scroll counterpart. Both live in the page; the toggle picks which one is
// active, and only one of them is ever displayed, so their ARIA never claims
// contradictory state.
bindSectionNav(sectionNav, { onActivate: id => say(`Jumped to ${id}`) });

const applyMode = next => {
  navMode = next;
  const scroll = next === 'scroll';
  tablist.hidden = scroll;
  sectionNav.hidden = !scroll;
  if (scroll) {
    componentPanels().forEach(panel => { panel.hidden = false; });
    say('Scroll mode: every section is on the page.');
  } else {
    const current = subnavItems.find(item => item.getAttribute('aria-current') === 'page')
      ?? subnavItems[0];
    document.querySelector(`#${current?.dataset.subtab}`)?.click();
    say('Tabs mode: one section at a time.');
  }
};

bindSegmented(document.querySelector('#navMode'), { onChange: applyMode });

// The sidebar's secondary list drives whichever mode is active.
subnavItems.forEach(item => item.addEventListener('click', event => {
  const panel = document.getElementById(item.dataset.subtab);
  if (navMode === 'scroll') {
    event.stopPropagation();
    panel?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    return;
  }
  panel?.click();
}));

/* dialogs ------------------------------------------------------------------ */
const dialog = document.querySelector('#dialog');
bindDialog(dialog, {
  triggers: [document.querySelector('#dialogTrigger'), document.querySelector('#dialogButton')],
});

// Destructive confirmation opens with focus on Cancel, so a stray Enter
// cancels rather than destroys. This is the reason `initialFocus` exists.
bindDialog(document.querySelector('#confirmDialog'), {
  trigger: document.querySelector('#confirmButton'),
  initialFocus: () => document.querySelector('#confirmCancel'),
});
document.querySelector('#confirmDelete').addEventListener('click', () => {
  say('Deleted.');
  stack.push('Item deleted.', { tone: 'danger' });
});

/* primitives --------------------------------------------------------------- */
bindSegmented(document.querySelector('#cpanel-controls .ui-segmented'), {
  onChange: value => say(`Segment: ${value}`),
});

bindSwitch(document.querySelector('.ui-switch'), {
  onChange: checked => say(`Notifications ${checked ? 'on' : 'off'}`),
});

bindTabs(document.querySelector('#demoTabs'), {
  onChange: value => say(`Tab: ${value}`),
});

bindDisclosure(document.querySelector('#demoDisclosure'), {
  onChange: (open, trigger) => say(`${trigger.textContent.trim()} ${open ? 'expanded' : 'collapsed'}`),
});

bindCommandList(document.querySelector('#commandList'), {
  input: document.querySelector('#commandInput'),
  emptySelector: '#commandEmpty',
  onChange: value => say(`Command: ${value}`),
});

createTooltip(document.querySelector('#tooltipTarget'), 'Announces without stealing focus');
createTooltip(document.querySelector('#toastButton'), 'Announces without stealing focus');

bindCheckboxGroup(document.querySelector('#checkAll'),
  [...document.querySelectorAll('#checkGroup .check-item')],
  { onChange: checked => say(`Selection ${checked ? 'all on' : 'changed'}`) });

bindSlider(document.querySelector('#demoSlider'), {
  output: document.querySelector('#sliderValue'),
  format: value => `${value}%`,
});

bindMenu(document.querySelector('#demoMenu'), {
  onSelect: (item, state) => say(`${item.textContent.trim()}${state.checked ? ` → ${state.checked}` : ''}`),
});

drawSparkline(document.querySelector('#sparkline'), [12, 18, 14, 22, 19, 26, 24, 31, 28, 34, 30, 38]);

bindResizer(document.querySelector('#resizer'), document.querySelector('#resizeTarget'), {
  min: 120, max: 320, step: 12,
  onChange: width => say(`Pane width ${Math.round(width)}px`),
});

bindDragSort(document.querySelector('#dragList'), {
  onOrder: order => say(`Order: ${order.join(' → ')}`),
});

bindArmButton(document.querySelector('#armButton'), {
  armLabel: 'Really delete?',
  timeout: 4000,
  onConfirm: () => { say('Deleted (after confirmation).'); stack.push('Item deleted.', { tone: 'danger' }); },
});

bindCopyButton(document.querySelector('#copyButton'), {
  text: 'npm install @universal-ui/core',
  resetAfter: 1500,
});
document.querySelector('#copyButton').addEventListener('ui-copy', event => {
  say(event.detail.ok ? 'Copied to clipboard.' : 'Copy blocked — select the text manually.');
});

document.querySelector('#demoRadios')?.addEventListener('change', event => {
  if (event.target.name === 'density') say(`Density: ${event.target.value}`);
});

document.querySelectorAll('.ui-alert__close').forEach(button => {
  button.addEventListener('click', () => {
    button.closest('.ui-alert')?.remove();
    say('Alert dismissed.');
  });
});

document.querySelectorAll('.ui-chip--action').forEach(chip => {
  chip.addEventListener('click', () => {
    const next = chip.getAttribute('aria-pressed') !== 'true';
    chip.setAttribute('aria-pressed', String(next));
    say(`Chip ${next ? 'on' : 'off'}`);
  });
});

/* sheet -------------------------------------------------------------------- */
const sheet = document.querySelector('#demoSheet');
document.querySelector('#sheetButton').addEventListener('click', () => {
  openSheet(sheet, { trigger: document.querySelector('#sheetButton') });
});
sheet.querySelectorAll('[data-ui-sheet-close]').forEach(button => button.addEventListener('click', () => sheet.close()));

// Compact-shell drawer: the topbar's hamburger opens the page list as a left
// sheet; showView closes it when a page is chosen.
bindSheet(navSheet, { trigger: document.querySelector('#navTrigger') });

/* theme -------------------------------------------------------------------- */
document.querySelector('#themeButton').addEventListener('click', () => {
  const next = document.documentElement.dataset.uiTheme === 'dark' ? 'light' : 'dark';
  setTheme(next);
  say(`${next} theme enabled.`);
});

/* toast -------------------------------------------------------------------- */
document.querySelector('#toastButton').addEventListener('click', () => {
  createToast('Saved without losing focus.', { tone: 'success' });
  say('Toast shown.');
});

document.querySelector('#stackToastButton').addEventListener('click', () => {
  stack.push('Background task finished.', { tone: 'success' });
  stack.push('One item still syncing.', { tone: 'warning' });
  stack.push('Upload failed.', { tone: 'danger', timeout: 5000 });
  say('Three toasts queued.');
});

/* popover ------------------------------------------------------------------ */
const popoverButton = document.querySelector('#popoverButton');
const popover = document.querySelector('#popover');
let closePopover = null;

popoverButton.setAttribute('aria-haspopup', 'menu');
popoverButton.setAttribute('aria-expanded', 'false');
popoverButton.setAttribute('aria-controls', 'popover');

popoverButton.addEventListener('click', () => {
  if (closePopover) {
    closePopover({ restoreFocus: true, reason: 'trigger' });
    closePopover = null;
    return;
  }
  closePopover = openPopover(popover, popoverButton);
});

popover.addEventListener('ui-popover-close', event => {
  closePopover = null;
  say(`Popover closed (${event.detail.reason}).`);
});

popover.querySelectorAll('[role="menuitem"]').forEach(item => {
  item.addEventListener('click', () => {
    say(`Chose: ${item.textContent.trim()}`);
    closePopover?.({ restoreFocus: true, reason: 'select' });
    closePopover = null;
  });
});
