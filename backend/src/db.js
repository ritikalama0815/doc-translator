/**
 * @fileoverview Local JSON stores for prescriptions, reminders, uploads, and API keys.
 * Files live under `backend/data`; uploaded slip photos live under `backend/uploads`.
 * @module db
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Directory for JSON data files (`prescriptions.json`, `reminders.json`, `config.json`). */
export const DATA_DIR = path.join(__dirname, "..", "data");

/** Directory for prescription photo uploads served at `/uploads`. */
export const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

for (const dir of [DATA_DIR, UPLOAD_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * @param {string} name Store name without the `.json` suffix.
 * @returns {string} Absolute path to that store.
 */
function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

/**
 * Read a JSON store, returning a clone of `fallback` if the file is missing or invalid.
 * @param {string} name Store name without `.json` (for example `"reminders"`).
 * @param {*} fallback Value to use when the file cannot be read.
 * @returns {*} Parsed JSON, or a structured clone of `fallback`.
 */
export function readJson(name, fallback) {
  const p = filePath(name);
  if (!fs.existsSync(p)) return structuredClone(fallback);
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return structuredClone(fallback);
  }
}

/**
 * Overwrite a JSON store on disk.
 * @param {string} name Store name without `.json`.
 * @param {*} value Serializable value to persist.
 * @returns {void}
 */
export function writeJson(name, value) {
  const p = filePath(name);
  fs.writeFileSync(p, JSON.stringify(value, null, 2));
}

/**
 * Load saved settings. Missing fields fall back to empty keys and OCR `"auto"`.
 * @returns {{googleVisionKey: string, anthropicKey: string, openaiKey: string, llmModel: string, ocrEngine: string, notifyEnabled: boolean}}
 */
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

/**
 * Merge a patch into the saved config and write it back.
 * @param {object} patch Partial config fields to update.
 * @returns {object} The config after the merge.
 */
export function saveConfig(patch) {
  const next = { ...getConfig(), ...patch };
  writeJson("config", next);
  return next;
}

/**
 * Prefer a process env var; otherwise use the matching field from `config.json`.
 * @param {string} envName Environment variable name, e.g. `"OPENAI_API_KEY"`.
 * @param {string} configKey Key on the config object, e.g. `"openaiKey"`.
 * @returns {string} Trimmed secret, or `""` if neither source has a value.
 */
export function envOrConfig(envName, configKey) {
  const env = process.env[envName];
  if (env && env.trim()) return env.trim();
  const cfg = getConfig();
  return (cfg[configKey] || "").trim();
}
