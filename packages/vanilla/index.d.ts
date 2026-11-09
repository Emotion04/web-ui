/**
 * Universal UI — public API.
 *
 * Every binder returns a disposer. Calling it detaches the listeners the binder
 * added; call it when the element is removed or the component unmounts, or the
 * next mount will bind a second time.
 */
export type Dispose = () => void;

/** Layout rectangle the sliding thumb animates between. */
export interface ThumbGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Thumb {
  /** Move the thumb under `target`; pass `animate: false` to place it still. */
  place(target: Element | null, options?: { animate?: boolean }): void;
  /** Re-place the thumb (still) whenever the control is shown or resized. */
  follow(selectedSelector: string): void;
  destroy(): void;
}

/* ── utilities ──────────────────────────────────────────────────────────── */

/** True when the user asked for reduced motion. Safe to call during SSR. */
export function prefersReducedMotion(): boolean;

/**
 * Crossfade to a theme. `system` removes the override.
 *
 * The crossfade transitions every element on the page, so on a very large DOM
 * pass `animate: false` to switch instantly instead of re-resolving style for
 * the whole tree.
 */
export function setTheme(
  theme: 'light' | 'dark' | 'system',
  options?: { root?: HTMLElement; duration?: number; animate?: boolean },
): void;

/** Write text to the clipboard, falling back to a hidden textarea. */
export function copyText(text: string): Promise<boolean>;

/**
 * Run `update` inside a View Transition when the engine supports it.
 * Falls back to a plain call on unsupported engines, reduced motion, thrown
 * errors and timeout. `update` is guaranteed to run at most once.
 */
export function startViewTransition(
  update: () => void | Promise<void>,
  options?: {
    timeout?: number;
    documentRef?: Pick<Document, 'startViewTransition'> | null;
    motionPreference?: () => boolean;
    timers?: Pick<typeof globalThis, 'setTimeout' | 'clearTimeout'>;
  },
): Promise<void>;

/* ── controls ───────────────────────────────────────────────────────────── */

export function bindSwitch(
  button: Element,
  options?: { onChange?: (checked: boolean, button: Element) => void },
): Dispose;

export function bindSegmented(
  root: Element,
  options?: {
    itemSelector?: string;
    onChange?: (value: string, item: HTMLElement) => void;
  },
): Dispose;

/**
 * A parent checkbox summarising its children: checked when all are, mixed when
 * some are. Clicking the parent sets every child.
 */
export function bindCheckboxGroup(
  parent: HTMLInputElement,
  children: Iterable<HTMLInputElement>,
  options?: { onChange?: (checked: boolean, item: HTMLInputElement | null) => void },
): Dispose;

export function bindSlider(
  input: HTMLInputElement,
  options?: { output?: string | HTMLElement | null; format?: (value: number) => string },
): Dispose;

export function bindCopyButton(
  button: Element,
  options?: { text?: string | (() => string); resetAfter?: number },
): Dispose;

/**
 * Two-step destructive button: the first click arms it, the second confirms.
 * Disarms on timeout, blur or Escape.
 */
export function bindArmButton(
  button: Element,
  options?: { armLabel?: string; timeout?: number; onConfirm?: () => void },
): Dispose;

/* ── disclosure and navigation ──────────────────────────────────────────── */

export function bindTabs(
  root: Element,
  options?: {
    tabSelector?: string;
    onChange?: (value: string, tab: HTMLElement) => void;
  },
): Dispose;

/**
 * In-page navigation: every section stays visible, the nav reports position
 * with `aria-current="location"`. Not a tablist — use `bindTabs` when sections
 * are alternatives.
 */
export function bindSectionNav(
  nav: Element,
  options?: {
    itemSelector?: string;
    rootMargin?: string;
    smooth?: boolean;
    reduced?: () => boolean;
    onActivate?: (id: string, section: HTMLElement) => void;
  },
): Dispose;

export function bindDisclosure(
  root: Element,
  options?: {
    triggerSelector?: string;
    contentSelector?: string;
    onChange?: (open: boolean, trigger: HTMLElement) => void;
  },
): Dispose;

