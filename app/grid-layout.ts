import type { GridPlacement } from "./types";

export function resolveGridPlacements(
  manualPlacements: GridPlacement[],
  autoFlowIds: string[],
  columns: number,
  minRows: number,
): GridPlacement[] {
  const placements = [...manualPlacements];
  const occupied = new Set<string>();

  for (const placement of placements) {
    for (let row = placement.row; row < placement.row + (placement.rowSpan ?? 1); row++) {
      for (let column = placement.column; column < placement.column + (placement.columnSpan ?? 1); column++) {
        occupied.add(`${column}:${row}`);
      }
    }
  }

  const maxRows = Math.max(
    minRows,
    ...placements.map((placement) => placement.row + (placement.rowSpan ?? 1)),
  ) + autoFlowIds.length + 1;

  for (const id of autoFlowIds) {
    let placed = false;
    for (let row = 0; row < maxRows && !placed; row++) {
      for (let column = 0; column < columns; column++) {
        const key = `${column}:${row}`;
        if (occupied.has(key)) continue;
        placements.push({ id, column, row });
        occupied.add(key);
        placed = true;
        break;
      }
    }
    if (!placed) throw new Error(`Could not auto-place grid item: ${id}`);
  }

  return placements;
}
