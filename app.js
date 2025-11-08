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

  // Modal elements
  const modal = document.getElementById("entry-modal");
  const modalBackdrop = document.getElementById("modal-backdrop");
  const modalDate = document.getElementById("modal-date");
  const modalTime = document.getElementById("modal-time");
  const modalDuration = document.getElementById("modal-duration");
  const modalDescription = document.getElementById("modal-description");
  const modalEndHour = document.getElementById("modal-end-hour");
  const modalEndMinute = document.getElementById("modal-end-minute");
  const modalEndAmpm = document.getElementById("modal-end-ampm");
  const modalCloseBtn = document.getElementById("modal-close");
  const modalDeleteBtn = document.getElementById("modal-delete");
  const modalSaveBtn = document.getElementById("modal-save");

  let entries = [];
  let currentStartMinutes = 9 * 60; // 9:00 AM default
  let activeEntryId = null;

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
    minutes = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60);
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
        tr.dataset.id = entry.id;

        const durationMinutes = getDurationMinutes(entry);
        totalMinutes += durationMinutes;
        const { h, m } = minutesToHM(durationMinutes);

        tr.innerHTML = `
          <td>${entry.date}</td>
          <td>${h}h ${String(m).padStart(2, "0")}m</td>
          <td>${entry.description.replace(/\n/g, "<br>")}</td>
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

  // Modal helpers
  function openEntryModal(entryId) {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    activeEntryId = entryId;

    modalDate.textContent = entry.date;
    const startStr = formatMinutesTo12h(entry.startMinutes);
    const endStr = formatMinutesTo12h(entry.endMinutes);
    modalTime.textContent = `${startStr} — ${endStr}`;

    const dur = minutesToHM(getDurationMinutes(entry));
    modalDuration.textContent = `Duration: ${dur.h}h ${String(dur.m).padStart(
      2,
      "0"
    )}m`;

    modalDescription.value = entry.description;

    const endMinutes = entry.endMinutes;
    let hour24 = Math.floor(endMinutes / 60);
    const minute = endMinutes % 60;
    const ampm = hour24 >= 12 ? "PM" : "AM";
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;

    modalEndHour.value = String(hour12);
    modalEndMinute.value = String(minute);
    modalEndAmpm.value = ampm;

    modal.classList.remove("hidden");
  }

  function closeEntryModal() {
    activeEntryId = null;
    modal.classList.add("hidden");
  }

  // Form submit (add entry)
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

    const durationMinutes = computeDurationMinutes(
      currentStartMinutes,
      endMinutes
    );
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
      description,
    };

    addEntry(entry);

    currentStartMinutes = endMinutes;
    updateStartDisplay();

    descriptionInput.value = "";
  });

  // Click row -> open modal
  entriesBody.addEventListener("click", (e) => {
    const row = e.target.closest("tr");
    if (!row || !row.dataset.id) return;
    openEntryModal(row.dataset.id);
  });

  // Modal buttons
  modalCloseBtn.addEventListener("click", closeEntryModal);
  modalBackdrop.addEventListener("click", closeEntryModal);

  modalDeleteBtn.addEventListener("click", () => {
    if (!activeEntryId) return;
    if (confirm("Delete this entry?")) {
      deleteEntry(activeEntryId);
      closeEntryModal();
    }
  });

  modalSaveBtn.addEventListener("click", () => {
    if (!activeEntryId) return;
    const idx = entries.findIndex((e) => e.id === activeEntryId);
    if (idx === -1) return;

    const entry = entries[idx];

    const newDesc = modalDescription.value.trim();
    const h = modalEndHour.value;
    const m = modalEndMinute.value;
    const ap = modalEndAmpm.value;

    const newEndMinutes = toMinutesFrom12h(h, m, ap);
    if (newEndMinutes == null) {
      alert("Please choose a valid end time.");
      return;
    }

    const newDuration = computeDurationMinutes(entry.startMinutes, newEndMinutes);
    if (newDuration <= 0) {
      alert("End time must be after the start time.");
      return;
    }

    entry.description = newDesc;
    entry.endMinutes = newEndMinutes;
    entry.durationMinutes = newDuration;

    entries[idx] = entry;
    saveEntries();
    render();
    closeEntryModal();
  });

  // Filters & clear buttons
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

  // Date change
  dateInput.addEventListener("change", () => {
    const dateStr = dateInput.value;
    if (!dateStr) return;
    filterDateInput.value = dateStr;
    setDefaultStartForDate(dateStr);
    render();
  });

  // Initial setup
  const today = new Date().toISOString().slice(0, 10);
  dateInput.value = today;
  filterDateInput.value = today;

  loadEntries();
  setDefaultStartForDate(today);
  render();
})();
