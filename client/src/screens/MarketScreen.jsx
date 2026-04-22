import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MdRefresh, MdSearch } from "react-icons/md";
import { fetchMarketPrices } from "../services/api";
import DataState from "../components/DataState";
import FreshnessTag from "../components/FreshnessTag";

const states = [
  "",
  "Maharashtra",
  "Gujarat",
  "Rajasthan",
  "Madhya Pradesh",
  "Uttar Pradesh",
  "Punjab",
  "Haryana",
  "Karnataka",
  "Andhra Pradesh",
  "Tamil Nadu",
  "West Bengal",
  "Bihar",
];

const commodities = [
  "",
  "Wheat",
  "Rice",
  "Onion",
  "Tomato",
  "Potato",
  "Cotton",
  "Soyabean",
  "Maize",
  "Groundnut",
  "Sugarcane",
  "Banana",
  "Apple",
];

export default function MarketScreen() {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [commodityFilter, setCommodityFilter] = useState("");

  const {
    data,
    isLoading,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["market-prices", stateFilter, commodityFilter, search],
    queryFn: () =>
      fetchMarketPrices({
        state: stateFilter || undefined,
        commodity: commodityFilter || undefined,
        q: search || undefined,
      }),
  });

  const prices = data?.prices || [];

  return (
    <div>
      <div className="row-between">
        <div>
          <div className="text-xl" style={{ fontWeight: 800 }}>Mandi Prices</div>
          {data?.updatedAt && (
             <div className="mt-8 row" style={{ gap: 8, alignItems: "center" }}>
               <FreshnessTag generatedAt={data.updatedAt} />
               <span className="text-xs muted">Source: {data.source}</span>
             </div>
          )}
        </div>
        <button
          className="btn btn-subtle"
          onClick={() => refetch()}
          aria-label="Refresh"
          disabled={isFetching}
        >
          <MdRefresh size={18} className={isFetching ? "news-spin" : ""} />
        </button>
      </div>

      <div className="card mt-12" style={{ padding: 12 }}>
        <div style={{ position: "relative" }}>
          <MdSearch style={{ position: "absolute", top: 12, left: 10, color: "#2e7d32" }} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="search-input"
            style={{ paddingLeft: 34 }}
            placeholder="Search commodity, market..."
          />
        </div>

        <div className="row mt-12">
          <select
            className="search-input"
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value)}
          >
            {states.map((stateName) => (
              <option key={stateName || "all"} value={stateName}>
                {stateName || "All States"}
              </option>
            ))}
          </select>
          <select
            className="search-input"
            value={commodityFilter}
            onChange={(event) => setCommodityFilter(event.target.value)}
          >
            {commodities.map((item) => (
              <option key={item || "all"} value={item}>
                {item || "All Commodities"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-12" style={{ display: "grid", gap: 12 }}>
        <DataState loading={isLoading} error={error} empty={prices.length === 0} emptyMessage="No prices found. Try adjusting filters.">
          {prices.map((price, index) => (
            <div className="card" key={`${price.market}-${price.commodity}-${index}`}>
              <div className="row-between">
                <div className="text-lg" style={{ fontWeight: 700 }}>
                  {price.commodity}
                </div>
                <span className="chip">{price.arrivalDate}</span>
              </div>

              {(price.variety || price.grade) && (
                <div className="text-sm muted mt-8">
                  {price.variety}
                  {price.grade ? ` • ${price.grade}` : ""}
                </div>
              )}

              <div className="text-sm muted mt-8">
                {price.market}, {price.district}, {price.state}
              </div>

              <div className="row mt-12" style={{ justifyContent: "space-around" }}>
                <PriceCol label="Min" value={price.minPrice} color="#ef4444" />
                <PriceCol label="Modal" value={price.modalPrice} color="#2e7d32" />
                <PriceCol label="Max" value={price.maxPrice} color="#3b82f6" />
              </div>
            </div>
          ))}
        </DataState>
      </div>
    </div>
  );
}

function PriceCol({ label, value, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div className="text-xs muted">{label}</div>
      <div className="text-lg" style={{ color, fontWeight: 700 }}>
        Rs {value}
      </div>
      <div className="text-xs muted">/quintal</div>
    </div>
  );
}
