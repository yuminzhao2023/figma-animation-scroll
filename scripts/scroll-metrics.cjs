// Runs in the browser so checks follow the active layout and motion preference.
function scrollMetrics() {
  const journey = document.querySelector('.journey');
  const revealDistance = innerHeight * (Number(getComputedStyle(journey).getPropertyValue('--reveal-distance')) || 1);
  const revealEnd = journey.offsetHeight - innerHeight;
  const revealStart = revealEnd - revealDistance;
  return { revealDistance, revealStart, revealEnd, sceneEnd: revealStart - innerHeight * .35 };
}

module.exports = scrollMetrics;
