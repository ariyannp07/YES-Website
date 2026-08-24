'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

import { buildGlobe, toVector } from '@/lib/landing/globe-model'
import { NEW_HAVEN } from '@/lib/landing/land'
import { REVEAL_END, TIMING } from '@/lib/landing/timing'

import styles from './globe.module.css'

/**
 * The front door: a network Earth assembling itself out of the dark.
 *
 * Everything is drawn from two buffer geometries — one Points, one LineSegments
 * — with the reveal encoded as a per-vertex `aStart` attribute rather than
 * animated on the CPU. Nothing is added to or removed from the scene while it
 * plays; the GPU simply reads the clock. That is what keeps ~620 nodes and
 * ~830 links smooth on an integrated GPU, and it means the whole sequence is
 * scrubbable by setting one uniform.
 *
 * Sphericality is sold by occlusion, not by a solid Earth: nodes on the far
 * side dim, and a rim-lit haze sits behind them. A textured globe would fight
 * the constellation for attention and read as a stock 3D demo.
 */

const RADIUS = 1
/** Nudged out so links sit just above the haze rather than z-fighting it. */
const LINK_RADIUS = 1.001

const COLORS = {
  deep: new THREE.Color('#0a1a33'),
  line: new THREE.Color('#2f5f9e'),
  node: new THREE.Color('#7fb3e8'),
  hub: new THREE.Color('#dbe9fb'),
  ignite: new THREE.Color('#ffffff'),
}

const NODE_VERT = /* glsl */ `
  attribute float aStart;
  attribute float aWeight;
  attribute float aSeed;

  uniform float uTime;
  uniform float uFade;
  uniform float uSize;
  uniform float uReveal;

  varying float vAlpha;
  varying float vWeight;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);

    // Reveal: this vertex comes online at aStart and eases up over uFade.
    float born = smoothstep(aStart, aStart + uFade, uTime);
    born = max(born, uReveal);

    // Occlusion. The globe is a shell, so anything whose outward normal points
    // away from the camera is on the far side and must recede — this is the
    // whole reason the field reads as a sphere instead of a cloud of dots.
    vec3 nrm = normalize(mat3(modelViewMatrix) * normalize(position));
    float facing = smoothstep(-0.35, 0.45, nrm.z);

    // Slow breathing, seeded per node so the field never pulses in unison.
    float shimmer = 0.86 + 0.14 * sin(uTime * 0.9 + aSeed * 6.2831);

    vWeight = aWeight;
    vAlpha = born * shimmer * (0.18 + 0.82 * facing);

    float dist = max(0.001, -mv.z);
    gl_PointSize = uSize * (0.42 + aWeight * 1.5) * (3.2 / dist);
    gl_Position = projectionMatrix * mv;
  }
`

const NODE_FRAG = /* glsl */ `
  uniform vec3 uNode;
  uniform vec3 uHub;

  varying float vAlpha;
  varying float vWeight;

  void main() {
    // Soft round sprite. A hard disc at this size looks like a pixel, and a
    // texture would be a network request for something two lines of maths do.
    float d = length(gl_PointCoord - vec2(0.5));
    float core = smoothstep(0.5, 0.06, d);
    float halo = smoothstep(0.5, 0.18, d) * 0.55;

    vec3 tint = mix(uNode, uHub, smoothstep(0.4, 1.0, vWeight));

    float alpha = vAlpha * (core + halo);
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(tint, alpha);
  }
`

const LINK_VERT = /* glsl */ `
  attribute float aStart;
  attribute float aLong;

  uniform float uTime;
  uniform float uFade;
  uniform float uReveal;

  varying float vAlpha;
  varying float vLong;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);

    float born = smoothstep(aStart, aStart + uFade, uTime);
    born = max(born, uReveal);

    vec3 nrm = normalize(mat3(modelViewMatrix) * normalize(position));
    float facing = smoothstep(-0.25, 0.5, nrm.z);

    vLong = aLong;
    vAlpha = born * (0.06 + 0.94 * facing);
    gl_Position = projectionMatrix * mv;
  }
`

const LINK_FRAG = /* glsl */ `
  uniform vec3 uLine;

  varying float vAlpha;
  varying float vLong;

  void main() {
    // Intercontinental arcs read a touch brighter — they are the point being
    // made, and at one pixel wide a colour shift is the only lever available.
    float base = mix(0.26, 0.42, vLong);
    float alpha = vAlpha * base;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(uLine, alpha);
  }
`

