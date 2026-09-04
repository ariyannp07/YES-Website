'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'

import { buildGlobe, toVector } from '@/lib/landing/globe-model'
import { REVEAL_END, TIMING } from '@/lib/landing/timing'

import styles from './globe.module.css'

/**
 * The front door: a quiet Earth drawn as a single geographic line.
 *
 * A dark core handles occlusion while the coastline stays legible without a
 * stock map texture. The only points are the two labeled YES homes.
 */

const RADIUS = 1
/** Just above the sphere, so the heavier coast does not z-fight the core. */
const COAST_RADIUS = 1.001
const ROUTE_POINT_COUNT = 28

const COLORS = {
  gold: new THREE.Color('#d8bd7c'),
  coast: new THREE.Color('#789bc0'),
  node: new THREE.Color('#79a6ce'),
  hub: new THREE.Color('#e8f4ff'),
}

const LIGHT_VERT = /* glsl */ `
  attribute float aStart;
  attribute float aWeight;
  attribute float aSeed;

  uniform float uTime;
  uniform float uScale;
  varying float vAlpha;
  varying float vWeight;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float born = smoothstep(aStart, aStart + 0.16, uTime);
    vec3 nrm = normalize(mat3(modelViewMatrix) * normalize(position));
    float facing = smoothstep(-0.08, 0.34, nrm.z);
    float shimmer = 0.90 + 0.10 * sin(uTime * 0.85 + aSeed * 6.2831);

    vWeight = aWeight;
    vAlpha = born * facing * shimmer * (0.46 + aWeight * 0.54);

    float dist = max(0.001, -mv.z);
    gl_PointSize = uScale * (4.8 + aWeight * 5.6) * (3.2 / dist);
    gl_Position = projectionMatrix * mv;
  }
`

const LIGHT_FRAG = /* glsl */ `
  uniform vec3 uNode;
  uniform vec3 uHub;
  varying float vAlpha;
  varying float vWeight;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.48) discard;
    float disc = smoothstep(0.48, 0.12, d);
    vec3 tint = mix(uNode, uHub, smoothstep(0.42, 1.0, vWeight));
    float alpha = vAlpha * disc;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(tint, alpha);
  }
`

const ROUTE_VERT = /* glsl */ `
  attribute float aPhase;

  uniform float uTime;
  uniform float uAt;
  uniform float uDur;
  uniform float uSpeed;
  uniform float uScale;
  uniform float uAnimate;

  varying float vAlpha;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 nrm = normalize(mat3(modelViewMatrix) * normalize(position));
    float facing = smoothstep(-0.04, 0.24, nrm.z);

    // Draw the route from New Haven to San Francisco, one point at a time.
    float bornAt = uAt + aPhase * uDur;
    float born = smoothstep(bornAt, bornAt + 0.08, uTime);

    // Once connected, a compact pulse repeatedly travels west along the path.
    float routeComplete = step(uAt + uDur, uTime);
    float head = fract(max(0.0, uTime - uAt - uDur) * uSpeed);
    float separation = abs(aPhase - head);
    separation = min(separation, 1.0 - separation);
    float pulse = smoothstep(0.14, 0.0, separation) * routeComplete * uAnimate;

    vAlpha = born * facing * (0.72 + pulse * 0.28);

    float dist = max(0.001, -mv.z);
    gl_PointSize = uScale * (4.8 + pulse * 3.2) * (3.2 / dist);
    gl_Position = projectionMatrix * mv;
  }
`

const ROUTE_FRAG = /* glsl */ `
  uniform vec3 uGold;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float disc = 1.0 - smoothstep(0.32, 0.5, d);
    float alpha = vAlpha * disc;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(uGold, alpha);
  }
`

/** Great-circle samples with a shallow lift, so the route visibly clears the Earth. */
const routeBetween = (
  from: THREE.Vector3,
  to: THREE.Vector3,
): THREE.Vector3[] => {
  const angle = from.angleTo(to)
  const sinAngle = Math.sin(angle)

  return Array.from({ length: ROUTE_POINT_COUNT }, (_, index) => {
    const phase = index / (ROUTE_POINT_COUNT - 1)
    const point = from
      .clone()
      .multiplyScalar(Math.sin((1 - phase) * angle) / sinAngle)
      .add(to.clone().multiplyScalar(Math.sin(phase * angle) / sinAngle))
      .normalize()
    const lift = 1.009 + Math.sin(Math.PI * phase) * 0.038

    return point.multiplyScalar(lift)
  })
}

