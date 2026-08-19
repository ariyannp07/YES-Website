'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

import { createRandom } from '@/lib/seeded-random'

import styles from './portal.module.css'

/**
 * CONCEPT 3 — THE PORTAL.
 *
 * Opens on a 3px cobalt slit in near-black. After a beat the slit separates
 * dimensionally — two dark planes parting — to reveal an abstract architectural
 * space behind the page. Scrolling dollies the camera THROUGH the opening into
 * that space; the cursor shifts the perspective a few degrees.
 *
 * Deliberately not a sci-fi portal: no rings, no vortex, no glow bloom. The
 * space beyond is a drawing office at architectural scale — grids, frames,
 * suspended structures, things part-assembled in the distance.
 */

const NAVY = 0x03050b
const COBALT = 0x4d8cff

/** Slit width, and how far apart the planes travel. */
const SLIT = 0.5
const OPEN_WIDTH = 78
const OPEN_DELAY = 1.6
const OPEN_DURATION = 4.2

const CAMERA_START_Z = 96
const CAMERA_END_Z = -170

const easeInOut = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2

export default function PortalScene({
  copyRef,
  revealRef,
}: {
  readonly copyRef: React.RefObject<HTMLDivElement | null>
  readonly revealRef: React.RefObject<HTMLDivElement | null>
}) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const canvas = document.createElement('canvas')
    canvas.className = styles.canvas
    host.appendChild(canvas)

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    } catch {
      host.removeChild(canvas)
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(NAVY, 1)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(NAVY, 90, 420)

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 900)
    camera.position.set(0, 0, CAMERA_START_Z)

    const disposables: { dispose(): void }[] = []
    const track = <T extends { dispose(): void }>(item: T): T => {
      disposables.push(item)
      return item
    }

    // --- the space beyond ---------------------------------------------------
    const world = new THREE.Group()
    world.position.z = -40
    scene.add(world)

    const lineMaterial = track(
      new THREE.LineBasicMaterial({ color: COBALT, transparent: true, opacity: 0.34 }),
    )
    const faintMaterial = track(
      new THREE.LineBasicMaterial({ color: COBALT, transparent: true, opacity: 0.14 }),
    )

    // Floor and ceiling grids give the space a measurable scale.
    const floor = new THREE.GridHelper(520, 46, COBALT, COBALT)
    floor.position.y = -46
    ;(floor.material as THREE.Material).transparent = true
    ;(floor.material as THREE.Material).opacity = 0.13
    world.add(floor)

    const ceiling = new THREE.GridHelper(520, 46, COBALT, COBALT)
    ceiling.position.y = 48
    ;(ceiling.material as THREE.Material).transparent = true
    ;(ceiling.material as THREE.Material).opacity = 0.07
    world.add(ceiling)

    // Receding portal frames — the architecture of the space, not decoration.
    const frameGeometry = track(new THREE.BoxGeometry(84, 78, 1))
    const frameEdges = track(new THREE.EdgesGeometry(frameGeometry))
    for (let i = 0; i < 11; i += 1) {
      const frame = new THREE.LineSegments(frameEdges, i % 2 ? faintMaterial : lineMaterial)
      frame.position.z = -40 - i * 34
      world.add(frame)
    }

    // Suspended structures, and a few that assemble on a long loop.
    const random = createRandom(60413)
    const boxGeometry = track(new THREE.BoxGeometry(1, 1, 1))
    const boxEdges = track(new THREE.EdgesGeometry(boxGeometry))
    const assembling: { mesh: THREE.LineSegments; phase: number; scale: THREE.Vector3 }[] = []

    for (let i = 0; i < 54; i += 1) {
      const mesh = new THREE.LineSegments(boxEdges, random() < 0.35 ? lineMaterial : faintMaterial)
      const scale = new THREE.Vector3(
        4 + random() * 18,
        4 + random() * 26,
        4 + random() * 18,
      )
      mesh.scale.copy(scale)
      mesh.position.set(
        (random() - 0.5) * 230,
        (random() - 0.5) * 76,
        -30 - random() * 340,
      )
      mesh.rotation.y = random() * Math.PI
      world.add(mesh)

      if (random() < 0.3) {
        assembling.push({ mesh, phase: random() * 20, scale: scale.clone() })
      }
    }

    // --- the two planes that part -------------------------------------------
    const doorMaterial = track(new THREE.MeshBasicMaterial({ color: NAVY }))
    const doorGeometry = track(new THREE.PlaneGeometry(260, 400))
    const leftDoor = new THREE.Mesh(doorGeometry, doorMaterial)
    const rightDoor = new THREE.Mesh(doorGeometry, doorMaterial)
    scene.add(leftDoor, rightDoor)

    // The light the slit gives off before it becomes an opening.
    const slitMaterial = track(
      new THREE.MeshBasicMaterial({ color: COBALT, transparent: true, opacity: 1 }),
    )
    const slitGeometry = track(new THREE.PlaneGeometry(1, 190))
    const slit = new THREE.Mesh(slitGeometry, slitMaterial)
    slit.position.z = -1.2
    scene.add(slit)

    // --- interaction --------------------------------------------------------
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let aimX = 0
    let aimY = 0
    let leanX = 0
    let leanY = 0
    let scrollProgress = 0
    let easedScroll = 0
    let revealManifesto = 0

    const onPointerMove = (e: PointerEvent) => {
      aimX = (e.clientX / window.innerWidth - 0.5) * 2
      aimY = (e.clientY / window.innerHeight - 0.5) * 2
      // The way in shows itself only when you look toward the bottom of the page.
      revealManifesto = e.clientY / window.innerHeight > 0.72 ? 1 : 0
    }

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      scrollProgress = max > 0 ? window.scrollY / max : 0
    }

    const resize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      // updateStyle must stay on: a canvas is a replaced element, so `inset: 0`
      // does NOT stretch it and it would otherwise lay out at its buffer size.
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    const started = performance.now()
    let frame = 0

    const render = (now: number) => {
      const elapsed = (now - started) / 1000

      const openRaw = reduceMotion
        ? 1
        : Math.min(1, Math.max(0, (elapsed - OPEN_DELAY) / OPEN_DURATION))
      const open = easeInOut(openRaw)

      easedScroll += (scrollProgress - easedScroll) * 0.055
      leanX += (aimX - leanX) * 0.04
      leanY += (aimY - leanY) * 0.04

      // Slit → opening.
      const gap = SLIT + (OPEN_WIDTH - SLIT) * open
      leftDoor.position.x = -(gap / 2 + 130)
      rightDoor.position.x = gap / 2 + 130

      slit.scale.x = gap
      slitMaterial.opacity = Math.max(0, 1 - open * 3.4)
      slit.visible = slitMaterial.opacity > 0.01

      // Scroll carries the camera through the opening and on into the space.
      camera.position.z =
        CAMERA_START_Z + (CAMERA_END_Z - CAMERA_START_Z) * easedScroll
      camera.position.x = leanX * 7
      camera.position.y = -leanY * 5
      camera.lookAt(leanX * 3, -leanY * 2, camera.position.z - 60)

      if (!reduceMotion) {
        world.rotation.y = Math.sin(elapsed * 0.03) * 0.012
        for (const item of assembling) {
          // Long, staggered: a structure resolves roughly every twenty seconds.
          const phase = (elapsed + item.phase) % 20
          const grow = phase < 5 ? easeInOut(phase / 5) : 1
          item.mesh.scale.set(
            item.scale.x,
            item.scale.y * (0.06 + 0.94 * grow),
            item.scale.z,
          )
        }
      }

      // The opening copy belongs to the threshold, not to the space beyond.
      if (copyRef.current) {
        copyRef.current.style.opacity = String(
          Math.max(0, 1 - easedScroll * 3.4) * Math.min(1, openRaw * 1.6 + 0.35),
        )
      }
      if (revealRef.current) {
        revealRef.current.style.opacity = String(revealManifesto)
        revealRef.current.style.pointerEvents = revealManifesto > 0.5 ? 'auto' : 'none'
      }

      renderer.render(scene, camera)
      frame = requestAnimationFrame(render)
    }

    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('scroll', onScroll, { passive: true })
    resize()
    onScroll()
    frame = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('scroll', onScroll)
      for (const item of disposables) item.dispose()
      renderer.dispose()
      if (canvas.parentNode === host) host.removeChild(canvas)
    }
  }, [copyRef, revealRef])

  return <div ref={hostRef} className={styles.stage} />
}
