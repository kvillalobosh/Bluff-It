type WaitingDotsProps = {
  label?: string
  className?: string
}

export function WaitingDots({ label = "Waiting for others", className = "" }: WaitingDotsProps) {
  return (
    <div className={`player-board-wait ${className}`.trim()}>
      <p className="text-center text-sm text-muted-foreground" style={{ fontFamily: "'Coiny', system-ui" }}>
        {label}
      </p>
      <span className="player-board-dots" aria-hidden>
        <span />
        <span />
        <span />
      </span>
    </div>
  )
}
