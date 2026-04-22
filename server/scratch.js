import dotenv from "dotenv";
dotenv.config();

const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;

async function testGNews() {
  const query = "agriculture OR farming OR crops OR harvest OR irrigation OR kisan OR wheat OR rice OR fertilizer OR pesticide OR mandi OR horticulture OR seeds OR dairy OR livestock OR \"food security\" OR \"organic farming\"";
  const params = new URLSearchParams({
    q: query,
    lang: "en",
    max: "10",
    token: GNEWS_API_KEY,
    country: "in",
  });
  
  const res = await fetch(`https://gnews.io/api/v4/search?${params.toString()}`);
  const data = await res.json();
  console.log("GNews:", data.articles ? data.articles.length : data);
}

async function testNewsData() {
  const params = new URLSearchParams({
    apikey: NEWSDATA_API_KEY,
    q: "agriculture OR farming OR crops OR harvest OR irrigation",
    language: "en",
    country: "in",
  });
  
  const res = await fetch(`https://newsdata.io/api/1/latest?${params.toString()}`);
  const data = await res.json();
  console.log("NewsData:", data.results ? data.results.length : data);
}

testGNews();
testNewsData();
