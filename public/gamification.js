(function (factory) {
  "use strict";
  const api = factory(typeof window === "undefined" ? null : window);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.MufasaProgression = api;
})(function (browser) {
  "use strict";

  const MOTION = Object.freeze({ quick: 180, standard: 420, progress: 800, celebration: 2400, easing: "cubic-bezier(.2,.8,.2,1)" });
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const earnedAt = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : "Earned";

  class CelebrationQueue {
    constructor({ present, reducedMotion = false } = {}) {
      this.items = [];
      this.present = present || (() => Promise.resolve());
      this.reducedMotion = reducedMotion;
      this.active = false;
      this.dismissCurrent = null;
    }
    enqueue(...items) {
      this.items.push(...items.flat().filter(Boolean));
      this.drain();
      return this;
    }
    async drain() {
      if (this.active) return;
      this.active = true;
      while (this.items.length) {
        const item = this.items.shift();
        await this.present(item, { reducedMotion: this.reducedMotion, setDismiss: (dismiss) => { this.dismissCurrent = dismiss; } });
        this.dismissCurrent = null;
      }
      this.active = false;
    }
    dismiss() { if (this.dismissCurrent) this.dismissCurrent(); }
    clear() { this.items.length = 0; this.dismiss(); }
  }

  function celebrationsBetween(previous, current) {
    if (!previous || !current || current.state !== "ready") return [];
    const result = [];
    const oldXp = number(previous.level?.lifetimeXp);
    const newXp = number(current.level?.lifetimeXp);
    if (newXp > oldXp) result.push({ type: "xp", amount: newXp - oldXp, total: newXp });
    if (number(current.level?.current) > number(previous.level?.current)) result.push({ type: "level", from: previous.level.current, to: current.level.current });
    const oldAchievements = new Set((previous.achievements || []).filter((item) => item.state === "earned").map((item) => item.id));
    (current.achievements || []).filter((item) => item.state === "earned" && !oldAchievements.has(item.id)).forEach((item) => result.push({ type: "achievement", item }));
    const oldBadges = new Set((previous.badges || []).map((item) => item.id));
    (current.badges || []).filter((item) => !oldBadges.has(item.id)).forEach((item) => result.push({ type: "badge", item }));
    return result;
  }

  function iconFor(name) {
    const initial = String(name || "Reward").trim().charAt(0).toUpperCase();
    return `<span class="reward-icon" aria-hidden="true">${escapeHtml(initial || "✦")}</span>`;
  }

  function createPresenter(document, host) {
    return (event, controls) => new Promise((resolve) => {
      const card = document.createElement("aside");
      card.className = `celebration celebration--${event.type}`;
      card.setAttribute("role", "status");
      const content = event.type === "xp"
        ? `${iconFor("XP")}<p class="celebration__eyebrow">Progress added</p><h2>+${number(event.amount).toLocaleString()} XP</h2><p>Your momentum is building.</p>`
        : event.type === "level"
          ? `${iconFor("Level")}<p class="celebration__eyebrow">Level up</p><h2>Level ${number(event.to)}</h2><p>A new milestone reached.</p>`
          : `${iconFor(event.item?.name)}<p class="celebration__eyebrow">${event.type === "badge" ? "Badge collected" : "Achievement unlocked"}</p><h2>${escapeHtml(event.item?.name || "New reward")}</h2><p>${escapeHtml(event.item?.description || (event.type === "badge" ? "Added to your collection." : "Your work made this possible."))}</p>`;
      card.innerHTML = `<div class="celebration__glow" aria-hidden="true"></div>${content}<button type="button" class="celebration__dismiss" aria-label="Dismiss celebration">Dismiss</button>`;
      host.appendChild(card);
      let complete = false;
      let timer;
      const dismiss = () => {
        if (complete) return;
        complete = true;
        clearTimeout(timer);
        card.classList.add("is-leaving");
        setTimeout(() => { card.remove(); resolve(); }, controls.reducedMotion ? 0 : MOTION.quick);
      };
      controls.setDismiss(dismiss);
      card.querySelector("button").addEventListener("click", dismiss);
      requestAnimationFrame(() => card.classList.add("is-visible"));
      timer = setTimeout(dismiss, controls.reducedMotion ? 900 : MOTION.celebration);
    });
  }

  function achievementCard(item) {
    const earned = item.state === "earned";
    return `<article class="achievement achievement--${escapeHtml(item.state)}" tabindex="0" aria-label="${escapeHtml(item.name)}, ${escapeHtml(item.state)}">${iconFor(item.name)}<div><p class="achievement__category">${escapeHtml(item.category || "Milestone")}</p><h3>${escapeHtml(item.name)}</h3><p>${earned ? `${earnedAt(item.earnedAt)} · +${number(item.rewardXp)} XP` : `${number(item.progress?.value)} of ${number(item.progress?.target)}`}</p></div></article>`;
  }

  function render(root, data, { previous } = {}) {
    if (data.state === "empty") {
      root.innerHTML = '<div class="gamification__empty"><div class="reward-icon" aria-hidden="true">◇</div><h2>Your momentum starts here</h2><p class="muted">Complete your first workout to earn XP and reveal your first badge.</p><a class="btn" href="/">Start a workout</a></div>';
      return;
    }
    const level = data.level;
    const percent = level.levelSpanXp ? Math.min(100, Math.round(number(level.xpIntoLevel) / number(level.levelSpanXp) * 100)) : 100;
    const streak = Math.max(0, ...(data.streaks || []).map((item) => number(item.days)));
    const achievements = data.achievements || [];
    const latest = achievements.find((item) => item.state === "earned");
    const reward = (data.recentRewards || [])[0];
    root.innerHTML = `<div class="gamification__hero"><div class="gamification__head"><div><p class="gamification__eyebrow">Your momentum</p><h2>${level.xpToNextLevel ? `${number(level.xpToNextLevel).toLocaleString()} XP to level ${number(level.current) + 1}` : "Peak level reached"}</h2><p class="gamification__summary">${streak ? `${streak} days strong. Consistency is becoming your advantage.` : "Every completed session moves your story forward."}</p></div><div class="gamification__level" aria-label="Current level ${number(level.current)}"><span>Level</span><strong>${number(level.current)}</strong></div></div><div class="xp-track" role="progressbar" aria-label="Progress to next level" aria-valuemin="0" aria-valuemax="${number(level.levelSpanXp || level.lifetimeXp)}" aria-valuenow="${number(level.xpIntoLevel)}" aria-valuetext="${percent}% toward the next level"><div class="xp-track__fill" style="--xp-progress:${percent}%"></div></div><div class="gamification__xp-meta"><span><strong data-xp-counter>${number(level.lifetimeXp).toLocaleString()}</strong> lifetime XP</span><span>${percent}% complete</span></div></div><div class="game-stats"><article class="game-stat"><span>Current streak</span><strong>${streak} <small>days</small></strong></article><article class="game-stat"><span>Latest achievement</span><strong>${escapeHtml(latest?.name || "Ready to earn")}</strong></article><article class="game-stat"><span>Recent reward</span><strong>${reward ? `+${number(reward.xp)} XP` : "Your next move"}</strong></article><article class="game-stat game-stat--motivation"><span>Today's motivation</span><strong>${streak ? "Protect the rhythm." : "Begin with one strong choice."}</strong></article></div><section class="collection" aria-labelledby="achievementTitle"><div class="collection__heading"><div><p class="gamification__eyebrow">Your collection</p><h3 id="achievementTitle">Achievements & badges</h3></div><span>${number(data.stats?.badgesEarned)} earned</span></div><div class="achievement-grid">${achievements.length ? achievements.map(achievementCard).join("") : '<p class="muted">New achievements will appear as you train.</p>'}</div></section>`;
    const fill = root.querySelector(".xp-track__fill");
    if (fill && previous && number(previous.level?.lifetimeXp) < number(level.lifetimeXp)) {
      const oldPercent = previous.level?.levelSpanXp ? Math.min(100, number(previous.level.xpIntoLevel) / number(previous.level.levelSpanXp) * 100) : percent;
      fill.style.setProperty("--xp-progress", `${oldPercent}%`);
      requestAnimationFrame(() => requestAnimationFrame(() => fill.style.setProperty("--xp-progress", `${percent}%`)));
    }
  }

  function mount(win = browser) {
    if (!win) return null;
    const root = win.document.getElementById("gamificationExperience");
    if (!root) return null;
    const reducedMotion = win.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;
    const layer = win.document.createElement("div");
    layer.className = "celebration-layer";
    layer.setAttribute("aria-label", "Progress celebrations");
    win.document.body.appendChild(layer);
    const queue = new CelebrationQueue({ present: createPresenter(win.document, layer), reducedMotion });
    let current = null;
    const token = () => win.APP_AUTH?.token || win.MufasaBackendRead?.createClient?.({ storagePrefix: "maat" })?.getAuthToken?.();
    const base = () => String(win.RuntimeState?.getBackendOrigin?.() || win.MAAT_BACKEND_ORIGIN || win.location.origin).replace(/\/$/, "");
    async function load({ celebrate = true } = {}) {
      root.setAttribute("aria-busy", "true");
      if (!current) root.innerHTML = '<div class="gamification__skeleton" aria-label="Loading your progress"><i></i><i></i><i></i><i></i></div>';
      try {
        const auth = token();
        if (!auth) throw new Error("Sign in to see your progress.");
        const response = await win.fetch(`${base()}/api/me/gamification`, { headers: { authorization: `Bearer ${auth}` }, cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload?.error?.message || "Progress is temporarily unavailable.");
        const previous = current;
        current = payload.data;
        render(root, current, { previous });
        const celebrations = previous ? celebrationsBetween(previous, current) : [];
        if (celebrate && previous) queue.enqueue(celebrations);
        return { data: current, previous, celebrations };
      } catch (error) {
        root.innerHTML = `<div class="gamification__error" role="alert"><h2>We couldn't load your progress</h2><p class="muted">${escapeHtml(error.message)}</p><button class="btn" type="button" data-game-retry>Try again</button></div>`;
        root.querySelector("[data-game-retry]").addEventListener("click", () => load({ celebrate: false }));
      } finally { root.removeAttribute("aria-busy"); }
    }
    win.addEventListener("mufasa:gamification-refresh", () => load());
    load({ celebrate: false });
    return { load, queue, getCurrent: () => current, destroy() { queue.clear(); layer.remove(); } };
  }

  const start = () => { browser.MufasaProgressionInstance = mount(browser); };
  if (browser?.document) browser.document.readyState === "loading" ? browser.document.addEventListener("DOMContentLoaded", start, { once: true }) : start();
  return Object.freeze({ MOTION, CelebrationQueue, celebrationsBetween, render, mount });
});
