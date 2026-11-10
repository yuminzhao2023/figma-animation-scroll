import { useCallback, useEffect, useRef, useState } from 'react';
import { endpoints, interpolate, layers, mix, openingTime, sceneSegment } from './scene';

const galleryImages = [
  { src: '/assets/imgPhoto1.webp', thumb: '/assets/imgPhoto1-thumb.webp', label: 'Two hikers in a misty mountain pass', className: 'main left' },
  { src: '/assets/imgPhoto.webp', thumb: '/assets/imgPhoto-thumb.webp', label: 'Hiker facing snowy peaks', className: 'main right' },
  { src: '/assets/imgPhoto2.webp', thumb: '/assets/imgPhoto2-thumb.webp', label: 'Mountain valley under cloud', className: 'side left' },
  { src: '/assets/imgPhoto2.webp', thumb: '/assets/imgPhoto2-thumb.webp', label: 'Mountain valley beneath the clouds', className: 'side right' },
];

type RenderElements = {
  layers: Map<string, HTMLElement>;
  panel: HTMLElement;
  nav: HTMLElement;
  scrollCue: HTMLElement;
  info: HTMLElement;
  cards: HTMLElement[];
};

function setStyle(element: HTMLElement, property: 'transform' | 'opacity' | 'color' | 'visibility', value: string) {
  if (element.style[property] !== value) element.style[property] = value;
}

