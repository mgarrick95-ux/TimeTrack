(function () {
  const STORAGE_KEY = "simple_time_tracker_entries_final_v2";

  const form = document.getElementById("time-form");
  const dateInput = document.getElementById("date");
  const startDisplay = document.getElementById("start-display");
  const endHour = document.getElementById("end-hour");
  const endMinute = document.getElementById("end-minute");
  const endAmpm = document.getElementById("end-ampm");
  const descriptionInput = document.getElementById("description");
  const entriesBody = document.getElementById("entries-body");
  const totalTimeEl = document.getElementById("total-time");
  const entryCountEl = document.getElementById("entry-count");
  const filterDateInput = document.getElementById("filter-date");
  const clearFilterBtn = document.getElementById("clear-filter");
  const clearAllBtn = document.getElementById("clear-all");

  let entries = [];
  let currentStartMinutes = 9 * 60; // 9:00 AM default

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

  function minutesToHM(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return { h, m };
  }

  function formatMinutesTo12h(minutes) {
    minutes = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60); // normalize
    let hour24 = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const ampm = hour24 >= 12 ? "PM" : "AM";
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;
    const minuteStr = String(minute).padStart(2, "0");
    return hour12 + ":" + minuteStr + " " + ampm;
  }

  function toMinutesFrom12h(hour12, minute, ampm) {
    let h = Number(hour12);
    let m = Number(minute);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    if (h < 1 || h > 12) return null;
    if (m < 0 || m > 59) return null;

    const upper = (ampm || "AM").toUpperCase();
    if (upper === "AM") {
      if (h === 12) h = 0;
    } else if (upper === "PM") {
      if (h !== 12) h += 12;
    }
    return h * 60 + m;
  }

  function computeDurationMinutes(startMinutes, endMinutes) {
    if (startMinutes == null || endMinutes == null) return 0;
    if (endMinutes <= startMinutes) return 0;
    return endMinutes - startMinutes;
  }

  function getDurationMinutes(entry) {
    if (typeof entry.durationMinutes === "number") {
      return entry.durationMinutes;
    }
    return computeDurationMinutes(entry.startMinutes, entry.endMinutes);
  }

  function updateStartDisplay() {
    startDisplay.textContent = formatMinutesTo12h(currentStartMinutes);
  }

  function setDefaultStartForDate(dateStr) {
    const dayEntries = entries
      .filter((e) => e.date === dateStr)
      .sort((a, b) => a.startMinutes - b.startMinutes);

    if (dayEntries.length === 0) {
      currentStartMinutes = 9 * 60; // 9:00 AM
    } else {
      const last = dayEntries[dayEntries.length - 1];
      currentStartMinutes = last.endMinutes;
    }
    updateStartDisplay();
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
        if (a.date === b.date) {
          return a.startMinutes - b.startMinutes;
        }
        return a.date.localeCompare(b.date);
      })
      .forEach((entry) => {
        const tr = document.createElement("tr");

        const durationMinutes = getDurationMinutes(entry);
        totalMinutes += durationMinutes;
        const { h, m } = minutesToHM(durationMinutes);

        tr.innerHTML = `
          <td>${entry.date}</td>
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
    const dateStr = dateInput.value;
    if (dateStr) {
      setDefaultStartForDate(dateStr);
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const date = dateInput.value;
    const hourVal = endHour.value;
    const minuteVal = endMinute.value;
    const ampmVal = endAmpm.value;
    const description = descriptionInput.value.trim();

    if (!date || !hourVal || minuteVal === "" || !ampmVal || !description) {
      alert("Please fill in date, end time, and what was done.");
      return;
    }

    const endMinutes = toMinutesFrom12h(hourVal, minuteVal, ampmVal);
    if (endMinutes == null) {
      alert("Please choose a valid end time.");
      return;
    }

    const durationMinutes = computeDurationMinutes(currentStartMinutes, endMinutes);
    if (durationMinutes <= 0) {
      alert("End time must be after the start time.");
      return;
    }

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      date,
      startMinutes: currentStartMinutes,
      endMinutes,
      durationMinutes,
      description
    };

    addEntry(entry);

    currentStartMinutes = endMinutes;
    updateStartDisplay();

    descriptionInput.value = "";
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
      const dateStr = dateInput.value;
      if (dateStr) {
        setDefaultStartForDate(dateStr);
      }
    }
  });

  dateInput.addEventListener("change", () => {
    const dateStr = dateInput.value;
    if (!dateStr) return;
    filterDateInput.value = dateStr;
    setDefaultStartForDate(dateStr);
    render();
  });

  const today = new Date().toISOString().slice(0, 10);
  dateInput.value = today;
  filterDateInput.value = today;

  loadEntries();
  setDefaultStartForDate(today);
  render();
})();