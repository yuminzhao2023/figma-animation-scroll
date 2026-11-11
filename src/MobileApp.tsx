import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DestinationContent from './DestinationContent';
import { galleryImages } from './gallery';
import './mobile.css';

function MobileApp() {
  const [selectedImage, setSelectedImage] = useState<(typeof galleryImages)[number] | null>(null);
  const cardRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const closeImage = useCallback(() => {
    setSelectedImage(null);
    window.requestAnimationFrame(() => cardRef.current?.focus({ preventScroll: true }));
  }, []);

  useEffect(() => {
    if (!selectedImage) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeImage();
      if (event.key === 'Tab') {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedImage, closeImage]);

  return (
    <div className="mobile-page" id="top">
      <section className="mobile-hero" aria-label="Explore Aster Ridge">
        <img className="mobile-hero-sky" src="/assets/imgBgSky-mobile.webp" alt="" decoding="async" />
        <img className="mobile-hero-mountains" src="/assets/imgMountains-mobile.webp" alt="" decoding="async" fetchPriority="high" />
        <nav className="mobile-hero-nav" aria-label="Main navigation">
          <a href="#top" className="mobile-hero-home">Home</a>
          <a href="#experiences">Experiences</a>
          <a href="#plan">Plan your visit</a>
        </nav>
        <img className="mobile-hero-explore" src="/assets/imgExplore.svg" alt="Explore Aster Ridge" />
        <p className="mobile-hero-cue">Scroll to explore <span aria-hidden="true">↓</span></p>
      </section>

      <section className="mobile-gallery" aria-label="Mountain gallery">
        <div className="mobile-gallery-copy">
          <p className="mobile-gallery-eyebrow">ASTER RIDGE / 01</p>
          <h1>Beautiful alpine days, made for the moments in between.</h1>
          <p>Go beyond the view. Discover quiet trails, open skies, and your own pace at Aster Ridge.</p>
        </div>
        <section className="mobile-gallery-track" aria-label="Gallery photos">
          {galleryImages.map((image, index) => (
            <button key={image.src} type="button" className="mobile-gallery-card"
              aria-label={`View photo ${index + 1} of ${galleryImages.length}: ${image.label}`}
              onClick={(event) => { cardRef.current = event.currentTarget; setSelectedImage(image); }}>
              <img src={image.thumb} alt={image.label} loading="lazy" decoding="async" />
            </button>
          ))}
        </section>
        <p className="mobile-gallery-hint">Swipe through the moments <span>01 — 04</span></p>
      </section>

      <div className="destination-reveal">
        <DestinationContent />
      </div>

      {selectedImage && createPortal(
        <div className="mobile-lightbox" role="dialog" aria-modal="true" aria-label={selectedImage.label}>
          <button type="button" className="mobile-lightbox-backdrop" onClick={closeImage} aria-label="Close photo backdrop" />
          <img src={selectedImage.src} alt={selectedImage.label} />
          <button ref={closeRef} type="button" className="mobile-lightbox-close" onClick={closeImage} aria-label="Close image">×</button>
        </div>, document.body,
      )}
    </div>
  );
}

export default MobileApp;
