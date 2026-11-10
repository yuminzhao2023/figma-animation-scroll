import { useCallback, useEffect, useRef, useState } from 'react';
import { endpoints, interpolate, layers, mix, sceneSegment } from './scene';

const galleryImages = [
  { src: '/assets/imgPhoto1.webp', thumb: '/assets/imgPhoto1-thumb.webp', label: 'Two hikers in a misty mountain pass', className: 'main left' },
  { src: '/assets/imgPhoto.webp', thumb: '/assets/imgPhoto-thumb.webp', label: 'Hiker facing snowy peaks', className: 'main right' },
  { src: '/assets/imgPhoto2.webp', thumb: '/assets/imgPhoto2-thumb.webp', label: 'Mountain valley under cloud', className: 'side left' },
  { src: '/assets/imgPhoto2.webp', thumb: '/assets/imgPhoto2-thumb.webp', label: 'Mountain valley beneath the clouds', className: 'side right' },
];

function bezier(t: number, x1: number, y1: number, x2: number, y2: number) {
  let low = 0;
  let high = 1;
  let u = t;
  for (let i = 0; i < 12; i += 1) {
    u = (low + high) / 2;
    const x = 3 * (1-u) * (1-u) * u * x1 + 3 * (1-u) * u * u * x2 + u * u * u;
    if (x < t) low = u; else high = u;
  }
  return 3 * (1-u) * (1-u) * u * y1 + 3 * (1-u) * u * u * y2 + u * u * u;
}

function ease(t: number, destination: number) {
  return destination === 3 ? bezier(t, 0, 0, 0.58, 1) : bezier(t, 0.42, 0, 0.58, 1);
}

