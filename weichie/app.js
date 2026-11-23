// Isha Mimani — Weichie-style edition. Content comes from ../data.js.
(() => {
  const D = window.PORTFOLIO;
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const img = (prefix, n) => `../assets/work/${prefix}-${n}.jpg`;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DOTS = ["#ff4f31", "#2f6b4f", "#c9a227", "#7a5cff", "#e07a9b", "#2b7fff", "#12110b", "#f29e38"];

  /* ---------- theme ---------- */
  $("#themeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
  });

  /* ---------- text ---------- */
  $("#summary").textContent = D.person.summary;
  $("#year").textContent = new Date().getFullYear();

  /* ---------- word reveal ---------- */
  const reveals = document.querySelectorAll("[data-reveal]");
  reveals.forEach((h) => {
    h.setAttribute("aria-label", h.textContent.replace(/\s+/g, " ").trim());
    let i = 0;
    const nodes = [...h.childNodes];
    h.textContent = "";
    nodes.forEach((node) => {
      if (node.nodeType !== 3) { h.appendChild(node); return; }
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { h.appendChild(document.createTextNode(" ")); return; }
        const m = el("span", "rw-mask"); m.setAttribute("aria-hidden", "true");
        const w = el("span", "rw"); w.textContent = part; w.style.setProperty("--i", i++);
        m.appendChild(w); h.appendChild(m);
      });
    });
  });
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }), { threshold: 0.2 });
  reveals.forEach((h) => io.observe(h));

  /* ---------- hero strip (concave ring of cards) ---------- */
  const strip = $("#strip"), ring = $("#ring"), labels = $("#labels");
  const cards = [];
  D.collections.forEach((c, k) => {
    [0, 2].forEach((n) => {
      const card = el("div", "card3d");
      const im = new Image(); im.src = img(c.prefix, n); im.alt = `${c.name}, from @${c.handle}`; im.draggable = false;
      card.appendChild(im); ring.appendChild(card); cards.push({ node: card, brand: k });
    });
    const li = el("li"); const b = el("button", "", esc(c.name));
    b.type = "button"; b.style.setProperty("--dot", DOTS[k % DOTS.length]);
    b.addEventListener("click", () => goBrand(k));
    li.appendChild(b); labels.appendChild(li);
  });
  const N = cards.length, TH = (2 * Math.PI) / N;
  let R = 0, cw = 0, ch = 0, rot = 0, target = 0, pausedUntil = 0, hover = false, active = -1;

  function layout() {
    const w = strip.clientWidth, h = strip.clientHeight;
    ch = h * 0.9;
    cw = Math.min(ch * 0.82, w * (w < 600 ? 0.62 : 0.3));
    R = (cw / 2) / Math.tan(TH / 2) * 1.07;
    cards.forEach((c, i) => {
      c.node.style.width = cw + "px"; c.node.style.height = ch + "px";
      c.node.style.transform = `translate(${-cw / 2}px, ${-ch / 2}px) rotateY(${i * TH}rad) translateZ(${-R}px)`;
    });
  }
  function render() {
    ring.style.transform = `translateZ(${R}px) rotateY(${rot}rad)`;
    let best = 0, bestA = 9;
    cards.forEach((c, i) => {
      let a = (i * TH + rot) % (2 * Math.PI);
      if (a > Math.PI) a -= 2 * Math.PI; if (a < -Math.PI) a += 2 * Math.PI;
      c.node.style.visibility = Math.abs(a) < 1.25 ? "visible" : "hidden";
      if (Math.abs(a + TH / 2) < bestA) { bestA = Math.abs(a + TH / 2); best = c.brand; }
    });
    if (best !== active) {
      active = best;
      labels.querySelectorAll("button").forEach((b, k) => b.classList.toggle("is-active", k === active));
    }
  }
  function goBrand(k) {
    const desired = -(2 * k * TH + TH / 2);
    target = desired + 2 * Math.PI * Math.round((target - desired) / (2 * Math.PI));
    pausedUntil = performance.now() + 6000;
  }
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(64, now - last); last = now;
    if (!reduce && !dragging && !hover && now > pausedUntil) target -= dt * 0.00009;
    rot += (target - rot) * Math.min(1, dt * 0.006);
    render();
    requestAnimationFrame(tick);
  }
  let dragging = false, sx = 0, st = 0;
  strip.addEventListener("pointerenter", () => (hover = true));
  strip.addEventListener("pointerleave", () => (hover = false));
  strip.addEventListener("pointerdown", (e) => { dragging = true; sx = e.clientX; st = target; strip.classList.add("is-dragging"); strip.setPointerCapture(e.pointerId); });
  strip.addEventListener("pointermove", (e) => { if (dragging) target = st + (e.clientX - sx) * (TH / cw) * 1.2; });
  const end = () => { if (!dragging) return; dragging = false; strip.classList.remove("is-dragging"); pausedUntil = performance.now() + 3000; };
  strip.addEventListener("pointerup", end); strip.addEventListener("pointercancel", end);
  addEventListener("resize", layout);
  layout(); goBrand(0); rot = target; pausedUntil = 0;
  requestAnimationFrame(tick);

  /* ---------- work grid ---------- */
  const grid = $("#workGrid");
  const cols = [0, 1, 2].map(() => grid.appendChild(el("div", "work__col")));
  D.collections.forEach((c, i) => {
    const b = el("button", "wcard");
    b.type = "button";
    b.innerHTML = `<div class="wcard__img"><img src="${img(c.prefix, 1)}" alt="${esc(c.name)}, from @${esc(c.handle)}" loading="lazy"></div>
      <h3>${esc(c.name)}</h3><span class="wcard__cat">${esc(c.category)} · ${esc(c.year)}</span>
      <p class="wcard__blurb">${esc(c.blurb)}</p>`;
    b.addEventListener("click", () => openSheet(c));
    cols[i % 3].appendChild(b);
  });

  /* ---------- services ---------- */
  const SERVICES = [
    { t: "Strategy that gives a brand a point of view",
      p: "Every brief starts with the audience. I find what a brand should stand for, then make sure every touchpoint says it.",
      li: [["Positioning", "Sharper identity for 20+ luxury and consumer brands"], ["GTM", "Launch plans for new products, regions and dealers"], ["Consumer insight", "Research that turns into the brief, not a deck"]] },
    { t: "Campaigns people actually show up for",
      p: "From experiential events at The Chanakya to fashion collaborations, I plan campaigns and direct the shoots that carry them.",
      li: [["Experiential", "On-ground moments for luxury retail and hospitality"], ["Creative direction", "Brand shoots that keep a luxury look consistent"], ["Influencer & PR", "Partnerships with the right voices, not the loudest"]] },
    { t: "Growth you can measure",
      p: "Good brand work should move numbers. I tie creative to performance and keep reporting honest.",
      li: [["Performance", "45% better Meta Ads ROI through segmentation"], ["Lifecycle & CRM", "25% higher retention from reworked journeys"], ["Analytics", "35–45% lift in campaign performance"]] },
  ];
  const svc = $("#serviceList");
  SERVICES.forEach((s) => {
    const d = el("div", "svc");
    d.innerHTML = `<h3>${esc(s.t)}</h3><p>${esc(s.p)}</p><ul>${s.li.map(([b, t]) => `<li><span><b>${esc(b)}:</b> ${esc(t)}</span></li>`).join("")}</ul>`;
    svc.appendChild(d);
  });

  /* ---------- stats ---------- */
  $("#stats").innerHTML = D.stats.map((s) => `<div><dt>${esc(s.value)}</dt><dd>${esc(s.label)}</dd></div>`).join("");

  /* ---------- experience ---------- */
  $("#exp").innerHTML = D.experience.map((x) => `
    <article class="xcard">
      <div class="xcard__top"><span class="xcard__avatar" aria-hidden="true">${esc(x.company[0])}</span>
        <div><div class="xcard__co">${esc(x.company)}</div><div class="xcard__role">${esc(x.role)}</div></div></div>
      <span class="xcard__period">${esc(x.period)} · ${esc(x.place)}</span>
      <ul>${x.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
    </article>`).join("");
  $("#education").innerHTML = D.education.map((e) => `<li>${esc(e.school)}<small>${esc(e.detail)} · ${esc(e.period)} · ${esc(e.place)}</small></li>`).join("");
  $("#also").innerHTML = D.alsoWorkedWith.map((a) => `<li title="${esc(a.note)}">${esc(a.name)}</li>`).join("");
  $("#skills").innerHTML = D.skills.map((s) => `<li>${esc(s)}</li>`).join("");

  /* ---------- what do you need ---------- */
  const NEEDS = ["Brand strategy", "Repositioning", "Campaign", "Brand shoot", "Social & content", "Influencer & PR",
    "Launch / GTM", "Performance ads", "Experiential event", "CRM & retention", "Pitch support", "A second opinion"];
  const picked = new Set();
  const needGrid = $("#needGrid"), pickedEl = $("#picked"), next = $("#needForm .need__next");
  NEEDS.forEach((n) => {
    const li = el("li"); const b = el("button", "", `<span>${esc(n)}</span>`);
    b.type = "button"; b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => { picked.has(n) ? picked.delete(n) : picked.add(n); sync(); });
    li.appendChild(b); needGrid.appendChild(li);
  });
  function sync() {
    needGrid.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(picked.has(b.textContent))));
    pickedEl.innerHTML = picked.size ? "" : `<span class="need__empty">help with…</span>`;
    picked.forEach((n) => {
      const b = el("button", "", `${esc(n)} ✕`); b.type = "button"; b.setAttribute("aria-label", `Remove ${n}`);
      b.addEventListener("click", () => { picked.delete(n); sync(); });
      pickedEl.appendChild(b);
    });
    next.disabled = !picked.size;
  }
  sync();
  $("#needForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!picked.size) return;
    const list = [...picked].join(", ");
    location.href = `mailto:${D.person.email}?subject=${encodeURIComponent("Project enquiry: " + list)}&body=${encodeURIComponent(`Hi Isha,\n\nI need help with: ${list}.\n\n`)}`;
  });

  /* ---------- case-study sheet ---------- */
  const sheet = $("#sheet");
  function openSheet(c) {
    $("#sheetMeta").textContent = `${c.category} · ${c.year} · via ${c.via}`;
    $("#sheetTitle").textContent = c.name;
    $("#sheetBlurb").textContent = c.blurb;
    $("#sheetWork").innerHTML = c.work.map((w) => `<li>${esc(w)}</li>`).join("");
    $("#sheetGrid").innerHTML = Array.from({ length: c.count }, (_, n) => `<img src="${img(c.prefix, n)}" alt="${esc(c.name)} post ${n + 1}" loading="lazy">`).join("");
    const link = $("#sheetLink");
    link.href = `https://www.instagram.com/${c.handle}/`;
    link.innerHTML = `<span>@${esc(c.handle)} on Instagram</span><span class="pill__icon" aria-hidden="true">↗</span>`;
    sheet.showModal();
  }
  sheet.addEventListener("click", (e) => { if (e.target === sheet || e.target.closest("[data-close]")) sheet.close(); });
})();
