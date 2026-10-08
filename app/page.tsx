"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

/* ════════════════════════════════════════════
   Types
   ════════════════════════════════════════════ */
type ProjectItem = {
  type: "project";
  title: string;
  description: string;
  image: string;
  tags: { label: string; color: string }[];
  category: string;
  link: string;
  size?: "normal" | "wide" | "tall" | "large";
};

type StatItem = { type: "stat"; number: string; label: string };
type InfoItem = {
  type: "about" | "links" | "specs" | "skills" | "status" | "quote" | "brand" | "empty";
};

type GridItem = ProjectItem | StatItem | InfoItem;

/* ════════════════════════════════════════════
   Data
   ════════════════════════════════════════════ */
const projects: ProjectItem[] = [
  {
    type: "project",
    title: "Candy 3D",
    description: "Blenderで制作したポップなキャンディの3Dアート。",
    image: "/works/blender/CANDY.png",
    tags: [{ label: "Blender", color: "orange" }, { label: "3D Art", color: "pink" }],
    category: "3D",
    link: "#",
    size: "large", // 2x2
  },
  {
    type: "project",
    title: "Umbrella",
    description: "和傘をモチーフにした3Dモデリングとライティングの習作。",
    image: "/works/blender/傘.png",
    tags: [{ label: "Blender", color: "orange" }],
    category: "3D",
    link: "#",
  },
  {
    type: "project",
    title: "Abstract Cube",
    description: "幾何学的なキューブの抽象的な表現。",
    image: "/works/blender/cube2.png",
    tags: [{ label: "Blender", color: "orange" }, { label: "Abstract", color: "green" }],
    category: "3D",
    link: "#",
  },
  {
    type: "project",
    title: "Room 0001",
    description: "室内風景の3Dモデリング。光と影の演出。",
    image: "/works/blender/0001.png",
    tags: [{ label: "Blender", color: "orange" }, { label: "Interior", color: "" }],
    category: "3D",
    link: "#",
  },
  {
    type: "project",
    title: "Photography #1",
    description: "日常の風景を切り取った一枚。",
    image: "/works/photo/_IMG0083.jpg",
    tags: [{ label: "Photo", color: "pink" }],
    category: "Photography",
    link: "#",
  },
  {
    type: "project",
    title: "Photography #2",
    description: "光と構図を意識した写真作品。",
    image: "/works/photo/_IMG0144.jpg",
    tags: [{ label: "Photo", color: "pink" }],
    category: "Photography",
    link: "#",
  },
  {
    type: "project",
    title: "Photography #3",
    description: "風景のスナップショット。",
    image: "/works/photo/_IMG0174.jpg",
    tags: [{ label: "Photo", color: "pink" }, { label: "Landscape", color: "green" }],
    category: "Photography",
    link: "#",
  },
  {
    type: "project",
    title: "Neon Cube",
    description: "ネオンカラーを基調としたキューブのレンダリング。",
    image: "/works/blender/36.png",
    tags: [{ label: "Blender", color: "orange" }, { label: "Neon", color: "cyan" }],
    category: "3D",
    link: "#",
    size: "wide", // 2x1
  },
  {
    type: "project",
    title: "Color Adjust",
    description: "3Dレンダリング後の合成と色調整のテスト。",
    image: "/works/blender/合成色調整.png",
    tags: [{ label: "Blender", color: "orange" }, { label: "Compositing", color: "pink" }],
    category: "3D",
    link: "#",
  },
  {
    type: "project",
    title: "Photography #4",
    description: "自然の風景写真。",
    image: "/works/photo/IMG20260405132205.jpg",
    tags: [{ label: "Photo", color: "pink" }, { label: "Nature", color: "green" }],
    category: "Photography",
    link: "#",
  },
  {
    type: "project",
    title: "Lighting Test",
    description: "3D空間におけるライティングの実験。",
    image: "/works/blender/Light.png",
    tags: [{ label: "Blender", color: "orange" }, { label: "Lighting", color: "cyan" }],
    category: "3D",
    link: "#",
  },
  {
    type: "project",
    title: "Room 0420",
    description: "3Dで構築されたインテリアデザイン。",
    image: "/works/blender/0420.png",
    tags: [{ label: "Blender", color: "orange" }, { label: "Design", color: "" }],
    category: "3D",
    link: "#",
  },
  {
    type: "project",
    title: "Testing 45",
    description: "モデリングのテストショット。",
    image: "/works/blender/45.png",
    tags: [{ label: "Blender", color: "orange" }],
    category: "3D",
    link: "#",
  },
  {
    type: "project",
    title: "Photography #5",
    description: "被写界深度を活かした写真。",
    image: "/works/photo/_IMG0184.jpg",
    tags: [{ label: "Photo", color: "pink" }],
    category: "Photography",
    link: "#",
  },
  {
    type: "project",
    title: "Room 0006",
    description: "別アングルからの室内レンダリング。",
    image: "/works/blender/0006.png",
    tags: [{ label: "Blender", color: "orange" }],
    category: "3D",
    link: "#",
  },
];

