"use client";

import { useState, useEffect, useRef, useCallback, useMemo, type CSSProperties } from "react";
import Script from "next/script";
import { GridItem, ProjectItem } from "./types";
import { gridLayout, itemsRegistry, projects, socialLinks } from "./data";
import { resolveGridPlacements } from "./grid-layout";
import { CellContent, ProjectLightbox } from "./components/InfoBlocks";
import {
  beginCanvasPointer,
  endCanvasPointer,
  getAnchoredZoomTransform,
  getPinchZoom,
  moveCanvasPointer,
} from "./canvas-gesture.mjs";

/* ════════════════════════════════════════════
   Grid Generation Logic
   ════════════════════════════════════════════ */
type GridTile = {
  item: GridItem;
  columnSpan: number;
  rowSpan: number;
};
type VisibleCell = {
  key: string;
  item: GridItem;
  x: number;
  y: number;
  w: number;
  h: number;
  blur: number;
  brightness: number;
  opacity: number;
};

type GridCategory = "all" | "blender" | "photography" | "scratch" | "links" | "profile";
type CategoryTransitionPhase = "idle" | "exit" | "blank" | "enter";
const GRID_CATEGORIES: { id: GridCategory; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "blender", label: "Blender" },
  { id: "photography", label: "写真" },
  { id: "scratch", label: "Scratch" },
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
    const item = itemsRegistry[placement.itemId ?? placement.id];

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

function buildMobileItems(category: GridCategory): GridItem[] {
  const brand = itemsRegistry.brand;
  const profileItems = ["about", "skills", "specs", "apps", "visualizer"]
    .map((id) => itemsRegistry[id])
    .filter((item): item is GridItem => Boolean(item));
  const closingItems = ["iss", "countdown", "status", "quote", "stat"]
    .map((id) => itemsRegistry[id])
    .filter((item): item is GridItem => Boolean(item));

  if (category === "blender") {
    return [brand, ...projects.filter((item) => item.tags.some((tag) => tag.label === "Blender"))];
  }
  if (category === "photography") return [brand, ...projects.filter((item) => item.category === "Photography")];
  if (category === "scratch") return [brand, ...projects.filter((item) => item.category === "Scratch")];
  if (category === "links") return [brand, ...socialLinks];
  if (category === "profile") return [brand, ...profileItems, ...closingItems];

  return [brand, ...profileItems, ...projects, ...socialLinks, ...closingItems];
}

function buildFilteredGrid(category: GridCategory) {
  if (category === "all") return { items: gridItems, rows: ROWS, contentRows: ROWS };

  const candidates = gridItems.filter((tile): tile is GridTile => {
    if (!tile) return false;
    const { item } = tile;
    if (item.type === "brand") return true;
    if (item.type === "spacer") return false;
    if (category === "blender") return item.type === "project" && item.tags.some((tag) => tag.label === "Blender");
    if (category === "photography") return item.type === "project" && item.category === "Photography";
    if (category === "scratch") return item.type === "project" && item.category === "Scratch";
    if (category === "links") return item.type === "socialLink";
    return item.type !== "project" && item.type !== "socialLink";
  });

  const occupied = new Set<number>();
  const placements: { tile: GridTile; column: number; row: number }[] = [];
  const brandPlacement = resolvedPlacements.find(({ id }) => id === "brand");
  const brandTile = candidates.find(({ item }) => item.type === "brand");
  let contentRows = 1;

  if (brandPlacement && brandTile) {
    const columnSpan = brandTile.columnSpan;
    const rowSpan = brandTile.rowSpan;
    placements.push({ tile: brandTile, column: brandPlacement.column, row: brandPlacement.row });
    for (let row = brandPlacement.row; row < brandPlacement.row + rowSpan; row++) {
      for (let column = brandPlacement.column; column < brandPlacement.column + columnSpan; column++) {
        occupied.add(row * COLS + column);
      }
    }
    contentRows = brandPlacement.row + rowSpan;
  }

  for (const tile of candidates) {
    if (tile.item.type === "brand") continue;
    let bestPosition: { column: number; row: number; score: number } | null = null;
    const brandColumn = brandPlacement?.column ?? Math.floor(COLS / 2);
    const brandRow = brandPlacement?.row ?? 0;
    const brandColumnSpan = brandTile?.columnSpan ?? 1;
    const brandRowSpan = brandTile?.rowSpan ?? 1;
    const brandCenterColumn = brandColumn + brandColumnSpan / 2;
    const brandCenterRow = brandRow + brandRowSpan / 2;
    const searchRows = Math.max(gridLayout.minRows, brandRow + candidates.length * 2 + 1);

    for (let row = 0; row < searchRows; row++) {
      for (let column = 0; column <= COLS - tile.columnSpan; column++) {
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

        const gapColumn = Math.max(0, brandColumn - (column + tile.columnSpan), column - (brandColumn + brandColumnSpan));
        const gapRow = Math.max(0, brandRow - (row + tile.rowSpan), row - (brandRow + brandRowSpan));
        const centerColumn = column + tile.columnSpan / 2;
        const centerRow = row + tile.rowSpan / 2;
        const centerDistance = Math.hypot(centerColumn - brandCenterColumn, centerRow - brandCenterRow);
        const score = (gapColumn + gapRow) * 100 + centerDistance;
        if (!bestPosition || score < bestPosition.score) bestPosition = { column, row, score };
      }
    }

    if (!bestPosition) continue;
    placements.push({ tile, column: bestPosition.column, row: bestPosition.row });
    for (let y = bestPosition.row; y < bestPosition.row + tile.rowSpan; y++) {
      for (let x = bestPosition.column; x < bestPosition.column + tile.columnSpan; x++) occupied.add(y * COLS + x);
    }
    contentRows = Math.max(contentRows, bestPosition.row + tile.rowSpan);
  }

  const rows = Math.max(gridLayout.minRows, contentRows);
  const items: Array<GridTile | null> = Array(COLS * rows).fill(null);
  for (const placement of placements) items[placement.row * COLS + placement.column] = placement.tile;
  return { items, rows, contentRows };
}

