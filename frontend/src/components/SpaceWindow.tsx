import { useEffect, useRef } from "react";
import styles from "./SpaceWindow.module.css";

interface Star {
  x: number;
  y: number;
  z: number;
}

const STAR_COUNT = 220;

// Finestra del ponte di comando sulla home: campo di stelle in parallasse disegnato su
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

    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;
    let last = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (advance: number) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      for (const s of stars) {
        s.z -= advance;
        if (s.z <= 0.02) {
          s.x = Math.random() * 2 - 1;
          s.y = Math.random() * 2 - 1;
          s.z = 1;
        }
        // proiezione prospettica: le stelle vicine escono dal centro più in fretta
        const px = cx + (s.x / s.z) * cx * 0.35;
        const py = cy + (s.y / s.z) * cy * 0.35;
        if (px < 0 || px > w || py < 0 || py > h) {
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
    <div className={styles.window} aria-hidden="true">
      <div className={styles.glass}>
        <div className={styles.nebula} />
        <div className={styles.planet} />
        <canvas ref={canvasRef} className={styles.stars} />
        <div className={styles.reflection} />
        <svg
          className={styles.hud}
          viewBox="0 0 1200 500"
          preserveAspectRatio="xMidYMid slice"
          focusable="false"
        >
          {/* mirino centrale */}
          <line className={styles.line} x1="600" y1="0" x2="600" y2="500" />
          <line className={styles.line} x1="0" y1="250" x2="1200" y2="250" />

          {/* cerchi concentrici, i due esterni tratteggiati e in lenta rotazione */}
          <circle className={styles.line} cx="600" cy="250" r="55" />
          <circle className={styles.line} cx="600" cy="250" r="100" />
          <circle className={`${styles.line} ${styles.dashed} ${styles.spinSlow}`} cx="600" cy="250" r="145" />
          <circle className={`${styles.line} ${styles.dashed} ${styles.spinReverse}`} cx="600" cy="250" r="190" />

          {/* scansione radar */}
          <g className={styles.sweep}>
            <line className={styles.lineStrong} x1="600" y1="250" x2="600" y2="60" />
          </g>

          {/* orbite ellittiche con un punto in movimento */}
          <g transform="translate(600 250) rotate(-22) scale(1 0.42)">
            <circle className={styles.line} r="360" vectorEffect="non-scaling-stroke" />
            <g className={styles.orbit}>
              <circle className={styles.dot} cx="360" cy="0" r="5" />
            </g>
          </g>
          <g transform="translate(600 250) rotate(14) scale(1 0.3)">
            <circle className={styles.line} r="300" vectorEffect="non-scaling-stroke" />
            <g className={styles.orbitReverse}>
              <circle className={styles.dot} cx="300" cy="0" r="5" />
            </g>
          </g>

          {/* pannello dati in basso a sinistra: barre che variano */}
          <g transform="translate(60 330)">
            <rect className={styles.panel} x="-10" y="-10" width="190" height="110" />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <rect
                key={i}
                className={styles.bar}
                style={{ animationDelay: `${-i * 0.9}s` }}
                x={i * 22}
                y="0"
                width="12"
                height="80"
              />
            ))}
          </g>

          {/* riquadro in alto a destra */}
          <g transform="translate(990 70)">
            <rect className={styles.panel} x="0" y="0" width="150" height="110" />
            <line className={styles.lineFaint} x1="50" y1="0" x2="50" y2="110" />
            <line className={styles.lineFaint} x1="100" y1="0" x2="100" y2="110" />
            <line className={styles.lineFaint} x1="0" y1="37" x2="150" y2="37" />
            <line className={styles.lineFaint} x1="0" y1="73" x2="150" y2="73" />
            <circle className={styles.line} cx="75" cy="55" r="34" />
          </g>

          {/* righe di dati in alto a sinistra */}
          <g className={styles.readout} transform="translate(60 84)">
            <text y="0">SYS 0042 · 7F3A</text>
            <text y="16">LAT 41.9028 · LON 12.4964</text>
            <text y="32">ORB 0386 · 2.41 AU</text>
          </g>
        </svg>
      </div>
      <div className={styles.console} />
    </div>
  );
}
