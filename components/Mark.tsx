// Midstance's mark: a mirrored 4x4 halftone of two load lobes.
const CELLS = [
  [1, 0, 0, 1],
  [2, 1, 1, 2],
  [3, 1, 1, 3],
  [3, 2, 2, 3],
];
const FILL = ["transparent", "#bcd2ee", "#5b93dc", "#2a6bc8"];

export function Mark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className="mark">
      {CELLS.flatMap((row, y) =>
        row.map((v, x) => (v ? <rect key={`${x}${y}`} x={x * 4} y={y * 4} width="3.2" height="3.2" fill={FILL[v]} /> : null)),
      )}
    </svg>
  );
}
