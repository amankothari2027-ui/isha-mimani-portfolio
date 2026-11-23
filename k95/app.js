// Isha Mimani — k95-style edition. Content comes from ../data.js.
(() => {
  const D = window.PORTFOLIO;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const img = (prefix, n) => `../assets/work/${prefix}-${n}.jpg`;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pad = (n) => String(n).padStart(2, "0");

  document.querySelectorAll(".year").forEach((n) => (n.textContent = new Date().getFullYear()));
  $("#summary").textContent = D.person.summary;

  /* ---------- 3D field ---------- */
  const stage = $("#stage"), field = $("#field"), home = $("#home"), tip = $("#tip"), dot = $("#dot");
  const tiles = [];
  D.collections.forEach((c, b) => {
    for (let n = 0; n < c.count; n++) {
      const t = document.createElement("button");
      t.type = "button"; t.className = "tile";
      t.setAttribute("aria-label", `${c.name}: open case study`);
      t.innerHTML = `<img src="${img(c.prefix, n)}" alt="" draggable="false" loading="${b < 4 ? "eager" : "lazy"}">`;
      t.addEventListener("click", () => openCase(c));
      t.addEventListener("pointerenter", () => { tip.textContent = `${c.name} — ${c.category}`; tip.classList.add("show"); });
      t.addEventListener("pointerleave", () => tip.classList.remove("show"));
      field.appendChild(t);
      tiles.push({ node: t, brand: b, k: tiles.length, s: [1, 0.82, 1.18, 0.92][tiles.length % 4] });
    }
  });
  const N = tiles.length;
  let W = 0, H = 0, R = 0, base = 0;
  function layout() {
    W = stage.clientWidth; H = stage.clientHeight;
    R = clamp(W * 0.42, 220, 640);
    base = clamp(W * 0.075, 64, 140);
    tiles.forEach((t) => { t.w = base * t.s; t.h = t.w * 1.25; t.node.style.width = t.w + "px"; t.node.style.height = t.h + "px"; });
  }

  let mode = 0, modeTarget = 0, auto = 0, mx = 0, my = 0, tmx = 0, tmy = 0, lastFront = -1;
  const PER = 8, RINGS = Math.ceil(N / PER);
  function positions(t, rot) {
    // rings
    const j = Math.floor(t.k / PER), i = t.k % PER;
    const a1 = (i / PER) * Math.PI * 2 + j * 0.39 + rot;
    const y1 = (j - (RINGS - 1) / 2) * H * 0.27;
    // spiral
    const a2 = t.k * 0.6 + rot;
    const y2 = (t.k - (N - 1) / 2) * H * 0.026;
    const r2 = R * 0.92;
    const a = a1 + (a2 - a1) * mode;
    const r = R + (r2 - R) * mode;
    return { x: Math.sin(a) * r, y: y1 + (y2 - y1) * mode, z: Math.cos(a) * r - R * 0.35, a };
  }

  function progress() {
    const rect = home.getBoundingClientRect();
    return clamp(-rect.top / Math.max(1, home.offsetHeight - innerHeight), 0, 1);
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(64, now - last); last = now;
    const p = progress();
    if (!reduce) auto += dt * 0.00008;
    mode += (modeTarget - mode) * Math.min(1, dt * 0.004);
    mx += (tmx - mx) * 0.06; my += (tmy - my) * 0.06;
    const rot = auto + p * Math.PI * 1.6;
    const push = p * R * 0.9;
    field.style.transform = `translateZ(${push}px) rotateX(${-6 + my * 6}deg) rotateY(${mx * 8}deg)`;
    let front = 0, frontZ = -1e9;
    tiles.forEach((t) => {
      const q = positions(t, rot);
      const zEff = q.z + push;
      t.node.style.visibility = zEff > 760 ? "hidden" : "visible";
      t.node.style.transform = `translate3d(${q.x - t.w / 2}px, ${q.y - t.h / 2}px, ${q.z}px) rotateY(${Math.sin(q.a) * 22}deg)`;
      if (q.z > frontZ && Math.abs(q.x) < R * 0.6) { frontZ = q.z; front = t.brand; }
    });
    if (front !== lastFront) { lastFront = front; $("#count").textContent = front + 1; }
    $("#hint").style.opacity = p > 0.04 ? 0 : 1;
    requestAnimationFrame(frame);
  }
  addEventListener("resize", layout);
  layout();
  requestAnimationFrame(frame);

  stage.addEventListener("pointermove", (e) => { tmx = (e.clientX / innerWidth - 0.5) * 2; tmy = (e.clientY / innerHeight - 0.5) * 2; });
  addEventListener("pointermove", (e) => {
    dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    tip.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 16}px)`;
  }, { passive: true });

  document.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => {
    modeTarget = b.dataset.mode === "spiral" ? 1 : 0;
    document.querySelectorAll("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  }));

  /* ---------- header colour + mode visibility ---------- */
  const header = $("#header"), lights = [...document.querySelectorAll(".light")];
  function onScroll() {
    const y = 34;
    header.classList.toggle("on-light", lights.some((s) => { const r = s.getBoundingClientRect(); return r.top <= y && r.bottom >= y; }));
    header.classList.toggle("past-home", home.getBoundingClientRect().bottom < 120);
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- works ---------- */
  const TILT = [16, 6, -6, -16];
  $("#worksGrid").innerHTML = D.collections.map((c, i) => `
    <button class="wtile" type="button" data-i="${i}">
      <div class="wtile__img" style="--ry:${TILT[i % 4]}deg;--rx:${i < 4 ? 6 : -6}deg"><img src="${img(c.prefix, 2)}" alt="${esc(c.name)}, from @${esc(c.handle)}" loading="lazy"></div>
      <div class="wtile__meta"><b>${esc(c.name)}</b><span>${esc(c.year)}</span></div>
    </button>`).join("");
  $("#worksList").innerHTML = D.collections.map((c, i) => `
    <li><button type="button" data-i="${i}"><span>${esc(c.name)}</span><span>${esc(c.category)}</span><span>${esc(c.via)}</span><span>${esc(c.year)}</span></button></li>`).join("");
  document.querySelectorAll("#worksGrid [data-i], #worksList [data-i]").forEach((b) => b.addEventListener("click", () => openCase(D.collections[+b.dataset.i])));
  document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => {
    const list = b.dataset.view === "list";
    $("#worksGrid").hidden = list; $("#worksList").hidden = !list;
    document.querySelectorAll("[data-view]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  }));

  /* ---------- services + stats ---------- */
  const SERVICES = [
    { t: "Brand strategy", p: "Positioning, audience insight and the story a brand tells everywhere it shows up.", li: ["Positioning", "GTM strategy", "Consumer insight", "Market research"] },
    { t: "Campaigns & creative", p: "Experiential campaigns, partnerships and the shoots that carry them, with one consistent luxury look.", li: ["Experiential campaigns", "Creative direction", "Brand shoots", "Influencer & PR"] },
    { t: "Performance & growth", p: "Creative tied to numbers: paid social, lifecycle journeys and honest reporting.", li: ["Meta Ads", "CRM & lifecycle", "Content marketing", "Marketing analytics"] },
  ];
  $("#serviceGrid").innerHTML = SERVICES.map((s) => `<div><h3>${esc(s.t)}</h3><p>${esc(s.p)}</p><ul>${s.li.map((l) => `<li>${esc(l)}</li>`).join("")}</ul></div>`).join("");
  $("#stats").innerHTML = D.stats.map((s) => `<div><dt>${esc(s.value)}</dt><dd>${esc(s.label)}</dd></div>`).join("");

  /* ---------- career ---------- */
  const list = $("#teamList"), detail = $("#teamDetail");
  D.experience.forEach((x, i) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "tab"); b.id = "role-" + i;
    b.textContent = x.company.split(" (")[0];
    b.addEventListener("click", () => select(i));
    b.addEventListener("pointerenter", () => select(i));
    b.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const n = (i + (e.key === "ArrowDown" ? 1 : -1) + D.experience.length) % D.experience.length;
      select(n); $("#role-" + n).focus();
    });
    li.appendChild(b); list.appendChild(li);
  });
  function select(i) {
    const x = D.experience[i];
    list.querySelectorAll("button").forEach((b, k) => { b.setAttribute("aria-selected", String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    detail.setAttribute("aria-labelledby", "role-" + i);
    detail.innerHTML = `<p class="caps">${pad(i + 1)} / ${pad(D.experience.length)} — ${esc(x.period)} · ${esc(x.place)}</p>
      <h3>${esc(x.role)}</h3><p class="caps">${esc(x.company)}</p>
      <ul>${x.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>`;
  }
  select(0);
  $("#education").innerHTML = D.education.map((e) => `<li>${esc(e.school)}<small>${esc(e.detail)} · ${esc(e.period)}</small></li>`).join("");
  $("#also").innerHTML = D.alsoWorkedWith.map((a) => `<li>${esc(a.name)}<small>${esc(a.note)}</small></li>`).join("");
  $("#skills").innerHTML = D.skills.map((s) => `<li>${esc(s)}</li>`).join("");

  /* ---------- case study ---------- */
  const dlg = $("#case");
  function openCase(c) {
    $("#caseMeta").textContent = `${c.category} — ${c.year} — via ${c.via}`;
    $("#caseTitle").textContent = c.name;
    $("#caseBlurb").textContent = c.blurb;
    $("#caseWork").innerHTML = c.work.map((w) => `<li>${esc(w)}</li>`).join("");
    $("#caseGrid").innerHTML = Array.from({ length: c.count }, (_, n) => `<img src="${img(c.prefix, n)}" alt="${esc(c.name)} post ${n + 1}" loading="lazy">`).join("");
    const a = $("#caseLink"); a.href = `https://www.instagram.com/${c.handle}/`; a.textContent = `@${c.handle} on Instagram ↗`; rollify(a);
    tip.classList.remove("show");
    dlg.showModal();
  }
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-close]")) dlg.close(); });

  /* ---------- letter roll ---------- */
  function rollify(a) {
    const text = a.textContent;
    a.setAttribute("aria-label", text);
    a.innerHTML = [...text].map((ch, i) => `<span class="ch" aria-hidden="true" style="--i:${i}" data-c="${esc(ch)}">${esc(ch)}</span>`).join("");
  }
  document.querySelectorAll(".roll").forEach(rollify);
})();
