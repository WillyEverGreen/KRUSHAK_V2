import fs from "fs";

async function test() {
  const fileData = fs.readFileSync("test_image.jpg");
  const base64 = fileData.toString("base64");
  
  const payload = {
    imageBase64: `data:image/jpeg;base64,${base64}`,
    mimeType: "image/jpeg"
  };

  const res = await fetch("http://localhost:5000/diagnose/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Response:", JSON.stringify(data, null, 2));
}

test();
