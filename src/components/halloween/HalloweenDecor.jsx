// Spooky ambient touches for the Halloween theme: a few bats flitting across
// the screen, a bobbing ghost and a dangling spider. Purely decorative — no
// pointer events, hidden from screen readers, off for reduced motion and print.
const BATS = [
  { top: '16%', delay: '0s', duration: '26s', size: 26 },
  { top: '30%', delay: '9s', duration: '31s', size: 20 },
  { top: '11%', delay: '17s', duration: '36s', size: 18 },
];

export default function HalloweenDecor() {
  return (
    <div className="halloween-decor" aria-hidden="true">
      {BATS.map((bat) => (
        <span
          key={bat.delay}
          className="halloween-bat"
          style={{ top: bat.top, fontSize: bat.size, animationDelay: bat.delay, animationDuration: bat.duration }}
        >
          🦇
        </span>
      ))}
      <span className="halloween-ghost">👻</span>
      <span className="halloween-spider">
        <span className="halloween-thread" />
        🕷️
      </span>
      <div className="halloween-vignette" />
    </div>
  );
}