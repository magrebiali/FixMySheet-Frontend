/* app.js — FixMySheet Frontend
   - Health check: GET /
   - Dedupe: POST /dedupe (multipart/form-data) -> downloads XLSX
*/

const API_BASE = "http://localhost:8000"; // change later to your deployed API URL

// ---------------------
// Small UI helpers
// ---------------------
function $(id) {
  return document.getElementById(id);
}

function setApiStatus(ok, text) {
  const el = $("apiStatus");
  if (!el) return;
  el.textContent = text;

  // Optional classes if your CSS supports .ok/.bad
  el.classList.remove("ok", "bad");
  el.classList.add(ok ? "ok" : "bad");
}

function setMsg(text) {
  const el = $("dedupeMsg");
  if (!el) return;
  el.textContent = text;
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

// ---------------------
// Health check
// ---------------------
async function checkApi() {
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
  const fileInput = $("dedupeFile");
  const mode = ($("dedupeMode")?.value || "").trim();
  const keepPolicy = ($("keepPolicy")?.value || "mark_all").trim();

  const ignoreCase = !!$("ignoreCase")?.checked;
  const ignoreWhitespace = !!$("ignoreWhitespace")?.checked;

  const keyColumn = ($("keyColumn")?.value || "").trim();
  const ignoreColumns = ($("ignoreColumns")?.value || "").trim();

  // Basic validations
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    setMsg("Please choose a file first.");
    return;
  }

  if (mode !== "column" && mode !== "row") {
    setMsg("Mode must be 'column' or 'row'.");
    return;
  }

  if (!["mark_all", "keep_first", "keep_last"].includes(keepPolicy)) {
    setMsg("keep_policy must be mark_all, keep_first, or keep_last.");
    return;
  }

  if (mode === "column" && !keyColumn) {
    setMsg("Key column is required for column mode.");
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
      // Prefer JSON error
      let errText = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        errText = data.error || JSON.stringify(data);
      } catch (_) {
        // If not JSON, try text
        try {
          errText = await res.text();
        } catch (_) {}
      }
      throw new Error(errText);
    }

    const blob = await res.blob();

    // Backend returns filename FixMySheet_Dedupe.xlsx
    // but we force a friendly name anyway.
    downloadBlob(blob, "FixMySheet_Dedupe.xlsx");

    setMsg("Done ✅ Download should start automatically.");
  } catch (err) {
    setMsg(`Error: ${err.message}`);
  }
}

// ---------------------
// Boot
// ---------------------
document.addEventListener("DOMContentLoaded", () => {
  // Health check wiring
  $("checkApiBtn")?.addEventListener("click", checkApi);
  checkApi(); // auto check on load

  // Mode toggle wiring
  $("dedupeMode")?.addEventListener("change", syncModeUI);
  syncModeUI();

  // Dedupe button wiring
  $("runDedupeBtn")?.addEventListener("click", runDedupe);
});
