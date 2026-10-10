"use client";

import { useState, useEffect, useRef, useCallback, useMemo, type CSSProperties } from "react";
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

const CELL_W = 310;
const CELL_H = 250;
const GAP = 14;
const STEP_X = CELL_W + GAP;
const STEP_Y = CELL_H + GAP;
const CONTENT_W = COLS * STEP_X;
const CONTENT_H = ROWS * STEP_Y;
const FRICTION = 0.92;
const WHEEL_SPEED = 1.2;
const CATEGORY_EXIT_MS = 1500;
const CATEGORY_BLANK_MS = 200;
const CATEGORY_ENTER_MS = 1500;

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
  const [displayCategory, setDisplayCategory] = useState<GridCategory>("all");
  const [outgoingCells, setOutgoingCells] = useState<VisibleCell[] | null>(null);
  const [categoryTransitionPhase, setCategoryTransitionPhase] = useState<CategoryTransitionPhase>("idle");
  const [categoryTransitionRun, setCategoryTransitionRun] = useState(0);
  const [vpSize, setVpSize] = useState({ w: 1920, h: 1080 });
  const [activeProject, setActiveProject] = useState<ProjectItem | null>(null);
  const [starfallActive, setStarfallActive] = useState(false);
  const [starfallRun, setStarfallRun] = useState(0);
  const starfallTimerRef = useRef<number | null>(null);
  const visibleCellsRef = useRef<VisibleCell[]>([]);
  const pendingCategoryRef = useRef<GridCategory>("all");
  const filteredGrid = useMemo(() => buildFilteredGrid(displayCategory), [displayCategory]);

  useEffect(() => {
    cameraRef.current = getBrandCameraTarget(vpSize.w, vpSize.h);
    setTick((tick) => tick + 1);
  }, [displayCategory, vpSize.w, vpSize.h]);

  /* ── Refs ── */
  const canvasRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef({ x: 0, y: 0 });
  const categoryTransitionTimerRef = useRef<number | null>(null);
  const velRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const camStartRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef<number | null>(null);
  const focusReturnRef = useRef<HTMLButtonElement | null>(null);
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
    const update = () => setVpSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    // Center the brand tile on the viewport when the site opens.
    cameraRef.current = getBrandCameraTarget(window.innerWidth, window.innerHeight);
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
  }, [activeCategory, categoryTransitionPhase, playUiSound]);

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
        dragMovedRef.current = false;
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
          <div className="canvas-grid-tex" />
          <div id="particles-js" className="particles-layer" aria-hidden="true">
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
          <div className="topbar-shade" aria-hidden="true" />

          <div className="canvas-label canvas-label--left">
            <span className="canvas-label__rule" />
            <span>RYUGEN</span>
            <span className="canvas-label__divider">/</span>
            <span className="canvas-label__muted">ABOUT ME / CREATIVE WORK</span>
          </div>
          <div className="canvas-label canvas-label--right">
            <span className="canvas-label__muted">GAMES / 3D / WEB APPS</span>
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
          <button
            type="button"
            className={`ambient-audio${soundEnabled ? " is-playing" : ""}`}
            aria-label={soundEnabled ? "BGMを停止" : "BGMを再生"}
            aria-pressed={soundEnabled}
            onClick={toggleAmbientAudio}
          >
            <span className="ambient-audio__indicator" aria-hidden="true" />
            <span>{soundEnabled ? "SOUND ON" : "SOUND OFF"}</span>
          </button>

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
                    className={`canvas-cell${item.type === "project" ? " canvas-cell--project" : item.type === "socialLink" ? " canvas-cell--social" : item.type === "brand" ? " canvas-cell--brand" : ["about", "specs", "skills", "apps", "visualizer", "spacer", "status", "quote", "stat"].includes(item.type) ? " canvas-cell--text" : ""}`}
                    style={{
                      width: w,
                      height: h,
                      transform: `translate(${x}px, ${y}px)`,
                      filter: `blur(${blur}px) brightness(${brightness})`,
                      opacity,
                    }}
                  >
                    <div className="canvas-cell__reveal">
                      <CellContent item={item} imageSizes={`${Math.ceil(w)}px`} onProjectSelect={selectProject} audioAnalyser={audioAnalyser} soundEnabled={soundEnabled} brandVariant={displayCategory} />
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
                    className={`canvas-cell${item.type === "project" ? " canvas-cell--project" : item.type === "socialLink" ? " canvas-cell--social" : item.type === "brand" ? " canvas-cell--brand" : ["about", "specs", "skills", "apps", "visualizer", "spacer", "status", "quote", "stat"].includes(item.type) ? " canvas-cell--text" : ""}`}
                    style={{
                      width: w,
                      height: h,
                      transform: `translate(${x}px, ${y}px)`,
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
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
