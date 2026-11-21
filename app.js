(() => {
  const data = window.PORTFOLIO;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const img = (c, n) => `assets/work/${c.prefix}-${n}.jpg`;
  const igUrl = (h) => `https://www.instagram.com/${h}/`;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Wall model ---------------- */
  // Each entry is one wall panel: an intro card, then per collection a title card + its frames, then an outro card.
  // Blank wall pads both ends so the walk starts and stops against plain wall.
  const PAD = 4;
  const blank = () => Array.from({ length: PAD }, () => ({ type: "blank" }));
  const panels = [...blank(), { type: "intro" }];
  data.collections.forEach((c, ci) => {
    panels.push({ type: "title", c, ci });
    for (let n = 0; n < c.count; n++) panels.push({ type: "frame", c, ci, n });
  });
  panels.push({ type: "also" }, ...blank());
  const firstIdx = PAD, lastIdx = panels.length - 1 - PAD;
  const titleIdx = panels.map((p, i) => (p.type === "title" || p.type === "intro" || p.type === "also" ? i : -1)).filter((i) => i >= 0);

  const room = $("#room");
  const ring = $("#ring");
  const N = panels.length;
  const theta = (Math.PI * 2) / N;

  ring.innerHTML = panels.map((p, i) => `<div class="panel" data-i="${i}">${panelHTML(p, i)}</div>`).join("");
  const panelEls = [...ring.children];

  function panelHTML(p, i) {
    if (p.type === "blank") return "";
    if (p.type === "intro") {
      const s = data.stats.slice(0, 2).map((x) => `<li>${esc(x.value)} <span>${esc(x.label)}</span></li>`).join("");
      return `<div class="title-card title-card--intro"><h3>${esc(data.person.name)}</h3>
        <p class="intro-role">${esc(data.person.role)}. ${esc(data.person.tagline)}</p>
        <p>${data.collections.length} collections · walk right →</p><ul>${s}</ul></div>`;
    }
    if (p.type === "title") {
      return `<button class="title-card" type="button" data-open="${p.ci}" aria-label="Open ${esc(p.c.name)}">
        <h3>${esc(p.c.name)}</h3><p>${esc(p.c.category)}</p><p>${p.c.count} works · ${esc(p.c.year)}</p></button>`;
    }
    if (p.type === "also") {
      const li = data.alsoWorkedWith.map((a) => `<li>${esc(a.name)}<span>${esc(a.note)}</span></li>`).join("");
      return `<div class="title-card"><h3>Also on the wall</h3><p>More brands &amp; projects</p><ul>${li}</ul></div>`;
    }
    return `<button class="frame" type="button" data-frame="${i}" aria-label="${esc(p.c.name)}, work ${p.n + 1}">
      <img src="${img(p.c, p.n)}" alt="${esc(p.c.name)} post from @${esc(p.c.handle)}" decoding="async" draggable="false" />
      <span class="frame__label"><b>${esc(p.c.name)}</b><span>@${esc(p.c.handle)} · ${esc(p.c.via)}</span></span></button>`;
  }

  /* ---------------- Camera ---------------- */
  let R = 1600, D = 1200, P = 900, wallH = 480;
  let rot = -firstIdx * theta, target = rot, zoom = 0, zoomTarget = 0;
  let focused = -1;
  const minRot = -lastIdx * theta, maxRot = -firstIdx * theta;
  const clampRot = (r) => Math.max(minRot, Math.min(maxRot, r));

  function layout() {
    const h = room.clientHeight, w = room.clientWidth;
    wallH = Math.round(h * (w < 600 ? 0.56 : 0.62));
    const pw = Math.max(210, Math.min(360, wallH * 0.62));
    R = pw / (2 * Math.tan(theta / 2));
    P = w < 600 ? 640 : 900;
    D = R - wallH * 0.55;
    room.style.setProperty("--pw", `${pw + 1.5}px`);
    room.style.setProperty("--wall-h", `${wallH}px`);
    room.style.setProperty("--persp", `${P}px`);
    panelEls.forEach((el, i) => { el.style.transform = `rotateY(${i * theta}rad) translateZ(${-R}px)`; });
    render(true);
  }

  let lastCurrent = -1;
  function render(force) {
    ring.style.transform = `translateZ(${D + zoom}px) rotateY(${rot}rad)`;
    const limit = P * 0.72;
    panelEls.forEach((el, i) => {
      const a = i * theta + rot; // unwrapped: the wall never loops back on itself
      const z = D + zoom - R * Math.cos(a);
      const show = z < limit && Math.abs(a) < Math.PI / 2;
      if (el._show !== show || force) { el.style.visibility = show ? "visible" : "hidden"; el._show = show; }
    });
    const cur = Math.max(firstIdx, Math.min(lastIdx, Math.round(-rot / theta)));
    if (cur !== lastCurrent) { lastCurrent = cur; updateHud(cur); }
  }

  let raf = 0;
  function tick() {
    const k = reduceMotion ? 1 : 0.11;
    rot += (target - rot) * k;
    zoom += (zoomTarget - zoom) * k;
    if (Math.abs(target - rot) < 1e-4 && Math.abs(zoomTarget - zoom) < 0.3) { rot = target; zoom = zoomTarget; render(); raf = 0; return; }
    render();
    raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  const goTo = (i) => { target = clampRot(-i * theta); kick(); };

  /* ---------------- HUD ---------------- */
  const hudTitle = $("#hudTitle"), hudEnter = $("#hudEnter"), hudHint = $("#hudHint");
  const owner = (i) => panels[i].c ? panels[i].ci : panels[i].type; // collection index, "intro" or "also"
  function updateHud(i) {
    const o = owner(i);
    if (o === "intro") { hudTitle.textContent = data.person.name; hudEnter.textContent = "Read the story →"; hudEnter.dataset.target = "info"; }
    else if (o === "also") { hudTitle.textContent = "Also on the wall"; hudEnter.textContent = "See the full résumé →"; hudEnter.dataset.target = "info"; }
    else { hudTitle.textContent = data.collections[o].name; hudEnter.textContent = "Enter the collection →"; hudEnter.dataset.target = String(o); }
  }
  hudEnter.addEventListener("click", () => {
    const t = hudEnter.dataset.target;
    t === "info" ? $("#info").scrollIntoView() : openSheet(+t);
  });

  function step(dir) {
    unfocus();
    const cur = Math.round(-target / theta);
    const next = dir > 0 ? titleIdx.find((i) => i > cur) : [...titleIdx].reverse().find((i) => i < cur);
    if (next !== undefined) goTo(next);
  }
  $("#prevBtn").addEventListener("click", () => step(-1));
  $("#nextBtn").addEventListener("click", () => step(1));

  /* ---------------- Focus (look closer) ---------------- */
  function focus(i) {
    focused = i; goTo(i);
    zoomTarget = Math.max(0, P - (D - R) - wallH * 1.05) * 0.6;
    room.classList.add("is-focused");
    hudHint.innerHTML = "Click the frame to open it<br />Esc or click away to step back";
    kick();
  }
  function unfocus() {
    if (focused < 0) return;
    focused = -1; zoomTarget = 0;
    room.classList.remove("is-focused");
    hudHint.innerHTML = "Scroll or drag to walk round<br />Click a frame to look closer";
    kick();
  }

  /* ---------------- Input ---------------- */
  let drag = null, moved = false;
  room.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest(".hud-nav, .hud__enter, .view-toggle")) return;
    drag = { x: e.clientX, y: e.clientY, rot: target, id: e.pointerId };
    moved = false;
  });
  window.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - drag.y)) {
      moved = true; unfocus(); room.classList.add("is-dragging");
      try { room.setPointerCapture(e.pointerId); } catch (_) {}
    }
    if (moved) { target = clampRot(drag.rot + (dx / R) * 1.6); kick(); }
  });
  const endDrag = () => { drag = null; room.classList.remove("is-dragging"); };
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  room.addEventListener("click", (e) => {
    if (moved) { moved = false; return; }
    const open = e.target.closest("[data-open]");
    if (open) return openSheet(+open.dataset.open);
    const frame = e.target.closest("[data-frame]");
    if (frame) {
      const i = +frame.dataset.frame;
      return focused === i ? openSheet(panels[i].ci) : focus(i);
    }
    if (!e.target.closest("button, a")) unfocus();
  });

  room.addEventListener("wheel", (e) => {
    if (stage.dataset.view !== "gallery" || window.scrollY > 8) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const next = clampRot(target - d * 0.0011);
    // At either end of the wall, let the page scroll on to the Info section.
    if (next === target && Math.abs(e.deltaY) >= Math.abs(e.deltaX)) return;
    e.preventDefault();
    unfocus();
    target = next; kick();
  }, { passive: false });

  document.addEventListener("keydown", (e) => {
    if (sheet.open || stage.dataset.view !== "gallery") return;
    const r = room.getBoundingClientRect();
    if (r.bottom < 80 || r.top > innerHeight - 80) return;
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    else if (e.key === "Escape") unfocus();
  });

  /* ---------------- View toggle + list ---------------- */
  const stage = $("#gallery");
  const list = $("#list");
  stage.dataset.view = "gallery";
  list.innerHTML = data.collections.map((c, ci) => `
    <article class="list__group">
      <header class="list__head">
        <h3>${esc(c.name)}</h3>
        <p class="eyebrow">${esc(c.category)} · ${esc(c.year)} · ${esc(c.via)}</p>
        <button class="link-mono" type="button" data-open="${ci}">Open →</button>
      </header>
      <div class="list__row">
        <img src="${img(c, 0)}" alt="${esc(c.name)} post from @${esc(c.handle)}" loading="lazy" />
        <div>
          <p>${esc(c.blurb)}</p>
          <ul class="tags">${c.work.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>
        </div>
      </div>
    </article>`).join("") + `
    <article class="list__group">
      <header class="list__head"><h3>Also on the wall</h3><p class="eyebrow">More brands &amp; projects</p></header>
      ${data.alsoWorkedWith.map((a) => `<div class="list__row" style="grid-template-columns:1fr"><p><b>${esc(a.name)}</b> · ${esc(a.note)}</p></div>`).join("")}
    </article>`;
  list.addEventListener("click", (e) => { const b = e.target.closest("[data-open]"); if (b) openSheet(+b.dataset.open); });

  function setView(v) {
    stage.dataset.view = v;
    room.hidden = v !== "gallery";
    list.hidden = v !== "list";
    stage.querySelectorAll("[data-view]").forEach((b) => { if (b.tagName === "BUTTON") b.setAttribute("aria-selected", String(b.dataset.view === v)); });
    try { localStorage.setItem("view", v); } catch (_) {}
    if (v === "gallery") layout();
  }
  stage.querySelectorAll("button[data-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));

  /* ---------------- Case-study sheet ---------------- */
  const sheet = $("#sheet");
  function openSheet(ci) {
    const c = data.collections[ci];
    $("#sheetMeta").textContent = `${c.category} · ${c.year} · via ${c.via}`;
    $("#sheetTitle").textContent = c.name;
    $("#sheetBlurb").textContent = c.blurb;
    $("#sheetWork").innerHTML = c.work.map((w) => `<li>${esc(w)}</li>`).join("");
    $("#sheetGrid").innerHTML = Array.from({ length: c.count }, (_, n) => `<img src="${img(c, n)}" alt="${esc(c.name)} post ${n + 1}" />`).join("");
    const a = $("#sheetLink"); a.href = igUrl(c.handle); a.textContent = `See @${c.handle} on Instagram ↗`;
    sheet.showModal();
  }
  sheet.addEventListener("click", (e) => { if (e.target === sheet || e.target.closest("[data-close]")) sheet.close(); });

  /* ---------------- Info section ---------------- */
  $("#summary").textContent = data.person.summary;
  $("#stats").innerHTML = data.stats.map((s) => `<div><dt>${esc(s.value)}</dt><dd>${esc(s.label)}</dd></div>`).join("");
  $("#experience").innerHTML = data.experience.map((x) => `
    <li><time>${esc(x.period)}<br />${esc(x.place)}</time>
      <div><h4>${esc(x.company)}</h4><p class="role">${esc(x.role)}</p>
      <ul>${x.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div></li>`).join("");
  $("#skills").innerHTML = data.skills.map((s) => `<li>${esc(s)}</li>`).join("");
  $("#education").innerHTML = data.education.map((e) => `<li>${esc(e.school)}<small>${esc(e.detail)} · ${esc(e.period)} · ${esc(e.place)}</small></li>`).join("");
  $("#alsoList").innerHTML = data.alsoWorkedWith.map((a) => `<li>${esc(a.name)}<small>${esc(a.note)}</small></li>`).join("");
  $("#year").textContent = new Date().getFullYear();

  /* ---------------- Theme + nav state ---------------- */
  $("#themeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (_) {}
  });
  const navLinks = [...document.querySelectorAll("[data-nav]")];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) navLinks.forEach((a) => a.setAttribute("aria-current", String(a.dataset.nav === en.target.id))); });
  }, { rootMargin: "-45% 0px -50% 0px" });
  ["gallery", "info", "contact"].forEach((id) => io.observe(document.getElementById(id)));

  addEventListener("resize", () => { if (!room.hidden) layout(); });
  let saved = "gallery";
  try { saved = localStorage.getItem("view") || "gallery"; } catch (_) {}
  setView(saved === "list" ? "list" : "gallery");
})();
