/* app.js — FixMySheet Frontend
   - Health check: GET /
   - Dedupe: POST /dedupe (multipart/form-data) -> downloads XLSX
*/

const DEFAULT_API_BASE = "http://localhost:8000";

// ---------------------
// Small UI helpers
// ---------------------
function $(id) {
  return document.getElementById(id);
}

function getApiBase() {
  // Optional: if later you add an input with id="apiBase", this will use it
  const fromStorage = localStorage.getItem("FIXMYSHEET_API_BASE");
  if (fromStorage && fromStorage.trim()) return fromStorage.trim().replace(/\/+$/, "");

  const input = $("apiBase");
  if (input && input.value.trim()) return input.value.trim().replace(/\/+$/, "");

  return DEFAULT_API_BASE;
}

function setApiStatus(ok, text) {
  const el = $("apiStatus");
  if (!el) return;

  el.textContent = text;
  el.classList.remove("ok", "bad");
  el.classList.add(ok ? "ok" : "bad");
}

function setMsg(text, kind = "neutral") {
  const el = $("dedupeMsg");
  if (!el) return;

  el.textContent = text || "";
  el.classList.remove("ok", "error");

  if (kind === "ok") el.classList.add("ok");
  if (kind === "error") el.classList.add("error");
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

// Try to read JSON error (FastAPI JSONResponse), otherwise fallback to text
async function readErrorMessage(res) {
  let errText = `HTTP ${res.status}`;
  try {
    const data = await res.json();
    errText = data.error || JSON.stringify(data);
    return errText;
  } catch (_) {
    try {
      errText = await res.text();
      return errText || `HTTP ${res.status}`;
    } catch (_) {
      return `HTTP ${res.status}`;
    }
  }
}

// ---------------------
// Health check
// ---------------------
async function checkApi() {
  const API_BASE = getApiBase();

  try {
    const res = await fetch(`${API_BASE}/`, { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    setApiStatus(true, `API: OK (${data.status || "running"})`);
  } catch (err) {
    setApiStatus(false, `API: ERROR (${err.message})`);
  }
}

// ---------------------
// Dedupe UI toggling
// ---------------------
function syncModeUI() {
  const modeEl = $("dedupeMode");
  if (!modeEl) return;

  const mode = modeEl.value;
  const colFields = $("columnModeFields");
  const rowFields = $("rowModeFields");

  if (colFields) colFields.style.display = mode === "column" ? "block" : "none";
  if (rowFields) rowFields.style.display = mode === "row" ? "block" : "none";
}

// ---------------------
// Dedupe submit
// ---------------------
async function runDedupe() {
  const API_BASE = getApiBase();

  const fileInput = $("dedupeFile");
  const mode = ($("dedupeMode")?.value || "").trim();
  const keepPolicy = ($("keepPolicy")?.value || "mark_all").trim();

  const ignoreCase = !!$("ignoreCase")?.checked;
  const ignoreWhitespace = !!$("ignoreWhitespace")?.checked;

  const keyColumn = ($("keyColumn")?.value || "").trim();
  const ignoreColumns = ($("ignoreColumns")?.value || "").trim();

  // Basic validations
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    setMsg("Please choose a file first.", "error");
    return;
  }

  if (mode !== "column" && mode !== "row") {
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

  // Build multipart form
  const form = new FormData();
  form.append("file", fileInput.files[0]);
  form.append("mode", mode);
  form.append("keep_policy", keepPolicy);
  form.append("ignore_case", ignoreCase ? "true" : "false");
  form.append("ignore_whitespace", ignoreWhitespace ? "true" : "false");

  if (mode === "column") {
    form.append("key_column", keyColumn);
  } else {
    if (ignoreColumns) form.append("ignore_columns", ignoreColumns);
  }

  setMsg("Running dedupe…", "neutral");

  try {
    const res = await fetch(`${API_BASE}/dedupe`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const errText = await readErrorMessage(res);
      throw new Error(errText);
    }

    const blob = await res.blob();
    downloadBlob(blob, "FixMySheet_Dedupe.xlsx");

    setMsg("Done ✅ Download should start automatically.", "ok");
  } catch (err) {
    setMsg(`Error: ${err.message}`, "error");
  }
}

function persistApiBase() {
  const input = $("apiBase");
  if (!input) return;

  const value = input.value.trim();
  if (value) {
    localStorage.setItem("FIXMYSHEET_API_BASE", value.replace(/\/+$/, ""));
  }
}

// ---------------------
// Boot
// ---------------------
document.addEventListener("DOMContentLoaded", () => {
  const apiInput = $("apiBase");

  // Restore saved API base
  const saved = localStorage.getItem("FIXMYSHEET_API_BASE");
  if (apiInput && saved) apiInput.value = saved;

  apiInput?.addEventListener("change", () => {
    persistApiBase();
    checkApi();
  });

  $("checkApiBtn")?.addEventListener("click", checkApi);
  $("dedupeMode")?.addEventListener("change", syncModeUI);
  $("runDedupeBtn")?.addEventListener("click", runDedupe);

  syncModeUI();
  checkApi(); // auto check on load
});

});
