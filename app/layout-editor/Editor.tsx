"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { gridLayout, itemsRegistry } from "../data";
import { resolveGridPlacements } from "../grid-layout";
import type { GridPlacement } from "../types";

const initialPlacements = resolveGridPlacements(
  gridLayout.placements,
  gridLayout.autoFlow,
  gridLayout.columns,
  gridLayout.minRows,
);
const MIN_ROWS = gridLayout.minRows;
const CELL_HEIGHT = 146;

function labelFor(id: string, itemId = id) {
  if (itemId === "countdown") return "Countdown to 2027";
  const item = itemsRegistry[itemId];
  if (item?.type === "project") return item.title;
  if (item?.type === "socialLink") return item.name;
  return itemId.replaceAll("-", " ");
}

function imageFor(id: string, itemId = id) {
  const item = itemsRegistry[itemId];
  return item?.type === "project" ? item.image : null;
}

export default function LayoutEditorPage() {
  const [placements, setPlacements] = useState<GridPlacement[]>(initialPlacements);
  const [columns, setColumns] = useState(gridLayout.columns);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selected = placements.find((placement) => placement.id === selectedId) ?? null;
  const rows = Math.max(
    MIN_ROWS,
    ...placements.map((placement) => placement.row + (placement.rowSpan ?? 1)),
  ) + 2;
  const minColumns = Math.max(1, ...placements.map((placement) => placement.column + (placement.columnSpan ?? 1)));
  const placedIds = new Set(placements.map((placement) => placement.itemId ?? placement.id));
  const unplaced = Object.keys(itemsRegistry).filter((id) => !placedIds.has(id));
  const layoutCode = useMemo(() => {
    const ordered = [...placements].sort((a, b) => a.row - b.row || a.column - b.column);
    const rowsCode = ordered.map((placement) => {
      const span = [
        placement.itemId ? `itemId: "${placement.itemId}"` : "",
        placement.columnSpan && placement.columnSpan !== 1 ? `columnSpan: ${placement.columnSpan}` : "",
        placement.rowSpan && placement.rowSpan !== 1 ? `rowSpan: ${placement.rowSpan}` : "",
      ].filter(Boolean);
      const details = [`id: "${placement.id}"`, `column: ${placement.column}`, `row: ${placement.row}`, ...span];
      return `    { ${details.join(", ")} },`;
    });
    return `columns: ${columns},\nminRows: ${MIN_ROWS},\nautoFlow: [],\nplacements: [\n${rowsCode.join("\n")}\n],`;
  }, [columns, placements]);

  function canPlace(id: string, column: number, row: number, current = placements) {
    const moving = current.find((placement) => placement.id === id);
    if (!moving || column < 0 || row < 0 || column + (moving.columnSpan ?? 1) > columns) return false;
    const width = moving.columnSpan ?? 1;
    const height = moving.rowSpan ?? 1;
    return !current.some((other) => {
      if (other.id === id) return false;
      const otherWidth = other.columnSpan ?? 1;
      const otherHeight = other.rowSpan ?? 1;
      return column < other.column + otherWidth && column + width > other.column &&
        row < other.row + otherHeight && row + height > other.row;
    });
  }

  function firstOpenCell(width = 1, height = 1) {
    for (let row = 0; row < rows + 10; row++) {
      for (let column = 0; column < columns; column++) {
        if (column + width > columns) continue;
        const overlaps = placements.some((other) =>
          column < other.column + (other.columnSpan ?? 1) && column + width > other.column &&
          row < other.row + (other.rowSpan ?? 1) && row + height > other.row,
        );
        if (!overlaps) return { column, row };
      }
    }
    return null;
  }

  function moveTo(id: string, column: number, row: number) {
    if (!canPlace(id, column, row)) return;
    setPlacements((current) => current.map((placement) =>
      placement.id === id ? { ...placement, column, row } : placement,
    ));
    setSelectedId(id);
    setCopied(false);
  }

  function addItem(id: string) {
    const open = firstOpenCell();
    if (!open) return;
    setPlacements((current) => [...current, { id, ...open }]);
    setSelectedId(id);
    setCopied(false);
  }

  function duplicateSelected() {
    if (!selected) return;
    const sourceId = selected.itemId ?? selected.id;
    const open = firstOpenCell(selected.columnSpan ?? 1, selected.rowSpan ?? 1);
    if (!open) return;
    const nextId = (current: GridPlacement[]) => {
      let number = 2;
      while (current.some((placement) => placement.id === `${sourceId}__${number}`)) number++;
      return `${sourceId}__${number}`;
    };
    const id = nextId(placements);
    setPlacements((current) => [...current, { ...selected, ...open, id, itemId: sourceId }]);
    setSelectedId(id);
    setCopied(false);
  }

  function resizeSelected(key: "columnSpan" | "rowSpan", delta: number) {
    if (!selected) return;
    const nextSize = (selected[key] ?? 1) + delta;
    if (nextSize < 1 || (key === "columnSpan" && selected.column + nextSize > columns)) return;
    const candidate = placements.map((placement) =>
      placement.id === selected.id ? { ...placement, [key]: nextSize } : placement,
    );
    if (!canPlace(selected.id, selected.column, selected.row, candidate)) return;
    setPlacements(candidate);
    setCopied(false);
  }

  function unplaceSelected() {
    if (!selected) return;
    setPlacements((current) => current.filter((placement) => placement.id !== selected.id));
    setSelectedId(null);
    setCopied(false);
  }

  async function copyLayout() {
    try {
      await navigator.clipboard.writeText(layoutCode);
      setCopied(true);
    } catch {
      const code = document.getElementById("layout-editor-code") as HTMLTextAreaElement | null;
      code?.focus();
      code?.select();
      setCopied(false);
    }
  }

  function resetLayout() {
    setPlacements(initialPlacements.map((placement) => ({ ...placement })));
    setColumns(gridLayout.columns);
    setSelectedId(null);
    setCopied(false);
  }

  const slots = Array.from({ length: columns * rows }, (_, index) => ({
    column: index % columns,
    row: Math.floor(index / columns),
  }));

  return (
    <main className="layout-editor">
      <header className="layout-editor__header">
        <div>
          <p className="layout-editor__eyebrow">RYUGEN / PROFILE SITE TOOLS</p>
          <h1>Grid Layout Editor</h1>
          <p className="layout-editor__description">作品をドラッグして、展示の並びとサイズを調整します。</p>
        </div>
        <div className="layout-editor__header-actions">
          <button type="button" className="layout-editor__button layout-editor__button--quiet" onClick={resetLayout}>初期配置に戻す</button>
          <Link href="/" className="layout-editor__button layout-editor__button--quiet">ポートフォリオへ戻る</Link>
        </div>
      </header>

      <section className="layout-editor__workspace">
        <div className="layout-editor__board-panel">
          <div className="layout-editor__board-toolbar">
            <div>
              <span className="layout-editor__eyebrow">EXHIBITION CANVAS</span>
              <p>{placements.length} items <span>/</span> {columns} columns</p>
            </div>
            <div className="layout-editor__column-control">
              <span>列数</span>
              <button type="button" aria-label="列数を減らす" onClick={() => setColumns((value) => Math.max(minColumns, value - 1))} disabled={columns <= minColumns}>−</button>
              <strong>{columns}</strong>
              <button type="button" aria-label="列数を増やす" onClick={() => setColumns((value) => value + 1)}>＋</button>
            </div>
          </div>

          <div className="layout-editor__scroll">
            <div
              className="layout-editor__grid"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(132px, 1fr))`, gridAutoRows: `${CELL_HEIGHT}px` }}
            >
              {slots.map(({ column, row }) => {
                const free = !placements.some((placement) =>
                  column >= placement.column && column < placement.column + (placement.columnSpan ?? 1) &&
                  row >= placement.row && row < placement.row + (placement.rowSpan ?? 1),
                );
                const acceptsDrop = draggedId ? canPlace(draggedId, column, row) : false;
                return (
                  <button
                    type="button"
                    key={`slot-${column}-${row}`}
                    className={`layout-editor__slot${free ? " is-empty" : " is-covered"}${acceptsDrop ? " can-drop" : ""}`}
                    style={{ gridColumn: column + 1, gridRow: row + 1 }}
                    aria-label={`列${column + 1}、行${row + 1}${free ? " 空きマス" : " 使用中"}`}
                    onDragOver={(event) => { if (acceptsDrop) event.preventDefault(); }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const id = event.dataTransfer.getData("text/plain") || draggedId;
                      if (id) moveTo(id, column, row);
                      setDraggedId(null);
                    }}
                    onClick={() => {
                      if (selectedId && free) moveTo(selectedId, column, row);
                    }}
                    disabled={!free && !acceptsDrop}
                  >
                    {free && <span>{column + 1} — {row + 1}</span>}
                  </button>
                );
              })}

              {placements.map((placement) => {
                const image = imageFor(placement.id, placement.itemId);
                return (
                  <button
                    type="button"
                    key={placement.id}
                    draggable
                    className={`layout-editor__tile${selectedId === placement.id ? " is-selected" : ""}${draggedId === placement.id ? " is-dragging" : ""}`}
                    style={{
                      gridColumn: `${placement.column + 1} / span ${placement.columnSpan ?? 1}`,
                      gridRow: `${placement.row + 1} / span ${placement.rowSpan ?? 1}`,
                    }}
                    onClick={() => setSelectedId(placement.id)}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", placement.id);
                      event.dataTransfer.effectAllowed = "move";
                      setDraggedId(placement.id);
                    }}
                    onDragEnd={() => setDraggedId(null)}
                  >
                    {image ? <Image src={image} alt="" fill sizes="240px" /> : <span className="layout-editor__tile-monogram">{labelFor(placement.id, placement.itemId).slice(0, 2).toUpperCase()}</span>}
                    <span className="layout-editor__tile-shade" />
                    <span className="layout-editor__tile-label">{labelFor(placement.id, placement.itemId)}</span>
                    <span className="layout-editor__tile-coordinate">{placement.column + 1}, {placement.row + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="layout-editor__hint">画像をドラッグして移動。選択中の画像は、空きマスをクリックしても移動できます。</p>
        </div>

        <aside className="layout-editor__sidebar">
          <section className="layout-editor__card">
            <p className="layout-editor__eyebrow">SELECTED ITEM</p>
            {selected ? (
              <>
                <h2>{labelFor(selected.id, selected.itemId)}</h2>
                <p className="layout-editor__coordinates">列 {selected.column + 1} ・ 行 {selected.row + 1}</p>
                <div className="layout-editor__control-group">
                  <span>横幅</span>
                  <button type="button" onClick={() => resizeSelected("columnSpan", -1)} aria-label="横幅を小さく">−</button>
                  <strong>{selected.columnSpan ?? 1}</strong>
                  <button type="button" onClick={() => resizeSelected("columnSpan", 1)} aria-label="横幅を大きく">＋</button>
                </div>
                <div className="layout-editor__control-group">
                  <span>高さ</span>
                  <button type="button" onClick={() => resizeSelected("rowSpan", -1)} aria-label="高さを小さく">−</button>
                  <strong>{selected.rowSpan ?? 1}</strong>
                  <button type="button" onClick={() => resizeSelected("rowSpan", 1)} aria-label="高さを大きく">＋</button>
                </div>
                <div className="layout-editor__move-controls">
                  <button type="button" onClick={() => moveTo(selected.id, selected.column, selected.row - 1)}>上へ</button>
                  <button type="button" onClick={() => moveTo(selected.id, selected.column - 1, selected.row)}>左へ</button>
                  <button type="button" onClick={() => moveTo(selected.id, selected.column + 1, selected.row)}>右へ</button>
                  <button type="button" onClick={() => moveTo(selected.id, selected.column, selected.row + 1)}>下へ</button>
                </div>
                <button type="button" className="layout-editor__text-button" onClick={duplicateSelected}>カードを複製</button>
                <button type="button" className="layout-editor__text-button" onClick={unplaceSelected}>カードを削除</button>
              </>
            ) : <p className="layout-editor__empty-state">配置したい作品を選択してください。</p>}
          </section>

          <section className="layout-editor__card">
            <p className="layout-editor__eyebrow">UNPLACED WORKS</p>
            {unplaced.length ? (
              <div className="layout-editor__unplaced-list">
                {unplaced.map((id) => {
                  const image = imageFor(id);
                  return (
                    <button type="button" key={id} onClick={() => addItem(id)}>
                      <span className="layout-editor__unplaced-thumb">
                        {image ? <Image src={image} alt="" fill sizes="44px" /> : labelFor(id).slice(0, 2).toUpperCase()}
                      </span>
                      <span>{labelFor(id)}</span>
                      <span aria-hidden="true">＋</span>
                    </button>
                  );
                })}
              </div>
            ) : <p className="layout-editor__empty-state">すべての作品が配置されています。</p>}
          </section>

          <section className="layout-editor__card layout-editor__export-card">
            <div className="layout-editor__export-heading">
              <div><p className="layout-editor__eyebrow">SAVE LAYOUT</p><h2>配置コード</h2></div>
              <button type="button" className="layout-editor__copy-button" onClick={copyLayout}>{copied ? "コピー済み" : "コードをコピー"}</button>
            </div>
            <p className="layout-editor__export-help">コピーしたコードを <code>app/data.tsx</code> の <code>gridLayout</code> に反映してください。</p>
            <textarea id="layout-editor-code" readOnly value={layoutCode} aria-label="グリッド配置コード" onFocus={(event) => event.currentTarget.select()} />
          </section>
        </aside>
      </section>
    </main>
  );
}