const HAZE_VERT = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(mat3(modelViewMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const HAZE_FRAG = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uDeep;
  varying vec3 vNormal;
  void main() {
    // Rim light: brightest where the surface turns away, which is what makes a
    // dark sphere legible as a sphere without lighting a single polygon.
    float rim = pow(1.0 - abs(vNormal.z), 2.6);
    gl_FragColor = vec4(uDeep, rim * uOpacity);
  }
`

interface GlobeCanvasProps {
  /** Skips the reveal and renders the settled state. */
  readonly reduced?: boolean
}

export default function GlobeCanvas({ reduced = false }: GlobeCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const reduceMotion =
      reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      // No WebGL. The static copy underneath is a perfectly good front door.
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(host.clientWidth, host.clientHeight)
    renderer.setClearColor(0x000000, 0)
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      34,
      host.clientWidth / host.clientHeight,
      0.1,
      100,
    )
    camera.position.set(0, 0, 4.1)

    const globe = new THREE.Group()
    // Tilt so the northern hemisphere — where most of the network is — sits
    // above the equator line rather than dead centre.
    globe.rotation.x = 0.32
    globe.rotation.y = -0.6
    scene.add(globe)

    const model = buildGlobe()
    const originVec = new THREE.Vector3(...toVector(NEW_HAVEN.lon, NEW_HAVEN.lat))

    // ————— nodes —————
    const count = model.nodes.length
    const positions = new Float32Array(count * 3)
    const starts = new Float32Array(count)
    const weights = new Float32Array(count)
    const seeds = new Float32Array(count)

    model.nodes.forEach((node, i) => {
      positions[i * 3] = node.x * RADIUS
      positions[i * 3 + 1] = node.y * RADIUS
      positions[i * 3 + 2] = node.z * RADIUS
      const jitter = ((i * 2654435761) % 1000) / 1000
      starts[i] =
        TIMING.regions.at +
        node.order * TIMING.regions.stagger +
        jitter * TIMING.regions.jitter
      weights[i] = node.weight
      seeds[i] = jitter
    })
    // New Haven is present from the first region, never jittered late.
    starts[model.origin] = TIMING.regions.at

    const nodeGeo = new THREE.BufferGeometry()
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    nodeGeo.setAttribute('aStart', new THREE.BufferAttribute(starts, 1))
    nodeGeo.setAttribute('aWeight', new THREE.BufferAttribute(weights, 1))
    nodeGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))

    const shared = {
      uTime: { value: 0 },
      uReveal: { value: reduceMotion ? 1 : 0 },
    }

    const nodeMat = new THREE.ShaderMaterial({
      uniforms: {
        ...shared,
        uFade: { value: TIMING.regions.nodeFade },
        uSize: { value: 9 },
        uNode: { value: COLORS.node },
        uHub: { value: COLORS.hub },
      },
      vertexShader: NODE_VERT,
      fragmentShader: NODE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    globe.add(new THREE.Points(nodeGeo, nodeMat))

    // ————— links —————
    const edges = model.edges
    const linkPos = new Float32Array(edges.length * 6)
    const linkStart = new Float32Array(edges.length * 2)
    const linkLong = new Float32Array(edges.length * 2)

    edges.forEach((edge, i) => {
      const a = model.nodes[edge.a]
      const b = model.nodes[edge.b]
      linkPos.set(
        [
          a.x * LINK_RADIUS, a.y * LINK_RADIUS, a.z * LINK_RADIUS,
          b.x * LINK_RADIUS, b.y * LINK_RADIUS, b.z * LINK_RADIUS,
        ],
        i * 6,
      )
      const at = edge.long
        ? TIMING.longEdges.at + (i % 7) * 0.08
        : TIMING.regions.at + edge.order * TIMING.regions.stagger + TIMING.localEdges.delay
      linkStart[i * 2] = at
      linkStart[i * 2 + 1] = at
      linkLong[i * 2] = edge.long ? 1 : 0
      linkLong[i * 2 + 1] = edge.long ? 1 : 0
    })

    const linkGeo = new THREE.BufferGeometry()
    linkGeo.setAttribute('position', new THREE.BufferAttribute(linkPos, 3))
    linkGeo.setAttribute('aStart', new THREE.BufferAttribute(linkStart, 1))
    linkGeo.setAttribute('aLong', new THREE.BufferAttribute(linkLong, 1))

    const linkMat = new THREE.ShaderMaterial({
      uniforms: {
        ...shared,
        uFade: { value: TIMING.localEdges.dur },
        uLine: { value: COLORS.line },
      },
      vertexShader: LINK_VERT,
      fragmentShader: LINK_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    globe.add(new THREE.LineSegments(linkGeo, linkMat))

    // ————— the sphere itself, implied —————
    const hazeMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uDeep: { value: COLORS.deep } },
      vertexShader: HAZE_VERT,
      fragmentShader: HAZE_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    })
    globe.add(new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 1.08, 48, 48), hazeMat))

    // An opaque core so far-side nodes are genuinely occluded rather than
    // merely dimmed — without it the additive blending turns the globe into a
    // transparent ball of light and the illusion of a planet collapses.
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS * 0.985, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x02060d, transparent: true, opacity: 0 }),
    )
    globe.add(core)
    const coreMat = core.material as THREE.MeshBasicMaterial

    // ————— the flash —————
    // ONE point of white, at New Haven. The earlier version pushed a brightness
    // front through every node, which read as the whole planet strobing; the
    // moment is supposed to be a single ignition with an origin, so the ripple
    // is gone and this is the only thing that goes white.
    const flashGeo = new THREE.BufferGeometry()
    flashGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([originVec.x * 1.004, originVec.y * 1.004, originVec.z * 1.004]),
        3,
      ),
    )
    const flashMat = new THREE.ShaderMaterial({
      uniforms: { uTime: shared.uTime, uAt: { value: TIMING.flash.at }, uDur: { value: TIMING.flash.dur } },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uAt;
        uniform float uDur;
        varying float vLife;
        varying float vFacing;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float t = clamp((uTime - uAt) / uDur, 0.0, 1.0);
          // Snap on, then decay — an ignition, not a fade-in.
          vLife = (uTime < uAt) ? 0.0 : pow(1.0 - t, 2.2);
          vec3 nrm = normalize(mat3(modelViewMatrix) * normalize(position));
          vFacing = smoothstep(-0.1, 0.35, nrm.z);
          float dist = max(0.001, -mv.z);
          gl_PointSize = (26.0 + 150.0 * (1.0 - pow(1.0 - t, 3.0))) * vLife * (3.2 / dist);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vLife;
        varying float vFacing;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          float core = smoothstep(0.5, 0.0, d);
          float bloom = pow(core, 0.55);
          float a = vLife * vFacing * bloom;
          if (a < 0.004) discard;
          gl_FragColor = vec4(1.0, 1.0, 1.0, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    globe.add(new THREE.Points(flashGeo, flashMat))

    // ————— starfield —————
    const STARS = 900
    const starPos = new Float32Array(STARS * 3)
    for (let i = 0; i < STARS; i += 1) {
      // Shell well beyond the globe, so stars never intersect the network.
      const v = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      )
      if (v.lengthSq() < 0.0001) v.set(0, 1, 0)
      v.normalize().multiplyScalar(9 + Math.random() * 12)
      starPos.set([v.x, v.y, v.z], i * 3)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({
      color: 0x9ec4ea,
      size: 0.055,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
    scene.add(new THREE.Points(starGeo, starMat))

    // ————— interaction —————
    const drag = { active: false, x: 0, y: 0, vx: 0, vy: 0 }
    const yAxis = new THREE.Vector3(0, 1, 0)
    const xAxis = new THREE.Vector3(1, 0, 0)

    const onDown = (event: PointerEvent) => {
      drag.active = true
      drag.x = event.clientX
      drag.y = event.clientY
      host.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      if (!drag.active) return
      const dx = event.clientX - drag.x
      const dy = event.clientY - drag.y
      drag.x = event.clientX
      drag.y = event.clientY
      // World-axis rotation, so dragging keeps working after the globe has
      // turned — rotating on local axes drifts into a roll within a few drags.
      globe.rotateOnWorldAxis(yAxis, dx * 0.005)
      globe.rotateOnWorldAxis(xAxis, dy * 0.005)
      drag.vx = dx * 0.005
      drag.vy = dy * 0.005
    }
    const onUp = (event: PointerEvent) => {
      drag.active = false
      if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId)
    }

    if (!reduceMotion) {
      host.addEventListener('pointerdown', onDown)
      host.addEventListener('pointermove', onMove)
      host.addEventListener('pointerup', onUp)
      host.addEventListener('pointercancel', onUp)
    }

    const onResize = () => {
      const w = host.clientWidth
      const h = host.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      // Keep the globe filling a similar share of a narrow viewport.
      camera.position.z = w < 640 ? 5.2 : 4.1
      camera.updateProjectionMatrix()
    }
    onResize()
    window.addEventListener('resize', onResize)

    // ————— clock —————
    const start = performance.now()
    let raf = 0
    let last = start

    const ease = (t: number) => t * t * (3 - 2 * t)

    const frame = () => {
      const now = performance.now()
      const elapsed = reduceMotion ? REVEAL_END + 2 : (now - start) / 1000
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      shared.uTime.value = elapsed

      starMat.opacity =
        0.75 * ease(THREE.MathUtils.clamp((elapsed - TIMING.starsIn.at) / TIMING.starsIn.dur, 0, 1))

      const globeIn = THREE.MathUtils.clamp(
        (elapsed - TIMING.globeIn.at) / TIMING.globeIn.dur,
        0,
        1,
      )
      hazeMat.uniforms.uOpacity.value = ease(globeIn) * 0.5
      coreMat.opacity = ease(globeIn) * 0.92

      if (!reduceMotion) {
        if (!drag.active) {
          // Inertia, then a slow ambient drift once it has bled off.
          drag.vx *= 0.94
          drag.vy *= 0.94
          globe.rotateOnWorldAxis(yAxis, drag.vx + dt * 0.045)
          globe.rotateOnWorldAxis(xAxis, drag.vy)
        }
      }

      renderer.render(scene, camera)
      if (!reduceMotion) raf = requestAnimationFrame(frame)
    }

    frame()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      host.removeEventListener('pointerdown', onDown)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerup', onUp)
      host.removeEventListener('pointercancel', onUp)
      nodeGeo.dispose()
      linkGeo.dispose()
      flashGeo.dispose()
      flashMat.dispose()
      starGeo.dispose()
      nodeMat.dispose()
      linkMat.dispose()
      hazeMat.dispose()
      starMat.dispose()
      core.geometry.dispose()
      coreMat.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement)
    }
  }, [reduced])

  return <div ref={hostRef} className={styles.canvas} aria-hidden="true" />
}
