// Genera posizioni sul campo in base al numero di giocatori (lineup_size)
export function getPitchPositions(size: number): { x: number; y: number; label: string }[] {
  const positions: { x: number; y: number; label: string }[] = [];

  if (size <= 0) return positions;

  // Portiere sempre in fondo
  positions.push({ x: 50, y: 90, label: "POR" });
  const outfield = size - 1;

  if (outfield <= 0) return positions;

  // Distribuisce i giocatori in righe: difesa, centrocampo, attacco
  const rows = outfield <= 4
    ? [outfield]
    : outfield <= 8
    ? [Math.ceil(outfield / 2), Math.floor(outfield / 2)]
    : outfield <= 12
    ? [Math.ceil(outfield * 0.35), Math.ceil(outfield * 0.33), Math.floor(outfield * 0.32)]
    : [Math.ceil(outfield * 0.3), Math.ceil(outfield * 0.3), Math.ceil(outfield * 0.25), Math.floor(outfield * 0.15)];

  const rowLabels = ["DIF", "CEN", "ATT", "TRE"];
  const rowY = [70, 50, 28, 12];

  rows.forEach((count, rowIdx) => {
    const y = rowY[rowIdx] ?? 20;
    const label = rowLabels[rowIdx] ?? "ATT";
    const step = count > 1 ? 80 / (count - 1) : 0;
    const startX = count > 1 ? 10 : 50;
    for (let i = 0; i < count; i++) {
      positions.push({ x: startX + step * i, y, label });
    }
  });

  return positions;
}
