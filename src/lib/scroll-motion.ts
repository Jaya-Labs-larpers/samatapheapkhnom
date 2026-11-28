import { initScrollSteps } from './scroll-steps';
import { initScrollText } from './scroll-text';
import { initScrub } from './scrub';
import { initSmoothScroll } from './smooth-scroll';

/** Smooth scrolling is started once; the rest is wired to each page. */
export function initScrollMotion(signal?: AbortSignal): void {
  initSmoothScroll();
  initScrollText();
  initScrub(document, signal);
  initScrollSteps();
}
