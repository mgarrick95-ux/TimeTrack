(function () {
  const STORAGE_KEY = "simple_time_tracker_entries_final_v2";
  const DEFAULT_TIME_KEY = "default_time_v1";

  const form = document.getElementById("time-form");
  const datePrevBtn = document.getElementById("date-prev");
  const dateButton = document.getElementById("date");
  const dateNextBtn = document.getElementById("date-next");
  const startDisplay = document.getElementById("start-display");
  const endDisplay = document.getElementById("end-display");
  const defaultTimeBtn = document.getElementById("default-time-btn");
  const descriptionInput = document.getElementById("description");
  const entriesBody = document.getElementById("entries-body");
  const totalTimeEl = document.getElementById("total-time");
  const entryCountEl = document.getElementById("entry-count");
  const filterDateButton = document.getElementById("filter-date");
  const clearFilterBtn = document.getElementById("clear-filter");
  const clearAllBtn = document.getElementById("clear-all");

  const modal = document.getElementById("entry-modal");
  const modalBackdrop = document.getElementById("modal-backdrop");
  const modalDate = document.getElementById("modal-date");
  const modalTime = document.getElementById("modal-time");
  const modalDuration = document.getElementById("modal-duration");
  const modalDescription = document.getElementById("modal-description");
  const modalStartDisplay = document.getElementById("modal-start-display");
  const modalEndDisplay = document.getElementById("modal-end-display");
  const modalCloseBtn = document.getElementById("modal-close");
  const modalDeleteBtn = document.getElementById("modal-delete");
  const modalSaveBtn = document.getElementById("modal-save");

  const timePickerModal = document.getElementById("time-picker-modal");
  const timePickerBackdrop = document.getElementById("time-picker-backdrop");
  const timePickerTitle = document.getElementById("time-picker-title");
  const tpHourDisplay = document.getElementById("tp-hour-display");
  const tpMinuteDisplay = document.getElementById("tp-minute-display");
  const tpAmpmToggle = document.getElementById("tp-ampm-toggle");
  const tpHourUp = document.getElementById("tp-hour-up");
  const tpHourDown = document.getElementById("tp-hour-down");
  const tpMinuteUp = document.getElementById("tp-minute-up");
  const tpMinuteDown = document.getElementById("tp-minute-down");
  const timePickerApply = document.getElementById("time-picker-apply");
  const timePickerCancel = document.getElementById("time-picker-cancel");

  const calendarModal = document.getElementById("calendar-modal");
  const calendarBackdrop = document.getElementById("calendar-backdrop");
  const calendarTitle = document.getElementById("calendar-title");
  const calendarGrid = document.getElementById("calendar-grid");
  const calendarPrev = document.getElementById("calendar-prev");
  const calendarNext = document.getElementById("calendar-next");
  const calendarClear = document.getElementById("calendar-clear");
  const calendarCancel = document.getElementById("calendar-cancel");
  const calendarApply = document.getElementById("calendar-apply");

  let entries = [];
  let currentStartMinutes = 9 * 60;
  let currentEndMinutes = 10 * 60;
  let activeEntryId = null;

  let activeTimeTarget = null;
  let pickerHour = 9;
  let pickerMinute = 0;
  let pickerAmpm = "AM";

  let activeCalendarTarget = null;
  let calendarViewYear = 0;
  let calendarViewMonth = 0;
  let calendarSelectedDate = "";

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function getTodayDateStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function shiftDate(dateStr, dayDelta) {
    const base = new Date(dateStr + "T12:00:00");
    base.setDate(base.getDate() + dayDelta);
    const y = base.getFullYear();
    const m = pad2(base.getMonth() + 1);
    const d = pad2(base.getDate());
    return `${y}-${m}-${d}`;
  }

  function getDefaultTime() {
    const saved = localStorage.getItem(DEFAULT_TIME_KEY);
    return saved ? Number(saved) : 9 * 60;
  }

  function setDefaultTime(minutes) {
    localStorage.setItem(DEFAULT_TIME_KEY, String(minutes));
    updateDefaultTimeDisplay();
  }

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
    const normalized = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    let hour24 = Math.floor(normalized / 60);
    const minute = normalized % 60;
    const ampm = hour24 >= 12 ? "PM" : "AM";
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;
    return hour12 + ":" + pad2(minute) + " " + ampm;
  }

  function toMinutesFrom12h(hour12, minute, ampm) {
    let h = Number(hour12);
    let m = Number(minute);

    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    if (h < 1 || h > 12) return null;
    if (m < 0 || m > 59) return null;

    const upper = String(ampm || "AM").toUpperCase();
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

  function formatDateForDisplay(dateStr) {
    if (!dateStr) return "MM/DD/YYYY";
    const parts = String(dateStr).split("-");
    if (parts.length !== 3) return dateStr;
    return parts[1] + "/" + parts[2] + "/" + parts[0];
  }

  function getSelectedDate() {
    return dateButton?.dataset.value || "";
  }

  function setSelectedDate(dateStr) {
    if (!dateButton) return;
    dateButton.dataset.value = dateStr;
    dateButton.textContent = formatDateForDisplay(dateStr);
  }

  function getFilterDate() {
    return filterDateButton?.dataset.value || "";
  }

  function setFilterDate(dateStr) {
    if (!filterDateButton) return;
    filterDateButton.dataset.value = dateStr;
    filterDateButton.textContent = dateStr ? formatDateForDisplay(dateStr) : "All dates";
  }

  function updateDefaultTimeDisplay() {
    if (defaultTimeBtn) {
      defaultTimeBtn.textContent = "Default: " + formatMinutesTo12h(getDefaultTime());
    }
  }

  function updateStartDisplay() {
    if (startDisplay) {
      startDisplay.textContent = formatMinutesTo12h(currentStartMinutes);
    }
  }

  function updateEndDisplay() {
    if (endDisplay) {
      endDisplay.textContent = formatMinutesTo12h(currentEndMinutes);
    }
  }

  function updateModalStartDisplay(minutes) {
    if (modalStartDisplay) {
      modalStartDisplay.textContent = formatMinutesTo12h(minutes);
    }
  }

  function updateModalEndDisplay(minutes) {
    if (modalEndDisplay) {
      modalEndDisplay.textContent = formatMinutesTo12h(minutes);
    }
  }

  function syncSuggestedEndTime() {
    currentEndMinutes = currentStartMinutes + 60;
    updateEndDisplay();
  }

  function setDefaultStartForDate(dateStr) {
    const dayEntries = entries
      .filter((e) => e.date === dateStr)
      .sort((a, b) => a.startMinutes - b.startMinutes);

    if (dayEntries.length === 0) {
      currentStartMinutes = getDefaultTime();
    } else {
      currentStartMinutes = dayEntries[dayEntries.length - 1].endMinutes;
    }

    updateStartDisplay();
    syncSuggestedEndTime();
  }

  function render() {
    const filterDate = getFilterDate() || null;
    const filtered = filterDate ? entries.filter((e) => e.date === filterDate) : entries;

    entriesBody.innerHTML = "";
    let totalMinutes = 0;

    filtered
      .slice()
      .sort((a, b) => {
        if (a.date === b.date) return a.startMinutes - b.startMinutes;
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
          <td>${h}h ${pad2(m)}m</td>
          <td>${entry.description.replace(/\n/g, "<br>")}</td>
        `;

        entriesBody.appendChild(tr);
      });

    const total = minutesToHM(totalMinutes);
    totalTimeEl.textContent = `Total: ${total.h}h ${total.m}m`;
    entryCountEl.textContent = filtered.length === 1 ? "1 entry" : `${filtered.length} entries`;
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

    const dateStr = getSelectedDate();
    if (dateStr) {
      setDefaultStartForDate(dateStr);
    }
  }

  function closeEntryModal() {
    activeEntryId = null;
    modal.classList.add("hidden");
  }

  function openEntryModal(entryId) {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    activeEntryId = entryId;
    modalDate.textContent = entry.date;
    modalTime.textContent = `${formatMinutesTo12h(entry.startMinutes)} — ${formatMinutesTo12h(entry.endMinutes)}`;

    const dur = minutesToHM(getDurationMinutes(entry));
    modalDuration.textContent = `Duration: ${dur.h}h ${pad2(dur.m)}m`;

    modalDescription.value = entry.description;
    updateModalStartDisplay(entry.startMinutes);
    updateModalEndDisplay(entry.endMinutes);
    modal.classList.remove("hidden");
  }

  function minutesToPickerParts(minutes) {
    const normalized = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    let hour24 = Math.floor(normalized / 60);
    const minute = normalized % 60;
    const ampm = hour24 >= 12 ? "PM" : "AM";
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;
    return { hour12, minute, ampm };
  }

  function updateTimePickerUi() {
    tpHourDisplay.textContent = String(pickerHour);
    tpMinuteDisplay.textContent = pad2(pickerMinute);
    tpAmpmToggle.textContent = pickerAmpm;
  }

  function openTimePicker(target, minutes, title) {
    activeTimeTarget = target;
    const parts = minutesToPickerParts(minutes);
    pickerHour = parts.hour12;
    pickerMinute = parts.minute;
    pickerAmpm = parts.ampm;
    timePickerTitle.textContent = title;
    updateTimePickerUi();
    timePickerModal.classList.remove("hidden");
  }

  function closeTimePicker() {
    activeTimeTarget = null;
    timePickerModal.classList.add("hidden");
  }

  function renderCalendar() {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    calendarTitle.textContent = `${monthNames[calendarViewMonth]} ${calendarViewYear}`;
    calendarGrid.innerHTML = "";

    const firstDay = new Date(calendarViewYear, calendarViewMonth, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();

    for (let i = 0; i < startWeekday; i++) {
      const blank = document.createElement("button");
      blank.type = "button";
      blank.className = "calendar-day calendar-day-empty";
      blank.disabled = true;
      calendarGrid.appendChild(blank);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calendarViewYear}-${pad2(calendarViewMonth + 1)}-${pad2(day)}`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "calendar-day";
      btn.textContent = String(day);

      if (dateStr === calendarSelectedDate) {
        btn.classList.add("calendar-day-selected");
      }

      if (dateStr === getTodayDateStr()) {
        btn.classList.add("calendar-day-today");
      }

      btn.addEventListener("click", () => {
        calendarSelectedDate = dateStr;
        renderCalendar();
      });

      calendarGrid.appendChild(btn);
    }
  }

  function openCalendar(target, currentDateStr) {
    activeCalendarTarget = target;
    calendarSelectedDate = currentDateStr || getTodayDateStr();

    const parts = calendarSelectedDate.split("-");
    calendarViewYear = Number(parts[0]);
    calendarViewMonth = Number(parts[1]) - 1;

    renderCalendar();
    calendarModal.classList.remove("hidden");
  }

  function closeCalendar() {
    activeCalendarTarget = null;
    calendarModal.classList.add("hidden");
  }

  if (defaultTimeBtn) {
    defaultTimeBtn.addEventListener("click", () => {
      openTimePicker("default", getDefaultTime(), "Edit default time");
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const date = getSelectedDate();
    const description = descriptionInput.value.trim();

    if (!date || !description) {
      alert("Please fill in date, end time, and what was done.");
      return;
    }

    const durationMinutes = computeDurationMinutes(currentStartMinutes, currentEndMinutes);
    if (durationMinutes <= 0) {
      alert("End time must be after the start time.");
      return;
    }

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      date,
      startMinutes: currentStartMinutes,
      endMinutes: currentEndMinutes,
      durationMinutes,
      description,
    };

    addEntry(entry);
    currentStartMinutes = currentEndMinutes;
    updateStartDisplay();
    syncSuggestedEndTime();
    descriptionInput.value = "";
  });

  entriesBody.addEventListener("click", (e) => {
    const row = e.target.closest("tr");
    if (!row || !row.dataset.id) return;
    openEntryModal(row.dataset.id);
  });

  if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeEntryModal);
  if (modalBackdrop) modalBackdrop.addEventListener("click", closeEntryModal);

  if (modalDeleteBtn) {
    modalDeleteBtn.addEventListener("click", () => {
      if (!activeEntryId) return;
      if (confirm("Delete this entry?")) {
        deleteEntry(activeEntryId);
        closeEntryModal();
      }
    });
  }

  if (modalSaveBtn) {
    modalSaveBtn.addEventListener("click", () => {
      if (!activeEntryId) return;
      const idx = entries.findIndex((e) => e.id === activeEntryId);
      if (idx === -1) return;

      const entry = entries[idx];
      const newDesc = modalDescription.value.trim();
      const newDuration = computeDurationMinutes(entry.startMinutes, entry.endMinutes);

      if (newDuration <= 0) {
        alert("End time must be after the start time.");
        return;
      }

      entry.description = newDesc;
      entry.durationMinutes = newDuration;
      entries[idx] = entry;

      saveEntries();
      render();
      closeEntryModal();

      const dateStr = getSelectedDate();
      if (dateStr) {
        setDefaultStartForDate(dateStr);
      }
    });
  }

  if (startDisplay) {
    startDisplay.addEventListener("click", () => {
      openTimePicker("start", currentStartMinutes, "Edit start time");
    });
  }

  if (endDisplay) {
    endDisplay.addEventListener("click", () => {
      openTimePicker("end", currentEndMinutes, "Edit end time");
    });
  }

  if (modalStartDisplay) {
    modalStartDisplay.addEventListener("click", () => {
      if (!activeEntryId) return;
      const entry = entries.find((e) => e.id === activeEntryId);
      if (!entry) return;
      openTimePicker("modalStart", entry.startMinutes, "Edit start time");
    });
  }

  if (modalEndDisplay) {
    modalEndDisplay.addEventListener("click", () => {
      if (!activeEntryId) return;
      const entry = entries.find((e) => e.id === activeEntryId);
      if (!entry) return;
      openTimePicker("modalEnd", entry.endMinutes, "Edit end time");
    });
  }

  tpHourUp.addEventListener("click", () => {
    pickerHour = pickerHour === 12 ? 1 : pickerHour + 1;
    updateTimePickerUi();
  });

  tpHourDown.addEventListener("click", () => {
    pickerHour = pickerHour === 1 ? 12 : pickerHour - 1;
    updateTimePickerUi();
  });

  tpMinuteUp.addEventListener("click", () => {
    pickerMinute = (pickerMinute + 15) % 60;
    updateTimePickerUi();
  });

  tpMinuteDown.addEventListener("click", () => {
    pickerMinute = (pickerMinute + 45) % 60;
    updateTimePickerUi();
  });

  tpAmpmToggle.addEventListener("click", () => {
    pickerAmpm = pickerAmpm === "AM" ? "PM" : "AM";
    updateTimePickerUi();
  });

  timePickerCancel.addEventListener("click", closeTimePicker);
  timePickerBackdrop.addEventListener("click", closeTimePicker);

  timePickerApply.addEventListener("click", () => {
    const pickedMinutes = toMinutesFrom12h(pickerHour, pickerMinute, pickerAmpm);
    if (pickedMinutes == null) return;

    if (activeTimeTarget === "default") {
      setDefaultTime(pickedMinutes);

      const dateStr = getSelectedDate();
      const hasEntries = entries.some((e) => e.date === dateStr);

      if (!hasEntries) {
        currentStartMinutes = pickedMinutes;
        updateStartDisplay();
        syncSuggestedEndTime();
      }
    } else if (activeTimeTarget === "start") {
      currentStartMinutes = pickedMinutes;
      updateStartDisplay();
      if (currentEndMinutes <= currentStartMinutes) {
        currentEndMinutes = currentStartMinutes + 60;
      }
      updateEndDisplay();
    } else if (activeTimeTarget === "end") {
      currentEndMinutes = pickedMinutes;
      updateEndDisplay();
    } else if (activeTimeTarget === "modalStart" && activeEntryId) {
      const idx = entries.findIndex((e) => e.id === activeEntryId);
      if (idx !== -1) {
        const entry = entries[idx];
        if (pickedMinutes >= entry.endMinutes) {
          alert("Start time must be before the end time.");
          return;
        }
        entry.startMinutes = pickedMinutes;
        entry.durationMinutes = computeDurationMinutes(entry.startMinutes, entry.endMinutes);
        updateModalStartDisplay(pickedMinutes);
        modalTime.textContent = `${formatMinutesTo12h(entry.startMinutes)} — ${formatMinutesTo12h(entry.endMinutes)}`;
        const dur = minutesToHM(getDurationMinutes(entry));
        modalDuration.textContent = `Duration: ${dur.h}h ${pad2(dur.m)}m`;
      }
    } else if (activeTimeTarget === "modalEnd" && activeEntryId) {
      const idx = entries.findIndex((e) => e.id === activeEntryId);
      if (idx !== -1) {
        const entry = entries[idx];
        if (pickedMinutes <= entry.startMinutes) {
          alert("End time must be after the start time.");
          return;
        }
        entry.endMinutes = pickedMinutes;
        entry.durationMinutes = computeDurationMinutes(entry.startMinutes, entry.endMinutes);
        updateModalEndDisplay(pickedMinutes);
        modalTime.textContent = `${formatMinutesTo12h(entry.startMinutes)} — ${formatMinutesTo12h(entry.endMinutes)}`;
        const dur = minutesToHM(getDurationMinutes(entry));
        modalDuration.textContent = `Duration: ${dur.h}h ${pad2(dur.m)}m`;
      }
    }

    closeTimePicker();
  });

  if (dateButton) {
    dateButton.addEventListener("click", () => {
      openCalendar("date", getSelectedDate());
    });
  }

  if (datePrevBtn) {
    datePrevBtn.addEventListener("click", () => {
      const current = getSelectedDate() || getTodayDateStr();
      const shifted = shiftDate(current, -1);
      setSelectedDate(shifted);
      setFilterDate(shifted);
      setDefaultStartForDate(shifted);
      render();
    });
  }

  if (dateNextBtn) {
    dateNextBtn.addEventListener("click", () => {
      const current = getSelectedDate() || getTodayDateStr();
      const shifted = shiftDate(current, 1);
      setSelectedDate(shifted);
      setFilterDate(shifted);
      setDefaultStartForDate(shifted);
      render();
    });
  }

  if (filterDateButton) {
    filterDateButton.addEventListener("click", () => {
      openCalendar("filter", getFilterDate() || getSelectedDate() || getTodayDateStr());
    });
  }

  if (calendarPrev) {
    calendarPrev.addEventListener("click", () => {
      calendarViewMonth -= 1;
      if (calendarViewMonth < 0) {
        calendarViewMonth = 11;
        calendarViewYear -= 1;
      }
      renderCalendar();
    });
  }

  if (calendarNext) {
    calendarNext.addEventListener("click", () => {
      calendarViewMonth += 1;
      if (calendarViewMonth > 11) {
        calendarViewMonth = 0;
        calendarViewYear += 1;
      }
      renderCalendar();
    });
  }

  if (calendarClear) {
    calendarClear.addEventListener("click", () => {
      if (activeCalendarTarget === "filter") {
        setFilterDate("");
        render();
      }
      closeCalendar();
    });
  }

  if (calendarCancel) calendarCancel.addEventListener("click", closeCalendar);
  if (calendarBackdrop) calendarBackdrop.addEventListener("click", closeCalendar);

  if (calendarApply) {
    calendarApply.addEventListener("click", () => {
      if (!calendarSelectedDate) {
        closeCalendar();
        return;
      }

      if (activeCalendarTarget === "date") {
        setSelectedDate(calendarSelectedDate);
        setFilterDate(calendarSelectedDate);
        setDefaultStartForDate(calendarSelectedDate);
        render();
      } else if (activeCalendarTarget === "filter") {
        setFilterDate(calendarSelectedDate);
        render();
      }

      closeCalendar();
    });
  }

  if (clearFilterBtn) {
    clearFilterBtn.addEventListener("click", () => {
      setFilterDate("");
      render();
    });
  }

  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", () => {
      if (!entries.length) return;
      if (confirm("Clear ALL saved entries?")) {
        entries = [];
        saveEntries();
        render();
        const dateStr = getSelectedDate();
        if (dateStr) {
          setDefaultStartForDate(dateStr);
        }
      }
    });
  }

  const today = getTodayDateStr();
  setSelectedDate(today);
  setFilterDate(today);

  updateDefaultTimeDisplay();
  loadEntries();
  setDefaultStartForDate(today);
  render();
})();





