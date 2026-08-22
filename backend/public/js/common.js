// 棋伴 - Shared JavaScript Library
const LANGS = {
  zh: { label: "中文", html: "zh-CN" },
  en: { label: "English", html: "en" },
  ja: { label: "日本語", html: "ja" },
  fr: { label: "Français", html: "fr" },
  es: { label: "Español", html: "es" },
};

const I18N = {
  zh: {
    brand: "棋伴",
    appTitle: "棋伴 - 训练中心",
    siteTitle: "棋伴 - 国际象棋在线学习平台",
    home: "首页",
    training: "学习训练",
    features: "功能介绍",
    logout: "退出",
    guide: "使用指南",
    dashboard: "首页",
    learn: "学习",
    practice: "做题",
    battle: "AI对战",
    pvp: "对战",
    arena: "公开赛",
    rankings: "排行",
    friends: "好友",
    class: "班级",
    manage: "管理",
    parent: "家长",
    notLoggedIn: "未登录",
    welcomeBack: "{name}，欢迎回来",
    heroTitleA: "用",
    heroTitleB: "掌握国际象棋",
    heroSubtitle: "从开局原则到残局技巧，从AI对弈到真人PK，一站式的国际象棋学习平台",
    startTraining: "开始训练",
    loginRegister: "登录/注册",
    loginBrand: "登录棋伴",
    createAccount: "创建棋伴账号",
    login: "登录",
    register: "注册",
    phone: "手机号 / 国际号码",
    password: "密码",
    nickname: "昵称",
    role: "角色",
    student: "学生",
    parentRole: "家长",
    teacher: "老师",
    registerStart: "注册并开始",
    loggingIn: "登录中...",
    registering: "注册中...",
    loginSuccess: "成功！跳转到训练页面...",
    learningCenter: "学习中心",
    practiceCenter: "题库训练",
    aiBattle: "AI对战",
    pvpBattle: "双人对战",
    arenaTitle: "公开赛",
    rankingTitle: "排行榜",
    friendTitle: "好友",
    parentCenter: "家长中心",
    classManagement: "班级管理",
    myClass: "我的班级",
    bindParent: "绑定家长",
    voiceTitle: "语音讲解设置",
    voiceUnsupported: "当前浏览器暂不支持语音朗读。",
    voiceNote: "当前先用轻量语音和柔和提示音。高质量儿童角色配音需要接入授权 TTS 服务。",
    voiceStyle: "讲解风格",
    systemVoice: "系统音色",
    autoVoice: "自动选择中文音色",
    voiceRate: "语速",
    voiceNatural: "自然度",
    testVoice: "试听",
    testSound: "试听音效",
    storySister: "故事姐姐",
    childPlayer: "童趣小棋手",
    energyBuddy: "元气伙伴",
    patientCoach: "耐心教练",
    storyHint: "慢一点、柔和一点，适合低龄孩子听讲解。",
    childHint: "比普通朗读更轻快，但不做夸张变声。",
    buddyHint: "适合做题后鼓励，语气稍微活泼。",
    coachHint: "更稳重，适合复盘和长句解释。",
    rankRules: "段位规则",
    pointSources: "积分来源",
    rankRulesText: "兵 0-99 · 骑士 100-299 · 主教 300-599 · 战车 600-999 · 皇后 1000-1499 · 国王 1500+",
    pointSourcesText: "做题答对 +10；对局结束 +20。后续可以继续加入连续练习、作业完成、公开赛奖励。",
    rankProgress: "段位进度",
    points: "分",
    nextRank: "距离 {rank} 还差 {points} 分",
    topRank: "已经达到最高段位",
    answerCorrect: "做题答对 +10",
    gameOverPoints: "对局结束 +20",
    progress: "进度 {progress}%",
    speak: "朗读",
    stop: "停止",
    noSpeechContent: "没有可朗读的内容",
    speechNotSupported: "当前浏览器不支持语音朗读",
    sampleVoice: "你好，我是棋伴。接下来我会慢一点，用更容易听懂的话，陪你一起学习国际象棋。",
    footer: "棋伴 · 国际象棋在线学习平台 · 让每个人都能学会下棋",
  },
  en: {
    brand: "Qiban",
    appTitle: "Qiban - Training Center",
    siteTitle: "Qiban - Online Chess Learning Platform",
    home: "Home", training: "Training", features: "Features", logout: "Log out", guide: "Guide",
    dashboard: "Home", learn: "Learn", practice: "Practice", battle: "AI Battle", pvp: "Battle", arena: "Arena", rankings: "Rankings", friends: "Friends", class: "Class", manage: "Manage", parent: "Parent", notLoggedIn: "Not signed in",
    welcomeBack: "Welcome back, {name}", heroTitleA: "Master chess with ", heroTitleB: "", heroSubtitle: "A one-stop chess learning platform from openings to endgames, AI games, and real matches.",
    startTraining: "Start Training", loginRegister: "Log in / Sign up", loginBrand: "Log in to Qiban", createAccount: "Create a Qiban account", login: "Log in", register: "Sign up", phone: "Phone / international number", password: "Password", nickname: "Nickname", role: "Role", student: "Student", parentRole: "Parent", teacher: "Teacher", registerStart: "Sign up and start", loggingIn: "Logging in...", registering: "Signing up...", loginSuccess: "Success! Redirecting...",
    learningCenter: "Learning Center", practiceCenter: "Puzzle Training", aiBattle: "AI Battle", pvpBattle: "Two-player Battle", arenaTitle: "Arena", rankingTitle: "Rankings", friendTitle: "Friends", parentCenter: "Parent Center", classManagement: "Class Management", myClass: "My Class", bindParent: "Bind Parent",
    voiceTitle: "Voice Explanation Settings", voiceUnsupported: "Speech is not supported in this browser.", voiceNote: "Currently using lightweight browser speech and soft feedback sounds. High-quality child character voices require an authorized TTS service.", voiceStyle: "Style", systemVoice: "System voice", autoVoice: "Auto Chinese voice", voiceRate: "Speed", voiceNatural: "Naturalness", testVoice: "Preview", testSound: "Sound",
    storySister: "Story Guide", childPlayer: "Young Player", energyBuddy: "Cheer Buddy", patientCoach: "Patient Coach", storyHint: "Slower and softer for young learners.", childHint: "Lighter than normal speech, without exaggerated pitch.", buddyHint: "A little more energetic for encouragement.", coachHint: "Calmer for reviews and longer explanations.",
    rankRules: "Rank Rules", pointSources: "Point Sources", rankRulesText: "Pawn 0-99 · Knight 100-299 · Bishop 300-599 · Rook 600-999 · Queen 1000-1499 · King 1500+", pointSourcesText: "Correct puzzle +10; finished game +20. Streaks, homework, and arena bonuses can be added later.", rankProgress: "Rank Progress", points: "pts", nextRank: "{points} pts to {rank}", topRank: "Top rank reached", answerCorrect: "Correct puzzle +10", gameOverPoints: "Finished game +20", progress: "Progress {progress}%", speak: "Speak", stop: "Stop", noSpeechContent: "No text to speak", speechNotSupported: "Speech is not supported in this browser.", sampleVoice: "Hello, this is Qiban. I will slow down and explain chess in words that are easier to understand.", footer: "Qiban · Online Chess Learning Platform · Helping everyone learn chess",
  },
  ja: {
    brand: "棋伴", appTitle: "棋伴 - トレーニングセンター", siteTitle: "棋伴 - オンラインチェス学習プラットフォーム",
    home: "ホーム", training: "学習", features: "機能", logout: "ログアウト", guide: "ガイド",
    dashboard: "ホーム", learn: "学ぶ", practice: "練習", battle: "AI対局", pvp: "対局", arena: "アリーナ", rankings: "ランキング", friends: "友達", class: "クラス", manage: "管理", parent: "保護者", notLoggedIn: "未ログイン",
    welcomeBack: "{name}さん、おかえりなさい", heroTitleA: "", heroTitleB: "でチェスを学ぼう", heroSubtitle: "序盤から終盤、AI対局、実戦まで学べるチェス学習プラットフォームです。",
    startTraining: "練習を始める", loginRegister: "ログイン/登録", loginBrand: "棋伴にログイン", createAccount: "棋伴アカウント作成", login: "ログイン", register: "登録", phone: "電話番号 / 国際番号", password: "パスワード", nickname: "ニックネーム", role: "役割", student: "生徒", parentRole: "保護者", teacher: "先生", registerStart: "登録して開始", loggingIn: "ログイン中...", registering: "登録中...", loginSuccess: "成功しました。移動します...",
    learningCenter: "学習センター", practiceCenter: "問題練習", aiBattle: "AI対局", pvpBattle: "二人対局", arenaTitle: "アリーナ", rankingTitle: "ランキング", friendTitle: "友達", parentCenter: "保護者センター", classManagement: "クラス管理", myClass: "マイクラス", bindParent: "保護者連携",
    voiceTitle: "音声説明設定", voiceUnsupported: "このブラウザは音声読み上げに対応していません。", voiceNote: "現在は軽量音声とやさしい効果音を使用しています。高品質な子ども向け音声には認可TTSが必要です。", voiceStyle: "説明スタイル", systemVoice: "システム音声", autoVoice: "中国語音声を自動選択", voiceRate: "速度", voiceNatural: "自然さ", testVoice: "試聴", testSound: "効果音",
    storySister: "物語ガイド", childPlayer: "小さな棋士", energyBuddy: "元気な相棒", patientCoach: "やさしいコーチ", storyHint: "ゆっくり、やさしく説明します。", childHint: "軽やかですが大げさな変声はしません。", buddyHint: "練習後の励まし向きです。", coachHint: "復習や長い説明向きです。",
    rankRules: "ランク規則", pointSources: "ポイント", rankRulesText: "ポーン 0-99 · ナイト 100-299 · ビショップ 300-599 · ルーク 600-999 · クイーン 1000-1499 · キング 1500+", pointSourcesText: "正解 +10、対局終了 +20。連続練習や宿題報酬も追加できます。", rankProgress: "ランク進捗", points: "点", nextRank: "{rank}まであと{points}点", topRank: "最高ランクです", answerCorrect: "正解 +10", gameOverPoints: "対局終了 +20", progress: "進捗 {progress}%", speak: "再生", stop: "停止", noSpeechContent: "読み上げる内容がありません", speechNotSupported: "このブラウザは音声に対応していません。", sampleVoice: "こんにちは、棋伴です。ゆっくり、わかりやすい言葉でチェスを説明します。", footer: "棋伴 · オンラインチェス学習プラットフォーム",
  },
  fr: {
    brand: "Qiban", appTitle: "Qiban - Centre d'entraînement", siteTitle: "Qiban - Plateforme d'apprentissage des échecs",
    home: "Accueil", training: "Entraînement", features: "Fonctions", logout: "Quitter", guide: "Guide",
    dashboard: "Accueil", learn: "Apprendre", practice: "Exercices", battle: "IA", pvp: "Duel", arena: "Tournoi", rankings: "Classement", friends: "Amis", class: "Classe", manage: "Gestion", parent: "Parents", notLoggedIn: "Non connecté",
    welcomeBack: "Bon retour, {name}", heroTitleA: "Apprendre les échecs avec ", heroTitleB: "", heroSubtitle: "Une plateforme complète pour apprendre les ouvertures, les finales, jouer contre l'IA et progresser.",
    startTraining: "Commencer", loginRegister: "Connexion / Inscription", loginBrand: "Connexion à Qiban", createAccount: "Créer un compte Qiban", login: "Connexion", register: "Inscription", phone: "Téléphone / numéro international", password: "Mot de passe", nickname: "Pseudo", role: "Rôle", student: "Élève", parentRole: "Parent", teacher: "Professeur", registerStart: "S'inscrire et commencer", loggingIn: "Connexion...", registering: "Inscription...", loginSuccess: "Succès ! Redirection...",
    learningCenter: "Centre d'apprentissage", practiceCenter: "Exercices", aiBattle: "Partie IA", pvpBattle: "Duel à deux", arenaTitle: "Tournoi", rankingTitle: "Classement", friendTitle: "Amis", parentCenter: "Espace parents", classManagement: "Gestion de classe", myClass: "Ma classe", bindParent: "Lier un parent",
    voiceTitle: "Réglages de voix", voiceUnsupported: "La synthèse vocale n'est pas prise en charge.", voiceNote: "Voix légère et sons doux pour l'instant. Une vraie voix enfant nécessite un service TTS autorisé.", voiceStyle: "Style", systemVoice: "Voix système", autoVoice: "Voix chinoise auto", voiceRate: "Vitesse", voiceNatural: "Naturel", testVoice: "Essayer", testSound: "Son",
    storySister: "Guide conteuse", childPlayer: "Jeune joueur", energyBuddy: "Copain motivant", patientCoach: "Coach patient", storyHint: "Plus lent et plus doux pour les jeunes enfants.", childHint: "Plus léger sans voix exagérée.", buddyHint: "Plus énergique pour encourager.", coachHint: "Plus calme pour les analyses.",
    rankRules: "Règles de rang", pointSources: "Points", rankRulesText: "Pion 0-99 · Cavalier 100-299 · Fou 300-599 · Tour 600-999 · Dame 1000-1499 · Roi 1500+", pointSourcesText: "Exercice correct +10 ; partie terminée +20. Séries, devoirs et bonus pourront être ajoutés.", rankProgress: "Progression", points: "pts", nextRank: "{points} pts avant {rank}", topRank: "Rang maximal atteint", answerCorrect: "Exercice correct +10", gameOverPoints: "Partie terminée +20", progress: "Progression {progress}%", speak: "Lire", stop: "Stop", noSpeechContent: "Aucun texte à lire", speechNotSupported: "Synthèse vocale non prise en charge.", sampleVoice: "Bonjour, c'est Qiban. Je vais parler plus lentement et expliquer les échecs avec des mots simples.", footer: "Qiban · Plateforme d'apprentissage des échecs",
  },
  es: {
    brand: "Qiban", appTitle: "Qiban - Centro de entrenamiento", siteTitle: "Qiban - Plataforma online para aprender ajedrez",
    home: "Inicio", training: "Entrenar", features: "Funciones", logout: "Salir", guide: "Guía",
    dashboard: "Inicio", learn: "Aprender", practice: "Ejercicios", battle: "IA", pvp: "Duelo", arena: "Torneo", rankings: "Ranking", friends: "Amigos", class: "Clase", manage: "Gestionar", parent: "Padres", notLoggedIn: "Sin sesión",
    welcomeBack: "Bienvenido de nuevo, {name}", heroTitleA: "Aprende ajedrez con ", heroTitleB: "", heroSubtitle: "Una plataforma completa para aperturas, finales, partidas contra IA y práctica real.",
    startTraining: "Empezar", loginRegister: "Entrar / Registrarse", loginBrand: "Entrar a Qiban", createAccount: "Crear cuenta Qiban", login: "Entrar", register: "Registrarse", phone: "Teléfono / número internacional", password: "Contraseña", nickname: "Apodo", role: "Rol", student: "Estudiante", parentRole: "Padre/Madre", teacher: "Profesor", registerStart: "Registrarse y empezar", loggingIn: "Entrando...", registering: "Registrando...", loginSuccess: "¡Listo! Redirigiendo...",
    learningCenter: "Centro de aprendizaje", practiceCenter: "Ejercicios", aiBattle: "Partida IA", pvpBattle: "Duelo de dos", arenaTitle: "Torneo", rankingTitle: "Ranking", friendTitle: "Amigos", parentCenter: "Centro para padres", classManagement: "Gestión de clase", myClass: "Mi clase", bindParent: "Vincular padre",
    voiceTitle: "Ajustes de voz", voiceUnsupported: "Este navegador no soporta voz.", voiceNote: "Por ahora usamos voz ligera y sonidos suaves. Una voz infantil real requiere un servicio TTS autorizado.", voiceStyle: "Estilo", systemVoice: "Voz del sistema", autoVoice: "Voz china automática", voiceRate: "Velocidad", voiceNatural: "Naturalidad", testVoice: "Probar", testSound: "Sonido",
    storySister: "Guía de cuentos", childPlayer: "Pequeño ajedrecista", energyBuddy: "Compañero alegre", patientCoach: "Entrenador paciente", storyHint: "Más lento y suave para niños pequeños.", childHint: "Más ligero sin voz exagerada.", buddyHint: "Más animado para motivar.", coachHint: "Más calmado para repasos.",
    rankRules: "Reglas de nivel", pointSources: "Puntos", rankRulesText: "Peón 0-99 · Caballo 100-299 · Alfil 300-599 · Torre 600-999 · Dama 1000-1499 · Rey 1500+", pointSourcesText: "Ejercicio correcto +10; partida terminada +20. Luego se pueden añadir rachas, tareas y torneos.", rankProgress: "Progreso", points: "pts", nextRank: "{points} pts para {rank}", topRank: "Nivel máximo alcanzado", answerCorrect: "Ejercicio correcto +10", gameOverPoints: "Partida terminada +20", progress: "Progreso {progress}%", speak: "Leer", stop: "Parar", noSpeechContent: "No hay texto para leer", speechNotSupported: "El navegador no soporta voz.", sampleVoice: "Hola, soy Qiban. Hablaré más despacio y explicaré ajedrez con palabras fáciles.", footer: "Qiban · Plataforma online para aprender ajedrez",
  },
};

