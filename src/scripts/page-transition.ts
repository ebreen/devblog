const FADE_STORAGE_KEY = "eb-page-fade";
const FADE_MS = 720;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isModifiedClick(event: MouseEvent): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function shouldFadeTo(anchor: HTMLAnchorElement): boolean {
  if (anchor.hasAttribute("download")) return false;
  if (anchor.target && anchor.target !== "_self") return false;

  let url: URL;
  try {
    url = new URL(anchor.href);
  } catch {
    return false;
  }

  if (url.origin !== window.location.origin) return false;
  return url.pathname !== window.location.pathname || url.search !== window.location.search;
}

function replayMotion(el: Element | null): void {
  if (!(el instanceof HTMLElement)) return;
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = "";
}

function replayHomeMotion(): void {
  replayMotion(document.querySelector("[data-home-scene]"));
  replayMotion(document.querySelector(".home-intro"));
}

function fadeThenGo(href: string): void {
  try {
    sessionStorage.setItem(FADE_STORAGE_KEY, "1");
  } catch {
    // Private mode can block sessionStorage. The next page still loads.
  }

  document.documentElement.classList.add("is-fade-leave");
  window.setTimeout(() => {
    window.location.assign(href);
  }, FADE_MS);
}

function initPageTransition(): void {
  if (document.documentElement.dataset.pageTransition === "on") return;
  document.documentElement.dataset.pageTransition = "on";

  let navigating = false;

  document.addEventListener("click", (event) => {
    if (navigating || event.defaultPrevented || isModifiedClick(event)) return;
    if (prefersReducedMotion()) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    const anchor = target.closest("a");
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (!shouldFadeTo(anchor)) return;

    event.preventDefault();
    navigating = true;
    fadeThenGo(anchor.href);
  });

  window.addEventListener("pageshow", (event) => {
    navigating = false;
    document.documentElement.classList.remove("is-fade-leave");
    if (!event.persisted || prefersReducedMotion()) return;

    document.documentElement.classList.remove("is-fade-enter");
    void document.documentElement.offsetWidth;
    document.documentElement.classList.add("is-fade-enter");
    replayHomeMotion();
  });
}

initPageTransition();
