'use client'

import { useEffect, useRef } from 'react'

import {
  CROSSES,
  buildSignalNetwork,
  findLabelIndex,
  type SignalNode,
} from '@/lib/concepts/signal-model'

import styles from './signal.module.css'

/**
 * CONCEPT 1 — THE SIGNAL.
 *
 * A hidden network, scanned with the cursor. The page opens on one pulsing
 * point; moving the mouse exposes nodes and edges within a radius, and over
 * ~10 seconds an ambient floor rises so the field densifies on its own. Roughly
 * half the nodes sit inside the YES mark's polygons and carry a higher floor,
 * so the shape emerges as a density — never as a logo.
 *
 * Canvas 2D rather than WebGL on purpose: this is thousands of thin lines and
 * small text labels, which 2D draws crisply and cheaply. WebGL would add weight
 * and make the type worse.
 */

const BG = '#05070d'
const COBALT = { r: 77, g: 140, b: 255 }
const REVEAL_SECONDS = 10
const CARD_LIFETIME = 2800
const EVENT_LIFETIME = 4200
const EVENT_INTERVAL = 3400

const smoothstep = (t: number): number => t * t * (3 - 2 * t)
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))
const rgba = (a: number): string => `rgba(${COBALT.r},${COBALT.g},${COBALT.b},${a})`

interface CrossEvent {
  readonly a: number
  readonly b: number
  readonly phrase: string
  readonly start: number
  readonly bow: number
}

interface Card {
  readonly index: number
  readonly start: number
}

/** Point on the quadratic bow between two nodes. */
const bezier = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  bow: number,
  t: number,
): readonly [number, number] => {
  const mx = (ax + bx) / 2
  const my = (ay + by) / 2
  const dx = bx - ax
  const dy = by - ay
  const length = Math.hypot(dx, dy) || 1
  const cx = mx + (-dy / length) * bow
  const cy = my + (dx / length) * bow
  const u = 1 - t
  return [
    u * u * ax + 2 * u * t * cx + t * t * bx,
    u * u * ay + 2 * u * t * cy + t * t * by,
  ]
}

