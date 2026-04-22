import dotenv from "dotenv";
dotenv.config();

const GNEWS_KEY = process.env.GNEWS_API_KEY;
const NEWSDATA_KEY = process.env.NEWSDATA_API_KEY;

// Exact queries from newsController.js
const agriCore = "agriculture OR farming OR crops OR harvest OR irrigation OR mandi OR kisan OR wheat OR rice OR horticulture OR dairy OR livestock OR \"organic farming\"";
const newsdataGlobal = "agriculture OR farming OR crops OR harvest OR irrigation OR livestock";

async function testGNewsGlobal() {
  const params = new URLSearchParams({ q: agriCore, lang: "en", max: "10", token: GNEWS_KEY });
  console.log("GNews query length:", agriCore.length, "chars");
  const res = await fetch(`https://gnews.io/api/v4/search?${params}`);
  const data = await res.json();
  if (data.errors) { console.error("[GNews GLOBAL] Error:", data.errors); return; }
  console.log(`[GNews GLOBAL] ${data.articles?.length ?? 0} articles`);
  data.articles?.slice(0, 3).forEach(a => console.log(" -", a.title?.slice(0, 60)));
}

async function testGNewsLocal() {
  const q = `"Maharashtra" AND (farming OR crops OR agriculture)`;
  const params = new URLSearchParams({ q, lang: "en", max: "10", token: GNEWS_KEY, country: "in" });
  console.log("\nGNews local query length:", q.length, "chars");
  const res = await fetch(`https://gnews.io/api/v4/search?${params}`);
  const data = await res.json();
  if (data.errors) { console.error("[GNews LOCAL] Error:", data.errors); return; }
  console.log(`[GNews LOCAL] ${data.articles?.length ?? 0} articles`);
  data.articles?.slice(0, 2).forEach(a => console.log(" -", a.title?.slice(0, 60)));
}

async function testNewsDataGlobal() {
  const params = new URLSearchParams({ apikey: NEWSDATA_KEY, q: newsdataGlobal, language: "en", category: "environment,science,health,business" });
  const res = await fetch(`https://newsdata.io/api/1/latest?${params}`);
  const data = await res.json();
  if (data.status !== "success") { console.error("\n[NewsData GLOBAL] Error:", data); return; }
  console.log(`\n[NewsData GLOBAL] ${data.results?.length ?? 0} articles`);
  data.results?.slice(0, 3).forEach(a => console.log(" -", a.title?.slice(0, 60)));
}

await testGNewsGlobal();
await testGNewsLocal();
await testNewsDataGlobal();