const socialLinks = [
  { name: "YouTube", handle: "@ryugen0719", url: "https://www.youtube.com/@ryugen0719", icon: "▶", cls: "yt" },
  { name: "Scratch", handle: "ryugen0719", url: "https://scratch.mit.edu/users/ryugen0719/", icon: "🐱", cls: "sc" },
  { name: "Instagram", handle: "@ryugen0719", url: "https://www.instagram.com/ryugen0719/", icon: "📷", cls: "ig" },
  { name: "itch.io", handle: "ryugen0719", url: "https://ryugen0719.itch.io/", icon: "🎮", cls: "it" },
  { name: "GitHub", handle: "ryugen0719", url: "https://github.com/ryugen0719", icon: "⚙", cls: "gh" },
];

const pcSpecs = [
  { label: "CPU", value: "i7-14700F" },
  { label: "RAM", value: "DDR4 32GB" },
  { label: "GPU", value: "RTX 4060 Ti" },
  { label: "SSD", value: "1TB" },
  { label: "OS", value: "Win 11" },
];

const skills = [
  "JavaScript", "TypeScript", "React", "Next.js",
  "Scratch", "Unity", "C#", "HTML/CSS",
  "Python", "Blender", "Git", "Node.js",
];

/* ── Grid Items: 5 columns × 5 rows = 25 cells ── */
const gridItems: GridItem[] = [
  /* row 0 */ projects[0], { type: "empty" },    { type: "about" }, projects[1],       projects[2],
  /* row 1 */ { type: "empty" }, { type: "empty" }, projects[3],    projects[4],       projects[5],
  /* row 2 */ projects[6], { type: "brand" },    { type: "empty" }, projects[7],       { type: "empty" },
  /* row 3 */ { type: "skills" }, projects[8],   projects[9],       { type: "specs" }, projects[10],
  /* row 4 */ projects[11], projects[12],        { type: "quote" }, projects[13],      projects[14],
];

const COLS = 5;
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
    return () => window.removeEventListener("resize", update);
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

  if (!mounted) return null;

  return (
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
  );
}

/* ════════════════════════════════════════════
   Cell Content Router
   ════════════════════════════════════════════ */
function CellContent({ item }: { item: GridItem }) {
  switch (item.type) {
    case "project":
      return <ProjectCell item={item} />;
    case "about":
      return <AboutCell />;
    case "links":
      return <LinksCell />;
    case "specs":
      return <SpecsCell />;
    case "skills":
      return <SkillsCell />;
    case "status":
      return <StatusCell />;
    case "quote":
      return <QuoteCell />;
    case "brand":
      return <BrandCell />;
    case "stat":
      return <StatCell number={item.number} label={item.label} />;
    default:
      return null;
  }
}

/* ════════════════════════════════════════════
   Cell Components
   ════════════════════════════════════════════ */

/* ── Project ── */
function ProjectCell({ item }: { item: ProjectItem }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="cell-project"
      onClick={(e) => {
        // Prevent navigation if it was a drag
        const wasDrag = document
          .querySelector(".infinite-canvas")
          ?.classList.contains("is-dragging");
        if (wasDrag) e.preventDefault();
      }}
    >
      <div className="cell-project__img">
        <Image
          src={item.image}
          alt={item.title}
          fill
          sizes="310px"
          style={{ objectFit: "cover" }}
          draggable={false}
        />
        <div className="cell-project__overlay">
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <div className="cell-project__tags">
            {item.tags.map((tag) => (
              <span
                key={tag.label}
                className={`cell-tag${tag.color ? ` cell-tag--${tag.color}` : ""}`}
              >
                {tag.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </a>
  );
}

/* ── About ── */
function AboutCell() {
  return (
    <div className="cell-info cell-about">
      <h2>
        <span className="cell-info__icon">👋</span>
        About Me
      </h2>
      <p>
        ゲーム開発、クリエイティブコーディング、Webアプリ制作を行っています。
        テクノロジーとアートの交差点で新しい体験を創ることが好きです。
      </p>
    </div>
  );
}

/* ── Links ── */
function LinksCell() {
  return (
    <div className="cell-info">
      <h2>
        <span className="cell-info__icon">🔗</span>
        Links
      </h2>
      <div className="cell-links__list">
        {socialLinks.map((l) => (
          <a
            key={l.name}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="cell-link-item"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`cell-link-icon cell-link-icon--${l.cls}`}>
              {l.icon}
            </div>
            <span className="cell-link-name">{l.name}</span>
            <span className="cell-link-handle">{l.handle}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── Specs ── */
function SpecsCell() {
  return (
    <div className="cell-info cell-specs">
      <h2>
        <span className="cell-info__icon">🖥</span>
        PC Specs
      </h2>
      <ul className="spec-list">
        {pcSpecs.map((s) => (
          <li key={s.label} className="spec-row">
            <span className="spec-row__label">{s.label}</span>
            <span className="spec-row__value">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Skills ── */
function SkillsCell() {
  return (
    <div className="cell-info">
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
