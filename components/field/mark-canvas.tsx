'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

import {
  EXTRUDE_DEPTH,
  NETWORK_EDGES,
  NETWORK_NODES,
  SIGMA_POLYGONS,
} from '@/lib/yes-geometry'

/**
 * The YES mark, in WebGL.
 *
 * WHY THIS IS NOT CSS. The previous mark was 40 stacked silhouettes on the Z
 * axis. That gets you depth, but a stack of flat planes has no surface normals,
 * so there is nothing for a light to fall on: shading had to be faked as a
 * front-to-back darkening, which is fog, not light. Two things the owners asked
 * for — a fixed light source with real shadows, and grabbing the mark with the
 * cursor — are both impossible without real geometry. So the mark is extruded
 * properly, lit by lights that live in WORLD space (they are children of the
 * scene, never of the spinning group), and it casts shadows onto itself.
 *
 * COST, stated plainly: this breaks build spec §6's "landing page < 50KB JS".
 * Three.js is roughly 150KB gzipped. It is loaded from a dynamically-imported
 * chunk after first paint, and the page renders a static SVG of the mark until
 * it arrives, so LCP is unaffected — but the byte budget is genuinely blown and
 * that was an owner call, not an accident.
 */

const BASE_TILT = -0.16
const AUTO_SPIN = 0.0024
/** How fast a fling decays back to the idle drift. */
const SPIN_EASE = 0.022
const TILT_EASE = 0.05
const TILT_LIMIT = 0.62
const DRAG_SENSITIVITY = 0.0075

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/** Design space is y-down like SVG; WebGL is y-up. */
const toSceneX = (x: number): number => x - 50
const toSceneY = (y: number): number => -(y - 50)

const buildSigmaGeometry = (): THREE.ExtrudeGeometry => {
  const shapes = SIGMA_POLYGONS.map((polygon) => {
    const shape = new THREE.Shape()
    polygon.forEach(([x, y], index) => {
      const px = toSceneX(x)
      const py = toSceneY(y)
      if (index === 0) shape.moveTo(px, py)
      else shape.lineTo(px, py)
    })
    shape.closePath()
    return shape
  })

  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: EXTRUDE_DEPTH,
    bevelEnabled: true,
    bevelThickness: 1.1,
    bevelSize: 1.1,
    bevelSegments: 3,
    curveSegments: 1,
  })

  // Centre on Z only. X and Y are already centred by design, and an explicit
  // translate keeps the mesh and the network in the same frame — geometry
  // .center() would shift by the bevelled bounding box and drift them apart.
  geometry.translate(0, 0, -EXTRUDE_DEPTH / 2)
  geometry.computeVertexNormals()

  return geometry
}

/** A soft round dot. Square points look like dead pixels. */
const buildDotTexture = (): THREE.CanvasTexture => {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const context = canvas.getContext('2d')
  if (context) {
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    )
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.92)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)
  }

  return new THREE.CanvasTexture(canvas)
}

