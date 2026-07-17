const state = {
  studentName: "",
  preScore: null,
  postScore: null,
  prediction: "",
  predictionReason: "",
  baseline: 0,
  isSensorRunning: false,
  currentSamples: [],
  currentMax: 0,
  modelA: null,
  modelB: null,
  analysis: {},
  reflection: {}
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const canvas = $("#motionCanvas");
const ctx = canvas.getContext("2d");
const maxSamples = 110;
let deferredPrompt = null;

function saveState() {
  localStorage.setItem("gemanusa_state", JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem("gemanusa_state");
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    Object.assign(state, saved);
    updateComparison();
    updateSummary();
  } catch (error) {
    console.warn("Gagal memuat data lokal:", error);
  }
}

function showPage(id) {
  $$(".page").forEach(page => page.classList.toggle("active", page.id === id));
  $$(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.target === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$("[data-target]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.target));
});

$$("[data-next]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.next));
});

function scoreForm(form, names) {
  let score = 0;
  names.forEach(name => {
    const checked = form.querySelector(`input[name="${name}"]:checked`);
    if (checked) score += Number(checked.value || 0);
  });
  return score;
}

$("#pretestForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  state.studentName = $("#studentName").value.trim() || "Tanpa nama";
  state.preScore = scoreForm(form, ["q1", "q2", "q3", "q4"]);
  const prediction = form.querySelector('input[name="predict"]:checked');
  state.prediction = prediction ? prediction.value : "";
  state.predictionReason = $("#predictionReason").value.trim();
  saveState();
  alert(`Pre-test tersimpan. Skor awal: ${state.preScore}/4`);
  showPage("experiment");
});

function drawGrid() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = "rgba(4, 13, 24, 1)";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255,255,255,.09)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= w; x += w / 10) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  for (let y = 0; y <= h; y += h / 6) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,.55)";
  ctx.font = "22px system-ui";
  ctx.fillText("Grafik getaran real-time", 24, 38);
}

