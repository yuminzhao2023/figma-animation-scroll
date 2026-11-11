import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type UIEvent as ReactUIEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { createPortal } from 'react-dom';
import { endpoints, interpolate, layers, mix, openingTime, sceneSegment } from './scene';
import DestinationContent from './DestinationContent';
import { galleryImages } from './gallery';
import './styles.css';

const galleryStep = 430;
type PhotoRect = { left: number; top: number; width: number; height: number };

function photoRect(element: Element): PhotoRect {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { left, top, width, height };
}

function fittedPhotoRect(aspectRatio: number): PhotoRect {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const padding = Math.min(64, Math.max(20, viewportWidth * .05));
  const width = Math.min(viewportWidth - 2 * padding, (viewportHeight - 2 * padding) * aspectRatio);
  const height = width / aspectRatio;
  return { left: (viewportWidth - width) / 2, top: (viewportHeight - height) / 2, width, height };
}

function rectStyles(rect: PhotoRect, radius: number) {
  return { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, borderRadius: `${radius}px` };
}

type RenderElements = {
  layers: Map<string, HTMLElement>;
  panel: HTMLElement;
  nav: HTMLElement;
  scrollCue: HTMLElement;
  info: HTMLElement;
  carousel: HTMLElement;
};

function setStyle(element: HTMLElement, property: 'transform' | 'opacity' | 'color' | 'visibility', value: string) {
  if (element.style[property] !== value) element.style[property] = value;
}

