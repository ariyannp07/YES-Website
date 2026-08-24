'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

import { buildGlobe, toVector } from '@/lib/landing/globe-model'
import { buildAsterism, buildClouds, buildStars } from '@/lib/landing/sky'
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
/** Just under the nodes, so city light always sits on top of the outline. */
const COAST_RADIUS = 0.999

const COLORS = {
  deep: new THREE.Color('#0a1a33'),
  line: new THREE.Color('#33608f'),
  // Paler and cooler than before. The city field used to sit at nearly the
  // same visual weight as the markers, so the two homes had nothing to stand
  // out against; dropping the field back is what makes the gold read.
  node: new THREE.Color('#9fc4e4'),
  hub: new THREE.Color('#e6f1ff'),
  gold: new THREE.Color('#ff9d2e'),
  coast: new THREE.Color('#6e97c4'),
  ember: new THREE.Color('#0a1420'),
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
    float facing = smoothstep(-0.15, 0.25, nrm.z);

    // Slow breathing, seeded per node so the field never pulses in unison.
    float shimmer = 0.86 + 0.14 * sin(uTime * 0.9 + aSeed * 6.2831);

    vWeight = aWeight;
    // Depth handles the far side now; this only softens the limb so nodes do
    // not pop at the silhouette edge.
    vAlpha = born * shimmer * (0.30 + 0.70 * facing);

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
    float facing = smoothstep(-0.1, 0.3, nrm.z);

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
  // render would tear down and rebuild ~5000 points and restart the reveal.
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
    camera.position.set(0, 0, 4.1)

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
    scene.add(globe)

    const model = buildGlobe()

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
    const nodePoints = new THREE.Points(nodeGeo, nodeMat)
    // Draw after the core, so the core cannot paint over the front face.
    nodePoints.renderOrder = 2
    globe.add(nodePoints)

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
    const linkLines = new THREE.LineSegments(linkGeo, linkMat)
    linkLines.renderOrder = 2
    globe.add(linkLines)

    // ————— coastlines —————
    // Drawn under the city light, at very low alpha. This is what gives each
    // landmass an EDGE: without it the dots described extent but not shape, and
    // Europe, Asia and Africa read as a single continent.
    const coastArr = model.coast
    const coastPos = new Float32Array(coastArr.length * 6)
    const coastStart = new Float32Array(coastArr.length * 2)
    coastArr.forEach((seg, i) => {
      coastPos.set(
        [
          seg.ax * COAST_RADIUS, seg.ay * COAST_RADIUS, seg.az * COAST_RADIUS,
          seg.bx * COAST_RADIUS, seg.by * COAST_RADIUS, seg.bz * COAST_RADIUS,
        ],
        i * 6,
      )
      // Coast arrives just before its region's cities, so the shape is there
      // for the lights to land on.
      const at = TIMING.regions.at + seg.order * TIMING.regions.stagger - 0.15
      coastStart[i * 2] = at
      coastStart[i * 2 + 1] = at
    })

    const coastGeo = new THREE.BufferGeometry()
    coastGeo.setAttribute('position', new THREE.BufferAttribute(coastPos, 3))
    coastGeo.setAttribute('aStart', new THREE.BufferAttribute(coastStart, 1))
    coastGeo.setAttribute(
      'aLong',
      new THREE.BufferAttribute(new Float32Array(coastArr.length * 2), 1),
    )

    const coastMat = new THREE.ShaderMaterial({
      uniforms: {
        ...shared,
        uFade: { value: 0.8 },
        uLine: { value: COLORS.coast },
      },
      vertexShader: LINK_VERT,
      fragmentShader: /* glsl */ `
        uniform vec3 uLine;
        varying float vAlpha;
        varying float vLong;
        void main() {
          // Near the floor of visibility, but not below it: a coastline that
          // reads as a drawn border would make the globe a map rather than a
          // constellation, while one too faint to see does not separate Europe
          // from Asia — which was the whole reason for adding it.
          float alpha = vAlpha * 0.46;
          if (alpha < 0.004) discard;
          gl_FragColor = vec4(uLine, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const coastLines = new THREE.LineSegments(coastGeo, coastMat)
    coastLines.renderOrder = 2
    globe.add(coastLines)

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
    const hazeGeo = new THREE.SphereGeometry(RADIUS * 1.08, 48, 48)
    const haze = new THREE.Mesh(hazeGeo, hazeMat)
    haze.renderOrder = 0
    globe.add(haze)

    // The solid body of the planet.
    //
    // Two things here are load-bearing, and getting them wrong emptied the
    // globe completely: it rendered as a thin ring of dots with a black
    // interior. Three.js sorts transparent objects by distance, and the core
    // and the point cloud share a centroid — so the draw order was a coin
    // toss, and whenever the core won it painted over every front-facing node,
    // leaving only the sliver of rim that overhangs its silhouette.
    //
    //   renderOrder  forces the core to draw BEFORE the nodes, always.
    //   depthWrite   lets it occlude the far side honestly, by depth test
    //                rather than by the shader's facing term alone.
    //
    // Radius sits just inside the node shell so front nodes stay in front.
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

    // ————— the ignitions —————
    // One per home, gold rather than white. White read as a system alert; gold
    // reads as a hearth, which is the word the labels use. Each is a single
    // point with an origin — an earlier version pushed a brightness front
    // through every node and the whole planet appeared to strobe.
    const marks = TIMING.marks.map((mark) => {
      const [x, y, z] = toVector(mark.lon, mark.lat)
      return { ...mark, world: new THREE.Vector3(x, y, z) }
    })

    const markPos = new Float32Array(marks.length * 3)
    const markAt = new Float32Array(marks.length)
    marks.forEach((mark, i) => {
      markPos.set([mark.world.x * 1.006, mark.world.y * 1.006, mark.world.z * 1.006], i * 3)
      markAt[i] = mark.at
    })

    // A small disc of night under each marker. Additive blending cannot darken,
    // so the only way to stop a marker being lost in the city light around it
    // is to lay down an opaque patch first and put the ember on top.
    const haloGeo = new THREE.BufferGeometry()
    const haloMat = new THREE.ShaderMaterial({
      uniforms: { uTime: shared.uTime, uDeep: { value: COLORS.ember } },
      vertexShader: /* glsl */ `
        attribute float aAt;
        uniform float uTime;
        varying float vOn;
        varying float vFacing;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vOn = smoothstep(aAt, aAt + 0.35, uTime);
          vec3 nrm = normalize(mat3(modelViewMatrix) * normalize(position));
          vFacing = smoothstep(-0.05, 0.3, nrm.z);
          gl_PointSize = 34.0 * vOn * vFacing * (3.2 / max(0.001, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uDeep;
        varying float vOn;
        varying float vFacing;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          float disc = smoothstep(0.5, 0.16, d);
          float a = disc * vOn * vFacing * 0.92;
          if (a < 0.004) discard;
          gl_FragColor = vec4(uDeep, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
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
          float burst = 46.0 + 300.0 * (1.0 - pow(1.0 - t, 3.0));
          // The ember that stays is deliberately large: this is a place marker
          // that has to survive being surrounded by city light.
          gl_PointSize = max(burst * vLife, 22.0 * vRest) * vFacing * (3.2 / dist);
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
          float core = smoothstep(0.5, 0.0, d);
          float bloom = pow(core, 0.5);
          // The burst runs hot toward white at its peak, then settles to gold.
          vec3 tint = mix(uGold, vec3(1.0, 0.97, 0.9), vLife * 0.8);
          float a = max(vLife * bloom, vRest * pow(core, 1.1)) * vFacing;
          if (a < 0.004) discard;
          gl_FragColor = vec4(tint, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    haloGeo.setAttribute('position', new THREE.BufferAttribute(markPos.slice(), 3))
    haloGeo.setAttribute('aAt', new THREE.BufferAttribute(markAt.slice(), 1))
    const haloPoint = new THREE.Points(haloGeo, haloMat)
    haloPoint.renderOrder = 3
    globe.add(haloPoint)

    const flashPoint = new THREE.Points(flashGeo, flashMat)
    flashPoint.renderOrder = 4
    globe.add(flashPoint)

    // ————— sky —————
    const starData = buildStars()
    const starPos = new Float32Array(starData.length * 3)
    const starSize = new Float32Array(starData.length)
    const starAlpha = new Float32Array(starData.length)
    const starWarm = new Float32Array(starData.length)
    starData.forEach((star, i) => {
      starPos.set([star.x, star.y, star.z], i * 3)
      starSize[i] = star.size
      starAlpha[i] = star.alpha
      starWarm[i] = star.warmth
    })

    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSize, 1))
    starGeo.setAttribute('aAlpha', new THREE.BufferAttribute(starAlpha, 1))
    starGeo.setAttribute('aWarm', new THREE.BufferAttribute(starWarm, 1))

    const starMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uScale: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aAlpha;
        attribute float aWarm;
        uniform float uScale;
        varying float vAlpha;
        varying float vWarm;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vAlpha = aAlpha;
          vWarm = aWarm;
          gl_PointSize = aSize * uScale * (110.0 / max(0.001, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vAlpha;
        varying float vWarm;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          float core = smoothstep(0.5, 0.05, d);
          // Slightly warm on one end, slightly blue on the other. A field of
          // identical white dots reads as noise rather than as sky.
          vec3 cool = vec3(0.78, 0.86, 1.0);
          vec3 warm = vec3(1.0, 0.92, 0.82);
          float a = core * vAlpha * uOpacity;
          if (a < 0.004) discard;
          gl_FragColor = vec4(mix(cool, warm, vWarm * 0.8), a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const starPoints = new THREE.Points(starGeo, starMat)
    // After the core (renderOrder 1), so stars behind the planet are rejected
    // by the depth test. Drawing them first meant the core merely painted over
    // them at 0.92 opacity and ~8% of every occluded star bled through the body.
    starPoints.renderOrder = 2
    scene.add(starPoints)

    // Gas: a few enormous, nearly invisible sprites. Enough to stop the
    // background being flat black, far too faint to read as objects.
    const cloudData = buildClouds()
    const cloudPos = new Float32Array(cloudData.length * 3)
    const cloudSize = new Float32Array(cloudData.length)
    const cloudAlpha = new Float32Array(cloudData.length)
    const cloudHue = new Float32Array(cloudData.length)
    cloudData.forEach((cloud, i) => {
      cloudPos.set([cloud.x, cloud.y, cloud.z], i * 3)
      cloudSize[i] = cloud.size
      cloudAlpha[i] = cloud.alpha
      cloudHue[i] = cloud.hue
    })
    const cloudGeo = new THREE.BufferGeometry()
    cloudGeo.setAttribute('position', new THREE.BufferAttribute(cloudPos, 3))
    cloudGeo.setAttribute('aSize', new THREE.BufferAttribute(cloudSize, 1))
    cloudGeo.setAttribute('aAlpha', new THREE.BufferAttribute(cloudAlpha, 1))
    cloudGeo.setAttribute('aHue', new THREE.BufferAttribute(cloudHue, 1))
    const cloudMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aAlpha;
        attribute float aHue;
        varying float vAlpha;
        varying float vHue;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vAlpha = aAlpha;
          vHue = aHue;
          gl_PointSize = aSize * (110.0 / max(0.001, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vAlpha;
        varying float vHue;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          // Wide, soft falloff — a cloud, not a disc.
          float body = pow(smoothstep(0.5, 0.0, d), 2.4);
          vec3 violet = vec3(0.42, 0.40, 0.72);
          vec3 teal = vec3(0.28, 0.48, 0.68);
          float a = body * vAlpha * uOpacity;
          if (a < 0.002) discard;
          gl_FragColor = vec4(mix(teal, violet, vHue), a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const cloudPoints = new THREE.Points(cloudGeo, cloudMat)
    cloudPoints.renderOrder = 2
    scene.add(cloudPoints)

    // ————— the easter egg —————
    // The Plough and Polaris, at their real coordinates, rotated in as one body
    // so the pointer stars still aim at Polaris. Rendered a touch brighter than
    // the field so it is findable, never so bright that it announces itself.
    const asterism = buildAsterism()
    const egg = [...asterism.stars, asterism.polaris]
    const eggPos = new Float32Array(egg.length * 3)
    const eggMag = new Float32Array(egg.length)
    const eggPole = new Float32Array(egg.length)
    egg.forEach((star, i) => {
      eggPos.set([star.x, star.y, star.z], i * 3)
      eggMag[i] = star.mag
      // Polaris is boosted beyond its real magnitude. Astronomically it is only
      // the 48th brightest star and Alioth outshines it — but the whole point
      // of the egg is the north star, so it is the one that has to read.
      eggPole[i] = star.name === 'Polaris' ? 1 : 0
    })
    const eggGeo = new THREE.BufferGeometry()
    eggGeo.setAttribute('position', new THREE.BufferAttribute(eggPos, 3))
    eggGeo.setAttribute('aMag', new THREE.BufferAttribute(eggMag, 1))
    eggGeo.setAttribute('aPole', new THREE.BufferAttribute(eggPole, 1))
    const eggMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uHover: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aMag;
        attribute float aPole;
        uniform float uHover;
        varying float vBright;
        varying float vPole;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          // Brighter star = lower magnitude, so invert it.
          float b = clamp((3.6 - aMag) / 2.0, 0.15, 1.0);
          vBright = b;
          vPole = aPole;
          // These sat at 0.5-1.3 device pixels — the same sub-pixel mistake the
          // main field had, which is why the asterism was invisible even when
          // correctly placed. Sized to sit clearly ABOVE the surrounding field
          // so the shape is findable without being announced.
          float size = 0.62 + b * 0.85 + aPole * 0.55;
          gl_PointSize = size * (1.0 + uHover * 0.45) * (110.0 / max(0.001, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        uniform float uHover;
        varying float vBright;
        varying float vPole;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          float core = smoothstep(0.5, 0.05, d);
          float halo = smoothstep(0.5, 0.2, d) * 0.5 * vPole;
          float a = (core + halo) * (0.62 + vBright * 0.38) * (1.0 + vPole * 0.35)
                    * uOpacity * (0.8 + uHover * 0.4);
          if (a < 0.004) discard;
          // Polaris runs a touch cooler-white than the rest of the asterism.
          gl_FragColor = vec4(mix(vec3(0.86, 0.92, 1.0), vec3(1.0), vPole), a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const eggPoints = new THREE.Points(eggGeo, eggMat)
    eggPoints.renderOrder = 2
    scene.add(eggPoints)

    // The joining lines appear only on hover — at rest this is just sky.
    const eggLinePos = new Float32Array(asterism.lines.length * 6)
    asterism.lines.forEach(([a, b], i) => {
      const s1 = asterism.stars[a]
      const s2 = asterism.stars[b]
      eggLinePos.set([s1.x, s1.y, s1.z, s2.x, s2.y, s2.z], i * 6)
    })
    const eggLineGeo = new THREE.BufferGeometry()
    eggLineGeo.setAttribute('position', new THREE.BufferAttribute(eggLinePos, 3))
    const eggLineMat = new THREE.LineBasicMaterial({
      color: 0x9fc2e8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
    const eggLines = new THREE.LineSegments(eggLineGeo, eggLineMat)
    eggLines.renderOrder = 2
    scene.add(eggLines)

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
    const pointer = { x: -9999, y: -9999, inside: false }

    const onMove = (event: PointerEvent) => {
      const box = host.getBoundingClientRect()
      pointer.x = event.clientX - box.left
      pointer.y = event.clientY - box.top
      pointer.inside = true

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

    const onLeave = () => {
      pointer.inside = false
      pointer.x = -9999
      pointer.y = -9999
    }

    if (!reduceMotion) {
      host.addEventListener('pointerdown', onDown)
      host.addEventListener('pointerup', onUp)
      host.addEventListener('pointercancel', onUp)
    }
    // Pointer tracking runs even under reduced motion: the easter egg is a
    // hover affordance, not an animation, and hiding it would be a loss.
    host.addEventListener('pointermove', onMove)
    host.addEventListener('pointerleave', onLeave)

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
        el.addEventListener('click', () => clickRef.current?.(mark.id))
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

    const eggEl = document.createElement('span')
    eggEl.className = styles.eggLabel
    eggEl.textContent = 'Ursa Major · Polaris'
    host.appendChild(eggEl)

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

      const starsIn = ease(
        THREE.MathUtils.clamp((elapsed - TIMING.starsIn.at) / TIMING.starsIn.dur, 0, 1),
      )
      starMat.uniforms.uOpacity.value = starsIn
      cloudMat.uniforms.uOpacity.value = starsIn
      eggMat.uniforms.uOpacity.value = starsIn * 0.9

      const globeIn = THREE.MathUtils.clamp(
        (elapsed - TIMING.globeIn.at) / TIMING.globeIn.dur,
        0,
        1,
      )
      hazeMat.uniforms.uOpacity.value = ease(globeIn) * 0.5
      coreMat.opacity = ease(globeIn) * 0.94
      // It writes depth, so while it is still invisible it would cut a
      // star-free circle out of the sky a second before the planet appears.
      core.visible = coreMat.opacity > 0.001

      // The globe stops turning once the descent begins.
      if (!reduceMotion && !drag.active && (dive?.current ?? 0) < 0.002) {
        // The globe holds still through the reveal. Drifting during it moved
        // both homes toward the limb before they ignited, and a planet that
        // stops turning while something happens on it reads as deliberate.
        // Ambient drift eases in once the sequence has finished.
        const settled = THREE.MathUtils.clamp((elapsed - REVEAL_END) / 2.5, 0, 1)
        drag.vx *= 0.94
        drag.vy *= 0.94
        // ~6 minutes per revolution. At 0.045 the planet turned once every two
        // minutes, which swung both homes past the limb — and their labels out
        // of view — within half a minute of the reveal finishing.
        globe.rotateOnWorldAxis(yAxis, drag.vx + dt * 0.018 * settled)
        globe.rotateOnWorldAxis(xAxis, drag.vy)
      }

      // ————— the descent —————
      // The camera falls toward the marker while the globe turns it square to
      // the viewer, which is what makes it read as going DOWN to a place rather
      // than zooming at a picture.
      const p = dive?.current ?? 0
      if (p > 0.0005 || divePrev.current > 0.0005) {
        const easeDive = p * p * (3 - 2 * p)
        camera.position.z = 4.1 - easeDive * 3.02
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
        entry.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
        // Fade with the limb so a label never floats off the planet's edge.
        entry.el.style.opacity = String(THREE.MathUtils.clamp((facing - 0.12) * 4, 0, 1))
      }

      // Easter egg: the asterism responds only to a pointer near it.
      let eggHover = 0
      if (pointer.inside) {
        const w = host.clientWidth
        const h = host.clientHeight
        let cx = 0
        let cy = 0
        let visible = true
        for (const star of egg) {
          projected.set(star.x, star.y, star.z).project(camera)
          if (projected.z > 1) visible = false
          cx += (projected.x * 0.5 + 0.5) * w
          cy += (-projected.y * 0.5 + 0.5) * h
        }
        cx /= egg.length
        cy /= egg.length
        const reach = Math.min(w, h) * 0.17
        const d = Math.hypot(pointer.x - cx, pointer.y - cy)
        if (visible && d < reach) eggHover = THREE.MathUtils.clamp(1 - d / reach, 0, 1)
        eggEl.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px)`
      }
      eggMat.uniforms.uHover.value += (eggHover - eggMat.uniforms.uHover.value) * 0.12
      eggLineMat.opacity = eggMat.uniforms.uHover.value * 0.35 * starsIn
      eggEl.style.opacity = String(eggMat.uniforms.uHover.value * starsIn)

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
      host.removeEventListener('pointerleave', onLeave)
      for (const entry of markEls) entry.el.remove()
      eggEl.remove()
      cloudGeo.dispose()
      cloudMat.dispose()
      eggGeo.dispose()
      eggMat.dispose()
      eggLineGeo.dispose()
      eggLineMat.dispose()
      nodeGeo.dispose()
      linkGeo.dispose()
      coastGeo.dispose()
      coastMat.dispose()
      flashGeo.dispose()
      flashMat.dispose()
      haloGeo.dispose()
      haloMat.dispose()
      starGeo.dispose()
      nodeMat.dispose()
      linkMat.dispose()
      hazeMat.dispose()
      starMat.dispose()
      core.geometry.dispose()
      coreMat.dispose()
      hazeGeo.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement)
    }
  }, [reduced])

  return <div ref={hostRef} className={styles.canvas} aria-hidden="true" />
}