export default function MarkCanvas() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    canvas.style.touchAction = 'none'
    canvas.style.cursor = 'grab'
    host.appendChild(canvas)

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      })
    } catch {
      // No WebGL. The static fallback underneath stays visible.
      host.removeChild(canvas)
      return
    }

    host.dataset.ready = 'true'

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.NeutralToneMapping
    renderer.toneMappingExposure = 1.0

    const scene = new THREE.Scene()

    // An environment map is the difference between "lit plastic" and a surface
    // that looks like it is in a room. Generated once, in memory — no asset
    // fetch, no extra bytes over the wire.
    const pmrem = new THREE.PMREMGenerator(renderer)
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = environment.texture
    scene.environmentIntensity = 0.2
    pmrem.dispose()

    const camera = new THREE.PerspectiveCamera(30, 1, 1, 800)
    camera.position.set(0, 0, 205)

    // --- the solid ---------------------------------------------------------
    const geometry = buildSigmaGeometry()
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x0e3f92,
      roughness: 0.34,
      metalness: 0.06,
      clearcoat: 0.6,
      clearcoatRoughness: 0.25,
      envMapIntensity: 0.4,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true

    // --- the network -------------------------------------------------------
    const nodePositions = new Float32Array(NETWORK_NODES.length * 3)
    NETWORK_NODES.forEach((node, index) => {
      nodePositions[index * 3] = toSceneX(node.x)
      nodePositions[index * 3 + 1] = toSceneY(node.y)
      nodePositions[index * 3 + 2] = node.z
    })

    const nodeGeometry = new THREE.BufferGeometry()
    nodeGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(nodePositions, 3),
    )

    const dotTexture = buildDotTexture()
    const nodeMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 3.1,
      sizeAttenuation: true,
      map: dotTexture,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    })
    const points = new THREE.Points(nodeGeometry, nodeMaterial)

    const edgePositions = new Float32Array(NETWORK_EDGES.length * 6)
    NETWORK_EDGES.forEach(([a, b], index) => {
      edgePositions.set(nodePositions.subarray(a * 3, a * 3 + 3), index * 6)
      edgePositions.set(nodePositions.subarray(b * 3, b * 3 + 3), index * 6 + 3)
    })

    const edgeGeometry = new THREE.BufferGeometry()
    edgeGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(edgePositions, 3),
    )
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
    const lines = new THREE.LineSegments(edgeGeometry, edgeMaterial)

    const group = new THREE.Group()
    group.add(mesh, points, lines)
    group.rotation.x = BASE_TILT
    group.rotation.y = -0.5
    scene.add(group)

    // --- lights, fixed in WORLD space --------------------------------------
    // These are children of the scene, not of the group. That is the whole
    // point: the mark turns underneath a light that does not move, so a face
    // brightens as it swings toward the key and falls off as it swings away.
    const key = new THREE.DirectionalLight(0xffffff, 3.0)
    key.position.set(-70, 95, 120)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.near = 20
    key.shadow.camera.far = 420
    key.shadow.camera.left = -80
    key.shadow.camera.right = 80
    key.shadow.camera.top = 80
    key.shadow.camera.bottom = -80
    key.shadow.bias = -0.0016
    key.shadow.normalBias = 0.4

    const fill = new THREE.DirectionalLight(0x8fb6f0, 0.5)
    fill.position.set(105, -45, 55)

    const rim = new THREE.DirectionalLight(0xc3dbff, 2.0)
    rim.position.set(45, 25, -130)

    const ambient = new THREE.AmbientLight(0x142744, 0.5)

    scene.add(key, fill, rim, ambient)

    // --- interaction -------------------------------------------------------
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const idleSpin = reduceMotion ? 0 : AUTO_SPIN

    let spinVelocity = idleSpin
    let tiltVelocity = 0
    let dragging = false
    let lastX = 0
    let lastY = 0

    const onPointerDown = (event: PointerEvent) => {
      dragging = true
      lastX = event.clientX
      lastY = event.clientY
      canvas.setPointerCapture(event.pointerId)
      canvas.style.cursor = 'grabbing'
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return
      const dx = event.clientX - lastX
      const dy = event.clientY - lastY
      lastX = event.clientX
      lastY = event.clientY
      spinVelocity = dx * DRAG_SENSITIVITY
      tiltVelocity = dy * DRAG_SENSITIVITY
    }

    const endDrag = (event: PointerEvent) => {
      if (!dragging) return
      dragging = false
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }
      canvas.style.cursor = 'grab'
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', endDrag)
    canvas.addEventListener('pointercancel', endDrag)

    // --- loop --------------------------------------------------------------
    let frame = 0
    let visible = true

    const resize = () => {
      const { clientWidth, clientHeight } = host
      if (clientWidth === 0 || clientHeight === 0) return
      renderer.setSize(clientWidth, clientHeight, false)
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
    }

    const tick = () => {
      if (!dragging) {
        // A fling decays back to the idle drift rather than stopping dead.
        spinVelocity += (idleSpin - spinVelocity) * SPIN_EASE
        tiltVelocity *= 1 - TILT_EASE
      }

      group.rotation.y += spinVelocity
      group.rotation.x = clamp(
        group.rotation.x + tiltVelocity,
        BASE_TILT - TILT_LIMIT,
        BASE_TILT + TILT_LIMIT,
      )

      if (!dragging) {
        group.rotation.x += (BASE_TILT - group.rotation.x) * 0.012
      }

      renderer.render(scene, camera)
      frame = requestAnimationFrame(tick)
    }

    const start = () => {
      if (frame === 0) frame = requestAnimationFrame(tick)
    }
    const stop = () => {
      if (frame !== 0) {
        cancelAnimationFrame(frame)
        frame = 0
      }
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    resize()

    // Don't burn a GPU on an object nobody is looking at.
    const intersectionObserver = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true
      if (visible && !document.hidden) start()
      else stop()
    })
    intersectionObserver.observe(host)

    const onVisibility = () => {
      if (document.hidden || !visible) stop()
      else start()
    }
    document.addEventListener('visibilitychange', onVisibility)

    start()

    return () => {
      stop()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', endDrag)
      canvas.removeEventListener('pointercancel', endDrag)

      geometry.dispose()
      material.dispose()
      nodeGeometry.dispose()
      nodeMaterial.dispose()
      edgeGeometry.dispose()
      edgeMaterial.dispose()
      dotTexture.dispose()
      environment.texture.dispose()
      renderer.dispose()

      delete host.dataset.ready
      if (canvas.parentNode === host) host.removeChild(canvas)
    }
  }, [])

  return <div ref={hostRef} className="h-full w-full" />
}