function App() {
  const journeyRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const galleryCardsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const lightboxMediaRef = useRef<HTMLDivElement>(null);
  const lightboxBackdropRef = useRef<HTMLButtonElement>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const lightboxOriginRef = useRef<PhotoRect | null>(null);
  const lightboxOpenAnimationRef = useRef<Animation | null>(null);
  const lightboxBackdropAnimationRef = useRef<Animation | null>(null);
  const lightboxClosingRef = useRef(false);
  const revealPathRef = useRef<SVGPathElement>(null);
  const elementsRef = useRef<RenderElements | null>(null);
  const scrollRangeRef = useRef(1);
  const galleryHoldRangeRef = useRef(0);
  const revealRangeRef = useRef(0);
  const galleryArrivalRef = useRef<'armed' | 'preview' | 'returning' | 'released'>('armed');
  const galleryArrivalIntentRef = useRef(false);
  const galleryArrivalTimerRef = useRef<number | undefined>(undefined);
  const returningGalleryWheelRef = useRef<(event: WheelEvent) => void>(() => {});
  const revealSnappingRef = useRef(false);
  const navigationTargetRef = useRef<HTMLElement | null>(null);
  const navigationTimeoutRef = useRef<number | undefined>(undefined);
  const backToTopFrameRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const galleryReadyRef = useRef(false);
  const targetTimeRef = useRef(openingTime);
  const renderedTimeRef = useRef(openingTime);
  const targetRevealRef = useRef(0);
  const renderedRevealRef = useRef(0);
  const frameRef = useRef(0);
  const fallbackRef = useRef<number | undefined>(undefined);
  const hasRenderedRef = useRef(false);
  const scheduleFrameRef = useRef<() => void>(() => {});
  const reducedRef = useRef(false);
  const readyRef = useRef(false);
  const activeImageRef = useRef(1);
  const carouselHiddenSideRef = useRef(1);
  const galleryDragRef = useRef<{ startX: number; dragged: boolean } | null>(null);
  const suppressGalleryClickRef = useRef(false);
  const lastGalleryWheelRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [galleryReady, setGalleryReady] = useState(false);
  const [currentState, setCurrentState] = useState(0);
  const [activeImage, setActiveImage] = useState(1);
  const [selectedImage, setSelectedImage] = useState<(typeof galleryImages)[number] | null>(null);
  const [lightboxEntered, setLightboxEntered] = useState(false);
  const [originalDecoded, setOriginalDecoded] = useState(false);

  const renderCarousel = useCallback((position: number, animate: boolean, hiddenSide = carouselHiddenSideRef.current, anchor = activeImageRef.current) => {
    if (window.innerWidth <= 800) return;
    const total = galleryImages.length;
    if (animate) galleryCardsRef.current[0]?.getBoundingClientRect();
    galleryCardsRef.current.forEach((card, index) => {
      if (!card) return;
      const offset = (index - anchor + total) % total;
      const baseDistance = offset === 0 ? 0 : offset === 1 ? 1 : offset === total - 1 ? -1 : hiddenSide * 2;
      const distance = baseDistance - (position - anchor);
      const depth = Math.abs(distance);
      const opacity = depth <= 1 ? 1 - depth * .25 : Math.max(0, .75 * (1 - (depth - 1) / .75));
      card.style.transition = animate ? '' : 'none';
      card.style.transform = `translate3d(calc(-50% + ${distance * galleryStep}px),${depth * 18}px,0) rotateY(${-distance * 18}deg) scale(${Math.max(.72, 1 - depth * .13)})`;
      card.style.opacity = `${opacity}`;
      card.style.zIndex = `${Math.round(10 - depth * 3)}`;
      card.style.pointerEvents = depth < 1.25 ? 'auto' : 'none';
    });
  }, []);

  const selectImage = useCallback((index: number, fromDrag = false) => {
    const current = activeImageRef.current;
    const next = ((index % galleryImages.length) + galleryImages.length) % galleryImages.length;
    if (next === current) {
      renderCarousel(current, true, carouselHiddenSideRef.current, current);
      return;
    }
    const direction = Math.sign(index - current);
    if (!fromDrag) renderCarousel(current, false, direction, current);
    activeImageRef.current = next;
    carouselHiddenSideRef.current = -direction;
    setActiveImage(next);
    renderCarousel(next, true, -direction, next);
  }, [renderCarousel]);

  const onGalleryPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (window.innerWidth <= 800 || (event.pointerType === 'mouse' && event.button !== 0)) return;
    galleryDragRef.current = { startX: event.clientX, dragged: false };
  }, []);

  const onGalleryPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = galleryDragRef.current;
    if (!drag) return;
    const delta = event.clientX - drag.startX;
    if (!drag.dragged && Math.abs(delta) < 7) return;
    if (!drag.dragged) {
      drag.dragged = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const displacement = Math.max(-.95, Math.min(.95, -delta / galleryStep));
    const direction = displacement >= 0 ? 1 : -1;
    carouselHiddenSideRef.current = direction;
    renderCarousel(activeImageRef.current + displacement, false, direction, activeImageRef.current);
  }, [renderCarousel]);

  const onGalleryPointerEnd = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = galleryDragRef.current;
    if (!drag) return;
    galleryDragRef.current = null;
    if (drag.dragged) {
      const delta = event.clientX - drag.startX;
      suppressGalleryClickRef.current = true;
      selectImage(activeImageRef.current + (delta < -55 ? 1 : delta > 55 ? -1 : 0), true);
      window.setTimeout(() => { suppressGalleryClickRef.current = false; }, 0);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }, [selectImage]);

  const onGalleryScroll = useCallback((event: ReactUIEvent<HTMLElement>) => {
    if (window.innerWidth > 800) return;
    const first = event.currentTarget.querySelector<HTMLElement>('.gallery-card');
    if (!first) return;
    const step = first.offsetWidth + 16;
    const next = Math.max(0, Math.min(galleryImages.length - 1, Math.round(event.currentTarget.scrollLeft / step)));
    if (activeImageRef.current !== next) {
      activeImageRef.current = next;
      setActiveImage(next);
    }
  }, []);

  const onGalleryWheel = useCallback((event: ReactWheelEvent<HTMLElement>) => {
    if (window.innerWidth <= 800 || Math.abs(event.deltaX) <= Math.abs(event.deltaY) || Math.abs(event.deltaX) < 12) return;
    const now = performance.now();
    if (now - lastGalleryWheelRef.current < 320) return;
    lastGalleryWheelRef.current = now;
    selectImage(activeImageRef.current + (event.deltaX > 0 ? 1 : -1));
  }, [selectImage]);

  const openLightbox = useCallback((index: number) => {
    const card = galleryCardsRef.current[index];
    if (!card) return;
    lightboxOriginRef.current = photoRect(card);
    lightboxClosingRef.current = false;
    setLightboxEntered(false);
    setOriginalDecoded(false);
    setSelectedImage(galleryImages[index]);
  }, []);

  const closeLightbox = useCallback(() => {
    if (!selectedImage || lightboxClosingRef.current) return;
    lightboxClosingRef.current = true;
    const card = galleryCardsRef.current[galleryImages.indexOf(selectedImage)];
    const media = lightboxMediaRef.current;
    const backdrop = lightboxBackdropRef.current;
    const closeButton = lightboxCloseRef.current;
    const finish = () => {
      setSelectedImage(null);
      window.requestAnimationFrame(() => card?.focus({ preventScroll: true }));
    };
    if (window.innerWidth <= 800 || reducedRef.current || !card || !media || !backdrop) {
      finish();
      return;
    }
    const current = photoRect(media);
    const target = photoRect(card);
    const backdropOpacity = getComputedStyle(backdrop).opacity;
    lightboxOpenAnimationRef.current?.cancel();
    lightboxBackdropAnimationRef.current?.cancel();
    Object.assign(media.style, rectStyles(current, 8));
    backdrop.style.opacity = backdropOpacity;
    const animation = media.animate([rectStyles(current, 8), rectStyles(target, 14)], {
      duration: 280, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards',
    });
    backdrop.animate([{ opacity: backdropOpacity }, { opacity: 0 }], { duration: 260, easing: 'ease-in', fill: 'forwards' });
    closeButton?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' });
    animation.finished.then(finish).catch(() => {});
  }, [selectedImage]);

  useLayoutEffect(() => {
    if (!selectedImage) return;
    const media = lightboxMediaRef.current;
    const backdrop = lightboxBackdropRef.current;
    const closeButton = lightboxCloseRef.current;
    const card = galleryCardsRef.current[galleryImages.indexOf(selectedImage)];
    if (!media || !backdrop || !card) return;
    const thumbnail = card.querySelector('img');
    const ratio = thumbnail?.naturalWidth && thumbnail.naturalHeight ? thumbnail.naturalWidth / thumbnail.naturalHeight : 4 / 3;
    const target = fittedPhotoRect(ratio);
    Object.assign(media.style, rectStyles(target, 8));
    closeButton?.focus({ preventScroll: true });
    const onResize = () => {
      if (lightboxClosingRef.current) return;
      lightboxOpenAnimationRef.current?.cancel();
      lightboxBackdropAnimationRef.current?.cancel();
      Object.assign(media.style, rectStyles(fittedPhotoRect(ratio), 8));
      backdrop.style.opacity = '1';
      setLightboxEntered(true);
    };
    window.addEventListener('resize', onResize);
    if (window.innerWidth <= 800 || reducedRef.current || !lightboxOriginRef.current) {
      setLightboxEntered(true);
      return () => window.removeEventListener('resize', onResize);
    }
    const origin = lightboxOriginRef.current;
    const flight = media.animate([rectStyles(origin, 14), rectStyles(target, 8)], {
      duration: 420, easing: 'cubic-bezier(.2, .7, .2, 1)', fill: 'both',
    });
    const shade = backdrop.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 260, easing: 'ease-out', fill: 'both',
    });
    closeButton?.animate([{ opacity: 0 }, { opacity: 0, offset: .35 }, { opacity: 1 }], {
      duration: 420, easing: 'ease-out', fill: 'both',
    });
    lightboxOpenAnimationRef.current = flight;
    lightboxBackdropAnimationRef.current = shade;
    flight.finished.then(() => {
      if (!lightboxClosingRef.current) setLightboxEntered(true);
    }).catch(() => {});
    return () => window.removeEventListener('resize', onResize);
  }, [selectedImage]);

  useEffect(() => {
    if (!selectedImage) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    let cancelled = false;
    const original = lightboxMediaRef.current?.querySelector('img');
    original?.decode().then(() => {
      if (!cancelled) setOriginalDecoded(true);
    }).catch(() => {});
    return () => {
      cancelled = true;
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [selectedImage]);

  const renderFrame = useCallback((time: number, revealProgress: number) => {
    const elements = elementsRef.current;
    const gallery = galleryRef.current;
    if (!elements || !gallery) return;
    for (const layer of layers) {
      const element = elements.layers.get(layer.id);
      if (!element) continue;
      const { rect, opacity } = interpolate(layer, time);
      const base = layer.svg ? layer.states[1].rect : layer.states[0].rect;
      setStyle(element, 'transform', `translate3d(${rect[0]-base[0]}px,${rect[1]-base[1]}px,0) scale(${rect[2]/base[2]},${rect[3]/base[3]})`);
      setStyle(element, 'opacity', `${opacity}`);
    }

    const { segment, fraction } = sceneSegment(time);
    const endProgress = segment === 2 ? fraction : 0;
    const panelOverlap = 20 * (1 - endProgress);
    setStyle(elements.panel, 'transform', `translate3d(0,${870 * (1 - endProgress) - panelOverlap}px,0) scaleY(${(mix(84, 870, endProgress) + panelOverlap) / 870})`);

    const nav = elements.nav;
    setStyle(nav, 'opacity', `${Math.min(1, time / 3.5)}`);
    setStyle(nav, 'visibility', time > 0.05 ? 'visible' : 'hidden');
    const white = time <= 3.5 ? 0 : time >= 6 ? 255 : Math.round(255 * ((time - 3.5) / 2.5));
    setStyle(nav, 'color', `rgb(${white},${white},${white})`);

    const scrollCue = elements.scrollCue;
    const y = time <= 3.5 ? 1234 : time <= 6 ? mix(1234, 761, (time-3.5)/2.5) : mix(761, -39, (time-6)/3.5);
    setStyle(scrollCue, 'transform', `translate3d(-50%,${y}px,0)`);
    setStyle(scrollCue, 'opacity', `${time < 3.5 ? 0 : time > 8.9 ? 0 : 1}`);

    if (window.innerWidth <= 800) gallery.style.setProperty('--gallery-progress', `${endProgress}`);
    const shouldBeInert = time < 8.7;
    if (gallery.inert !== shouldBeInert) {
      gallery.inert = shouldBeInert;
      gallery.classList.toggle('is-interactive', !shouldBeInert);
    }
    setStyle(elements.info, 'transform', `translate3d(0,${753 * (1 - endProgress)}px,0)`);
    setStyle(elements.info, 'opacity', `${endProgress}`);
    setStyle(elements.carousel, 'transform', `translate3d(0,${650 * (1 - endProgress)}px,0)`);
    setStyle(elements.carousel, 'opacity', `${endProgress}`);

    const path = revealPathRef.current;
    if (path) {
      const progress = reducedRef.current ? 0 : revealProgress;
      const edge = 100 * (1 - progress);
      const crest = Math.max(0, edge - 90 * Math.sin(Math.PI * progress));
      const d = `M 0 100 V ${edge.toFixed(2)} C 25 ${edge.toFixed(2)} 25 ${crest.toFixed(2)} 50 ${crest.toFixed(2)} C 75 ${crest.toFixed(2)} 75 ${edge.toFixed(2)} 100 ${edge.toFixed(2)} V 100 Z`;
      if (path.getAttribute('d') !== d) path.setAttribute('d', d);
    }
  }, []);

  const syncScroll = useCallback(() => {
    if (!readyRef.current) return;
    const rawTime = Math.min(endpoints[3], openingTime + window.scrollY / scrollRangeRef.current * (endpoints[3] - openingTime));
    const revealStart = scrollRangeRef.current + galleryHoldRangeRef.current;
    const revealProgress = revealRangeRef.current ? Math.min(1, Math.max(0, (window.scrollY - revealStart) / revealRangeRef.current)) : 0;
    let state = 0;
    if (rawTime >= endpoints[1] - 0.01) {
      state = 1;
      for (let index = 2; index < endpoints.length; index += 1) {
        if (Math.abs(endpoints[index] - rawTime) < Math.abs(endpoints[state] - rawTime)) state = index;
      }
    }
    const time = reducedRef.current ? (state === 0 ? openingTime : endpoints[state]) : rawTime;
    targetTimeRef.current = time;
    targetRevealRef.current = revealProgress;
    if (reducedRef.current || !hasRenderedRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      window.clearTimeout(fallbackRef.current);
      frameRef.current = 0;
      hasRenderedRef.current = true;
      renderFrame(time, revealProgress);
      renderedTimeRef.current = time;
      renderedRevealRef.current = revealProgress;
    } else if (Math.abs(time - renderedTimeRef.current) > 0.0001 || Math.abs(revealProgress - renderedRevealRef.current) > 0.0001) {
      scheduleFrameRef.current();
    }
    if (rawTime > 5.5 && !galleryReadyRef.current) {
      galleryReadyRef.current = true;
      setGalleryReady(true);
    }
    setCurrentState(state);
  }, [renderFrame]);

  const goTo = useCallback((index: number) => {
    const next = Math.max(0, Math.min(3, index));
    window.scrollTo({
      top: scrollRangeRef.current * Math.max(0, endpoints[next] - openingTime) / (endpoints[3] - openingTime),
      behavior: reducedRef.current ? 'instant' : 'smooth',
    });
  }, []);

  const replay = useCallback(() => {
    setSelectedImage(null);
    goTo(0);
  }, [goTo]);

  const navigateToSection = useCallback((event: ReactMouseEvent<HTMLAnchorElement>) => {
    const hash = event.currentTarget.hash;
    const target = document.getElementById(hash.slice(1));
    if (!target) return;
    event.preventDefault();
    const top = window.scrollY + target.getBoundingClientRect().top;
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
    if (top > scrollRangeRef.current + galleryHoldRangeRef.current + 1) {
      galleryArrivalRef.current = 'released';
      window.clearTimeout(galleryArrivalTimerRef.current);
      window.removeEventListener('wheel', returningGalleryWheelRef.current);
    }
    window.cancelAnimationFrame(backToTopFrameRef.current);
    backToTopFrameRef.current = 0;
    window.clearTimeout(navigationTimeoutRef.current);
    navigationTargetRef.current = Math.abs(window.scrollY - top) > 2 ? target : null;
    if (navigationTargetRef.current) revealSnappingRef.current = true;
    if (hash === '#top' && !reducedRef.current && navigationTargetRef.current) {
      const start = window.scrollY;
      const duration = Math.min(1600, Math.max(700, Math.abs(start - top) * .16));
      const started = performance.now();
      const step = (now: number) => {
        if (navigationTargetRef.current !== target) return;
        const progress = Math.min(1, (now - started) / duration);
        const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
        window.scrollTo({ top: start + (top - start) * eased, behavior: 'instant' });
        if (progress < 1) backToTopFrameRef.current = window.requestAnimationFrame(step);
        else {
          backToTopFrameRef.current = 0;
          navigationTargetRef.current = null;
          revealSnappingRef.current = false;
        }
      };
      backToTopFrameRef.current = window.requestAnimationFrame(step);
    } else {
      if (navigationTargetRef.current) {
        navigationTimeoutRef.current = window.setTimeout(() => {
          navigationTargetRef.current = null;
          revealSnappingRef.current = false;
        }, 4000);
      }
      window.scrollTo({ top, behavior: reducedRef.current ? 'instant' : 'smooth' });
    }
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    const gallery = galleryRef.current;
    if (!scene || !gallery) return;
    if (window.innerWidth <= 800) selectImage(0);
    else renderCarousel(activeImageRef.current, false);
    const panel = scene.querySelector<HTMLElement>('.black-panel');
    const nav = scene.querySelector<HTMLElement>('.navigation');
    const scrollCue = scene.querySelector<HTMLElement>('.scroll-cue');
    const info = gallery.querySelector<HTMLElement>('.gallery-info');
    const carousel = gallery.querySelector<HTMLElement>('.gallery-carousel');
    if (!panel || !nav || !scrollCue || !info || !carousel) throw new Error('Scene elements are missing');
    elementsRef.current = {
      layers: new Map(Array.from(scene.querySelectorAll<HTMLElement>('[data-layer]'), (element) => [element.dataset.layer ?? '', element])),
      panel, nav, scrollCue, info, carousel,
    };
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = media.matches;
    setReducedMotion(media.matches);
    const flushFrame = () => {
      window.clearTimeout(fallbackRef.current);
      fallbackRef.current = undefined;
      frameRef.current = 0;
      renderFrame(targetTimeRef.current, targetRevealRef.current);
      renderedTimeRef.current = targetTimeRef.current;
      renderedRevealRef.current = targetRevealRef.current;
    };
    scheduleFrameRef.current = () => {
      if (frameRef.current) return;
      frameRef.current = window.requestAnimationFrame(flushFrame);
      fallbackRef.current = window.setTimeout(() => {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
        flushFrame();
      }, 50);
    };
    const onMotionChange = () => {
      reducedRef.current = media.matches;
      setReducedMotion(media.matches);
      if (media.matches) {
        galleryArrivalRef.current = 'released';
        window.clearTimeout(galleryArrivalTimerRef.current);
        window.removeEventListener('wheel', returningGalleryWheelRef.current);
        revealSnappingRef.current = false;
      }
      syncScroll();
    };
    media.addEventListener('change', onMotionChange);
    const onReturningGalleryWheel = (event: WheelEvent) => {
      if (galleryArrivalRef.current === 'returning') event.preventDefault();
    };
    returningGalleryWheelRef.current = onReturningGalleryWheel;
    const startFirstRevealReturn = () => {
      if (galleryArrivalRef.current !== 'preview') return;
      const revealStart = scrollRangeRef.current + galleryHoldRangeRef.current;
      if (window.scrollY <= revealStart + 1) {
        galleryArrivalRef.current = 'released';
        return;
      }
      galleryArrivalRef.current = 'returning';
      revealSnappingRef.current = true;
      window.addEventListener('wheel', onReturningGalleryWheel, { passive: false });
      window.scrollTo({ top: revealStart, behavior: 'smooth' });
    };
    const scheduleFirstRevealReturn = () => {
      window.clearTimeout(galleryArrivalTimerRef.current);
      galleryArrivalTimerRef.current = window.setTimeout(startFirstRevealReturn, 260);
    };
    const onGalleryArrivalWheel = (event: WheelEvent) => {
      if (window.innerWidth <= 800 || reducedRef.current || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (galleryArrivalRef.current === 'armed' && event.deltaY > 0) {
        galleryArrivalIntentRef.current = true;
      } else if (galleryArrivalRef.current === 'preview') {
        scheduleFirstRevealReturn();
      }
    };
    const onGalleryArrivalKey = (event: KeyboardEvent) => {
      if (window.innerWidth <= 800 || reducedRef.current || event.target instanceof HTMLElement && event.target.closest('button, a, summary, input, textarea, select')) return;
      if (event.key !== 'PageDown' && event.key !== 'ArrowDown' && event.code !== 'Space') return;
      if (galleryArrivalRef.current === 'returning') {
        event.preventDefault();
      } else if (galleryArrivalRef.current === 'preview') {
        scheduleFirstRevealReturn();
      } else if (galleryArrivalRef.current === 'armed') {
        galleryArrivalIntentRef.current = true;
      }
    };
    const onScroll = () => {
      const position = window.scrollY;
      const previous = lastScrollYRef.current;
      if (position <= 1) {
        galleryArrivalRef.current = 'armed';
        galleryArrivalIntentRef.current = false;
        window.clearTimeout(galleryArrivalTimerRef.current);
        window.removeEventListener('wheel', onReturningGalleryWheel);
      }
      const revealStart = scrollRangeRef.current + galleryHoldRangeRef.current;
      const revealEnd = revealStart + revealRangeRef.current;
      if (readyRef.current && !reducedRef.current && window.innerWidth > 800 && !navigationTargetRef.current && !revealSnappingRef.current) {
        if (galleryArrivalRef.current === 'armed' && galleryArrivalIntentRef.current && previous <= revealStart + 1 && position > revealStart + 1) {
          galleryArrivalRef.current = 'preview';
          galleryArrivalIntentRef.current = false;
        }
        if (galleryArrivalRef.current === 'preview') {
          scheduleFirstRevealReturn();
          if (position > revealEnd) {
            lastScrollYRef.current = revealEnd;
            window.scrollTo({ top: revealEnd, behavior: 'instant' });
            syncScroll();
            return;
          }
        }
      }
      lastScrollYRef.current = position;
      syncScroll();
      if (galleryArrivalRef.current === 'preview' || galleryArrivalRef.current === 'returning') return;
      if (!readyRef.current || reducedRef.current || revealSnappingRef.current || navigationTargetRef.current || revealRangeRef.current <= 0) return;
      const progress = (position - revealStart) / revealRangeRef.current;
      if (position > previous + 1 && progress >= .1 && progress < 1) {
        revealSnappingRef.current = true;
        window.scrollTo({ top: revealEnd, behavior: 'smooth' });
      } else if (position < previous - 1 && progress <= .9 && progress > 0) {
        revealSnappingRef.current = true;
        window.scrollTo({ top: revealStart, behavior: 'smooth' });
      }
    };
    const onScrollEnd = () => {
      const revealStart = scrollRangeRef.current + galleryHoldRangeRef.current;
      if (galleryArrivalRef.current === 'preview' && !navigationTargetRef.current) {
        if (window.scrollY <= revealStart + 1) {
          galleryArrivalRef.current = 'released';
          window.clearTimeout(galleryArrivalTimerRef.current);
        } else {
          scheduleFirstRevealReturn();
        }
        syncScroll();
        return;
      }
      if (galleryArrivalRef.current === 'returning' && !navigationTargetRef.current) {
        if (Math.abs(window.scrollY - revealStart) < 3) {
          galleryArrivalRef.current = 'released';
          revealSnappingRef.current = false;
          window.removeEventListener('wheel', onReturningGalleryWheel);
          syncScroll();
        }
        return;
      }
      const target = navigationTargetRef.current;
      if (target && Math.abs(target.getBoundingClientRect().top) > 64) {
        syncScroll();
        return;
      }
      navigationTargetRef.current = null;
      window.clearTimeout(navigationTimeoutRef.current);
      revealSnappingRef.current = false;
      if (target) {
        const offset = target.getBoundingClientRect().top;
        if (Math.abs(offset) > 1 && Math.abs(offset) < 64) window.scrollTo({ top: window.scrollY + offset, behavior: 'instant' });
      }
      syncScroll();
      const revealProgress = revealRangeRef.current ? (window.scrollY - revealStart) / revealRangeRef.current : 0;
      if (!target && !reducedRef.current && revealProgress > 0 && revealProgress < .1) {
        revealSnappingRef.current = true;
        window.scrollTo({ top: revealStart, behavior: 'smooth' });
      }
    };
    const cancelBackToTop = () => {
      if (!backToTopFrameRef.current) return;
      window.cancelAnimationFrame(backToTopFrameRef.current);
      backToTopFrameRef.current = 0;
      navigationTargetRef.current = null;
      window.clearTimeout(navigationTimeoutRef.current);
      revealSnappingRef.current = false;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scrollend', onScrollEnd);
    window.addEventListener('wheel', onGalleryArrivalWheel, { passive: true });
    window.addEventListener('keydown', onGalleryArrivalKey);
    window.addEventListener('wheel', cancelBackToTop, { passive: true });
    window.addEventListener('touchstart', cancelBackToTop, { passive: true });
    window.addEventListener('keydown', cancelBackToTop);
    const updateScale = () => {
      if (window.innerWidth <= 800) {
        galleryArrivalRef.current = 'released';
        window.clearTimeout(galleryArrivalTimerRef.current);
        window.removeEventListener('wheel', onReturningGalleryWheel);
      }
      const scale = Math.max(window.innerWidth / 1280, window.innerHeight / 832);
      document.documentElement.style.setProperty('--scene-scale', `${scale}`);
      revealRangeRef.current = window.innerWidth > 800 ? window.innerHeight : 0;
      galleryHoldRangeRef.current = window.innerWidth > 800 ? window.innerHeight * .35 : 0;
      scrollRangeRef.current = Math.max(1, (journeyRef.current?.offsetHeight ?? window.innerHeight) - window.innerHeight - revealRangeRef.current - galleryHoldRangeRef.current);
      renderCarousel(activeImageRef.current, false);
      onScroll();
    };
    updateScale();
    window.addEventListener('resize', updateScale);

    let cancelled = false;
    let galleryIdle: number | undefined;
    let galleryFallback: number | undefined;
    const prepareGallery = () => {
      if (cancelled || galleryReadyRef.current) return;
      galleryReadyRef.current = true;
      setGalleryReady(true);
    };
    const sceneImages = Array.from(scene.querySelectorAll<HTMLImageElement>('img'));
    Promise.all(sceneImages.map((image) => image.decode().catch(() => {}))).then(() => {
      if (cancelled) return;
      readyRef.current = true;
      setReady(true);
      syncScroll();
      if (typeof window.requestIdleCallback === 'function') {
        galleryIdle = window.requestIdleCallback(prepareGallery, { timeout: 1200 });
      } else {
        galleryFallback = window.setTimeout(prepareGallery, 300);
      }
    });
    return () => {
      cancelled = true;
      elementsRef.current = null;
      readyRef.current = false;
      hasRenderedRef.current = false;
      window.cancelAnimationFrame(frameRef.current);
      window.clearTimeout(fallbackRef.current);
      window.clearTimeout(navigationTimeoutRef.current);
      window.cancelAnimationFrame(backToTopFrameRef.current);
      frameRef.current = 0;
      if (galleryIdle !== undefined) window.cancelIdleCallback(galleryIdle);
      window.clearTimeout(galleryFallback);
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('scrollend', onScrollEnd);
      window.removeEventListener('wheel', onGalleryArrivalWheel);
      window.removeEventListener('wheel', onReturningGalleryWheel);
      window.removeEventListener('keydown', onGalleryArrivalKey);
      window.clearTimeout(galleryArrivalTimerRef.current);
      window.removeEventListener('wheel', cancelBackToTop);
      window.removeEventListener('touchstart', cancelBackToTop);
      window.removeEventListener('keydown', cancelBackToTop);
      media.removeEventListener('change', onMotionChange);
    };
  }, [renderCarousel, renderFrame, selectImage, syncScroll]);

  useEffect(() => {
    if (!ready) return;
    const onKey = (event: KeyboardEvent) => {
      if (selectedImage) {
        if (event.key === 'Escape') closeLightbox();
        return;
      }
      if (event.target instanceof HTMLElement && event.target.closest('button, a, summary, input, textarea, select')) return;
      if (window.scrollY > scrollRangeRef.current + 2) return;
      if (event.key === 'Enter') { event.preventDefault(); goTo(Math.min(3, currentState + 1)); }
      if (event.key === 'Backspace' || event.key === 'ArrowLeft') { event.preventDefault(); window.scrollBy({ top: -window.innerHeight * 0.75, behavior: 'smooth' }); }
      if (event.key.toLowerCase() === 'r') replay();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [ready, goTo, replay, selectedImage, currentState, closeLightbox]);

  return (
    <>
    <div className="journey" id="top" ref={journeyRef}>
    <section className={`experience ${ready ? 'is-ready' : ''}`} aria-label="Explore parallax journey">
      <div className="scene-stage" ref={sceneRef}>
        {layers.map((layer) => {
          const [x,y,width,height] = (layer.svg ? layer.states[1] : layer.states[0]).rect;
          return (
            <div key={layer.id} className={`scene-layer ${layer.crop ? 'crop-cloud' : ''} ${layer.svg ? 'vector-layer' : ''}`} data-layer={layer.id}
              style={{ left:x, top:y, width, height, opacity:layer.states[0].opacity ?? 1 }}>
              <img src={layer.src} alt="" draggable="false" />
            </div>
          );
        })}
        <div className="black-panel" />
        <nav className="navigation" aria-label="Main navigation">
          <button className="nav-home" type="button" onClick={replay}>Home</button>
          <a href="#experiences" onClick={navigateToSection}>Experiences</a>
          <a href="#plan" onClick={navigateToSection}>Plan your visit</a>
        </nav>
        <div className="scroll-cue"><img src="/assets/imgBasilIconsOutlineOutlineDevicesMouseAlt.svg" alt="" /><span>Scroll</span></div>
      </div>

      <section className="gallery-stage" ref={galleryRef} aria-label="Mountain gallery" aria-roledescription="carousel" inert>
        <div className="gallery-layout">
          <div className="gallery-info">
            <h1>Beautiful alpine days, made<br className="desktop-break" /> for the moments in between.</h1>
            <p>Go beyond the view. Discover quiet trails, open skies, and your own pace at Aster Ridge.</p>
          </div>
          <div className="gallery-carousel">
            <section className="gallery-viewport" aria-label="Gallery photos" onPointerDown={onGalleryPointerDown} onPointerMove={onGalleryPointerMove} onPointerUp={onGalleryPointerEnd} onPointerCancel={onGalleryPointerEnd} onScroll={onGalleryScroll} onWheel={onGalleryWheel}
              onKeyDown={(event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); selectImage(activeImageRef.current + (event.key === 'ArrowRight' ? 1 : -1)); } }}
              onClickCapture={(event) => { if (suppressGalleryClickRef.current) { event.preventDefault(); event.stopPropagation(); suppressGalleryClickRef.current = false; } }}>
              <div className="gallery-track">
                {galleryImages.map((image, index) => (
                  <button type="button" key={image.src} className={`gallery-card ${image.className} ${activeImage === index ? 'is-active' : ''} ${selectedImage === image ? 'is-viewing' : ''}`}
                    ref={(element) => { galleryCardsRef.current[index] = element; }}
                    aria-label={`View photo ${index + 1} of ${galleryImages.length}: ${image.label}`} onClick={() => openLightbox(index)}>
                    {galleryReady && <img src={image.thumb} alt={image.label} draggable="false" decoding="async" />}
                  </button>
                ))}
              </div>
            </section>
            <div className="gallery-controls">
              <span className="gallery-count">0{activeImage + 1} <span>/</span> 0{galleryImages.length}</span>
              <span className="gallery-scroll-hint">Scroll to explore <span aria-hidden="true">↓</span></span>
              <div className="gallery-arrows">
                <button type="button" onClick={() => selectImage(activeImage - 1)} aria-label="Previous photo">←</button>
                <button type="button" onClick={() => selectImage(activeImage + 1)} aria-label="Next photo">→</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {ready && currentState > 0 && currentState < 3 && <button type="button" className="back-button" onClick={() => goTo(currentState - 1)} aria-label="Previous scene">←</button>}
      {ready && reducedMotion && currentState === 0 && <button type="button" className="continue-button" onClick={() => goTo(1)}>Continue</button>}
      {ready && reducedMotion && currentState === 2 && <button type="button" className="continue-button continue-gallery" onClick={() => goTo(3)}>View gallery</button>}
      <div className="sr-only" role="status" aria-live="polite">{ready ? `Scene ${currentState + 1} of 4` : 'Loading scene'}</div>
      {!ready && <div className="loading" role="status">Loading the journey…</div>}
      {selectedImage && createPortal(
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={selectedImage.label}
          onKeyDown={(event) => { if (event.key === 'Tab') { event.preventDefault(); lightboxCloseRef.current?.focus(); } }}>
          <button type="button" className="lightbox-backdrop" ref={lightboxBackdropRef} onClick={closeLightbox} aria-label="Close photo backdrop" />
          <div className="lightbox-media" ref={lightboxMediaRef}>
            <div className="lightbox-preview" style={{ backgroundImage: `url(${selectedImage.thumb})` }} />
            <img src={selectedImage.src} alt={selectedImage.label} className={lightboxEntered && originalDecoded ? 'is-loaded' : ''} />
          </div>
          <button type="button" className="lightbox-close" ref={lightboxCloseRef} onClick={closeLightbox} aria-label="Close image">×</button>
        </div>, document.body
      )}
    </section>
    </div>
    <div className="destination-reveal">
      <svg className="destination-wave" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path ref={revealPathRef} fill="#f1efe8" d="M 0 100 V 100 C 25 100 25 100 50 100 C 75 100 75 100 100 100 V 100 Z" />
      </svg>
      <DestinationContent onNavigate={navigateToSection} />
    </div>
    </>
  );
}

export default App;
