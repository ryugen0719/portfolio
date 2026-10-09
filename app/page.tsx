"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { GridItem } from "./types";
import { gridLayout, itemsRegistry } from "./data";
import { CellContent } from "./components/InfoBlocks";

/* ════════════════════════════════════════════
   Grid Generation Logic
   ════════════════════════════════════════════ */
const gridItems: GridItem[] = [];
const seenKeys = new Set<string>();

for (let r = 0; r < gridLayout.length; r++) {
  for (let c = 0; c < gridLayout[r].length; c++) {
    const id = gridLayout[r][c];
    if (id === "empty") {
      gridItems.push({ type: "empty" });
    } else if (!seenKeys.has(id)) {
      seenKeys.add(id);
      gridItems.push(itemsRegistry[id] || { type: "empty" });
    } else {
      // 既に配置された要素の結合部分は empty（空間のプレースホルダー）として扱う
      gridItems.push({ type: "empty" });
    }
  }
}

const COLS = gridLayout[0].length;
const ROWS = Math.ceil(gridItems.length / COLS);
const CELL_W = 310;
const CELL_H = 250;
const GAP = 14;
const STEP_X = CELL_W + GAP;
const STEP_Y = CELL_H + GAP;
const CONTENT_W = COLS * STEP_X;
const CONTENT_H = ROWS * STEP_Y;
const FRICTION = 0.92;
const WHEEL_SPEED = 1.2;