function getLang() {
  return localStorage.getItem("ct_lang") || "zh";
}

function setLang(lang) {
  localStorage.setItem("ct_lang", I18N[lang] ? lang : "zh");
  applyI18n();
  if (typeof refreshI18n === "function") refreshI18n();
}

function t(key, vars = {}) {
  const dict = I18N[getLang()] || I18N.zh;
  let text = dict[key] || I18N.zh[key] || key;
  Object.entries(vars).forEach(([k, v]) => { text = text.replaceAll(`{${k}}`, String(v)); });
  return text;
}

function langSelector() {
  return `<select class="lang-select" onchange="setLang(this.value)" aria-label="Language">${Object.entries(LANGS).map(([k, v]) => `<option value="${k}" ${getLang() === k ? "selected" : ""}>${v.label}</option>`).join("")}</select>`;
}

function applyI18n() {
  const lang = getLang();
  document.documentElement.lang = (LANGS[lang] || LANGS.zh).html;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-title]").forEach(el => { el.title = t(el.dataset.i18nTitle); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
}

window.addEventListener("DOMContentLoaded", applyI18n);
const API = {
  token: localStorage.getItem("ct_token") || "",
  user: null,

  async req(path, method, body, authed = true) {
    const headers = { "Content-Type": "application/json" };
    if (authed && this.token) headers["Authorization"] = "Bearer " + this.token;
    const res = await fetch(path, { method: method || "GET", headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `请求失败(${res.status})`);
    return data;
  },

  async login(phone, password) {
    const data = await this.req("/auth/login", "POST", { phone, password }, false);
    this.token = data.token;
    this.user = data.user;
    localStorage.setItem("ct_token", this.token);
    localStorage.setItem("ct_user", JSON.stringify(data.user));
    return data;
  },

  async register(phone, password, role, name) {
    const data = await this.req("/auth/register", "POST", { phone, password, role, displayName: name }, false);
    this.token = data.token;
    this.user = data.user;
    localStorage.setItem("ct_token", this.token);
    localStorage.setItem("ct_user", JSON.stringify(data.user));
    return data;
  },

  async loginWithCode(phone, code, role, name) {
    const data = await this.req("/auth/login-with-code", "POST", { phone, code, role, displayName: name }, false);
    this.token = data.token;
    this.user = data.user;
    localStorage.setItem("ct_token", this.token);
    localStorage.setItem("ct_user", JSON.stringify(data.user));
    return data;
  },

  logout() {
    this.token = ""; this.user = null;
    localStorage.removeItem("ct_token"); localStorage.removeItem("ct_user");
    location.href = "/";
  },

  autoLogin() {
    const saved = localStorage.getItem("ct_user");
    if (this.token && saved) {
      this.user = JSON.parse(saved);
      return true;
    }
    return false;
  }
};

// ── Chess Board Rendering ──
const PIECES = {
  p:"♟",r:"♜",n:"♞",b:"♝",q:"♛",k:"♚",
  P:"♙",R:"♖",N:"♘",B:"♗",Q:"♕",K:"♔"
};

function parseFen(fen) {
  const rows = (fen || "8/8/8/8/8/8/8/8").split(" ")[0].split("/");
  return rows.map(r => {
    const line = [];
    for (const ch of r) {
      if (ch >= "1" && ch <= "8") for (let i = 0; i < +ch; i++) line.push("");
      else line.push(ch);
    }
    return line;
  });
}

function sqName(r, c) { return "abcdefgh"[c] + (8 - r); }

function renderBoard(el, fen, selected, onClick) {
  el.innerHTML = "";
  el.className = "board";
  const b = parseFen(fen), files = "abcdefgh";
  const top = document.createElement("div");
  top.className = "board-files board-files-top";
  const bottom = document.createElement("div");
  bottom.className = "board-files board-files-bottom";
  const left = document.createElement("div");
  left.className = "board-ranks board-ranks-left";
  const right = document.createElement("div");
  right.className = "board-ranks board-ranks-right";
  const grid = document.createElement("div");
  grid.className = "board-grid";

  for (let i = 0; i < 8; i++) {
    const fileTop = document.createElement("div");
    fileTop.className = "coord";
    fileTop.textContent = files[i];
    top.appendChild(fileTop);

    const fileBottom = document.createElement("div");
    fileBottom.className = "coord";
    fileBottom.textContent = files[i];
    bottom.appendChild(fileBottom);

    const rankLeft = document.createElement("div");
    rankLeft.className = "coord";
    rankLeft.textContent = String(8 - i);
    left.appendChild(rankLeft);

    const rankRight = document.createElement("div");
    rankRight.className = "coord";
    rankRight.textContent = String(8 - i);
    right.appendChild(rankRight);
  }

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = document.createElement("div");
      const sq = sqName(r, c);
      const piece = b[r][c] || "";
      cell.className = "cell " + ((r+c)%2===0 ? "light" : "dark") + (selected === sq ? " selected" : "");
      const span = document.createElement("span");
      span.className = "piece " + (piece === piece.toUpperCase() ? "white" : "black");
      span.textContent = PIECES[piece] || "";
      cell.appendChild(span);
      cell.onclick = () => onClick(sq, piece);
      grid.appendChild(cell);
    }
  }

  el.appendChild(top);
  el.appendChild(left);
  el.appendChild(grid);
  el.appendChild(right);
  el.appendChild(bottom);
}

