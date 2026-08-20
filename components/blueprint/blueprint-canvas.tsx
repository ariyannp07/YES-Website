'use client'

import { useEffect, useRef } from 'react'

import {
  ANIM_CYCLE,
  ANIM_DURATION,
  TITLE_WORLD,
  buildFragments,
  drawFragment,
} from '@/lib/blueprint-fragments'

import styles from './blueprint.module.css'

/**
 * CONCEPT 2 — THE INFINITE BLUEPRINT.
 *
 * A working wall far larger than the viewport. Three parallax layers of
 * procedurally generated technical sketches over deep navy; the camera drifts
 * slowly on its own, the cursor shifts the viewing angle by a couple of
 * degrees, and scrolling carries the camera diagonally ACROSS and INTO the
 * drawing rather than simply down it.
 *
 * Parallax is done properly — each layer is offset by the camera times its own
 * depth factor, which is what a small change of viewing angle actually does, so
 * near sketches slide further than far ones instead of everything moving as one
 * flat image.
 *
 * A handful of fragments animate at any moment on a long stagger: a plot
 * re-fits, a massing model extrudes, a line of code rewrites itself, an
 * assembly comes apart. Never all at once — the wall should look worked on,
 * not busy.
 */

const LAYER_PARALLAX = [0.42, 0.72, 1.06] as const
const LAYER_ALPHA = [0.2, 0.36, 0.56] as const
const LAYER_WIDTH = [0.55, 0.75, 1] as const

const GHOST = '155,190,245'
const BOLD = '77,140,255'

/**
 * The camera opens framing the title at centre-left, then travels diagonally
 * across the wall. Derived from the viewport rather than hard-coded, so the
 * title lands in the same place on a laptop and on a large display.
 */
const TITLE_SCREEN = { x: 0.15, y: 0.4 }
const CAMERA_TRAVEL = { x: 1750, y: 980 }

