import {
  deleteConcert as deleteConcertLocal,
  deleteMedia as deleteMediaLocal,
  exportBackup as exportBackupLocal,
  getAllConcerts as getAllConcertsLocal,
  getAllMedia as getAllMediaLocal,
  getConcert as getConcertLocal,
  getMedia as getMediaLocal,
  getMediaByConcert as getMediaByConcertLocal,
  getSetting,
  importBackup as importBackupLocal,
  saveConcert as saveConcertLocal,
  saveMedia as saveMediaLocal,
  setSetting,
} from "./db.js";
import {
  deleteConcertCloud,
  deleteMediaCloud,
  ensureProfile,
  getAllConcertsCloud,
  getAllMediaCloud,
  getConcertCloud,
  getMediaByConcertCloud,
  getMediaCloud,
  getSession,
  resolveLoginIdentifier,
  signIn,
  signOut,
  signUp,
  updateMediaCaptionCloud,
  uploadImageCloud,
  saveConcertCloud,
} from "./cloudDb.js";
import { isSupabaseConfigured } from "./config.js";
import { createTranslator } from "./i18n.js";

const app = document.querySelector("#app");
const objectUrls = new Map();

const state = {
  lang: "zh",
  view: "home",
  concerts: [],
  allMedia: [],
  selectedId: null,
  selectedConcert: null,
  selectedMedia: [],
  coverUrls: new Map(),
  tag: "all",
  project: "all",
  query: "",
  modal: null,
  toast: "",
  session: null,
  authMode: "signin",
  cloudConfigured: false,
  busy: false,
};

let searchTimer;

const themeColors = [
  { name: "BanG Dream! - Poppin'Party", value: "#FF3377" },
  { name: "BanG Dream! - Afterglow", value: "#EE3344" },
  { name: "BanG Dream! - Pastel＊Palettes", value: "#33DDAA" },
  { name: "BanG Dream! - Roselia", value: "#3344AA" },
  { name: "BanG Dream! - Hello, Happy World!", value: "#FFC02A" },
  { name: "BanG Dream! - Morfonica", value: "#33AAFF" },
  { name: "BanG Dream! - RAISE A SUILEN", value: "#22CCCC" },
  { name: "BanG Dream! - MyGO!!!!!", value: "#3288BB" },
  { name: "BanG Dream! - Ave Mujica", value: "#881144" },
  { name: "BanG Dream! - 夢限大みゅーたいぷ", value: "#EC7384" },
  { name: "BanG Dream! - millsage", value: "#AA22EE" },
  { name: "BanG Dream! - 一家Dumb Rock!", value: "#FFAA33" },
  { name: "Love Live! - μ's", value: "#E4007F" },
  { name: "Love Live! - A-RISE", value: "#B8B8B8" },
  { name: "Love Live! - Aqours", value: "#00A3E0" },
  { name: "Love Live! - Saint Snow", value: "#E60033" },
  { name: "Love Live! - 虹ヶ咲学園スクールアイドル同好会", value: "#FAB920" },
  { name: "Love Live! - Liella!", value: "#A546C8" },
  { name: "Love Live! - Sunny Passion", value: "#FFCC33" },
  { name: "Love Live! - 蓮ノ空女学院スクールアイドルクラブ", value: "#F6ADC6" },
  { name: "Love Live! - スクールアイドルミュージカル", value: "#E95A9C" },
  { name: "Love Live! - いきづらい部！", value: "#FF8C00" },
  { name: "Love Live! - Bluebird", value: "#4BA3D9" },
];

const sampleConcerts = [
  {
    title: "星屑 afterglow live note",
    project: "Poppin'Party Style",
    date: "2025-05-18",
    city: "上海",
    venue: "Dream Hall",
    address: "浦东新区",
    themeColor: "#FF3377",
    tags: ["偶像企划", "Band", "动画相关"],
    note: "第一次把粉色应援棒带到现场，安可时全场像一本会发光的手账。",
    thoughts:
      "开场灯暗下来的瞬间，所有人的呼吸都轻了一下。最喜欢的是中盘那首合唱，身边的人不认识，却在同一个拍子里把手举起来。回程时票根被夹在书里，像当天留给明天的书签。",
    favoriteSong: "Kirakira Memory",
    setlist: ["Opening Star", "Teardrop Notebook", "Kirakira Memory", "Encore Letter"],
    ticketInfo: "电子票 / 一般指定席",
    seatInfo: "1F B区 12排",
    merch: ["场刊", "粉色手灯", "亚克力牌"],
    companions: ["阿澈"],
    schedule: ["14:00 到场取物贩", "16:30 入场", "18:00 开演", "20:15 安可结束"],
    memorableMoments: ["MC 提到第一次练习室合奏", "安可前全场一起喊企划名", "最后一首彩带落下来"],
    externalVideos: [],
  },
  {
    title: "迷子でも進める夜",
    project: "MyGO!!!!! Style",
    date: "2025-01-12",
    city: "广州",
    venue: "Blue Note Space",
    address: "天河区",
    themeColor: "#3288BB",
    tags: ["声优", "Band", "Live"],
    note: "蓝色灯海很安静，但每一下鼓点都像在说“继续走”。",
    thoughts:
      "这场的情绪不是爆发式的，而是慢慢把人推到歌里面。几首歌之间的停顿很美，像大家都知道某些话不用说完。",
    favoriteSong: "Mayoigo no Compass",
    setlist: ["Silence Tuning", "Mayoigo no Compass", "Rainy Chord", "Nameless Encore"],
    ticketInfo: "抽选票 / 指定席",
    seatInfo: "2F C区 5排",
    merch: ["蓝色毛巾", "徽章盲盒"],
    companions: [],
    schedule: ["15:20 到场", "17:15 入场", "18:00 开演"],
    memorableMoments: ["长 MC 后第一句歌词全场安静下来", "贝斯 solo 的蓝光"],
    externalVideos: ["https://example.com/private-live-clip"],
  },
  {
    title: "Violet Archive - Rosen Nacht",
    project: "Roselia Style",
    date: "2024-10-04",
    city: "东京",
    venue: "Moon Theater",
    address: "有明",
    themeColor: "#3344AA",
    tags: ["海外远征", "动画相关", "个人记录"],
    note: "紫色和白色灯光压下来时，整个场馆像被封进一枚旧胸针。",
    thoughts:
      "远征的疲惫在第一首歌响起时突然消失。场馆很大，但舞台上的每个停顿都很清楚。回酒店整理战利品时，才意识到自己真的来过这里。",
    favoriteSong: "Violet Oath",
    setlist: ["Gate of Rose", "Violet Oath", "Sanctuary", "Archive"],
    ticketInfo: "海外票务代购",
    seatInfo: "Arena D6",
    merch: ["场刊", "T-shirt", "紫色手灯"],
    companions: ["小遥", "Nagi"],
    schedule: ["10:00 物贩排队", "13:30 附近吃饭", "16:00 入场", "17:00 开演"],
    memorableMoments: ["开场管风琴音色", "最后鞠躬时全场白灯"],
    externalVideos: [],
  },
];

