export interface PitchSlot {
  x: number;   // percentuale orizzontale (0-100)
  y: number;   // percentuale verticale (0-100, 100 = fondo campo)
  label: string;
  isGoalkeeper: boolean;
}

/**
 * Genera le posizioni sul campo in base al numero totale di giocatori.
 * Slot 0 è sempre il portiere, gli altri sono giocatori di movimento.
 * Le righe si distribuiscono in modo equilibrato sul campo.
 */
export function getPitchPositions(size: number): PitchSlot[] {
  if (size <= 0) return [];

  const positions: PitchSlot[] = [];

  // Portiere fisso in fondo
  positions.push({ x: 50, y: 88, label: "POR", isGoalkeeper: true });

  const outfield = size - 1;
  if (outfield <= 0) return positions;

  // Calcola quante righe e quanti per riga
  const rows = distributeRows(outfield);
  const totalRows = rows.length;

  // Distribuisce le righe in modo uniforme tra y=15 e y=72
  const yTop = 15;
  const yBottom = 72;

  rows.forEach((count, rowIdx) => {
    // y va da top (attaccanti) a bottom (difensori)
    // rowIdx=0 è la riga più avanzata (attaccanti)
    const y = totalRows === 1
      ? (yTop + yBottom) / 2
      : yTop + (rowIdx / (totalRows - 1)) * (yBottom - yTop);

    // Distribuisce i giocatori orizzontalmente con margini
    const margin = count === 1 ? 0 : 10;
    const step = count === 1 ? 0 : (100 - margin * 2) / (count - 1);
    const startX = count === 1 ? 50 : margin;

    for (let i = 0; i < count; i++) {
      positions.push({
        x: startX + step * i,
        y: Math.round(y),
        label: "MOV",
        isGoalkeeper: false,
      });
    }
  });

  return positions;
}

/**
 * Distribuisce N giocatori in righe bilanciate.
 * Esempi:
 *  1 → [1]
 *  4 → [2, 2]
 *  5 → [2, 3] o [3, 2]
 *  6 → [2, 2, 2] o [3, 3]
 *  7 → [2, 2, 3]
 *  10 → [3, 3, 4]
 *  14 → [3, 4, 4, 3]
 */
function distributeRows(n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [1];
  if (n === 2) return [2];
  if (n === 3) return [3];
  if (n === 4) return [2, 2];
  if (n === 5) return [2, 3];
  if (n === 6) return [2, 2, 2];
  if (n === 7) return [2, 2, 3];
  if (n === 8) return [2, 3, 3];
  if (n === 9) return [3, 3, 3];
  if (n === 10) return [3, 3, 4];
  if (n === 11) return [3, 4, 4]; // classico 4-4-3 rovesciato (attacco in cima)
  if (n === 12) return [3, 4, 5];
  if (n === 13) return [4, 4, 5];
  if (n === 14) return [4, 5, 5];

  // Per n > 14 distribuisce in righe da max 5
  const numRows = Math.ceil(n / 5);
  const base = Math.floor(n / numRows);
  const extra = n % numRows;
  return Array.from({ length: numRows }, (_, i) => (i < extra ? base + 1 : base));
}
