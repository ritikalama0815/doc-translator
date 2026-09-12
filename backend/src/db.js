import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.join(__dirname, "..", "data");
export const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

for (const dir of [DATA_DIR, UPLOAD_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

export function readJson(name, fallback) {
  const p = filePath(name);
  if (!fs.existsSync(p)) return structuredClone(fallback);
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return structuredClone(fallback);
  }
}

export function writeJson(name, value) {
  const p = filePath(name);
  fs.writeFileSync(p, JSON.stringify(value, null, 2));
}

export function getConfig() {
  return readJson("config", {
    googleVisionKey: "",
    anthropicKey: "",
    openaiKey: "",
    llmModel: "",
    ocrEngine: "auto",
    notifyEnabled: true,
  });
}

export function saveConfig(patch) {
  const next = { ...getConfig(), ...patch };
  writeJson("config", next);
  return next;
}

export function envOrConfig(envName, configKey) {
  const env = process.env[envName];
  if (env && env.trim()) return env.trim();
  const cfg = getConfig();
  return (cfg[configKey] || "").trim();
}