export default function SignalCanvas() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const canvas = document.createElement('canvas')
    canvas.className = styles.canvas
    host.appendChild(canvas)

    const context = canvas.getContext('2d')
    if (!context) {
      host.removeChild(canvas)
      return
    }

    const { nodes, edges } = buildSignalNetwork()
    const brightness = new Float32Array(nodes.length)

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches

    let width = 0
    let height = 0

    // Cursor, and where it is easing toward.
    let targetX = 0
    let targetY = 0
    let cursorX = 0
    let cursorY = 0
    let pointerSeen = false

    let event: CrossEvent | null = null
    let nextEventAt = 0
    let card: Card | null = null

    const started = performance.now()
    let frame = 0

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = host.clientWidth
      height = host.clientHeight
      canvas.width = Math.floor(width * ratio)
      canvas.height = Math.floor(height * ratio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      if (!pointerSeen) {
        cursorX = targetX = width / 2
        cursorY = targetY = height / 2
      }
    }

    const nodeX = (node: SignalNode) => node.nx * width
    const nodeY = (node: SignalNode) => node.ny * height

    const onPointerMove = (e: PointerEvent) => {
      pointerSeen = true
      const rect = canvas.getBoundingClientRect()
      targetX = e.clientX - rect.left
      targetY = e.clientY - rect.top
    }

    const onClick = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top

      let bestIndex = -1
      let bestDistance = 22

      nodes.forEach((node, index) => {
        if (!node.label && !node.anchor) return
        if (brightness[index] < 0.3) return
        const d = Math.hypot(nodeX(node) - px, nodeY(node) - py)
        if (d < bestDistance) {
          bestDistance = d
          bestIndex = index
        }
      })

      card = bestIndex >= 0 ? { index: bestIndex, start: performance.now() } : null
    }

    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerdown', onClick)

    const drawCard = (now: number) => {
      if (!card) return
      const age = now - card.start
      if (age > CARD_LIFETIME) {
        card = null
        return
      }

      // In fast, hold, out slow.
      const alpha =
        age < 220
          ? age / 220
          : age > CARD_LIFETIME - 700
            ? (CARD_LIFETIME - age) / 700
            : 1

      const node = nodes[card.index]
      const x = nodeX(node)
      const y = nodeY(node)

      const heading = node.anchor ? node.anchor.figure : (node.label ?? '')
      const detail = node.anchor
        ? node.anchor.context
        : '[ TBD — owner input ]'

      context.save()
      context.globalAlpha = alpha
      context.translate(x + 18, y - 14)

      // Annotation, not a card: two rules and text. No panel, no blur, no glass.
      context.strokeStyle = rgba(0.5)
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(0, -18)
      context.lineTo(0, 34)
      context.moveTo(0, -18)
      context.lineTo(150, -18)
      context.stroke()

      context.fillStyle = '#e8edf7'
      context.font = '500 19px Georgia, serif'
      context.fillText(heading, 12, 6)

      context.fillStyle = 'rgba(160,180,215,0.85)'
      context.font = '11px ui-monospace, monospace'
      context.fillText(detail, 12, 26)
      context.restore()
    }

    const drawEvent = (now: number, reveal: number) => {
      if (!event) return
      const age = now - event.start
      if (age > EVENT_LIFETIME) {
        event = null
        return
      }

      const draw = clamp01(age / 1100)
      const alpha =
        age < 260
          ? age / 260
          : age > EVENT_LIFETIME - 950
            ? (EVENT_LIFETIME - age) / 950
            : 1

      const a = nodes[event.a]
      const b = nodes[event.b]
      const ax = nodeX(a)
      const ay = nodeY(a)
      const bx = nodeX(b)
      const by = nodeY(b)

      context.save()
      context.globalAlpha = alpha * 0.9

      context.strokeStyle = rgba(0.55)
      context.lineWidth = 1
      context.beginPath()
      const steps = 46
      for (let i = 0; i <= steps * draw; i += 1) {
        const [px, py] = bezier(ax, ay, bx, by, event.bow, i / steps)
        if (i === 0) context.moveTo(px, py)
        else context.lineTo(px, py)
      }
      context.stroke()

      // A charge running the length of the new connection.
      if (draw < 1) {
        const [px, py] = bezier(ax, ay, bx, by, event.bow, draw)
        context.fillStyle = '#cfe0ff'
        context.beginPath()
        context.arc(px, py, 2.1, 0, Math.PI * 2)
        context.fill()
      }

      if (draw > 0.82) {
        const [mx, my] = bezier(ax, ay, bx, by, event.bow, 0.5)
        context.globalAlpha = alpha * clamp01((draw - 0.82) / 0.18) * reveal
        context.fillStyle = '#dce6ff'
        context.font = '600 12px ui-monospace, monospace'
        context.textAlign = 'center'
        if ('letterSpacing' in context) context.letterSpacing = '0.22em'
        context.fillText(event.phrase, mx, my - 12)
        if ('letterSpacing' in context) context.letterSpacing = '0em'
        context.textAlign = 'left'
      }

      context.restore()
    }

    const spawnEvent = (now: number) => {
      const cross = CROSSES[Math.floor((now / EVENT_INTERVAL) % CROSSES.length)]
      const a = findLabelIndex(nodes, cross[0])
      const b = findLabelIndex(nodes, cross[1])
      if (a < 0 || b < 0) return

      const distance = Math.hypot(
        nodeX(nodes[a]) - nodeX(nodes[b]),
        nodeY(nodes[a]) - nodeY(nodes[b]),
      )

      event = {
        a,
        b,
        phrase: `${cross[0]} × ${cross[1]}`,
        start: now,
        bow: distance * 0.16 * (Math.floor(now / EVENT_INTERVAL) % 2 ? 1 : -1),
      }
    }

    const render = (now: number) => {
      const elapsed = (now - started) / 1000
      const reveal = reduceMotion
        ? 1
        : smoothstep(clamp01((elapsed - 0.8) / REVEAL_SECONDS))

      // Without a pointer, the scan drifts on its own so the page is never inert.
      if (!pointerSeen || coarsePointer) {
        const t = elapsed * 0.14
        targetX = width * (0.5 + 0.3 * Math.sin(t))
        targetY = height * (0.5 + 0.24 * Math.sin(t * 1.618 + 1.2))
      }
      cursorX += (targetX - cursorX) * 0.085
      cursorY += (targetY - cursorY) * 0.085

      context.fillStyle = BG
      context.fillRect(0, 0, width, height)

      const radius = Math.min(width, height) * (0.19 + 0.05 * reveal)

      // --- brightness -----------------------------------------------------
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i]
        const ambient = reveal * (node.inSigma ? 0.2 : 0.075)
        const extra = node.label || node.anchor ? reveal * 0.07 : 0
        const d = Math.hypot(nodeX(node) - cursorX, nodeY(node) - cursorY)
        const proximity = clamp01(1 - d / radius) ** 2
        const target = Math.min(1, ambient + extra + proximity)
        brightness[i] += (target - brightness[i]) * 0.11
      }

      // --- edges ----------------------------------------------------------
      // Edges are sorted shortest-first, so gating on index makes the network
      // literally densify as the reveal progresses.
      const edgeLimit = edges.length * clamp01(reveal * 1.2)
      context.lineWidth = 0.7
      for (let i = 0; i < edgeLimit; i += 1) {
        const [a, b] = edges[i]
        const strength = Math.min(brightness[a], brightness[b])
        if (strength < 0.03) continue
        context.strokeStyle = rgba(strength ** 1.5 * 0.62)
        context.beginPath()
        context.moveTo(nodeX(nodes[a]), nodeY(nodes[a]))
        context.lineTo(nodeX(nodes[b]), nodeY(nodes[b]))
        context.stroke()
      }

      // --- nodes ----------------------------------------------------------
      for (let i = 0; i < nodes.length; i += 1) {
        const b = brightness[i]
        if (b < 0.02) continue
        const node = nodes[i]
        const x = nodeX(node)
        const y = nodeY(node)
        const breathe = 1 + 0.12 * Math.sin(elapsed * 0.9 + node.seedPhase)
        const r = (0.7 + b * 1.9) * breathe

        context.fillStyle = rgba(0.2 + b * 0.7)
        context.beginPath()
        context.arc(x, y, r, 0, Math.PI * 2)
        context.fill()

        if (b > 0.55) {
          context.fillStyle = `rgba(232,240,255,${(b - 0.55) / 0.45})`
          context.beginPath()
          context.arc(x, y, r * 0.42, 0, Math.PI * 2)
          context.fill()
        }

        if (node.label && b > 0.26) {
          context.save()
          context.globalAlpha = clamp01((b - 0.26) / 0.6)
          context.fillStyle = '#b9c9e8'
          context.font = '10px ui-monospace, monospace'
          if ('letterSpacing' in context) context.letterSpacing = '0.2em'
          context.fillText(node.label, x + 9, y - 7)
          if ('letterSpacing' in context) context.letterSpacing = '0em'
          context.restore()
        }
      }

      // --- the seed point -------------------------------------------------
      if (reveal < 0.5) {
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 2.1)
        context.fillStyle = `rgba(120,170,255,${(1 - reveal * 2) * (0.35 + pulse * 0.65)})`
        context.beginPath()
        context.arc(width / 2, height / 2, 1.8 + pulse * 1.4, 0, Math.PI * 2)
        context.fill()
      }

      // --- collisions -----------------------------------------------------
      if (!reduceMotion && reveal > 0.3) {
        if (nextEventAt === 0) nextEventAt = now + 900
        if (now > nextEventAt && !event) {
          spawnEvent(now)
          nextEventAt = now + EVENT_INTERVAL + Math.random() * 1600
        }
      }
      drawEvent(now, reveal)
      drawCard(now)

      frame = requestAnimationFrame(render)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()
    frame = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerdown', onClick)
      if (canvas.parentNode === host) host.removeChild(canvas)
    }
  }, [])

  return <div ref={hostRef} className={styles.root} />
}
