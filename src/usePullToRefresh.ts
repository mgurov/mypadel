import { useEffect, useRef, useState } from 'react'

/** Pull distance (px) the user must drag before releasing triggers a refresh. */
export const PULL_REFRESH_THRESHOLD = 64
/** Hard cap so the indicator never takes over the whole view. */
const MAX_PULL_DISTANCE = 96
/** Resist the drag a little so the pull feels elastic. */
const PULL_RESISTANCE = 0.6

/**
 * Pull-to-refresh gesture for a scrollable element.
 *
 * Works with touch (drag down while the content is scrolled to the top) and
 * with the mouse (for desktop / tests). Touchmove is handled with a
 * non-passive native listener so the browser does not rubber-band the page
 * instead of reporting the gesture.
 */
export function usePullToRefresh(onRefresh: () => unknown) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const onRefreshRef = useRef(onRefresh)
  const refreshingRef = useRef(false)
  const dragRef = useRef<{ startY: number; distance: number } | null>(null)

  onRefreshRef.current = onRefresh

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const reset = () => {
      dragRef.current = null
      setPullDistance(0)
    }

    const refresh = async () => {
      if (refreshingRef.current) return
      refreshingRef.current = true
      setIsRefreshing(true)
      try {
        await onRefreshRef.current()
      } finally {
        refreshingRef.current = false
        setIsRefreshing(false)
      }
    }

    const start = (y: number) => {
      if (refreshingRef.current || el.scrollTop > 0) return
      dragRef.current = { startY: y, distance: 0 }
    }

    const move = (y: number) => {
      const drag = dragRef.current
      if (!drag) return
      if (el.scrollTop > 0) {
        reset()
        return
      }
      const dragged = y - drag.startY
      drag.distance = dragged <= 0 ? 0 : Math.min(MAX_PULL_DISTANCE, dragged * PULL_RESISTANCE)
      setPullDistance(drag.distance)
    }

    const end = () => {
      const drag = dragRef.current
      if (!drag) return
      const shouldRefresh = drag.distance >= PULL_REFRESH_THRESHOLD
      reset()
      if (shouldRefresh) void refresh()
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      start(e.touches[0].clientY)
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!dragRef.current || e.touches.length !== 1) return
      if (e.cancelable) e.preventDefault()
      move(e.touches[0].clientY)
    }

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest('a, button, input, textarea, select, [role="button"]')) return
      start(e.clientY)
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      if (e.clientY > dragRef.current.startY) e.preventDefault()
      move(e.clientY)
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', end)
    el.addEventListener('touchcancel', reset)
    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', end)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', end)
      el.removeEventListener('touchcancel', reset)
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', end)
    }
  }, [])

  return { containerRef, pullDistance, isRefreshing }
}
