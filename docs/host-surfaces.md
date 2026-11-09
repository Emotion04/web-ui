# Host surfaces

Some of a desktop app's interface lives outside the webview. The rule:

**The kit owns everything drawn by the web engine; the host owns the window and
the OS chrome.** But "outside the webview" is a smaller set than it first looks —
a tray/menu-bar click usually opens a *second, small webview*, which means that
surface is ordinary web UI and belongs in the kit.

## The three surfaces behind a tray icon

A desktop app with a menu-bar/tray presence typically exposes all three:

| Gesture | Surface | Who draws it | Kit component |
|---|---|---|---|
| Single click on the icon | Compact panel anchored under the icon | **Web engine** (a small frameless window) | `.ui-panel` |
| Right click on the icon | Native context menu | Operating system | `.ui-menu` for the in-window twin |
| Opening the full app | Main window | Web engine | `.ui-view` inside `.ui-shell` |

The panel is the interesting one: it is a real webview window, sized to its
content and positioned by the host under the icon. It reuses the same stylesheet
and the same components as the main window, which is exactly why it belongs in a
design system rather than being hand-built per app.

### Implementing the panel

```html
<div class="ui-panel">
  <div class="ui-panel__header">
    <span class="ui-panel__title">Universal UI</span>
    <span class="ui-badge ui-badge--success">Running</span>
  </div>
  <div class="ui-panel__body">
    <div class="ui-panel__section">
      <div class="ui-panel__section-label">Status</div>
      <div class="ui-panel__row"><span class="ui-panel__row-label">Requests today</span><span class="ui-panel__value">1,284</span></div>
    </div>
  </div>
  <div class="ui-panel__footer">
    <button type="button" class="ui-button">Open window</button>
    <button type="button" class="ui-button ui-button--primary">Resume</button>
  </div>
</div>
```

Host responsibilities, which stay out of the kit:

1. Create the frameless window; attach it to the icon and offset it a few pixels.
2. Measure the content and resize the window to fit (`ResizeObserver` →
   `window.resizeTo` / the host's equivalent).
3. Toggle it on icon click; hide it on blur or Escape.
4. Keep exactly one instance alive so the page does not reload on every click.

### The native menu is a twin, not a replacement

Right-click menus are drawn by the OS and cannot be styled. Keep one data
description and render it twice:

```js
export const appMenu = [
  { type: 'group', label: 'View' },
  { id: 'open', label: 'Open', hint: 'Ctrl+O' },
  { id: 'sidebar', label: 'Show sidebar', type: 'checkbox', checked: true },
  { type: 'separator' },
  { id: 'quit', label: 'Quit' },
];
```

Render it to `.ui-menu` for the in-window equivalent so the command set stays
discoverable and testable in a browser, and to the host's menu API for the OS
surface. About fifteen lines per platform, and it tracks the OS.

## Surfaces that genuinely cannot be web UI

| Surface | Why | What to do |
|---|---|---|
| OS context menu | Drawn by the window manager | Mirror it with `.ui-menu` |
| Window controls | Owned by the title bar | Use the OS ones; draw your own only for frameless |
| Native file picker | Sandboxed by the OS | Open it from a button; keep the button's focus ring |
| Taskbar jump list | OS-level, no webview | Mirror the commands in an in-window menu |
| System notification | OS notification centre | Use `.ui-toast` for in-app feedback; the OS API for background events |

## What must never leak into the kit

- Host draggable-region attributes (`--wails-draggable`, `-webkit-app-region`)
- Window IDs, panel sizing calls, tray APIs
- Host colour-scheme variables — read the platform preference and set
  `data-ui-theme` instead

Keeping these out is what lets the same markup run in a plain browser, which is
also what makes the showcase and the browser check possible.

## Frameless main window

1. Reserve a drag strip at the top of the shell and mark it with host-specific
   attributes in *your* CSS, not in the core.
2. Draw window controls with `.ui-icon-button`, at least 44×44 on touch.
3. Keep padding for the title area so content never slides under the controls.

Everything else — panels, menus, sheets, dialogs — is the same markup as the web
build.
