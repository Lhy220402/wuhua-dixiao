export type Attrs = Record<string, string | number | boolean | null | undefined>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: Array<Node | string | null | undefined> = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") node.className = String(value);
    else if (key === "text") node.textContent = String(value);
    else if (key === "html") node.innerHTML = String(value);
    else if (key === "disabled" && value === true) (node as HTMLButtonElement).disabled = true;
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined) continue;
    node.append(child);
  }
  return node;
}

export function clear(node: HTMLElement): void {
  node.replaceChildren();
}

export function button(
  label: string,
  cls: string,
  onClick: () => void,
  opts: { disabled?: boolean; attrs?: Attrs } = {},
): HTMLButtonElement {
  const btn = el("button", {
    class: `btn ${cls}`,
    type: "button",
    ...opts.attrs,
  }, [label]);
  btn.disabled = Boolean(opts.disabled);
  btn.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (!btn.disabled) onClick();
  });
  return btn;
}

export function iconButton(label: string, cls: string, onClick: () => void): HTMLButtonElement {
  return button(label, `btn-icon ${cls}`, onClick);
}

export const HEART_PATH =
  "M10 18.35 8.55 17.03C3.4 12.36 0 9.27 0 5.5 0 2.42 2.42 0 5.5 0 7.24 0 8.91.81 10 2.09 11.09.81 12.76 0 14.5 0 17.58 0 20 2.42 20 5.5c0 3.77-3.4 6.86-8.55 11.54L10 18.35Z";

export function heartNode(lost: boolean): HTMLElement {
  const wrap = el("span", { class: `heart${lost ? " lost" : ""}` });
  wrap.innerHTML = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${HEART_PATH}" fill="${lost ? "transparent" : "#FF4D5E"}" stroke="${lost ? "#F2EEE3" : "#0B1114"}" stroke-width="${lost ? 1.5 : 2}" stroke-linejoin="round"/></svg>`;
  return wrap;
}

export function coinNode(): HTMLElement {
  return el("span", { class: "coin-icon", "aria-hidden": "true" });
}

export function gunGlyph(): HTMLElement {
  return el("span", { class: "gun-glyph", "aria-hidden": "true" });
}

export function setClass(node: HTMLElement, name: string, on: boolean): void {
  node.classList.toggle(name, on);
}

export function clampText(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function clearChildren(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}
