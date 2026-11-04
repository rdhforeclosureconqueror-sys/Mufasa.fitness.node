(() => {
  "use strict";
  if (customElements.get("milele-narration")) return;
  class MileleNarration extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready) return;
      this.dataset.ready = "true";
      const title = this.getAttribute("title") || "Story";
      const src = this.getAttribute("src");
      const section = document.createElement("section");
      section.setAttribute("aria-label", title + " narration");
      const heading = document.createElement("strong");
      heading.textContent = title;
      section.append(heading);
      if (src) {
        const url = new URL(src, location.href);
        if (url.protocol === "https:" || url.origin === location.origin && url.protocol === "http:") {
          const audio = document.createElement("audio");
          audio.controls = true;
          audio.preload = "none";
          audio.src = url.href;
          audio.setAttribute("aria-label", "Listen to " + title);
          section.append(audio);
        }
      }
      if (!section.querySelector("audio")) {
        const message = document.createElement("p");
        message.textContent = "Audio is not available yet. The written story remains available.";
        section.append(message);
      }
      const transcript = this.querySelector("[data-transcript]");
      if (transcript) {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = "Read transcript";
        details.append(summary, transcript);
        section.append(details);
      }
      this.replaceChildren(section);
    }
  }
  customElements.define("milele-narration", MileleNarration);
})();