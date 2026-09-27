import { useState } from "react"

// Animal drawings in src/assets/animals, keyed by file name ("bear.png") — the same id the server assigns
const animalImages: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob("@/assets/animals/*.{png,jpg,jpeg,webp}", { eager: true, import: "default" }) as Record<string, string>
  ).map(([path, image]) => [path.split("/").pop() ?? path, image])
)

// Player's animal drawing. If a player has no avatar (or it fails to load), shows a circle with their initial instead.
export function Avatar({ avatar, name, className = "size-16" }: { avatar?: string; name: string; className?: string }) {
  const [broken, setBroken] = useState(false)
  const src = avatar ? animalImages[avatar] : undefined

  if (!src || broken) {
    return (
      <div className={`flex shrink-0 items-center justify-center rounded-full border-4 border-foreground bg-muted font-black uppercase ${className}`}>
        {name.charAt(0)}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={`${name}'s avatar`}
      className={`shrink-0 object-contain ${className}`}
      onError={() => setBroken(true)}
    />
  )
}
