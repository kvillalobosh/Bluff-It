import { useEffect, useState } from "react"
import { animate, motion, useMotionValue, useTransform } from "motion/react"

type Props = {
  from: number
  to: number
  delay?: number // seconds before counting starts
  duration?: number // seconds the count takes
  className?: string
  onDone?: () => void
}

// A score that rapidly counts up from `from` to `to`, glowing green while it climbs.
// If nothing was gained, it just shows `to` with no animation.
export function AnimatedScore({ from, to, delay = 0, duration = 1.4, className = "", onDone }: Props) {
  const gained = to > from
  const value = useMotionValue(gained ? from : to)
  const text = useTransform(value, (v) => Math.round(v).toLocaleString())
  // idle -> counting (green) -> landed (green pulse, then fades back to normal)
  const [stage, setStage] = useState<"idle" | "counting" | "landed">("idle")

  useEffect(() => {
    if (!gained) {
      value.set(to)
      onDone?.()
      return
    }
    value.set(from)
    let settle: ReturnType<typeof setTimeout>
    const controls = animate(value, to, {
      delay,
      duration,
      ease: [0.16, 1, 0.3, 1], // fast start, soft landing
      onUpdate: () => setStage("counting"), // first frame after the delay flips it green (repeat calls are no-ops)
      onComplete: () => {
        setStage("landed")
        onDone?.()
        settle = setTimeout(() => setStage("idle"), 1400)
      },
    })
    return () => {
      controls.stop()
      clearTimeout(settle)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when the numbers change
  }, [from, to])

  return (
    <motion.span
      className={`animated-score animated-score--${stage} ${className}`}
      animate={stage === "landed" ? { scale: [1, 1.12, 1] } : { scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      {text}
    </motion.span>
  )
}
