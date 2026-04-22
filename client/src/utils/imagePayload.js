function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dataUrlToImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export async function buildAnalysisPayload(file) {
  const originalDataUrl = await fileToDataUrl(file);

  // Convert to JPEG so the model receives a consistent, well-supported format.
  const img = await dataUrlToImage(originalDataUrl);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      imageBase64: originalDataUrl,
      mimeType: file.type || "image/jpeg",
    };
  }

  ctx.drawImage(img, 0, 0, width, height);
  const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.9);

  return {
    imageBase64: jpegDataUrl,
    mimeType: "image/jpeg",
  };
}
