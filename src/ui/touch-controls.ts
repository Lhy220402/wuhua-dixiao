import type { InputSystem } from "../systems/input";
import { el, setClass } from "./dom";

/** 虚拟方向/跳/射击/交互（docs/41 §5.3），每个 pointer 独立。 */
export class TouchControls {
  private layer: HTMLElement;
  private left: HTMLElement;
  private right: HTMLElement;
  private jump: HTMLElement;
  private shoot: HTMLElement;
  private interact: HTMLElement;
  private bindings: Array<() => void> = [];
  private active = false;

  constructor(root: HTMLElement) {
    this.layer = el("div", { class: "touch-layer", "aria-hidden": "true" });
    this.left = el("button", { class: "touch-btn touch-move left", type: "button", "aria-label": "向左" }, ["◀"]);
    this.right = el("button", { class: "touch-btn touch-move right", type: "button", "aria-label": "向右" }, ["▶"]);
    this.jump = el("button", { class: "touch-btn touch-jump", type: "button", "aria-label": "跳跃" }, ["跳"]);
    this.shoot = el("button", { class: "touch-btn touch-shoot", type: "button", "aria-label": "射击" }, ["射"]);
    this.interact = el("button", { class: "touch-btn touch-interact", type: "button", "aria-label": "交互" }, ["!"]);
    this.layer.append(this.left, this.right, this.jump, this.shoot, this.interact);
    root.append(this.layer);
  }

  bind(input: InputSystem): void {
    this.unbind();
    this.bindings.push(
      input.bindDirectionButton(this.left, "left"),
      input.bindDirectionButton(this.right, "right"),
      input.bindActionButton(this.jump, "jump"),
      input.bindActionButton(this.shoot, "shoot"),
      input.bindActionButton(this.interact, "interact"),
    );
  }

  unbind(): void {
    for (const off of this.bindings) off();
    this.bindings = [];
  }

  hasTouch(): boolean {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia?.("(any-pointer: coarse)").matches ||
      (navigator.maxTouchPoints ?? 0) > 0
    );
  }

  setActive(active: boolean): void {
    this.active = active && this.hasTouch();
    setClass(this.layer, "active", this.active);
  }

  setShootVisible(visible: boolean): void {
    setClass(this.shoot, "hidden", !visible);
  }

  setInteractVisible(visible: boolean): void {
    setClass(this.interact, "show", visible);
  }

  setPaused(paused: boolean): void {
    for (const node of [this.left, this.right, this.jump, this.shoot, this.interact]) {
      setClass(node, "disabled", paused);
    }
  }

  get isActive(): boolean {
    return this.active;
  }

  destroy(): void {
    this.unbind();
    this.layer.remove();
  }
}
