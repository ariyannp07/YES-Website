'use client'

import { useEffect, useRef, type RefObject } from 'react'

import city from '@/lib/landing/new-haven.json'

import styles from './globe.module.css'

/**
 * New Haven, from above.
 *
 * Real OpenStreetMap geometry — the nine-square grid, the Green, Whitney
 * Avenue's angle, the sweep of I-91 and I-95 — projected to metres on a local
 * plane by lib/landing/generate-new-haven.mjs and committed. A stylised
 * impression would be obvious to exactly the people who would find this.
 *
 * Drawn on a canvas rather than as SVG: a thousand paths as DOM nodes is a lot
 * of layout for something that only ever animates its transform.
 */

/** Road classes, widest and brightest first. Index matches the generator. */
const ROAD_STYLE: readonly { width: number; alpha: number; warm: number }[] = [
  { width: 3.0, alpha: 0.85, warm: 1 },    // motorway / trunk
  { width: 2.2, alpha: 0.72, warm: 0.4 },  // primary
  { width: 1.7, alpha: 0.6, warm: 0.15 },  // secondary
  { width: 1.3, alpha: 0.5, warm: 0 },     // tertiary
  { width: 1.0, alpha: 0.42, warm: 0 },    // residential
  { width: 0.6, alpha: 0.28, warm: 0 },    // service, alleys, campus paths
]

/**
 * Metres from the house to the edge of the plate at rest.
 *
 * Tuned to the framing of a Google Earth view pulled in on the address: a few
 * blocks in each direction, close enough that individual buildings read.
 */
const REACH = 235

interface CityViewProps {
  readonly progress: RefObject<number>
  readonly open: boolean
}

export function CityView({ progress, open }: CityViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let dpr = 1

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio, 2)
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      const p = progress.current ?? 0
      const w = canvas.width
      const h = canvas.height

      // Opacity is driven by the SAME clock as the dive, not by a CSS
      // transition on the click. Tied to the click it arrived within 900ms
      // while the globe was still 2.1s from gone, so the middle of the descent
      // showed both at half strength and read as a jumble rather than a fall.
      if (wrapRef.current) {
        const rise = Math.min(1, Math.max(0, (p - 0.52) / 0.34))
        wrapRef.current.style.opacity = String(rise * rise * (3 - 2 * rise))
      }

      ctx.clearRect(0, 0, w, h)
      if (p <= 0.001) {
        raf = requestAnimationFrame(draw)
        return
      }

      // The descent: the plate arrives already close and keeps falling, so the
      // motion reads as continuing down through the globe rather than as a
      // panel sliding in. Starting from a wide view would look like a map
      // opening; this looks like ground approaching.
      const settle = Math.min(1, Math.max(0, (p - 0.45) / 0.55))
      const eased = settle * settle * (3 - 2 * settle)
      // Still falling when the plate appears: it arrives showing several blocks
      // and closes to the house, so the motion continues the descent rather
      // than presenting a finished map.
      const zoom = 0.34 + eased * 0.66

      const fit = Math.min(w, h) / (REACH * 2)
      const scale = fit * zoom
      const cx = w / 2
      const cy = h / 2

      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(scale, scale)

      // ————— water —————
      ctx.fillStyle = 'rgba(18, 46, 82, 0.55)'
      for (const ring of city.water as number[][]) {
        ctx.beginPath()
        for (let i = 0; i < ring.length; i += 2) {
          if (i === 0) ctx.moveTo(ring[0], ring[1])
          else ctx.lineTo(ring[i], ring[i + 1])
        }
        ctx.closePath()
        ctx.fill()
      }

      // ————— parks —————
      ctx.fillStyle = 'rgba(28, 62, 58, 0.5)'
      for (const ring of city.parks as number[][]) {
        ctx.beginPath()
        for (let i = 0; i < ring.length; i += 2) {
          if (i === 0) ctx.moveTo(ring[0], ring[1])
          else ctx.lineTo(ring[i], ring[i + 1])
        }
        ctx.closePath()
        ctx.fill()
      }

      // ————— roads, thinnest first so the highways sit on top —————
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (let rank = ROAD_STYLE.length - 1; rank >= 0; rank -= 1) {
        const style = ROAD_STYLE[rank]
        ctx.lineWidth = style.width / scale
        const cool = [159, 196, 228]
        const warm = [255, 190, 120]
        const c = cool.map((v, i) => Math.round(v + (warm[i] - v) * style.warm))
        ctx.strokeStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${style.alpha * eased})`
        ctx.beginPath()
        for (const road of city.roads as number[][]) {
          if (road[0] !== rank) continue
          for (let i = 1; i < road.length; i += 2) {
            if (i === 1) ctx.moveTo(road[1], road[2])
            else ctx.lineTo(road[i], road[i + 1])
          }
        }
        ctx.stroke()
      }

      // ————— buildings —————
      // Real footprints for the blocks around the house. At this zoom the
      // rooftops are what make it read as a place rather than a street diagram.
      ctx.fillStyle = `rgba(126, 158, 196, ${0.22 * eased})`
      ctx.strokeStyle = `rgba(162, 196, 232, ${0.42 * eased})`
      ctx.lineWidth = 0.5 / scale
      for (const ring of city.buildings as number[][]) {
        ctx.beginPath()
        for (let i = 0; i < ring.length; i += 2) {
          if (i === 0) ctx.moveTo(ring[0], ring[1])
          else ctx.lineTo(ring[i], ring[i + 1])
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }

      // ————— street names —————
      // Only once close enough to read, and set along each street's own angle.
      const nameAlpha = Math.max(0, (eased - 0.55) / 0.45)
      if (nameAlpha > 0.01) {
        ctx.save()
        ctx.fillStyle = `rgba(198, 220, 244, ${0.62 * nameAlpha})`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        // In world units, because the context is scaled: 9 rendered at about
        // four CSS pixels, which is not a label.
        const size = 22 / scale
        ctx.font = `500 ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`
        for (const [name, lx, ly, angle] of city.labels as [string, number, number, number][]) {
          let a = angle
          // Keep text upright rather than upside-down on west-running streets.
          if (a > Math.PI / 2) a -= Math.PI
          if (a < -Math.PI / 2) a += Math.PI
          ctx.save()
          ctx.translate(lx, ly)
          ctx.rotate(a)
          ctx.fillText(String(name).toUpperCase(), 0, -3 / scale)
          ctx.restore()
        }
        ctx.restore()
      }

      // ————— the house —————
      const pulse = 1 + 0.12 * Math.sin(performance.now() / 620)
      const r = 7 / scale
      ctx.beginPath()
      ctx.arc(0, 0, r * 3.1 * pulse, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255, 178, 87, ${0.35 * eased})`
      ctx.lineWidth = 1.1 / scale
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 178, 87, ${0.95 * eased})`
      ctx.fill()

      ctx.restore()
      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [progress])

  return (
    <div
      ref={wrapRef}
      className={styles.city}
      data-open={open ? 'true' : 'false'}
      aria-hidden={!open}
    >
      <canvas ref={canvasRef} className={styles.cityCanvas} />
      <div className={styles.cityLabel}>
        <p className={styles.cityAddress}>52 Trumbull St</p>
        <p className={styles.cityPlace}>New Haven, Connecticut</p>
      </div>
    </div>
  )
}
