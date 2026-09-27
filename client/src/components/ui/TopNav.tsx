import logo from "@/assets/bluffit-logo.png"

type TopNavProps = {
  leftText?: string
  centerText?: string
  rightText: string
}

export function TopNav({ leftText = "", centerText, rightText }: TopNavProps) {
  return (
    <header className="top-nav-bar">
      <div className="top-nav-brand">{leftText}</div>

      {centerText ? (
        <div className="top-nav-center-text">{centerText}</div>
      ) : (
        <div className="top-nav-logo-wrap" aria-label="Bluff It home">
          <img src={logo} alt="Bluff It" className="top-nav-logo" />
        </div>
      )}

      <div className="top-nav-meta">{rightText}</div>
    </header>
  )
}
