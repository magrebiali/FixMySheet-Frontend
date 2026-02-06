/* app.js — FixMySheet Frontend */

console.log("app.js loaded ✅");

const DEFAULT_API_BASE = "http://localhost:8000";

// ---------------------
// Helpers
// ---------------------
function $(id) {
  return document.getElementById(id);
}

function getApiBase() {
  return localStorage.getItem("FIXMYSHEET_API_BASE") || DEFAULT_API_BASE;
}

function setApiStatus(ok, text) {
  const el = $("apiStatus");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("ok", "bad");
  el.classList.add(ok ? "ok" : "bad");
}

function setMsg(text) {
  const el = $("dedupeMsg");
  if (el) el.textContent = text;
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
// API Health Check
// ---------------------
async function checkApi() {
  try {
    const res = await fetch(`${getApiBase()}/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setApiStatus(true, `API: OK (${data.status || "running"})`);
  } catch (err) {
    setApiStatus(false, `API: ERROR`);
    console.error(err);
  }
}

// ---------------------
// UI Sync
// ---------------------
function syncModeUI() {
  const mode = $("dedupeMode")?.value;
  if ($("columnModeFields"))
    $("columnModeFields").style.display = mode === "column" ? "block" : "none";
  if ($("rowModeFields"))
    $("rowModeFields").style.display = mode === "row" ? "block" : "none";
}

// ---------------------
// Dedupe
// ---------------------
async function runDedupe() {
  const file = $("dedupeFile")?.files?.[0];
  if (!file) {
    setMsg("Please select a file.");
    return;
  }

  const form = new FormData();
  form.append("file", file);
  form.append("mode", $("dedupeMode").value);
  form.append("keep_policy", $("keepPolicy").value);
  form.append("ignore_case", $("ignoreCase").checked);
  form.append("ignore_whitespace", $("ignoreWhitespace").checked);

  if ($("dedupeMode").value === "column") {
    form.append("key_column", $("keyColumn").value);
  } else {
    form.append("ignore_columns", $("ignoreColumns").value);
  }

  setMsg("Running dedupe…");

  try {
    const res = await fetch(`${getApiBase()}/dedupe`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error("Dedupe failed");
    const blob = await res.blob();
    downloadBlob(blob, "FixMySheet_Dedupe.xlsx");
    setMsg("Done ✅");
  } catch (err) {
    console.error(err);
    setMsg("Error running dedupe.");
  }
}

// ---------------------
// Boot
// ---------------------
document.addEventListener("DOMContentLoaded", () => {
  const apiInput = $("apiBase");
  if (apiInput) {
    const saved = localStorage.getItem("FIXMYSHEET_API_BASE");
    if (saved) apiInput.value = saved;

    apiInput.addEventListener("change", () => {
      localStorage.setItem("FIXMYSHEET_API_BASE", apiInput.value.trim());
      checkApi();
    });
  }

  $("checkApiBtn")?.addEventListener("click", checkApi);
  $("dedupeMode")?.addEventListener("change", syncModeUI);
  $("runDedupeBtn")?.addEventListener("click", runDedupe);

  syncModeUI();
  checkApi();
});
