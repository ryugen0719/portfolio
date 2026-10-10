/** @typedef {{ x: number, y: number }} Point */
/** @typedef {{ mode: "idle" | "pan" | "pinch", pointerId: number | null, startPointer: Point, startCamera: Point, startZoom: number, startDistance: number, startCenter: Point, hadPinch: boolean }} PointerGesture */

/**
 * Begin tracking a pointer and establish or extend the active gesture.
 *
 * @param {Map<number, Point>} pointers
 * @param {PointerGesture} gesture
 * @param {number} pointerId
 * @param {Point} point
 * @param {Point} camera
 * @param {number} zoom
 * @returns {{ pointers: Map<number, Point>, gesture: PointerGesture, mode: "idle" | "pan" | "pinch" }}
 */
export function beginCanvasPointer(pointers, gesture, pointerId, point, camera, zoom) {
  const nextPointers = new Map(pointers);
  nextPointers.set(pointerId, point);

  if (nextPointers.size === 1) {
    return {
      pointers: nextPointers,
      gesture: {
        ...gesture,
        mode: "pan",
        pointerId,
        startPointer: point,
        startCamera: { ...camera },
        startZoom: zoom,
        hadPinch: false,
      },
      mode: "pan",
    };
  }

  if (nextPointers.size === 2) {
    const [first, second] = Array.from(nextPointers.values());
    return {
      pointers: nextPointers,
      gesture: {
        ...gesture,
        mode: "pinch",
        pointerId: null,
        startCamera: { ...camera },
        startZoom: zoom,
        startDistance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
        startCenter: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
        hadPinch: true,
      },
      mode: "pinch",
    };
  }

  return { pointers: nextPointers, gesture, mode: gesture.mode };
}

/**
 * Update a tracked pointer without mutating the previous pointer collection.
 * Returns null for stale move events after a pointer was released.
 *
 * @param {Map<number, Point>} pointers
 * @param {number} pointerId
 * @param {Point} point
 * @returns {Map<number, Point> | null}
 */
export function moveCanvasPointer(pointers, pointerId, point) {
  if (!pointers.has(pointerId)) return null;
  const nextPointers = new Map(pointers);
  nextPointers.set(pointerId, point);
  return nextPointers;
}

/**
 * End a tracked pointer, rebasing the remaining pointer after a pinch so the
 * transition back to one-finger panning starts at the current camera position.
 *
 * @param {Map<number, Point>} pointers
 * @param {PointerGesture} gesture
 * @param {number} pointerId
 * @param {Point} camera
 * @param {number} zoom
 * @returns {{ ignored: true, pointers: Map<number, Point>, gesture: PointerGesture } | { ignored: false, pointers: Map<number, Point>, gesture: PointerGesture, remaining: boolean }}
 */
export function endCanvasPointer(pointers, gesture, pointerId, camera, zoom) {
  if (!pointers.has(pointerId)) return { ignored: true, pointers, gesture };

  const nextPointers = new Map(pointers);
  nextPointers.delete(pointerId);

  if (nextPointers.size >= 2) {
    const [first, second] = Array.from(nextPointers.values());
    return {
      ignored: false,
      pointers: nextPointers,
      gesture: {
        ...gesture,
        mode: "pinch",
        pointerId: null,
        startCamera: { ...camera },
        startZoom: zoom,
        startDistance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
        startCenter: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
        hadPinch: true,
      },
      remaining: true,
    };
  }

  if (nextPointers.size === 1 && gesture.mode === "pinch") {
    const [remainingPointerId, remainingPoint] = Array.from(nextPointers.entries())[0];
    return {
      ignored: false,
      pointers: nextPointers,
      gesture: {
        ...gesture,
        mode: "pan",
        pointerId: remainingPointerId,
        startPointer: remainingPoint,
        startCamera: { ...camera },
        startZoom: zoom,
        hadPinch: true,
      },
      remaining: true,
    };
  }

  return {
    ignored: false,
    pointers: nextPointers,
    gesture: { ...gesture, mode: "idle", pointerId: null },
    remaining: false,
  };
}

/**
 * Calculate the zoom level from a pinch gesture, keeping the starting distance
 * fixed for the duration of that gesture so pointer updates cannot compound.
 *
 * @param {number} startZoom
 * @param {number} startDistance
 * @param {number} distance
 * @param {number} minZoom
 * @param {number} maxZoom
 */
export function getPinchZoom(startZoom, startDistance, distance, minZoom, maxZoom) {
  const safeStartDistance = Math.max(1, startDistance);
  const safeDistance = Math.max(1, distance);
  return Math.max(minZoom, Math.min(maxZoom, startZoom * safeDistance / safeStartDistance));
}

/**
 * Keep the world point under a gesture anchor stable while zooming and moving
 * that anchor (as happens when the center of a pinch moves).
 *
 * @param {{ camera: Point, startZoom: number, requestedZoom: number, startAnchor: Point, nextAnchor: Point, viewportOrigin: Point, minZoom: number, maxZoom: number }} input
 * @returns {{ zoom: number, camera: Point }}
 */
export function getAnchoredZoomTransform({
  camera,
  startZoom,
  requestedZoom,
  startAnchor,
  nextAnchor,
  viewportOrigin,
  minZoom,
  maxZoom,
}) {
  const zoom = Math.max(minZoom, Math.min(maxZoom, requestedZoom));
  const worldX = camera.x + (startAnchor.x - viewportOrigin.x) / startZoom;
  const worldY = camera.y + (startAnchor.y - viewportOrigin.y) / startZoom;

  return {
    zoom,
    camera: {
      x: worldX - (nextAnchor.x - viewportOrigin.x) / zoom,
      y: worldY - (nextAnchor.y - viewportOrigin.y) / zoom,
    },
  };
}
