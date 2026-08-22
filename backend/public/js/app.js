// 棋伴 App — Complete Application Logic
let currentView = "dashboard", ws = null, pvpRoomId = "", pvpFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", pvpSelected = "", pvpMyColor = "";
let problems = [], currentProblem = null, hintIdx = 0, practiceSelected = "", lastPracticeAnswer = "";
let matchId = "", battleFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", battleSelected = "", moves = [];
let lastBattleEngineMove = null;
let dailyMissions = [];
let rankTab = "global", currentSection = null, bindTimer = null;
let editorFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", selectedPiece = "K", currentClassId = "";
const BATTLE_LEVELS = [
  { tier: 1, label: "1档 启蒙", difficulty: 1, hint: "AI 会明显放慢节奏，适合刚学走法和吃子的孩子。" },
  { tier: 2, label: "2档 入门", difficulty: 2, hint: "AI 会偶尔送子，也常常只顾自己走，适合第一次完整下棋。" },
  { tier: 3, label: "3档 练习", difficulty: 4, hint: "会开始看吃子和将军，但还是会漏掉很多机会。" },
  { tier: 4, label: "4档 挑战", difficulty: 7, hint: "会做基础攻击和防守，适合已经会基本战术的小朋友。" },
  { tier: 5, label: "5档 进阶", difficulty: 11, hint: "会更认真地保护棋子，也会主动找连续威胁。" },
  { tier: 6, label: "6档 小冠军", difficulty: 16, hint: "已经接近认真训练强度，适合长期练习后的挑战。" },
];
const PIECES_FULL = { K:"♔",Q:"♕",R:"♖",B:"♗",N:"♘",P:"♙",k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟",".":"·" };
const VOICE_PRESETS = {
  story: { labelKey: "storySister", rate: 0.86, pitch: 1.08, hintKey: "storyHint" },
  child: { labelKey: "childPlayer", rate: 0.95, pitch: 1.18, hintKey: "childHint" },
  buddy: { labelKey: "energyBuddy", rate: 1.03, pitch: 1.16, hintKey: "buddyHint" },
  coach: { labelKey: "patientCoach", rate: 0.88, pitch: 0.92, hintKey: "coachHint" },
};
let speechVoices = [];
let audioCtx = null;

// ── Init ──
if (!API.autoLogin()) { location.href = "/"; }
document.getElementById("userInfo").textContent = API.user.displayName;
const myRank = getRank(API.user.points || 0);
document.getElementById("greeting").textContent = t("welcomeBack", { name: API.user.displayName });
document.getElementById("rankLine").textContent = myRank.piece + " " + myRank.title + " · " + (API.user.points||0) + t("points");
updateRoleNav();
initDash();
initVoiceSettings();
connectWs();
loadVariants();
initBattleDifficulty();
if (API.user.role === "student") fetchBindCodeDisplay();

// ── Navigation ──
function updateRoleNav() {
  const r = API.user.role;
  document.getElementById("navClassTeacher").style.display = r === "teacher" ? "" : "none";
  document.getElementById("navClassStudent").style.display = (r === "student" || r === "parent") ? "" : "none";
  document.getElementById("navParent").style.display = r === "parent" ? "" : "none";
}

function navTo(view) {
  currentView = view;
  if (view === "arena" || view === "bind") return; // handled by delegation
  document.querySelectorAll("[id^='view-']").forEach(el => el.style.display = "none");
  const t = document.getElementById("view-" + view);
  if (t) t.style.display = "";
  else { navTo("dashboard"); return; } // fallback
  if (view === "dashboard" && API.user.role === "student") loadDailyMissions();
  if (view === "learn") initLearn();
  if (view === "rankings") { renderRankRules(); loadRankings(); }
  if (view === "friends") { loadFriends(); loadFriendRequests(); }
  if (view === "parent") loadMyChildren();
  if (view === "classTeacher") loadTeacherClasses();
  if (view === "classStudent") loadStudentClasses();
}

document.getElementById("topNav").addEventListener("click", e => {
  const a = e.target.closest("[data-nav]");
  if (a) { e.preventDefault(); navTo(a.dataset.nav); }
});

// ── Dashboard ──
function initDash() {
  updateRankDisplay();
  const cards = [
    { icon:"📚", title:t("learningCenter"), desc:"Openings · Middlegame · Endgame", view:"learn" },
    { icon:"⚔", title:t("practiceCenter"), desc:"300+ · AI", view:"practice" },
    { icon:"♛", title:t("aiBattle"), desc:"Stockfish", view:"battle" },
    { icon:"👥", title:t("pvpBattle"), desc:"Live · Timer", view:"pvp" },
    { icon:"🏟", title:t("arenaTitle"), desc:"Match · Fair play", view:"arena", action:true },
    { icon:"🏆", title:t("rankingTitle"), desc:"Points · Practice · Battle", view:"rankings" },
    { icon:"💬", title:t("friendTitle"), desc:"Chat · Challenge", view:"friends" },
  ];
  if (API.user.role === "student") cards.push({ icon:"🔗", title:t("bindParent"), desc:"6-digit code", view:"bind", action:true });
  if (API.user.role === "student" || API.user.role === "parent") cards.push({ icon:"📖", title:t("myClass"), desc:"Class · Homework", view:"classStudent" });
  if (API.user.role === "teacher") cards.push({ icon:"🏫", title:t("classManagement"), desc:"Class · Homework", view:"classTeacher" });
  if (API.user.role === "parent") cards.push({ icon:"👨‍👩‍👧", title:t("parentCenter"), desc:"Reports · Plans", view:"parent" });

  document.getElementById("dashGrid").innerHTML = cards.map(c => `
    <div class="dash-card" data-view="${c.view}">
      <div class="icon">${c.icon}</div><h3>${c.title}</h3><p>${c.desc}</p>
    </div>`).join("");
  if (API.user.role === "student") loadDailyMissions();
  else {
    const card = document.getElementById("dailyMissionCard");
    if (card) card.style.display = "none";
  }
}

function missionIcon(type) {
  if (type === "login") return "🌞";
  if (type === "solve_count") return "📝";
  if (type === "battle_count") return "♟";
  return "⭐";
}

function renderDailyMissions(date) {
  const card = document.getElementById("dailyMissionCard");
  if (!card) return;
  card.style.display = "";
  card.innerHTML = `
    <div class="mission-card">
      <div class="mission-head">
        <div>
          <h3>✅ 每日任务</h3>
          <p>${date} 自动更新。做完一项就会打勾，还能领积分。</p>
        </div>
        <button class="btn btn-ghost" onclick="loadDailyMissions()">刷新</button>
      </div>
      <div class="mission-list">
        ${dailyMissions.map(function(mission) {
          const done = mission.completed || mission.claimed;
          const action = mission.claimed
            ? `<span class="mission-check">✓</span>`
            : mission.completed
              ? `<button class="btn btn-primary" onclick="claimMission('${mission.id}')">领 ${mission.pointsReward} 分</button>`
              : `<span class="mission-chip">${mission.progress}/${mission.condition.threshold}</span>`;
          return `
            <div class="mission-item ${done ? "done" : ""}">
              <div class="mission-badge">${missionIcon(mission.condition.type)}</div>
              <div class="mission-main">
                <h4>${esc(mission.name)}</h4>
                <p>${esc(mission.description)}</p>
                <div class="mission-meta">
                  <span class="mission-chip">奖励 ${mission.pointsReward} 分</span>
                  <span class="mission-chip">${mission.completed ? "已完成" : "进行中"}</span>
                </div>
              </div>
              <div>${action}</div>
            </div>`;
        }).join("") || `<div class="feed">今天还没有任务，稍后再来看看。</div>`}
      </div>
    </div>`;
}

async function loadDailyMissions() {
  if (API.user.role !== "student") return;
  const card = document.getElementById("dailyMissionCard");
  if (card) {
    card.style.display = "";
    card.innerHTML = `<div class="mission-card"><div class="feed">⏳ 正在加载今天的任务...</div></div>`;
  }
  try {
    const data = await API.req("/missions/today");
    dailyMissions = data.missions || [];
    renderDailyMissions(data.date || new Date().toISOString().slice(0, 10));
  } catch (e) {
    if (card) {
      card.style.display = "";
      card.innerHTML = `<div class="mission-card"><div class="feed">加载任务失败：${esc(e.message)}</div></div>`;
    }
  }
}

async function claimMission(missionId) {
  try {
    const result = await API.req("/missions/claim", "POST", { missionId: missionId });
    toast("积分领取成功");
    if (typeof result.points === "number") API.user.points = result.points;
    updateRankDisplay();
    await loadDailyMissions();
  } catch (e) {
    toast(e.message);
  }
}

function initVoiceSettings() {
  const el = document.getElementById("voiceSettings");
  if (!el) return;
  const supported = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  if (!supported) {
    el.innerHTML = `<div class="voice-panel"><h3>🔊 ${t("voiceTitle")}</h3><div style="font-size:13px;color:var(--muted);">${t("voiceUnsupported")}</div></div>`;
    return;
  }
  const saved = JSON.parse(localStorage.getItem("ct_voice_settings") || "{}");
  el.innerHTML = `
    <div class="voice-panel">
      <h3>🔊 ${t("voiceTitle")}</h3>
      <div class="voice-note">${t("voiceNote")}</div>
      <div class="voice-grid">
        <div class="voice-field">
          <label>${t("voiceStyle")}</label>
          <select id="voicePreset">
            ${Object.entries(VOICE_PRESETS).map(([k,v]) => `<option value="${k}">${t(v.labelKey)}</option>`).join("")}
          </select>
        </div>
        <div class="voice-field">
          <label>${t("systemVoice")}</label>
          <select id="voiceSelect"><option value="">${t("autoVoice")}</option></select>
        </div>
        <div class="voice-field">
          <label>${t("voiceRate")} <span id="voiceRateText"></span></label>
          <input id="voiceRate" type="range" min="0.7" max="1.35" step="0.05">
        </div>
        <div class="voice-field">
          <label>${t("voiceNatural")} <span id="voicePitchText"></span></label>
          <input id="voicePitch" type="range" min="0.85" max="1.25" step="0.05">
        </div>
        <div class="voice-field" style="flex:0 0 auto;align-self:end;">
          <button class="btn btn-ghost" type="button" onclick="testVoice()">${t("testVoice")}</button>
        </div>
        <div class="voice-field" style="flex:0 0 auto;align-self:end;">
          <button class="btn btn-ghost" type="button" onclick="playUiSound('correct')">${t("testSound")}</button>
        </div>
      </div>
      <div id="voiceHint" class="voice-hint"></div>
    </div>`;
  document.getElementById("voicePreset").value = saved.preset || "story";
  applyVoicePreset(false);
  if (saved.rate) document.getElementById("voiceRate").value = saved.rate;
  if (saved.pitch) document.getElementById("voicePitch").value = saved.pitch;
  document.getElementById("voicePreset").addEventListener("change", () => applyVoicePreset(true));
  ["voiceSelect", "voiceRate", "voicePitch"].forEach(id => document.getElementById(id).addEventListener("change", saveVoiceSettings));
  ["voiceRate", "voicePitch"].forEach(id => document.getElementById(id).addEventListener("input", updateVoiceLabels));
  loadSpeechVoices(saved.voice || "");
  updateVoiceLabels();
}

function loadSpeechVoices(preferred) {
  if (!("speechSynthesis" in window)) return;
  speechVoices = speechSynthesis.getVoices();
  const select = document.getElementById("voiceSelect");
  if (!select) return;
  const chinese = speechVoices.filter(v => /^zh|Chinese|普通话|国语|中文/i.test(`${v.lang} ${v.name}`));
  const list = chinese.length ? chinese : speechVoices;
  select.innerHTML = `<option value="">${t("autoVoice")}</option>` + list.map(v => `<option value="${esc(v.name)}">${esc(v.name)} · ${esc(v.lang)}</option>`).join("");
  if (preferred) select.value = preferred;
  saveVoiceSettings();
}

if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = () => {
    const saved = JSON.parse(localStorage.getItem("ct_voice_settings") || "{}");
    loadSpeechVoices(saved.voice || "");
  };
}

