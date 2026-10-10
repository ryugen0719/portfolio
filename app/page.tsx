"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Script from "next/script";
import { GridItem, ProjectItem } from "./types";
import { gridLayout, itemsRegistry } from "./data";
import { resolveGridPlacements } from "./grid-layout";
import { CellContent, ProjectLightbox } from "./components/InfoBlocks";

/* ════════════════════════════════════════════
   Grid Generation Logic
   ════════════════════════════════════════════ */
type GridTile = {
  item: GridItem;
  columnSpan: number;
  rowSpan: number;
};

type GridCategory = "all" | "blender" | "photography" | "links" | "profile";
const GRID_CATEGORIES: { id: GridCategory; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "blender", label: "Blender" },
  { id: "photography", label: "写真" },
  { id: "links", label: "リンク" },
  { id: "profile", label: "プロフィール" },
];

const COLS = gridLayout.columns;
const resolvedPlacements = resolveGridPlacements(
  gridLayout.placements,
  gridLayout.autoFlow,
  COLS,
  gridLayout.minRows,
);
const ROWS = Math.max(
  gridLayout.minRows,
  ...resolvedPlacements.map((placement) => placement.row + (placement.rowSpan ?? 1)),
);

function buildGridItems(): Array<GridTile | null> {
  const grid: Array<GridTile | null> = Array(COLS * ROWS).fill(null);
  const occupied = new Set<number>();
  const placedIds = new Set<string>();

  for (const placement of resolvedPlacements) {
    const columnSpan = placement.columnSpan ?? 1;
    const rowSpan = placement.rowSpan ?? 1;
    const item = itemsRegistry[placement.id];

    if (!item) throw new Error(`Unknown grid item: ${placement.id}`);
    if (placedIds.has(placement.id)) throw new Error(`Duplicate grid placement: ${placement.id}`);
    if (
      placement.column < 0 || placement.row < 0 ||
      columnSpan < 1 || rowSpan < 1 || placement.column + columnSpan > COLS
    ) {
      throw new Error(`Invalid grid placement: ${placement.id}`);
    }

    for (let row = placement.row; row < placement.row + rowSpan; row++) {
      for (let column = placement.column; column < placement.column + columnSpan; column++) {
        const index = row * COLS + column;
        if (occupied.has(index)) throw new Error(`Grid placement overlaps at ${placement.id}`);
        occupied.add(index);
      }
    }

    grid[placement.row * COLS + placement.column] = { item, columnSpan, rowSpan };
    placedIds.add(placement.id);
  }

  return grid;
}

const gridItems = buildGridItems();

function buildFilteredGrid(category: GridCategory) {
  if (category === "all") return { items: gridItems, rows: ROWS, contentRows: ROWS };

  const candidates = gridItems.filter((tile): tile is GridTile => {
    if (!tile) return false;
    const { item } = tile;
    if (category === "blender") return item.type === "project" && item.tags.some((tag) => tag.label === "Blender");
    if (category === "photography") return item.type === "project" && item.category === "Photography";
    if (category === "links") return item.type === "socialLink";
    return item.type !== "project" && item.type !== "socialLink";
  });

  const occupied = new Set<number>();
  const placements: { tile: GridTile; column: number; row: number }[] = [];
  let contentRows = 1;

  for (const tile of candidates) {
    let placed = false;
    for (let row = 0; row <= contentRows + candidates.length && !placed; row++) {
      for (let column = 0; column <= COLS - tile.columnSpan && !placed; column++) {
        let fits = true;
        for (let y = row; y < row + tile.rowSpan && fits; y++) {
          for (let x = column; x < column + tile.columnSpan; x++) {
            if (occupied.has(y * COLS + x)) {
              fits = false;
              break;
            }
          }
        }
        if (!fits) continue;
        placements.push({ tile, column, row });
        for (let y = row; y < row + tile.rowSpan; y++) {
          for (let x = column; x < column + tile.columnSpan; x++) occupied.add(y * COLS + x);
        }
        contentRows = Math.max(contentRows, row + tile.rowSpan);
        placed = true;
      }
    }
  }

  const rows = Math.max(gridLayout.minRows, contentRows);
  const items: Array<GridTile | null> = Array(COLS * rows).fill(null);
  for (const placement of placements) items[placement.row * COLS + placement.column] = placement.tile;
  return { items, rows, contentRows };
}

