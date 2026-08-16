(function () {
  "use strict";

  const DATA_BASE = "data";
  const state = {
    players: [],
    recommendations: null,
    teams: [],
    meta: null,
    sortKey: "recommendationScore",
    sortDir: "desc",
    formation: "3-4-3",
  };

  const FORMATIONS = {
    "3-4-3": { GKP: 1, DEF: 3, MID: 4, FWD: 3 },
    "3-5-2": { GKP: 1, DEF: 3, MID: 5, FWD: 2 },
    "4-4-2": { GKP: 1, DEF: 4, MID: 4, FWD: 2 },
    "4-3-3": { GKP: 1, DEF: 4, MID: 3, FWD: 3 },
    "5-3-2": { GKP: 1, DEF: 5, MID: 3, FWD: 2 },
  };

  async function fetchJSON(name) {
    const res = await fetch(`${DATA_BASE}/${name}?_=${Date.now()}`);
    if (!res.ok) throw new Error(`Failed to load ${name}`);
    return res.json();
  }

  function fmtDate(iso) {
    if (!iso) return "unknown";
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  }

  // ---------------- Tabs ----------------
  function initTabs() {
    const buttons = document.querySelectorAll("#tabs button");
    const sections = {
      pitch: document.getElementById("tab-pitch"),
      table: document.getElementById("tab-table"),
      value: [document.getElementById("tab-value"), document.getElementById("tab-value-2")],
      fixtures: document.getElementById("tab-fixtures"),
    };
    function show(tab) {
      Object.entries(sections).forEach(([key, el]) => {
        const els = Array.isArray(el) ? el : [el];
        els.forEach((e) => e.classList.toggle("hidden", key !== tab));
      });
      buttons.forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    }
    buttons.forEach((b) => b.addEventListener("click", () => show(b.dataset.tab)));
    show("pitch");
  }

  // ---------------- Hero spotlight ----------------
  function renderSpotlight() {
    const el = document.getElementById("spotlight");
    const top = state.recommendations && state.recommendations.topOverall && state.recommendations.topOverall[0];
    if (!top) {
      el.innerHTML = `<p class="empty-msg">No qualifying players yet — check back after the next gameweek.</p>`;
      return;
    }
    el.innerHTML = `
      <p class="spotlight-name">${escapeHtml(top.name)}</p>
      <p class="spotlight-meta">${escapeHtml(top.team)} · ${top.position} · £${top.cost.toFixed(1)}m</p>
      <div class="spotlight-stats">
        <div><span class="stat-value">${top.recommendationScore}</span><span class="stat-label">Score</span></div>
        <div><span class="stat-value">${top.form}</span><span class="stat-label">Form</span></div>
        <div><span class="stat-value">${top.xGI90}</span><span class="stat-label">xGI/90</span></div>
        <div><span class="stat-value">${top.fixtureDifficulty}</span><span class="stat-label">FDR (5)</span></div>
      </div>
    `;
  }

  // ---------------- Pitch view ----------------
  function renderPitch() {
    const container = document.getElementById("pitch-rows");
    const byPos = state.recommendations && state.recommendations.byPosition;
    if (!byPos) {
      container.innerHTML = `<p class="empty-msg">No recommendation data available.</p>`;
      return;
    }
    const counts = FORMATIONS[state.formation];
    const order = ["FWD", "MID", "DEF", "GKP"]; // attack-to-defence, pitch-style
    container.innerHTML = order
      .map((pos) => {
        const picks = (byPos[pos] || []).slice(0, counts[pos]);
        if (!picks.length) return "";
        const cards = picks
          .map(
            (p) => `
          <div class="pick-card" tabindex="0">
            <span class="pos-tag">${p.position}</span>
            <div class="p-name">${escapeHtml(p.name)}</div>
            <div class="p-team">${escapeHtml(p.team)} · £${p.cost.toFixed(1)}m</div>
            <div class="p-score">${p.recommendationScore}<small> score</small></div>
          </div>`
          )
          .join("");
        return `<div class="pitch-row">${cards}</div>`;
      })
      .join("");
  }

  function initFormationToggle() {
    const wrap = document.getElementById("formation-toggle");
    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      wrap.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.formation = btn.dataset.f;
      renderPitch();
    });
  }

  // ---------------- Stats table ----------------
  function currentTableRows() {
    const q = document.getElementById("search-input").value.trim().toLowerCase();
    const pos = document.getElementById("position-filter").value;
    const team = document.getElementById("team-filter").value;
    let rows = state.players.filter((p) => {
      if (pos && p.position !== pos) return false;
      if (team && p.team !== team) return false;
      if (q && !`${p.name} ${p.fullName}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const { sortKey, sortDir } = state;
    rows = rows.slice().sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string") { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }

  function renderTable() {
    const tbody = document.getElementById("table-body");
    const rows = currentTableRows();
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="14" class="empty-msg">No players match those filters.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows
      .map(
        (p) => `
      <tr>
        <td class="name-cell">${escapeHtml(p.name)}${p.news ? `<span class="flag">⚑ ${escapeHtml(truncate(p.news, 40))}</span>` : ""}<span class="full">${escapeHtml(p.fullName)}</span></td>
        <td><span class="pos-badge ${p.position}">${p.position}</span></td>
        <td>${p.cost.toFixed(1)}</td>
        <td>${p.totalPoints}</td>
        <td>${p.form}</td>
        <td>${p.pointsPerGame}</td>
        <td>${p.ictIndex}</td>
        <td>${p.xG}</td>
        <td>${p.xA}</td>
        <td>${p.xGI90}</td>
        <td>${p.xGC}</td>
        <td>${p.selectedByPercent}%</td>
        <td>${p.fixtureDifficulty}</td>
        <td>${p.recommendationScore}</td>
      </tr>`
      )
      .join("");
  }

  function initTableControls() {
    document.querySelectorAll("#stats-table thead th").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.key;
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = key;
          state.sortDir = "desc";
        }
        document.querySelectorAll("#stats-table thead th").forEach((h) => h.classList.remove("sorted"));
        th.classList.add("sorted");
        renderTable();
      });
    });
    document.getElementById("search-input").addEventListener("input", renderTable);
    document.getElementById("position-filter").addEventListener("change", renderTable);
    document.getElementById("team-filter").addEventListener("change", renderTable);
  }

  function populateTeamFilter() {
    const select = document.getElementById("team-filter");
    const names = Array.from(new Set(state.players.map((p) => p.team))).sort();
    names.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
  }

  // ---------------- Value & differentials ----------------
  function renderCardRow(containerId, list, statKey, statLabel) {
    const el = document.getElementById(containerId);
    if (!list || !list.length) {
      el.innerHTML = `<p class="empty-msg">No data available.</p>`;
      return;
    }
    el.innerHTML = list
      .map(
        (p) => `
      <div class="stat-card">
        <div class="top">
          <span class="p-name">${escapeHtml(p.name)}</span>
          <span class="pos-badge ${p.position}">${p.position}</span>
        </div>
        <div class="p-sub">${escapeHtml(p.team)} · £${p.cost.toFixed(1)}m · Owned ${p.selectedByPercent}%</div>
        <div class="big-stat">${p[statKey]}</div>
        <div class="p-sub">${statLabel}</div>
      </div>`
      )
      .join("");
  }

  // ---------------- Fixtures ----------------
  function renderFixtures() {
    const el = document.getElementById("fixture-grid");
    if (!state.teams.length) {
      el.innerHTML = `<p class="empty-msg">No fixture data available.</p>`;
      return;
    }
    const sorted = state.teams.slice().sort((a, b) => a.fixtureDifficulty - b.fixtureDifficulty);
    el.innerHTML = sorted
      .map((t) => {
        const pct = Math.min(100, Math.max(0, ((t.fixtureDifficulty - 1) / 4) * 100));
        const color = fdrColor(t.fixtureDifficulty);
        return `
        <div class="fixture-cell">
          <div class="t-name">${escapeHtml(t.shortName)}</div>
          <div class="fdr-track"><div class="fdr-fill" style="width:${pct}%;background:${color}"></div></div>
          <div class="fdr-val">Avg FDR next 5: ${t.fixtureDifficulty}</div>
        </div>`;
      })
      .join("");
  }

  function fdrColor(value) {
    // 1 (easy) -> lime, 5 (hard) -> red, interpolated through amber
    const stops = [
      { at: 1, rgb: [200, 255, 77] },
      { at: 3, rgb: [255, 176, 32] },
      { at: 5, rgb: [255, 92, 92] },
    ];
    const v = Math.min(5, Math.max(1, value));
    let a = stops[0], b = stops[1];
    if (v > 3) { a = stops[1]; b = stops[2]; }
    const t = (v - a.at) / (b.at - a.at || 1);
    const rgb = a.rgb.map((c, i) => Math.round(c + (b.rgb[i] - c) * t));
    return `rgb(${rgb.join(",")})`;
  }

  // ---------------- Helpers ----------------
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }
  function truncate(str, n) {
    return str.length > n ? str.slice(0, n - 1) + "…" : str;
  }

  // ---------------- Boot ----------------
  async function init() {
    initTabs();
    initFormationToggle();
    initTableControls();

    try {
      const [players, recommendations, teams, meta] = await Promise.all([
        fetchJSON("players.json"),
        fetchJSON("recommendations.json"),
        fetchJSON("teams.json"),
        fetchJSON("meta.json"),
      ]);
      state.players = players;
      state.recommendations = recommendations;
      state.teams = teams;
      state.meta = meta;

      document.getElementById("last-updated").textContent =
        `data as of ${fmtDate(meta.generatedAt)}`;

      populateTeamFilter();
      renderSpotlight();
      renderPitch();
      renderTable();
      renderCardRow("value-cards", recommendations.topValue, "valuePer1m", "Points per £1m");
      renderCardRow("differential-cards", recommendations.topDifferentials, "recommendationScore", "Recommendation score");
      renderFixtures();
    } catch (err) {
      console.error(err);
      document.getElementById("last-updated").textContent = "data unavailable";
      document.querySelectorAll(".loading-msg").forEach((el) => {
        el.textContent = "Couldn't load data. Run scripts/fetch_data.py or wait for the next GitHub Action run.";
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
