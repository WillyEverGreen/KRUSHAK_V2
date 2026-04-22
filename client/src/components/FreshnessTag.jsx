/**
 * FreshnessTag — small badge showing data freshness state.
 * Usage: <FreshnessTag generatedAt="ISO string" stale={false} />
 */

const MS_PER_MIN = 60_000;

export default function FreshnessTag({ generatedAt, stale = false, style = {} }) {
  if (!generatedAt) return null;

  const ageMs  = Date.now() - new Date(generatedAt).getTime();
  const ageMin = Math.round(ageMs / MS_PER_MIN);

  let label, color, bg;
  if (stale) {
    label = "Stale";
    color = "#b45309";
    bg    = "#fef3c7";
  } else if (ageMin < 2) {
    label = "Live";
    color = "#15803d";
    bg    = "#dcfce7";
  } else if (ageMin < 20) {
    label = `${ageMin}m ago`;
    color = "#1d4ed8";
    bg    = "#dbeafe";
  } else {
    label = `${ageMin}m ago`;
    color = "#92400e";
    bg    = "#fef3c7";
  }

  return (
    <span
      style={{
        display:      "inline-flex",
        alignItems:   "center",
        gap:          4,
        padding:      "4px 10px",
        borderRadius: 99,
        fontSize:     11,
        fontWeight:   600,
        background:   bg,
        color,
        whiteSpace:   "nowrap",
        ...style,
      }}
    >
      <span
        style={{
          width: 6, height: 6,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}
