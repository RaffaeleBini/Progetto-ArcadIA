import { useEffect, useRef } from "react";
import styles from "./SpaceWindow.module.css";

interface Star {
  x: number;
  y: number;
  z: number;
}

const STAR_COUNT = 220;

// Oblò di astronave sulla home: campo di stelle in parallasse disegnato su
// canvas (nessuna dipendenza), con nebulosa e pianeta in CSS. L'animazione si
// ferma con prefers-reduced-motion, a scheda nascosta e fuori viewport.
export default function SpaceWindow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      z: Math.random(),
    }));

    let size = 0;
    let raf = 0;
    let visible = true;
    let last = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = canvas.clientWidth;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (advance: number) => {
      ctx.clearRect(0, 0, size, size);
      const half = size / 2;
      for (const s of stars) {
        s.z -= advance;
        if (s.z <= 0.02) {
          s.x = Math.random() * 2 - 1;
          s.y = Math.random() * 2 - 1;
          s.z = 1;
        }
        // proiezione prospettica: le stelle vicine escono dal centro più in fretta
        const px = half + (s.x / s.z) * half * 0.35;
        const py = half + (s.y / s.z) * half * 0.35;
        if (px < 0 || px > size || py < 0 || py > size) {
          s.z = 1;
          continue;
        }
        const depth = 1 - s.z;
        ctx.globalAlpha = 0.25 + depth * 0.75;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(px, py, 0.4 + depth * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      draw(dt * 0.06);
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      resize();
      if (reducedMotion.matches) {
        draw(0);
        return;
      }
      if (visible && !document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    observer.observe(canvas);
    window.addEventListener("resize", start);
    document.addEventListener("visibilitychange", start);
    reducedMotion.addEventListener("change", start);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", start);
      document.removeEventListener("visibilitychange", start);
      reducedMotion.removeEventListener("change", start);
    };
  }, []);

  return (
    <div className={styles.porthole} aria-hidden="true">
      <div className={styles.glass}>
        <div className={styles.nebula} />
        <div className={styles.planet} />
        <canvas ref={canvasRef} className={styles.stars} />
        <div className={styles.reflection} />
      </div>
    </div>
  );
}
