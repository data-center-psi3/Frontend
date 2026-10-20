export function InstitutionMark() {
  return (
    <svg
      className="institution-mark"
      viewBox="0 0 40 54"
      role="img"
      aria-label="Símbolo do Instituto Federal"
    >
      <circle cx="6" cy="6" r="6" fill="#cd191e" />
      {[
        [14, 0],
        [28, 0],
        [0, 14],
        [14, 14],
        [0, 28],
        [14, 28],
        [28, 28],
        [0, 42],
        [14, 42],
      ].map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="12"
          height="12"
          rx="1"
          fill="#2f9e41"
        />
      ))}
    </svg>
  );
}