interface GlobeCanvasProps {
  /** Skips the reveal and renders the settled state. */
  readonly reduced?: boolean
  /** 0..1 descent progress, shared with the city plate so they fall together. */
  readonly dive?: React.RefObject<number>
  /** Which marker the descent targets. */
  readonly diveTarget?: string
  readonly onMarkerClick?: (id: string) => void
}

export default function GlobeCanvas({
  reduced = false,
  dive,
  diveTarget,
  onMarkerClick,
}: GlobeCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  // Held in a ref so the scene is built once; re-running the effect on every
  // render would tear down and rebuild the coastline.
  const clickRef = useRef(onMarkerClick)
  clickRef.current = onMarkerClick
  /** Last frame's descent value, so the dolly resets exactly once on the way out. */
  const divePrev = useRef(0)

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
    let restCameraZ = host.clientWidth < 640 ? 4.1 : 3.78
    camera.position.set(0, 0, restCameraZ)

    const globe = new THREE.Group()
    // Tilt so the northern hemisphere — where most of the network is — sits
    // above the equator line rather than dead centre.
    globe.rotation.x = 0.32
    // Longitude L sits at azimuth (L + 90) from +Z, and a Y-rotation of `a`
    // moves azimuth to (phi + a) — so facing longitude L means rotating by
    // -(L + 90). -98 is the midpoint between the two homes (New Haven at
    // -72.9, San Francisco at -122.4), so both sit about 25 degrees off centre
    // when they ignite — square to the viewer, nowhere near the limb.
    globe.rotation.y = (-(-98 + 90) * Math.PI) / 180
    const homeOrientation = globe.quaternion.clone()
    const launchOrientation = homeOrientation
      .clone()
      .premultiply(
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          -Math.PI * 0.22,
        ),
      )
    globe.quaternion.copy(reduceMotion ? homeOrientation : launchOrientation)
    scene.add(globe)

    const model = buildGlobe()

    const shared = {
      uTime: { value: 0 },
    }

    // ————— city lights —————
    // Real populated-place samples sit just above the geographic line. They
    // stay small and crisp so the sphere reads as Earth at night, not a field
    // of decorative particles.
    const lightPositions = new Float32Array(model.nodes.length * 3)
    const lightStarts = new Float32Array(model.nodes.length)
    const lightWeights = new Float32Array(model.nodes.length)
    const lightSeeds = new Float32Array(model.nodes.length)
    model.nodes.forEach((node, index) => {
      lightPositions.set([node.x * 1.007, node.y * 1.007, node.z * 1.007], index * 3)
      const jitter = ((index * 2654435761) % 1000) / 1000
      lightStarts[index] =
        TIMING.regions.at +
        node.order * TIMING.regions.stagger +
        jitter * TIMING.regions.jitter
      lightWeights[index] = node.weight
      lightSeeds[index] = jitter
    })
    lightStarts[model.origin] = TIMING.regions.at

    const lightGeo = new THREE.BufferGeometry()
    lightGeo.setAttribute('position', new THREE.BufferAttribute(lightPositions, 3))
    lightGeo.setAttribute('aStart', new THREE.BufferAttribute(lightStarts, 1))
    lightGeo.setAttribute('aWeight', new THREE.BufferAttribute(lightWeights, 1))
    lightGeo.setAttribute('aSeed', new THREE.BufferAttribute(lightSeeds, 1))

    const lightMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: shared.uTime,
        uScale: { value: 1 },
        uNode: { value: COLORS.node },
        uHub: { value: COLORS.hub },
      },
      vertexShader: LIGHT_VERT,
      fragmentShader: LIGHT_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    })
    const lightPoints = new THREE.Points(lightGeo, lightMat)
    lightPoints.renderOrder = 3
    globe.add(lightPoints)

    // ————— coastlines —————
    // With no population field, this line carries the entire geography.
    const coastArr = model.coast
    const coastPos = new Float32Array(coastArr.length * 6)
    coastArr.forEach((seg, i) => {
      coastPos.set(
        [
          seg.ax * COAST_RADIUS, seg.ay * COAST_RADIUS, seg.az * COAST_RADIUS,
          seg.bx * COAST_RADIUS, seg.by * COAST_RADIUS, seg.bz * COAST_RADIUS,
        ],
        i * 6,
      )
    })

    const coastGeo = new LineSegmentsGeometry()
    coastGeo.setPositions(coastPos)
    const coastMat = new LineMaterial({
      color: COLORS.coast.getHex(),
      linewidth: 2.35,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      worldUnits: false,
    })
    const coastLines = new LineSegments2(coastGeo, coastMat)
    coastLines.renderOrder = 2
    globe.add(coastLines)

    // A nearly invisible core gives the coastline honest front/back occlusion.
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS * 0.985, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0x030a14,
        transparent: true,
        opacity: 0,
        depthWrite: true,
      }),
    )
    core.renderOrder = 1
    globe.add(core)
    const coreMat = core.material as THREE.MeshBasicMaterial

    // ————— the two homes —————
    const marks = TIMING.marks.map((mark) => {
      const [x, y, z] = toVector(mark.lon, mark.lat)
      return { ...mark, world: new THREE.Vector3(x, y, z) }
    })

    // ————— dotted route —————
    // The positions live in globe-local space, so the connection turns and
    // returns with the sphere instead of behaving like a screen-space overlay.
    const routePoints = routeBetween(marks[0].world, marks[1].world)
    const routePhases = new Float32Array(ROUTE_POINT_COUNT)
    routePhases.forEach((_, index) => {
      routePhases[index] = index / (ROUTE_POINT_COUNT - 1)
    })

    const routeGeo = new THREE.BufferGeometry().setFromPoints(routePoints)
    routeGeo.setAttribute('aPhase', new THREE.BufferAttribute(routePhases, 1))
    const routeMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: shared.uTime,
        uAt: { value: TIMING.route.at },
        uDur: { value: TIMING.route.dur },
        uSpeed: { value: TIMING.route.speed },
        uScale: { value: 1 },
        uAnimate: { value: reduceMotion ? 0 : 1 },
        uGold: { value: COLORS.gold },
      },
      vertexShader: ROUTE_VERT,
      fragmentShader: ROUTE_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
    })
    const route = new THREE.Points(routeGeo, routeMat)
    route.renderOrder = 4
    globe.add(route)

    const markPos = new Float32Array(marks.length * 3)
    const markAt = new Float32Array(marks.length)
    marks.forEach((mark, i) => {
      markPos.set([mark.world.x * 1.006, mark.world.y * 1.006, mark.world.z * 1.006], i * 3)
      markAt[i] = mark.at
    })

    const flashGeo = new THREE.BufferGeometry()
    flashGeo.setAttribute('position', new THREE.BufferAttribute(markPos, 3))
    flashGeo.setAttribute('aAt', new THREE.BufferAttribute(markAt, 1))

    const flashMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: shared.uTime,
        uDur: { value: TIMING.flash.dur },
        uGold: { value: COLORS.gold },
      },
      vertexShader: /* glsl */ `
        attribute float aAt;
        uniform float uTime;
        uniform float uDur;
        varying float vLife;
        varying float vFacing;
        varying float vRest;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float t = clamp((uTime - aAt) / uDur, 0.0, 1.0);
          // Snap on, then decay — an ignition, not a fade-in.
          vLife = (uTime < aAt) ? 0.0 : pow(1.0 - t, 2.0);
          // A small ember stays behind, so the place keeps its marker.
          vRest = (uTime < aAt) ? 0.0 : smoothstep(0.0, 1.0, t);
          vec3 nrm = normalize(mat3(modelViewMatrix) * normalize(position));
          vFacing = smoothstep(-0.05, 0.3, nrm.z);
          float dist = max(0.001, -mv.z);
          float burst = 33.0 + 42.0 * (1.0 - pow(1.0 - t, 3.0));
          gl_PointSize = max(burst * vLife, 24.0 * vRest) * vFacing * (3.2 / dist);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uGold;
        varying float vLife;
        varying float vFacing;
        varying float vRest;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.46) discard;
          vec3 tint = mix(uGold, vec3(1.0, 0.97, 0.9), vLife * 0.8);
          float a = max(vLife, vRest) * vFacing;
          if (a < 0.004) discard;
          gl_FragColor = vec4(tint, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })
    const flashPoint = new THREE.Points(flashGeo, flashMat)
    flashPoint.renderOrder = 5
    globe.add(flashPoint)

    // ————— interaction —————
    const drag = { active: false, returning: false, x: 0, y: 0 }
    const yAxis = new THREE.Vector3(0, 1, 0)
    const xAxis = new THREE.Vector3(1, 0, 0)

    const onDown = (event: PointerEvent) => {
      // A press that starts on a marker belongs to the marker, not to the drag.
      //
      // This is why clicking the marker did nothing: setPointerCapture on the
      // host retargets every subsequent pointer event — including the one the
      // browser derives `click` from — to the canvas, so the marker's own
      // listener never fired. Calling .click() in the console worked, which is
      // exactly what made it look fine in testing.
      const target = event.target as HTMLElement | null
      if (target?.dataset?.clickable === 'true') return

      drag.active = true
      drag.returning = false
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
    }
    const onUp = (event: PointerEvent) => {
      drag.active = false
      drag.returning = true
      if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId)
    }

    if (!reduceMotion) {
      host.addEventListener('pointerdown', onDown)
      host.addEventListener('pointerup', onUp)
      host.addEventListener('pointercancel', onUp)
    }
    host.addEventListener('pointermove', onMove)

    /**
     * The copy block's box, so a marker label never lands on top of it.
     *
     * On a phone the globe fills the frame and the copy is centred, so this
     * collides constantly — "SF · HOME" was drawn straight through "YALE
     * ENTREPRENEURIAL SOCIETY" and both became unreadable. Cached and
     * refreshed on resize rather than measured per frame, which would force
     * layout sixty times a second.
     */
    let copyBox: DOMRect | null = null
    const measureCopy = () => {
      const el = host.parentElement?.querySelector('[data-landing-copy]')
      copyBox = el ? el.getBoundingClientRect() : null
    }

    const onResize = () => {
      const w = host.clientWidth
      const h = host.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      coastMat.resolution.set(w, h)
      lightMat.uniforms.uScale.value = w < 640 ? 0.58 : 1
      routeMat.uniforms.uScale.value = w < 640 ? 0.78 : 1
      // Keep the globe filling a similar share of a narrow viewport.
      restCameraZ = w < 640 ? 4.1 : 3.78
      camera.position.z = restCameraZ
      camera.updateProjectionMatrix()
      measureCopy()
    }
    onResize()
    window.addEventListener('resize', onResize)

    // ————— labels —————
    // Positioned in screen space each frame from the projected 3D point, rather
    // than drawn into the canvas: real DOM text stays crisp at any DPR, honours
    // the page's font stack, and can be read by assistive tech.
    const markEls = marks.map((mark) => {
      const el = document.createElement('span')
      el.className = styles.marker
      el.dataset.markerId = mark.id
      el.textContent = ''
      if (mark.id === diveTarget) {
        // Only the dive target is interactive, and it says so.
        el.dataset.clickable = 'true'
        el.setAttribute('role', 'button')
        el.setAttribute('tabindex', '0')
        el.setAttribute('title', 'Open New Haven')
        // Both `click` and `pointerup`, guarded against firing twice.
        //
        // `click` alone was silently swallowed: the canvas captured the pointer
        // on pointerdown, which retargets the events the browser derives the
        // click from. `pointerup` alone is not enough either — plenty of
        // environments (and every automation harness I tested against) deliver
        // mouse events without synthesising pointer ones. Taking both, with a
        // short guard, is the only version that fires exactly once everywhere.
        let lastFired = 0
        const open = (event: Event) => {
          event.stopPropagation()
          const now = Date.now()
          if (now - lastFired < 400) return
          lastFired = now
          clickRef.current?.(mark.id)
        }
        el.addEventListener('pointerdown', (event) => event.stopPropagation())
        el.addEventListener('mousedown', (event) => event.stopPropagation())
        el.addEventListener('pointerup', open)
        el.addEventListener('click', open)
        el.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            clickRef.current?.(mark.id)
          }
        })
      }
      host.appendChild(el)
      return { mark, el, shown: -1 }
    })

    const projected = new THREE.Vector3()
    const worldPoint = new THREE.Vector3()


    // Orientation that brings the dive target to face the camera.
    const diveMark = marks.find((m) => m.id === diveTarget) ?? null
    const faceTarget = new THREE.Quaternion()
    if (diveMark) {
      faceTarget.setFromUnitVectors(diveMark.world.clone().normalize(), new THREE.Vector3(0, 0, 1))
    }

    /** Projects a globe-local point to CSS pixels, with a facing test. */
    const project = (local: THREE.Vector3) => {
      worldPoint.copy(local).applyMatrix4(globe.matrixWorld)
      projected.copy(worldPoint).project(camera)
      const w = host.clientWidth
      const h = host.clientHeight
      // Facing: the outward normal at that point versus the view direction.
      const towardCamera = camera.position.clone().sub(worldPoint).normalize()
      const normal = worldPoint.clone().normalize()
      return {
        x: (projected.x * 0.5 + 0.5) * w,
        y: (-projected.y * 0.5 + 0.5) * h,
        facing: normal.dot(towardCamera),
      }
    }

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

      const globeIn = THREE.MathUtils.clamp(
        (elapsed - TIMING.globeIn.at) / TIMING.globeIn.dur,
        0,
        1,
      )
      coastMat.opacity = ease(globeIn) * 0.92
      coreMat.opacity = ease(globeIn) * 0.94
      // It writes depth, so keep it hidden until the reveal begins.
      core.visible = coreMat.opacity > 0.001

      const arrival = reduceMotion
        ? 1
        : ease(THREE.MathUtils.clamp((elapsed - 0.02) / 0.42, 0, 1))
      if (!drag.active && arrival < 1) {
        globe.quaternion.slerpQuaternions(launchOrientation, homeOrientation, arrival)
      } else if (!drag.active && !drag.returning && elapsed < 0.54) {
        globe.quaternion.copy(homeOrientation)
      }

      if (
        !reduceMotion &&
        !drag.active &&
        drag.returning &&
        (dive?.current ?? 0) < 0.002
      ) {
        const step = 1 - Math.exp(-dt * 4.2)
        globe.quaternion.slerp(homeOrientation, step)
        if (globe.quaternion.angleTo(homeOrientation) < 0.001) {
          globe.quaternion.copy(homeOrientation)
          drag.returning = false
        }
      }

      // ————— the descent —————
      // The camera falls toward the marker while the globe turns it square to
      // the viewer, which is what makes it read as going DOWN to a place rather
      // than zooming at a picture.
      const p = dive?.current ?? 0
      if (p > 0.0005 || divePrev.current > 0.0005) {
        const easeDive = p * p * (3 - 2 * p)
        camera.position.z = restCameraZ - easeDive * (restCameraZ - 1.08)
        camera.updateProjectionMatrix()
        if (diveMark) {
          globe.quaternion.slerp(faceTarget, Math.min(1, 0.06 + easeDive * 0.12))
        }
        // Hand over cleanly: the globe is fully gone by 0.58, and the street
        // only begins to rise at 0.52, so the two barely overlap.
        host.style.opacity = String(Math.max(0, 1 - Math.max(0, (p - 0.26) / 0.32)))
      }
      divePrev.current = p

      globe.updateMatrixWorld()

      // Marker labels: place, reveal by character, hide on the far side.
      for (const entry of markEls) {
        const { x, y, facing } = project(entry.mark.world)
        const visible = facing > 0.12 && elapsed >= entry.mark.typeAt
        if (!visible) {
          entry.el.style.opacity = '0'
          continue
        }
        const chars = reduceMotion
          ? entry.mark.label.length
          : Math.floor((elapsed - entry.mark.typeAt) * TIMING.marker.cps)
        const next = Math.max(0, Math.min(entry.mark.label.length, chars))
        if (next !== entry.shown) {
          entry.el.textContent = entry.mark.label.slice(0, next)
          entry.shown = next
        }
        // Keep the label on screen without throwing it across the continent.
        //
        // On a phone "New Haven · Home" is wider than the margin it had and the
        // word HOME was clipped by the viewport. Flipping it fully to the left
        // of the dot fixed the clipping but landed it over the brightest part
        // of North America, where it was unreadable. Clamping slides it just
        // far enough to fit while it stays beside its own dot.
        const labelWidth = entry.el.offsetWidth || 0
        const maxLeft = host.clientWidth - labelWidth - 10
        const lx = Math.max(8, Math.min(x, maxLeft))
        entry.el.style.transform = `translate(${lx.toFixed(1)}px, ${y.toFixed(1)}px)`

        // Fade with the limb so a label never floats off the planet's edge.
        let alpha = THREE.MathUtils.clamp((facing - 0.12) * 4, 0, 1)

        // Yield to the copy. The ember stays — it is drawn in the scene — so
        // the place is still marked, it just stops shouting over the name.
        if (copyBox) {
          const box = entry.el.getBoundingClientRect()
          const hostBox = host.getBoundingClientRect()
          const overlaps =
            box.right > copyBox.left - 12 &&
            box.left < copyBox.right + 12 &&
            box.bottom > copyBox.top - 8 &&
            box.top < copyBox.bottom + 8 &&
            box.width > 0
          if (overlaps) alpha = 0
          void hostBox
        }

        entry.el.style.opacity = String(alpha)
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
      for (const entry of markEls) entry.el.remove()
      coastGeo.dispose()
      coastMat.dispose()
      lightGeo.dispose()
      lightMat.dispose()
      flashGeo.dispose()
      flashMat.dispose()
      routeGeo.dispose()
      routeMat.dispose()
      core.geometry.dispose()
      coreMat.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement)
    }
  }, [reduced])

  return <div ref={hostRef} className={styles.canvas} aria-hidden="true" />
}
