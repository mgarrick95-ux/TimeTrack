(function () {
  const STORAGE_KEY = "simple_time_tracker_entries_v1";

  const form = document.getElementById("time-form");
  const dateInput = document.getElementById("date");
  const startInput = document.getElementById("start-time");
  const endInput = document.getElementById("end-time");
  const descriptionInput = document.getElementById("description");
  const entriesBody = document.getElementById("entries-body");
  const totalTimeEl = document.getElementById("total-time");
  const entryCountEl = document.getElementById("entry-count");
  const filterDateInput = document.getElementById("filter-date");
  const clearFilterBtn = document.getElementById("clear-filter");
  const clearAllBtn = document.getElementById("clear-all");

  let entries = [];

  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      entries = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Failed to load entries", e);
      entries = [];
    }
  }

  function saveEntries() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.error("Failed to save entries", e);
    }
  }

  function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  }

  function minutesToHM(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return { h, m };
  }

  function computeDuration(start, end) {
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    if (endMin >= startMin) {
      return endMin - startMin;
    }
    // handle crossing midnight
    return endMin + 24 * 60 - startMin;
  }

  function render() {
    const filterDate = filterDateInput.value || null;
    const filtered = filterDate
      ? entries.filter((e) => e.date === filterDate)
      : entries;

    entriesBody.innerHTML = "";

    let totalMinutes = 0;

    filtered
      .slice()
      .sort((a, b) => {
        // sort by date first, then start time
        if (a.date === b.date) {
          return a.start.localeCompare(b.start);
        }
        return a.date.localeCompare(b.date);
      })
      .forEach((entry) => {
        const tr = document.createElement("tr");

        const durationMinutes = computeDuration(entry.start, entry.end);
        totalMinutes += durationMinutes;
        const { h, m } = minutesToHM(durationMinutes);

        tr.innerHTML = `
          <td>${entry.date}</td>
          <td>${entry.start}</td>
          <td>${entry.end}</td>
          <td>${h}h ${String(m).padStart(2, "0")}m</td>
          <td>${entry.description.replace(/\n/g, "<br>")}</td>
          <td><button type="button" class="secondary small delete-btn" data-id="${entry.id}">Delete</button></td>
        `;

        entriesBody.appendChild(tr);
      });

    const total = minutesToHM(totalMinutes);
    totalTimeEl.textContent = `Total: ${total.h}h ${total.m}m`;
    entryCountEl.textContent =
      filtered.length === 1 ? "1 entry" : `${filtered.length} entries`;
  }

  function addEntry(entry) {
    entries.push(entry);
    saveEntries();
    render();
  }

  function deleteEntry(id) {
    entries = entries.filter((e) => e.id !== id);
    saveEntries();
    render();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const date = dateInput.value;
    const start = startInput.value;
    const end = endInput.value;
    const description = descriptionInput.value.trim();

    if (!date || !start || !end || !description) {
      alert("Please fill in all fields.");
      return;
    }

    const durationMinutes = computeDuration(start, end);
    if (durationMinutes <= 0) {
      alert("End time must be after start time (or cross midnight).");
      return;
    }

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      date,
      start,
      end,
      description
    };

    addEntry(entry);
    descriptionInput.value = "";
    // keep date and times, they often repeat
  });

  entriesBody.addEventListener("click", (e) => {
    const btn = e.target.closest(".delete-btn");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    if (!id) return;
    if (confirm("Delete this entry?")) {
      deleteEntry(id);
    }
  });

  filterDateInput.addEventListener("change", render);
  clearFilterBtn.addEventListener("click", () => {
    filterDateInput.value = "";
    render();
  });

  clearAllBtn.addEventListener("click", () => {
    if (!entries.length) return;
    if (confirm("Clear ALL saved entries?")) {
      entries = [];
      saveEntries();
      render();
    }
  });

  // Default date to today
  const today = new Date().toISOString().slice(0, 10);
  dateInput.value = today;
  filterDateInput.value = today;

  loadEntries();
  render();
})();