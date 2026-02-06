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

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("checkApiBtn").addEventListener("click", checkApi);
  checkApi(); // auto-check on load
});
