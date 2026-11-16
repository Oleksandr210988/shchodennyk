/* Shell of the combined «Щоденник» app: bottom tabs, the watch (Health Connect) view and moving records between phone apps. */
(function () {
  const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const SRC = NATIVE ? {food: "food/index.html", gym: "gym/index.html"} : {food: "food/", gym: "gym/"};
  const COLOR = {food: "#2f6f4f", gym: "#1f5fbf", watch: "#8a4fbf"};
  const TITLE = {food: "Калорії", gym: "Тренування", watch: "Годинник"};
  const $ = id => document.getElementById(id);
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function esc(t) { return String(t).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c])); }
  function fmt(n) { return Math.round(n).toLocaleString("uk-UA"); }

  function load(t) { const f = $("f-" + t); if (f && !f.src) f.src = SRC[t]; return f; }
  let current = null;
  function show(t) {
    if (!TITLE[t]) t = "food";
    for (const k of ["food", "gym"]) $("f-" + k).hidden = k !== t;
    $("v-watch").hidden = t !== "watch";
    document.querySelectorAll("nav button").forEach(b => b.setAttribute("aria-pressed", b.dataset.tab === t));
    if (SRC[t]) load(t);
    document.querySelector('meta[name="theme-color"]').content = COLOR[t];
    document.title = TITLE[t];
    store("one-tab", t);
    current = t;
    if (t === "watch") renderWatch();
  }
  document.querySelectorAll("nav button").forEach(b => b.addEventListener("click", () => show(b.dataset.tab)));

  /* ---------- moving all records (phone browser app ⇄ Android app) ---------- */
  function exportAll() {
    const ls = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k !== "one-tab" && !k.startsWith("watch-")) ls[k] = localStorage.getItem(k); }
    return JSON.stringify({app: "shchodennyk-all", v: 1, at: new Date().toISOString(), ls});
  }
  function countRecords(ls) {
    let food = 0, gym = 0;
    try { food = Object.keys(JSON.parse(ls["shchodennyk-db-food"] || "{}")).filter(k => k.startsWith("days/")).length; } catch (e) {}
    try { gym = Object.keys(JSON.parse(ls["shchodennyk-db-gym"] || "{}")).filter(k => k.startsWith("workouts/")).length; } catch (e) {}
    return {food, gym};
  }
  function importAll(text) {
    let o;
    try { o = JSON.parse(text.trim()); } catch (e) { throw new Error("Це не схоже на копію записів. Скопіюйте ще раз."); }
    if (!o || o.app !== "shchodennyk-all" || !o.ls) throw new Error("Це копія з іншого застосунку. Потрібна кнопка «Скопіювати всі записи» у вкладці «Годинник».");
    for (const k in o.ls) localStorage.setItem(k, o.ls[k]);
    for (const k of ["food", "gym"]) { const f = $("f-" + k); if (f.src) f.contentWindow.location.reload(); }
    return countRecords(o.ls);
  }
  function transferCard() {
    const c = countRecords(Object.fromEntries(Array.from({length: localStorage.length}, (_, i) => localStorage.key(i)).map(k => [k, localStorage.getItem(k)])));
    const here = `На цьому телефоні зараз: днів у калоріях ${c.food}, тренувань ${c.gym}.`;
    if (!NATIVE) return `<section class="card"><h2>Перенести записи в Android-застосунок</h2>
      <p>${here}</p><p>Натисніть кнопку, потім відкрийте Android-застосунок «Щоденник», вкладка «Годинник», і вставте.</p>
      <button class="btn" id="cpAll" type="button">Скопіювати всі записи</button>
      <button class="btn sec" id="saveAll" type="button">Зберегти копію у файл</button><p id="trMsg" role="status"></p></section>`;
    return `<details class="card"><summary><b>Перенести записи з телефону</b></summary>
      <p>${here}</p><p>У старому застосунку «Щоденник» (з Chrome) відкрийте вкладку «Годинник» і натисніть «Скопіювати всі записи». Потім поверніться сюди, утримуйте палець у полі нижче і виберіть «Вставити».</p>
      <textarea id="pasteAll" placeholder="Вставте сюди скопійовані записи" aria-label="Скопійовані записи"></textarea>
      <button class="btn" id="impAll" type="button">Перенести записи</button>
      <label class="btn sec" style="display:grid;place-items:center">Або вибрати файл копії<input id="fileAll" type="file" accept=".json,application/json,text/plain" hidden></label>
      <p id="trMsg" role="status"></p></details>`;
  }
  function wireTransfer() {
    const msg = (t, ok) => { const m = $("trMsg"); if (m) { m.className = ok ? "ok" : "err"; m.textContent = t; } };
    const doImport = text => { try { const c = importAll(text); msg(`Перенесено: днів у калоріях ${c.food}, тренувань ${c.gym}.`, true); } catch (e) { msg(e.message, false); } };
    if ($("cpAll")) $("cpAll").onclick = async () => {
      const data = exportAll();
      try { await navigator.clipboard.writeText(data); msg("Скопійовано. Тепер відкрийте Android-застосунок і вставте.", true); }
      catch (e) { msg("Не вдалося скопіювати. Натисніть «Зберегти копію у файл».", false); }
    };
    if ($("saveAll")) $("saveAll").onclick = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([exportAll()], {type: "application/json"}));
      a.download = "shchodennyk-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      msg("Файл збережено в «Завантаження».", true);
    };
    if ($("impAll")) $("impAll").onclick = () => doImport($("pasteAll").value);
    if ($("fileAll")) $("fileAll").onchange = e => { const f = e.target.files[0]; if (f) f.text().then(doImport); };
  }

  /* ---------- watch view ---------- */
  const READ = ["steps", "calories", "totalCalories", "heartRate", "restingHeartRate", "sleep", "workouts"];
  const WTYPE = {strengthTraining: "Силове тренування", traditionalStrengthTraining: "Силове тренування", functionalStrengthTraining: "Функціональне", weightlifting: "Важка атлетика", cycling: "Велосипед", bikingStationary: "Велотренажер", walking: "Ходьба", running: "Біг", runningTreadmill: "Бігова доріжка", hiking: "Похід", elliptical: "Еліпс", rowingMachine: "Гребний тренажер", swimming: "Плавання", swimmingPool: "Басейн", stairClimbingMachine: "Степер", highIntensityIntervalTraining: "Інтервальне (HIIT)", yoga: "Йога", stretching: "Розтяжка", calisthenics: "Вправи з власною вагою", other: "Інше тренування"};
  const Health = !NATIVE ? null
    : (window.Capacitor.Plugins && window.Capacitor.Plugins.Health) || (window.Capacitor.registerPlugin ? window.Capacitor.registerPlugin("Health") : null);
  let busy = false;

  function dayStart(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function eatenOn(date) {
    try {
      const db = JSON.parse(localStorage.getItem("shchodennyk-db-food") || "{}");
      const doc = db["days/" + ymd(date)];
      const w = $("f-food").contentWindow;
      if (!doc || !w || typeof w.dayTotals !== "function") return null;
      return w.dayTotals(doc).kcal;
    } catch (e) { return null; }
  }
  async function agg(dataType, start, end, aggregation) {
    try {
      const r = await Health.queryAggregated({dataType, startDate: start.toISOString(), endDate: end.toISOString(), bucket: "day", aggregation});
      return r.samples || [];
    } catch (e) { return []; }
  }
  function byDay(samples) { const m = {}; samples.forEach(s => { m[ymd(new Date(s.startDate))] = s.value; }); return m; }

  async function renderWatch() {
    const body = $("watchBody");
    if (!NATIVE || !Health) {
      body.innerHTML = `<h1>Годинник</h1><section class="card"><p>${NATIVE ? "Модуль годинника не завантажився. Оновіть застосунок за посиланням з чату." : ""}Кроки, пульс і спалені калорії з Galaxy Watch видно в Android-версії застосунку «Щоденник». У браузері телефон не дає до них доступу.</p></section>` + transferCard();
      wireTransfer();
      return;
    }
    if (busy) return; busy = true;
    try {
      const av = await Health.isAvailable().catch(e => ({available: false, reason: e.message}));
      if (!av.available) {
        body.innerHTML = `<h1>Годинник</h1><section class="card"><h2>Health Connect недоступний</h2><p>На телефоні потрібен Health Connect. На Samsung з Android 14 і новіше він уже є в Налаштуваннях. Інакше встановіть «Health Connect» з Google Play.</p><p>${esc(av.reason || "")}</p><button class="btn" id="hcSet" type="button">Відкрити Health Connect</button></section>` + transferCard();
        $("hcSet").onclick = () => Health.openHealthConnectSettings().catch(() => {});
        wireTransfer();
        return;
      }
      const st = await Health.checkAuthorization({read: READ}).catch(() => ({readAuthorized: []}));
      const ok = st.readAuthorized || [];
      if (!ok.includes("steps") && !ok.includes("heartRate")) {
        body.innerHTML = `<h1>Годинник</h1><section class="card"><h2>Підключити Galaxy Watch</h2>
          <p>Застосунок буде читати з Health Connect кроки, пульс, спалені калорії, сон і тренування з годинника. Нічого не записує і нікуди не відправляє: усе залишається на телефоні.</p>
          <p>Перед цим у Samsung Health увімкніть передачу даних у Health Connect (інструкція в повідомленні).</p>
          <button class="btn" id="connect" type="button">Підключити годинник</button>
          <button class="btn sec" id="hcSet" type="button">Налаштування Health Connect</button><p id="cMsg" role="status"></p></section>` + transferCard();
        $("connect").onclick = async () => {
          try {
            const r = await Health.requestAuthorization({read: READ, requestHistoryAccess: true});
            if ((r.readAuthorized || []).length) { busy = false; renderWatch(); }
            else { $("cMsg").className = "err"; $("cMsg").textContent = "Дозволи не надано. Натисніть ще раз і увімкніть усі пункти."; }
          } catch (e) { $("cMsg").className = "err"; $("cMsg").textContent = "Помилка: " + e.message; }
        };
        $("hcSet").onclick = () => Health.openHealthConnectSettings().catch(() => {});
        wireTransfer();
        return;
      }
      body.innerHTML = `<h1>Годинник</h1><section class="card"><p>Завантажую дані…</p></section>`;
      const now = new Date(), today = dayStart(now), week = new Date(today); week.setDate(week.getDate() - 6);
      const [steps, active, total, hr, rhr] = await Promise.all([
        agg("steps", week, now, "sum"), agg("calories", week, now, "sum"), agg("totalCalories", week, now, "sum"),
        agg("heartRate", today, now, ["average", "min", "max"]), agg("restingHeartRate", week, now, "average")]);
      const S = byDay(steps), A = byDay(active), T = byDay(total), R = byDay(rhr);
      // Samsung Health does not always hand over "total burned": then total = basal metabolism (by time of day) + active
      const bmr = bmrPerDay(); let estimated = false;
      for (let i = 0; i < 7; i++) {
        const d = new Date(today); d.setDate(d.getDate() - i); const k = ymd(d);
        if (T[k] == null && A[k] != null) { const frac = i === 0 ? (now - today) / 864e5 : 1; T[k] = bmr * frac + A[k]; estimated = true; }
      }
      const t = ymd(today);
      const hrToday = hr.find(s => ymd(new Date(s.startDate)) === t);
      const src = await stepSources(today, now);
      if (src.watch > 0) S[t] = src.watch;
      let sleepMin = null;
      try {
        const from = new Date(today); from.setHours(-12);
        const sl = await Health.readSamples({dataType: "sleep", startDate: from.toISOString(), endDate: now.toISOString(), limit: 20});
        if (sl.samples && sl.samples.length) sleepMin = sl.samples.reduce((a, s) => a + (s.value || 0), 0);
      } catch (e) {}
      let workouts = [];
      try {
        const from = new Date(today); from.setDate(from.getDate() - 13);
        workouts = (await Health.queryWorkouts({startDate: from.toISOString(), endDate: now.toISOString(), limit: 20, ascending: false})).workouts || [];
      } catch (e) {}
      for (const w of workouts.slice(0, 6)) {
        try {
          const r = await Health.readSamples({dataType: "heartRate", startDate: w.startDate, endDate: w.endDate, limit: 3000});
          const v = (r.samples || []).map(s => s.value).filter(Boolean);
          if (v.length) { w.avgHr = v.reduce((a, b) => a + b, 0) / v.length; w.maxHr = Math.max(...v); }
        } catch (e) {}
      }
      syncToday();
      const st0 = S[t] || 0, eaten = eatenOn(today), burned = T[t];
      let html = `<h1>Годинник</h1><section class="card"><h2>Сьогодні</h2><div class="stats">
        <div class="stat wide"><span>Кроки</span><b>${fmt(st0)} <span>з 15 000</span></b><div class="bar"><i style="width:${Math.min(100, st0 / 150)}%"></i></div></div>
        <div class="stat"><span>Активні ккал</span><b>${A[t] != null ? fmt(A[t]) : "–"}</b></div>
        <div class="stat"><span>Спалено${estimated ? " ≈" : ""}</span><b>${burned != null ? fmt(burned) : "–"}</b></div>
        ${R[t] != null ? `<div class="stat"><span>Пульс спокою</span><b>${fmt(R[t])}</b></div>` : ""}
        <div class="stat"><span>Пульс сер.</span><b>${hrToday ? fmt(hrToday.values.average || hrToday.value) : "–"}</b>${hrToday && hrToday.values.max ? `<span>${fmt(hrToday.values.min)}–${fmt(hrToday.values.max)}</span>` : ""}</div>
        ${sleepMin ? `<div class="stat"><span>Сон</span><b>${Math.floor(sleepMin / 60)}:${String(Math.round(sleepMin % 60)).padStart(2, "0")}</b></div>` : ""}
      </div></section>`;
      if (eaten != null && burned != null) {
        const diff = burned - eaten;
        html += `<section class="card"><h2>Баланс сьогодні</h2><p>З'їдено ${fmt(eaten)} ккал, спалено ${fmt(burned)} ккал (з годинника, до цієї хвилини).</p>
          <p><b class="${diff >= 0 ? "ok" : "err"}">${diff >= 0 ? "Дефіцит " + fmt(diff) : "Перебір " + fmt(-diff)} ккал</b></p>
          ${estimated ? "<p>Спалено пораховано так: базовий обмін за вашою вагою, ростом і віком плюс активні калорії з годинника.</p>" : ""}<p>Вечір ще попереду, тож дефіцит до кінця дня зазвичай ще трохи зросте.</p></section>`;
      }
      const NAMES = {steps: "кроки", calories: "активні калорії", totalCalories: "спалені калорії", heartRate: "пульс", restingHeartRate: "пульс спокою", sleep: "сон", workouts: "тренування"};
      const missing = READ.filter(k => !ok.includes(k));
      if (missing.length) html += `<section class="card"><h2>Немає доступу: ${missing.map(k => NAMES[k]).join(", ")}</h2>
        <p>Натисніть кнопку і в Health Connect увімкніть усі пункти для «Щоденника». Також у Samsung Health → ⋮ → Налаштування → Health Connect мають бути увімкнені всі дані.</p>
        <button class="btn" id="askAgain" type="button">Дати доступ до всього</button></section>`;
      else if (A[t] == null && T[t] == null && !hrToday) html += `<section class="card"><p>Доступ є, але Samsung Health ще не передав калорії і пульс. Перевірте: Samsung Health → ⋮ → Налаштування → Health Connect, там мають бути увімкнені всі дані. Потім відкрийте Samsung Health на кілька секунд і натисніть «Оновити».</p></section>`;
      html += `<section class="card"><h2>Останні 7 днів</h2><table><thead><tr><th>День</th><th>Кроки</th><th>Спалено</th><th>З'їдено</th></tr></thead><tbody>`;
      for (let i = 0; i < 7; i++) {
        const d = new Date(today); d.setDate(d.getDate() - i); const k = ymd(d); const e = eatenOn(d);
        html += `<tr><td>${d.toLocaleDateString("uk-UA", {weekday: "short", day: "numeric", month: "numeric"})}</td><td>${S[k] != null ? fmt(S[k]) : "–"}</td><td>${T[k] != null ? fmt(T[k]) : "–"}</td><td>${e ? fmt(e) : "–"}</td></tr>`;
      }
      html += `</tbody></table></section><section class="card"><h2>Тренування з годинника (14 днів)</h2>`;
      if (!workouts.length) html += `<p>Поки немає. Коли запускаєте тренування на годиннику, воно з'явиться тут.</p>`;
      for (const w of workouts) {
        const d = new Date(w.startDate);
        html += `<div class="wo"><div><b>${esc(WTYPE[w.workoutType] || w.workoutType)}</b><small>${d.toLocaleDateString("uk-UA", {weekday: "short", day: "numeric", month: "numeric"})}, ${d.toLocaleTimeString("uk-UA", {hour: "2-digit", minute: "2-digit"})}</small></div>
          <div class="r"><b>${Math.round(w.duration / 60)} хв</b><small>${w.totalEnergyBurned ? fmt(w.totalEnergyBurned) + " ккал" : ""}${w.avgHr ? " · пульс " + fmt(w.avgHr) + (w.maxHr ? "/" + fmt(w.maxHr) : "") : ""}</small></div></div>`;
      }
      html += `</section><section class="card"><button class="btn" id="refresh" type="button">Оновити</button><button class="btn sec" id="hcSet" type="button">Налаштування Health Connect</button>
        <p>Годинник передає дані в Samsung Health, а той у Health Connect. Samsung Health робить це не одразу, а раз на якийсь час. Щоб підтягнути свіжі кроки, відкрийте Samsung Health на кілька секунд, поверніться сюди і натисніть «Оновити».</p>
        ${src.last ? `<p>Останні кроки в Health Connect: о ${src.last.toLocaleTimeString("uk-UA", {hour: "2-digit", minute: "2-digit"})}.</p>` : ""}
        ${src.list.length ? `<p>Кроки сьогодні за пристроями: ${src.list.map(x => esc(srcName(x.name)) + " " + fmt(x.sum)).join(", ")}.</p>` : ""}</section>` + transferCard();
      body.innerHTML = html;
      $("refresh").onclick = () => { busy = false; renderWatch(); };
      $("hcSet").onclick = () => Health.openHealthConnectSettings().catch(() => {});
      if ($("askAgain")) $("askAgain").onclick = async () => {
        let r = null;
        try { r = await Health.requestAuthorization({read: READ, requestHistoryAccess: true}); } catch (e) {}
        const got = (r && r.readAuthorized) || [];
        if (READ.some(k => !got.includes(k) && !ok.includes(k))) Health.openHealthConnectSettings().catch(() => {});
        busy = false; renderWatch();
      };
      wireTransfer();
    } catch (e) {
      body.innerHTML = `<h1>Годинник</h1><section class="card"><p class="err">Помилка: ${esc(e.message)}</p><button class="btn" id="refresh" type="button">Спробувати ще раз</button></section>` + transferCard();
      $("refresh").onclick = () => { busy = false; renderWatch(); };
      wireTransfer();
    } finally { busy = false; }
  }
  function bmrPerDay() {
    // Mifflin-St Jeor for Oleksandr (male, 176 cm, born 1988), with the latest weight from the calorie diary
    let w = 132;
    try { const db = JSON.parse(localStorage.getItem("shchodennyk-db-food") || "{}"); const ks = Object.keys(db).filter(k => k.startsWith("days/") && parseFloat(db[k].weight) > 0).sort(); if (ks.length) w = parseFloat(db[ks[ks.length - 1]].weight); } catch (e) {}
    const age = new Date().getFullYear() - 1988 - (new Date() < new Date(new Date().getFullYear(), 9, 26) ? 1 : 0);
    return 10 * w + 6.25 * 176 - 5 * age + 5;
  }
  /* steps by device from raw records. The watch face shows only the watch's own steps, while Samsung Health adds the phone's.
     So when watch records exist we show the watch total, which matches the dial. */
  function srcName(p) { return p === "watch" ? "годинник" : p === "phone" ? "телефон" : /shealth|samsung/i.test(p) ? "Samsung Health" : p; }
  async function stepSources(from, to) {
    const res = {watch: 0, last: null, list: []};
    try {
      const r = await Health.readSamples({dataType: "steps", startDate: from.toISOString(), endDate: to.toISOString(), limit: 5000});
      const m = {};
      for (const x of r.samples || []) {
        const k = x.deviceType || x.sourceName || x.sourceId || "?";
        m[k] = (m[k] || 0) + (x.value || 0);
        const e = new Date(x.endDate); if (!res.last || e > res.last) res.last = e;
      }
      res.list = Object.entries(m).map(([name, sum]) => ({name, sum: Math.round(sum)})).sort((a, b) => b.sum - a.sum);
      res.watch = Math.round(m.watch || 0);
    } catch (e) {}
    return res;
  }

  /* ---------- automatic sync: today's steps and burn go to the calorie page without any taps ---------- */
  async function syncToday() {
    if (!Health) return;
    try {
      const av = await Health.isAvailable(); if (!av.available) return;
      const st = await Health.checkAuthorization({read: READ}); if (!(st.readAuthorized || []).includes("steps")) return;
      const now = new Date(), today = dayStart(now), t = ymd(today);
      const [s, a, tot] = await Promise.all([agg("steps", today, now, "sum"), agg("calories", today, now, "sum"), agg("totalCalories", today, now, "sum")]);
      const pick = arr => { const x = arr.find(v => ymd(new Date(v.startDate)) === t); return x ? Math.round(x.value) : null; };
      const src = await stepSources(today, now);
      const steps = src.watch > 0 ? src.watch : pick(s);
      let total = pick(tot); const active = pick(a);
      if (total == null && active != null) total = Math.round(bmrPerDay() * (now - today) / 864e5 + active);
      const data = {date: t, steps, active, total, at: now.toISOString()};
      store("watch-today", JSON.stringify(data));
      const w = $("f-food").contentWindow;
      if (w && typeof w.showWatch === "function") w.showWatch(data);
    } catch (e) {}
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden || !NATIVE) return;
    syncToday();
    if (current === "watch") renderWatch();
  });

  const q = new URLSearchParams(location.search).get("tab");
  let first = TITLE[q] ? q : (store("one-tab") || "food");
  show(first);
  if (first === "watch") first = "food";
  load(first).addEventListener("load", () => setTimeout(() => load(first === "food" ? "gym" : "food"), 300), {once: true});
  if (!NATIVE && "serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  if (NATIVE) {
    $("f-food").addEventListener("load", syncToday);
    syncToday();
    setInterval(() => { if (!document.hidden) syncToday(); }, 5 * 60 * 1000);
  }
})();