function drawChart() {
  drawGrid();

  const samples = state.currentSamples;
  if (!samples.length) {
    ctx.fillStyle = "rgba(255,255,255,.48)";
    ctx.font = "20px system-ui";
    ctx.fillText("Tekan Mulai Sensor, lalu guncang papan secara perlahan.", 24, 78);
    return;
  }

  const w = canvas.width;
  const h = canvas.height;
  const pad = 50;
  const chartW = w - pad * 2;
  const chartH = h - pad * 2;
  const maxValue = Math.max(1, ...samples.map(s => s.value), state.currentMax);

  ctx.strokeStyle = "#42e6ff";
  ctx.lineWidth = 4;
  ctx.beginPath();

  samples.forEach((sample, index) => {
    const x = pad + (index / Math.max(1, maxSamples - 1)) * chartW;
    const y = h - pad - (sample.value / maxValue) * chartH;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  ctx.fillStyle = "#8dfcc7";
  ctx.font = "18px system-ui";
  ctx.fillText(`Maks: ${state.currentMax.toFixed(2)}`, pad, h - 18);
}

function updateMetrics(ax, ay, az, value) {
  $("#axVal").textContent = ax.toFixed(2);
  $("#ayVal").textContent = ay.toFixed(2);
  $("#azVal").textContent = az.toFixed(2);
  $("#resultantVal").textContent = value.toFixed(2);
  $("#maxVal").textContent = state.currentMax.toFixed(2);
  $("#sampleVal").textContent = String(state.currentSamples.length);
}

function processMotion(event) {
  const acc = event.accelerationIncludingGravity || event.acceleration;
  if (!acc) return;

  const ax = Number(acc.x || 0);
  const ay = Number(acc.y || 0);
  const az = Number(acc.z || 0);
  const resultantRaw = Math.sqrt(ax * ax + ay * ay + az * az);
  const corrected = Math.abs(resultantRaw - state.baseline);

  state.currentMax = Math.max(state.currentMax, corrected);
  state.currentSamples.push({
    t: Date.now(),
    ax,
    ay,
    az,
    value: corrected
  });

  if (state.currentSamples.length > maxSamples) {
    state.currentSamples.shift();
  }

  updateMetrics(ax, ay, az, corrected);
  drawChart();
}

async function startSensor() {
  try {
    if (typeof DeviceMotionEvent === "undefined") {
      alert("DeviceMotionEvent tidak tersedia di browser ini. Coba Chrome Android atau Safari iOS.");
      return;
    }

    if (typeof DeviceMotionEvent.requestPermission === "function") {
      const response = await DeviceMotionEvent.requestPermission();
      if (response !== "granted") {
        alert("Izin sensor tidak diberikan.");
        return;
      }
    }

    if (!state.isSensorRunning) {
      window.addEventListener("devicemotion", processMotion);
      state.isSensorRunning = true;
    }

    $("#sensorStatus").textContent = "Aktif";
    $("#sensorStatus").style.color = "#8dfcc7";
  } catch (error) {
    alert("Gagal mengaktifkan sensor: " + error.message);
  }
}

function calibrate() {
  if (!state.currentSamples.length) {
    state.baseline = 0;
    alert("Kalibrasi awal diset ke 0. Letakkan HP diam, lalu coba lagi setelah sensor membaca data.");
    return;
  }

  const last = state.currentSamples.slice(-12);
  const averageRaw = last.reduce((sum, s) => {
    const raw = Math.sqrt(s.ax * s.ax + s.ay * s.ay + s.az * s.az);
    return sum + raw;
  }, 0) / last.length;

  state.baseline = averageRaw;
  state.currentSamples = [];
  state.currentMax = 0;
  saveState();
  drawChart();
  alert("Kalibrasi selesai. Sekarang lakukan eksperimen getaran.");
}

function resetRun() {
  state.currentSamples = [];
  state.currentMax = 0;
  updateMetrics(0, 0, 0, 0);
  drawChart();
}

function currentRunSummary() {
  const samples = [...state.currentSamples];
  return {
    max: Number(state.currentMax.toFixed(4)),
    sampleCount: samples.length,
    savedAt: new Date().toLocaleString("id-ID"),
    samples
  };
}

function saveModel(model) {
  if (state.currentSamples.length < 8) {
    alert("Data masih terlalu sedikit. Guncang papan selama beberapa detik terlebih dahulu.");
    return;
  }

  if (model === "A") {
    state.modelA = currentRunSummary();
    alert(`Model A tersimpan. Getaran maksimum: ${state.modelA.max}`);
  } else {
    state.modelB = currentRunSummary();
    alert(`Model B tersimpan. Getaran maksimum: ${state.modelB.max}`);
  }

  saveState();
  updateComparison();
}

function updateComparison() {
  $("#modelAMax").textContent = state.modelA ? state.modelA.max.toFixed(2) : "Belum ada data";
  $("#modelBMax").textContent = state.modelB ? state.modelB.max.toFixed(2) : "Belum ada data";

  const mentor = $("#mentorText");
  if (!state.modelA || !state.modelB) {
    mentor.textContent = "Simpan data Model A dan Model B terlebih dahulu agar NusaMentor dapat memberi umpan balik.";
    return;
  }

  const a = state.modelA.max;
  const b = state.modelB.max;
  const diff = Math.abs(a - b).toFixed(2);

  if (b < a) {
    mentor.textContent = `Model B menunjukkan getaran maksimum lebih kecil sebesar ${diff}. Ini mendukung gagasan bahwa penguat diagonal dapat membantu struktur lebih stabil terhadap gaya samping.`;
  } else if (a < b) {
    mentor.textContent = `Model A justru menunjukkan getaran lebih kecil sebesar ${diff}. Hasil ini perlu dianalisis: apakah ukuran model, posisi HP, beban, atau cara mengguncang sudah sama?`;
  } else {
    mentor.textContent = "Kedua model menunjukkan getaran maksimum yang hampir sama. Coba ulangi eksperimen dengan guncangan yang lebih konsisten.";
  }
}

$("#startSensorBtn").addEventListener("click", startSensor);
$("#calibrateBtn").addEventListener("click", calibrate);
$("#resetRunBtn").addEventListener("click", resetRun);
$("#saveABtn").addEventListener("click", () => saveModel("A"));
$("#saveBBtn").addEventListener("click", () => saveModel("B"));

$("#analysisForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.analysis = {
    stableModel: $("#stableModel").value,
    analysisAnswer: $("#analysisAnswer").value.trim(),
    errorSource: $("#errorSource").value.trim()
  };
  saveState();
  alert("Analisis tersimpan.");
  showPage("reflection");
});