function t(key) {
  return createTranslator(state.lang)(key);
}

function useCloud() {
  return state.cloudConfigured && state.session;
}

function validateUsername(username) {
  const normalized = String(username || "").trim();
  if (!/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}A-Za-z0-9_]{2,20}$/u.test(normalized)) {
    throw new Error(t("usernameHint"));
  }
  return normalized;
}

function displayUserName(session) {
  const username = session?.user?.user_metadata?.username;
  if (username) return username;
  const email = session?.user?.email || "";
  return email.endsWith("@live-memory.local") ? email.replace("@live-memory.local", "") : email;
}

async function getAllConcertsData() {
  return useCloud() ? getAllConcertsCloud() : getAllConcertsLocal();
}

async function getAllMediaData() {
  return useCloud() ? getAllMediaCloud() : getAllMediaLocal();
}

async function getConcertData(id) {
  return useCloud() ? getConcertCloud(id) : getConcertLocal(id);
}

async function getMediaData(id) {
  return useCloud() ? getMediaCloud(id) : getMediaLocal(id);
}

async function getMediaByConcertData(id) {
  return useCloud() ? getMediaByConcertCloud(id) : getMediaByConcertLocal(id);
}

async function saveConcertData(concert) {
  return useCloud() ? saveConcertCloud(concert) : saveConcertLocal(concert);
}

async function deleteConcertData(id) {
  return useCloud() ? deleteConcertCloud(id) : deleteConcertLocal(id);
}