function applyVoicePreset(save) {
  const presetKey = document.getElementById("voicePreset")?.value || "story";
  const preset = VOICE_PRESETS[presetKey] || VOICE_PRESETS.story;
  const rate = document.getElementById("voiceRate");
  const pitch = document.getElementById("voicePitch");
  if (rate) rate.value = preset.rate;
  if (pitch) pitch.value = preset.pitch;
  const hint = document.getElementById("voiceHint");
  if (hint) hint.textContent = preset.hintKey ? t(preset.hintKey) : "";
  updateVoiceLabels();
  if (save) saveVoiceSettings();
}

function updateVoiceLabels() {
  const rate = document.getElementById("voiceRate")?.value || "1";
  const pitch = document.getElementById("voicePitch")?.value || "1";
  const rt = document.getElementById("voiceRateText");
  const pt = document.getElementById("voicePitchText");
  if (rt) rt.textContent = `${rate}x`;
  if (pt) pt.textContent = pitch;
}

function saveVoiceSettings() {
  const settings = {
    preset: document.getElementById("voicePreset")?.value || "story",
    voice: document.getElementById("voiceSelect")?.value || "",
    rate: Number(document.getElementById("voiceRate")?.value || 1),
    pitch: Number(document.getElementById("voicePitch")?.value || 1),
  };
  localStorage.setItem("ct_voice_settings", JSON.stringify(settings));
}

function cleanSpeechText(text) {
  const div = document.createElement("div");
  div.innerHTML = String(text || "");
  return (div.textContent || div.innerText || "")
    .replace(/[♔♕♖♗♘♙♚♛♜♝♞♟]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function speakText(text) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    toast(t("speechNotSupported"));
    return;
  }
  const content = cleanSpeechText(text);
  if (!content) { toast(t("noSpeechContent")); return; }
  playUiSound("speak");
  saveVoiceSettings();
  const settings = JSON.parse(localStorage.getItem("ct_voice_settings") || "{}");
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(content);
  utterance.lang = "zh-CN";
  utterance.rate = Number(settings.rate || 1);
  utterance.pitch = Number(settings.pitch || 1);
  const preferred = settings.voice;
  const voice = speechVoices.find(v => v.name === preferred) || speechVoices.find(v => /^zh/i.test(v.lang)) || null;
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
}

function stopSpeech() {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}

