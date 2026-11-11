import { useState, type MouseEvent } from 'react';
import './destination.css';

const experiences = [
  {
    number: '01',
    type: 'Take it slowly',
    title: 'The Cloudline Walk',
    description: 'A quiet path for unhurried mornings, open skies, and the simple pleasure of seeing what lies around the next bend.',
    image: '/assets/imgPhoto1-thumb.webp',
    alt: 'Two hikers looking across a misty mountain valley',
  },
  {
    number: '02',
    type: 'Find your viewpoint',
    title: 'Moraine Lookout',
    description: 'Follow the rising trail toward a broad mountain panorama. Bring a camera, a warm layer, and time to pause.',
    image: '/assets/imgPhoto-thumb.webp',
    alt: 'Hiker looking toward snow covered mountain peaks',
  },
  {
    number: '03',
    type: 'Go a little further',
    title: 'The High Pass',
    description: 'For the days when you want a longer walk, changing light, and a horizon that seems to go on forever.',
    image: '/assets/imgPhoto2-thumb.webp',
    alt: 'Sunlit snowy peak above a dark alpine forest',
  },
];

const preparation = [
  {
    number: '01',
    title: 'Choose your pace',
    description: 'Pick a walk that matches your group and leave enough daylight for the return. The best mountain day is one you can enjoy all the way through.',
  },
  {
    number: '02',
    title: 'Read the conditions',
    description: 'Check the latest local forecast and trail access before setting out. Mountain weather can change a good plan in an afternoon.',
  },
  {
    number: '03',
    title: 'Carry the essentials',
    description: 'Bring water, layers, sturdy shoes, a charged phone, and a way to carry everything you brought back down.',
  },
];