export default function BlueprintCanvas({
  worldRef,
  children,
  scrollDriven = true,
}: {
  /** Title-block DOM, moved by the same camera as the drawing. */
  readonly worldRef: React.RefObject<HTMLDivElement | null>
  readonly children?: React.ReactNode
  /**
   * When false the camera holds its opening framing and only drifts and
   * responds to the cursor — the wall stays a single held view rather than
   * something you travel across.
   */
  readonly scrollDriven?: boolean
}) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const canvas = document.createElement('canvas')
    canvas.className = styles.canvas
    host.insertBefore(canvas, host.firstChild)

    const context = canvas.getContext('2d')
    if (!context) {
      host.removeChild(canvas)
      return
    }

    const fragments = buildFragments()
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    let width = 0
    let height = 0
    let frame = 0
    const started = performance.now()

    // Mouse-driven viewing angle, eased.
    let aimX = 0
    let aimY = 0
    let angleX = 0
    let angleY = 0
    let scrollProgress = 0
    let easedScroll = 0
    let cameraFromX = 0
    let cameraFromY = 0

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * ratio)
      canvas.height = Math.floor(height * ratio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(ratio, 0, 0, ratio, 0, 0)

      const p = LAYER_PARALLAX[2]
      cameraFromX = (TITLE_WORLD.x - width * TITLE_SCREEN.x) / p
      cameraFromY = (TITLE_WORLD.y - height * TITLE_SCREEN.y) / p
    }

    const onPointerMove = (e: PointerEvent) => {
      // Cursor parallax slides the title and its link by up to ±27px. That is
      // motion triggered by interaction — WCAG 2.3.3 — so it stops too.
      if (reduceMotion) return
      aimX = (e.clientX / window.innerWidth - 0.5) * 2
      aimY = (e.clientY / window.innerHeight - 0.5) * 2
    }

    const onScroll = () => {
      if (!scrollDriven) return
      const max = document.documentElement.scrollHeight - window.innerHeight
      scrollProgress = max > 0 ? window.scrollY / max : 0
    }

    const drawGrid = (camX: number, camY: number) => {
      const spacing = 96
      const offsetX = -((camX * LAYER_PARALLAX[1]) % spacing)
      const offsetY = -((camY * LAYER_PARALLAX[1]) % spacing)

      context.strokeStyle = `rgba(${GHOST},0.055)`
      context.lineWidth = 1
      context.beginPath()
      for (let x = offsetX; x < width; x += spacing) {
        context.moveTo(x, 0)
        context.lineTo(x, height)
      }
      for (let y = offsetY; y < height; y += spacing) {
        context.moveTo(0, y)
        context.lineTo(width, y)
      }
      context.stroke()
    }

    /** Construction marks around the title, so the type reads as drawn-in. */
    const drawTitleFrame = (camX: number, camY: number) => {
      const p = LAYER_PARALLAX[2]
      const x = TITLE_WORLD.x - 60 - camX * p
      const y = TITLE_WORLD.y - 92 - camY * p
      const w = 620
      // Tall enough to enclose title + subtitle + note; the marks are corner
      // ticks, so a little slack reads as drawing, not as a loose box.
      const h = 390

      if (x > width || x + w < 0 || y > height || y + h < 0) return

      context.save()
      context.strokeStyle = `rgba(${BOLD},0.4)`
      context.lineWidth = 1

      // Corner ticks rather than a closed box — a registration mark, not a card.
      const tick = 26
      const corners = [
        [x, y, 1, 1],
        [x + w, y, -1, 1],
        [x, y + h, 1, -1],
        [x + w, y + h, -1, -1],
      ] as const
      for (const [cx, cy, sx, sy] of corners) {
        context.beginPath()
        context.moveTo(cx + tick * sx, cy)
        context.lineTo(cx, cy)
        context.lineTo(cx, cy + tick * sy)
        context.stroke()
      }

      context.setLineDash([2, 6])
      context.strokeStyle = `rgba(${GHOST},0.16)`
      context.beginPath()
      context.moveTo(x - 180, y + h * 0.5)
      context.lineTo(x, y + h * 0.5)
      context.moveTo(x + w, y + h * 0.22)
      context.lineTo(x + w + 210, y + h * 0.22)
      context.stroke()
      context.setLineDash([])
      context.restore()
    }

    const render = (now: number) => {
      const elapsed = (now - started) / 1000

      easedScroll += (scrollProgress - easedScroll) * 0.07
      angleX += (aimX - angleX) * 0.05
      angleY += (aimY - angleY) * 0.05

      // Slow autonomous drift, so the wall is alive before anyone touches it.
      const driftX = reduceMotion ? 0 : Math.sin(elapsed * 0.045) * 90
      const driftY = reduceMotion ? 0 : Math.cos(elapsed * 0.037) * 60

      const camX = cameraFromX + CAMERA_TRAVEL.x * easedScroll + driftX
      const camY = cameraFromY + CAMERA_TRAVEL.y * easedScroll + driftY

      context.fillStyle = '#060a16'
      context.fillRect(0, 0, width, height)

      drawGrid(camX, camY)

      // Scrolling also eases the camera in, so "deeper" is depth, not just pan.
      const zoom = 1 + easedScroll * 0.13
      context.save()
      context.translate(width / 2, height / 2)
      context.scale(zoom, zoom)
      context.rotate(angleX * 0.008)
      context.translate(-width / 2, -height / 2)

      for (const fragment of fragments) {
        const p = LAYER_PARALLAX[fragment.layer]
        // The viewing-angle shift scales with depth — that is the parallax.
        const tilt = (fragment.layer + 1) * 9
        const x = fragment.x - camX * p + angleX * tilt
        const y = fragment.y - camY * p + angleY * tilt * 0.6

        if (x > width + 80 || x + fragment.w < -80) continue
        if (y > height + 80 || y + fragment.h < -80) continue

        // One fragment's animation window inside the shared loop.
        const phase = (elapsed - fragment.animateAt) % ANIM_CYCLE
        const t =
          !reduceMotion && phase >= 0 && phase < ANIM_DURATION
            ? phase / ANIM_DURATION
            : null

        const alpha = LAYER_ALPHA[fragment.layer] * (fragment.bold ? 1.7 : 1)
        const colour = fragment.bold ? BOLD : GHOST

        context.save()
        context.translate(x, y)
        context.strokeStyle = `rgba(${colour},${alpha})`
        context.fillStyle = `rgba(${colour},${alpha * 1.15})`
        context.lineWidth = LAYER_WIDTH[fragment.layer]
        drawFragment(context, fragment, t)
        context.restore()
      }

      drawTitleFrame(camX, camY)
      context.restore()

      // Move the title-block DOM with the near layer.
      if (worldRef.current) {
        const p = LAYER_PARALLAX[2]
        // Drift is in fixed pixels but the anchor is a fraction of the width,
        // so on a phone the note could swing off the left edge — and with
        // scrollDriven={false} it would never come back. Keep a gutter.
        const rawX = Math.max(TITLE_WORLD.x - camX * p + angleX * 27, 18)
        const rawY = TITLE_WORLD.y - camY * p + angleY * 16
        // Same chain as the canvas: scale about the viewport centre, not the
        // element origin, or the type drifts out of its registration marks.
        const tx = (rawX - width / 2) * zoom + width / 2
        const ty = (rawY - height / 2) * zoom + height / 2
        worldRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${zoom})`
      }

      frame = requestAnimationFrame(render)
    }

    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointerMove)
    if (scrollDriven) window.addEventListener('scroll', onScroll, { passive: true })
    resize()
    onScroll()
    frame = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('scroll', onScroll)
      // (removing a listener that was never added is a no-op)
      if (canvas.parentNode === host) host.removeChild(canvas)
    }
  }, [worldRef, scrollDriven])

  return (
    <div ref={hostRef} className={styles.stage}>
      {children}
    </div>
  )
}