const GRID_CATEGORY_COUNTS = Object.fromEntries(
  GRID_CATEGORIES.map(({ id }) => [id, buildFilteredGrid(id).items.filter(Boolean).length]),
) as Record<GridCategory, number>;
const MOBILE_CATEGORY_COUNTS = Object.fromEntries(
  GRID_CATEGORIES.map(({ id }) => [id, buildMobileItems(id).length]),
) as Record<GridCategory, number>;

const CELL_W = 310;
const CELL_H = 250;
const GAP = 14;
const STEP_X = CELL_W + GAP;
const STEP_Y = CELL_H + GAP;
const CONTENT_W = COLS * STEP_X;
const CONTENT_H = ROWS * STEP_Y;
const FRICTION = 0.94;
const DRAG_FRICTION = 0.975;
const MOBILE_DRAG_FRICTION = 0.975;
const WHEEL_FRICTION = 0.965;
const WHEEL_SPEED = 1.2;
const MIN_CANVAS_ZOOM = 0.55;
const MAX_CANVAS_ZOOM = 1.75;
const WHEEL_ZOOM_SPEED = 0.002;
const CATEGORY_EXIT_MS = 420;
const CATEGORY_BLANK_MS = 60;
const CATEGORY_ENTER_MS = 520;

function getBrandCameraTarget(viewportWidth: number, viewportHeight: number) {
  const placement = gridLayout.placements.find(({ id }) => id === "brand");
  if (!placement) {
    return {
      x: (CONTENT_W - viewportWidth) / 2,
      y: (CONTENT_H - viewportHeight) / 2,
    };
  }

  const columnSpan = placement.columnSpan ?? 1;
  const rowSpan = placement.rowSpan ?? 1;
  const brandWidth = CELL_W * columnSpan + GAP * (columnSpan - 1);
  const brandHeight = CELL_H * rowSpan + GAP * (rowSpan - 1);

  return {
    x: placement.column * STEP_X + brandWidth / 2 - viewportWidth / 2,
    y: placement.row * STEP_Y + brandHeight / 2 - viewportHeight / 2,
  };
}