$("#postForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  state.postScore = scoreForm(form, ["p1", "p2", "p3", "p4"]);
  state.reflection = {
    safety: $("#reflectionSafety").value.trim(),
    honesty: $("#reflectionHonesty").value.trim(),
    improve: $("#reflectionImprove").value.trim()
  };
  saveState();
  updateSummary();
  alert(`Refleksi tersimpan. Skor akhir: ${state.postScore}/4`);
});

function updateSummary() {
  const summary = $("#summaryText");
  const improvement = (state.preScore !== null && state.postScore !== null)
    ? `${state.preScore}/4 → ${state.postScore}/4`
    : "Belum lengkap";

  summary.innerHTML = `
    <p><strong>Nama/Kelompok:</strong> ${escapeHtml(state.studentName || "Belum diisi")}</p>
    <p><strong>Skor pre-test → post-test:</strong> ${improvement}</p>
    <p><strong>Prediksi:</strong> ${escapeHtml(state.prediction || "Belum diisi")}</p>
    <p><strong>Model A maksimum:</strong> ${state.modelA ? state.modelA.max.toFixed(2) : "Belum ada data"}</p>
    <p><strong>Model B maksimum:</strong> ${state.modelB ? state.modelB.max.toFixed(2) : "Belum ada data"}</p>
    <p><strong>Kesimpulan siswa:</strong> ${escapeHtml(state.analysis.stableModel || "Belum diisi")}</p>
    <p><strong>Refleksi keselamatan:</strong> ${escapeHtml(state.reflection.safety || "Belum diisi")}</p>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function rowsToCsv(rows) {
  return rows.map(row => row.map(cell => {
    const value = String(cell ?? "");
    return `"${value.replaceAll('"', '""')}"`;
  }).join(",")).join("\n");
}

function exportCsv() {
  const rows = [
    ["Field", "Value"],
    ["Nama/Kelompok", state.studentName],
    ["Skor Pre-test", state.preScore],
    ["Skor Post-test", state.postScore],
    ["Prediksi", state.prediction],
    ["Alasan Prediksi", state.predictionReason],
    ["Model A Maks", state.modelA?.max ?? ""],
    ["Model B Maks", state.modelB?.max ?? ""],
    ["Kesimpulan Stabil", state.analysis.stableModel ?? ""],
    ["Analisis", state.analysis.analysisAnswer ?? ""],
    ["Sumber Kesalahan", state.analysis.errorSource ?? ""],
    ["Refleksi Keselamatan", state.reflection.safety ?? ""],
    ["Refleksi Kejujuran", state.reflection.honesty ?? ""],
    ["Ide Perbaikan", state.reflection.improve ?? ""]
  ];

  const csv = rowsToCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gemanusa-${(state.studentName || "data").replace(/\s+/g, "-").toLowerCase()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

$("#exportCsvBtn").addEventListener("click", exportCsv);
$("#printReportBtn").addEventListener("click", () => {
  updateSummary();
  window.print();
});
$("#clearDataBtn").addEventListener("click", () => {
  if (!confirm("Reset semua data lokal GemaNusa?")) return;
  localStorage.removeItem("gemanusa_state");
  location.reload();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  const installBtn = $("#installBtn");
  installBtn.hidden = false;
  installBtn.addEventListener("click", async () => {
    installBtn.hidden = true;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  }, { once: true });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(console.warn);
  });
}

loadState();
drawChart();
updateSummary();