const GRID_CATEGORY_COUNTS = Object.fromEntries(
  GRID_CATEGORIES.map(({ id }) => [id, buildFilteredGrid(id).items.filter(Boolean).length]),
) as Record<GridCategory, number>;

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

function MazeAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{ move: (dx: number, dy: number) => void } | null>(null);
  const [ready, setReady] = useState(false);
  const [solved, setSolved] = useState(false);
  const [moves, setMoves] = useState(0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    const context = canvas?.getContext("2d");
    if (!canvas || !container || !context) return;

    setReady(false);
    setSolved(false);
    setMoves(0);
    const columns = 28;
    const rows = 16;
    const cells = Array.from({ length: rows }, () =>
      Array.from({ length: columns }, () => ({ walls: [true, true, true, true], visited: false })),
    );
    const stack: { x: number; y: number }[] = [{ x: 0, y: 0 }];
    cells[0][0].visited = true;
    let current = stack[0];
    let frame = 0;
    let complete = false;
    let hasSolved = false;
    let player = { x: 0, y: 0 };
    let trail = [{ x: 0, y: 0 }];
    let width = 0;
    let height = 0;
    let pixelRatio = 1;

    const resize = () => {
      const bounds = container.getBoundingClientRect();
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      draw();
    };

    const draw = () => {
      const cellSize = Math.min((width - 24) / columns, (height - 24) / rows);
      const mazeWidth = cellSize * columns;
      const mazeHeight = cellSize * rows;
      const offsetX = (width - mazeWidth) / 2;
      const offsetY = (height - mazeHeight) / 2;
      context.clearRect(0, 0, width, height);
      context.lineWidth = 1;
      context.lineCap = "square";
      context.strokeStyle = "rgba(243, 238, 229, 0.3)";
      context.beginPath();

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
          const cell = cells[y][x];
          const left = offsetX + x * cellSize;
          const top = offsetY + y * cellSize;
          if (cell.walls[0]) { context.moveTo(left, top); context.lineTo(left + cellSize, top); }
          if (cell.walls[1]) { context.moveTo(left + cellSize, top); context.lineTo(left + cellSize, top + cellSize); }
          if (cell.walls[2]) { context.moveTo(left + cellSize, top + cellSize); context.lineTo(left, top + cellSize); }
          if (cell.walls[3]) { context.moveTo(left, top + cellSize); context.lineTo(left, top); }
        }
      }
      context.stroke();

      context.fillStyle = "rgba(198, 166, 107, 0.38)";
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
          if (!cells[y][x].visited) continue;
          context.beginPath();
          context.arc(offsetX + (x + 0.5) * cellSize, offsetY + (y + 0.5) * cellSize, 1, 0, Math.PI * 2);
          context.fill();
        }
      }

      if (trail.length > 1) {
        context.strokeStyle = "rgba(245, 89, 81, 0.52)";
        context.lineWidth = Math.max(1, cellSize * 0.12);
        context.beginPath();
        trail.forEach((point, index) => {
          const px = offsetX + (point.x + 0.5) * cellSize;
          const py = offsetY + (point.y + 0.5) * cellSize;
          if (index === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        });
        context.stroke();
        context.lineWidth = 1;
      }

      const marker = (point: { x: number; y: number }, color: string, radius: number) => {
        context.fillStyle = color;
        context.beginPath();
        context.arc(offsetX + (point.x + 0.5) * cellSize, offsetY + (point.y + 0.5) * cellSize, radius, 0, Math.PI * 2);
        context.fill();
      };
      marker({ x: 0, y: 0 }, "#edd2a0", Math.max(2.5, cellSize * 0.22));
      marker({ x: columns - 1, y: rows - 1 }, "#f55951", Math.max(2.5, cellSize * 0.22));
      if (complete) marker(player, "#f1e8e6", Math.max(2.5, cellSize * 0.27));
      if (!complete) {
        const pulse = 2.4 + Math.sin(performance.now() / 180) * 0.7;
        context.fillStyle = "#f1e8e6";
        context.shadowColor = "rgba(198, 166, 107, 0.9)";
        context.shadowBlur = 14;
        context.beginPath();
        context.arc(offsetX + (current.x + 0.5) * cellSize, offsetY + (current.y + 0.5) * cellSize, pulse, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
      }
    };

    const directions = [
      { dx: 0, dy: -1, wall: 0, opposite: 2 },
      { dx: 1, dy: 0, wall: 1, opposite: 3 },
      { dx: 0, dy: 1, wall: 2, opposite: 0 },
      { dx: -1, dy: 0, wall: 3, opposite: 1 },
    ];

    const tick = () => {
      for (let step = 0; step < 10 && stack.length; step++) {
        current = stack[stack.length - 1];
        const options = directions
          .map((direction) => ({ ...direction, x: current.x + direction.dx, y: current.y + direction.dy }))
          .filter(({ x, y }) => x >= 0 && x < columns && y >= 0 && y < rows && !cells[y][x].visited);

        if (!options.length) {
          stack.pop();
          continue;
        }

        const direction = options[Math.floor(Math.random() * options.length)];
        cells[current.y][current.x].walls[direction.wall] = false;
        cells[direction.y][direction.x].walls[direction.opposite] = false;
        cells[direction.y][direction.x].visited = true;
        current = { x: direction.x, y: direction.y };
        stack.push(current);
      }

      complete = stack.length === 0;
      draw();
      if (!complete) {
        frame = requestAnimationFrame(tick);
      } else {
        setReady(true);
      }
    };

    const move = (dx: number, dy: number) => {
      if (!complete || hasSolved) return;
      const wall = dy < 0 ? 0 : dx > 0 ? 1 : dy > 0 ? 2 : 3;
      if (cells[player.y][player.x].walls[wall]) return;
      player = { x: player.x + dx, y: player.y + dy };
      trail = [...trail, player];
      setMoves((count) => count + 1);
      if (player.x === columns - 1 && player.y === rows - 1) {
        hasSolved = true;
        setSolved(true);
      }
      draw();
    };
    gameRef.current = { move };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const directions: Record<string, [number, number]> = {
        arrowup: [0, -1], w: [0, -1],
        arrowright: [1, 0], d: [1, 0],
        arrowdown: [0, 1], s: [0, 1],
        arrowleft: [-1, 0], a: [-1, 0],
      };
      const direction = directions[key];
      if (!direction) return;
      event.preventDefault();
      event.stopPropagation();
      move(direction[0], direction[1]);
    };
    window.addEventListener("keydown", onKeyDown);

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      while (stack.length) {
        current = stack[stack.length - 1];
        const options = directions
          .map((direction) => ({ ...direction, x: current.x + direction.dx, y: current.y + direction.dy }))
          .filter(({ x, y }) => x >= 0 && x < columns && y >= 0 && y < rows && !cells[y][x].visited);
        if (!options.length) { stack.pop(); continue; }
        const direction = options[Math.floor(Math.random() * options.length)];
        cells[current.y][current.x].walls[direction.wall] = false;
        cells[direction.y][direction.x].walls[direction.opposite] = false;
        cells[direction.y][direction.x].visited = true;
        current = { x: direction.x, y: direction.y };
        stack.push(current);
      }
      complete = true;
      draw();
      setReady(true);
    } else {
      frame = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      gameRef.current = null;
    };
  }, [run]);

  const move = (dx: number, dy: number) => gameRef.current?.move(dx, dy);

  return (
    <div className="easter-egg__game">
      <div className="easter-egg__maze-frame">
        <canvas ref={canvasRef} className="easter-egg__maze" role="img" aria-label="入口から出口まで進む迷路" />
      </div>
      <div className="easter-egg__gamebar">
        <div className="easter-egg__game-status" aria-live="polite">
          <span className={`easter-egg__status-light ${ready ? "is-ready" : ""}`} />
          <span>{solved ? "出口に到達しました" : ready ? "出口を目指してください" : "迷路を生成しています"}</span>
          <span className="easter-egg__move-count">{moves.toString().padStart(2, "0")} MOVES</span>
          <span className="easter-egg__legend"><i className="is-start" /> START <i className="is-exit" /> EXIT</span>
        </div>
        <div className="easter-egg__game-actions">
          <div className="easter-egg__dpad" aria-label="移動操作">
            <button type="button" aria-label="上へ移動" disabled={!ready || solved} onClick={() => move(0, -1)}>↑</button>
            <button type="button" aria-label="左へ移動" disabled={!ready || solved} onClick={() => move(-1, 0)}>←</button>
            <button type="button" aria-label="下へ移動" disabled={!ready || solved} onClick={() => move(0, 1)}>↓</button>
            <button type="button" aria-label="右へ移動" disabled={!ready || solved} onClick={() => move(1, 0)}>→</button>
          </div>
          <span className="easter-egg__instructions">矢印キー / WASD またはボタンで移動</span>
          <button type="button" className="easter-egg__restart" onClick={() => setRun((value) => value + 1)}>再挑戦</button>
        </div>
      </div>
    </div>
  );
}