/* ── overlays ───────────────────────────────────────────────────────────── */

export function bindMenu(
  root: Element,
  options?: {
    typeahead?: boolean;
    onSelect?: (item: HTMLElement, state: { checked?: string | null }) => void;
    onClose?: (reason: string) => void;
  },
): Dispose;

/** Position and show a popover. Resolves focus, Escape, outside and Tab close. */
export function openPopover(
  popover: HTMLElement,
  anchor: HTMLElement,
  options?: {
    placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
    focus?: boolean;
    closeOnOutside?: boolean;
    closeOnEscape?: boolean;
  },
): (options?: { restoreFocus?: boolean; reason?: string }) => void;

/**
 * Wire a `<dialog>`. Pass every opener in `triggers` — binding the same dialog
 * twice installs two focus traps.
 */
export function bindDialog(
  dialog: HTMLDialogElement,
  options?: {
    trigger?: Element | null;
    triggers?: Element[];
    close?: Element | null;
    initialFocus?: HTMLElement | ((dialog: HTMLDialogElement) => HTMLElement | null | undefined);
  },
): Dispose;

/** Show a `<dialog>` as an edge sheet. Modal, so the platform traps focus. */
export function openSheet(
  element: HTMLDialogElement,
  options?: { trigger?: Element | null; onClose?: () => void },
): Dispose;

/**
 * Wire trigger buttons to a sheet dialog — the declarative counterpart of
 * `openSheet`. Repeated opens never stack listeners, and `[data-ui-close]`
 * buttons inside the sheet close it. This is how the shell's mobile drawer
 * is driven.
 */
export function bindSheet(
  element: HTMLDialogElement,
  options?: { trigger?: Element | null; triggers?: Element[]; onClose?: () => void },
): Dispose;

export function createTooltip(
  anchor: Element,
  content: string,
  options?: { delay?: number; placement?: 'top' | 'bottom' },
): Dispose;

export function createToast(
  message: string,
  options?: { timeout?: number; tone?: 'default' | 'success' | 'warning' | 'danger'; container?: HTMLElement },
): { element: HTMLElement; dismiss(): void };

export function createToastStack(options?: {
  container?: HTMLElement;
  position?: 'bottom-end' | 'bottom-start' | 'top-end' | 'top-start';
}): {
  element: HTMLElement;
  push(message: string, options?: { timeout?: number; tone?: 'default' | 'success' | 'warning' | 'danger' }): { element: HTMLElement; dismiss(): void };
  clear(): void;
  destroy(): void;
};

export function bindCommandList(
  root: Element,
  options: {
    input: HTMLInputElement;
    itemSelector?: string;
    emptySelector?: string;
    onChange?: (value: string, item: HTMLElement) => void;
  },
): Dispose;

/* ── layout ─────────────────────────────────────────────────────────────── */

/** Drag or arrow-key resize. A drag-only splitter is unusable without a pointer. */
export function bindResizer(
  handle: Element,
  target: HTMLElement,
  options?: {
    min?: number;
    max?: number;
    step?: number;
    storageKey?: string;
    onChange?: (width: number) => void;
  },
): Dispose;

/** Pointer-based reordering, so it also works on touch. */
export function bindDragSort(
  container: Element,
  options?: {
    itemSelector?: string;
    handleSelector?: string;
    onOrder?: (order: string[]) => void;
  },
): Dispose;

/* ── data display ───────────────────────────────────────────────────────── */

/**
 * Sliding thumb behind the selected option of a control. The thumb is
 * absolutely positioned inside `control`, so the control must establish a
 * positioning context (`position: relative`), as `.ui-segmented` and
 * `.ui-tabs` do.
 */
export function bindThumb(
  control: Element,
  options?: { duration?: number; reduced?: () => boolean },
): Thumb;

/** Render a sparkline into an existing `<svg>`. */
export function drawSparkline(
  svg: SVGSVGElement,
  values: Array<number | string>,
  options?: { width?: number; height?: number; padding?: number },
): void;