function DestinationContent({ onNavigate }: { onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void }) {
  const [shareStatus, setShareStatus] = useState('');
  const shareUrl = `${window.location.origin}${window.location.pathname}`;

  const copyLink = async () => {
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        copied = true;
      }
    } catch { /* Use the selection fallback below. */ }
    if (!copied) {
      const input = document.createElement('textarea');
      input.value = shareUrl;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      try { copied = document.execCommand('copy'); }
      catch { copied = false; }
      finally { input.remove(); }
    }
    setShareStatus(copied ? 'Link copied to clipboard.' : 'Copy the page address from your browser.');
  };

  const sharePage = async () => {
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({ title: 'Aster Ridge', text: 'An alpine story for the curious.', url: shareUrl });
      setShareStatus('Share options opened.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      await copyLink();
    }
  };

  const emailHref = `mailto:?subject=${encodeURIComponent('Aster Ridge — a place to explore')}&body=${encodeURIComponent(`I thought you might like Aster Ridge:\n${shareUrl}`)}`;

  return (
    <div className="destination-site">
      <header className="destination-header">
        <a className="destination-brand" href="#top" aria-label="Aster Ridge, back to top">ASTER <span>RIDGE</span></a>
        <nav className="destination-nav" aria-label="Destination navigation">
          <a href="#discover" onClick={onNavigate}>Discover</a>
          <a href="#experiences" onClick={onNavigate}>Experiences</a>
          <a href="#plan" onClick={onNavigate}>Plan your visit</a>
        </nav>
      </header>

      <main>
        <section className="destination-intro" id="discover" aria-labelledby="discover-title">
          <div className="destination-intro-copy">
            <p className="destination-eyebrow"><span>01 / THE PLACE</span><span>ASTER RIDGE</span></p>
            <h2 id="discover-title">A little farther<br />from ordinary<span>.</span></h2>
            <p className="destination-lead">Some places ask you to slow down. Follow the changing light from the valley floor to the ridgeline, and let the day unfold at its own pace.</p>
            <p className="destination-body">At Aster Ridge, cloud filled valleys give way to open mountain paths and viewpoints worth the climb. Make the journey your own, one step at a time.</p>
            <a className="destination-text-link" href="#experiences">Find your kind of adventure <span aria-hidden="true">↗</span></a>
          </div>
          <figure className="destination-intro-media">
            <img src="/assets/imgPhoto2-thumb.webp" alt="A sunlit snowy peak rising above alpine forest" loading="lazy" decoding="async" />
            <figcaption><span>THE VIEW IS ONLY THE BEGINNING</span><span>01 — 03</span></figcaption>
          </figure>
        </section>

        <section className="destination-experiences" id="experiences" aria-labelledby="experiences-title">
          <div className="destination-section-head">
            <div>
              <p className="destination-eyebrow">02 / WAYS TO WANDER</p>
              <h2 id="experiences-title">Find a path<br />that feels like yours.</h2>
            </div>
            <p>From a slow morning among the clouds to a full day on the ridge, there is more than one way to meet the mountains.</p>
          </div>
          <div className="destination-experience-grid">
            {experiences.map((experience) => (
              <article className="destination-experience-card" key={experience.number}>
                <div className="destination-experience-image">
                  <img src={experience.image} alt={experience.alt} loading="lazy" decoding="async" />
                  <span className="destination-image-number">{experience.number}</span>
                </div>
                <div className="destination-experience-meta"><span>{experience.type}</span><span>ASTER RIDGE</span></div>
                <h3>{experience.title}</h3>
                <p>{experience.description}</p>
                <a href="#plan" aria-label={`Prepare for the day: ${experience.title}`}>Prepare for the day <span aria-hidden="true">↗</span></a>
              </article>
            ))}
          </div>
        </section>

        <section className="destination-story" aria-labelledby="story-title">
          <img src="/assets/imgPhoto-thumb.webp" alt="A lone traveler facing a vast snowy mountain range" loading="lazy" decoding="async" />
          <div className="destination-story-shade" />
          <div className="destination-story-content">
            <p className="destination-eyebrow">03 / THE FEELING</p>
            <h2 id="story-title">Leave room<br />for wonder.</h2>
            <p>The places we remember are often the ones that gave us space to look up, breathe deeply, and stay a little longer.</p>
          </div>
          <span className="destination-story-edge">THE MOUNTAINS, AT YOUR OWN PACE</span>
        </section>

        <section className="destination-plan" id="plan" aria-labelledby="plan-title">
          <div className="destination-section-head destination-plan-head">
            <div>
              <p className="destination-eyebrow">04 / BEFORE YOU GO</p>
              <h2 id="plan-title">Go prepared.<br />Come back inspired.</h2>
            </div>
            <p>Good planning makes more room for the unexpected. A few simple habits help every mountain day feel better from start to finish.</p>
          </div>
          <div className="destination-plan-grid">
            {preparation.map((item) => (
              <article className="destination-plan-item" key={item.number}>
                <span>{item.number} / 03</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
          <div className="destination-field-note">
            <span>FIELD NOTE</span>
            <p>Take only memories, leave only footprints. Stay on marked paths and carry your waste back with you.</p>
          </div>
        </section>

        <section className="destination-questions" id="questions" aria-labelledby="questions-title">
          <div>
            <p className="destination-eyebrow">05 / GOOD TO KNOW</p>
            <h2 id="questions-title">A few things<br />before you set out.</h2>
          </div>
          <div className="destination-faq-list">
            <details>
              <summary>Is there a walk for a slower day?<span aria-hidden="true">+</span></summary>
              <p>Yes. Start with a gentler valley walk, take breaks whenever you like, and choose the distance that feels right for your group.</p>
            </details>
            <details>
              <summary>What should I bring?<span aria-hidden="true">+</span></summary>
              <p>Water, weather ready layers, comfortable walking shoes, sun protection, and a charged phone are a good starting point.</p>
            </details>
            <details>
              <summary>What if the weather changes?<span aria-hidden="true">+</span></summary>
              <p>Be ready to adjust the plan or turn back. Check current local conditions before leaving and give yourself enough daylight to return safely.</p>
            </details>
          </div>
        </section>

        <section className="destination-final" aria-labelledby="final-title">
          <p className="destination-eyebrow">YOUR NEXT CHAPTER STARTS OUTSIDE</p>
          <h2 id="final-title">Where will the<br />trail take you?</h2>
          <a className="center-ripple" href="#top" onClick={onNavigate}><span className="destination-button-content">Back To Top <span aria-hidden="true">↑</span></span></a>
        </section>
      </main>

      <footer className="destination-footer">
        <div className="destination-footer-main">
          <div className="destination-footer-copy">
            <p className="destination-eyebrow">PASS IT ON</p>
            <h2>Take someone<br />with you.</h2>
            <p>The best days outdoors are better shared. Keep this little corner of the mountains close, or send it to someone you would explore it with.</p>
          </div>
          <div className="destination-share">
            <p className="destination-eyebrow">SHARE ASTER RIDGE</p>
            <p className="destination-share-text">Know who you would bring? Send them the view.</p>
            <div className="destination-share-actions">
              <button type="button" className="destination-share-action" onClick={sharePage} aria-label="Share Aster Ridge">
                <span className="destination-share-icon center-ripple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V3m0 0L8 7m4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg></span>
                <span>Share</span>
              </button>
              <button type="button" className="destination-share-action" onClick={copyLink} aria-label="Copy link to Aster Ridge">
                <span className="destination-share-icon center-ripple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9.5 14.5 5-5M8 17H7a4 4 0 0 1 0-8h3m4-2h3a4 4 0 0 1 0 8h-3" /></svg></span>
                <span>Copy link</span>
              </button>
              <a className="destination-share-action" href={emailHref} aria-label="Email Aster Ridge link">
                <span className="destination-share-icon center-ripple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg></span>
                <span>Email</span>
              </a>
            </div>
            <p className="destination-share-status" role="status" aria-live="polite">{shareStatus}</p>
          </div>
        </div>
        <div className="destination-footer-base">
          <a className="destination-brand" href="#top">ASTER <span>RIDGE</span></a>
          <p>An alpine story for the curious.</p>
          <p className="destination-concept-note">Aster Ridge is a fictional destination concept. Routes and imagery are illustrative.</p>
        </div>
      </footer>
    </div>
  );
}

export default DestinationContent;