// ── Rank Display ──
const RANKS = [
  { piece:"♟", title:"兵", level:1, min:0, next:100 },
  { piece:"♞", title:"骑士", level:2, min:100, next:300 },
  { piece:"♝", title:"主教", level:3, min:300, next:600 },
  { piece:"♜", title:"战车", level:4, min:600, next:1000 },
  { piece:"♛", title:"皇后", level:5, min:1000, next:1500 },
  { piece:"♚", title:"国王", level:6, min:1500, next:Infinity },
];

function getRank(points) {
  const safePoints = Math.max(0, Number(points) || 0);
  const rank = RANKS.find(r => safePoints >= r.min && safePoints < r.next) || RANKS[RANKS.length - 1];
  const nextRank = RANKS.find(r => r.min === rank.next) || null;
  const span = Number.isFinite(rank.next) ? rank.next - rank.min : 1;
  const progress = Number.isFinite(rank.next) ? Math.max(0, Math.min(100, Math.round(((safePoints - rank.min) / span) * 100))) : 100;
  return {
    ...rank,
    points: safePoints,
    progress,
    nextTitle: nextRank ? nextRank.title : "最高段位",
    toNext: Number.isFinite(rank.next) ? Math.max(0, rank.next - safePoints) : 0,
  };
}

function renderRankProgress(points) {
  const r = getRank(points);
  const nextText = r.toNext > 0 ? t("nextRank", { rank: r.nextTitle, points: r.toNext }) : t("topRank");
  return `
    <div class="rank-card">
      <div class="rank-main">
        <div class="rank-piece">${r.piece}</div>
        <div>
          <div class="rank-title">Lv.${r.level} ${r.title}</div>
          <div class="rank-sub">${r.points} ${t("points")} · ${nextText}</div>
        </div>
      </div>
      <div class="rank-progress" aria-label="段位进度"><span style="width:${r.progress}%"></span></div>
      <div class="rank-guide">
        <span>✅ ${t("answerCorrect")}</span>
        <span>🏁 ${t("gameOverPoints")}</span>
        <span>📈 ${t("progress", { progress: r.progress })}</span>
      </div>
    </div>`;
}

// ── Toast ──
function toast(msg) {
  const c = document.getElementById("toasts") || (() => { const d = document.createElement("div"); d.id = "toasts"; d.className = "toast-container"; document.body.appendChild(d); return d; })();
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── Escape HTML ──
function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

// ── Format Time ──
function fmtTime(ms) { const m = Math.floor(ms/60000), s = Math.floor((ms%60000)/1000); return m + ":" + (s<10?"0":"") + s; }
