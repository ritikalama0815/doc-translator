import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createWorker } from "tesseract.js";
import { envOrConfig } from "../db.js";

async function preprocess(imagePath) {
  const out = imagePath.replace(/(\.\w+)$/, "-prep$1");
  await sharp(imagePath)
    .rotate()
    .greyscale()
    .normalize()
    .sharpen()
    .resize({ width: 1800, withoutEnlargement: true })
    .png()
    .toFile(out);
  return out;
}

async function tesseractOcr(imagePath) {
  const prepared = await preprocess(imagePath);
  const worker = await createWorker("eng");
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: "6",
    });
    const { data } = await worker.recognize(prepared);
    return {
      engine: "tesseract",
      text: (data.text || "").trim(),
      confidence: Number(data.confidence || 0),
    };
  } finally {
    await worker.terminate();
    if (prepared !== imagePath && fs.existsSync(prepared)) {
      try {
        fs.unlinkSync(prepared);
      } catch {
        /* ignore */
      }
    }
  }
}

async function googleVisionOcr(imagePath) {
  const key = envOrConfig("GOOGLE_VISION_API_KEY", "googleVisionKey");
  if (!key) return null;
  const content = fs.readFileSync(imagePath).toString("base64");
  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Vision failed: ${res.status} ${err.slice(0, 200)}`);
  }
  const json = await res.json();
  const annotation = json.responses?.[0]?.fullTextAnnotation;
  return {
    engine: "google-vision",
    text: (annotation?.text || "").trim(),
    confidence: 90,
  };
}

export async function extractText(imagePath, preferred = "auto") {
  const engine = preferred || "auto";
  const hasVision = Boolean(envOrConfig("GOOGLE_VISION_API_KEY", "googleVisionKey"));

  if (engine === "google" || (engine === "auto" && hasVision)) {
    try {
      const vision = await googleVisionOcr(imagePath);
      if (vision?.text) return vision;
    } catch (err) {
      if (engine === "google") throw err;
    }
  }

  return tesseractOcr(imagePath);
}

export function publicImageUrl(filename) {
  return `/uploads/${path.basename(filename)}`;
}
