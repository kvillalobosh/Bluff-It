import { useState } from "react"

// Player's animal drawing, loaded from client/public/avatars/<avatar>.png (e.g. "fox" -> /avatars/fox.png).
// Until the PNGs exist (or if a player has no avatar), shows a circle with their initial instead.
export function Avatar({ avatar, name, className = "size-16" }: { avatar?: string; name: string; className?: string }) {
  const [broken, setBroken] = useState(false)

  if (!avatar || broken) {
    return (
      <div className={`flex shrink-0 items-center justify-center rounded-full border-4 border-foreground bg-muted font-black uppercase ${className}`}>
        {name.charAt(0)}
      </div>
    )
  }

  return (
    <img
      src={`/avatars/${avatar}.png`}
      alt={`${name}'s avatar`}
      className={`shrink-0 object-contain ${className}`}
      onError={() => setBroken(true)}
    />
  )
}
