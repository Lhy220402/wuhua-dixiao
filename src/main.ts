import "./style.css";
import kaplay from "kaplay";
import { BALANCE } from "./config/balance";
import { GameApp } from "./app/app";

declare const __APP_VERSION__: string;

function showBootError(message: string): void {
  const boot = document.getElementById("boot-screen");
  if (!boot) return;
  boot.classList.add("error");
  boot.replaceChildren();
  const mark = document.createElement("div");
  mark.className = "boot-mark";
  mark.textContent = "物化帝笑传";
  const sub = document.createElement("div");
  sub.className = "boot-sub";
  sub.textContent = message;
  boot.append(mark, sub);
}

function hasWebGL2(): boolean {
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2"));
  } catch {
    return false;
  }
}

function showFatal(message: string): void {
  let node = document.getElementById("fatal-error");
  if (!node) {
    node = document.createElement("div");
    node.id = "fatal-error";
    node.style.cssText =
      "position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#B3261E;color:#fff;padding:10px;border-radius:8px;font:12px/1.5 monospace;white-space:pre-wrap;max-height:40vh;overflow:auto;";
    document.body.append(node);
  }
  node.textContent = `[运行错误] ${message}`;
}

window.addEventListener("error", (ev) => {
  showFatal(ev.error?.stack ?? ev.message);
});
window.addEventListener("unhandledrejection", (ev) => {
  showFatal(String(ev.reason?.stack ?? ev.reason));
});

function main(): void {
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement | null;
  if (!canvas) {
    showBootError("页面缺少画布，刷新再试。");
    return;
  }
  if (!hasWebGL2()) {
    showBootError("这台设备/浏览器没有 WebGL2。请升级浏览器或换一台设备。");
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, BALANCE.view.dprCap);
  const k = kaplay({
    width: BALANCE.view.logicalW,
    height: BALANCE.view.logicalH,
    canvas,
    letterbox: true,
    background: "#0B1114",
    pixelDensity: dpr,
    debug: false,
    crisp: false,
  });

  let app: GameApp;
  try {
    app = new GameApp(k, canvas);
  } catch (err) {
    console.error(err);
    showBootError("启动失败，请查看控制台或刷新重试。");
    return;
  }

  if (import.meta.env.DEV) {
    (window as unknown as { __CMI__?: unknown }).__CMI__ = app;
  }

  k.scene("game", () => {
    k.onUpdate(() => app.update(k.dt()));
    k.onDraw(() => app.draw());
  });
  k.go("game");
  app.start();
  document.getElementById("boot-screen")?.classList.add("done");
  window.setTimeout(() => document.getElementById("boot-screen")?.remove(), 400);

  const unlock = (): void => {
    app.unlockAudio();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);

  console.info(`[物化帝笑传] v${__APP_VERSION__} · ${BALANCE.view.logicalW}×${BALANCE.view.logicalH}`);
}

main();
