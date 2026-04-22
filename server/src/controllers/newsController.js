const globalNews = [
  {
    id: "g1",
    title: "Smart irrigation pilots reduce water use by 22%",
    description:
      "Farmer cooperatives report major savings through sensor-assisted irrigation schedules.",
    source: "Agri India Daily",
    publishedAt: "2026-04-22",
    scope: "global",
  },
  {
    id: "g2",
    title: "Tomato exporters track demand rise in Gulf markets",
    description:
      "Export boards recommend grading discipline and cold-chain planning.",
    source: "Market Watch",
    publishedAt: "2026-04-21",
    scope: "global",
  },
];

const localNewsByState = {
  maharashtra: [
    {
      id: "m1",
      title: "Pune district advisory flags aphid pressure in mustard",
      description:
        "Agriculture officers suggest early morning inspections and neem-based spray cycles.",
      source: "State Agri Bulletin",
      publishedAt: "2026-04-22",
      scope: "local",
    },
  ],
  punjab: [
    {
      id: "p1",
      title: "Punjab wheat procurement centers extend timings",
      description:
        "Extended operating hours aim to reduce queue load for small farmers.",
      source: "Punjab Rural News",
      publishedAt: "2026-04-22",
      scope: "local",
    },
  ],
};

export async function getNews(req, res) {
  const scope = (req.query.scope || "global").toString().toLowerCase();
  const location = (req.query.location || "maharashtra")
    .toString()
    .toLowerCase();

  if (scope === "local") {
    return res.status(200).json({ articles: localNewsByState[location] || [] });
  }

  return res.status(200).json({ articles: globalNews });
}
