/**
 * DataState — unified loading / empty / error / content state handler.
 * Usage:
 *   <DataState loading={isLoading} error={error} empty={data.length === 0} emptyMessage="No crops yet">
 *     {data.map(...)}
 *   </DataState>
 */
export default function DataState({
  loading = false,
  error   = null,
  empty   = false,
  emptyMessage = "No data available.",
  emptyAction  = null,   // { label: string, onClick: fn }
  children,
}) {
  if (loading) {
    return (
      <div
        style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          padding:        40,
          gap:            12,
        }}
      >
        <div className="spinner" />
        <div className="text-sm muted">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="card"
        style={{
          textAlign:  "center",
          padding:    24,
          background: "#fff5f5",
          border:     "1px solid #fed7d7",
        }}
      >
        <div style={{ fontSize: 28 }}>⚠️</div>
        <div className="text-md" style={{ color: "#c53030", marginTop: 8, fontWeight: 600 }}>
          {error?.message || "Something went wrong"}
        </div>
        <div className="text-sm muted" style={{ marginTop: 4 }}>
          Showing cached data if available.
        </div>
      </div>
    );
  }

  if (empty) {
    return (
      <div
        className="card"
        style={{ textAlign: "center", padding: 32 }}
      >
        <div style={{ fontSize: 32 }}>🌱</div>
        <div className="text-md" style={{ color: "#1b5e20", marginTop: 8, fontWeight: 600 }}>
          {emptyMessage}
        </div>
        {emptyAction && (
          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={emptyAction.onClick}
          >
            {emptyAction.label}
          </button>
        )}
      </div>
    );
  }

  return children;
}