/* ════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════ */
function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
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
      document.documentElement.style.setProperty("--darkroom-x", `${targetX}px`);
      document.documentElement.style.setProperty("--darkroom-y", `${targetY}px`);
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
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [audioAnalyser, setAudioAnalyser] = useState<AnalyserNode | null>(null);
  const [activeCategory, setActiveCategory] = useState<GridCategory>("all");
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [showMobileList, setShowMobileList] = useState(false);
  const [displayCategory, setDisplayCategory] = useState<GridCategory>("all");
  const [outgoingCells, setOutgoingCells] = useState<VisibleCell[] | null>(null);
  const [categoryTransitionPhase, setCategoryTransitionPhase] = useState<CategoryTransitionPhase>("idle");
  const [categoryTransitionRun, setCategoryTransitionRun] = useState(0);
  const [vpSize, setVpSize] = useState({ w: 1920, h: 1080 });
  const [activeProject, setActiveProject] = useState<ProjectItem | null>(null);
  const [spotlightModeOn, setSpotlightModeOn] = useState(false);
  const switchSoundRef = useRef<HTMLAudioElement>(null);
  const [starfallActive, setStarfallActive] = useState(false);
  const [starfallRun, setStarfallRun] = useState(0);
  const starfallTimerRef = useRef<number | null>(null);
  const visibleCellsRef = useRef<VisibleCell[]>([]);
  const pendingCategoryRef = useRef<GridCategory>("all");
  const filteredGrid = useMemo(() => buildFilteredGrid(displayCategory), [displayCategory]);
  const mobileItems = useMemo(() => buildMobileItems(displayCategory), [displayCategory]);
  const isMobile = isMobileViewport && showMobileList;

  const toggleSpotlightMode = useCallback(() => {
    const sound = switchSoundRef.current;
    if (sound) {
      if (sound.readyState > 0) sound.currentTime = 0;
      sound.volume = 0.34;
      void sound.play().catch(() => undefined);
    }
    setSpotlightModeOn((isOn) => !isOn);
  }, []);

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!spotlightModeOn || !finePointer.matches || isMobileViewport || showMobileList) {
      document.body.classList.remove("darkroom-active");
      return;
    }

    document.body.classList.add("darkroom-active");
    const turnOffWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSpotlightModeOn(false);
    };
    window.addEventListener("keydown", turnOffWithEscape);

    return () => {
      document.body.classList.remove("darkroom-active");
      window.removeEventListener("keydown", turnOffWithEscape);
    };
  }, [spotlightModeOn, isMobileViewport, showMobileList]);

  useEffect(() => {
    const canvasMode = isMobileViewport && !showMobileList;
    document.body.classList.toggle("canvas-mode", canvasMode);
    document.documentElement.classList.toggle("canvas-mode", canvasMode);
    return () => {
      document.body.classList.remove("canvas-mode");
      document.documentElement.classList.remove("canvas-mode");
    };
  }, [isMobileViewport, showMobileList]);

  useEffect(() => {
    const currentMode = showMobileList ? "list" : "canvas";
    if (previousDisplayModeRef.current === currentMode) return;
    previousDisplayModeRef.current = currentMode;
    window.requestAnimationFrame(() => {
      if (showMobileList) mobileCanvasModeButtonRef.current?.focus();
      else mobileListModeButtonRef.current?.focus();
    });
  }, [showMobileList]);

  useEffect(() => {
    cameraRef.current = getBrandCameraTarget(vpSize.w / zoomRef.current, vpSize.h / zoomRef.current);
    setTick((tick) => tick + 1);
  }, [displayCategory, vpSize.w, vpSize.h]);

  /* ── Refs ── */
  const canvasRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef({ x: 0, y: 0 });
  const categoryTransitionTimerRef = useRef<number | null>(null);
  const velRef = useRef({ x: 0, y: 0 });
  const momentumFrictionRef = useRef(FRICTION);
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef({
    mode: "idle" as "idle" | "pan" | "pinch",
    pointerId: null as number | null,
    startPointer: { x: 0, y: 0 },
    startCamera: { x: 0, y: 0 },
    startZoom: 1,
    startDistance: 1,
    startCenter: { x: 0, y: 0 },
    hadPinch: false,
  });
  const zoomRef = useRef(1);
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef<number | null>(null);
  const focusReturnRef = useRef<HTMLButtonElement | null>(null);
  const mobileResultsHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const mobileCanvasModeButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileListModeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousDisplayModeRef = useRef("canvas");
  const ambientAudioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const uiSoundRef = useRef<HTMLAudioElement>(null);
  const audioFadeFrameRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastMouseRef = useRef({ x: 0, y: 0, t: 0 });
  const hasScrolledRef = useRef(false);
  const brandTapRef = useRef({ count: 0, lastAt: 0 });

  /* ── Mount ── */
  useEffect(() => {
    setMounted(true);
    const update = () => {
      setVpSize({ w: window.innerWidth, h: window.innerHeight });
      setIsMobileViewport(window.matchMedia("(max-width: 767px)").matches);
    };
    update();
    // Center the brand tile on the viewport when the site opens.
    cameraRef.current = getBrandCameraTarget(window.innerWidth / zoomRef.current, window.innerHeight / zoomRef.current);
    setTick((t) => t + 1);
    window.addEventListener("resize", update);

    const loadingTimer = setTimeout(() => {
      setIsLoaded(true);
    }, 1200);

    return () => {
      window.removeEventListener("resize", update);
      clearTimeout(loadingTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioFadeFrameRef.current !== null) cancelAnimationFrame(audioFadeFrameRef.current);
      ambientAudioRef.current?.pause();
      if (audioContextRef.current) void audioContextRef.current.close();
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
      setStarfallActive(true);
      setStarfallRun((run) => run + 1);
      if (starfallTimerRef.current !== null) window.clearTimeout(starfallTimerRef.current);
      starfallTimerRef.current = window.setTimeout(() => {
        setStarfallActive(false);
        starfallTimerRef.current = null;
      }, 8500);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setStarfallActive(false);
        if (starfallTimerRef.current !== null) window.clearTimeout(starfallTimerRef.current);
        starfallTimerRef.current = null;
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
      if (starfallTimerRef.current !== null) window.clearTimeout(starfallTimerRef.current);
    };
  }, []);

  const playUiSound = useCallback(() => {
    if (isDraggingRef.current || dragMovedRef.current || suppressClickRef.current) return;
    const audio = uiSoundRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.volume = 0.14;
    void audio.play().catch(() => undefined);
  }, []);

  const selectProject = useCallback((project: ProjectItem, trigger: HTMLButtonElement) => {
    playUiSound();
    focusReturnRef.current = trigger;
    setActiveProject(project);
  }, [playUiSound]);

  const fadeAmbientAudio = useCallback((audio: HTMLAudioElement, targetVolume: number, duration: number, onComplete?: () => void) => {
    if (audioFadeFrameRef.current !== null) cancelAnimationFrame(audioFadeFrameRef.current);
    const startVolume = audio.volume;
    let startTime = 0;
    const step = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min(1, (time - startTime) / duration);
      const eased = progress * progress * (3 - 2 * progress);
      audio.volume = startVolume + (targetVolume - startVolume) * eased;
      if (progress < 1) {
        audioFadeFrameRef.current = requestAnimationFrame(step);
      } else {
        audioFadeFrameRef.current = null;
        onComplete?.();
      }
    };
    audioFadeFrameRef.current = requestAnimationFrame(step);
  }, []);

  const toggleAmbientAudio = useCallback(async () => {
    const audio = ambientAudioRef.current;
    if (!audio) return;

    if (!audioAnalyserRef.current && typeof window.AudioContext !== "undefined") {
      try {
        const context = new AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.82;
        const source = context.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(context.destination);
        audioContextRef.current = context;
        audioAnalyserRef.current = analyser;
        setAudioAnalyser(analyser);
      } catch {
        // Keep the existing audio control working if Web Audio is unavailable.
      }
    }
    if (audioContextRef.current?.state === "suspended") {
      await audioContextRef.current.resume().catch(() => undefined);
    }

    if (audioFadeFrameRef.current !== null) {
      cancelAnimationFrame(audioFadeFrameRef.current);
      audioFadeFrameRef.current = null;
    }
    if (soundEnabled) {
      setSoundEnabled(false);
      fadeAmbientAudio(audio, 0, 1200, () => audio.pause());
      return;
    }
    audio.volume = 0;
    try {
      await audio.play();
      setSoundEnabled(true);
    } catch {
      audio.pause();
      setSoundEnabled(false);
    }
  }, [fadeAmbientAudio, soundEnabled]);

  useEffect(() => {
    if (!mounted) return;
    const audio = ambientAudioRef.current;
    if (!audio) return;

    let cancelled = false;
    audio.volume = 0;
    void audio.play().then(() => {
      if (cancelled) {
        audio.pause();
        return;
      }
      setSoundEnabled(true);
    }).catch(() => {
      audio.pause();
      if (!cancelled) setSoundEnabled(false);
    });

    return () => {
      cancelled = true;
      if (audioFadeFrameRef.current !== null) {
        cancelAnimationFrame(audioFadeFrameRef.current);
        audioFadeFrameRef.current = null;
      }
      audio.pause();
    };
  }, [mounted]);

  useEffect(() => {
    const audio = ambientAudioRef.current;
    if (!audio || !soundEnabled) return;
    fadeAmbientAudio(audio, activeProject ? 0.12 : 0.24, activeProject ? 900 : 1800);
  }, [activeProject, fadeAmbientAudio, soundEnabled]);

  const selectCategory = useCallback((category: GridCategory) => {
    if (category === activeCategory) return;
    playUiSound();
    setActiveCategory(category);
    pendingCategoryRef.current = category;
    if (categoryTransitionTimerRef.current !== null) window.clearTimeout(categoryTransitionTimerRef.current);
    if (isMobile) {
      setDisplayCategory(category);
      setOutgoingCells(null);
      setCategoryTransitionPhase("idle");
      categoryTransitionTimerRef.current = null;
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
      window.requestAnimationFrame(() => mobileResultsHeadingRef.current?.focus());
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayCategory(category);
      setOutgoingCells(null);
      setCategoryTransitionPhase("idle");
      categoryTransitionTimerRef.current = null;
      return;
    }

    const beginEntering = () => {
      setCategoryTransitionPhase("enter");
      categoryTransitionTimerRef.current = window.setTimeout(() => {
        setCategoryTransitionPhase("idle");
        categoryTransitionTimerRef.current = null;
      }, CATEGORY_ENTER_MS);
    };

    if (categoryTransitionPhase === "blank") {
      setDisplayCategory(category);
      categoryTransitionTimerRef.current = window.setTimeout(beginEntering, CATEGORY_BLANK_MS);
      return;
    }

    if (categoryTransitionPhase !== "exit") {
      setOutgoingCells(visibleCellsRef.current.map((cell) => ({ ...cell })));
    }
    setCategoryTransitionPhase("exit");
    setCategoryTransitionRun((run) => run + 1);
    categoryTransitionTimerRef.current = window.setTimeout(() => {
      setOutgoingCells(null);
      setDisplayCategory(pendingCategoryRef.current);
      setCategoryTransitionPhase("blank");
      categoryTransitionTimerRef.current = window.setTimeout(beginEntering, CATEGORY_BLANK_MS);
    }, CATEGORY_EXIT_MS);
  }, [activeCategory, categoryTransitionPhase, isMobile, playUiSound]);

  /* ── Momentum animation ── */
  const startMomentum = useCallback((friction: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const animate = () => {
      velRef.current.x *= momentumFrictionRef.current;
      velRef.current.y *= momentumFrictionRef.current;

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

    momentumFrictionRef.current = friction;
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  /* ── Wheel ── */
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey) {
        const rect = canvasRef.current?.getBoundingClientRect();
        const originX = e.clientX - (rect?.left ?? 0);
        const originY = e.clientY - (rect?.top ?? 0);
        const oldZoom = zoomRef.current;
        const transform = getAnchoredZoomTransform({
          camera: cameraRef.current,
          startZoom: oldZoom,
          requestedZoom: oldZoom * Math.exp(-e.deltaY * WHEEL_ZOOM_SPEED),
          startAnchor: { x: originX, y: originY },
          nextAnchor: { x: originX, y: originY },
          viewportOrigin: { x: 0, y: 0 },
          minZoom: MIN_CANVAS_ZOOM,
          maxZoom: MAX_CANVAS_ZOOM,
        });
        zoomRef.current = transform.zoom;
        cameraRef.current = transform.camera;
        setTick((t) => t + 1);
        return;
      }
      const dx = (e.deltaX || (e.shiftKey ? e.deltaY : 0)) * WHEEL_SPEED;
      const dy = (e.shiftKey ? 0 : e.deltaY) * WHEEL_SPEED;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        cameraRef.current.x += dx / zoomRef.current;
        cameraRef.current.y += dy / zoomRef.current;
        setTick((t) => t + 1);
      } else {
        const wheelInertia = 0.16;
        velRef.current.x -= (dx / zoomRef.current) * wheelInertia;
        velRef.current.y -= (dy / zoomRef.current) * wheelInertia;
        startMomentum(WHEEL_FRICTION);
      }

      if (!hasScrolledRef.current) {
        hasScrolledRef.current = true;
        setHintVisible(false);
      }
    },
    [startMomentum],
  );

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  /* ── Drag handlers ── */
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const point = { x: e.clientX, y: e.clientY };
      const gestureStart = beginCanvasPointer(
        activePointersRef.current,
        gestureRef.current,
        e.pointerId,
        point,
        cameraRef.current,
        zoomRef.current,
      );
      activePointersRef.current = gestureStart.pointers;
      gestureRef.current = gestureStart.gesture;
      isDraggingRef.current = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      velRef.current = { x: 0, y: 0 };

      if (gestureStart.mode === "pan") {
        dragMovedRef.current = false;
        suppressClickRef.current = false;
        if (suppressClickTimerRef.current !== null) {
          window.clearTimeout(suppressClickTimerRef.current);
          suppressClickTimerRef.current = null;
        }
        lastMouseRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
      } else if (gestureStart.mode === "pinch") {
        dragMovedRef.current = true;
        setIsDragging(true);
      }

      if (!hasScrolledRef.current) {
        hasScrolledRef.current = true;
        setHintVisible(false);
      }
    },
    [],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const pointers = moveCanvasPointer(activePointersRef.current, e.pointerId, { x: e.clientX, y: e.clientY });
    if (!pointers) return;
    activePointersRef.current = pointers;
    const gesture = gestureRef.current;

    if (gesture.mode === "pinch" && pointers.size >= 2) {
      const [first, second] = Array.from(pointers.values());
      const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
      const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
      const rect = canvasRef.current?.getBoundingClientRect();
      const left = rect?.left ?? 0;
      const top = rect?.top ?? 0;
      if (Math.abs(distance - gesture.startDistance) > 2 || Math.hypot(center.x - gesture.startCenter.x, center.y - gesture.startCenter.y) > 2) {
        dragMovedRef.current = true;
        setIsDragging(true);
      }
      const nextZoom = getPinchZoom(gesture.startZoom, gesture.startDistance, distance, MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM);
      const transform = getAnchoredZoomTransform({
        camera: gesture.startCamera,
        startZoom: gesture.startZoom,
        requestedZoom: nextZoom,
        startAnchor: gesture.startCenter,
        nextAnchor: center,
        viewportOrigin: { x: left, y: top },
        minZoom: MIN_CANVAS_ZOOM,
        maxZoom: MAX_CANVAS_ZOOM,
      });
      zoomRef.current = transform.zoom;
      cameraRef.current = transform.camera;
      velRef.current = { x: 0, y: 0 };
      setTick((tick) => tick + 1);
      return;
    }

    if (gesture.mode !== "pan" || gesture.pointerId !== e.pointerId) return;
    const dx = e.clientX - gesture.startPointer.x;
    const dy = e.clientY - gesture.startPointer.y;
    if (Math.hypot(dx, dy) > 6) {
      dragMovedRef.current = true;
      setIsDragging(true);
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    }
    cameraRef.current.x = gesture.startCamera.x - dx / gesture.startZoom;
    cameraRef.current.y = gesture.startCamera.y - dy / gesture.startZoom;

    const now = Date.now();
    const dt = Math.max(1, now - lastMouseRef.current.t);
    velRef.current = {
      x: (e.clientX - lastMouseRef.current.x) / dt * 16 / gesture.startZoom,
      y: (e.clientY - lastMouseRef.current.y) / dt * 16 / gesture.startZoom,
    };
    lastMouseRef.current = { x: e.clientX, y: e.clientY, t: now };
    setTick((tick) => tick + 1);
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const previousGesture = gestureRef.current;
    const gestureEnd = endCanvasPointer(
      activePointersRef.current,
      previousGesture,
      e.pointerId,
      cameraRef.current,
      zoomRef.current,
    );
    if (gestureEnd.ignored) return;
    activePointersRef.current = gestureEnd.pointers;
    gestureRef.current = gestureEnd.gesture;
    if (gestureEnd.remaining) return;

    const didDrag = dragMovedRef.current;
    const hadPinch = previousGesture.hadPinch;
    isDraggingRef.current = false;
    setIsDragging(false);
    if (didDrag) {
      suppressClickRef.current = true;
      suppressClickTimerRef.current = window.setTimeout(() => {
        suppressClickRef.current = false;
        dragMovedRef.current = false;
        suppressClickTimerRef.current = null;
      }, 250);
      if (!hadPinch) startMomentum(isMobileViewport ? MOBILE_DRAG_FRICTION : DRAG_FRICTION);
    }
  }, [isMobileViewport, startMomentum]);

  /* ── Calculate visible cells ── */
  const cam = cameraRef.current;
  const zoom = zoomRef.current;
  const particleParallaxStyle = {
    "--particle-far-x": `${(-cam.x * zoom * 0.08).toFixed(2)}px`,
    "--particle-far-y": `${(-cam.y * zoom * 0.08).toFixed(2)}px`,
    "--particle-mid-x": `${(-cam.x * zoom * 0.35).toFixed(2)}px`,
    "--particle-mid-y": `${(-cam.y * zoom * 0.35).toFixed(2)}px`,
    "--particle-near-x": `${(-cam.x * zoom * 0.85).toFixed(2)}px`,
    "--particle-near-y": `${(-cam.y * zoom * 0.85).toFixed(2)}px`,
  } as CSSProperties;
  const worldViewportWidth = vpSize.w / zoom;
  const worldViewportHeight = vpSize.h / zoom;
  const buffer = 1;

  const startCol = Math.floor(cam.x / STEP_X) - buffer;
  const endCol = Math.ceil((cam.x + worldViewportWidth) / STEP_X) + buffer;
  const startRow = Math.floor(cam.y / STEP_Y) - buffer;
  const endRow = Math.ceil((cam.y + worldViewportHeight) / STEP_Y) + buffer;

  const visibleCells: VisibleCell[] = [];

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

      const sx = (col * STEP_X - cam.x) * zoom;
      const sy = (row * STEP_Y - cam.y) * zoom;

      // Soften and darken cells only within the last 105px before a viewport edge.
      const cx = sx + (w * zoom) / 2;
      const cy = sy + (h * zoom) / 2;
      const edgeDistance = Math.min(cx, cy, vpSize.w - cx, vpSize.h - cy);
      const edgeT = Math.max(0, Math.min(1, (105 - edgeDistance) / 105));
      const edgeStrength = edgeT * edgeT;
      const blur = 4 * edgeStrength;
      const brightness = 1 - 0.24 * edgeStrength;
      const opacity = 1 - 0.06 * edgeStrength;

      visibleCells.push({
        key: `${displayCategory}_${col}_${row}`,
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
  visibleCellsRef.current = visibleCells;

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
          <div className="canvas-grid-tex" style={particleParallaxStyle} />
          <div id="particles-js" className="particles-layer" style={particleParallaxStyle} aria-hidden="true">
            <span className="parallax-particles parallax-particles--far" />
            <span className="parallax-particles parallax-particles--mid" />
            <span className="parallax-particles parallax-particles--near" />
            <span className="ambient-meteor" />
          </div>
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
                  number: { value: window.matchMedia("(max-width: 767px)").matches ? 42 : 112, density: { enable: true, value_area: 1000 } },
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
          {spotlightModeOn && !isMobileViewport && !showMobileList && <div className="darkroom-overlay" aria-hidden="true" />}
          <div className="topbar-shade" aria-hidden="true" />

          {!isMobile && <div className="canvas-label canvas-label--left">
            <span className="canvas-label__rule" />
            <span>RYUGEN</span>
            <span className="canvas-label__divider">/</span>
            <span className="canvas-label__muted">ABOUT ME / CREATIVE WORK</span>
          </div>}
          {!isMobile && <div className="canvas-label canvas-label--right">
            <span className="canvas-label__muted">GAMES / 3D / WEB APPS</span>
            <span className="canvas-label__rule" />
          </div>}

          {!isMobile && <nav className="canvas-filter" aria-label="作品カテゴリー">
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
          </nav>}

          <audio
            ref={ambientAudioRef}
            className="ambient-audio-source"
            src="/audio/atlasaudio-drone-ambient-518685.mp3"
            loop
            preload="none"
          />
          <audio
            ref={uiSoundRef}
            className="ambient-audio-source"
            src="/audio/juniorsoundays-ui-sound-56-527824.mp3"
            preload="auto"
          />
          <audio
            ref={switchSoundRef}
            className="ambient-audio-source"
            src="/audio/light-switch.mp3"
            preload="auto"
          />
          {!isMobile && <button
            type="button"
            className={`ambient-audio${soundEnabled ? " is-playing" : ""}`}
            aria-label={soundEnabled ? "BGMを停止" : "BGMを再生"}
            aria-pressed={soundEnabled}
            onClick={toggleAmbientAudio}
          >
            <span className="ambient-audio__indicator" aria-hidden="true" />
            <span>{soundEnabled ? "SOUND ON" : "SOUND OFF"}</span>
          </button>}

          {isMobile && (
            <header className="mobile-header">
              <div className="mobile-header__top">
                <div className="mobile-brand-mark">
                  <span className="canvas-label__rule" aria-hidden="true" />
                  <span>RYUGEN</span>
                </div>
                <button
                  type="button"
                  className={`mobile-audio${soundEnabled ? " is-playing" : ""}`}
                  aria-label={soundEnabled ? "BGMを停止" : "BGMを再生"}
                  aria-pressed={soundEnabled}
                  onClick={toggleAmbientAudio}
                >
                  <span className="ambient-audio__indicator" aria-hidden="true" />
                  <span>{soundEnabled ? "SOUND ON" : "SOUND OFF"}</span>
                </button>
              </div>
              <div className="mobile-header__modes" aria-label="表示モード">
                <button
                  ref={mobileCanvasModeButtonRef}
                  type="button"
                  className="mobile-view-mode"
                  aria-label="無限キャンバス表示に切り替え"
                  onClick={() => setShowMobileList(false)}
                >
                  <span aria-hidden="true">▱</span>
                  <span>CANVAS</span>
                </button>
              </div>
              <nav className="mobile-filter" aria-label="作品カテゴリー">
                {GRID_CATEGORIES.map(({ id, label }) => (
                  <button
                    type="button"
                    key={id}
                    className={`canvas-filter__button${activeCategory === id ? " is-active" : ""}`}
                    aria-pressed={activeCategory === id}
                    onClick={() => selectCategory(id)}
                  >
                    <span>{label}</span>
                    <span className="canvas-filter__count">{MOBILE_CATEGORY_COUNTS[id].toString().padStart(2, "0")}</span>
                  </button>
                ))}
              </nav>
            </header>
          )}

          {isMobileViewport && !showMobileList && (
            <button
              ref={mobileListModeButtonRef}
              type="button"
              className="mobile-list-mode-toggle"
              aria-label="一覧表示に切り替え"
              onClick={() => setShowMobileList(true)}
            >
              <span aria-hidden="true">▤</span>
              <span>LIST</span>
            </button>
          )}

          {/* Scroll hint */}
          {!isMobile && <div className={`scroll-hint ${hintVisible ? "" : "hidden"}`}>
            <span className="scroll-hint__arrows">↕ ↔</span>
            {isMobileViewport ? "Drag or pinch to explore" : "Scroll or drag to explore"}
          </div>}

          {/* Canvas */}
          {!isMobile && <div
            ref={canvasRef}
            className={`infinite-canvas${isDragging ? " is-dragging" : ""}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          onLostPointerCapture={(event) => {
            // Pointer capture can move from a child to this canvas once dragging
            // starts. Ignore the bubbled loss from that child; only end the drag
            // if the canvas itself loses capture.
            if (event.target !== event.currentTarget) return;
            onPointerUp(event);
          }}
            onDragStart={(event) => event.preventDefault()}
            onClickCapture={(event) => {
              if (!suppressClickRef.current) return;
              event.preventDefault();
              event.stopPropagation();
              suppressClickRef.current = false;
              dragMovedRef.current = false;
              if (suppressClickTimerRef.current !== null) {
                window.clearTimeout(suppressClickTimerRef.current);
                suppressClickTimerRef.current = null;
              }
            }}
            id="infinite-canvas"
          >
            {categoryTransitionPhase === "exit" && outgoingCells && (
              <div key={`outgoing-${categoryTransitionRun}`} className="cell-layer is-exiting" aria-hidden="true">
                {outgoingCells.map(({ key, item, x, y, w, h, blur, brightness, opacity }) => (
                  <div
                    key={key}
                    className={`canvas-cell${item.type === "project" ? " canvas-cell--project" : item.type === "socialLink" ? " canvas-cell--social" : item.type === "brand" ? " canvas-cell--brand" : ["about", "specs", "skills", "apps", "visualizer", "spacer", "status", "countdown", "iss", "quote", "stat"].includes(item.type) ? " canvas-cell--text" : ""}`}
                    style={{
                      width: w,
                      height: h,
                      transform: `translate(${x}px, ${y}px) scale(${zoom})`,
                      transformOrigin: "top left",
                      filter: `blur(${blur}px) brightness(${brightness})`,
                      opacity,
                    }}
                  >
                    <div className="canvas-cell__reveal">
                      <CellContent item={item} imageSizes={`${Math.ceil(w)}px`} onProjectSelect={selectProject} audioAnalyser={audioAnalyser} soundEnabled={soundEnabled} brandVariant={displayCategory} spotlightOn={spotlightModeOn} onSpotlightToggle={toggleSpotlightMode} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(categoryTransitionPhase === "enter" || categoryTransitionPhase === "idle") && (
              <div key={`incoming-${categoryTransitionRun}`} className={`cell-layer${categoryTransitionPhase === "enter" ? " is-entering" : ""}`}>
                {visibleCells.map(({ key, item, x, y, w, h, blur, brightness, opacity }) => (
                  <div
                    key={key}
                    className={`canvas-cell${item.type === "project" ? " canvas-cell--project" : item.type === "socialLink" ? " canvas-cell--social" : item.type === "brand" ? " canvas-cell--brand" : ["about", "specs", "skills", "apps", "visualizer", "spacer", "status", "countdown", "iss", "quote", "stat"].includes(item.type) ? " canvas-cell--text" : ""}`}
                    style={{
                      width: w,
                      height: h,
                      transform: `translate(${x}px, ${y}px) scale(${zoom})`,
                      transformOrigin: "top left",
                      filter: `blur(${blur}px) brightness(${brightness})`,
                      opacity,
                    }}
                  >
                    <div className="canvas-cell__reveal">
                      <CellContent
                        item={item}
                        imageSizes={`${Math.ceil(w)}px`}
                        onProjectSelect={selectProject}
                        audioAnalyser={audioAnalyser}
                        soundEnabled={soundEnabled}
                        brandVariant={displayCategory}
                        spotlightOn={spotlightModeOn}
                        onSpotlightToggle={toggleSpotlightMode}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>}

          {isMobile && (
            <main className="mobile-main">
              <section className="mobile-results" aria-labelledby="mobile-results-title">
                <div className="mobile-results__heading">
                  <span className="mobile-results__eyebrow">SELECTED VIEW</span>
                  <h2 id="mobile-results-title" ref={mobileResultsHeadingRef} tabIndex={-1}>
                    {GRID_CATEGORIES.find(({ id }) => id === displayCategory)?.label}
                  </h2>
                  <span className="mobile-results__count">
                    {mobileItems.length.toString().padStart(2, "0")}
                  </span>
                </div>
                {mobileItems.length > 1 ? (
                  <div key={displayCategory} className="mobile-grid">
                    {mobileItems.map((item, index) => (
                      <article
                        key={item.type === "project" || item.type === "socialLink" ? item.id : `${item.type}-${index}`}
                        className={`mobile-card mobile-card--${item.type}`}
                      >
                        <CellContent
                          item={item}
                          imageSizes="(max-width: 479px) calc(100vw - 32px), (max-width: 767px) calc((100vw - 44px) / 2), 310px"
                          onProjectSelect={selectProject}
                          audioAnalyser={audioAnalyser}
                          soundEnabled={soundEnabled}
                          brandVariant={displayCategory}
                          presentation="list"
                          spotlightOn={spotlightModeOn}
                          onSpotlightToggle={toggleSpotlightMode}
                        />
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mobile-empty-state">表示できるコンテンツはありません。</p>
                )}
              </section>
              <footer className="mobile-footer">RYUGEN <span>·</span> DESIGN / CODE / IMAGE</footer>
            </main>
          )}
        </>
      )}
      {activeProject && (
        <ProjectLightbox item={activeProject} onClose={() => setActiveProject(null)} />
      )}
      {starfallActive && (
        <div key={starfallRun} className="starfall-overlay" aria-hidden="true">
          {Array.from({ length: 28 }, (_, index) => (
            <span
              key={index}
              className="starfall-meteor"
              style={{
                "--star-x": `${(index * 37 + 9) % 100}%`,
                "--star-y": `${(index * 53 + 5) % 78}%`,
                "--star-angle": `${20 + (index * 17) % 29}deg`,
                "--star-length": `${72 + (index * 31) % 90}px`,
                "--star-end-x": `${34 + (index * 13) % 31}vw`,
                "--star-delay": `${index * 0.15 + ((index * 11) % 5) * 0.08}s`,
                "--star-duration": `${1.45 + (index % 6) * 0.21}s`,
                "--star-tint": index % 7 === 0 ? "198, 166, 107" : index % 5 === 0 ? "180, 211, 226" : "243, 238, 229",
              } as CSSProperties}
            />
          ))}
        </div>
      )}
    </>
  );
}
