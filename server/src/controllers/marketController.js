const samplePrices = [
  {
    state: "Maharashtra",
    district: "Pune",
    market: "Pune Mandi",
    commodity: "Tomato",
    variety: "Hybrid",
    grade: "A",
    arrivalDate: "22/04/2026",
    minPrice: "800",
    maxPrice: "1400",
    modalPrice: "1100",
  },
  {
    state: "Maharashtra",
    district: "Nashik",
    market: "Nashik Mandi",
    commodity: "Onion",
    variety: "Red",
    grade: "B",
    arrivalDate: "22/04/2026",
    minPrice: "1200",
    maxPrice: "2200",
    modalPrice: "1800",
  },
  {
    state: "Punjab",
    district: "Ludhiana",
    market: "Ludhiana Market",
    commodity: "Wheat",
    variety: "Sharbati",
    grade: "A",
    arrivalDate: "22/04/2026",
    minPrice: "2100",
    maxPrice: "2600",
    modalPrice: "2350",
  },
  {
    state: "Karnataka",
    district: "Mysuru",
    market: "Mysuru Yard",
    commodity: "Rice",
    variety: "Sona Masuri",
    grade: "A",
    arrivalDate: "22/04/2026",
    minPrice: "3000",
    maxPrice: "3800",
    modalPrice: "3450",
  },
  {
    state: "Madhya Pradesh",
    district: "Indore",
    market: "Indore Grain Hub",
    commodity: "Soyabean",
    variety: "Yellow",
    grade: "A",
    arrivalDate: "22/04/2026",
    minPrice: "4500",
    maxPrice: "5200",
    modalPrice: "4880",
  },
];

export async function getMarketPrices(req, res) {
  const q = (req.query.q || "").toString().trim().toLowerCase();
  const state = (req.query.state || "").toString().trim().toLowerCase();
  const commodity = (req.query.commodity || "").toString().trim().toLowerCase();

  const filtered = samplePrices.filter((item) => {
    const matchesState = !state || item.state.toLowerCase() === state;
    const matchesCommodity =
      !commodity || item.commodity.toLowerCase() === commodity;
    const matchesQ =
      !q ||
      item.commodity.toLowerCase().includes(q) ||
      item.market.toLowerCase().includes(q) ||
      item.district.toLowerCase().includes(q) ||
      item.state.toLowerCase().includes(q);

    return matchesState && matchesCommodity && matchesQ;
  });

  return res.status(200).json({ prices: filtered });
}