function App() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);
  const noticeTimerRef = useRef<number | undefined>(undefined);
  const timeRef = useRef(0);
  const destinationRef = useRef(0);
  const reducedRef = useRef(false);
  const readyRef = useRef(false);
  const lastInputRef = useRef(0);
  const touchStartRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [galleryReady, setGalleryReady] = useState(false);
  const [currentState, setCurrentState] = useState(0);
  const [notice, setNotice] = useState('');
  const [selectedImage, setSelectedImage] = useState<(typeof galleryImages)[number] | null>(null);

  const renderFrame = useCallback((time: number) => {
    const scene = sceneRef.current;
    const gallery = galleryRef.current;
    if (!scene || !gallery) return;
    for (const layer of layers) {
      const element = scene.querySelector<HTMLElement>(`[data-layer="${layer.id}"]`);
      if (!element) continue;
      const { rect, opacity } = interpolate(layer, time);
      const base = layer.svg ? layer.states[1].rect : layer.states[0].rect;
      element.style.transform = `translate3d(${rect[0]-base[0]}px,${rect[1]-base[1]}px,0) scale(${rect[2]/base[2]},${rect[3]/base[3]})`;
      element.style.opacity = `${opacity}`;
    }

    const { segment, fraction } = sceneSegment(time);
    const endProgress = segment === 2 ? fraction : 0;
    const panel = scene.querySelector<HTMLElement>('.black-panel');
    if (panel) {
      panel.style.top = `${mix(930, 60, endProgress)}px`;
      panel.style.height = `${mix(84, 870, endProgress)}px`;
    }

    const nav = scene.querySelector<HTMLElement>('.navigation');
    if (nav) {
      nav.style.opacity = `${Math.min(1, time / 3.5)}`;
      nav.style.visibility = time > 0.05 ? 'visible' : 'hidden';
      const white = time <= 3.5 ? 0 : time >= 6 ? 255 : Math.round(255 * ((time - 3.5) / 2.5));
      nav.style.color = `rgb(${white},${white},${white})`;
    }

    const scrollCue = scene.querySelector<HTMLElement>('.scroll-cue');
    if (scrollCue) {
      const y = time <= 3.5 ? mix(1234, 1234, time / 3.5) : time <= 6 ? mix(1234, 761, (time-3.5)/2.5) : mix(761, -39, (time-6)/3.5);
      scrollCue.style.top = `${y}px`;
      scrollCue.style.opacity = `${time < 3.5 ? 0 : time > 8.9 ? 0 : 1}`;
    }

    gallery.style.setProperty('--gallery-progress', `${endProgress}`);
    gallery.inert = time <= 9.45;
    gallery.classList.toggle('is-interactive', time > 9.45);
    const info = gallery.querySelector<HTMLElement>('.gallery-info');
    if (info) {
      info.style.top = `${mix(868, 115, endProgress)}px`;
      info.style.opacity = `${endProgress}`;
    }
    const cards = gallery.querySelectorAll<HTMLElement>('.gallery-card');
    cards.forEach((card) => {
      const side = card.classList.contains('side');
      card.style.top = `${mix(side ? 910 : 868, side ? 416 : 374, endProgress)}px`;
      card.style.opacity = `${endProgress * (side ? 0.6 : 1)}`;
    });
  }, []);

  const goToRef = useRef<(index: number, autoNext?: boolean) => void>(() => {});

  const goTo = useCallback((index: number, autoNext = false) => {
    if (!readyRef.current) return;
    const next = Math.max(0, Math.min(3, index));
    if (next >= 1) setGalleryReady(true);
    window.cancelAnimationFrame(frameRef.current);
    window.clearTimeout(timerRef.current);
    destinationRef.current = next;
    const from = timeRef.current;
    const to = endpoints[next];

    const finish = () => {
      timeRef.current = to;
      renderFrame(to);
      setCurrentState(next);
      if (autoNext && next === 2 && !reducedRef.current) {
        timerRef.current = window.setTimeout(() => goToRef.current(3), 15);
      }
    };

    if (reducedRef.current || Math.abs(to - from) < 0.001) {
      finish();
      return;
    }

    const start = performance.now();
    const duration = Math.abs(to - from) * 1000;
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const time = mix(from, to, ease(progress, next));
      timeRef.current = time;
      renderFrame(time);
      if (progress < 1) frameRef.current = window.requestAnimationFrame(step);
      else finish();
    };
    frameRef.current = window.requestAnimationFrame(step);
  }, [renderFrame]);
  goToRef.current = goTo;

  const replay = useCallback(() => {
    window.cancelAnimationFrame(frameRef.current);
    window.clearTimeout(timerRef.current);
    timeRef.current = 0;
    destinationRef.current = 0;
    renderFrame(0);
    setCurrentState(0);
    setSelectedImage(null);
    if (!reducedRef.current) timerRef.current = window.setTimeout(() => goToRef.current(1), 400);
  }, [renderFrame]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = media.matches;
    const onMotionChange = () => {
      reducedRef.current = media.matches;
      if (media.matches && readyRef.current) goToRef.current(destinationRef.current);
    };
    media.addEventListener('change', onMotionChange);
    const updateScale = () => {
      const scale = Math.max(window.innerWidth / 1280, window.innerHeight / 832);
      document.documentElement.style.setProperty('--scene-scale', `${scale}`);
    };
    updateScale();
    window.addEventListener('resize', updateScale);

    const keyAssets = [
      '/assets/imgBgSky.webp', '/assets/imgMountains.webp', '/assets/imgClouds01.webp',
      '/assets/imgClouds03.webp', '/assets/imgClouds05.webp', '/assets/imgClouds11.webp',
      '/assets/imgExplore.svg', '/assets/imgCave.webp', '/assets/imgExplorer.webp',
    ];
    let cancelled = false;
    Promise.all(keyAssets.map((src) => new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => { img.decode?.().catch(() => {}).finally(resolve) ?? resolve(); };
      img.onerror = () => resolve();
      img.src = src;
    }))).then(() => {
      if (cancelled) return;
      readyRef.current = true;
      setReady(true);
      renderFrame(0);
      if (import.meta.env.DEV) {
        (window as Window & { __parallaxTestSeek?: (time: number) => void }).__parallaxTestSeek = (time: number) => {
          window.cancelAnimationFrame(frameRef.current);
          window.clearTimeout(timerRef.current);
          timeRef.current = time;
          renderFrame(time);
        };
      }
      if (!reducedRef.current) timerRef.current = window.setTimeout(() => goToRef.current(1), 100);
    });
    return () => {
      cancelled = true;
      readyRef.current = false;
      delete (window as Window & { __parallaxTestSeek?: (time: number) => void }).__parallaxTestSeek;
      window.cancelAnimationFrame(frameRef.current);
      window.clearTimeout(timerRef.current);
      window.clearTimeout(noticeTimerRef.current);
      window.removeEventListener('resize', updateScale);
      media.removeEventListener('change', onMotionChange);
    };
  }, [renderFrame]);

  useEffect(() => {
    if (!ready) return;
    const advance = (direction: 1 | -1) => {
      const now = performance.now();
      if (now - lastInputRef.current < 250) return;
      lastInputRef.current = now;
      const destination = destinationRef.current;
      if (direction > 0 && destination < 3) goTo(destination + 1, destination + 1 === 2);
      if (direction < 0 && destination > 0) goTo(destination - 1);
    };
    const onWheel = (event: WheelEvent) => {
      if (selectedImage) return;
      event.preventDefault();
      if (Math.abs(event.deltaY) > 7) advance(event.deltaY > 0 ? 1 : -1);
    };
    const onKey = (event: KeyboardEvent) => {
      if (selectedImage) {
        if (event.key === 'Escape') setSelectedImage(null);
        return;
      }
      if (event.target instanceof HTMLElement && event.target.closest('button') && [' ', 'Enter'].includes(event.key)) return;
      if (['ArrowDown', 'PageDown', ' ', 'Enter'].includes(event.key)) { event.preventDefault(); advance(1); }
      if (['ArrowUp', 'PageUp', 'ArrowLeft', 'Backspace'].includes(event.key)) { event.preventDefault(); advance(-1); }
      if (event.key.toLowerCase() === 'r') replay();
    };
    const onTouchStart = (event: TouchEvent) => { touchStartRef.current = event.touches[0]?.clientY ?? null; };
    const onTouchEnd = (event: TouchEvent) => {
      if (selectedImage || touchStartRef.current === null) return;
      const delta = touchStartRef.current - (event.changedTouches[0]?.clientY ?? touchStartRef.current);
      touchStartRef.current = null;
      if (Math.abs(delta) > 35) advance(delta > 0 ? 1 : -1);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [ready, goTo, replay, selectedImage]);

  const unavailable = (name: string) => {
    setNotice(`${name} is not part of this design preview.`);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(''), 3000);
  };

  return (
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
      {ready && currentState > 0 && currentState < 3 && <button type="button" className="back-button" onClick={() => goTo(Math.max(0, destinationRef.current - 1))} aria-label="Previous scene">←</button>}
      {ready && reducedRef.current && currentState === 0 && <button type="button" className="continue-button" onClick={() => goTo(1)}>Continue</button>}
      {ready && reducedRef.current && currentState === 2 && <button type="button" className="continue-button continue-gallery" onClick={() => goTo(3)}>View gallery</button>}
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
  );
}

export default App;
