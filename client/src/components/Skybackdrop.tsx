import "../SkyBackdrop.css"

// Clouds all drift left → right, each in its own lane in the blue half of the sky.
// Negative delays start them mid-journey so the sky is already populated on load.
// size = width in px, duration = seconds to cross the screen, opacity = depth
const CLOUDS = [
  { top: "3%", size: 260, duration: 38, delay: -4, opacity: 0.95 },
  { top: "11%", size: 150, duration: 52, delay: -30, opacity: 0.7 },
  { top: "19%", size: 210, duration: 44, delay: -18, opacity: 0.85 },
  { top: "27%", size: 120, duration: 60, delay: -45, opacity: 0.6 },
  { top: "34%", size: 230, duration: 48, delay: -8, opacity: 0.8 },
  { top: "7%", size: 180, duration: 56, delay: -40, opacity: 0.75 },
  { top: "40%", size: 140, duration: 64, delay: -24, opacity: 0.55 },
]

// Blue gradient sky + grid + drifting cartoon clouds.
// Drop it in as the FIRST child of a screen's root element and give that root
// the class "sky-screen" — the sky then sits behind everything on the screen.
export function SkyBackdrop() {
  return (
    <div className="sky-backdrop" aria-hidden>
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="sky-backdrop-cloud"
          style={{
            top: c.top,
            width: c.size,
            opacity: c.opacity,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
          }}
        >
          <Cloud />
        </div>
      ))}
    </div>
  )
}

// Lineless cartoon cloud: pale-blue underside peeking out below a white puff stack
function Cloud() {
  const puffs = (
    <>
      <circle cx="52" cy="66" r="30" />
      <circle cx="90" cy="46" r="38" />
      <circle cx="132" cy="52" r="32" />
      <circle cx="162" cy="70" r="24" />
      <rect x="28" y="62" width="156" height="34" rx="17" />
    </>
  )
  return (
    <svg viewBox="0 0 200 100" className="sky-backdrop-cloud-svg">
      <g fill="#d6e6f7">{puffs}</g>
      <g fill="#ffffff" transform="translate(0 -6)">{puffs}</g>
    </svg>
  )
}