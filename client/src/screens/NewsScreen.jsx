import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MdLocationOn } from "react-icons/md";
import { fetchNews } from "../services/api";

export default function NewsScreen() {
  const [scope, setScope] = useState("global");
  const [location] = useState("maharashtra");

  const { data: articles = [], isLoading, refetch } = useQuery({
    queryKey: ["news", scope, location],
    queryFn: () => fetchNews(scope, location),
  });

  return (
    <div>
      <div className="card" style={{ padding: 6, borderRadius: 30, background: "rgba(46,125,50,0.14)" }}>
        <div className="row">
          <button
            className="btn"
            style={{
              flex: 1,
              borderRadius: 26,
              background: scope === "global" ? "#ffffff" : "transparent",
              color: scope === "global" ? "#2e7d32" : "#4b5563",
            }}
            onClick={() => setScope("global")}
          >
            Global News
          </button>
          <button
            className="btn"
            style={{
              flex: 1,
              borderRadius: 26,
              background: scope === "local" ? "#ffffff" : "transparent",
              color: scope === "local" ? "#2e7d32" : "#4b5563",
            }}
            onClick={() => setScope("local")}
          >
            Local News
          </button>
        </div>
      </div>

      {scope === "local" && (
        <div className="card mt-16" style={{ background: "#e8f5e9", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <MdLocationOn size={16} color="#2e7d32" />
          <span className="text-sm" style={{ color: "#2e7d32", fontWeight: 600 }}>Showing news for: {location}</span>
        </div>
      )}

      <div className="mt-16" style={{ display: "grid", gap: 14 }}>
        {isLoading && <div className="text-sm muted">Fetching latest updates...</div>}

        {!isLoading && articles.length === 0 && (
          <div className="card">
            <div className="text-md muted">No news available for this section.</div>
            <button className="btn btn-primary mt-12" onClick={() => refetch()}>Retry</button>
          </div>
        )}

        {articles.map((article) => (
          <article className="card-elevated" key={article.id}>
            <div className="text-xs muted">{article.publishedAt} • {article.source}</div>
            <div className="text-lg mt-8" style={{ fontWeight: 700 }}>{article.title}</div>
            <div className="text-sm muted mt-8" style={{ lineHeight: 1.4 }}>{article.description}</div>
            <div className="mt-12">
              <button className="btn btn-subtle">Read Full Article</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
