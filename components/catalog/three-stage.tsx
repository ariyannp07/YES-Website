"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import * as THREE from "three";
import gsap from "gsap";

export interface ThreeStageHandle {
  /** Particles gather into a pulsing search core. */
  enterSearch(): void;
  /** Burst outward; `onReveal` fires at the moment results should appear. */
  resolve(onReveal: () => void): void;
  /** Dim ambiance behind the results grid. */
  setDim(dim: boolean): void;
  /** Back to full hero ambiance. */
  reset(): void;
}

const COUNT = 2200;
const LINK_SAMPLE = 420;
const LINK_DIST = 2.35;
const LINK_MAX = 640;

const VERT = /* glsl */ `
  attribute vec3 aSphere;
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uGather;
  uniform float uPulse;
  uniform float uBurst;
  uniform float uSizeScale;
  varying float vGlow;
  varying float vDepth;
  varying float vSeed;

  vec3 rotY(vec3 p, float a) {
    float c = cos(a); float s = sin(a);
    return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  }

  void main() {
    // drifting ambient field
    vec3 field = position;
    field.x += sin(uTime * 0.18 + aSeed * 12.56) * 0.38;
    field.y += cos(uTime * 0.14 + aSeed * 9.42) * 0.30;
    field.z += sin(uTime * 0.11 + aSeed * 7.85) * 0.34;

    // breathing, rotating gather-sphere target
    vec3 sph = aSphere * (1.0 + 0.055 * sin(uTime * 1.1 + aSeed * 6.28));
    sph = rotY(sph, uTime * 0.55);

    // staggered per-particle gather easing
    float g = clamp(uGather * 1.35 - aSeed * 0.35, 0.0, 1.0);
    g = g * g * (3.0 - 2.0 * g);
    vec3 pos = mix(field, sph, g);

    // swirl that peaks mid-gather
    pos = rotY(pos, sin(g * 3.14159) * (1.6 + aSeed * 1.2));

    // scanning ripple across the gathered core
    float band = sin(pos.y * 3.1 + pos.x * 1.3 - uPulse * 3.4 + aSeed * 2.0);
    float pulse = smoothstep(0.72, 1.0, band) * g;
    pos += normalize(aSphere + 0.0001) * pulse * 0.24;

    // resolve burst — outward and toward the camera
    vec3 dir = normalize(pos + vec3(0.0002, 0.0001, 0.0));
    pos += dir * uBurst * (6.0 + aSeed * 8.0);
    pos.z += uBurst * (3.0 + aSeed * 5.0);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = max(0.001, -mv.z);
    gl_PointSize = aSize * uSizeScale * (46.0 / dist) * (1.0 + pulse * 1.7 + g * 0.4);
    vGlow = pulse;
    vDepth = smoothstep(26.0, 4.0, dist);
    vSeed = aSeed;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  varying float vGlow;
  varying float vDepth;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float core = smoothstep(0.5, 0.06, d);
    float halo = smoothstep(0.5, 0.0, d);
    vec3 col = mix(uColorA, uColorB, clamp(vDepth * 0.85 + vGlow * 0.7, 0.0, 1.0));
    float a = (core * 0.95 + halo * 0.32) * (0.32 + vDepth * 0.68) * uOpacity * (0.72 + vGlow * 1.4);
    if (a < 0.003) discard;
    gl_FragColor = vec4(col, a);
  }
`;

interface StageInternals {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  uniforms: Record<string, THREE.IUniform>;
  linesMat: THREE.LineBasicMaterial;
  searching: boolean;
  dim: boolean;
  raf: number;
  /** Honour prefers-reduced-motion: no drift, no gather, no burst. */
  reduce: boolean;
  /** Draw a single frame — used instead of the RAF loop when motion is off. */
  drawOnce: () => void;
}