/* ════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════ */
function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/* ════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════ */
export default function PortfolioPage() {
  /* ── State ── */
  const [mounted, setMounted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [, setTick] = useState(0);        // forces re-render
  const [isDragging, setIsDragging] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const [vpSize, setVpSize] = useState({ w: 1920, h: 1080 });

  /* ── Refs ── */
  const canvasRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef({ x: 0, y: 0 });
  const velRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const camStartRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastMouseRef = useRef({ x: 0, y: 0, t: 0 });
  const hasScrolledRef = useRef(false);

  /* ── Mount ── */
  useEffect(() => {
    setMounted(true);
    const update = () => setVpSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    // Center camera so content is roughly centered
    cameraRef.current = {
      x: (CONTENT_W - window.innerWidth) / 2,
      y: (CONTENT_H - window.innerHeight) / 2,
    };
    setTick((t) => t + 1);
    window.addEventListener("resize", update);

    const loadingTimer = setTimeout(() => {
      setIsLoaded(true);
    }, 1200);

    return () => {
      window.removeEventListener("resize", update);
      clearTimeout(loadingTimer);
    };
  }, []);

  /* ── Wheel ── */
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const dx = (e.deltaX || (e.shiftKey ? e.deltaY : 0)) * WHEEL_SPEED;
      const dy = (e.shiftKey ? 0 : e.deltaY) * WHEEL_SPEED;
      cameraRef.current.x += dx;
      cameraRef.current.y += dy;
      setTick((t) => t + 1);

      if (!hasScrolledRef.current) {
        hasScrolledRef.current = true;
        setHintVisible(false);
      }
    },
    [],
  );

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  /* ── Momentum animation ── */
  const startMomentum = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const animate = () => {
      velRef.current.x *= FRICTION;
      velRef.current.y *= FRICTION;

      if (
        Math.abs(velRef.current.x) < 0.3 &&
        Math.abs(velRef.current.y) < 0.3
      ) {
        velRef.current = { x: 0, y: 0 };
        rafRef.current = null;
        return;
      }

      cameraRef.current.x -= velRef.current.x;
      cameraRef.current.y -= velRef.current.y;
      setTick((t) => t + 1);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  /* ── Drag handlers ── */
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDraggingRef.current = true;
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      camStartRef.current = { ...cameraRef.current };
      lastMouseRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
      velRef.current = { x: 0, y: 0 };
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

      if (!hasScrolledRef.current) {
        hasScrolledRef.current = true;
        setHintVisible(false);
      }
    },
    [],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    cameraRef.current.x = camStartRef.current.x - dx;
    cameraRef.current.y = camStartRef.current.y - dy;

    // Track velocity
    const now = Date.now();
    const dt = Math.max(1, now - lastMouseRef.current.t);
    velRef.current = {
      x: (e.clientX - lastMouseRef.current.x) / dt * 16,
      y: (e.clientY - lastMouseRef.current.y) / dt * 16,
    };
    lastMouseRef.current = { x: e.clientX, y: e.clientY, t: now };

    setTick((t) => t + 1);
  }, []);

  const onPointerUp = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
    startMomentum();
  }, [startMomentum]);

  /* ── Calculate visible cells ── */
  const cam = cameraRef.current;
  const buffer = 2;

  const startCol = Math.floor(cam.x / STEP_X) - buffer;
  const endCol = Math.ceil((cam.x + vpSize.w) / STEP_X) + buffer;
  const startRow = Math.floor(cam.y / STEP_Y) - buffer;
  const endRow = Math.ceil((cam.y + vpSize.h) / STEP_Y) + buffer;

  const visibleCells: {
    key: string;
    item: GridItem;
    x: number;
    y: number;
    w: number;
    h: number;
    scale: number;
    opacity: number;
  }[] = [];

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const wCol = mod(col, COLS);
      const wRow = mod(row, ROWS);
      const idx = wRow * COLS + wCol;
      if (idx >= gridItems.length) continue;
      
      const item = gridItems[idx];
      if (item.type === "empty") continue;

      let w = CELL_W;
      let h = CELL_H;
      if (item.type === "brand") {
        w = CELL_W * 2 + GAP;
      } else if (item.type === "project") {
        if (item.size === "wide") {
          w = CELL_W * 2 + GAP;
        } else if (item.size === "tall") {
          h = CELL_H * 2 + GAP;
        } else if (item.size === "large") {
          w = CELL_W * 2 + GAP;
          h = CELL_H * 2 + GAP;
        }
      }

      const sx = col * STEP_X - cam.x;
      const sy = row * STEP_Y - cam.y;

      // Distance from viewport center (normalized)
      const cx = sx + w / 2;
      const cy = sy + h / 2;
      const nx = (cx - vpSize.w / 2) / (vpSize.w / 2);
      const ny = (cy - vpSize.h / 2) / (vpSize.h / 2);
      const dist = Math.sqrt(nx * nx + ny * ny);
      const t = Math.min(1, dist * 0.65);
      const scale = 1 - 0.35 * t * t;
      const opacity = 1 - 0.55 * t * t;

      visibleCells.push({
        key: `${col}_${row}`,
        item,
        x: sx,
        y: sy,
        w,
        h,
        scale,
        opacity,
      });
    }
  }

  return (
    <>
      {/* Loading Screen */}
      <div className={`loading-screen ${isLoaded ? "is-hidden" : ""}`}>
        <div className="loading-text">RYUGEN</div>
        <div className="loading-bar-container">
          <div className="loading-bar" />
        </div>
      </div>

      {mounted && (
        <>
          {/* Background layers */}
          <div className="canvas-bg" />
          <div className="canvas-grid-tex" />

          {/* Vignette overlay for edge darkening */}
          <div className="vignette" />

          {/* Scroll hint */}
          <div className={`scroll-hint ${hintVisible ? "" : "hidden"}`}>
            <span className="scroll-hint__arrows">↕ ↔</span>
            Scroll or drag to explore
          </div>

          {/* Canvas */}
          <div
            ref={canvasRef}
            className={`infinite-canvas${isDragging ? " is-dragging" : ""}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            id="infinite-canvas"
          >
            <div className="cell-layer">
              {visibleCells.map(({ key, item, x, y, w, h, scale, opacity }) => (
                <div
                  key={key}
                  className="canvas-cell"
                  style={{
                    width: w,
                    height: h,
                    transform: `translate(${x}px, ${y}px) scale(${scale})`,
                    opacity,
                  }}
                >
                  <CellContent item={item} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}className="cell-info">
      <h2>
        <span className="cell-info__icon">🛠</span>
        Skills
      </h2>
      <div className="skills-wrap">
        {skills.map((s) => (
          <span key={s} className="skill-chip">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Status ── */
function StatusCell() {
  return (
    <div className="cell-info cell-status">
      <div className="status-dot" />
      <h3>Available</h3>
      <p>作品制作中・コラボ歓迎</p>
    </div>
  );
}

/* ── Quote ── */
function QuoteCell() {
  return (
    <div className="cell-info cell-quote">
      <blockquote>
        コードは詩であり、
        <br />
        プログラミングは芸術である。
      </blockquote>
      <cite>— My Philosophy</cite>
    </div>
  );
}

/* ── Brand ── */
function BrandCell() {
  return (
    <div className="cell-info" style={{ background: "transparent", border: "none", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 32 }}>
      <div className="center-brand__logo" style={{ width: 150, height: 150, margin: 0, flexShrink: 0 }}>
        <Image src="/Logo.jpg" alt="Ryugen Logo" width={150} height={150} style={{ objectFit: "cover" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <h1 style={{ fontSize: "3.4rem", fontWeight: 900, background: "linear-gradient(135deg, var(--text-primary), var(--text-muted))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0, textShadow: "0 8px 30px rgba(0,0,0,0.7)", letterSpacing: "0.02em" }}>RYUGEN</h1>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.15em", marginTop: 4 }}>Creative Developer</p>
      </div>
    </div>
  );
}

/* ── Stat ── */
function StatCell({ number, label }: { number: string; label: string }) {
  return (
    <div className="cell-info cell-stat">
      <div className="stat-number">{number}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
