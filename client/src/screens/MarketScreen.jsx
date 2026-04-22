import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MdRefresh, MdSearch } from "react-icons/md";
import { fetchMarketPrices } from "../services/api";

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
    data: prices = [],
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

  return (
    <div>
      <div className="row-between">
        <div className="text-xl" style={{ fontWeight: 800 }}>
          Mandi Prices
        </div>
        <button
          className="btn btn-subtle"
          onClick={() => refetch()}
          aria-label="Refresh"
        >
          <MdRefresh size={18} />
        </button>
      </div>

      <div className="card mt-12" style={{ padding: 12 }}>
        <div style={{ position: "relative" }}>
          <MdSearch
            style={{
              position: "absolute",
              top: 12,
              left: 10,
              color: "#2e7d32",
            }}
          />
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
        {isFetching && (
          <div className="text-sm muted">Fetching latest mandi prices...</div>
        )}

        {!isFetching && prices.length === 0 && (
          <div className="card">
            <div className="text-md muted">
              No prices found. Try adjusting filters.
            </div>
          </div>
        )}

        {prices.map((price, index) => (
          <div
            className="card"
            key={`${price.market}-${price.commodity}-${index}`}
          >
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

            <div
              className="row mt-12"
              style={{ justifyContent: "space-around" }}
            >
              <PriceCol label="Min" value={price.minPrice} color="#ef4444" />
              <PriceCol
                label="Modal"
                value={price.modalPrice}
                color="#2e7d32"
              />
              <PriceCol label="Max" value={price.maxPrice} color="#3b82f6" />
            </div>
          </div>
        ))}
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