function GalleryCursor() {
  const pointerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pointer = pointerRef.current;
    const spotlight = spotlightRef.current;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!pointer || !spotlight || !finePointer.matches) return;

    document.body.classList.add("gallery-cursor-enabled");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let lightX = 0;
    let lightY = 0;
    let lastEventX = 0;
    let lastEventY = 0;
    let hasPosition = false;
    let animationFrame: number | null = null;

    const followPointer = () => {
      const pointerEasing = reducedMotion ? 1 : 0.14;
      const lightEasing = reducedMotion ? 1 : 0.055;
      currentX += (targetX - currentX) * pointerEasing;
      currentY += (targetY - currentY) * pointerEasing;
      lightX += (targetX - lightX) * lightEasing;
      lightY += (targetY - lightY) * lightEasing;
      pointer.style.setProperty("--cursor-x", `${currentX}px`);
      pointer.style.setProperty("--cursor-y", `${currentY}px`);
      spotlight.style.setProperty("--light-x", `${lightX}px`);
      spotlight.style.setProperty("--light-y", `${lightY}px`);

      if (
        Math.abs(targetX - currentX) > 0.15 || Math.abs(targetY - currentY) > 0.15 ||
        Math.abs(targetX - lightX) > 0.15 || Math.abs(targetY - lightY) > 0.15
      ) {
        animationFrame = requestAnimationFrame(followPointer);
      } else {
        currentX = targetX;
        currentY = targetY;
        lightX = targetX;
        lightY = targetY;
        pointer.style.setProperty("--cursor-x", `${currentX}px`);
        pointer.style.setProperty("--cursor-y", `${currentY}px`);
        spotlight.style.setProperty("--light-x", `${lightX}px`);
        spotlight.style.setProperty("--light-y", `${lightY}px`);
        animationFrame = null;
      }
    };

    const updatePointer = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      const deltaX = hasPosition ? targetX - lastEventX : 0;
      const deltaY = hasPosition ? targetY - lastEventY : 0;
      lastEventX = targetX;
      lastEventY = targetY;
      if (!hasPosition) {
        currentX = targetX;
        currentY = targetY;
        lightX = targetX;
        lightY = targetY;
        hasPosition = true;
        pointer.style.setProperty("--cursor-x", `${currentX}px`);
        pointer.style.setProperty("--cursor-y", `${currentY}px`);
        spotlight.style.setProperty("--light-x", `${lightX}px`);
        spotlight.style.setProperty("--light-y", `${lightY}px`);
      } else if (reducedMotion) {
        currentX = targetX;
        currentY = targetY;
        lightX = targetX;
        lightY = targetY;
        pointer.style.setProperty("--cursor-x", `${currentX}px`);
        pointer.style.setProperty("--cursor-y", `${currentY}px`);
        spotlight.style.setProperty("--light-x", `${lightX}px`);
        spotlight.style.setProperty("--light-y", `${lightY}px`);
      } else if (animationFrame === null) {
        animationFrame = requestAnimationFrame(followPointer);
      }
      if (!reducedMotion && Math.hypot(deltaX, deltaY) > 0.8) {
        pointer.style.setProperty("--cursor-angle", `${Math.atan2(deltaY, deltaX) * (180 / Math.PI)}deg`);
      }
      pointer.classList.add("is-visible");
      spotlight.classList.add("is-visible");

      const target = event.target instanceof Element ? event.target : null;
      const interactive = target?.closest("a, button, [role='button'], .cell-project, input, select, textarea, [contenteditable='true']");
      const dragging = Boolean(target?.closest(".infinite-canvas") && event.buttons === 1);
      pointer.classList.toggle("is-interactive", Boolean(interactive));
      pointer.classList.toggle("is-dragging", dragging);
      pointer.classList.toggle("is-text", Boolean(target?.closest("input, textarea, [contenteditable='true']")));
      spotlight.classList.toggle("is-interactive", Boolean(interactive));
      spotlight.classList.toggle("is-dragging", dragging);
      spotlight.classList.toggle("is-text", Boolean(target?.closest("input, textarea, [contenteditable='true']")));
    };
    const hidePointer = () => {
      pointer.classList.remove("is-visible");
      spotlight.classList.remove("is-visible");
    };
    const showPointer = (event: PointerEvent) => updatePointer(event);

    window.addEventListener("pointermove", updatePointer, { passive: true });
    window.addEventListener("pointerdown", updatePointer, { passive: true });
    window.addEventListener("pointerup", updatePointer, { passive: true });
    window.addEventListener("pointerleave", hidePointer);
    window.addEventListener("pointerenter", showPointer);

    return () => {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      document.body.classList.remove("gallery-cursor-enabled");
      window.removeEventListener("pointermove", updatePointer);
      window.removeEventListener("pointerdown", updatePointer);
      window.removeEventListener("pointerup", updatePointer);
      window.removeEventListener("pointerleave", hidePointer);
      window.removeEventListener("pointerenter", showPointer);
    };
  }, []);

  return (
    <>
      <div ref={spotlightRef} className="gallery-spotlight" aria-hidden="true">
        <span className="gallery-spotlight__aura" />
      </div>
      <div ref={pointerRef} className="gallery-cursor" aria-hidden="true">
        <span className="gallery-cursor__layer gallery-cursor__layer--outer" />
        <span className="gallery-cursor__layer gallery-cursor__layer--middle" />
        <span className="gallery-cursor__layer gallery-cursor__layer--inner" />
        <span className="gallery-cursor__point" />
      </div>
    </>
  );
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
  const [activeCategory, setActiveCategory] = useState<GridCategory>("all");
  const [categoryTransitioning, setCategoryTransitioning] = useState(false);
  const [vpSize, setVpSize] = useState({ w: 1920, h: 1080 });
  const [activeProject, setActiveProject] = useState<ProjectItem | null>(null);
  const [easterEggOpen, setEasterEggOpen] = useState(false);
  const filteredGrid = useMemo(() => buildFilteredGrid(activeCategory), [activeCategory]);

  useEffect(() => {
    const categoryChanged = previousCategoryRef.current !== activeCategory;
    previousCategoryRef.current = activeCategory;
    const focusRows = activeCategory === "all" ? ROWS : filteredGrid.contentRows;
    const target = {
      x: (CONTENT_W - vpSize.w) / 2,
      y: (focusRows * STEP_Y - vpSize.h) / 2,
    };
    const start = { ...cameraRef.current };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!categoryChanged || reduceMotion) {
      cameraRef.current = target;
      setTick((tick) => tick + 1);
      return;
    }

    let startTime = 0;
    const animateCamera = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min(1, (time - startTime) / 980);
      const eased = progress * progress * (3 - 2 * progress);
      cameraRef.current = {
        x: start.x + (target.x - start.x) * eased,
        y: start.y + (target.y - start.y) * eased,
      };
      setTick((tick) => tick + 1);
      if (progress < 1) {
        categoryCameraFrameRef.current = requestAnimationFrame(animateCamera);
      } else {
        categoryCameraFrameRef.current = null;
      }
    };

    categoryCameraFrameRef.current = requestAnimationFrame(animateCamera);
    return () => {
      if (categoryCameraFrameRef.current !== null) {
        cancelAnimationFrame(categoryCameraFrameRef.current);
        categoryCameraFrameRef.current = null;
      }
    };
  }, [activeCategory, filteredGrid.contentRows, vpSize.w, vpSize.h]);

  /* ── Refs ── */
  const canvasRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef({ x: 0, y: 0 });
  const previousCategoryRef = useRef<GridCategory>("all");
  const categoryCameraFrameRef = useRef<number | null>(null);
  const categoryTransitionTimerRef = useRef<number | null>(null);
  const velRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const camStartRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef<number | null>(null);
  const focusReturnRef = useRef<HTMLButtonElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastMouseRef = useRef({ x: 0, y: 0, t: 0 });
  const hasScrolledRef = useRef(false);
  const brandTapRef = useRef({ count: 0, lastAt: 0 });

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
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (categoryCameraFrameRef.current !== null) cancelAnimationFrame(categoryCameraFrameRef.current);
      if (categoryTransitionTimerRef.current !== null) window.clearTimeout(categoryTransitionTimerRef.current);
      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeProject) {
      if (focusReturnRef.current?.isConnected) focusReturnRef.current.focus();
      focusReturnRef.current = null;
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveProject(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activeProject]);

  useEffect(() => {
    let typedKeys = "";
    const reveal = () => {
      setActiveProject(null);
      setEasterEggOpen(true);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEasterEggOpen(false);
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
      typedKeys = `${typedKeys}${event.key.toLowerCase()}`.slice(-6);
      if (typedKeys === "ryugen") {
        typedKeys = "";
        reveal();
      }
    };
    const onBrandClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".brand-cell__copy h1")) return;
      const now = Date.now();
      const tap = brandTapRef.current;
      tap.count = now - tap.lastAt < 650 ? tap.count + 1 : 1;
      tap.lastAt = now;
      if (tap.count >= 5) {
        tap.count = 0;
        reveal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("click", onBrandClick);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("click", onBrandClick);
    };
  }, []);

  const selectProject = useCallback((project: ProjectItem, trigger: HTMLButtonElement) => {
    focusReturnRef.current = trigger;
    setActiveProject(project);
  }, []);

  const selectCategory = useCallback((category: GridCategory) => {
    if (category === activeCategory) return;
    setCategoryTransitioning(true);
    setActiveCategory(category);
    if (categoryTransitionTimerRef.current !== null) window.clearTimeout(categoryTransitionTimerRef.current);
    categoryTransitionTimerRef.current = window.setTimeout(() => {
      setCategoryTransitioning(false);
      categoryTransitionTimerRef.current = null;
    }, 1300);
  }, [activeCategory]);

  /* ── Wheel ── */
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (categoryCameraFrameRef.current !== null) {
        cancelAnimationFrame(categoryCameraFrameRef.current);
        categoryCameraFrameRef.current = null;
      }
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
      if (categoryCameraFrameRef.current !== null) {
        cancelAnimationFrame(categoryCameraFrameRef.current);
        categoryCameraFrameRef.current = null;
      }
      dragMovedRef.current = false;
      suppressClickRef.current = false;
      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current);
        suppressClickTimerRef.current = null;
      }
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
    if (Math.hypot(dx, dy) > 6) dragMovedRef.current = true;
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
    const didDrag = dragMovedRef.current;
    isDraggingRef.current = false;
    setIsDragging(false);
    if (didDrag) {
      suppressClickRef.current = true;
      suppressClickTimerRef.current = window.setTimeout(() => {
        suppressClickRef.current = false;
        suppressClickTimerRef.current = null;
      }, 250);
      startMomentum();
    }
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
    blur: number;
    brightness: number;
    opacity: number;
  }[] = [];

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const wCol = mod(col, COLS);
      const wRow = mod(row, filteredGrid.rows);
      const idx = wRow * COLS + wCol;
      if (idx >= filteredGrid.items.length) continue;
      
      const tile = filteredGrid.items[idx];
      if (!tile) continue;

      const { item, columnSpan, rowSpan } = tile;
      const w = CELL_W * columnSpan + GAP * (columnSpan - 1);
      const h = CELL_H * rowSpan + GAP * (rowSpan - 1);

      const sx = col * STEP_X - cam.x;
      const sy = row * STEP_Y - cam.y;

      // Soften and darken cells only within the last 105px before a viewport edge.
      const cx = sx + w / 2;
      const cy = sy + h / 2;
      const edgeDistance = Math.min(cx, cy, vpSize.w - cx, vpSize.h - cy);
      const edgeT = Math.max(0, Math.min(1, (105 - edgeDistance) / 105));
      const edgeStrength = edgeT * edgeT;
      const blur = 4 * edgeStrength;
      const brightness = 1 - 0.24 * edgeStrength;
      const opacity = 1 - 0.06 * edgeStrength;

      visibleCells.push({
        key: `${activeCategory}_${col}_${row}`,
        item,
        x: sx,
        y: sy,
        w,
        h,
        blur,
        brightness,
        opacity,
      });
    }
  }

  return (
    <>
      <GalleryCursor />
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
          <div id="particles-js" className="particles-layer" aria-hidden="true" />
          <Script
            src="/vendor/particles.js"
            strategy="afterInteractive"
            onReady={() => {
              const particleWindow = window as typeof window & {
                particlesJS?: (id: string, config: object) => void;
              };
              if (!particleWindow.particlesJS) return;
              const host = document.getElementById("particles-js");
              if (!host || host.querySelector("canvas")) return;

              particleWindow.particlesJS("particles-js", {
                particles: {
                  number: { value: 72, density: { enable: true, value_area: 1000 } },
                  color: { value: ["#d8cdbb", "#c6a66b", "#f3eee5"] },
                  shape: { type: "circle" },
                  opacity: { value: 0.42, random: true, anim: { enable: true, speed: 0.45, opacity_min: 0.12, sync: false } },
                  size: { value: 2.4, random: true, anim: { enable: false } },
                  line_linked: { enable: false },
                  move: {
                    enable: true,
                    speed: 0.42,
                    direction: "none",
                    random: true,
                    straight: false,
                    out_mode: "out",
                    bounce: false,
                    attract: { enable: false },
                  },
                },
                interactivity: {
                  detect_on: "canvas",
                  events: { onhover: { enable: false }, onclick: { enable: false }, resize: true },
                },
                retina_detect: true,
              });
            }}
          />

          {/* Vignette overlay for edge darkening */}
          <div className="vignette" />

          <div className="canvas-label canvas-label--left">
            <span className="canvas-label__rule" />
            <span>RYUGEN</span>
            <span className="canvas-label__divider">/</span>
            <span className="canvas-label__muted">CREATIVE PORTFOLIO</span>
          </div>
          <div className="canvas-label canvas-label--right">
            <span className="canvas-label__muted">INDEPENDENT CREATIVE DEVELOPER</span>
            <span className="canvas-label__rule" />
          </div>

          <nav className="canvas-filter" aria-label="作品カテゴリー">
            <span className="canvas-filter__label">VIEW</span>
            {GRID_CATEGORIES.map(({ id, label }) => (
              <button
                type="button"
                key={id}
                className={`canvas-filter__button${activeCategory === id ? " is-active" : ""}`}
                aria-pressed={activeCategory === id}
                onClick={() => selectCategory(id)}
              >
                <span>{label}</span>
                <span className="canvas-filter__count">{GRID_CATEGORY_COUNTS[id].toString().padStart(2, "0")}</span>
              </button>
            ))}
          </nav>

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
            onClickCapture={(event) => {
              if (!suppressClickRef.current) return;
              event.preventDefault();
              event.stopPropagation();
              suppressClickRef.current = false;
              if (suppressClickTimerRef.current !== null) {
                window.clearTimeout(suppressClickTimerRef.current);
                suppressClickTimerRef.current = null;
              }
            }}
            id="infinite-canvas"
          >
            <div className={`cell-layer${categoryTransitioning ? " is-transitioning" : ""}`}>
              {visibleCells.map(({ key, item, x, y, w, h, blur, brightness, opacity }, cellIndex) => (
                <div
                  key={key}
                  className={`canvas-cell${item.type === "project" ? " canvas-cell--project" : item.type === "socialLink" ? " canvas-cell--social" : item.type === "brand" ? " canvas-cell--brand" : ["about", "specs", "skills", "status", "quote", "stat"].includes(item.type) ? " canvas-cell--text" : ""}`}
                  style={{
                    width: w,
                    height: h,
                    transform: `translate(${x}px, ${y}px)`,
                    filter: `blur(${blur}px) brightness(${brightness})`,
                    opacity,
                  }}
                >
                  <div
                    className="canvas-cell__reveal"
                    style={{ animationDelay: categoryTransitioning ? `${Math.min(cellIndex * 12, 220)}ms` : undefined }}
                  >
                    <CellContent
                      item={item}
                      imageSizes={`${Math.ceil(w)}px`}
                      onProjectSelect={selectProject}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      {activeProject && (
        <ProjectLightbox item={activeProject} onClose={() => setActiveProject(null)} />
      )}
      {easterEggOpen && (
        <div className="easter-egg" role="presentation" onClick={() => setEasterEggOpen(false)}>
          <section
            className="easter-egg__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="easter-egg-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="easter-egg__close" aria-label="閉じる" onClick={() => setEasterEggOpen(false)}>×</button>
            <div className="easter-egg__heading">
              <span className="easter-egg__eyebrow">AFTER HOURS / 01</span>
              <h2 id="easter-egg-title">迷路</h2>
              <p>入口から出口まで、通路を見つけてください。</p>
            </div>
            <MazeAnimation />
            <span className="easter-egg__signature">RYUGEN / GENERATIVE STUDY</span>
          </section>
        </div>
      )}
    </>
  );
}
