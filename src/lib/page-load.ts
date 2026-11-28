export function onPageLoad(init: (signal: AbortSignal) => void): void {
  const controller = new AbortController();
  const run = () => init(controller.signal);
  window.addEventListener('pagehide', () => controller.abort(), { once: true });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
}