const ThreeStage = forwardRef<ThreeStageHandle>(function ThreeStage(_props, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const S = useRef<StageInternals | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      58,
      host.clientWidth / host.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 13);

    const group = new THREE.Group();
    scene.add(group);

    // ————— particle attribute buffers —————
    const field = new Float32Array(COUNT * 3);
    const sphere = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    const sizes = new Float32Array(COUNT);

    const randn = () => {
      let u = 0;
      let v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    };

    for (let i = 0; i < COUNT; i++) {
      // 72% wide flattened nebula, 28% brighter core cluster
      if (Math.random() < 0.72) {
        field[i * 3] = randn() * 4.6;
        field[i * 3 + 1] = randn() * 2.5;
        field[i * 3 + 2] = randn() * 3.0;
      } else {
        field[i * 3] = randn() * 1.5;
        field[i * 3 + 1] = randn() * 1.1;
        field[i * 3 + 2] = randn() * 1.3;
      }

      // fibonacci sphere target with jitter
      const t = (i + 0.5) / COUNT;
      const phi = Math.acos(1 - 2 * t);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 2.3 + (Math.random() - 0.5) * 0.18;
      sphere[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      sphere[i * 3 + 1] = r * Math.cos(phi);
      sphere[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      seeds[i] = Math.random();
      sizes[i] = 0.7 + Math.pow(Math.random(), 3.2) * 3.0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(field, 3));
    geo.setAttribute("aSphere", new THREE.BufferAttribute(sphere, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

    const uniforms: Record<string, THREE.IUniform> = {
      uTime: { value: 0 },
      uGather: { value: 0 },
      uPulse: { value: 0 },
      uBurst: { value: 0 },
      uOpacity: { value: 0 },
      uSizeScale: {
        value: renderer.getPixelRatio() * (host.clientHeight / 900),
      },
      uColorA: { value: new THREE.Color("#1c528f") },
      uColorB: { value: new THREE.Color("#aacdf4") },
    };

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geo, mat);
    group.add(points);

    // ————— constellation links between near neighbours —————
    const linkPositions: number[] = [];
    let links = 0;
    outer: for (let i = 0; i < LINK_SAMPLE; i++) {
      for (let j = i + 1; j < LINK_SAMPLE; j++) {
        const dx = field[i * 3] - field[j * 3];
        const dy = field[i * 3 + 1] - field[j * 3 + 1];
        const dz = field[i * 3 + 2] - field[j * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < LINK_DIST * LINK_DIST) {
          linkPositions.push(
            field[i * 3], field[i * 3 + 1], field[i * 3 + 2],
            field[j * 3], field[j * 3 + 1], field[j * 3 + 2]
          );
          links++;
          if (links >= LINK_MAX) break outer;
        }
      }
    }
    const linesGeo = new THREE.BufferGeometry();
    linesGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(linkPositions), 3)
    );
    const linesMat = new THREE.LineBasicMaterial({
      color: new THREE.Color("#2a629f"),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const lines = new THREE.LineSegments(linesGeo, linesMat);
    group.add(lines);

    // WCAG 2.3.3. A field of 2200 particles drifting, rotating and pulsing
    // forever is continuous motion by any reading, and the search burst is a
    // large sudden movement. With reduced motion requested we draw the field
    // once, statically, and the search choreography collapses to an instant
    // state change — the results still arrive, just without the cinema.
    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = reduceQuery.matches;

    const drawOnce = () => renderer.render(scene, camera);

    S.current = {
      renderer,
      camera,
      uniforms,
      linesMat,
      searching: false,
      dim: false,
      raf: 0,
      reduce,
      drawOnce,
    };

    if (reduce) {
      // Skip the entrance fade; land on the resting state immediately.
      uniforms.uOpacity.value = 1;
      linesMat.opacity = 0.11;
    } else {
      gsap.to(uniforms.uOpacity, { value: 1, duration: 2.2, ease: "power2.out" });
      gsap.to(linesMat, { opacity: 0.11, duration: 2.6, ease: "power2.out", delay: 0.3 });
    }

    // ————— mouse parallax —————
    const mouse = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    if (!reduce) window.addEventListener("mousemove", onMove);

    const onResize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      uniforms.uSizeScale.value = renderer.getPixelRatio() * (h / 900);
      if (S.current?.reduce) drawOnce();
    };
    window.addEventListener("resize", onResize);

    let lastT = performance.now();
    const tick = () => {
      const s = S.current;
      if (!s) return;
      const now = performance.now();
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      uniforms.uTime.value += dt;
      if (s.searching) uniforms.uPulse.value += dt;

      group.rotation.y += dt * 0.02;
      eased.x += (mouse.x - eased.x) * 0.03;
      eased.y += (mouse.y - eased.y) * 0.03;
      group.rotation.x = eased.y * 0.05;
      group.rotation.z = eased.x * -0.02;
      camera.position.x += (eased.x * 0.65 - camera.position.x) * 0.03;
      camera.position.y += (-eased.y * 0.4 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      s.raf = requestAnimationFrame(tick);
    };
    if (reduce) drawOnce();
    else tick();

    return () => {
      const s = S.current;
      if (s) cancelAnimationFrame(s.raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      gsap.killTweensOf([uniforms.uOpacity, uniforms.uGather, uniforms.uBurst, linesMat]);
      geo.dispose();
      linesGeo.dispose();
      mat.dispose();
      linesMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
      S.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    enterSearch() {
      const s = S.current;
      if (!s) return;
      s.searching = true;
      if (s.reduce) return;
      s.uniforms.uPulse.value = 0;
      gsap.killTweensOf([s.uniforms.uGather, s.uniforms.uBurst, s.uniforms.uOpacity, s.linesMat]);
      s.uniforms.uBurst.value = 0;
      gsap.to(s.uniforms.uGather, { value: 1, duration: 1.5, ease: "power3.inOut" });
      gsap.to(s.uniforms.uOpacity, { value: 1, duration: 0.8, ease: "power2.out" });
      gsap.to(s.linesMat, { opacity: 0, duration: 0.7, ease: "power2.out" });
      gsap.to(s.camera.position, { z: 8.6, duration: 1.9, ease: "power2.inOut" });
    },

    resolve(onReveal: () => void) {
      const s = S.current;
      // The reveal must never depend on the animation being available. If WebGL
      // failed, or the effect has not run yet, returning here would drop the
      // callback and leave the page on the searching overlay forever.
      if (!s) {
        onReveal();
        return;
      }
      if (s.reduce) {
        // No burst. Hand the results over at once.
        s.searching = false;
        s.dim = true;
        s.uniforms.uOpacity.value = 0.42;
        s.linesMat.opacity = 0.05;
        s.drawOnce();
        onReveal();
        return;
      }
      gsap.killTweensOf([s.uniforms.uGather, s.uniforms.uBurst, s.uniforms.uOpacity, s.linesMat]);
      const tl = gsap.timeline({
        onComplete: () => {
          s.searching = false;
          s.uniforms.uGather.value = 0;
          s.uniforms.uBurst.value = 0;
          s.dim = true;
          gsap.to(s.uniforms.uOpacity, { value: 0.42, duration: 1.4, ease: "power2.out" });
          gsap.to(s.linesMat, { opacity: 0.05, duration: 1.4, ease: "power2.out" });
        },
      });
      tl.to(s.uniforms.uBurst, { value: 1, duration: 1.05, ease: "power2.in" }, 0);
      tl.to(s.uniforms.uOpacity, { value: 0, duration: 0.5, ease: "power1.in" }, 0.55);
      tl.to(s.camera.position, { z: 13, duration: 1.6, ease: "power2.inOut" }, 0.4);
      tl.call(onReveal, undefined, 0.62);
    },

    setDim(dim: boolean) {
      const s = S.current;
      if (!s || s.searching) return;
      s.dim = dim;
      if (s.reduce) {
        s.uniforms.uOpacity.value = dim ? 0.42 : 1;
        s.linesMat.opacity = dim ? 0.05 : 0.11;
        s.drawOnce();
        return;
      }
      // kill the mount fade-in (and any other opacity tween) — otherwise it
      // keeps running underneath and re-brightens the dimmed stage
      gsap.killTweensOf([s.uniforms.uOpacity, s.linesMat]);
      gsap.to(s.uniforms.uOpacity, { value: dim ? 0.42 : 1, duration: 1.0, ease: "power2.out" });
      gsap.to(s.linesMat, { opacity: dim ? 0.05 : 0.11, duration: 1.0, ease: "power2.out" });
    },

    reset() {
      const s = S.current;
      if (!s) return;
      s.searching = false;
      s.dim = false;
      if (s.reduce) {
        s.uniforms.uGather.value = 0;
        s.uniforms.uBurst.value = 0;
        s.uniforms.uOpacity.value = 1;
        s.linesMat.opacity = 0.11;
        s.drawOnce();
        return;
      }
      gsap.killTweensOf([s.uniforms.uGather, s.uniforms.uBurst, s.uniforms.uOpacity, s.linesMat]);
      gsap.to(s.uniforms.uGather, { value: 0, duration: 0.8, ease: "power2.out" });
      s.uniforms.uBurst.value = 0;
      gsap.to(s.uniforms.uOpacity, { value: 1, duration: 1.0, ease: "power2.out" });
      gsap.to(s.linesMat, { opacity: 0.11, duration: 1.0, ease: "power2.out" });
      gsap.to(s.camera.position, { z: 13, duration: 1.2, ease: "power2.inOut" });
    },
  }));

  return <div ref={hostRef} className="absolute inset-0" aria-hidden />;
});

export default ThreeStage;
