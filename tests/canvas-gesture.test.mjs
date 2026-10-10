import assert from "node:assert/strict";
import test from "node:test";
import {
  beginCanvasPointer,
  endCanvasPointer,
  getAnchoredZoomTransform,
  getPinchZoom,
  moveCanvasPointer,
} from "../app/canvas-gesture.mjs";

const limits = { minZoom: 0.55, maxZoom: 1.75 };

function worldPointAt(camera, zoom, point, origin) {
  return {
    x: camera.x + (point.x - origin.x) / zoom,
    y: camera.y + (point.y - origin.y) / zoom,
  };
}

function idleGesture() {
  return {
    mode: "idle",
    pointerId: null,
    startPointer: { x: 0, y: 0 },
    startCamera: { x: 0, y: 0 },
    startZoom: 1,
    startDistance: 1,
    startCenter: { x: 0, y: 0 },
    hadPinch: false,
  };
}

test("pinch zoom scales by the distance ratio without accumulating updates", () => {
  assert.equal(getPinchZoom(0.8, 100, 150, limits.minZoom, limits.maxZoom), 1.2);
  assert.equal(getPinchZoom(0.8, 100, 20, limits.minZoom, limits.maxZoom), limits.minZoom);
  assert.equal(getPinchZoom(1.2, 100, 250, limits.minZoom, limits.maxZoom), limits.maxZoom);
});

test("anchored zoom preserves the world point when the pinch center moves", () => {
  const camera = { x: 120, y: 40 };
  const origin = { x: 10, y: 15 };
  const startAnchor = { x: 310, y: 200 };
  const nextAnchor = { x: 370, y: 240 };
  const before = worldPointAt(camera, 1.25, startAnchor, origin);
  const transform = getAnchoredZoomTransform({
    camera,
    startZoom: 1.25,
    requestedZoom: 1.6,
    startAnchor,
    nextAnchor,
    viewportOrigin: origin,
    ...limits,
  });
  const after = worldPointAt(transform.camera, transform.zoom, nextAnchor, origin);

  assert.ok(Math.abs(after.x - before.x) < 1e-10);
  assert.ok(Math.abs(after.y - before.y) < 1e-10);
});

test("anchored zoom retains its focal point when a zoom limit is reached", () => {
  const camera = { x: 25, y: 80 };
  const anchor = { x: 210, y: 160 };
  const origin = { x: 0, y: 0 };
  const before = worldPointAt(camera, 1, anchor, origin);
  const transform = getAnchoredZoomTransform({
    camera,
    startZoom: 1,
    requestedZoom: 5,
    startAnchor: anchor,
    nextAnchor: anchor,
    viewportOrigin: origin,
    ...limits,
  });
  const after = worldPointAt(transform.camera, transform.zoom, anchor, origin);

  assert.equal(transform.zoom, limits.maxZoom);
  assert.ok(Math.abs(after.x - before.x) < 1e-10);
  assert.ok(Math.abs(after.y - before.y) < 1e-10);
});

test("releasing one pinch pointer rebases the remaining pointer for smooth panning", () => {
  const camera = { x: 80, y: 60 };
  const firstStart = beginCanvasPointer(new Map(), idleGesture(), 1, { x: 100, y: 120 }, camera, 1);
  const pinchStart = beginCanvasPointer(firstStart.pointers, firstStart.gesture, 2, { x: 200, y: 120 }, camera, 1);
  const pinchMovePointers = moveCanvasPointer(pinchStart.pointers, 2, { x: 300, y: 120 });
  const cameraAfterPinch = { x: 130, y: 90 };
  const ended = endCanvasPointer(pinchMovePointers, pinchStart.gesture, 2, cameraAfterPinch, 1.5);

  assert.equal(pinchStart.gesture.mode, "pinch");
  assert.equal(ended.gesture.mode, "pan");
  assert.equal(ended.gesture.pointerId, 1);
  assert.deepEqual(ended.gesture.startPointer, { x: 100, y: 120 });
  assert.deepEqual(ended.gesture.startCamera, cameraAfterPinch);
  assert.equal(ended.gesture.startZoom, 1.5);
  assert.equal(ended.remaining, true);
});

test("stale move and duplicate release events do not alter active pointers", () => {
  const pointers = new Map([[1, { x: 10, y: 20 }]]);
  const gesture = idleGesture();

  assert.equal(moveCanvasPointer(pointers, 2, { x: 30, y: 40 }), null);
  const ended = endCanvasPointer(pointers, gesture, 2, { x: 0, y: 0 }, 1);
  assert.equal(ended.ignored, true);
  assert.equal(ended.pointers, pointers);
  assert.equal(pointers.size, 1);
});
