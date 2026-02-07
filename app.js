/* app.js — FixMySheet Frontend
   - Health check: GET /
   - Dedupe: POST /dedupe (multipart/form-data) -> downloads XLSX
*/

console.log("app.js loaded ✅");

// ✅ Use HTTPS Render by default (GitHub Pages is https; calling http gets blocked)
const DEFAULT_API_BASE = "https://fixmysheet-backend.onrender.com";
const STORAGE_KEY = "FIXMYSHEET_API_BASE";

// ---------------------
// Helpers
// ---------------------
function $(id) {
  return document.getElementById(id);
}

function normalizeApiBase(raw) {
  let v = (raw || "").trim();

  // if empty, fallback
  if (!v) return DEFAULT_API_BASE;

  // remove trailing slashes
  v = v.replace(/\/+$/, "");

  // If user omitted protocol, assume https
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;

  return v;
}

function getApiBase() {
  // Prefer input value if present (lets you paste and immediately click "Check API")
  const inputVal = $("apiBase")?.value;
  const saved = localStorage.getItem(STORAGE_KEY);
  return normalizeApiBase(inputVal || saved || DEFAULT_API_BASE);
}

function persistApiBase() {
  const input = $("apiBase");
  if (!input) return;
  const val = normalizeApiBase(input.value);
  localStorage.setItem(STORAGE_KEY, val);
  input.value = val; // write back normalized (no trailing slash, has protocol)
}

function setApiStatus(ok, text) {
  const el = $("apiStatus");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("ok", "bad");
  el.classList.add(ok ? "ok" : "bad");
}

function setMsg(text, kind) {
  const el = $("dedupeMsg");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("ok", "error");
  if (kind) el.classList.add(kind);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function readErrorMessage(res) {
  // try json {error: "..."} first, else text
  try {
    const data = await res.json();
    return data?.error || JSON.stringify(data);
  } catch (_) {
    try {
      return await res.text();
    } catch (_) {
      return `HTTP ${res.status}`;
    }
  }
}

// ---------------------
// API Health Check
// ---------------------
async function checkApi() {
  const API_BASE = getApiBase();
  setApiStatus(false, "API: checking…");

  try {
    const res = await fetch(`${API_BASE}/`, { method: "GET" });
    if (!res.ok) throw new Error(await readErrorMessage(res));
    const data = await res.json();
    setApiStatus(true, `API: OK`);
    console.log("Health:", data);
  } catch (err) {
    setApiStatus(false, `API: ERROR (${err.message})`);
    console.error("checkApi error:", err);
  }
}

// ---------------------
// UI Sync
// ---------------------
function syncModeUI() {
  const mode = $("dedupeMode")?.value;

  const col = $("columnModeFields");
  const row = $("rowModeFields");

  if (col) col.style.display = mode === "column" ? "block" : "none";
  if (row) row.style.display = mode === "row" ? "block" : "none";
}

// ---------------------
// Dedupe
// ---------------------
async function runDedupe() {
  const API_BASE = getApiBase();

  const file = $("dedupeFile")?.files?.[0];
  if (!file) {
    setMsg("Please select a file.", "error");
    return;
  }

  const mode = ($("dedupeMode")?.value || "").trim();
  const keepPolicy = ($("keepPolicy")?.value || "mark_all").trim();

  const ignoreCase = !!$("ignoreCase")?.checked;
  const ignoreWhitespace = !!$("ignoreWhitespace")?.checked;

  const keyColumn = ($("keyColumn")?.value || "").trim();
  const ignoreColumns = ($("ignoreColumns")?.value || "").trim();

  // Basic validations
  if (!["column", "row"].includes(mode)) {
    setMsg("Mode must be 'column' or 'row'.", "error");
    return;
  }
  if (!["mark_all", "keep_first", "keep_last"].includes(keepPolicy)) {
    setMsg("keep_policy must be mark_all, keep_first, or keep_last.", "error");
    return;
  }
  if (mode === "column" && !keyColumn) {
    setMsg("Key column is required for column mode.", "error");
    return;
  }

  const form = new FormData();
  form.append("file", file);
  form.append("mode", mode);
  form.append("keep_policy", keepPolicy);
  form.append("ignore_case", ignoreCase ? "true" : "false");
  form.append("ignore_whitespace", ignoreWhitespace ? "true" : "false");

  if (mode === "column") {
    form.append("key_column", keyColumn);
  } else if (mode === "row") {
    if (ignoreColumns) form.append("ignore_columns", ignoreColumns);
  }

  setMsg("Running dedupe…");

  try {
    const res = await fetch(`${API_BASE}/dedupe`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const msg = await readErrorMessage(res);
      throw new Error(msg);
    }

    const blob = await res.blob();
    downloadBlob(blob, "FixMySheet_Dedupe.xlsx");
    setMsg("Done ✅ Download should start automatically.", "ok");
  } catch (err) {
    console.error("runDedupe error:", err);
    setMsg(`Error: ${err.message}`, "error");
  }
}

// ---------------------
// Boot
// ---------------------
document.addEventListener("DOMContentLoaded", () => {
  const apiInput = $("apiBase");

  // Load saved API base into input
  if (apiInput) {
    const saved = localStorage.getItem(STORAGE_KEY);
    apiInput.value = saved || DEFAULT_API_BASE;

    // Save + normalize on change, then re-check
    apiInput.addEventListener("change", () => {
      persistApiBase();
      checkApi();
    });

    // Nice UX: press Enter to save + check
    apiInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        persistApiBase();
        checkApi();
        apiInput.blur();
      }
    });
  }

  $("checkApiBtn")?.addEventListener("click", () => {
    persistApiBase();
    checkApi();
  });

  $("dedupeMode")?.addEventListener("change", syncModeUI);
  $("runDedupeBtn")?.addEventListener("click", runDedupe);

  syncModeUI();
  checkApi();
});
