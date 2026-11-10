import { useCallback, useEffect, useRef, useState } from 'react'

/** Pull distance (px) the user must drag before releasing triggers a refresh. */
export const PULL_REFRESH_THRESHOLD = 64
/** Hard cap so the indicator never takes over the whole view. */
const MAX_PULL_DISTANCE = 96
/** Resist the drag a little so the pull feels elastic. */
const PULL_RESISTANCE = 0.6

/**
 * Pull-to-refresh gesture for a scrollable element.
 *
 * The returned `containerRef` is a callback ref (dialogs mount their content
 * in a later commit, so a plain ref object would still be empty when the
 * effect runs). Works with touch (drag down while the content is scrolled to
 * the top) and with the mouse. Touchmove is handled by a non-passive native
 * listener so the browser does not rubber-band the page instead of reporting
 * the gesture.
 */
export function usePullToRefresh(onRefresh: () => unknown) {
  const [element, setElement] = useState<HTMLDivElement | null>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const onRefreshRef = useRef(onRefresh)
  const refreshingRef = useRef(false)
  const dragRef = useRef<{ startY: number; distance: number } | null>(null)

  onRefreshRef.current = onRefresh

  const containerRef = useCallback((el: HTMLDivElement | null) => {
    setElement(el)
  }, [])

  useEffect(() => {
    if (!element) return

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
      if (refreshingRef.current || element.scrollTop > 0) return
      dragRef.current = { startY: y, distance: 0 }
    }

    const move = (y: number) => {
      const drag = dragRef.current
      if (!drag) return
      if (element.scrollTop > 0) {
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
      const dragged = e.touches[0].clientY - dragRef.current.startY
      // Only block the browser's own scrolling/rubber-banding while the
      // user is actually pulling down from the top; let normal scrolling through.
      if (dragged > 0 && element.scrollTop <= 0 && e.cancelable) e.preventDefault()
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
      if (e.clientY > dragRef.current.startY && element.scrollTop <= 0) e.preventDefault()
      move(e.clientY)
    }

    element.addEventListener('touchstart', onTouchStart, { passive: true })
    element.addEventListener('touchmove', onTouchMove, { passive: false })
    element.addEventListener('touchend', end)
    element.addEventListener('touchcancel', reset)
    element.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', end)

    return () => {
      element.removeEventListener('touchstart', onTouchStart)
      element.removeEventListener('touchmove', onTouchMove)
      element.removeEventListener('touchend', end)
      element.removeEventListener('touchcancel', reset)
      element.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', end)
    }
  }, [element])

  return { containerRef, pullDistance, isRefreshing }
}