async function deleteMediaData(id) {
  return useCloud() ? deleteMediaCloud(id) : deleteMediaLocal(id);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(state.lang === "ja" ? "ja-JP" : "zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function splitLines(value) {
  return String(value || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(value) {
  return list(value).join("\n");
}

function createObjectUrl(media) {
  if (!media?.blob) return "";
  if (objectUrls.has(media.id)) return objectUrls.get(media.id);
  const url = URL.createObjectURL(media.blob);
  objectUrls.set(media.id, url);
  return url;
}

function mediaUrl(media) {
  return media?.url || createObjectUrl(media);
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function colorOptions(selected) {
  return themeColors
    .map((color) => `<option value="${color.value}" ${selected === color.value ? "selected" : ""}>${color.name}</option>`)
    .join("");
}

function uniqueTags() {
  return [...new Set(state.concerts.flatMap((concert) => list(concert.tags)))].sort();
}

function uniqueProjects() {
  return [...new Set(state.concerts.map((concert) => concert.project).filter(Boolean))].sort();
}

function filteredConcerts() {
  const query = state.query.trim().toLowerCase();
  return state.concerts.filter((concert) => {
    const haystack = [
      concert.title,
      concert.project,
      concert.city,
      concert.venue,
      concert.address,
      concert.note,
      ...list(concert.tags),
    ]
      .join(" ")
      .toLowerCase();
    const tagOk = state.tag === "all" || list(concert.tags).includes(state.tag);
    const projectOk = state.project === "all" || concert.project === state.project;
    return (!query || haystack.includes(query)) && tagOk && projectOk;
  });
}

function stats() {
  const cities = new Set(state.concerts.map((concert) => concert.city).filter(Boolean));
  const projects = new Set(state.concerts.map((concert) => concert.project).filter(Boolean));
  return {
    concerts: state.concerts.length,
    cities: cities.size,
    projects: projects.size,
    media: state.allMedia.length,
  };
}

function projectCounts() {
  const counts = new Map();
  state.concerts.forEach((concert) => counts.set(concert.project, (counts.get(concert.project) || 0) + 1));
  const max = Math.max(1, ...counts.values());
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([project, count]) => ({ project, count, max }));
}

async function refreshData() {
  state.concerts = await getAllConcertsData();
  state.allMedia = await getAllMediaData();
  state.coverUrls = new Map();
  for (const concert of state.concerts) {
    const cover = await getMediaData(concert.coverMediaId);
    if (cover) state.coverUrls.set(concert.id, mediaUrl(cover));
  }
  if (state.selectedId) {
    state.selectedConcert = await getConcertData(state.selectedId);
    state.selectedMedia = await getMediaByConcertData(state.selectedId);
    if (!state.selectedConcert) {
      state.selectedId = null;
      state.view = "library";
    }
  }
}

async function seedIfNeeded() {
  if (state.cloudConfigured) return;
  const seeded = await getSetting("seeded", false);
  const existing = await getAllConcertsLocal();
  if (seeded || existing.length) return;

  for (const concert of sampleConcerts) {
    const saved = await saveConcertLocal(concert);
    const cover = await saveMediaLocal({
      concertId: saved.id,
      type: "image",
      fileName: `${saved.title}.svg`,
      caption: "原创占位封面，可替换为自己的现场图或官方图。",
      blob: new Blob([makeCoverSvg(saved)], { type: "image/svg+xml" }),
    });
    await saveConcertLocal({ ...saved, coverMediaId: cover.id });
  }
  await setSetting("seeded", true);
}

function makeCoverSvg(concert) {
  const title = escapeHtml(concert.title);
  const project = escapeHtml(concert.project);
  const color = concert.themeColor || "#ff6f9f";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${color}"/>
        <stop offset="0.55" stop-color="#7664d9"/>
        <stop offset="1" stop-color="#65d2c4"/>
      </linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect width="1200" height="800" fill="url(#g)"/>
    <path d="M0 590 C 220 470 340 700 540 565 C 760 416 900 608 1200 430 L1200 800 L0 800 Z" fill="rgba(20,16,35,.35)"/>
    <g filter="url(#glow)" opacity=".8">
      <rect x="178" y="130" width="18" height="420" rx="9" fill="#fff" transform="rotate(-18 187 340)"/>
      <rect x="956" y="128" width="18" height="420" rx="9" fill="#fff" transform="rotate(18 965 338)"/>
      <circle cx="600" cy="315" r="132" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="5"/>
    </g>
    <text x="80" y="104" fill="rgba(255,255,255,.76)" font-family="Arial, sans-serif" font-size="34">LIVE MEMORY PASS</text>
    <text x="80" y="640" fill="white" font-family="Arial, sans-serif" font-size="62" font-weight="700">${title}</text>
    <text x="80" y="704" fill="rgba(255,255,255,.82)" font-family="Arial, sans-serif" font-size="34">${project}</text>
  </svg>`;
}

function render() {
  document.documentElement.lang = state.lang === "ja" ? "ja" : "zh-CN";
  app.innerHTML = `
    <div class="app-shell">
      ${renderTopbar()}
      <main class="page">
        ${state.cloudConfigured && !state.session ? renderAuth() : ""}
        ${!state.cloudConfigured ? renderSetupNotice() : ""}
        ${state.session || !state.cloudConfigured ? (state.view === "home" ? renderHome() : "") : ""}
        ${state.session || !state.cloudConfigured ? (state.view === "library" ? renderLibrary() : "") : ""}
        ${state.session || !state.cloudConfigured ? (state.view === "detail" ? renderDetail() : "") : ""}
        ${state.session || !state.cloudConfigured ? (state.view === "backup" ? renderBackup() : "") : ""}
      </main>
      ${state.modal ? renderModal() : ""}
      ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ""}
    </div>
  `;
}

function renderTopbar() {
  return `
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <div class="brand-mark" aria-hidden="true"><img src="./assets/icons/1.jpg" alt="" /></div>
          <div>
            <h1 class="brand-title">${t("appTitle")}</h1>
            <p class="brand-subtitle">${t("appSubtitle")}</p>
          </div>
        </div>
        <div class="top-actions">
          <nav class="nav-tabs" aria-label="main">
            ${navButton("home", t("home"))}
            ${navButton("library", t("library"))}
            ${navButton("backup", t("backup"))}
          </nav>
          <select class="language-select" data-action="set-lang" aria-label="${t("language")}">
            <option value="zh" ${state.lang === "zh" ? "selected" : ""}>${t("cn")}</option>
            <option value="ja" ${state.lang === "ja" ? "selected" : ""}>${t("jp")}</option>
          </select>
          <span class="chip">${state.cloudConfigured ? t("cloudMode") : t("localMode")}</span>
          ${state.session ? `<span class="chip">${escapeHtml(displayUserName(state.session))}</span><button class="ghost-btn" data-action="sign-out">${t("signOut")}</button>` : ""}
          ${state.session || !state.cloudConfigured ? `<button class="primary-btn" data-action="new-concert">＋ ${t("addConcert")}</button>` : ""}
        </div>
      </div>
    </header>
  `;
}

function renderAuth() {
  const isSignup = state.authMode === "signup";
  return `
    <section class="auth-wrap">
      <div class="panel auth-card">
        <h2>${isSignup ? t("registerTitle") : t("authTitle")}</h2>
        <p class="section-note">${t("authCopy")}</p>
        <form class="auth-form" data-action="auth-form">
          ${
            isSignup
              ? `
                <label class="field">
                  <span>${t("username")}</span>
                  <input type="text" name="username" required autocomplete="username" minlength="2" maxlength="20" placeholder="${t("usernameHint")}" />
                </label>
                <label class="field"><span>${t("email")}</span><input type="email" name="email" required autocomplete="email" /></label>
              `
              : `<label class="field"><span>${t("loginId")}</span><input type="text" name="loginId" required autocomplete="username" /></label>`
          }
          <label class="field"><span>${t("password")}</span><input type="password" name="password" required minlength="6" autocomplete="current-password" /></label>
          <div class="button-row">
            <button class="primary-btn" type="submit">${isSignup ? t("signUp") : t("signIn")}</button>
            <button class="ghost-btn" type="button" data-action="toggle-auth-mode">${isSignup ? t("signIn") : t("signUp")}</button>
          </div>
        </form>
      </div>
    </section>
  `;
}

function renderSetupNotice() {
  return `
    <section class="panel setup-notice">
      <h3>${t("cloudSetupTitle")}</h3>
      <p class="section-note">${t("cloudSetupCopy")}</p>
    </section>
  `;
}

function navButton(view, label) {
  return `<button class="nav-tab ${state.view === view ? "active" : ""}" data-view="${view}">${label}</button>`;
}

function renderHome() {
  const s = stats();
  const latest = state.concerts[0];
  return `
    <section class="hero">
      <div class="hero-stage">
        <div class="hero-content">
          <div>
            <p class="eyebrow">${t("heroEyebrow")}</p>
            <h2>${t("heroTitle")}</h2>
            <p class="hero-copy">${t("heroCopy")}</p>
          </div>
          <div class="hero-bottom">
            <div class="glow-stick-row" aria-hidden="true">
              <svg class="cheer-sign" viewBox="0 0 360 92" role="img" aria-label="cheer light sticks">
                <defs>
                  <filter id="cheerGlow" x="-28%" y="-32%" width="156%" height="164%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <g class="cheer-sign-sticks" filter="url(#cheerGlow)" fill="none" stroke-linecap="round" stroke-width="13">
                  <line class="cheer-stick pink" x1="20" y1="14" x2="52" y2="78" />

                  <line class="cheer-stick blue" x1="100" y1="78" x2="132" y2="14" />
                  <line class="cheer-stick mint" x1="132" y1="14" x2="164" y2="78" />

                  <line class="cheer-stick yellow" x1="210" y1="78" x2="242" y2="14" />
                  <line class="cheer-stick violet" x1="242" y1="14" x2="274" y2="78" />

                  <line class="cheer-stick pink" x1="340" y1="14" x2="308" y2="78" />
                </g>
              </svg>
            </div>
            <button class="primary-btn" data-view="library">${t("library")}</button>
          </div>
        </div>
      </div>
      <aside class="memory-pass">
        <div class="pass-header">
          <h3 class="pass-title">${t("nextArchive")}</h3>
          <span class="pass-code">PASS-${String(s.concerts + 1).padStart(3, "0")}</span>
        </div>
        <div class="pass-lines">
          <div class="pass-line"><span>${t("recentMemory")}</span><strong>${latest ? latest.title : "-"}</strong></div>
          <div class="pass-line"><span>${t("date")}</span><strong>${latest ? formatDate(latest.date) : "-"}</strong></div>
          <div class="pass-line"><span>${t("city")}</span><strong>${latest ? latest.city : "-"}</strong></div>
          <div class="pass-line"><span>${t("latestNote")}</span><strong>${latest ? latest.note : "-"}</strong></div>
        </div>
      </aside>
    </section>

    <section class="stats-grid">
      ${statCard(s.concerts, t("totalLives"))}
      ${statCard(s.cities, t("totalCities"))}
      ${statCard(s.projects, t("totalProjects"))}
    </section>

    <section class="detail-grid">
      <div class="panel">
        <div class="section-head">
          <div>
            <h3>${t("memoryTimeline")}</h3>
            <p class="section-note">${t("libraryNote")}</p>
          </div>
        </div>
        <div class="timeline">
          ${state.concerts.slice(0, 6).map(renderTimelineItem).join("") || renderEmptySmall()}
        </div>
      </div>
      <div class="panel">
        <h3>${t("projectMap")}</h3>
        <div class="project-grid" style="margin-top:14px">
          ${projectCounts().map(renderProjectBar).join("") || renderEmptySmall()}
        </div>
      </div>
    </section>
  `;
}

function statCard(value, label) {
  return `<div class="stat-card"><p class="stat-value">${value}</p><p class="stat-label">${label}</p></div>`;
}

function renderTimelineItem(concert) {
  return `
    <button class="timeline-item" data-action="open-concert" data-id="${concert.id}" style="--theme:${concert.themeColor}">
      <span class="timeline-date">${formatDate(concert.date)}</span>
      <span class="timeline-card"><strong>${escapeHtml(concert.title)}</strong><span class="meta">${escapeHtml(concert.city)} / ${escapeHtml(concert.venue)}</span></span>
    </button>
  `;
}

function renderProjectBar(item) {
  const concert = state.concerts.find((row) => row.project === item.project);
  const percent = Math.max(8, Math.round((item.count / item.max) * 100));
  return `
    <div class="project-bar" style="--theme:${concert?.themeColor || "#ff6f9f"}">
      <div class="pass-line"><span>${escapeHtml(item.project)}</span><strong>${item.count}</strong></div>
      <div class="bar-track"><div class="bar-fill" style="--value:${percent}%"></div></div>
    </div>
  `;
}

function renderLibrary() {
  const concerts = filteredConcerts();
  return `
    <section>
      <div class="section-head">
        <div>
          <h2>${t("libraryTitle")}</h2>
          <p class="section-note">${t("libraryNote")}</p>
        </div>
        <button class="primary-btn" data-action="new-concert">＋ ${t("addConcert")}</button>
      </div>
      ${renderToolbar()}
      ${
        concerts.length
          ? `<div class="concert-grid">${concerts.map(renderConcertCard).join("")}</div>`
          : `<div class="empty-state"><h3>${t("noConcertTitle")}</h3><p>${t("noConcertCopy")}</p><button class="primary-btn" data-action="new-concert">＋ ${t("addConcert")}</button></div>`
      }
    </section>
  `;
}

function renderToolbar() {
  return `
    <div class="toolbar">
      <div class="search-box">
        <input data-action="search" value="${escapeHtml(state.query)}" placeholder="${t("searchPlaceholder")}" />
      </div>
      <select data-action="filter-tag">
        <option value="all">${t("allTags")}</option>
        ${uniqueTags().map((tag) => `<option value="${escapeHtml(tag)}" ${state.tag === tag ? "selected" : ""}>${escapeHtml(tag)}</option>`).join("")}
      </select>
      <select data-action="filter-project">
        <option value="all">${t("allProjects")}</option>
        ${uniqueProjects().map((project) => `<option value="${escapeHtml(project)}" ${state.project === project ? "selected" : ""}>${escapeHtml(project)}</option>`).join("")}
      </select>
    </div>
  `;
}

function renderConcertCard(concert) {
  const cover = state.coverUrls.get(concert.id);
  return `
    <article class="concert-card" style="--theme:${concert.themeColor || "#ff6f9f"}">
      <div class="concert-cover">${cover ? `<img src="${cover}" alt="${escapeHtml(concert.title)}" />` : ""}</div>
      <span class="ticket-notch left"></span><span class="ticket-notch right"></span>
      <div class="concert-body">
        <span class="concert-date">${formatDate(concert.date)}</span>
        <h3>${escapeHtml(concert.title)}</h3>
        <div class="meta">${escapeHtml(concert.project || "-")} · ${escapeHtml(concert.city || "-")} / ${escapeHtml(concert.venue || "-")}</div>
        <p class="note">${escapeHtml(concert.note || "")}</p>
        <div class="tag-list">${list(concert.tags).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
        <div class="card-actions">
          <button class="small-btn" data-action="open-concert" data-id="${concert.id}">${t("open")}</button>
          <span class="button-row">
            <button class="small-btn" data-action="edit-concert" data-id="${concert.id}">${t("edit")}</button>
            <button class="small-btn" data-action="delete-concert" data-id="${concert.id}">${t("delete")}</button>
          </span>
        </div>
      </div>
    </article>
  `;
}

function renderDetail() {
  const concert = state.selectedConcert;
  if (!concert) return renderLibrary();
  const cover = state.coverUrls.get(concert.id) || createObjectUrl(state.selectedMedia.find((media) => media.id === concert.coverMediaId));
  return `
    <button class="ghost-btn" data-view="library">← ${t("back")}</button>
    <section class="detail-hero" style="--theme:${concert.themeColor || "#ff6f9f"}">
      ${cover ? `<img src="${cover}" alt="${escapeHtml(concert.title)}" />` : ""}
      <div class="detail-title">
        <span class="concert-date">${formatDate(concert.date)}</span>
        <h2>${escapeHtml(concert.title)}</h2>
        <div>${escapeHtml(concert.project || "-")} · ${escapeHtml(concert.city || "-")} / ${escapeHtml(concert.venue || "-")}</div>
      </div>
    </section>
    <div class="section-head">
      <div class="chip-row">${list(concert.tags).map((tag) => `<span class="tag" style="--theme:${concert.themeColor}">${escapeHtml(tag)}</span>`).join("")}</div>
      <div class="button-row">
        <button class="ghost-btn" data-action="edit-concert" data-id="${concert.id}">${t("edit")}</button>
        <button class="danger-btn" data-action="delete-concert" data-id="${concert.id}">${t("delete")}</button>
      </div>
    </div>
    <section class="detail-grid">
      <div class="panel">
        <h3>${t("thoughts")}</h3>
        <p class="journal">${escapeHtml(concert.thoughts || concert.note || "")}</p>
      </div>
      <div class="panel">
        <h3>${t("basicInfo")}</h3>
        <div class="info-list" style="margin-top:12px">
          ${infoRow(t("project"), concert.project)}
          ${infoRow(t("date"), formatDate(concert.date))}
          ${infoRow(t("city"), concert.city)}
          ${infoRow(t("venue"), concert.venue)}
          ${infoRow(t("address"), concert.address)}
          ${infoRow(t("favoriteSong"), concert.favoriteSong)}
        </div>
      </div>
      <div class="panel">
        <h3>${t("setlist")}</h3>
        <ol class="setlist" style="margin-top:12px">
          ${list(concert.setlist).map((song) => `<li class="${song === concert.favoriteSong ? "favorite" : ""}">${escapeHtml(song)}</li>`).join("") || `<li>-</li>`}
        </ol>
      </div>
      <div class="panel">
        <h3>${t("ticketSeat")}</h3>
        <div class="info-list" style="margin-top:12px">
          ${infoRow(t("ticketInfo"), concert.ticketInfo)}
          ${infoRow(t("seatInfo"), concert.seatInfo)}
        </div>
      </div>
      <div class="panel">
        <h3>${t("merch")}</h3>
        ${bulletList(concert.merch)}
      </div>
      <div class="panel">
        <h3>${t("companions")}</h3>
        ${bulletList(concert.companions)}
      </div>
      <div class="panel">
        <h3>${t("schedule")}</h3>
        ${bulletList(concert.schedule)}
      </div>
      <div class="panel">
        <h3>${t("fragments")}</h3>
        <div class="memory-fragments" style="margin-top:12px">
          ${list(concert.memorableMoments).map((item) => `<div class="fragment">${escapeHtml(item)}</div>`).join("") || renderEmptySmall()}
        </div>
      </div>
    </section>
    <section class="panel" style="margin-top:14px">
      <div class="section-head">
        <div>
          <h3>${t("mediaAlbum")}</h3>
          <p class="section-note">${t("noMedia")}</p>
        </div>
        <label class="primary-btn">
          ${t("imageOnly")}
          <input class="hidden" type="file" multiple accept="image/*" data-action="upload-media" data-id="${concert.id}" />
        </label>
      </div>
      ${renderMediaGrid()}
      ${renderExternalVideos(concert)}
    </section>
  `;
}

function infoRow(label, value) {
  return `<div class="info-row"><span>${label}</span><strong>${escapeHtml(value || "-")}</strong></div>`;
}

function bulletList(items) {
  const rows = list(items);
  if (!rows.length) return `<p class="section-note">-</p>`;
  return `<div class="tag-list">${rows.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("")}</div>`;
}

function renderSelectedTagTokens(tags) {
  return tags
    .map(
      (tag) => `
        <span class="tag-token">
          ${escapeHtml(tag)}
          <button type="button" data-action="remove-form-tag" data-tag="${escapeHtml(tag)}" aria-label="remove ${escapeHtml(tag)}">×</button>
        </span>
      `,
    )
    .join("");
}

function renderPresetTags(selectedTags) {
  const selected = new Set(selectedTags);
  const presets = uniqueTags();
  if (!presets.length) return `<span class="section-note">${t("noTagPresets")}</span>`;
  return presets
    .map(
      (tag) => `
        <button type="button" class="preset-tag ${selected.has(tag) ? "active" : ""}" data-action="add-form-tag" data-tag="${escapeHtml(tag)}">
          ${escapeHtml(tag)}
        </button>
      `,
    )
    .join("");
}

function tagEditor(tags = []) {
  const selectedTags = list(tags);
  return `
    <div class="field full tag-editor">
      <span>${t("tags")}</span>
      <input type="hidden" name="tags" value="${escapeHtml(joinLines(selectedTags))}" />
      <div class="tag-input-box">
        <span class="selected-tags">${renderSelectedTagTokens(selectedTags)}</span>
        <input data-action="tag-input" placeholder="${t("tagInputPlaceholder")}" autocomplete="off" />
      </div>
      <div>
        <span class="field-label">${t("tagPresets")}</span>
        <div class="preset-tags">${renderPresetTags(selectedTags)}</div>
      </div>
    </div>
  `;
}

function renderMediaGrid() {
  if (!state.selectedMedia.length) return `<div class="empty-state"><p>${t("noMedia")}</p></div>`;
  return `
    <div class="media-grid">
      ${state.selectedMedia.map((media) => {
        const url = mediaUrl(media);
        return `
          <article class="media-card">
            <div class="media-preview">
              ${
                url
                  ? `<img src="${url}" alt="${escapeHtml(media.caption || media.fileName)}" />`
                  : `<span>${escapeHtml(media.fileName || media.caption || "Media metadata")}</span>`
              }
            </div>
            <div class="media-caption">
              <input value="${escapeHtml(media.caption || "")}" placeholder="${t("caption")}" data-action="caption-media" data-id="${media.id}" />
            </div>
            <div class="media-actions">
              <button class="small-btn" data-action="set-cover" data-id="${media.id}">${t("setCover")}</button>
              <button class="small-btn" data-action="delete-media" data-id="${media.id}">${t("delete")}</button>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderExternalVideos(concert) {
  const videos = list(concert.externalVideos);
  if (!videos.length) return "";
  return `
    <div class="section-head"><h3>${t("externalVideos")}</h3></div>
    <div class="tag-list">${videos.map((url) => `<a class="chip" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>`).join("")}</div>
  `;
}

function renderBackup() {
  return `
    <section class="panel backup-panel">
      <div>
        <h2>${t("backupTitle")}</h2>
        <p class="section-note">${t("backupCopy")}</p>
      </div>
      <div class="button-row">
        <button class="primary-btn" data-action="export-lite">${t("exportLite")}</button>
        <button class="ghost-btn" data-action="export-full">${t("exportFull")}</button>
      </div>
      <div class="media-drop">
        <strong>${t("importMerge")} / ${t("importReplace")}</strong>
        <input type="file" accept="application/json,.json" data-action="choose-import" />
        <div class="button-row">
          <button class="ghost-btn" data-action="import-merge">${t("importMerge")}</button>
          <button class="danger-btn" data-action="import-replace">${t("importReplace")}</button>
        </div>
      </div>
    </section>
  `;
}

function renderModal() {
  const concert = state.modal.concert;
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="concert-form-title" data-modal-card>
        <div class="modal-head">
          <h2 id="concert-form-title">${concert.id ? t("edit") : t("addConcert")}</h2>
          <button class="icon-btn" data-action="close-modal" aria-label="${t("close")}">×</button>
        </div>
        <form class="modal-body" data-action="save-concert-form">
          <input type="hidden" name="id" value="${concert.id || ""}" />
          <div class="form-grid">
            ${field("title", t("title"), concert.title, true)}
            ${field("project", t("project"), concert.project)}
            ${field("date", t("date"), concert.date, false, "date")}
            ${field("themeColor", t("themeColor"), concert.themeColor, false, "select")}
            ${field("city", t("city"), concert.city)}
            ${field("venue", t("venue"), concert.venue)}
            ${field("address", t("address"), concert.address, false, "text", "full")}
            ${tagEditor(concert.tags)}
            ${field("note", t("note"), concert.note, false, "textarea", "full")}
            ${field("thoughts", t("thoughts"), concert.thoughts, false, "textarea", "full")}
            ${field("favoriteSong", t("favoriteSong"), concert.favoriteSong)}
            ${field("setlist", t("setlist"), joinLines(concert.setlist), false, "textarea", "full")}
            ${field("ticketInfo", t("ticketInfo"), concert.ticketInfo)}
            ${field("seatInfo", t("seatInfo"), concert.seatInfo)}
            ${field("merch", t("merch"), joinLines(concert.merch), false, "textarea")}
            ${field("companions", t("companions"), joinLines(concert.companions), false, "textarea")}
            ${field("schedule", t("schedule"), joinLines(concert.schedule), false, "textarea", "full")}
            ${field("memorableMoments", t("memorableMoments"), joinLines(concert.memorableMoments), false, "textarea", "full")}
            ${field("externalVideos", t("externalVideos"), joinLines(concert.externalVideos), false, "textarea", "full")}
          </div>
          <div class="button-row" style="justify-content:flex-end;margin-top:18px">
            <button type="button" class="ghost-btn" data-action="close-modal">${t("cancel")}</button>
            <button class="primary-btn" type="submit">${t("save")}</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function field(name, label, value = "", required = false, type = "text", extraClass = "") {
  if (type === "textarea") {
    return `<label class="field ${extraClass}"><span>${label}</span><textarea name="${name}" ${required ? "required" : ""}>${escapeHtml(value || "")}</textarea></label>`;
  }
  if (type === "select") {
    return `<label class="field ${extraClass}"><span>${label}</span><select name="${name}">${colorOptions(value || themeColors[0].value)}</select></label>`;
  }
  return `<label class="field ${extraClass}"><span>${label}</span><input name="${name}" type="${type}" value="${escapeHtml(value || "")}" ${required ? "required" : ""} /></label>`;
}

function renderEmptySmall() {
  return `<p class="section-note">-</p>`;
}

function showToast(message) {
  state.toast = message;
  render();
  setTimeout(() => {
    state.toast = "";
    render();
  }, 2200);
}

function getTagEditor(source) {
  return source.closest(".tag-editor");
}

function getFormTags(source) {
  const editor = getTagEditor(source);
  const hidden = editor?.querySelector('input[name="tags"]');
  return splitLines(hidden?.value || "");
}

function setFormTags(source, tags) {
  const editor = getTagEditor(source);
  if (!editor) return;
  const cleanTags = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  const hidden = editor.querySelector('input[name="tags"]');
  const selected = editor.querySelector(".selected-tags");
  const presets = editor.querySelector(".preset-tags");
  const input = editor.querySelector('[data-action="tag-input"]');

  hidden.value = joinLines(cleanTags);
  selected.innerHTML = renderSelectedTagTokens(cleanTags);
  presets.innerHTML = renderPresetTags(cleanTags);
  input.value = "";
}

function addFormTag(source, value) {
  const incoming = splitLines(value);
  if (!incoming.length) return;
  setFormTags(source, [...getFormTags(source), ...incoming]);
}

function removeFormTag(source, tag) {
  setFormTags(
    source,
    getFormTags(source).filter((item) => item !== tag),
  );
}

function emptyConcert() {
  return {
    title: "",
    project: "",
    date: new Date().toISOString().slice(0, 10),
    city: "",
    venue: "",
    address: "",
    themeColor: themeColors[0].value,
    tags: [],
    note: "",
    thoughts: "",
    favoriteSong: "",
    setlist: [],
    ticketInfo: "",
    seatInfo: "",
    merch: [],
    companions: [],
    schedule: [],
    memorableMoments: [],
    externalVideos: [],
  };
}

async function openConcert(id) {
  state.selectedId = id;
  state.view = "detail";
  await refreshData();
  render();
}

async function saveForm(form) {
  const tagInput = form.querySelector('[data-action="tag-input"]');
  if (tagInput?.value.trim()) addFormTag(tagInput, tagInput.value);

  const data = new FormData(form);
  const existing = data.get("id") ? await getConcertData(data.get("id")) : {};
  const concert = {
    ...existing,
    id: data.get("id") || undefined,
    title: data.get("title").trim(),
    project: data.get("project").trim(),
    date: data.get("date"),
    city: data.get("city").trim(),
    venue: data.get("venue").trim(),
    address: data.get("address").trim(),
    themeColor: data.get("themeColor"),
    tags: splitLines(data.get("tags")),
    note: data.get("note").trim(),
    thoughts: data.get("thoughts").trim(),
    favoriteSong: data.get("favoriteSong").trim(),
    setlist: splitLines(data.get("setlist")),
    ticketInfo: data.get("ticketInfo").trim(),
    seatInfo: data.get("seatInfo").trim(),
    merch: splitLines(data.get("merch")),
    companions: splitLines(data.get("companions")),
    schedule: splitLines(data.get("schedule")),
    memorableMoments: splitLines(data.get("memorableMoments")),
    externalVideos: splitLines(data.get("externalVideos")),
  };
  const saved = await saveConcertData(concert);
  state.modal = null;
  state.selectedId = saved.id;
  await refreshData();
  render();
  showToast(t("saved"));
}

async function handleFiles(input) {
  const concertId = input.dataset.id;
  const files = [...input.files].filter((file) => file.type.startsWith("image/"));
  for (const file of files) {
    const saved = useCloud()
      ? await uploadImageCloud(concertId, file)
      : await saveMediaLocal({
          concertId,
          type: "image",
          fileName: file.name,
          caption: file.name.replace(/\.[^.]+$/, ""),
          blob: file,
        });
    const concert = await getConcertData(concertId);
    if (!concert.coverMediaId) {
      await saveConcertData({ ...concert, coverMediaId: saved.id });
    }
  }
  await refreshData();
  render();
  showToast(t("saved"));
}

async function updateMediaCaption(input) {
  const media = await getMediaData(input.dataset.id);
  if (!media) return;
  if (useCloud()) {
    await updateMediaCaptionCloud(media.id, input.value);
  } else {
    await saveMediaLocal({ ...media, caption: input.value });
  }
  await refreshData();
}

async function exportData(includeMedia) {
  const backup = useCloud()
    ? {
        app: "niou-live-memory-archive",
        version: 1,
        exportedAt: new Date().toISOString(),
        includesMedia: false,
        concerts: state.concerts,
        media: state.allMedia.map(({ url, ...item }) => item),
      }
    : await exportBackupLocal(includeMedia);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadJson(`live-memory-${includeMedia ? "full" : "lite"}-${stamp}.json`, backup);
  showToast(t("exported"));
}

async function readImportFile() {
  const input = document.querySelector('[data-action="choose-import"]');
  const file = input?.files?.[0];
  if (!file) throw new Error("No file selected");
  return JSON.parse(await file.text());
}

app.addEventListener("click", async (event) => {
  const actionEl = event.target.closest("[data-action], [data-view]");
  if (!actionEl) return;

  if (actionEl.dataset.modalCard) return;

  const action = actionEl.dataset.action;
  const view = actionEl.dataset.view;

  if (view) {
    state.view = view;
    if (view !== "detail") state.selectedId = null;
    await refreshData();
    render();
    return;
  }

  if (action === "new-concert") {
    state.modal = { concert: emptyConcert() };
    render();
  }

  if (action === "toggle-auth-mode") {
    state.authMode = state.authMode === "signup" ? "signin" : "signup";
    render();
  }

  if (action === "sign-out") {
    await signOut();
    state.session = null;
    state.concerts = [];
    state.allMedia = [];
    state.selectedId = null;
    state.view = "home";
    render();
  }

  if (action === "edit-concert") {
    const concert = await getConcertData(actionEl.dataset.id);
    state.modal = { concert };
    render();
  }

  if (action === "open-concert") {
    await openConcert(actionEl.dataset.id);
  }

  if (action === "delete-concert") {
    if (!confirm(t("confirmDelete"))) return;
    await deleteConcertData(actionEl.dataset.id);
    state.selectedId = null;
    state.view = "library";
    await refreshData();
    render();
    showToast(t("deleted"));
  }

  if (action === "close-modal") {
    if (event.target.closest("[data-modal-card]") && !event.target.closest(".icon-btn,.ghost-btn")) return;
    state.modal = null;
    render();
  }

  if (action === "add-form-tag") {
    addFormTag(actionEl, actionEl.dataset.tag);
  }

  if (action === "remove-form-tag") {
    removeFormTag(actionEl, actionEl.dataset.tag);
  }

  if (action === "set-cover") {
    const concert = await getConcertData(state.selectedId);
    await saveConcertData({ ...concert, coverMediaId: actionEl.dataset.id });
    await refreshData();
    render();
    showToast(t("coverUpdated"));
  }

  if (action === "delete-media") {
    await deleteMediaData(actionEl.dataset.id);
    const concert = await getConcertData(state.selectedId);
    if (concert?.coverMediaId === actionEl.dataset.id) {
      await saveConcertData({ ...concert, coverMediaId: "" });
    }
    await refreshData();
    render();
    showToast(t("deleted"));
  }

  if (action === "export-lite") await exportData(false);
  if (action === "export-full") await exportData(true);

  if (action === "import-merge") {
    if (useCloud()) {
      showToast("云同步模式暂不支持 JSON 导入，请先用本地版整理后再迁移。");
      return;
    }
    const payload = await readImportFile();
    await importBackupLocal(payload, "merge");
    await refreshData();
    render();
    showToast(t("imported"));
  }

  if (action === "import-replace") {
    if (useCloud()) {
      showToast("云同步模式暂不支持覆盖导入。");
      return;
    }
    if (!confirm(t("confirmReplace"))) return;
    const payload = await readImportFile();
    await importBackupLocal(payload, "replace");
    await refreshData();
    render();
    showToast(t("imported"));
  }
});

app.addEventListener("submit", async (event) => {
  const authForm = event.target.closest('[data-action="auth-form"]');
  if (authForm) {
    event.preventDefault();
    const data = new FormData(authForm);
    const mode = state.authMode;
    try {
      state.busy = true;
      let session;
      if (mode === "signup") {
        const username = validateUsername(data.get("username"));
        session = await signUp(data.get("email").trim().toLowerCase(), data.get("password"), username);
      } else {
        const email = await resolveLoginIdentifier(data.get("loginId"));
        session = await signIn(email, data.get("password"));
      }
      state.session = session || (await getSession());
      if (state.session) {
        await refreshData();
      }
      render();
      showToast(mode === "signup" ? t("signUp") : t("signIn"));
    } catch (error) {
      showToast(error.message || String(error));
    } finally {
      state.busy = false;
    }
    return;
  }

  const form = event.target.closest('[data-action="save-concert-form"]');
  if (!form) return;
  event.preventDefault();
  await saveForm(form);
});

app.addEventListener("input", async (event) => {
  const target = event.target;
  if (target.dataset.action === "search") {
    state.query = target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 160);
  }
});

app.addEventListener("keydown", (event) => {
  const target = event.target;
  if (target.dataset.action !== "tag-input") return;
  if (event.key !== "Enter" || event.isComposing) return;
  event.preventDefault();
  addFormTag(target, target.value);
});

app.addEventListener("focusout", (event) => {
  const target = event.target;
  if (target.dataset.action !== "tag-input") return;
  if (target.value.trim()) addFormTag(target, target.value);
});

app.addEventListener("change", async (event) => {
  const target = event.target;
  const action = target.dataset.action;

  if (action === "set-lang") {
    state.lang = target.value;
    await setSetting("lang", state.lang);
    render();
  }

  if (action === "filter-tag") {
    state.tag = target.value;
    render();
  }

  if (action === "filter-project") {
    state.project = target.value;
    render();
  }

  if (action === "upload-media") {
    await handleFiles(target);
  }

  if (action === "caption-media") {
    await updateMediaCaption(target);
    showToast(t("saved"));
  }
});

async function init() {
  state.lang = await getSetting("lang", "zh");
  state.cloudConfigured = isSupabaseConfigured();
  if (state.cloudConfigured) {
    state.session = await getSession();
    if (state.session) {
      await ensureProfile(state.session);
    }
  }
  await seedIfNeeded();
  if (state.session || !state.cloudConfigured) {
    await refreshData();
  }
  render();
}

init().catch((error) => {
  console.error(error);
  app.innerHTML = `<div class="empty-state"><h3>启动失败</h3><p>${escapeHtml(error.message)}</p></div>`;
});
