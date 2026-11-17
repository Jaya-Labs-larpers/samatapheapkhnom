import { initScrollSteps } from './scroll-steps';
import { initScrollText } from './scroll-text';
import { initScrub } from './scrub';
import { initSmoothScroll } from './smooth-scroll';

export function initScrollMotion(): void {
  initSmoothScroll();
  initScrollText();
  initScrub();
  initScrollSteps();
}
