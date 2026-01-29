const form = document.getElementById('predictForm');
const drug1El = document.getElementById('drug1');
const drug2El = document.getElementById('drug2');
const backendUrlEl = document.getElementById('backendUrl');
const predictBtn = document.getElementById('predictBtn');
const clearBtn = document.getElementById('clearBtn');
const resultCard = document.getElementById('resultCard');
const pairText = document.getElementById('pairText');
const queriedAt = document.getElementById('queriedAt');
const interactionLabel = document.getElementById('interactionLabel');
const interactionClasses = document.getElementById('interactionClasses');
const severityLabel = document.getElementById('severityLabel');
const severityBadge = document.getElementById('severityBadge');
const severityClasses = document.getElementById('severityClasses');
const historyList = document.getElementById('historyList');
const emptyHistory = document.getElementById('emptyHistory');
const errorBox = document.getElementById('errorBox');

let history = [];

function nowStr() {
  return new Date().toLocaleString();
}

function clearResult() {
  resultCard.classList.add('hidden');
  interactionClasses.innerHTML = '';
  severityClasses.innerHTML = '';
  errorBox.classList.add('hidden');
}

function getSeverityClass(label) {
  const lower = label.toLowerCase();
  if (lower.includes('major') || lower.includes('high')) return 'severity-high';
  if (lower.includes('moderate') || lower.includes('medium')) return 'severity-medium';
  return 'severity-low';
}

function renderProbRows(container, classes, scores, limit = 2) {
  container.innerHTML = "";
  const items = classes.map((c, i) => ({ c, score: scores[i] || 0 }));
  items.sort((a, b) => b.score - a.score);
  const topItems = items.slice(0, limit);

  topItems.forEach((it, idx) => {
    const div = document.createElement("div");
    div.className = "space-y-2";
    div.style.animationDelay = `${idx * 0.1}s`;
    div.innerHTML = `
      <div class="flex justify-between items-center">
        <div class="text-sm font-medium text-gray-700">${it.c}</div>
        <div class="text-sm font-bold text-purple-600">${(it.score * 100).toFixed(1)}%</div>
      </div>
      <div class="bg-gray-200 rounded-full overflow-hidden h-2">
        <div class="prob-bar" style="width:0%;" data-width="${(it.score * 100).toFixed(1)}"></div>
      </div>
    `;
    container.appendChild(div);

    // Animate bar
    setTimeout(() => {
      const bar = div.querySelector('.prob-bar');
      bar.style.width = bar.dataset.width + '%';
    }, 50);
  });
}

function showError(msg) {
  errorBox.classList.remove('hidden');
  errorBox.innerHTML = `<strong>Error:</strong> ${msg}`;
}

function toggleBusy(isBusy) {
  predictBtn.disabled = isBusy;
  predictBtn.innerHTML = isBusy ? '⏳ Analyzing...' : '🔍 Analyze Interaction';
}

function addToHistory(drug1, drug2, interaction, severity) {
  history.unshift({ drug1, drug2, interaction, severity, time: nowStr() });
  if (history.length > 10) history.pop();
  renderHistory();
}

function renderHistory() {
  if (history.length === 0) {
    emptyHistory.classList.remove('hidden');
    historyList.innerHTML = '';
    return;
  }

  emptyHistory.classList.add('hidden');
  historyList.innerHTML = history.map((h, i) => `
    <div class="history-card bg-white rounded-xl p-4 border border-gray-200 hover:border-purple-300" 
         onclick="loadFromHistory(${i})">
      <div class="flex justify-between items-start">
        <div>
          <div class="font-semibold text-gray-800">${h.drug1} + ${h.drug2}</div>
          <div class="text-sm text-gray-500 mt-1">
            <span class="inline-block mr-3">⚡ ${h.interaction}</span>
            <span class="inline-block">⚠️ ${h.severity}</span>
          </div>
        </div>
        <div class="text-xs text-gray-400">${h.time}</div>
      </div>
    </div>
  `).join('');
}

window.loadFromHistory = function (index) {
  const h = history[index];
  drug1El.value = h.drug1;
  drug2El.value = h.drug2;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  clearResult();

  const d1 = drug1El.value.trim();
  const d2 = drug2El.value.trim();
  const backend = backendUrlEl.value.trim();

  if (!d1 || !d2) {
    return showError("Please enter both drug names.");
  }

  toggleBusy(true);

  try {
    const res = await fetch(backend, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drug1: d1, drug2: d2 })
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Server error occurred");
      toggleBusy(false);
      return;
    }

    pairText.textContent = `${d1} + ${d2}`;
    queriedAt.textContent = nowStr();

    interactionLabel.textContent = data.interaction.label;
    renderProbRows(interactionClasses, data.interaction.classes, data.interaction.scores, 2);

    severityLabel.textContent = data.severity.label;
    const sevClass = getSeverityClass(data.severity.label);
    severityBadge.innerHTML = `<span class="severity-badge ${sevClass}">${data.severity.label}</span>`;
    renderProbRows(severityClasses, data.severity.classes, data.severity.scores, 2);

    resultCard.classList.remove("hidden");

    addToHistory(d1, d2, data.interaction.label, data.severity.label);

  } catch (e) {
    showError("Network error: " + e.message);
  }

  toggleBusy(false);
});

clearBtn.addEventListener('click', () => {
  drug1El.value = "";
  drug2El.value = "";
  clearResult();
});

document.getElementById('downloadHistory').addEventListener('click', () => {
  if (history.length === 0) {
    alert('No history to download!');
    return;
  }

  let csv = 'Drug 1,Drug 2,Interaction,Severity,Time\n';
  history.forEach(h => {
    csv += `"${h.drug1}","${h.drug2}","${h.interaction}","${h.severity}","${h.time}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ddi-history.csv';
  a.click();
  URL.revokeObjectURL(url);
});

renderHistory();
