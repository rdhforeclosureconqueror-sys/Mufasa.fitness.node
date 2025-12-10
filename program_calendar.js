// program_calendar.js
// Front-end helper for Ma'at 2.0 programs + calendar
// This file assumes your main index.html script already defines:
// - BRAIN_BASE_URL
// - USER_ID (current username, e.g. "rashad")
// - addLog(kind, text)
// - askCoach(q, options)    <-- we will wrap this
// - #calendarView element in the HTML

(function () {
  // Make sure the main script has loaded
  if (typeof window.BRAIN_BASE_URL === "undefined") {
    console.warn("[program_calendar] BRAIN_BASE_URL not found. Load main script first.");
    return;
  }
  if (typeof window.addLog !== "function" || typeof window.askCoach !== "function") {
    console.warn("[program_calendar] addLog/askCoach not found. Load main script first.");
    return;
  }

  const PROGRAM_GEN_URL = window.BRAIN_BASE_URL + "/coach/program/generate";
  const PROGRAM_LIST_URL = window.BRAIN_BASE_URL + "/coach/program/list";
  const PROGRAM_GET_URL  = window.BRAIN_BASE_URL + "/coach/program/get";

  let currentProgram = null;

  // ─────────────────────────────────────────────
  // Calendar builder
  // ─────────────────────────────────────────────

  function buildCalendarFromProgram(program) {
    const calEl = document.getElementById("calendarView");
    if (!calEl) {
      console.warn("[program_calendar] #calendarView not found.");
      return;
    }

    calEl.innerHTML = "";

    // If program is just a plain text string, show message
    if (!program || typeof program === "string") {
      const msg = document.createElement("div");
      msg.style.fontSize = "0.85rem";
      msg.style.color = "#9ca3af";
      msg.textContent =
        "Program received (text only). Calendar autoload needs JSON program format. " +
        "Use a Mufasa command like: 'Mufasa, create an 8 week yoga program for me and put it on the calendar.'";
      calEl.appendChild(msg);
      return;
    }

    const plan = Array.isArray(program.plan) ? program.plan : [];
    if (!plan.length) {
      const msg = document.createElement("div");
      msg.style.fontSize = "0.85rem";
      msg.style.color = "#9ca3af";
      msg.textContent = "Program has no structured plan yet.";
      calEl.appendChild(msg);
      return;
    }

    currentProgram = program;

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    // Build map: YYYY-MM-DD -> [session labels...]
    const sessionsByDate = {};
    for (let w of plan) {
      const weekIndex =
        typeof w.week === "number" && w.week > 0
          ? w.week
          : plan.indexOf(w) + 1;

      const days = Array.isArray(w.days) ? w.days : [];
      for (let d of days) {
        const dayIndex =
          typeof d.day_index === "number" && d.day_index >= 1
            ? d.day_index
            : 1;
        const offsetDays = (weekIndex - 1) * 7 + (dayIndex - 1);
        const dt = new Date(startDate.getTime() + offsetDays * 86400000);
        const key = dt.toISOString().slice(0, 10);

        if (!sessionsByDate[key]) sessionsByDate[key] = [];
        const label = d.label || d.focus || "Workout";
        sessionsByDate[key].push(label);
      }
    }

    const totalWeeks = program.weeks || Math.ceil(Object.keys(sessionsByDate).length / 7) || 4;
    const totalDays = totalWeeks * 7;
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const wrapper = document.createElement("div");
    wrapper.style.display = "grid";
    wrapper.style.gridTemplateColumns = "repeat(7, minmax(0, 1fr))";
    wrapper.style.gap = "4px";
    wrapper.style.fontSize = "0.75rem";

    for (let i = 0; i < totalDays; i++) {
      const dt = new Date(startDate.getTime() + i * 86400000);
      const key = dt.toISOString().slice(0, 10);
      const sessions = sessionsByDate[key] || [];

      const dayBox = document.createElement("div");
      dayBox.style.borderRadius = "8px";
      dayBox.style.padding = "4px 5px";
      dayBox.style.minHeight = "60px";
      dayBox.style.border = "1px solid rgba(250, 204, 21, 0.7)"; // gold
      dayBox.style.background = "#020617"; // dark
      dayBox.style.display = "flex";
      dayBox.style.flexDirection = "column";
      dayBox.style.gap = "2px";

      // Highlight today with stronger gold
      const todayKey = new Date().toISOString().slice(0, 10);
      if (key === todayKey) {
        dayBox.style.boxShadow = "0 0 0 2px rgba(250, 204, 21, 0.9)";
      }

      const titleRow = document.createElement("div");
      titleRow.style.display = "flex";
      titleRow.style.justifyContent = "space-between";
      titleRow.style.marginBottom = "2px";

      const dayName = document.createElement("span");
      dayName.style.color = "#facc15"; // gold text
      dayName.style.fontWeight = "600";
      dayName.textContent = dayNames[dt.getDay() === 0 ? 6 : dt.getDay() - 1]; // map Sun->index 6

      const dateLabel = document.createElement("span");
      dateLabel.style.color = "#9ca3af";
      dateLabel.textContent = (dt.getMonth() + 1) + "/" + dt.getDate();

      titleRow.appendChild(dayName);
      titleRow.appendChild(dateLabel);
      dayBox.appendChild(titleRow);

      if (sessions.length === 0) {
        const empty = document.createElement("div");
        empty.style.color = "#4b5563";
        empty.textContent = "—";
        dayBox.appendChild(empty);
      } else {
        for (let s of sessions) {
          const pill = document.createElement("div");
          pill.style.borderRadius = "999px";
          pill.style.border = "1px solid #22c55e"; // green edge
          pill.style.padding = "2px 4px";
          pill.style.fontSize = "0.7rem";
          pill.style.color = "#bbf7d0";
          pill.textContent = s;
          dayBox.appendChild(pill);
        }
      }

      wrapper.appendChild(dayBox);
    }

    calEl.appendChild(wrapper);
  }

  // Expose globally so existing code that calls buildCalendarFromProgram works
  window.buildCalendarFromProgram = buildCalendarFromProgram;

  // ─────────────────────────────────────────────
  // Program generation helper
  // ─────────────────────────────────────────────

  async function generateProgramForUser(userId, opts) {
    const body = {
      user_id: userId,
      goal: opts.goal || "General strength and wellness program.",
      weeks: opts.weeks || 8,
      days_per_week: opts.daysPerWeek || 3,
      home_only: opts.homeOnly !== undefined ? opts.homeOnly : true,
      yoga_heavy: opts.yogaHeavy !== undefined ? opts.yogaHeavy : true,
      assessment_summary: opts.assessmentSummary || null,
      extra_context: opts.extraContext || "",
    };

    const resp = await fetch(PROGRAM_GEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("[program_calendar] Program generate failed:", resp.status, txt);
      throw new Error("Program generate HTTP " + resp.status);
    }
    return resp.json(); // { ok, program_id, program }
  }

  async function listPrograms(userId) {
    const url = PROGRAM_LIST_URL + "?user_id=" + encodeURIComponent(userId);
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error("Program list HTTP " + resp.status);
    }
    return resp.json(); // { ok, programs: [...] }
  }

  async function getProgram(programId) {
    const url = PROGRAM_GET_URL + "?program_id=" + encodeURIComponent(programId);
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error("Program get HTTP " + resp.status);
    }
    return resp.json(); // { ok, program }
  }

  // ─────────────────────────────────────────────
  // Natural language → program command detector
  // ─────────────────────────────────────────────

  function extractWeeks(text) {
    const m = text.match(/(\d+)\s*(?:week|weeks)/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > 0 && n < 53) return n;
    }
    return 8; // default
  }

  function extractTargetUser(text, fallbackUserId) {
    const m1 = text.match(/for username\s+([a-zA-Z0-9._-]+)/i);
    if (m1) return m1[1];
    const m2 = text.match(/for user\s+([a-zA-Z0-9._-]+)/i);
    if (m2) return m2[1];
    return fallbackUserId;
  }

  async function maybeHandleProgramCommand(rawText) {
    if (!rawText) return false;

    const text = rawText.toLowerCase();

    // We only intercept when it clearly looks like a "make a program" request.
    const isProgramAsk =
      text.includes("program") &&
      (text.includes("week") || text.includes("weeks") || text.includes("plan"));

    if (!isProgramAsk) return false;

    const userId = (window.USER_ID || "rashad").toString();
    const weeks = extractWeeks(rawText);
    const targetUser = extractTargetUser(rawText, userId);

    const isForSelf = targetUser === userId;

    window.addLog("system", "Recognized program request. Asking Ma’at 2.0 to build it…");

    try {
      const result = await generateProgramForUser(targetUser, {
        goal: rawText,
        weeks,
        daysPerWeek: 4,
        homeOnly: true,
        yogaHeavy: rawText.toLowerCase().includes("yoga"),
        extraContext:
          "User spoke this request inside the virtual gym. Respect spinal history and focus on safe progression.",
      });

      const programId = result.program_id;
      const program = result.program;

      if (isForSelf) {
        buildCalendarFromProgram(program);
      }

      const who =
        targetUser === userId
          ? "for you"
          : `for user '${targetUser}' (they'll see it when they log in)`;

      const msg =
        `I created a structured ${weeks}-week program ${who}.\n` +
        `Title: ${program.title || "Untitled Program"}\n` +
        `Goal: ${program.goal || "—"}\n` +
        (isForSelf
          ? "I've also loaded it into your calendar view."
          : "It is stored for that user in the program library.");

      window.addLog("coach", "Ma’at 2.0: " + msg);

      return true; // handled
    } catch (err) {
      console.error("[program_calendar] Program command error:", err);
      window.addLog(
        "system",
        "Ma’at 2.0 hit an error while trying to generate the program. Check the console."
      );
      return false;
    }
  }

  // ─────────────────────────────────────────────
  // Wrap askCoach so ALL questions go through detector
  // ─────────────────────────────────────────────

  const originalAskCoach = window.askCoach;

  window.askCoach = async function (q, options) {
    // 1) Try to see if this is a program/calendar command
    const handled = await maybeHandleProgramCommand(q);
    if (handled) {
      // We already logged Ma'at's answer and updated the calendar.
      return { handled: true };
    }

    // 2) Otherwise, fall back to the original chat behavior
    return originalAskCoach(q, options);
  };

  console.log("[program_calendar] Loaded + askCoach wrapped successfully.");
})();