function App() {
  const journeyRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<RenderElements | null>(null);
  const noticeTimerRef = useRef<number | undefined>(undefined);
  const scrollRangeRef = useRef(1);
  const galleryReadyRef = useRef(false);
  const targetTimeRef = useRef(openingTime);
  const renderedTimeRef = useRef(openingTime);
  const frameRef = useRef(0);
  const fallbackRef = useRef<number | undefined>(undefined);
  const hasRenderedRef = useRef(false);
  const scheduleFrameRef = useRef<() => void>(() => {});
  const reducedRef = useRef(false);
  const readyRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [galleryReady, setGalleryReady] = useState(false);
  const [currentState, setCurrentState] = useState(0);
  const [notice, setNotice] = useState('');
  const [selectedImage, setSelectedImage] = useState<(typeof galleryImages)[number] | null>(null);

  const renderFrame = useCallback((time: number) => {
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
    const shouldBeInert = time <= 9.45;
    if (gallery.inert !== shouldBeInert) {
      gallery.inert = shouldBeInert;
      gallery.classList.toggle('is-interactive', !shouldBeInert);
    }
    setStyle(elements.info, 'transform', `translate3d(0,${753 * (1 - endProgress)}px,0)`);
    setStyle(elements.info, 'opacity', `${endProgress}`);
    elements.cards.forEach((card) => {
      const side = card.classList.contains('side');
      setStyle(card, 'transform', `translate3d(0,${494 * (1 - endProgress)}px,0)`);
      setStyle(card, 'opacity', `${endProgress * (side ? 0.6 : 1)}`);
    });
  }, []);

  const syncScroll = useCallback(() => {
    if (!readyRef.current) return;
    const rawTime = Math.min(endpoints[3], openingTime + window.scrollY / scrollRangeRef.current * (endpoints[3] - openingTime));
    let state = 0;
    if (rawTime >= endpoints[1] - 0.01) {
      state = 1;
      for (let index = 2; index < endpoints.length; index += 1) {
        if (Math.abs(endpoints[index] - rawTime) < Math.abs(endpoints[state] - rawTime)) state = index;
      }
    }
    const time = reducedRef.current ? (state === 0 ? openingTime : endpoints[state]) : rawTime;
    targetTimeRef.current = time;
    if (reducedRef.current || !hasRenderedRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      window.clearTimeout(fallbackRef.current);
      frameRef.current = 0;
      hasRenderedRef.current = true;
      renderFrame(time);
      renderedTimeRef.current = time;
    } else if (Math.abs(time - renderedTimeRef.current) > 0.0001) {
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

  useEffect(() => {
    const scene = sceneRef.current;
    const gallery = galleryRef.current;
    if (!scene || !gallery) return;
    elementsRef.current = {
      layers: new Map(Array.from(scene.querySelectorAll<HTMLElement>('[data-layer]'), (element) => [element.dataset.layer!, element])),
      panel: scene.querySelector<HTMLElement>('.black-panel')!,
      nav: scene.querySelector<HTMLElement>('.navigation')!,
      scrollCue: scene.querySelector<HTMLElement>('.scroll-cue')!,
      info: gallery.querySelector<HTMLElement>('.gallery-info')!,
      cards: Array.from(gallery.querySelectorAll<HTMLElement>('.gallery-card')),
    };
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = media.matches;
    setReducedMotion(media.matches);
    const flushFrame = () => {
      window.clearTimeout(fallbackRef.current);
      fallbackRef.current = undefined;
      frameRef.current = 0;
      renderFrame(targetTimeRef.current);
      renderedTimeRef.current = targetTimeRef.current;
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
      syncScroll();
    };
    media.addEventListener('change', onMotionChange);
    const onScroll = () => syncScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scrollend', onScroll);
    const updateScale = () => {
      const scale = Math.max(window.innerWidth / 1280, window.innerHeight / 832);
      document.documentElement.style.setProperty('--scene-scale', `${scale}`);
      scrollRangeRef.current = Math.max(1, (journeyRef.current?.offsetHeight ?? window.innerHeight) - window.innerHeight);
      onScroll();
    };
    updateScale();
    window.addEventListener('resize', updateScale);

    const keyAssets = [
      '/assets/imgBgSky.webp', '/assets/imgMountains.webp', '/assets/imgClouds01.webp',
      '/assets/imgClouds03.webp', '/assets/imgClouds05.webp', '/assets/imgClouds11.webp',
      '/assets/imgExplore.svg', '/assets/imgCave.webp', '/assets/imgExplorer.webp',
    ];
    let cancelled = false;
    let galleryIdle: number | undefined;
    let galleryFallback: number | undefined;
    const prepareGallery = () => {
      if (cancelled || galleryReadyRef.current) return;
      galleryReadyRef.current = true;
      setGalleryReady(true);
    };
    Promise.all(keyAssets.map((src) => new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => { img.decode?.().catch(() => {}).finally(resolve) ?? resolve(); };
      img.onerror = () => resolve();
      img.src = src;
    }))).then(() => {
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
      frameRef.current = 0;
      if (galleryIdle !== undefined) window.cancelIdleCallback(galleryIdle);
      window.clearTimeout(galleryFallback);
      window.clearTimeout(noticeTimerRef.current);
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('scrollend', onScroll);
      media.removeEventListener('change', onMotionChange);
    };
  }, [renderFrame, syncScroll]);

  useEffect(() => {
    if (!ready) return;
    const onKey = (event: KeyboardEvent) => {
      if (selectedImage) {
        if (event.key === 'Escape') setSelectedImage(null);
        return;
      }
      if (event.target instanceof HTMLElement && event.target.closest('button') && [' ', 'Enter'].includes(event.key)) return;
      if (event.key === 'Enter') { event.preventDefault(); goTo(Math.min(3, currentState + 1)); }
      if (event.key === 'Backspace' || event.key === 'ArrowLeft') { event.preventDefault(); window.scrollBy({ top: -window.innerHeight * 0.75, behavior: 'smooth' }); }
      if (event.key.toLowerCase() === 'r') replay();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [ready, goTo, replay, selectedImage, currentState]);

  const unavailable = (name: string) => {
    setNotice(`${name} is not part of this design preview.`);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(''), 3000);
  };

  return (
    <div className="journey" ref={journeyRef}>
    <main className={`experience ${ready ? 'is-ready' : ''}`} aria-label="Explore parallax journey">
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
          <button type="button" onClick={() => unavailable('Services')}>Services</button>
          <button type="button" onClick={() => unavailable('Pricing Plan')}>Pricing Plan</button>
        </nav>
        <div className="scroll-cue"><img src="/assets/imgBasilIconsOutlineOutlineDevicesMouseAlt.svg" alt="" /><span>Scroll</span></div>
      </div>

      <section className="gallery-stage" ref={galleryRef} aria-label="Mountain gallery" inert>
        <div className="gallery-layout">
          <div className="gallery-info">
            <h1>Beautiful parallax designed<br className="desktop-break" /> to inspire your creativity.</h1>
            <p>Etiam id facilisis erat, posuere bibendum nulla. Praesent nec ex dsr. Donec suscipit sed ligula ac cursus. Sed quis gravida elit.</p>
          </div>
          {galleryImages.map((image, index) => (
            <button type="button" key={index} className={`gallery-card ${image.className}`} aria-label={`View photo: ${image.label}`} onClick={() => setSelectedImage(image)}>
              {galleryReady && <img src={image.thumb} alt={image.label} draggable="false" decoding="async" />}
            </button>
          ))}
        </div>
      </section>

      {ready && currentState === 3 && <button type="button" className="replay-button" onClick={replay}>Replay <span aria-hidden="true">↺</span></button>}
      {ready && currentState > 0 && currentState < 3 && <button type="button" className="back-button" onClick={() => goTo(currentState - 1)} aria-label="Previous scene">←</button>}
      {ready && reducedMotion && currentState === 0 && <button type="button" className="continue-button" onClick={() => goTo(1)}>Continue</button>}
      {ready && reducedMotion && currentState === 2 && <button type="button" className="continue-button continue-gallery" onClick={() => goTo(3)}>View gallery</button>}
      <div className="sr-only" role="status" aria-live="polite">{notice || (ready ? `Scene ${currentState + 1} of 4` : 'Loading scene')}</div>
      {notice && <div className="notice" role="status">{notice}</div>}
      {!ready && <div className="loading" role="status">Loading the journey…</div>}
      {selectedImage && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={selectedImage.label} onClick={() => setSelectedImage(null)}>
          <button type="button" className="lightbox-close" onClick={() => setSelectedImage(null)} aria-label="Close image">×</button>
          <img src={selectedImage.src} alt={selectedImage.label} onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </main>
    </div>
  );
}

export default App;
