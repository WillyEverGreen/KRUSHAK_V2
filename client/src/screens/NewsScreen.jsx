import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MdLocationOn, MdOpenInNew, MdAccessTime, MdNewspaper, MdRefresh } from "react-icons/md";
import { fetchNews } from "../services/api";

const LOCAL_FALLBACK_LOCATION = "Maharashtra";

/* Agri-themed SVG placeholder as a data URI – used when no image is available */
const PLACEHOLDER_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="280" viewBox="0 0 600 280">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c8e6c9"/>
      <stop offset="100%" stop-color="#a5d6a7"/>
    </linearGradient>
  </defs>
  <rect width="600" height="280" fill="url(#g)"/>
  <text x="300" y="130" font-family="sans-serif" font-size="52" text-anchor="middle" fill="#4caf50" opacity="0.45">🌾</text>
  <text x="300" y="175" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#2e7d32" opacity="0.6">Agriculture News</text>
</svg>
`)}`;

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now - d;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHrs / 24);
    if (diffHrs < 1) return "Just now";
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function NewsImage({ src, alt }) {
  const [imgSrc, setImgSrc] = useState(src || PLACEHOLDER_SVG);

  useEffect(() => {
    setImgSrc(src || PLACEHOLDER_SVG);
  }, [src]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={() => setImgSrc(PLACEHOLDER_SVG)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
      }}
    />
  );
}

function HeroArticleCard({ article, onRead }) {
  return (
    <article
      className="news-hero-card"
      onClick={onRead}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onRead()}
    >
      <div className="news-hero-img-wrap">
        <NewsImage src={article.image} alt={article.title} />
        <div className="news-hero-overlay" />
        <div className="news-hero-badge">
          <MdNewspaper size={13} />
          <span>{article.source}</span>
        </div>
      </div>
      <div className="news-hero-body">
        <div className="news-meta-row">
          <MdAccessTime size={12} />
          <span>{formatDate(article.publishedAt)}</span>
        </div>
        <h2 className="news-hero-title">{article.title}</h2>
        {article.description && (
          <p className="news-hero-desc">{article.description}</p>
        )}
        <div className="news-read-btn">
          Read Full Article <MdOpenInNew size={14} style={{ verticalAlign: "middle" }} />
        </div>
      </div>
    </article>
  );
}

function NewsCard({ article, onRead }) {
  const hasImage = Boolean(article.image);
  return (
    <article
      className="news-card"
      onClick={onRead}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onRead()}
    >
      <div className="news-card-img-wrap">
        <NewsImage src={hasImage ? article.image : ""} alt={article.title} />
      </div>
      <div className="news-card-body">
        <div className="news-source-badge">
          <span>{article.source}</span>
        </div>
        <h3 className="news-card-title">{article.title}</h3>
        {article.description && (
          <p className="news-card-desc">{article.description}</p>
        )}
        <div className="news-card-footer">
          <div className="news-meta-row">
            <MdAccessTime size={11} />
            <span>{formatDate(article.publishedAt)}</span>
          </div>
          <div className="news-card-cta">
            Read <MdOpenInNew size={12} />
          </div>
        </div>
      </div>
    </article>
  );
}

export default function NewsScreen() {
  const [scope, setScope] = useState("global");
  const [location, setLocation] = useState(LOCAL_FALLBACK_LOCATION);
  const [coords, setCoords] = useState(null);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    if (scope !== "local") return;

    if (!navigator.geolocation) {
      setLocationError("Location unavailable. Showing Maharashtra news.");
      setCoords(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocationError("");
      },
      () => {
        setCoords(null);
        setLocationError("Location denied. Showing Maharashtra news.");
      },
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 5 * 60 * 1000 },
    );
  }, [scope]);

  const {
    data: newsData = { articles: [], resolvedLocation: LOCAL_FALLBACK_LOCATION },
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["news", scope, coords?.latitude ?? "none", coords?.longitude ?? "none", location],
    queryFn: () => fetchNews({ scope, location, latitude: coords?.latitude, longitude: coords?.longitude }),
    /* Keep data for 5 min without refetching; hold in cache for 30 min so
       navigating away and back shows the last-fetched articles instantly. */
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (newsData?.resolvedLocation) setLocation(newsData.resolvedLocation);
  }, [newsData?.resolvedLocation]);

  const articles = newsData.articles || [];
  const [hero, ...rest] = articles;

  function openArticle(url) {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      {/* Scope toggle + Refresh button */}
      <div className="news-topbar">
        <div className="news-scope-toggle" style={{ flex: 1 }}>
          <button
            className={`news-scope-btn${scope === "global" ? " active" : ""}`}
            onClick={() => setScope("global")}
          >
            🌐 Global
          </button>
          <button
            className={`news-scope-btn${scope === "local" ? " active" : ""}`}
            onClick={() => setScope("local")}
          >
            📍 Local
          </button>
        </div>
        <button
          id="news-refresh-btn"
          className="news-refresh-btn"
          onClick={() => refetch()}
          disabled={isFetching}
          title="Refresh news"
          aria-label="Refresh news"
        >
          <MdRefresh size={22} className={isFetching ? "news-spin" : ""} />
        </button>
      </div>

      {/* Location pill */}
      {scope === "local" && (
        <div className="news-location-pill mt-12">
          <MdLocationOn size={15} color="#2e7d32" />
          <span>Showing news for: <strong>{location}</strong></span>
          {locationError && <span className="news-location-error"> — {locationError}</span>}
        </div>
      )}

      {/* Loading skeleton */}
      {(isLoading || isFetching) && (
        <div className="mt-16" style={{ display: "grid", gap: 14 }}>
          <div className="news-skeleton-hero" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="news-skeleton-card" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isFetching && articles.length === 0 && (
        <div className="card mt-16" style={{ textAlign: "center", padding: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📰</div>
          <div className="text-md" style={{ fontWeight: 600, color: "#2e7d32" }}>No news found</div>
          <div className="text-sm muted mt-8">Nothing available right now for this region.</div>
          <button className="btn btn-primary mt-16" onClick={() => refetch()} style={{ width: "100%" }}>
            Retry
          </button>
        </div>
      )}

      {/* Article count badge */}
      {!isLoading && !isFetching && articles.length > 0 && (
        <div className="news-count-row mt-12">
          <span>🌾 {articles.length} agriculture articles</span>
        </div>
      )}

      {/* Hero card + article list */}
      {!isLoading && articles.length > 0 && (
        <div className="mt-16" style={{ display: "grid", gap: 14 }}>
          <HeroArticleCard article={hero} onRead={() => openArticle(hero.url)} />
          {rest.map((article) => (
            <NewsCard key={article.id} article={article} onRead={() => openArticle(article.url)} />
          ))}
        </div>
      )}
    </div>
  );
}

