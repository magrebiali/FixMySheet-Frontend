console.log("FixMySheet frontend loaded");
const API_BASE = "http://localhost:8000";

function setApiStatus(ok, text) {
  const el = document.getElementById("apiStatus");
  el.textContent = text;
  el.classList.remove("ok", "bad");
  el.classList.add(ok ? "ok" : "bad");
}

async function checkApi() {
  try {
    const res = await fetch(`${API_BASE}/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setApiStatus(true, `API: OK (${data.status || "running"})`);
  } catch (err) {
    setApiStatus(false, `API: ERROR (${err.message})`);
  }
}

function setMsg(text) {
  document.getElementById("dedupeMsg").textContent = text;
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

async function runDedupe() {
  const fileInput = document.getElementById("dedupeFile");
  const mode = document.getElementById("dedupeMode").value;
  const keyColumn = document.getElementById("keyColumn").value.trim();

  if (!fileInput.files || fileInput.files.length === 0) {
    setMsg("Please choose a file first.");
    return;
  }

  if (mode === "column" && !keyColumn) {
    setMsg("Key column is required for column mode.");
    return;
  }

  const form = new FormData();
  form.append("file", fileInput.files[0]);
  form.append("mode", mode);

  if (mode === "column") form.append("key_column", keyColumn);

  setMsg("Running dedupe…");

  try {
    const res = await fetch(`${API_BASE}/dedupe`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      // try to read JSON error
      let errText = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        errText = data.error || JSON.stringify(data);
      } catch {}
      throw new Error(errText);
    }

    const blob = await res.blob();
    downloadBlob(blob, "FixMySheet_Dedupe.xlsx");
    setMsg("Done! Download should start automatically.");
  } catch (err) {
    setMsg(`Error: ${err.message}`);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // existing checkApi wiring...

  document.getElementById("runDedupeBtn").addEventListener("click", runDedupe);
});

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("checkApiBtn").addEventListener("click", checkApi);
  checkApi(); // auto-check on load
});