function speakButton(text) {
  const encoded = encodeURIComponent(text || "").replace(/'/g, "%27");
  return ` <button class="btn btn-ghost speak-btn" onclick="speakText(decodeURIComponent('${encoded}'))">🔊 ${t("speak")}</button><button class="btn btn-ghost speak-btn" onclick="stopSpeech()">${t("stop")}</button>`;
}

function testVoice() {
  playUiSound("correct");
  speakText(t("sampleVoice"));
}

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function tone(ctx, freq, start, duration, opts = {}) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = opts.type || "sine";
  osc.frequency.setValueAtTime(freq, start);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(opts.volume || 0.16, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function playUiSound(kind) {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    if (kind === "correct") {
      tone(ctx, 523, now, 0.1, { type: "sine", volume: 0.055 });
      tone(ctx, 659, now + 0.09, 0.12, { type: "sine", volume: 0.06 });
      tone(ctx, 784, now + 0.18, 0.16, { type: "triangle", volume: 0.055 });
    } else if (kind === "wrong") {
      tone(ctx, 330, now, 0.1, { type: "sine", to: 294, volume: 0.045 });
      tone(ctx, 247, now + 0.1, 0.12, { type: "sine", volume: 0.04 });
    } else if (kind === "level") {
      [523, 659, 784, 988].forEach((f, i) => tone(ctx, f, now + i * 0.09, 0.14, { type: "sine", volume: 0.065 }));
    } else if (kind === "speak") {
      tone(ctx, 440, now, 0.08, { type: "sine", volume: 0.04 });
    }
  } catch (_) {}
}

document.addEventListener("click", e => {
  const card = e.target.closest(".dash-card");
  if (!card) return;
  const view = card.dataset.view;
  if (view === "arena") { joinArena(); return; }
  if (view === "bind") { generateBindCode(); return; }
  if (view) navTo(view);
});

// ── Learning ──
function initLearn() {
  const secs = [
    { key:"principles", icon:"🏰", title:"开局原则", desc:"中心·出子·王安全" },
    { key:"openings", icon:"📖", title:"经典开局", desc:"意大利·西班牙·伦敦" },
    { key:"middlegame", icon:"⚡", title:"中局策略", desc:"子力活跃·兵形·进攻" },
    { key:"endgame", icon:"🏁", title:"残局基础", desc:"杀王·对王·通路兵" },
    { key:"traps", icon:"🎯", title:"常见陷阱", desc:"四步杀·勒加尔" },
  ];
  document.getElementById("learnSections").innerHTML = secs.map(s => `
    <div class="dash-card" onclick="showLearnSection('${s.key}')"><div class="icon">${s.icon}</div><h3>${s.title}</h3><p>${s.desc}</p></div>`).join("");
  document.getElementById("learnDetail").style.display = "none";
  document.getElementById("learnSections").style.display = "";
}

function showLearnSection(key) {
  currentSection = key;
  document.getElementById("learnSections").style.display = "none";
  document.getElementById("learnDetail").style.display = "";
  const topics = LEARNING_TOPICS.filter(t => t.category === key);
  document.getElementById("learnTopicList").innerHTML = topics.map((t,i) => `<div class="list-item" style="cursor:pointer;" onclick="showTopic('${key}',${i})">${t.title}</div>`).join("");
  if (topics.length) showTopic(key, 0);
}

function showTopic(key, idx) {
  const t = LEARNING_TOPICS.filter(x => x.category === key)[idx];
  document.getElementById("learnContent").innerHTML = t.content;
  const bd = document.getElementById("learnBoard");
  if (t.keyFen) { bd.style.display = ""; renderBoard(bd, t.keyFen, "", ()=>{}); }
  else bd.style.display = "none";
  document.getElementById("learnTips").innerHTML = (t.tips||[]).map(tip => `<span class="tag">💡 ${esc(tip)}</span>`).join("");
}

function backToLearn() {
  document.getElementById("learnDetail").style.display = "none";
  document.getElementById("learnSections").style.display = "";
}

// ── Practice ──
async function loadProblems() {
  try { const d = await API.req("/problems/list"); problems = d.items||[]; currentProblem=problems[0]||null; document.getElementById("problemMeta").innerHTML=`共 <b>${problems.length}</b> 题`; renderProbList(); renderProblem(); } catch(e) { toast(e.message); }
}
function renderProbList() {
  document.getElementById("problemList").innerHTML = problems.map((p,i) => `<div class="list-item" style="cursor:pointer;${currentProblem&&currentProblem.id===p.id?'background:rgba(255,255,255,.1);':''}" onclick="selectProblem(${i})">${String(i+1).padStart(2,"0")}·${p.knowledgePoint}·★${p.difficulty}</div>`).join("");
}
function selectProblem(i) { currentProblem=problems[i]; hintIdx=0; practiceSelected=""; document.getElementById("practiceResult").innerHTML=""; renderProblem(); renderProbList(); }
function renderProblem() {
  if(!currentProblem) return;
  document.getElementById("problemMeta").innerHTML = `<b>${esc(currentProblem.question)}</b><br><small>FEN: ${esc(currentProblem.fen)}</small>`;
  renderBoard(document.getElementById("practiceBoard"), currentProblem.fen, practiceSelected, (sq, piece) => {
    if (practiceSelected && practiceSelected !== sq) {
      // Attempting a move: from practiceSelected to sq
      var moveStr = practiceSelected + sq;
      submitPracticeMove(moveStr);
      practiceSelected = "";
    } else if (piece) {
      practiceSelected = sq;
    } else {
      practiceSelected = "";
    }
    renderProblem();
  });
}
function showHint() { if(currentProblem&&currentProblem.hints) toast("💡 "+currentProblem.hints[hintIdx++ % currentProblem.hints.length]); }
function nextProblem() { if(problems.length){ const i=problems.indexOf(currentProblem); currentProblem=problems[(i+1)%problems.length]; hintIdx=0; practiceSelected=""; document.getElementById("practiceResult").innerHTML=""; renderProblem(); renderProbList(); } }

async function submitPracticeMove(moveStr) {
  if(!currentProblem) return;
  lastPracticeAnswer = moveStr;
  try {
    const d = await API.req("/problems/submit","POST",{problemId:currentProblem.id,answer:moveStr});
var hdr = d.isCorrect ? "✅ 答对了！"+(d.awardedPoints>0?" +"+d.awardedPoints+"分":"") : "❌ 不对，再试试！";
    document.getElementById("practiceResult").innerHTML = hdr + ' <button class="btn btn-ghost" onclick="explainAnswer()" style="font-size:11px;padding:2px 8px;">🤖 AI讲解</button>';
    playUiSound(d.isCorrect ? "correct" : "wrong");
    if(d.awardedPoints>0){
      const oldRank = getRank(API.user.points || 0);
      API.user.points+=d.awardedPoints;
      const newRank = getRank(API.user.points || 0);
      updateRankDisplay();
      if (newRank.level > oldRank.level) {
        playUiSound("level");
        toast("🎉 升级到 " + newRank.title + "！");
      }
    }
  } catch(e) { toast(e.message); }
}

async function submitPractice() {
  var a = document.getElementById("practiceAnswer").value.trim();
  if(!a){ toast("输入走法或点击棋盘走棋"); return; }
  submitPracticeMove(a);
  document.getElementById("practiceAnswer").value="";
}

async function explainAnswer() {
  if(!currentProblem){ toast("没有题目"); return; }
  document.getElementById("practiceResult").innerHTML += "<br>⏳ AI讲解生成中...";
  try {
    const e = await API.req("/problems/explain","POST",{problemId:currentProblem.id,answer:lastPracticeAnswer||currentProblem.solution,isCorrect:true});
    const text = e.explanation || "";
    document.getElementById("practiceResult").innerHTML = document.getElementById("practiceResult").innerHTML.replace("⏳ AI讲解生成中...","") + "<br><br><b>🤖 AI讲解:</b>" + speakButton(text) + "<br>" + esc(text);
  } catch(ex){ document.getElementById("practiceResult").innerHTML += "<br>❌ 讲解生成失败：" + esc(ex.message); }
}

// ── AI Battle ──
var battleFrom = "", battleVariant = "standard", variants = [];
function initBattleDifficulty() {
  var sel = document.getElementById("battleDiff");
  var mode = document.getElementById("battleMode");
  if (!sel) return;
  sel.innerHTML = BATTLE_LEVELS.map(function(level) {
    return '<option value="' + level.tier + '">' + level.label + '</option>';
  }).join("");
  sel.value = "2";
  sel.addEventListener("change", updateBattleDifficultyHint);
  if (mode) mode.addEventListener("change", updateBattleDifficultyHint);
  updateBattleDifficultyHint();
}
function getBattleDifficultyLevel() {
  var sel = document.getElementById("battleDiff");
  var tier = Number(sel ? sel.value : 2);
  return BATTLE_LEVELS.find(function(level) { return level.tier === tier; }) || BATTLE_LEVELS[1];
}
function getBattleDifficultyValue() {
  return getBattleDifficultyLevel().difficulty;
}
function updateBattleDifficultyHint() {
  var level = getBattleDifficultyLevel();
  var mode = document.getElementById("battleMode");
  var modeLabel = mode && mode.value === "teaching" ? "当前是简单陪练模式" : "当前是标准对战模式";
  document.getElementById("battleDifficultyHint").innerHTML = "<b>" + level.label + "</b>：" + level.hint + "<br><small>" + modeLabel + "。</small>";
}
async function loadVariants() {
  try { var d = await API.req("/match/variants"); variants = d.items||[]; var sel=document.getElementById("battleVariant"); if(!sel)return; sel.innerHTML=variants.map(function(v){ return '<option value="'+v.key+'">'+v.title+'</option>'; }).join(""); sel.value=battleVariant; updateVariantDesc(); } catch(e) {}
}
function updateVariantDesc() {
  var sel=document.getElementById("battleVariant"); if(!sel)return;
  battleVariant=sel.value; var v=variants.find(function(x){return x.key===battleVariant;});
  document.getElementById("variantDesc").innerHTML=v?"<b>"+v.title+"</b>："+v.desc:"";
}
async function startMatch() {
  try {
    var level = getBattleDifficultyLevel();
    var payload = { mode: document.getElementById("battleMode").value, difficulty: level.difficulty };
    if (battleVariant && battleVariant !== "standard") payload.variant = battleVariant;
    var d = await API.req("/match/start", "POST", payload);
    matchId = d.matchId;
    battleFen = d.matchState || d.fen;
    moves = [];
    lastBattleEngineMove = null;
    battleSelected = "";
    battleFrom = "";
    document.getElementById("battleStatus").innerHTML = "对局开始啦。你先走白棋，当前难度是 <b>" + level.label + "</b>。";
    document.getElementById("moveHistory").textContent = "这里会按顺序记录你和 AI 的每一步。";
    document.getElementById("analysisResult").textContent = "对局开始后，你可以点击“建议”看 AI 小教练提示，或者点击“复盘”看整盘总结。";
    renderBattle();
  } catch(e){ toast(e.message); }
}
function renderBattle() {
  renderBoard(document.getElementById("battleBoard"), battleFen, battleFrom||battleSelected, function(sq, piece) {
    if (battleFrom) {
      // Destination selected: construct and submit move
      var moveStr = battleFrom + sq;
      battleSelected = ""; battleFrom = "";
      submitBattleMoveStr(moveStr);
    } else if (piece && piece === piece.toUpperCase()) {
      // Select a white piece (player is always white)
      battleFrom = sq;
      battleSelected = sq;
    } else {
      battleFrom = ""; battleSelected = "";
    }
    renderBattle();
  });
}
async function submitBattleMoveStr(moveStr) {
  try {
    var level = getBattleDifficultyLevel();
    var payload = {matchId, fen:battleFen, move:moveStr, difficulty: level.difficulty, previousEngineMove: lastBattleEngineMove};
    if(battleVariant&&battleVariant!=="standard") payload.variant=battleVariant;
    if (moves.length > 0) {
      var pgn = ""; for (var i=0; i<moves.length; i+=2) { pgn += (Math.floor(i/2)+1)+". "+moves[i]; if (moves[i+1]) pgn += " "+moves[i+1]; pgn += " "; }
      payload.pgn = pgn.trim();
    }
    var d = await API.req("/match/move","POST",payload);
    if (!d.playerMoveAccepted) { toast("非法走子"); renderBattle(); return; }
    battleFen = d.fenAfter || battleFen;
    moves.push(d.playerMove || moveStr); if (d.engineMove) moves.push(d.engineMove);
    lastBattleEngineMove = d.engineMove || null;
    document.getElementById("battleMoveInput").value = "";
    document.getElementById("battleStatus").innerHTML = "你刚才走了 <b>" + (d.playerMove||moveStr) + "</b>。<br>AI 回应 <b>" + (d.engineMove||"无") + "</b>。" + (d.gameOver ? "<br><b>对局结束！+20分</b>" : "<br>继续观察棋盘，看看下一步有没有更好的吃子或将军机会。");
    document.getElementById("moveHistory").innerHTML = moves.length ? moves.map(function(move, index) {
      var prefix = index % 2 === 0 ? (Math.floor(index / 2) + 1) + ". " : "";
      return prefix + move;
    }).join("  ") : "这里会按顺序记录你和 AI 的每一步。";
    if (d.gameOver) {
      const oldRank = getRank(API.user.points || 0);
      API.user.points += 20;
      const newRank = getRank(API.user.points || 0);
      updateRankDisplay();
      playUiSound(newRank.level > oldRank.level ? "level" : "correct");
      if (newRank.level > oldRank.level) toast("🎉 升级到 " + newRank.title + "！");
    }
    renderBattle();
  } catch(e) { toast(e.message); renderBattle(); }
}
async function submitBattleMove() {
  var m = document.getElementById("battleMoveInput").value.trim();
  if (!m) { toast("输入走法或点击棋盘走棋"); return; }
  submitBattleMoveStr(m);
}
async function suggestMove() {
  try {
    const level = getBattleDifficultyLevel();
    const d = await API.req("/match/suggest","POST",{fen:battleFen,difficulty:level.difficulty});
    const text = `建议 ${d.move||"无"}。${d.reason||""}`;
    document.getElementById("analysisResult").innerHTML =
      `🤖 AI 小教练建议：<b>${d.move||"无"}</b>${speakButton(text)}<br>` +
      `当前训练档位：${level.label}<br>` +
      `引擎来源：${esc(d.source||"fallback")}<br>` +
      `${esc(d.reason||"先看看能不能吃子、将军，或者把棋子走到更安全的位置。")}`;
  } catch(e){ toast(e.message); }
}
async function analyzeGame() {
  try {
    const d = await API.req("/match/analyze","POST",{pgn:moves.join(" ")||"无走子"});
    const key = (d.keyMoves||[]).map(m=>"第"+m.ply+"手 "+m.san).join("，") || "暂时还没有关键着法";
    const text = `复盘：${d.summary||""}。关键：${key}`;
    document.getElementById("analysisResult").innerHTML =
      `📋 对局复盘：${esc(d.summary||"这一盘还没有足够走子，先多下一会儿再来复盘。")}${speakButton(text)}<br>` +
      `关键着法：${esc(key)}`;
  } catch(e){ toast(e.message); }
}

// ── PvP ──
function connectWs() {
  if(ws&&ws.readyState===WebSocket.OPEN) return;
  ws=new WebSocket((location.protocol==="https:"?"wss:":"ws:")+"//"+location.host+"/ws?token="+encodeURIComponent(API.token));
  ws.onmessage=e=>{
    const m=JSON.parse(e.data);
    if(m.type==="game_state") handlePvpState(m.payload);
    if(m.type==="clock_tick") updateClocks(m.payload);
    if(m.type==="game_over"){ document.getElementById("pvpStatus").textContent=m.payload.message; }
    if(m.type==="chat_receive") handleChatMsg(m.payload);
    if(m.type==="error") toast(m.payload.message);
  };
  ws.onclose=()=>setTimeout(connectWs,3000);
}
function handlePvpState(p){
  pvpRoomId=p.roomId; pvpFen=p.fen; pvpMyColor=(p.white&&p.white.userId===API.user.id)?"white":"black";
  document.getElementById("pvpSetup").style.display="none"; document.getElementById("pvpGameArea").style.display="";
  document.getElementById("pvpRoomInfo").textContent="房间: "+p.roomNumber;
  var myTurn = (pvpMyColor==="white"&&p.turn==="w")||(pvpMyColor==="black"&&p.turn==="b");
  renderBoard(document.getElementById("pvpBoard"), pvpFen, pvpSelected, (sq,piece)=>{
    if(!myTurn){ toast("还没轮到你"); return; }
    var isMyPiece = (pvpMyColor==="white"&&piece===piece.toUpperCase()&&piece) || (pvpMyColor==="black"&&piece===piece.toLowerCase()&&piece);
    if (pvpSelected) {
      // Already selected a piece, now clicking destination
      var moveStr = pvpSelected + sq;
      ws.send(JSON.stringify({type:"move",payload:{roomId:pvpRoomId,move:moveStr}}));
      pvpSelected = "";
    } else if (isMyPiece) {
      pvpSelected = sq;
    }
    renderBoard(document.getElementById("pvpBoard"), pvpFen, pvpSelected, ()=>{});
  });
  updateClocks(p);
}
function updateClocks(p){ document.getElementById("whiteClock").textContent=fmtTime(p.whiteTimeMs||0); document.getElementById("blackClock").textContent=fmtTime(p.blackTimeMs||0); }
async function createPvpRoom(){
  try{ const d=await API.req("/room/create","POST",{timeControl:{initialMinutes:10,incrementSeconds:0},asColor:"random"}); document.getElementById("pvpRoomInfo").innerHTML=`房间号: <b style="font-size:24px;color:var(--gold);">${d.roomNumber}</b>`; connectWs(); setTimeout(()=>ws.send(JSON.stringify({type:"join_room",payload:{roomId:d.roomId}})),500); }catch(e){ toast(e.message); }
}
async function joinPvpRoom(){
  const c=document.getElementById("joinRoomCode").value.trim(); if(!c){ toast("输入房间号"); return; }
  try{ const d=await API.req("/room/join","POST",{roomNumber:c}); connectWs(); setTimeout(()=>ws.send(JSON.stringify({type:"join_room",payload:{roomId:d.roomId}})),500); }catch(e){ toast(e.message); }
}
function resignPvp(){ if(ws) ws.send(JSON.stringify({type:"resign",payload:{roomId:pvpRoomId}})); }
function offerDraw(){ if(ws) ws.send(JSON.stringify({type:"draw_offer",payload:{roomId:pvpRoomId,action:"offer"}})); }
async function refreshRooms(){
  try{ const d=await API.req("/rooms/active"); document.getElementById("activeRooms").innerHTML=(d.rooms||[]).map(r=>`<div class="list-item">${r.roomNumber}·${r.creatorName}·${r.timeControl.initialMinutes}+${r.timeControl.incrementSeconds} <button class="btn btn-ghost" onclick="document.getElementById('joinRoomCode').value='${r.roomNumber}';joinPvpRoom();">加入</button></div>`).join(""); }catch(e){}
}

// ── Arena ──
async function joinArena(){
  try{ const d=await API.req("/arena/join","POST",{}); if(d.matched){ toast("🎯匹配成功！房间:"+d.roomNumber); document.getElementById("joinRoomCode").value=d.roomNumber; navTo("pvp"); setTimeout(()=>joinPvpRoom(),1000); } else toast("⏳加入队列，位置:"+d.queuePosition); }catch(e){ toast(e.message); }
}

// ── Rankings ──
async function loadRankings(){
  const urls={global:"/rankings/global",puzzle:"/rankings/puzzle",battle:"/rankings/battle"};
  try{ const d=await API.req(urls[rankTab]||urls.global); document.getElementById("rankingsTable").innerHTML=`<div class="list-item" style="font-weight:700;border-bottom:2px solid rgba(255,255,255,.1);"><span>排名</span><span>棋手</span><span>${rankTab==="puzzle"?"解题":"积分"}</span><span>段位进度</span><span>战绩</span></div>`+(d.items||[]).map(i=>{ const rr=getRank(i.points||0); return `<div class="list-item"><span style="font-weight:700;">${i.rank<=3?["🥇","🥈","🥉"][i.rank-1]:"#"+i.rank}</span><span>${esc(i.name)}</span><span>${rankTab==="puzzle"?i.solved+"题":i.points+"分"}</span><span>${rr.piece} Lv.${rr.level} ${rr.title} ${rr.toNext?`<small style="color:var(--muted);">差${rr.toNext}分</small>`:""}</span><span style="font-size:11px;">${i.wins||0}胜${i.losses||0}负</span></div>`; }).join(""); }catch(e){ toast(e.message); }
}
function renderRankRules() {
  const el = document.getElementById("rankRules");
  if (!el) return;
  el.innerHTML = `
    <div class="rank-rules">
      <div><b>${t("rankRules")}</b>：${t("rankRulesText")}</div>
      <div><b>${t("pointSources")}</b>：${t("pointSourcesText")}</div>
    </div>`;
}
document.addEventListener("click",e=>{ if(e.target.classList.contains("btn-rank-tab")){ rankTab=e.target.dataset.tab; document.querySelectorAll(".btn-rank-tab").forEach(b=>b.className=b.dataset.tab===rankTab?"btn btn-primary btn-rank-tab":"btn btn-ghost btn-rank-tab"); renderRankRules(); loadRankings(); } });

// ── Friends ──
async function searchFriends(){ const q=document.getElementById("friendSearch").value.trim(); if(!q)return; try{ const d=await API.req("/friends/search?q="+encodeURIComponent(q)); document.getElementById("friendResults").innerHTML=(d.results||[]).map(u=>`<div class="list-item">${esc(u.displayName)}·Lv.${u.level}·${u.points}分 ${u.isFriend?'<span class="tag green">已是好友</span>':u.pendingSent?'<span class="tag">已发送</span>':'<button class="btn btn-ghost" onclick="sendFriendReq(\'${u.userId}\')">加好友</button>'}</div>`).join(""); }catch(e){ toast(e.message); } }
async function sendFriendReq(uid){ try{ await API.req("/friends/request","POST",{toUserId:uid}); toast("已发送"); searchFriends(); }catch(e){ toast(e.message); } }
async function loadFriends(){
  try{ const d=await API.req("/friends/list"); document.getElementById("friendsList").innerHTML=(d.friends||[]).map(f=>`<div class="list-item"><span>${esc(f.displayName)}·${f.points}分 ${f.unreadCount?'<span class="tag red">'+f.unreadCount+'</span>':''}</span><span><button class="btn btn-ghost" onclick="openChat('${f.userId}','${esc(f.displayName)}')">💬</button><button class="btn btn-ghost" onclick="sendGameReq('${f.userId}','${esc(f.displayName)}')">⚔</button></span></div>`).join(""); }catch(e){}
}
async function loadFriendRequests(){
  try{ const d=await API.req("/friends/requests"); document.getElementById("friendRequests").innerHTML=(d.incoming||[]).map(r=>`<div class="list-item"><span>${esc(r.displayName)}</span><span><button class="btn btn-primary" onclick="acceptFriend('${r.requestId}')">接受</button><button class="btn btn-ghost" onclick="rejectFriend('${r.requestId}')">拒绝</button></span></div>`).join("")||"<div style='color:var(--muted);font-size:12px;'>暂无请求</div>"; }catch(e){}
}
async function acceptFriend(rid){ try{ await API.req("/friends/accept","POST",{requestId:rid}); loadFriends(); loadFriendRequests(); }catch(e){ toast(e.message); } }
async function rejectFriend(rid){ try{ await API.req("/friends/reject","POST",{requestId:rid}); loadFriendRequests(); }catch(e){ toast(e.message); } }
function openChat(fid, fname){ document.getElementById("chatPanel").style.display=""; document.getElementById("chatTitle").textContent="💬 "+fname; window._chatFriend=fid; loadChatHistory(); }
async function loadChatHistory(){
  if(!window._chatFriend) return;
  try{ const d=await API.req("/chat/history/"+window._chatFriend); document.getElementById("chatMessages").innerHTML=(d.messages||[]).map(m=>`<div class="chat-msg ${m.outgoing?'out':'in'}">${esc(m.message)}<div class="chat-time">${m.createdAt}</div></div>`).join("")||"暂无消息"; }catch(e){}
}
function sendChatMsg(){ const m=document.getElementById("chatInput").value.trim(); if(!m||!window._chatFriend) return; ws.send(JSON.stringify({type:"chat_send",payload:{toUserId:window._chatFriend,message:m}})); document.getElementById("chatInput").value=""; }
function handleChatMsg(msg){ if(window._chatFriend===msg.fromUserId||window._chatFriend===msg.toUserId) loadChatHistory(); else toast("💬 "+msg.fromName+": "+msg.message); }
async function sendGameReq(uid,uname){ try{ await API.req("/game-request/send","POST",{toUserId:uid,timeControl:{initialMinutes:10,incrementSeconds:0}}); toast("已向"+uname+"发送对局请求"); }catch(e){ toast(e.message); } }

// ── Binding ──
async function generateBindCode(){
  try{ const d=await API.req("/student/my-code"); showBindModal(d); }catch(e){ toast(e.message); }
}
function showBindModal(d){
  document.getElementById("bindCodeDisplay").textContent=d.code;
  document.getElementById("bindModal").style.display="flex";
  let remain=d.expiresInSeconds||300;
  if(bindTimer) clearInterval(bindTimer);
  document.getElementById("bindCountdown").textContent="⏱ 剩余: "+fmtCountdown(remain);
  bindTimer=setInterval(()=>{ remain--; document.getElementById("bindCountdown").textContent="⏱ 剩余: "+fmtCountdown(remain); if(remain<=0){ clearInterval(bindTimer); document.getElementById("bindCountdown").textContent="已过期"; } },1000);
  document.getElementById("btnRegenCode").onclick=async ()=>{ clearInterval(bindTimer); try{ const nd=await API.req("/student/regenerate-code","POST"); showBindModal(nd); }catch(e){ toast(e.message); } };
}
function closeBindModal(){ document.getElementById("bindModal").style.display="none"; if(bindTimer) clearInterval(bindTimer); }
function fmtCountdown(s){ const m=Math.floor(s/60), sec=s%60; return m+"分"+(sec<10?"0":"")+sec+"秒"; }
async function fetchBindCodeDisplay(){ try{ const d=await API.req("/student/my-code"); }catch(e){} }

// ── Parent ──
async function bindChild(){
  const c=document.getElementById("bindCode").value.trim();
  if(c.length!==6){ document.getElementById("bindResult").textContent="请输入6位码"; return; }
  try{ const d=await API.req("/parent/bind-child","POST",{code:c}); document.getElementById("bindResult").innerHTML=`<span style="color:var(--green);">✅ ${d.message}</span>`; loadMyChildren(); }catch(e){ document.getElementById("bindResult").innerHTML=`<span style="color:var(--banner);">❌ ${e.message}</span>`; }
}
async function loadMyChildren(){
  try{ const d=await API.req("/parent/my-children");
    document.getElementById("childrenList").innerHTML=(d.children||[]).map(ch=>`<div class="list-item"><span><b>${esc(ch.childName)}</b>·${ch.rankTitle||""}·${ch.points}分<br><small>做题${ch.totalAttempts}·正确率${ch.accuracy}%·今日${ch.todaySolve}题${ch.todayBattle}战</small></span><span><button class="btn btn-ghost" onclick="showChildDetail('${ch.childId}')">详情</button></span></div>`).join("")||"<div class='feed' style='text-align:center;padding:16px;'>⚠️ 尚未绑定孩子<br><small>让孩子在Ta的仪表盘点击 <b>「🔗 绑定家长」</b> 获取6位码<br>然后在上方输入框中输入该码完成绑定</small></div>";
    document.getElementById("planChildSelect").innerHTML='<option value="">--选择孩子--</option>'+(d.children||[]).map(ch=>`<option value="${ch.childId}">${ch.childName}</option>`).join("");
    document.getElementById("reportChildSelect").innerHTML='<option value="">--选择孩子--</option>'+(d.children||[]).map(ch=>`<option value="${ch.childId}">${ch.childName}</option>`).join("");
  }catch(e){}
}
async function showChildDetail(cid){
  try{ const d=await API.req("/parent/child/"+cid+"/detail"); document.getElementById("childDetail").innerHTML=`<b>${esc(d.childName)}</b>·${d.rankTitle||""}·${d.points}分<br>总做题${d.totalAttempts}·正确率${d.accuracy}%·今日${d.todaySolve}题${d.todayBattle}战`; }catch(e){}
}
async function genReport(force){
  const cid=document.getElementById("reportChildSelect").value; if(!cid){ toast("选择孩子"); return; }
  document.getElementById("reportResult").innerHTML="<div class='feed'>⏳ 生成中...</div>";
  var url="/parent/child/"+cid+"/generate-report";
  if(force) url+="?force=true";
  try{ const d=await API.req(url,"POST",{}); const r=d.report;
    var html="";
    html+=`<div class='feed' style='line-height:1.7;'>`;
    html+=`<h4>📊 学习周报 ${d.cached?'<span class="tag" style="font-size:10px;">已缓存</span>':''}${d.refreshed?'<span class="tag green" style="font-size:10px;">已刷新</span>':''}</h4>`;
    html+=`<p><b>📅 ${(r.weekStart||"").slice(0,10)} ~ ${(r.weekEnd||"").slice(0,10)}</b></p>`;
    html+=`<p>🏆 段位 <b>${esc(r.currentRank||"")}</b> · 积分 <b>${r.currentPoints}</b>（<span style="color:var(--green);">本周${r.pointsGained>=0?'+':''}${r.pointsGained}</span>）</p>`;
    html+=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center;margin:8px 0;">`;
    html+=`<div class="class-card"><b style="font-size:20px;">${r.solveCount}</b><br><small>✅ 正确解题</small></div>`;
    html+=`<div class="class-card"><b style="font-size:20px;">${r.battleCount}</b><br><small>⚔ 对战局数</small></div>`;
    html+=`<div class="class-card"><b style="font-size:20px;color:var(--green);">${r.pvpWins}</b><br><small>🏅 胜利</small></div>`;
    html+=`<div class="class-card"><b style="font-size:20px;color:var(--banner);">${r.pvpLosses}</b><br><small>💪 失利</small></div>`;
    html+=`</div>`;
    html+=`<p>📚 累计做题 <b>${r.totalAttempts||0}</b> 次 · 正确率 <b>${r.totalAccuracy||"0%"}</b></p>`;
    html+=`<p>📝 班级作业 <b>${r.homeworkDone||0}/${r.homeworkTotal||0}</b> 完成</p>`;
    // Daily breakdown
    if(r.dailyBreakdown&&r.dailyBreakdown.length){
      html+=`<p style="margin-top:8px;"><b>📅 每日统计</b></p>`;
      html+=`<div style="display:flex;gap:4px;flex-wrap:wrap;">`;
      r.dailyBreakdown.forEach(function(day){
        var dow=["日","一","二","三","四","五","六"][new Date(day.date).getDay()];
        html+=`<div style="flex:1;min-width:80px;text-align:center;padding:4px;background:rgba(255,255,255,.05);border-radius:4px;font-size:11px;">`;
        html+=`<div>周${dow}</div><div>✅${day.solve}</div><div>⚔${day.battle}</div>`;
        html+=`</div>`;
      });
      html+=`</div>`;
    }
    // AI commentary
    if(r.aiCommentary){
      html+=`<div style="margin-top:10px;padding:8px;background:rgba(53,89,67,.12);border-left:3px solid var(--green);border-radius:4px;">`;
      html+=`<b>🤖 AI评语</b><br>${esc(r.aiCommentary)}</div>`;
    }
    // Suggestions
    if(r.suggestions&&r.suggestions.length){
      html+=`<p style="margin-top:8px;"><b>💡 建议</b></p>`;
      r.suggestions.forEach(function(s,i){
        html+=`<div style="padding:2px 0;font-size:12px;">${["📌","🎯","💪","📖"][i]||"•"} ${esc(s)}</div>`;
      });
    }
    html+=`</div>`;
    html+=`<div class="row" style="margin-top:8px;"><button class="btn btn-ghost" onclick="genReport(true)">🔄 刷新报告</button></div>`;
    document.getElementById("reportResult").innerHTML=html;
  }catch(e){ document.getElementById("reportResult").innerHTML=`<div class='feed' style="color:var(--banner);">❌ ${esc(e.message)}</div>`; }
}
async function viewReports(){
  const cid=document.getElementById("reportChildSelect").value; if(!cid){ toast("选择孩子"); return; }
  try{ const d=await API.req("/parent/child/"+cid+"/reports"); document.getElementById("reportResult").innerHTML="<h4>历史周报</h4>"+(d.items||[]).map(r=>`<div class='list-item'><b>${(r.weekStart||"").slice(0,10)}~${(r.weekEnd||"").slice(0,10)}</b>·解题${r.solveCount}·对战${r.battleCount}·${r.pvpWins}胜</div>`).join("")||"暂无"; }catch(e){}
}
async function createStudyPlan(){
  const cid=document.getElementById("planChildSelect").value; if(!cid){ toast("选择孩子"); return; }
  try{ await API.req("/parent/study-plan","POST",{childId:cid,dailySolveTarget:+document.getElementById("planSolve").value,dailyBattleTarget:+document.getElementById("planBattle").value,startDate:document.getElementById("planStart").value,endDate:document.getElementById("planEnd").value}); toast("计划创建成功"); loadStudyPlans(); }catch(e){ toast(e.message); }
}
async function loadStudyPlans(){
  try{ const d=await API.req("/parent/study-plans"); document.getElementById("planList").innerHTML=(d.plans||[]).map(p=>`<div class="list-item"><span>${esc(p.childName)}·做题${p.todaySolve}/${p.dailySolveTarget}·对战${p.todayBattle}/${p.dailyBattleTarget}</span><span>${p.startDate}~${p.endDate}</span></div>`).join("")||"<div class='feed'>暂无计划</div>"; }catch(e){}
}

// ── Class Management ──
async function createClass(){
  const n=document.getElementById("clsName").value.trim(); if(!n){ document.getElementById("createResult").innerHTML="<span style='color:var(--banner);'>输入班级名称</span>"; return; }
  const c=document.getElementById("clsCode").value.trim();
  const p={name:n}; if(c.length===6) p.inviteCode=c; else if(c.length>0){ document.getElementById("createResult").innerHTML="<span style='color:var(--banner);'>邀请码6位</span>"; return; }
  try{ const d=await API.req("/class/create","POST",p); document.getElementById("createResult").innerHTML=`<span style="color:var(--green);">✅ 创建成功！邀请码: <b>${d.inviteCode}</b></span>`; loadTeacherClasses(); setTimeout(()=>{ document.getElementById("clsSelect").value=d.class.id; showClassDetail(d.class.id); },300); }catch(e){ document.getElementById("createResult").innerHTML=`<span style="color:var(--banner);">❌ ${e.message}</span>`; }
}
async function loadTeacherClasses(){
  try{ const d=await API.req("/class/my-classes"); const sel=document.getElementById("clsSelect"); sel.innerHTML='<option value="">--选择班级--</option>'+(d.items||[]).map(c=>`<option value="${c.id}">${c.name} (${c.memberCount}人)</option>`).join(""); }catch(e){}
}
async function showClassDetail(cid){
  if(!cid){ document.getElementById("classTeacherDetail").innerHTML=""; return; }
  currentClassId=cid;
  try{ const d=await API.req("/class/"+cid);
    let h=`<div class="row"><input id="noticeMsg" placeholder="公告" style="flex:1;"><button class="btn btn-ghost" id="btnSendNotice">发送</button></div><div id="noticeResult"></div>`;
    h+="<h4>公告</h4>"+(d.notices||[]).map(n=>`<div class="list-item">${n.creatorName}: ${esc(n.message)}</div>`).join("")||"暂无";
    h+="<h4>👥成员("+d.memberCount+")</h4>"+(d.members||[]).map(m=>`<div class="list-item">${m.displayName}·${m.role}·${m.points}分</div>`).join("");
    h+="<h4>📝作业</h4>"+(d.homeworks||[]).map(hw=>`<div class="list-item">${esc(hw.title)}·截止${hw.dueDate}·提交${hw.submitCount}</div>`).join("")||"暂无";
    h+='<div class="row" style="margin-top:10px;"><button class="btn btn-primary" onclick="showBoardEditor()">♟ 棋盘编辑器（自定义题目）</button></div>';
    document.getElementById("classTeacherDetail").innerHTML=h;
    setTimeout(()=>{ const b=document.getElementById("btnSendNotice"); if(b) b.onclick=sendNotice; },200);
  }catch(e){ document.getElementById("classTeacherDetail").textContent=e.message; }
}
async function sendNotice(){ const m=document.getElementById("noticeMsg").value.trim(); if(!m)return; try{ await API.req("/class/"+currentClassId+"/notice","POST",{message:m}); document.getElementById("noticeResult").textContent="✅已发送"; showClassDetail(currentClassId); }catch(e){ toast(e.message); } }

async function loadStudentClasses(){
  try{ const d=await API.req("/class/my-classes"); document.getElementById("classStudentContent").innerHTML="<h4>我的班级</h4>"+(d.items||[]).map(c=>`<div class="list-item"><span>${c.name} (${c.memberCount}人)</span><button class="btn btn-ghost" onclick="showStudentClass('${c.id}')">查看</button></div>`).join("")||"暂无班级"; }catch(e){}
}
async function showStudentClass(cid){
  try{ const d=await API.req("/class/"+cid);
    let h=`<h4>📢公告</h4>`+(d.notices||[]).map(n=>`<div class="list-item">${n.creatorName}: ${esc(n.message)}</div>`).join("")||"暂无";
    h+="<h4>📝作业</h4>"+(d.homeworks||[]).map(hw=>`<div class="list-item"><span>${esc(hw.title)}·截止${hw.dueDate}·提交${hw.submitCount}</span></div>`).join("")||"暂无";
    document.getElementById("classStudentContent").innerHTML=h;
  }catch(e){ toast(e.message); }
}
async function joinClass(){ const c=document.getElementById("joinCode").value.trim(); if(!c)return; try{ await API.req("/class/join","POST",{inviteCode:c}); toast("加入成功"); loadStudentClasses(); }catch(e){ toast(e.message); } }

// ── Teacher Board Editor ─────────────────────────────────────────
function showBoardEditor() {
  var h='<h4>♟ 棋盘编辑器 - 自定义题目</h4>';
  h+='<div class="piece-palette" style="display:flex;gap:6px;flex-wrap:wrap;padding:8px;background:rgba(0,0,0,.2);border-radius:6px;margin-bottom:8px;">';
  ["K","Q","R","B","N","P","k","q","r","b","n","p","."].forEach(function(p){
    var label=p==="."?"✕":(PIECES_FULL[p]||p);
    h+='<button class="palette-piece" data-piece="'+p+'" style="width:38px;height:38px;font-size:20px;cursor:pointer;border-radius:4px;'+(p===selectedPiece?'background:var(--gold);border:2px solid #fff;':'background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.1);')+'">'+label+'</button>';
  });
  h+='</div>';
  h+='<div style="display:flex;gap:12px;flex-wrap:wrap;"><div style="flex:1;min-width:280px;"><div id="editorBoard" class="board-wrap"></div></div>';
  h+='<div style="min-width:220px;">';
  h+='<div id="editorFenDisplay" style="font-size:11px;word-break:break-all;margin-bottom:8px;">FEN: '+editorFen+'</div>';
  h+='<input id="hwTitle" placeholder="作业/题目名称" style="width:100%;margin-bottom:6px;">';
  h+='<input id="hwSolutions" placeholder="标准答案(多个用逗号分隔)如 Ra8#,a1a8" style="width:100%;margin-bottom:6px;">';
  h+='<input id="hwDue" type="date" style="width:100%;margin-bottom:6px;">';
  h+='<button class="btn btn-primary" onclick="saveCustomHomework()" style="width:100%;">💾 保存自定义题目</button>';
  h+='<div id="hwSaveResult" style="margin-top:6px;font-size:12px;"></div>';
  h+='</div></div>';
  document.getElementById("classTeacherDetail").innerHTML=h;
  setTimeout(function(){
    renderEditorBoard();
    document.querySelectorAll(".palette-piece").forEach(function(btn){
      btn.onclick=function(){ selectedPiece=btn.getAttribute("data-piece"); showBoardEditor(); };
    });
  },100);
}

function renderEditorBoard(){
  var el=document.getElementById("editorBoard"); if(!el) return;
  el.innerHTML=""; el.className="board";
  var b=parseFen(editorFen), files="abcdefgh";
  var top=document.createElement("div"), bottom=document.createElement("div"), left=document.createElement("div"), right=document.createElement("div"), grid=document.createElement("div");
  top.className="board-files board-files-top";
  bottom.className="board-files board-files-bottom";
  left.className="board-ranks board-ranks-left";
  right.className="board-ranks board-ranks-right";
  grid.className="board-grid";

  for(var i=0;i<8;i++){
    var ft=document.createElement("div"); ft.className="coord"; ft.textContent=files[i]; top.appendChild(ft);
    var fb=document.createElement("div"); fb.className="coord"; fb.textContent=files[i]; bottom.appendChild(fb);
    var rl=document.createElement("div"); rl.className="coord"; rl.textContent=String(8-i); left.appendChild(rl);
    var rr=document.createElement("div"); rr.className="coord"; rr.textContent=String(8-i); right.appendChild(rr);
  }

  for(var r=0;r<8;r++){for(var c=0;c<8;c++){
    var sq=sqName(r,c), piece=b[r][c]||"";
    var cell=document.createElement("div");
    cell.className="cell "+((r+c)%2===0?"light":"dark");
    cell.onclick=(function(s,p){return function(){onEditorClick(s,p);};})(sq,piece);
    var sp=document.createElement("span");
    sp.className="piece "+(piece===piece.toUpperCase()&&piece?"white":"black");
    sp.textContent=PIECES_FULL[piece]||"";
    cell.appendChild(sp);
    grid.appendChild(cell);
  }}

  el.appendChild(top);
  el.appendChild(left);
  el.appendChild(grid);
  el.appendChild(right);
  el.appendChild(bottom);
  var fd=document.getElementById("editorFenDisplay"); if(fd) fd.textContent="FEN: "+editorFen;
}

function onEditorClick(sq,existing){
  var b=parseFen(editorFen), row=8-parseInt(sq[1]), col="abcdefgh".indexOf(sq[0]);
  if(selectedPiece==="."){ b[row][col]=""; }
  else { var color=selectedPiece===selectedPiece.toUpperCase()?"w":"b"; b[row][col]=color==="w"?selectedPiece:selectedPiece.toLowerCase(); }
  editorFen=boardToFen(b); renderEditorBoard();
}

function boardToFen(board){
  var fen=""; for(var i=0;i<8;i++){ var empty=0; for(var j=0;j<8;j++){ var p=board[i][j]; if(p){ if(empty>0){fen+=empty;empty=0;} fen+=p; } else empty++; } if(empty>0) fen+=empty; if(i<7) fen+="/"; }
  return fen+" w - - 0 1";
}

async function saveCustomHomework(){
  var title=document.getElementById("hwTitle").value.trim();
  if(!title){ document.getElementById("hwSaveResult").innerHTML="<span style=color:var(--banner)>请输入题目名称</span>"; return; }
  var solutions=document.getElementById("hwSolutions").value.trim();
  if(!solutions){ document.getElementById("hwSaveResult").innerHTML="<span style=color:var(--banner)>请输入标准答案</span>"; return; }
  var due=document.getElementById("hwDue").value||new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  try{
    await API.req("/class/"+currentClassId+"/homework","POST",{title:title,fen:editorFen,solutions:solutions.split(",").map(function(s){return s.trim()}),dueDate:due});
    document.getElementById("hwSaveResult").innerHTML="<span style=color:var(--green)>✅ 自定义题目已保存！</span>";
    setTimeout(function(){ showClassDetail(currentClassId); },800);
  }catch(e){ document.getElementById("hwSaveResult").innerHTML="<span style=color:var(--banner)>❌ "+esc(e.message)+"</span>"; }
}

// ── Game History ─────────────────────────────────────────────────
async function loadGameHistory(){
  try{
    var d=await API.req("/match/history","GET");
    var items=d.items||[];
    if(!items.length){ document.getElementById("gameHistoryView").innerHTML="<div class=feed>暂无对局记录</div>"; return; }
    var h="<div class=list style=max-height:400px>";
    items.forEach(function(m){
      h+='<div class=list-item><span>'+esc(m.mode)+'·'+esc(m.result)+'·难度'+m.difficulty+'</span><span style=font-size:11px>'+new Date(m.createdAt).toLocaleDateString()+'</span></div>';
    });
    h+="</div>";
    document.getElementById("gameHistoryView").innerHTML=h;
  }catch(e){}
}

// ── Usage Guide ──────────────────────────────────────────────────
function showGuide(){
  var h='<div class="modal-overlay" id="guideModal" style="display:flex;" onclick="if(event.target===this)closeGuide()">';
  h+='<div class="modal-box" style="max-width:600px;max-height:80vh;overflow:auto;">';
  h+='<h3>📖 使用指南</h3>';
  h+='<h4>🧑‍🎓 学生</h4><ol style="font-size:13px;line-height:1.8;">';
  h+='<li>登录后仪表盘选择 <b>题库训练</b> → 点击棋盘走棋 → 即时判对错 → 可选AI讲解</li>';
  h+='<li><b>AI对战</b> → 点击棋子再点目标格走棋 → Stockfish自动应招</li>';
  h+='<li><b>双人对战</b> → 创建房间 → 把房间号发给朋友 → 实时对弈</li>';
  h+='<li><b>🔗 绑定家长</b> → 生成6位码 → 发给家长 → 家长可看你的学习周报</li>';
  h+='<li><b>公开赛</b> → 自动匹配对手 → 赢取积分晋升段位 ♟→♚</li>';
  h+='</ol>';
  h+='<h4>👨‍🏫 老师</h4><ol style="font-size:13px;line-height:1.8;">';
  h+='<li><b>班级管理</b> → 创建班级 → 获得邀请码 → 分享给学生</li>';
  h+='<li>在班级详情中点击 <b>♟ 棋盘编辑器</b> → 点击棋子+点击棋盘摆放 → 输入题目名称和答案 → 保存</li>';
  h+='<li>可发布公告 → 所有班级成员可见</li>';
  h+='</ol>';
  h+='<h4>👨‍👩‍👧 家长</h4><ol style="font-size:13px;line-height:1.8;">';
  h+='<li>进入<b>家长中心</b> → 让孩子在Ta的仪表盘点「🔗绑定家长」获取6位码</li>';
  h+='<li>输入6位码绑定 → 查看孩子学习数据</li>';
  h+='<li><b>📊 学习周报</b> → 选择孩子 → 生成详细报告（含每日统计+AI评语）→ 可刷新</li>';
  h+='<li><b>📋 学习计划</b> → 设定每日做题/对战目标 → 追踪完成进度</li>';
  h+='</ol>';
  h+='<button class="btn btn-ghost" onclick="closeGuide()" style="margin-top:12px;width:100%;">关闭</button>';
  h+='</div></div>';
  document.body.insertAdjacentHTML("beforeend",h);
}
function closeGuide(){ var m=document.getElementById("guideModal"); if(m) m.remove(); }

// ── Helpers ──
function updateRankDisplay(){
  const r=getRank(API.user.points||0);
  document.getElementById("greeting").textContent = t("welcomeBack", { name: API.user.displayName });
  document.getElementById("rankLine").textContent=r.piece+" Lv."+r.level+" "+r.title+" · "+API.user.points+t("points");
  const card=document.getElementById("rankCard");
  if(card) card.innerHTML=renderRankProgress(API.user.points||0);
}

function refreshI18n() {
  document.title = t("appTitle");
  updateRankDisplay();
  initDash();
  initVoiceSettings();
  if (currentView === "rankings") renderRankRules();
}
connectWs();
