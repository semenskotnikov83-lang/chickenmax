const state = {
  token: localStorage.getItem("chicken_token") || null,
  user: null,
  friends: [],
  friendRequests: { incoming: [], outgoing: [] },
  friendModalTab: "find",
  groups: [],
  activeFriend: null,
  activeGroup: null,
  sidebarTab: "all",
  isOled: localStorage.getItem("chicken_oled") === "true",
  ws: null,
  reconnectTimer: null,
  pingInterval: null,
  typingTimer: null,
  audioCtx: null,
  renderedMsgIds: new Set(),
  activeAudio: null,
  activeVoicePlayers: {},
  editingMsg: null,
  replyingTo: null,
  pinnedMsg: null,
  isSecretMode: false,
  aiBot: null,
  forwardingMsg: null,
  burnTimer: 0,
  voiceLock: {
    isLocked: false,
    startY: 0
  },
  voiceRecorder: {
    mediaRecorder: null,
    stream: null,
    chunks: [],
    timerInterval: null,
    seconds: 0
  },
  call: {
    peer: null,
    localStream: null,
    remoteStream: null,
    targetId: null,
    targetUser: null,
    isCaller: false,
    isVideo: false,
    cameraOff: false,
    facingMode: "user",
    timerInterval: null,
    seconds: 0,
    isMuted: false,
    isRinging: false,
    ringtoneInterval: null,
    iceCandidatesQueue: []
  },
  videoNoteRecorder: {
    mediaRecorder: null,
    stream: null,
    chunks: [],
    timerInterval: null,
    seconds: 0,
    facingMode: "user"
  }
};

const EMOJIS = [
  "👍", "👎", "❤️", "🔥", "😂", "🤣", "💀", "🐔", "🐣", "🍗",
  "🤡", "💩", "🚀", "😎", "🥳", "🥺", "😡", "🤫", "🤝", "👑",
  "💯", "✨", "⚡", "🎯", "👀", "😴", "🤮", "🤖", "👾", "🎮",
  "💣", "💎", "😀", "😃", "😄", "😁", "😆", "😅", "🙂", "🙃",
  "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙",
  "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤔", "🤐",
  "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌",
  "😔", "😪", "🤤", "😷", "🤒", "🤕", "🤢", "🤧", "🥵", "🥶",
  "🥴", "😵", "🤯", "🤠", "🤓", "🧐", "😕", "😟", "🙁", "☹️",
  "😮", "😯", "😲", "😳", "😦", "😧", "😨", "😰", "😥", "😢",
  "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤",
  "😠", "🤬", "😈", "👿", "☠️", "👹", "👺", "👻", "👽", "👋",
  "🤚", "🖐️", "✋", "🖖", "👌", "🤏", "✌️", "🤞", "🤟", "🤘",
  "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "✊", "👊", "🤛",
  "🤜", "👏", "🙌", "👐", "🤲", "🙏", "✍️", "💅", "🤳", "💪",
  "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🦷", "🦴",
  "👁️", "👅", "👄", "🐥", "🐓", "🥚", "🍳", "🌾", "🦊", "🐺",
  "🐶", "🐱", "🐭", "🐹", "🐰", "🐻", "🐼", "🐨", "🐯", "🦁",
  "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🦍",
  "🦧", "🦝", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞",
  "🐜", "🕷️", "🕸️", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙",
  "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋",
  "🦈", "🐊", "🦅", "🦆", "🦢", "🦉", "🦩", "🦚", "🦜", "🦇",
  "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥",
  "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟",
  "💢", "💥", "💫", "💦", "💨", "🕳️", "💬", "🗨️", "🗯️", "💭",
  "💤", "🌟", "⭐", "🌠", "🍕", "🍔", "🍟", "🌭", "🍿", "🧂",
  "🥓", "🥩", "🍖", "🧀", "🥞", "🧇", "🍞", "🥐", "🥖", "🥨",
  "🥯", "🥗", "🥙", "🥪", "🌮", "🌯", "🥫", "🍝", "🍜", "🍲",
  "🍛", "🍣", "🍱", "🥟", "🍤", "🍙", "🍧", "🍨", "🍦", "🥧",
  "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍩", "🍪", "☕",
  "🍵", "🧃", "🥤", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍹",
  "🍾", "🧊", "🕹️", "🎲", "🎰", "🎳", "🏆", "🥇", "🥈", "🥉",
  "🏅", "🎖️", "🥊", "🥋", "🤺", "🛹", "🏹", "🎣", "🔫", "🧨",
  "🔪", "🗡️", "⚔️", "🛡️", "🪓", "💻", "🖥️", "📱", "⌨️", "🖱️",
  "💽", "💾", "💿", "🔋", "🔌", "💡", "🔦", "💵", "💸", "💳",
  "⚖️", "🧰", "🔧", "🔨", "⚒️", "🛠️", "⛏️", "⚙️", "🗝️", "🔑",
  "🔒", "🔓", "🗿", "🕶️", "🧲", "🧬", "🧪", "🔬", "🔭", "📡",
  "🛸", "☢️", "☣️", "🚬"
];

const EMOJI_CATEGORIES = [
  { name: "Все", emojis: EMOJIS }
];

const VOICE_PLAY_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="transform:translateX(1px);display:block;"><path d="M8 5.14v13.72a1.2 1.2 0 0 0 1.83 1.03l11.2-6.86a1.2 1.2 0 0 0 0-2.06L9.83 4.11A1.2 1.2 0 0 0 8 5.14z"/></svg>`;
const VOICE_PAUSE_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display:block;"><rect x="6.5" y="4.5" width="3.5" height="15" rx="1.75"/><rect x="14" y="4.5" width="3.5" height="15" rx="1.75"/></svg>`;
const VOICE_TRANSCRIBE_ICON = `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="display:block;"><path d="M5 17h2l.9-2.6h4.2l.9 2.6h2L10.8 5.5h-1.6L5 17zm3.6-4.3l1.4-4.2 1.4 4.2H8.6z"/><path d="M17 9.5c.8.7 1.3 1.6 1.3 2.5s-.5 1.8-1.3 2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M19.8 7c1.3 1.3 2.2 3.1 2.2 5s-.9 3.7-2.2 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const VOICE_TRANSCRIBE_LOADING_ICON = `<svg class="voice-transcribe-spinner" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display:block;"><circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.2)"/><path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor"/></svg>`;

const QUICK_REACTIONS = ["👍", "❤️", "🔥", "😂", "🐔", "💀", "🎉", "🤡", "👎"];

const STICKER_CATEGORIES = [
  {
    name: "🐔 ChickenMax Clan",
    stickers: [
      "🐔", "🍗", "🐣", "🐥", "🐓", "🥚",
      "🍳", "🌾", "🪶", "🦊", "🐺", "🥊",
      "👑", "🔥", "🕶️", "🏆", "🪺", "🦅",
      "🦉", "🎯"
    ]
  },
  {
    name: "🗿 Мемы и Чэды",
    stickers: [
      "🗿", "🫡", "💀", "☠️", "🤡", "💩",
      "😎", "🤓", "🕶️", "🤌", "🖕", "🤝",
      "👀", "🧠", "🧢", "🍿", "🤑", "😈",
      "🫠", "🫣"
    ]
  },
  {
    name: "🎮 Раст и PVP",
    stickers: [
      "💣", "🧨", "🔫", "🗡️", "⚔️", "🛡️",
      "🪓", "🏹", "🎯", "🎮", "🕹️", "👾",
      "🥊", "🥋", "☣️", "☢️", "💎", "🏆",
      "🥇", "🪙"
    ]
  },
  {
    name: "🔥 Эмоции и Реакции",
    stickers: [
      "🥳", "😭", "😱", "🤯", "😡", "🤬",
      "🤮", "🥺", "🥶", "🥵", "😴", "🤫",
      "🤪", "🤤", "🤢", "🤧", "🤐", "🙄",
      "😬", "❤️‍🔥"
    ]
  },
  {
    name: "💎 Чилл и Флекс",
    stickers: [
      "🍕", "🍔", "🍟", "🌭", "🥓", "🥩",
      "🍣", "🍩", "🍺", "🍻", "🥂", "🍷",
      "🥃", "☕", "🧋", "🚬", "💸", "💵",
      "🚀", "🛸"
    ]
  },
  {
    name: "🐺 Звери и Существа",
    stickers: [
      "🐺", "🦊", "🐸", "🐵", "🦍", "🦧",
      "🦁", "🐯", "🐻", "🐼", "🐨", "🦇",
      "🐍", "🦎", "🦖", "🦕", "🦈", "🐊",
      "🐙", "🦄"
    ]
  }
];

const STICKERS = STICKER_CATEGORIES.flatMap((c) => c.stickers);

const GIFS = [
  { title: "Курица танцует", url: "https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif" },
  { title: "Чикен паника", url: "https://media.giphy.com/media/10hexb48cC1e0M/giphy.gif" },
  { title: "Крутой петух", url: "https://media.giphy.com/media/26gsu7e96F8bV6dCo/giphy.gif" },
  { title: "Попкорн", url: "https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif" },
  { title: "Огонь", url: "https://media.giphy.com/media/nrXif9YExO9EI/giphy.gif" },
  { title: "Шок", url: "https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif" },
  { title: "Кот танцует", url: "https://media.giphy.com/media/JPbDhAzWTv45Z61yHV/giphy.gif" },
  { title: "Дай пять", url: "https://media.giphy.com/media/3oEjHV0z8S7WM4MwnK/giphy.gif" },
  { title: "Аплодисменты", url: "https://media.giphy.com/media/nbvFVPiEiJH6Q/giphy.gif" }
];

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.yandex.ru:3478" },
    { urls: "stun:stun.yandex.net:3478" },
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.miwifi.com:3478" },
    { urls: "stun:staticauth.openrelay.metered.ca:80" },
    {
      urls: [
        "turn:staticauth.openrelay.metered.ca:80",
        "turn:staticauth.openrelay.metered.ca:443",
        "turn:staticauth.openrelay.metered.ca:443?transport=tcp",
        "turns:staticauth.openrelay.metered.ca:443?transport=tcp"
      ],
      username: "openrelayproject",
      credential: "openrelayprojectsecret"
    }
  ]
};

let cachedIceServers = null;
let lastIceFetch = 0;

async function prepareIceServers() {
  const now = Date.now();
  if (cachedIceServers && (now - lastIceFetch < 10 * 60 * 1000)) {
    RTC_CONFIG.iceServers = cachedIceServers;
    return;
  }
  try {
    const res = await fetch("/api/rtc/ice-servers");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
        cachedIceServers = data.iceServers;
        lastIceFetch = now;
        RTC_CONFIG.iceServers = cachedIceServers;
      }
    }
  } catch (e) {}
}

function setAppHeight() {
  let height = window.innerHeight;
  let offsetTop = 0;
  if (window.visualViewport) {
    height = Math.round(window.visualViewport.height);
    offsetTop = Math.round(window.visualViewport.offsetTop || 0);
  }
  document.documentElement.style.setProperty("--app-height", `${height}px`);
  document.documentElement.style.setProperty("--app-offset-top", `${offsetTop}px`);
  const isKeyboard = window.visualViewport && window.visualViewport.height < (window.screen.availHeight || window.innerHeight) * 0.78;
  if (isKeyboard) {
    document.body.classList.add("keyboard-open");
  } else {
    document.body.classList.remove("keyboard-open");
  }
}
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", () => {
    setAppHeight();
    if (state.activeFriend || state.activeGroup) {
      scrollToBottom();
      setTimeout(scrollToBottom, 80);
      setTimeout(scrollToBottom, 250);
    }
  });
  window.visualViewport.addEventListener("scroll", () => {
    setAppHeight();
  });
}
window.addEventListener("resize", setAppHeight);
window.addEventListener("orientationchange", () => setTimeout(setAppHeight, 150));
window.addEventListener("scroll", () => {
  if (window.scrollY !== 0 || window.scrollX !== 0) {
    window.scrollTo(0, 0);
  }
});

function playNotificationSound() {
  try {
    if (!state.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      state.audioCtx = new AudioCtxClass();
    }
    if (state.audioCtx.state === "suspended") {
      state.audioCtx.resume();
    }
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    osc.type = "sine";
    const now = state.audioCtx.currentTime;
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(state.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  } catch (e) {}
}

function startRingtone(isIncoming = false) {
  stopRingtone();
  try {
    if (!state.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      state.audioCtx = new AudioCtxClass();
    }
    if (state.audioCtx.state === "suspended") {
      state.audioCtx.resume();
    }

    const playTone = () => {
      if (!state.call.isRinging) return;
      try {
        if (state.audioCtx.state === "suspended") {
          state.audioCtx.resume();
        }
        const now = state.audioCtx.currentTime;
        if (isIncoming) {
          const osc1 = state.audioCtx.createOscillator();
          const osc2 = state.audioCtx.createOscillator();
          const gain = state.audioCtx.createGain();

          osc1.type = "sine";
          osc2.type = "sine";
          osc1.frequency.setValueAtTime(523.25, now);
          osc1.frequency.setValueAtTime(659.25, now + 0.2);
          osc1.frequency.setValueAtTime(783.99, now + 0.4);

          osc2.frequency.setValueAtTime(659.25, now);
          osc2.frequency.setValueAtTime(783.99, now + 0.2);
          osc2.frequency.setValueAtTime(1046.50, now + 0.4);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.exponentialRampToValueAtTime(0.18, now + 0.05);
          gain.gain.setValueAtTime(0.18, now + 0.65);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(state.audioCtx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.92);
          osc2.stop(now + 0.92);
        } else {
          const osc = state.audioCtx.createOscillator();
          const gain = state.audioCtx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(425, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.exponentialRampToValueAtTime(0.16, now + 0.04);
          gain.gain.setValueAtTime(0.16, now + 0.95);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

          osc.connect(gain);
          gain.connect(state.audioCtx.destination);

          osc.start(now);
          osc.stop(now + 1.02);
        }
      } catch (e) {}
    };

    state.call.isRinging = true;
    playTone();
    state.call.ringtoneInterval = setInterval(playTone, isIncoming ? 2200 : 3500);
  } catch (e) {}
}

function stopRingtone() {
  state.call.isRinging = false;
  if (state.call.ringtoneInterval) {
    clearInterval(state.call.ringtoneInterval);
    state.call.ringtoneInterval = null;
  }
}

function applyOledTheme(enabled) {
  state.isOled = enabled;
  localStorage.setItem("chicken_oled", enabled ? "true" : "false");
  document.body.classList.toggle("oled-theme", enabled);
  const chk = document.getElementById("oledToggle");
  if (chk) chk.checked = enabled;
  const btn = document.getElementById("themeToggleBtn");
  if (btn) {
    btn.innerHTML = enabled
      ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
      : `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    btn.title = enabled ? "Включить обычную тему" : "OLED Pure Black режим";
  }
}

function toggleOledTheme() {
  applyOledTheme(!state.isOled);
}

let authMode = "login";

function switchAuthTab(mode) {
  authMode = mode;
  document.getElementById("tabLogin").classList.toggle("active", mode === "login");
  document.getElementById("tabRegister").classList.toggle("active", mode === "register");
  document.getElementById("authSubmitBtn").textContent = mode === "login" ? "Войти в курятник" : "Создать аккаунт";
  document.getElementById("authError").classList.add("hidden");
}

async function handleAuth(event) {
  event.preventDefault();
  const username = document.getElementById("authUsername").value.trim();
  const password = document.getElementById("authPassword").value;
  const errEl = document.getElementById("authError");
  errEl.classList.add("hidden");

  const endpoint = authMode === "login" ? "/api/login" : "/api/register";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.detail || "Ошибка авторизации";
      errEl.classList.remove("hidden");
      return;
    }
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("chicken_token", state.token);
    initApp();
  } catch (err) {
    errEl.textContent = "Сервер недоступен. Проверьте соединение.";
    errEl.classList.remove("hidden");
  }
}

async function checkAuth() {
  applyOledTheme(state.isOled);
  if (!state.token) {
    showAuth();
    return;
  }
  try {
    const res = await fetch("/api/me", {
      headers: { "Authorization": `Bearer ${state.token}` }
    });
    if (!res.ok) {
      logout();
      return;
    }
    state.user = await res.json();
    initApp();
  } catch (e) {
    showAuth();
  }
}

function showAuth() {
  document.getElementById("authScreen").classList.remove("hidden");
  document.getElementById("appScreen").classList.add("hidden");
}

function logout() {
  endCall();
  if (state.ws) {
    state.ws.close();
  }
  clearTimeout(state.reconnectTimer);
  localStorage.removeItem("chicken_token");
  state.token = null;
  state.user = null;
  state.activeFriend = null;
  state.activeGroup = null;
  state.friends = [];
  state.groups = [];
  state.renderedMsgIds.clear();
  showAuth();
}

async function initApp() {
  setAppHeight();
  applyOledTheme(state.isOled);

  document.getElementById("authScreen").classList.add("hidden");
  document.getElementById("appScreen").classList.remove("hidden");

  updateMyProfileDisplay();

  renderEmojiGrid();
  prepareIceServers();
  try {
    const aiRes = await fetch("/api/ai/bot");
    if (aiRes.ok) state.aiBot = await aiRes.json();
  } catch (e) {}
  await loadFriends();
  await loadGroups();
  connectWebSocket();
  startSyncLoop();
  checkAndPromptNotifications();

  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    registerWebPush();
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (!event.data) return;
      if (event.data.type === "open_chat_from_push" && event.data.sender_id) {
        const senderId = Number(event.data.sender_id);
        const friend = state.friends.find(f => Number(f.id) === senderId);
        if (friend) selectFriend(friend);
      }
    });
  }
}

function updateMyProfileDisplay() {
  if (!state.user) return;
  const myUserEl = document.getElementById("myUsername");
  if (myUserEl) {
    myUserEl.textContent = state.user.username;
    if (state.user.profile_color) {
      myUserEl.style.color = state.user.profile_color;
    } else {
      myUserEl.style.color = "";
    }
  }
  const myBadgeEl = document.getElementById("myStatusBadge");
  if (myBadgeEl) {
    myBadgeEl.textContent = state.user.custom_status || "";
  }
  const myCodeEl = document.getElementById("myUserCode");
  if (myCodeEl) {
    myCodeEl.textContent = state.user.user_code;
  }
  updateAvatarElement(document.getElementById("myAvatar"), state.user);
  updateAvatarElement(document.getElementById("myProfileAvatar"), state.user);

  const myBannerEl = document.getElementById("myProfileBanner");
  if (myBannerEl) {
    const b = state.user.custom_banner || "linear-gradient(135deg, #1f1c2c, #928dab)";
    if (b.startsWith("http") || b.startsWith("/uploads/") || b.startsWith("data:")) {
      myBannerEl.style.background = `url('${b}') center/cover no-repeat`;
    } else {
      myBannerEl.style.background = b;
    }
  }
}

function switchSidebarTab(tab) {
  state.sidebarTab = tab;
  document.getElementById("tabAllChats").classList.toggle("active", tab === "all");
  document.getElementById("tabGroups").classList.toggle("active", tab === "groups");
  renderFriendsList();
}

function renderEmojiGrid() {
  const grid = document.getElementById("emojiGrid");
  if (!grid || grid.children.length > 0) return;
  grid.innerHTML = "";
  EMOJIS.forEach((em) => {
    const btn = document.createElement("div");
    btn.className = "emoji-item";
    btn.textContent = em;
    btn.onclick = () => insertEmoji(em);
    grid.appendChild(btn);
  });
}

function renderStickersGrid() {
  const grid = document.getElementById("stickersGrid");
  if (!grid || grid.children.length > 0) return;
  grid.innerHTML = "";
  STICKER_CATEGORIES.forEach((cat) => {
    cat.stickers.forEach((st) => {
      const item = document.createElement("div");
      item.className = "sticker-item";
      item.innerHTML = `<span>${st}</span>`;
      item.onclick = () => sendSticker(st);
      grid.appendChild(item);
    });
  });
}

function renderGifsGrid() {
  const grid = document.getElementById("gifsGrid");
  if (!grid || grid.children.length > 0) return;
  GIFS.forEach((g) => {
    const item = document.createElement("div");
    item.className = "gif-item";
    item.title = g.title;
    item.innerHTML = `<img src="${g.url}" loading="lazy" alt="${escapeHtml(g.title)}">`;
    item.onclick = () => sendGif(g.url);
    grid.appendChild(item);
  });
}

function switchPickerTab(tab) {
  document.getElementById("tabEmoji").classList.toggle("active", tab === "emoji");
  document.getElementById("tabStickers").classList.toggle("active", tab === "stickers");
  document.getElementById("tabGifs").classList.toggle("active", tab === "gifs");

  document.getElementById("emojiGrid").classList.toggle("hidden", tab !== "emoji");
  document.getElementById("stickersGrid").classList.toggle("hidden", tab !== "stickers");
  document.getElementById("gifsGrid").classList.toggle("hidden", tab !== "gifs");

  if (tab === "stickers") renderStickersGrid();
  if (tab === "gifs") renderGifsGrid();
}

function toggleEmojiPicker() {
  const picker = document.getElementById("emojiPicker");
  picker.classList.toggle("hidden");
}

function closeEmojiPicker() {
  const picker = document.getElementById("emojiPicker");
  if (picker && !picker.classList.contains("hidden")) {
    picker.classList.add("hidden");
  }
}

function updateChatInputState() {
  const form = document.getElementById("chatForm");
  const input = document.getElementById("messageInput");
  if (!form || !input) return;
  const hasText = input.value.trim().length > 0;
  form.classList.toggle("has-text", hasText);
}

function insertEmoji(em) {
  const input = document.getElementById("messageInput");
  input.value += em;
  input.focus();
  updateChatInputState();
}

function updateAvatarElement(el, entity) {
  if (!el || !entity) return;

  const name = entity.username || entity.name || entity.sender_username || "CH";
  const initials = String(name).trim().slice(0, 2).toUpperCase() || "CH";
  const color = entity.avatar_color || entity.sender_color || entity.color || "#5865F2";
  const rawUrl = String(entity.avatar_url || entity.sender_avatar || "").trim();
  const lowerUrl = rawUrl.toLowerCase();
  const isValidUrl = Boolean(
    rawUrl &&
    lowerUrl !== "null" &&
    lowerUrl !== "undefined" &&
    lowerUrl !== "none" &&
    lowerUrl !== "false"
  );

  const applyFallback = () => {
    el.style.backgroundImage = "none";
    el.style.backgroundColor = color;
    el.textContent = initials;
  };

  if (!isValidUrl) {
    el.dataset.avatarSrc = "";
    applyFallback();
    return;
  }

  el.dataset.avatarSrc = rawUrl;

  const img = new Image();
  img.onload = () => {
    if (el.dataset.avatarSrc === rawUrl) {
      el.style.backgroundImage = `url("${rawUrl.replace(/"/g, '\\"')}")`;
      el.style.backgroundColor = "transparent";
      el.textContent = "";
    }
  };
  img.onerror = () => {
    if (el.dataset.avatarSrc === rawUrl) {
      applyFallback();
    }
  };
  img.src = rawUrl;

  if (img.complete && img.naturalWidth > 0) {
    el.style.backgroundImage = `url("${rawUrl.replace(/"/g, '\\"')}")`;
    el.style.backgroundColor = "transparent";
    el.textContent = "";
  } else {
    applyFallback();
  }
}

function resizeImageToDataUrl(file, maxWidth = 256, maxHeight = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        let dataUrl = canvas.toDataURL("image/webp", quality);
        if (!dataUrl.startsWith("data:image/webp")) {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function triggerAvatarUpload() {
  document.getElementById("avatarFileInput").click();
}

async function handleAvatarFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (file.size > 15 * 1024 * 1024) {
    showToast("Файл слишком большой (максимум 15 МБ)");
    event.target.value = "";
    return;
  }

  showToast("Сохранение аватара...");

  try {
    const dataUrl = await resizeImageToDataUrl(file, 256, 256, 0.85);
    const res = await fetch("/api/user/avatar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${state.token}`
      },
      body: JSON.stringify({ avatar_data: dataUrl })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.detail || "Ошибка сохранения аватара");
      event.target.value = "";
      return;
    }
    state.user.avatar_url = data.avatar_url || dataUrl;
    updateAvatarElement(document.getElementById("myAvatar"), state.user);
    updateAvatarElement(document.getElementById("myProfileAvatar"), state.user);
    showToast("Аватар успешно сохранен в базе!");
  } catch (e) {
    showToast("Ошибка сохранения аватара");
  } finally {
    event.target.value = "";
  }
}

function openMyProfileModal() {
  const modal = document.getElementById("profileModal");
  if (!modal) return;
  modal.classList.remove("hidden");

  document.getElementById("editUsernameInput").value = state.user.username;
  document.getElementById("editBioInput").value = state.user.bio || "";
  document.getElementById("editCustomStatusInput").value = state.user.custom_status || "";
  document.getElementById("editProfileColorInput").value = state.user.profile_color || "#5865F2";
  const bannerVal = state.user.custom_banner || "linear-gradient(135deg, #1f1c2c, #928dab)";
  const bannerInput = document.getElementById("editProfileBannerInput");
  if (bannerInput) bannerInput.value = bannerVal;
  document.getElementById("myProfileJoined").textContent = state.user.created_at ? `В ChickenMax с ${state.user.created_at}` : "В ChickenMax с 2024";

  selectStatusBadge(state.user.custom_status || "", false);
  selectProfileColor(state.user.profile_color || "#5865F2", false);
  selectBannerPreset(bannerVal, false);
  updateProfilePreview();

  document.getElementById("myProfileCodePreview").textContent = state.user.user_code;
  document.getElementById("profileError").classList.add("hidden");
  document.getElementById("profileSuccess").classList.add("hidden");
  const oledChk = document.getElementById("oledToggle");
  if (oledChk) oledChk.checked = state.isOled;
  updateNotifSettingsToggle();

  updateAvatarElement(document.getElementById("myProfileAvatar"), state.user);
}

function closeMyProfileModal() {
  const modal = document.getElementById("profileModal");
  if (modal) modal.classList.add("hidden");
}

function selectStatusBadge(badge, triggerPreview = true) {
  const input = document.getElementById("editCustomStatusInput");
  if (input) input.value = badge;
  const chips = document.querySelectorAll("#statusBadgePicker .status-chip");
  chips.forEach((c) => {
    c.classList.toggle("active", c.getAttribute("data-badge") === badge);
  });
  if (triggerPreview) updateProfilePreview();
}

function onCustomStatusInput(val) {
  const chips = document.querySelectorAll("#statusBadgePicker .status-chip");
  chips.forEach((c) => {
    c.classList.toggle("active", c.getAttribute("data-badge") === val);
  });
  updateProfilePreview();
}

function selectProfileColor(color, triggerPreview = true) {
  const input = document.getElementById("editProfileColorInput");
  if (input) input.value = color;
  const customColorPicker = document.getElementById("customColorPicker");
  if (customColorPicker && color.startsWith("#") && color.length === 7) {
    customColorPicker.value = color;
  }
  const chips = document.querySelectorAll("#colorPalettePicker .color-chip");
  chips.forEach((c) => {
    c.classList.toggle("active", c.getAttribute("data-color") === color);
  });
  if (triggerPreview) updateProfilePreview();
}

function selectBannerPreset(banner, triggerPreview = true) {
  const input = document.getElementById("editProfileBannerInput");
  if (input) input.value = banner;
  const chips = document.querySelectorAll("#bannerPresetsPicker .banner-preset-chip");
  chips.forEach((c) => {
    c.classList.toggle("active", c.getAttribute("data-banner") === banner);
  });
  if (triggerPreview) updateProfilePreview();
}

function triggerBannerUpload() {
  const input = document.getElementById("bannerFileInput");
  if (input) input.click();
}

async function handleBannerFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (file.size > 15 * 1024 * 1024) {
    showToast("Картинка слишком большая (макс. 15 МБ)");
    return;
  }
  try {
    showToast("Сохранение баннера...");
    const dataUrl = await resizeImageToDataUrl(file, 800, 260, 0.82);
    const res = await fetch("/api/user/banner", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${state.token}`
      },
      body: JSON.stringify({ banner_data: dataUrl })
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      state.user.custom_banner = data.custom_banner || dataUrl;
      const input = document.getElementById("editProfileBannerInput");
      if (input) input.value = state.user.custom_banner;
      updateProfilePreview();
      updateMyProfileDisplay();
      showToast("Баннер сохранен в базе!");
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.detail || "Не удалось загрузить баннер");
    }
  } catch (e) {
    showToast("Ошибка сети при загрузке баннера");
  } finally {
    event.target.value = "";
  }
}

function updateProfilePreview() {
  const username = document.getElementById("editUsernameInput").value.trim() || state.user.username;
  const customStatus = document.getElementById("editCustomStatusInput").value.trim();
  const profileColor = document.getElementById("editProfileColorInput").value || "#5865F2";
  const bannerInput = document.getElementById("editProfileBannerInput");
  const banner = bannerInput ? bannerInput.value : "";

  const namePrev = document.getElementById("myProfileUsernamePreview");
  const badgePrev = document.getElementById("myProfileStatusBadge");
  if (namePrev) {
    namePrev.textContent = username;
    namePrev.style.color = profileColor;
  }
  if (badgePrev) {
    badgePrev.textContent = customStatus;
  }
  const myBannerEl = document.getElementById("myProfileBanner");
  if (myBannerEl && banner) {
    if (banner.startsWith("http") || banner.startsWith("/uploads/") || banner.startsWith("data:")) {
      myBannerEl.style.background = `url('${banner}') center/cover no-repeat`;
    } else {
      myBannerEl.style.background = banner;
    }
  }
}

async function handleSaveProfile(event) {
  event.preventDefault();
  const username = document.getElementById("editUsernameInput").value.trim();
  const bio = document.getElementById("editBioInput").value.trim();
  const custom_status = document.getElementById("editCustomStatusInput").value.trim();
  const profile_color = document.getElementById("editProfileColorInput").value.trim();
  const custom_banner = document.getElementById("editProfileBannerInput") ? document.getElementById("editProfileBannerInput").value.trim() : "";
  const errEl = document.getElementById("profileError");
  const succEl = document.getElementById("profileSuccess");
  errEl.classList.add("hidden");
  succEl.classList.add("hidden");

  if (!username) {
    errEl.textContent = "Никнейм не может быть пустым";
    errEl.classList.remove("hidden");
    return;
  }

  try {
    const res = await fetch("/api/user/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${state.token}`
      },
      body: JSON.stringify({ username, bio, custom_status, profile_color, custom_banner })
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.detail || "Не удалось сохранить профиль";
      errEl.classList.remove("hidden");
      return;
    }

    state.user.username = data.username;
    state.user.bio = data.bio;
    state.user.custom_status = data.custom_status || "";
    state.user.profile_color = data.profile_color || "";
    state.user.custom_banner = data.custom_banner || custom_banner;

    updateMyProfileDisplay();

    succEl.textContent = "Профиль успешно обновлен!";
    succEl.classList.remove("hidden");

    setTimeout(() => {
      closeMyProfileModal();
    }, 700);
  } catch (e) {
    errEl.textContent = "Ошибка сети";
    errEl.classList.remove("hidden");
  }
}

state.currentSharedMedia = { photos: [], videos: [], files: [], voices: [], links: [] };

async function openTargetProfileModal(targetUser) {
  const modal = document.getElementById("targetProfileModal");
  if (!modal) return;
  modal.classList.remove("hidden");

  state.activeTargetUser = targetUser;

  const bannerEl = document.getElementById("targetProfileBanner");
  if (bannerEl) {
    const b = targetUser.custom_banner || "linear-gradient(135deg, #1f1c2c, #928dab)";
    if (b.startsWith("http") || b.startsWith("/uploads/") || b.startsWith("data:")) {
      bannerEl.style.background = `url('${b}') center/cover no-repeat`;
    } else {
      bannerEl.style.background = b;
    }
  }

  const nameEl = document.getElementById("targetProfileUsername");
  nameEl.textContent = targetUser.username;
  if (targetUser.profile_color) {
    nameEl.style.color = targetUser.profile_color;
  } else {
    nameEl.style.color = "";
  }

  const badgeEl = document.getElementById("targetProfileStatusBadge");
  badgeEl.textContent = targetUser.custom_status || "";

  document.getElementById("targetProfileCode").textContent = targetUser.user_code || (targetUser.code ? `#${targetUser.code}` : "");
  
  const statusEl = document.getElementById("targetProfileStatus");
  statusEl.textContent = targetUser.status_text || (targetUser.is_online ? "в сети" : "был(а) недавно");
  statusEl.className = `target-status ${targetUser.is_online ? "online" : ""}`;
  
  document.getElementById("targetProfileBio").textContent = targetUser.bio || "Пока ничего не написал(а)";
  document.getElementById("targetProfileCreated").textContent = targetUser.created_at || "недавно";
  updateAvatarElement(document.getElementById("targetProfileAvatar"), targetUser);

  closeAllSharedMediaDrawers();
  resetSharedMediaCounters();

  loadSharedMediaForTarget(targetUser.id);

  try {
    const res = await fetch(`/api/user/${targetUser.id}`, {
      headers: { "Authorization": `Bearer ${state.token}` }
    });
    if (res.ok) {
      const data = await res.json();
      state.activeTargetUser = { ...state.activeTargetUser, ...data };
      nameEl.textContent = data.username;
      if (data.profile_color) nameEl.style.color = data.profile_color;
      badgeEl.textContent = data.custom_status || "";
      document.getElementById("targetProfileBio").textContent = data.bio || "Пока ничего не написал(а)";
      document.getElementById("targetProfileCreated").textContent = data.created_at || "недавно";
      statusEl.textContent = data.status_text || (data.is_online ? "в сети" : "был(а) недавно");
      statusEl.className = `target-status ${data.is_online ? "online" : ""}`;
      updateAvatarElement(document.getElementById("targetProfileAvatar"), data);
      if (bannerEl && data.custom_banner) {
        const b = data.custom_banner;
        if (b.startsWith("http") || b.startsWith("/uploads/") || b.startsWith("data:")) {
          bannerEl.style.background = `url('${b}') center/cover no-repeat`;
        } else {
          bannerEl.style.background = b;
        }
      }
    }
  } catch (e) {}
}

async function openTargetProfileModalById(userId) {
  if (!userId) return;
  if (state.user && Number(state.user.id) === Number(userId)) {
    openMyProfileModal();
    return;
  }
  const cachedFriend = state.friends.find(f => Number(f.id) === Number(userId));
  if (cachedFriend) {
    openTargetProfileModal(cachedFriend);
    return;
  }
  try {
    const res = await fetch(`/api/user/${userId}`, {
      headers: { "Authorization": `Bearer ${state.token}` }
    });
    if (res.ok) {
      const data = await res.json();
      openTargetProfileModal(data);
    } else {
      showToast("Пользователь не найден");
    }
  } catch (e) {
    showToast("Ошибка сети");
  }
}

function closeTargetProfileModal() {
  const modal = document.getElementById("targetProfileModal");
  if (modal) modal.classList.add("hidden");
  closeAllSharedMediaDrawers();
}

function resetSharedMediaCounters() {
  const pc = document.getElementById("sharedPhotosCount");
  const vc = document.getElementById("sharedVideosCount");
  const fc = document.getElementById("sharedFilesCount");
  const voc = document.getElementById("sharedVoicesCount");
  const lc = document.getElementById("sharedLinksCount");
  if (pc) pc.textContent = "0 фотографий";
  if (vc) vc.textContent = "0 видео";
  if (fc) fc.textContent = "0 файлов";
  if (voc) voc.textContent = "0 голосовых";
  if (lc) lc.textContent = "0 ссылок";
}

function closeAllSharedMediaDrawers() {
  const drawers = document.querySelectorAll(".shared-media-drawer");
  drawers.forEach((d) => d.classList.add("hidden"));
}

async function loadSharedMediaForTarget(targetId) {
  try {
    const res = await fetch(`/api/shared-media?target_id=${targetId}`, {
      headers: { "Authorization": `Bearer ${state.token}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    state.currentSharedMedia = data;

    const pc = document.getElementById("sharedPhotosCount");
    const vc = document.getElementById("sharedVideosCount");
    const fc = document.getElementById("sharedFilesCount");
    const voc = document.getElementById("sharedVoicesCount");
    const lc = document.getElementById("sharedLinksCount");
    if (pc) pc.textContent = `${data.photos.length} ${pluralize(data.photos.length, "фотография", "фотографии", "фотографий")}`;
    if (vc) vc.textContent = `${data.videos.length} ${pluralize(data.videos.length, "видео", "видео", "видео")}`;
    if (fc) fc.textContent = `${data.files.length} ${pluralize(data.files.length, "файл", "файла", "файлов")}`;
    if (voc) voc.textContent = `${data.voices.length} ${pluralize(data.voices.length, "голосовое", "голосовых", "голосовых")}`;
    if (lc) lc.textContent = `${data.links.length} ${pluralize(data.links.length, "ссылка", "ссылки", "ссылок")}`;
  } catch (e) {}
}

function pluralize(n, one, two, five) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return five;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return two;
  return five;
}

function toggleSharedMediaCategory(cat) {
  const drawerId = `shared${cat.charAt(0).toUpperCase() + cat.slice(1)}Drawer`;
  const drawer = document.getElementById(drawerId);
  if (!drawer) return;

  const isHidden = drawer.classList.contains("hidden");
  closeAllSharedMediaDrawers();

  if (isHidden) {
    drawer.classList.remove("hidden");
    renderSharedMediaCategory(cat);
  }
}

function renderSharedMediaCategory(cat) {
  const data = state.currentSharedMedia;
  if (!data) return;

  if (cat === "photos") {
    const grid = document.getElementById("sharedPhotosGrid");
    if (!grid) return;
    grid.innerHTML = "";
    if (data.photos.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;font-size:12px;color:var(--text-muted);padding:8px;text-align:center">Нет фотографий в этом диалоге</div>`;
      return;
    }
    data.photos.forEach((p) => {
      const img = document.createElement("img");
      img.src = p.url;
      img.className = "shared-photo-thumb";
      img.loading = "lazy";
      img.onclick = () => openLightbox(p.url);
      grid.appendChild(img);
    });
  } else if (cat === "videos") {
    const list = document.getElementById("sharedVideosList");
    if (!list) return;
    list.innerHTML = "";
    if (data.videos.length === 0) {
      list.innerHTML = `<div style="font-size:12px;color:var(--text-muted);padding:8px;text-align:center">Нет видео или кружочков</div>`;
      return;
    }
    data.videos.forEach((v) => {
      const row = document.createElement("div");
      row.className = "shared-video-item";
      const dur = v.duration || 0;
      const m = Math.floor(dur / 60);
      const s = String(dur % 60).padStart(2, "0");
      row.innerHTML = `
        <span style="font-size:18px">📹</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:#fff">Кружочек (${m}:${s})</div>
          <div style="font-size:11px;color:var(--text-muted)">${escapeHtml(v.timestamp || "")}</div>
        </div>
        <button type="button" class="shared-file-download-btn" onclick="openLightbox('${v.url}')">Смотреть</button>
      `;
      list.appendChild(row);
    });
  } else if (cat === "files") {
    const list = document.getElementById("sharedFilesList");
    if (!list) return;
    list.innerHTML = "";
    if (data.files.length === 0) {
      list.innerHTML = `<div style="font-size:12px;color:var(--text-muted);padding:8px;text-align:center">Нет файлов</div>`;
      return;
    }
    data.files.forEach((f) => {
      const row = document.createElement("div");
      row.className = "shared-file-row";
      row.innerHTML = `
        <div class="shared-file-info">
          <span style="font-size:16px">📄</span>
          <div style="min-width:0;flex:1">
            <div class="shared-file-name">${escapeHtml(f.file_name)}</div>
            <div class="shared-file-size">${formatFileSize(f.file_size)}</div>
          </div>
        </div>
        <a href="${f.url}" download="${escapeHtml(f.file_name)}" class="shared-file-download-btn">Скачать</a>
      `;
      list.appendChild(row);
    });
  } else if (cat === "voices") {
    const list = document.getElementById("sharedVoicesList");
    if (!list) return;
    list.innerHTML = "";
    if (data.voices.length === 0) {
      list.innerHTML = `<div style="font-size:12px;color:var(--text-muted);padding:8px;text-align:center">Нет голосовых сообщений</div>`;
      return;
    }
    data.voices.forEach((v, idx) => {
      const pid = `shared-voice-${v.id || idx}`;
      const row = document.createElement("div");
      row.className = "shared-voice-row";
      const dur = v.duration || 0;
      const m = Math.floor(dur / 60);
      const s = String(dur % 60).padStart(2, "0");
      row.innerHTML = `
        <span style="font-size:18px">🎙️</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">${escapeHtml(v.timestamp || "")}</div>
          <div class="message-voice-player" style="min-width:0;max-width:100%;padding:4px 0">
            <button type="button" id="voice-play-${pid}" class="voice-play-btn" data-audio-url="${v.url}" data-duration="${dur}" onclick="togglePlayVoice('${pid}', this)">${VOICE_PLAY_ICON}</button>
            <div class="voice-waveform-wrap" onclick="seekVoiceAudio('${pid}', event)">
              <div id="voice-bars-${pid}" class="voice-waveform-bars">${buildWaveformBarsHtml(pid)}</div>
              <div class="voice-time-wrap">
                <span id="voice-time-${pid}">${m}:${s}</span>
                <span id="voice-speed-${pid}" class="voice-speed-badge" onclick="changeVoiceSpeed('${pid}')">1x</span>
              </div>
            </div>
          </div>
        </div>
      `;
      list.appendChild(row);
    });
  } else if (cat === "links") {
    const list = document.getElementById("sharedLinksList");
    if (!list) return;
    list.innerHTML = "";
    if (data.links.length === 0) {
      list.innerHTML = `<div style="font-size:12px;color:var(--text-muted);padding:8px;text-align:center">Нет ссылок</div>`;
      return;
    }
    data.links.forEach((l) => {
      const a = document.createElement("a");
      a.className = "shared-link-row";
      a.href = l.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.innerHTML = `<span>🔗</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis">${escapeHtml(l.url)}</span>`;
      list.appendChild(a);
    });
  }
}

function openLightboxFromAvatar(avatarId) {
  const el = document.getElementById(avatarId);
  if (!el) return;
  const bg = el.style.backgroundImage;
  if (!bg || !bg.includes("url(")) return;
  const url = bg.replace(/^url\(["']?/, "").replace(/["']?\)$/, "");
  if (url) openLightbox(url);
}

function copyUserCode(el) {
  const text = el.textContent.trim();
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast("Код скопирован в буфер обмена!");
  }).catch(() => {
    showToast("Код: " + text);
  });
}

function actionProfileChat() {
  closeTargetProfileModal();
  if (state.activeTargetUser) {
    const friend = state.friends.find(f => Number(f.id) === Number(state.activeTargetUser.id));
    if (friend) {
      selectFriend(friend);
    }
  }
  const input = document.getElementById("messageInput");
  if (input) input.focus();
}

function actionProfileCall() {
  closeTargetProfileModal();
  if (state.activeTargetUser) {
    const friend = state.friends.find(f => Number(f.id) === Number(state.activeTargetUser.id)) || state.activeTargetUser;
    state.activeFriend = friend;
    startVoiceCall();
  }
}

function actionProfileSearch() {
  closeTargetProfileModal();
  if (state.activeTargetUser) {
    const friend = state.friends.find(f => Number(f.id) === Number(state.activeTargetUser.id));
    if (friend && (!state.activeFriend || state.activeFriend.id !== friend.id)) {
      selectFriend(friend);
    }
  }
  toggleChatSearch();
}

function openCreateGroupModal() {
  document.getElementById("createGroupModal").classList.remove("hidden");
  document.getElementById("groupNameInput").value = "";
  document.getElementById("createGroupError").classList.add("hidden");
  const list = document.getElementById("groupMembersChecklist");
  list.innerHTML = "";

  if (state.friends.length === 0) {
    list.innerHTML = `<div style="font-size:12px;color:var(--text-muted);padding:8px;">Сначала добавь кентов в друзья!</div>`;
    return;
  }

  state.friends.forEach((f) => {
    const row = document.createElement("label");
    row.className = "group-member-checkbox-item";
    row.innerHTML = `
      <input type="checkbox" value="${f.id}">
      <span>${escapeHtml(f.username)}</span>
      <span style="font-size:11px;color:var(--text-muted);margin-left:auto;">${f.user_code}</span>
    `;
    list.appendChild(row);
  });
}

function closeCreateGroupModal() {
  document.getElementById("createGroupModal").classList.add("hidden");
}

async function handleCreateGroup(event) {
  event.preventDefault();
  const name = document.getElementById("groupNameInput").value.trim();
  const errEl = document.getElementById("createGroupError");
  errEl.classList.add("hidden");

  const checkboxes = document.querySelectorAll("#groupMembersChecklist input[type='checkbox']:checked");
  const memberIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

  try {
    const res = await fetch("/api/groups/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${state.token}`
      },
      body: JSON.stringify({ name: name, member_ids: memberIds })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      errEl.textContent = data.detail || "Ошибка при создании конфы";
      errEl.classList.remove("hidden");
      return;
    }
    closeCreateGroupModal();
    await loadGroups();
    selectGroup(data);
    showToast(`Конфа "${data.name}" создана!`);
  } catch (e) {
    errEl.textContent = "Ошибка сети";
    errEl.classList.remove("hidden");
  }
}

async function openGroupInfoModal() {
  if (!state.activeGroup) return;
  const modal = document.getElementById("groupInfoModal");
  modal.classList.remove("hidden");
  toggleAddMembersSection(false);

  document.getElementById("groupInfoName").textContent = state.activeGroup.name;
  updateAvatarElement(document.getElementById("groupInfoAvatar"), {
    avatar_url: state.activeGroup.avatar_url,
    avatar_color: state.activeGroup.avatar_color,
    name: state.activeGroup.name
  });

  const list = document.getElementById("groupMembersList");
  list.innerHTML = `<div style="font-size:12px;color:var(--text-muted);padding:8px;">Загрузка участников...</div>`;

  try {
    const res = await fetch(`/api/groups/${state.activeGroup.id}/members`, {
      headers: { "Authorization": `Bearer ${state.token}` }
    });
    if (res.ok) {
      const members = await res.json();
      state.activeGroupMembers = members;
      document.getElementById("groupInfoCount").textContent = `${members.length} участников`;
      list.innerHTML = "";
      members.forEach((m) => {
        const row = document.createElement("div");
        row.className = "group-member-row";
        row.style.cursor = "pointer";
        row.title = "Открыть профиль";
        row.onclick = () => {
          closeGroupInfoModal();
          openTargetProfileModalById(m.id);
        };
        const roleLabel = m.role === "owner" ? "Создатель" : "Участник";
        const nameColorStyle = m.profile_color ? `style="color:${escapeHtml(m.profile_color)};"` : "";
        const badgeHtml = m.custom_status ? ` <span class="user-status-badge">${escapeHtml(m.custom_status)}</span>` : "";
        row.innerHTML = `
          <div class="avatar-circle member-av-${m.id}" style="width:32px;height:32px;font-size:12px;"></div>
          <div style="font-weight:600;font-size:13px;display:flex;align-items:center;gap:4px;flex:1;min-width:0;" ${nameColorStyle}>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(m.username)}</span>${badgeHtml}
          </div>
          <div class="group-member-role-badge">${roleLabel}</div>
        `;
        list.appendChild(row);
        updateAvatarElement(row.querySelector(`.member-av-${m.id}`), m);
      });
    }
  } catch (e) {
    list.innerHTML = `<div style="color:#ef4444;font-size:12px;">Не удалось загрузить участников</div>`;
  }
}

function closeGroupInfoModal() {
  document.getElementById("groupInfoModal").classList.add("hidden");
  toggleAddMembersSection(false);
}

function toggleAddMembersSection(show) {
  const box = document.getElementById("groupAddMembersBox");
  if (!box) return;
  const isShow = show !== undefined ? show : box.classList.contains("hidden");
  if (isShow) {
    box.classList.remove("hidden");
    renderAddGroupMembersChecklist();
  } else {
    box.classList.add("hidden");
  }
}

function renderAddGroupMembersChecklist() {
  const container = document.getElementById("groupAddMembersChecklist");
  if (!container || !state.activeGroup) return;
  container.innerHTML = "";

  const currentMemberIds = new Set(
    (state.activeGroupMembers || []).map(m => Number(m.id))
  );

  const availableFriends = state.friends.filter(f => !currentMemberIds.has(Number(f.id)));
  if (availableFriends.length === 0) {
    container.innerHTML = `<div style="font-size:12px;color:var(--text-muted);padding:8px;">Все ваши друзья уже состоят в этой конфе</div>`;
    return;
  }

  availableFriends.forEach((f) => {
    const row = document.createElement("label");
    row.className = "group-member-checkbox-item";
    row.innerHTML = `
      <input type="checkbox" value="${f.id}">
      <span>${escapeHtml(f.username)}</span>
      <span style="font-size:11px;color:var(--text-muted);margin-left:auto;">${f.user_code}</span>
    `;
    container.appendChild(row);
  });
}

async function submitAddGroupMembers() {
  if (!state.activeGroup) return;
  const checkboxes = document.querySelectorAll("#groupAddMembersChecklist input[type='checkbox']:checked");
  const memberIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
  if (memberIds.length === 0) {
    showToast("Выберите хотя бы одного друга");
    return;
  }

  try {
    const res = await fetch(`/api/groups/${state.activeGroup.id}/members/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${state.token}`
      },
      body: JSON.stringify({ member_ids: memberIds })
    });
    if (res.ok) {
      showToast("Участники добавлены в конфу!");
      toggleAddMembersSection(false);
      await openGroupInfoModal();
      await loadGroups();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.detail || "Не удалось добавить участников");
    }
  } catch (e) {
    showToast("Ошибка сети");
  }
}

function handleHeaderTitleClick() {
  if (state.activeGroup) {
    openGroupInfoModal();
  } else if (state.activeFriend) {
    if (state.activeFriend.is_saved || (state.user && Number(state.activeFriend.id) === Number(state.user.id))) {
      openMyProfileModal();
    } else {
      openTargetProfileModal(state.activeFriend);
    }
  }
}

function startSyncLoop() {
  setInterval(async () => {
    if (!state.token) return;
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      return;
    }
    if (state.activeFriend) {
      await loadMessages(state.activeFriend.id, false);
    } else if (state.activeGroup) {
      await loadGroupMessages(state.activeGroup.id, false);
    }
    await loadFriends();
    await loadGroups();
  }, 4000);
}

function connectWebSocket() {
  if (!state.token) return;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(state.token)}`;

  try {
    if (state.ws) {
      try { state.ws.close(); } catch (e) {}
    }
    state.ws = new WebSocket(wsUrl);

    state.ws.onopen = () => {
      clearInterval(state.pingInterval);
      state.pingInterval = setInterval(() => {
        if (state.ws && state.ws.readyState === WebSocket.OPEN) {
          state.ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 25000);
      if (state.activeFriend) {
        loadMessages(state.activeFriend.id, false);
      } else if (state.activeGroup) {
        loadGroupMessages(state.activeGroup.id, false);
      }
    };

    state.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWsMessage(data);
      } catch (e) {}
    };

    state.ws.onclose = () => {
      clearInterval(state.pingInterval);
      clearTimeout(state.reconnectTimer);
      state.reconnectTimer = setTimeout(connectWebSocket, 3000);
    };

    state.ws.onerror = () => {
      clearInterval(state.pingInterval);
      state.ws.close();
    };
  } catch (e) {
    clearInterval(state.pingInterval);
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = setTimeout(connectWebSocket, 3000);
  }
}

function reconcileTempMessage(tempId, realId) {
  if (!tempId || tempId === realId) return;
  state.renderedMsgIds.delete(tempId);
  if (realId) state.renderedMsgIds.add(realId);
  const tempWrap = document.getElementById(`msg-wrap-${tempId}`);
  if (tempWrap) {
    state.renderedMsgIds.add(realId);
    tempWrap.id = `msg-wrap-${realId}`;

    const rxBox = tempWrap.querySelector(`[id^="reactions-"]`);
    if (rxBox) rxBox.id = `reactions-${realId}`;

    const pinBtn = tempWrap.querySelector('button[title*="Закреп"]');
    if (pinBtn) pinBtn.onclick = (e) => { e.stopPropagation(); pinMessage(realId); };

    const editBtn = tempWrap.querySelector('button[title*="Редакт"]');
    if (editBtn) editBtn.onclick = (e) => { e.stopPropagation(); startEditMessage({ id: realId, content: tempWrap.querySelector(".message-text")?.textContent || "" }); };

    const delBtn = tempWrap.querySelector('button[title*="Удалить"]');
    if (delBtn) delBtn.onclick = (e) => { e.stopPropagation(); deleteMessage(realId); };

    const replyBtn = tempWrap.querySelector(".quick-reply-btn");
    if (replyBtn) {
      replyBtn.onclick = (e) => {
        e.stopPropagation();
        startReply({ id: realId, sender_id: state.user.id, content: tempWrap.querySelector(".message-text")?.textContent || "Голосовое сообщение" });
      };
    }

    const saveBtn = tempWrap.querySelector(".quick-save-btn");
    if (saveBtn) {
      saveBtn.onclick = (e) => { e.stopPropagation(); saveMessageToFavorites(realId); };
    }

    const fwdBtn = tempWrap.querySelector(".quick-forward-btn");
    if (fwdBtn) {
      fwdBtn.onclick = (e) => {
        e.stopPropagation();
        openForwardModal({ id: realId, sender_id: state.user.id, content: tempWrap.querySelector(".message-text")?.textContent || "Голосовое сообщение" });
      };
    }

    const reactBtns = tempWrap.querySelectorAll(".quick-react-btn:not(.quick-reply-btn):not(.quick-pin-btn):not(.quick-edit-btn):not(.quick-del-btn):not(.quick-save-btn):not(.quick-forward-btn)");
    reactBtns.forEach((btn) => {
      const em = btn.textContent.trim();
      if (em) {
        btn.onclick = (e) => { e.stopPropagation(); sendReaction(realId, em); };
      }
    });

    const voiceBtn = tempWrap.querySelector(`[id="voice-play-${tempId}"]`);
    if (voiceBtn) {
      voiceBtn.id = `voice-play-${realId}`;
      voiceBtn.setAttribute("onclick", `togglePlayVoice('${realId}', this)`);
    }
    const voiceBars = tempWrap.querySelector(`[id="voice-bars-${tempId}"]`);
    if (voiceBars) voiceBars.id = `voice-bars-${realId}`;
    const voiceTime = tempWrap.querySelector(`[id="voice-time-${tempId}"]`);
    if (voiceTime) voiceTime.id = `voice-time-${realId}`;
    const voiceSpeed = tempWrap.querySelector(`[id="voice-speed-${tempId}"]`);
    if (voiceSpeed) {
      voiceSpeed.id = `voice-speed-${realId}`;
      voiceSpeed.setAttribute("onclick", `changeVoiceSpeed('${realId}')`);
    }
    const voiceTranscript = tempWrap.querySelector(`[id="voice-transcript-${tempId}"]`);
    if (voiceTranscript) {
      voiceTranscript.id = `voice-transcript-${realId}`;
    }
    const transcribeBtn = tempWrap.querySelector(".voice-transcribe-btn");
    if (transcribeBtn) {
      transcribeBtn.setAttribute("onclick", `transcribeVoice('${realId}', this)`);
    }
    const waveformWrap = tempWrap.querySelector(".voice-waveform-wrap");
    if (waveformWrap) {
      waveformWrap.setAttribute("onclick", `seekVoiceAudio('${realId}', event)`);
    }
    if (state.activeAudio && String(state.activeAudio.msgId) === String(tempId)) {
      state.activeAudio.msgId = realId;
    }
  }
}

function handleWsMessage(data) {
  if (data.type === "message") {
    if (Number(data.sender_id) === Number(state.user.id)) {
      if (data.temp_id) {
        reconcileTempMessage(data.temp_id, data.id);
        return;
      }
      const pendingTemp = document.querySelector(`.message-bubble-wrapper.self[id^="msg-wrap-temp_"]`);
      if (pendingTemp) {
        const tempId = pendingTemp.id.replace("msg-wrap-", "");
        reconcileTempMessage(tempId, data.id);
        return;
      }
      if (state.renderedMsgIds.has(data.id)) return;
    }

    let isCurrentChat = false;
    if (data.group_id && state.activeGroup && Number(state.activeGroup.id) === Number(data.group_id)) {
      isCurrentChat = true;
    } else if (!data.group_id && state.activeFriend) {
      const activeId = Number(state.activeFriend.id);
      const sId = Number(data.sender_id);
      const rId = data.receiver_id != null ? Number(data.receiver_id) : null;
      if (activeId === sId || (rId != null && activeId === rId)) {
        isCurrentChat = true;
      }
    }

    if (isCurrentChat) {
      appendMessage(data);
      scrollToBottom();
      if (!data.group_id && Number(data.sender_id) === Number(state.activeFriend.id)) {
        markAsRead(state.activeFriend.id);
      }
    }
    if (Number(data.sender_id) !== Number(state.user.id)) {
      playNotificationSound();
      showSystemNotification(data);
    }
    updateFriendLastMessage(data);
  } else if (data.type === "message_edited") {
    const wrap = document.getElementById(`msg-wrap-${data.message_id}`);
    if (wrap) {
      const encEl = wrap.querySelector(".enc-content");
      if (encEl) {
        const peerId = state.activeFriend ? state.activeFriend.id : null;
        if (peerId) {
          decryptChatMessage(data.content, peerId).then((plain) => {
            encEl.textContent = plain;
          });
        } else {
          encEl.textContent = data.content;
        }
      } else {
        const textEl = wrap.querySelector(".message-text");
        if (textEl) {
          textEl.textContent = data.content;
        }
      }
      let editTag = wrap.querySelector(".message-edited-tag");
      if (!editTag) {
        editTag = document.createElement("span");
        editTag.className = "message-edited-tag";
        editTag.textContent = "(изм.)";
        const meta = wrap.querySelector(".message-meta");
        if (meta) meta.appendChild(editTag);
      }
    }
  } else if (data.type === "voice_transcribed") {
    const box = document.getElementById(`voice-transcript-${data.message_id}`);
    if (box) {
      box.innerHTML = `<span class="voice-transcript-icon">${VOICE_TRANSCRIBE_ICON}</span><span class="voice-transcript-text">${escapeHtml(data.content)}</span>`;
      box.classList.remove("hidden");
      const btn = document.querySelector(`.voice-transcribe-btn[onclick*="${data.message_id}"]`);
      if (btn) btn.classList.add("active");
    }
  } else if (data.type === "message_deleted") {
    removeMessageFromDom(data.message_id);
  } else if (data.type === "message_pinned") {
    setPinnedMessage(data.pinned ? data.message : null);
  } else if (data.type === "group_created") {
    loadGroups();
    showToast(`Вас добавили в конфу "${data.group.name}"!`);
  } else if (data.type === "reaction_updated") {
    updateMessageReactions(data.message_id, data.reactions);
  } else if (data.type === "messages_read") {
    if (state.activeFriend && Number(state.activeFriend.id) === Number(data.reader_id)) {
      document.querySelectorAll(".message-bubble-wrapper.self .check-icon").forEach((el) => {
        el.className = "check-icon read";
        el.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M12.354 4.354a.5.5 0 0 0-.708-.708L5 10.293 1.854 7.146a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l7-7zm2.5 0a.5.5 0 0 0-.708-.708L7.5 10.293 6.646 9.439a.5.5 0 0 0-.708.708l1.208 1.207a.5.5 0 0 0 .708 0l7-7z"/></svg>`;
      });
    }
  } else if (data.type === "presence") {
    updateFriendPresence(data.user_id, data.is_online, data.status_text);
  } else if (data.type === "avatar_updated") {
    const friend = state.friends.find(f => Number(f.id) === Number(data.user_id));
    if (friend) {
      friend.avatar_url = data.avatar_url;
      renderFriendsList();
      if (state.activeFriend && Number(state.activeFriend.id) === Number(data.user_id)) {
        updateAvatarElement(document.getElementById("targetAvatar"), friend);
      }
    }
    if (state.activeTargetUser && Number(state.activeTargetUser.id) === Number(data.user_id)) {
      state.activeTargetUser.avatar_url = data.avatar_url;
      updateAvatarElement(document.getElementById("targetProfileAvatar"), state.activeTargetUser);
    }
  } else if (data.type === "profile_updated") {
    if (state.user && Number(state.user.id) === Number(data.user_id)) {
      if (data.username !== undefined) state.user.username = data.username;
      if (data.bio !== undefined) state.user.bio = data.bio;
      if (data.custom_status !== undefined) state.user.custom_status = data.custom_status;
      if (data.profile_color !== undefined) state.user.profile_color = data.profile_color;
      if (data.custom_banner !== undefined) state.user.custom_banner = data.custom_banner;
      updateMyProfileDisplay();
    }
    const friend = state.friends.find(f => Number(f.id) === Number(data.user_id));
    if (friend) {
      if (data.username !== undefined) friend.username = data.username;
      if (data.bio !== undefined) friend.bio = data.bio;
      if (data.custom_status !== undefined) friend.custom_status = data.custom_status;
      if (data.profile_color !== undefined) friend.profile_color = data.profile_color;
      if (data.custom_banner !== undefined) friend.custom_banner = data.custom_banner;
      renderFriendsList();
      if (state.activeFriend && Number(state.activeFriend.id) === Number(data.user_id)) {
        const tUserEl = document.getElementById("targetUsername");
        if (tUserEl) {
          tUserEl.textContent = friend.username;
          tUserEl.style.color = friend.profile_color || "";
        }
        const tBadgeEl = document.getElementById("targetStatusBadge");
        if (tBadgeEl) {
          tBadgeEl.textContent = friend.custom_status || "";
        }
      }
    }
    if (state.activeTargetUser && Number(state.activeTargetUser.id) === Number(data.user_id)) {
      const modal = document.getElementById("targetProfileModal");
      if (modal && !modal.classList.contains("hidden")) {
        state.activeTargetUser = { ...state.activeTargetUser, ...data };
        const nameEl = document.getElementById("targetProfileUsername");
        if (nameEl) {
          nameEl.textContent = data.username;
          nameEl.style.color = data.profile_color || "";
        }
        const badgeEl = document.getElementById("targetProfileStatusBadge");
        if (badgeEl) badgeEl.textContent = data.custom_status || "";
        const bioEl = document.getElementById("targetProfileBio");
        if (bioEl && data.bio !== undefined) bioEl.textContent = data.bio || "Пока ничего не написал(а)";
        const bannerEl = document.getElementById("targetProfileBanner");
        if (bannerEl && data.custom_banner !== undefined) {
          const b = data.custom_banner || "linear-gradient(135deg, #1f1c2c, #928dab)";
          if (b.startsWith("http") || b.startsWith("/uploads/") || b.startsWith("data:")) {
            bannerEl.style.background = `url('${b}') center/cover no-repeat`;
          } else {
            bannerEl.style.background = b;
          }
        }
      }
    }
  } else if (data.type === "friend_added") {
    const exists = state.friends.some(f => Number(f.id) === Number(data.friend.id));
    if (!exists) {
      state.friends.unshift(data.friend);
      renderFriendsList();
    }
    showToast(`🤝 ${data.friend.username} добавил тебя в друзья!`);
  } else if (data.type === "typing") {
    if (state.activeFriend && Number(state.activeFriend.id) === Number(data.sender_id)) {
      showTypingIndicator();
    }
  } else if (data.type === "call_offer") {
    handleIncomingCallOffer(data);
  } else if (data.type === "call_answer") {
    handleCallAnswer(data);
  } else if (data.type === "call_ice") {
    handleCallIce(data);
  } else if (data.type === "call_end" || data.type === "call_reject") {
    handleRemoteCallEnd();
  }
}

async function startVoiceCall() {
  await initiateCall(false);
}

async function startVideoCall() {
  await initiateCall(true);
}

function actionProfileVideoCall() {
  closeTargetProfileModal();
  if (state.targetProfileUser) {
    const friend = state.friends.find(f => Number(f.id) === Number(state.targetProfileUser.id)) || state.targetProfileUser;
    selectFriend(friend);
    startVideoCall();
  }
}

async function initiateCall(isVideo) {
  if (!state.activeFriend) return;
  state.call.isCaller = true;
  state.call.isVideo = !!isVideo;
  state.call.cameraOff = false;
  state.call.targetId = state.activeFriend.id;
  state.call.targetUser = state.activeFriend;

  showCallModal(state.activeFriend, isVideo ? "Вызов (видео)..." : "Вызов аудио...", isVideo);
  document.getElementById("callAcceptBtn").classList.add("hidden");
  document.getElementById("callMuteBtn").classList.remove("hidden");
  startRingtone(false);

  const audioEl = document.getElementById("remoteAudio");
  if (audioEl) {
    audioEl.muted = false;
    audioEl.volume = 1.0;
    if (!audioEl.srcObject) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          const dest = ctx.createMediaStreamDestination();
          audioEl.srcObject = dest.stream;
        }
      } catch (e) {}
    }
    audioEl.play().catch(() => {});
  }

  try {
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: isVideo ? { facingMode: state.call.facingMode, width: { ideal: 1280 }, height: { ideal: 720 } } : false
    };
    state.call.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    state.call.isMuted = false;
    state.call.localStream.getAudioTracks().forEach(t => { t.enabled = true; });

    if (isVideo) {
      const localVid = document.getElementById("callLocalVideo");
      if (localVid) {
        localVid.srcObject = state.call.localStream;
        localVid.play().catch(() => {});
      }
    }
  } catch (err) {
    stopRingtone();
    hideCallModal();
    showToast(isVideo ? "Нет доступа к камере или микрофону" : "Нет доступа к микрофону");
    return;
  }

  await prepareIceServers();
  createPeerConnection();

  try {
    const offer = await state.call.peer.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: isVideo
    });
    await state.call.peer.setLocalDescription(offer);
    sendCallSignal({
      type: "call_offer",
      receiver_id: state.call.targetId,
      is_video: isVideo,
      sdp: offer
    });
  } catch (err) {
    endCall();
  }
}

async function handleIncomingCallOffer(data) {
  const friend = state.friends.find(f => Number(f.id) === Number(data.sender_id)) || {
    id: data.sender_id,
    username: "Кент",
    avatar_color: "#f59e0b",
    avatar_url: ""
  };

  const isVideo = !!data.is_video || (data.sdp && data.sdp.sdp && data.sdp.sdp.includes("m=video"));
  state.call.isCaller = false;
  state.call.isVideo = isVideo;
  state.call.cameraOff = false;
  state.call.targetId = data.sender_id;
  state.call.targetUser = friend;
  state.call.pendingOffer = data.sdp;

  showCallModal(friend, isVideo ? "Входящий видеозвонок..." : "Входящий звонок...", isVideo);
  document.getElementById("callAcceptBtn").classList.remove("hidden");
  document.getElementById("callMuteBtn").classList.add("hidden");
  startRingtone(true);
  showCallNotification(friend.username);
}

async function acceptIncomingCall() {
  dismissCallNotification();
  stopRingtone();
  document.getElementById("callAcceptBtn").classList.add("hidden");
  document.getElementById("callMuteBtn").classList.remove("hidden");
  document.getElementById("callStatusText").textContent = "Подключение...";

  const isVideo = state.call.isVideo;

  const audioEl = document.getElementById("remoteAudio");
  if (audioEl) {
    audioEl.muted = false;
    audioEl.volume = 1.0;
    if (!audioEl.srcObject) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          const dest = ctx.createMediaStreamDestination();
          audioEl.srcObject = dest.stream;
        }
      } catch (e) {}
    }
    audioEl.play().catch(() => {});
  }

  try {
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: isVideo ? { facingMode: state.call.facingMode, width: { ideal: 1280 }, height: { ideal: 720 } } : false
    };
    state.call.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    state.call.isMuted = false;
    state.call.localStream.getAudioTracks().forEach(t => { t.enabled = true; });

    if (isVideo) {
      const localVid = document.getElementById("callLocalVideo");
      if (localVid) {
        localVid.srcObject = state.call.localStream;
        localVid.play().catch(() => {});
      }
    }
  } catch (err) {
    endCall();
    showToast(isVideo ? "Нет доступа к камере или микрофону" : "Нет доступа к микрофону");
    return;
  }

  await prepareIceServers();
  createPeerConnection();

  try {
    await state.call.peer.setRemoteDescription(new RTCSessionDescription(state.call.pendingOffer));
    await flushQueuedIceCandidates();
    const answer = await state.call.peer.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: isVideo
    });
    await state.call.peer.setLocalDescription(answer);

    sendCallSignal({
      type: "call_answer",
      receiver_id: state.call.targetId,
      is_video: isVideo,
      sdp: answer
    });

    startCallTimer();
  } catch (err) {
    endCall();
  }
}

async function handleCallAnswer(data) {
  stopRingtone();
  if (state.call.peer) {
    await state.call.peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
    await flushQueuedIceCandidates();
    startCallTimer();
  }
}

async function handleCallIce(data) {
  if (!data.candidate) return;
  if (!state.call.peer || !state.call.peer.remoteDescription) {
    if (!state.call.iceCandidatesQueue) state.call.iceCandidatesQueue = [];
    state.call.iceCandidatesQueue.push(data.candidate);
    return;
  }
  try {
    await state.call.peer.addIceCandidate(new RTCIceCandidate(data.candidate));
  } catch (e) {}
}

async function flushQueuedIceCandidates() {
  if (!state.call.peer || !state.call.iceCandidatesQueue) return;
  while (state.call.iceCandidatesQueue.length > 0) {
    const cand = state.call.iceCandidatesQueue.shift();
    try {
      await state.call.peer.addIceCandidate(new RTCIceCandidate(cand));
    } catch (e) {}
  }
}

function createPeerConnection() {
  if (!state.call.iceCandidatesQueue) state.call.iceCandidatesQueue = [];
  state.call.peer = new RTCPeerConnection(RTC_CONFIG);

  if (state.call.localStream) {
    state.call.localStream.getTracks().forEach((track) => {
      state.call.peer.addTrack(track, state.call.localStream);
    });
  }

  state.call.peer.onicecandidate = (event) => {
    if (event.candidate) {
      sendCallSignal({
        type: "call_ice",
        receiver_id: state.call.targetId,
        candidate: event.candidate
      });
    }
  };

  state.call.peer.ontrack = (event) => {
    let audioEl = document.getElementById("remoteAudio");
    if (!audioEl) {
      audioEl = document.createElement("audio");
      audioEl.id = "remoteAudio";
      audioEl.autoplay = true;
      audioEl.playsInline = true;
      audioEl.style.cssText = "position:fixed;bottom:-9999px;right:-9999px;width:1px;height:1px;opacity:0.001;pointer-events:none;";
      document.body.appendChild(audioEl);
    }

    const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
    state.call.remoteStream = stream;

    if (event.track.kind === "video") {
      const remoteVid = document.getElementById("callRemoteVideo");
      if (remoteVid) {
        remoteVid.srcObject = stream;
        remoteVid.play().catch(() => {});
      }
    }

    if (event.track.kind === "audio" || !audioEl.srcObject) {
      audioEl.srcObject = stream;
      audioEl.muted = false;
      audioEl.volume = 1.0;
      const playPromise = audioEl.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          const unlock = () => {
            audioEl.play().catch(() => {});
            window.removeEventListener("click", unlock);
            window.removeEventListener("touchstart", unlock);
          };
          window.addEventListener("click", unlock, { once: true });
          window.addEventListener("touchstart", unlock, { once: true });
        });
      }
    }
  };

  state.call.peer.onconnectionstatechange = () => {
    const avatar = document.getElementById("callAvatar");
    if (state.call.peer.connectionState === "connected") {
      document.getElementById("callStatusText").textContent = "Идёт разговор";
      if (avatar) avatar.classList.add("avatar-call-pulse");
      const audioEl = document.getElementById("remoteAudio");
      if (audioEl && audioEl.paused) {
        audioEl.play().catch(() => {});
      }
      const remoteVid = document.getElementById("callRemoteVideo");
      if (remoteVid && remoteVid.paused && remoteVid.srcObject) {
        remoteVid.play().catch(() => {});
      }
    } else if (state.call.peer.connectionState === "disconnected" || state.call.peer.connectionState === "failed") {
      if (avatar) avatar.classList.remove("avatar-call-pulse");
      endCall();
    }
  };
}

function toggleCallCamera() {
  if (!state.call.localStream) return;
  const vidTrack = state.call.localStream.getVideoTracks()[0];
  if (!vidTrack) return;
  state.call.cameraOff = !state.call.cameraOff;
  vidTrack.enabled = !state.call.cameraOff;

  const btn = document.getElementById("callVideoToggleBtn");
  if (btn) {
    btn.classList.toggle("camera-off", state.call.cameraOff);
    btn.innerHTML = state.call.cameraOff
      ? `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27l4.73 4.73H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 23 21 21.73 3.27 2zM5 18V10.27L12.73 18H5z"/></svg>`
      : `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>`;
  }
}

async function switchCallCamera() {
  if (!state.call.localStream || !state.call.isVideo) return;
  state.call.facingMode = state.call.facingMode === "user" ? "environment" : "user";
  try {
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: state.call.facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    const newVidTrack = newStream.getVideoTracks()[0];
    const oldVidTrack = state.call.localStream.getVideoTracks()[0];
    if (oldVidTrack) {
      oldVidTrack.stop();
      state.call.localStream.removeTrack(oldVidTrack);
    }
    state.call.localStream.addTrack(newVidTrack);

    const localVid = document.getElementById("callLocalVideo");
    if (localVid) {
      localVid.srcObject = state.call.localStream;
      localVid.style.transform = state.call.facingMode === "user" ? "scaleX(-1)" : "none";
    }

    if (state.call.peer) {
      const sender = state.call.peer.getSenders().find(s => s.track && s.track.kind === "video");
      if (sender) {
        sender.replaceTrack(newVidTrack);
      }
    }
  } catch (e) {
    showToast("Не удалось переключить камеру");
  }
}

function sendCallSignal(payload) {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify(payload));
  }
}

function startCallTimer() {
      document.getElementById("callStatusText").textContent = "Идёт разговор";
  const timerEl = document.getElementById("callTimer");
  timerEl.classList.remove("hidden");
  state.call.seconds = 0;
  clearInterval(state.call.timerInterval);

  state.call.timerInterval = setInterval(() => {
    state.call.seconds++;
    const m = String(Math.floor(state.call.seconds / 60)).padStart(2, "0");
    const s = String(state.call.seconds % 60).padStart(2, "0");
    timerEl.textContent = `${m}:${s}`;
  }, 1000);
}

function sendCallLogMessage(targetId, duration) {
  const isVid = state.call.isVideo;
  const payload = {
    receiver_id: targetId,
    group_id: null,
    content: isVid ? "Видеозвонок" : "Звонок",
    timestamp: getClientTimeStr(),
    msg_type: "call_log",
    media_url: "",
    duration: duration,
    file_name: isVid ? "video" : "",
    file_size: 0,
    reply_to_id: null
  };

  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: "send_message", ...payload }));
  } else {
    fetch("/api/messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${state.token}`
      },
      body: JSON.stringify(payload)
    }).catch(()=>{});
  }
}

function endCall() {
  dismissCallNotification();
  stopRingtone();
  clearInterval(state.call.timerInterval);

  if (state.call.isCaller && state.call.targetId) {
    sendCallLogMessage(state.call.targetId, state.call.seconds || 0);
  }

  if (state.call.targetId) {
    sendCallSignal({
      type: "call_end",
      receiver_id: state.call.targetId
    });
  }

  if (state.call.localStream) {
    state.call.localStream.getTracks().forEach(t => t.stop());
    state.call.localStream = null;
  }

  if (state.call.peer) {
    state.call.peer.close();
    state.call.peer = null;
  }

  const audioEl = document.getElementById("remoteAudio");
  if (audioEl) audioEl.srcObject = null;

  state.call.targetId = null;
  state.call.targetUser = null;
  state.call.pendingOffer = null;
  state.call.isMuted = false;
  state.call.cameraOff = false;
  state.call.isVideo = false;
  state.call.iceCandidatesQueue = [];

  hideCallModal();
}

function handleRemoteCallEnd() {
  dismissCallNotification();
  stopRingtone();
  clearInterval(state.call.timerInterval);

  if (state.call.isCaller && state.call.targetId) {
    sendCallLogMessage(state.call.targetId, state.call.seconds || 0);
  }

  if (state.call.localStream) {
    state.call.localStream.getTracks().forEach(t => t.stop());
    state.call.localStream = null;
  }

  if (state.call.peer) {
    state.call.peer.close();
    state.call.peer = null;
  }

  const audioEl = document.getElementById("remoteAudio");
  if (audioEl) audioEl.srcObject = null;

  state.call.targetId = null;
  state.call.targetUser = null;
  state.call.pendingOffer = null;
  state.call.isMuted = false;
  state.call.cameraOff = false;
  state.call.isVideo = false;
  state.call.iceCandidatesQueue = [];

  showToast("Звонок завершен");
  hideCallModal();
}

function toggleMute() {
  if (!state.call.localStream) return;
  const audioTrack = state.call.localStream.getAudioTracks()[0];
  if (audioTrack) {
    state.call.isMuted = !state.call.isMuted;
    audioTrack.enabled = !state.call.isMuted;
    const btn = document.getElementById("callMuteBtn");
    btn.classList.toggle("muted", state.call.isMuted);
    btn.innerHTML = state.call.isMuted
      ? `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.14 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>`
      : `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>`;
  }
}

function showCallModal(targetUser, status, isVideo = false) {
  const modal = document.getElementById("callModal");
  modal.classList.remove("hidden");
  
  const box = document.getElementById("callModalBox");
  const videoContainer = document.getElementById("callVideoContainer");
  const avatarArea = document.getElementById("callAvatarArea");
  const videoToggleBtn = document.getElementById("callVideoToggleBtn");
  const switchCamBtn = document.getElementById("callSwitchCamBtn");

  if (isVideo) {
    if (box) box.classList.add("video-mode");
    if (videoContainer) videoContainer.classList.remove("hidden");
    if (avatarArea) avatarArea.classList.add("hidden");
    if (videoToggleBtn) videoToggleBtn.classList.remove("hidden");
    if (switchCamBtn) switchCamBtn.classList.remove("hidden");
  } else {
    if (box) box.classList.remove("video-mode");
    if (videoContainer) videoContainer.classList.add("hidden");
    if (avatarArea) avatarArea.classList.remove("hidden");
    if (videoToggleBtn) videoToggleBtn.classList.add("hidden");
    if (switchCamBtn) switchCamBtn.classList.add("hidden");
  }

  document.getElementById("callTargetName").textContent = targetUser.username || targetUser.name;
  document.getElementById("callStatusText").textContent = status;
  document.getElementById("callTimer").classList.add("hidden");
  updateAvatarElement(document.getElementById("callAvatar"), targetUser);
}

function hideCallModal() {
  const modal = document.getElementById("callModal");
  modal.classList.add("hidden");
  const box = document.getElementById("callModalBox");
  if (box) box.classList.remove("video-mode");
  const videoContainer = document.getElementById("callVideoContainer");
  if (videoContainer) videoContainer.classList.add("hidden");
  const avatar = document.getElementById("callAvatar");
  if (avatar) avatar.classList.remove("avatar-call-pulse");
  const muteBtn = document.getElementById("callMuteBtn");
  if (muteBtn) muteBtn.classList.remove("muted");
  const videoToggleBtn = document.getElementById("callVideoToggleBtn");
  if (videoToggleBtn) {
    videoToggleBtn.classList.remove("camera-off");
    videoToggleBtn.classList.add("hidden");
  }
  const switchCamBtn = document.getElementById("callSwitchCamBtn");
  if (switchCamBtn) switchCamBtn.classList.add("hidden");

  const remoteVid = document.getElementById("callRemoteVideo");
  if (remoteVid) remoteVid.srcObject = null;
  const localVid = document.getElementById("callLocalVideo");
  if (localVid) localVid.srcObject = null;
}

async function markAsRead(friendId) {
  try {
    await fetch("/api/messages/read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${state.token}`
      },
      body: JSON.stringify({ sender_id: friendId })
    });
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: "read", sender_id: friendId }));
    }
  } catch (e) {}
}

async function loadFriends() {
  try {
    const res = await fetch("/api/friends", {
      headers: { "Authorization": `Bearer ${state.token}` }
    });
    if (res.ok) {
      state.friends = await res.json();
      renderFriendsList();
    }
  } catch (e) {}
}

async function loadGroups() {
  try {
    const res = await fetch("/api/groups", {
      headers: { "Authorization": `Bearer ${state.token}` }
    });
    if (res.ok) {
      state.groups = await res.json();
      renderFriendsList();
    }
  } catch (e) {}
}

function renderFriendsList() {
  const container = document.getElementById("friendsList");
  container.innerHTML = "";

  const query = document.getElementById("friendSearch").value.toLowerCase();

  if (state.sidebarTab === "groups") {
    if (state.groups.length === 0) {
      container.innerHTML = `
        <div class="empty-friends">
          У тебя пока нет конф.<br>
          Нажми на иконку группы вверху, чтобы создать конфу!
        </div>
      `;
      return;
    }

    state.groups.forEach((group) => {
      if (query && !group.name.toLowerCase().includes(query)) return;

      const item = document.createElement("div");
      item.className = `friend-item ${state.activeGroup && state.activeGroup.id === group.id ? "active" : ""}`;
      item.onclick = () => selectGroup(group);

      item.innerHTML = `
        <div class="avatar-wrapper">
          <div class="avatar-circle group-av-${group.id}"></div>
        </div>
        <div class="friend-info">
          <div class="friend-header-row">
            <div class="friend-name">${escapeHtml(group.name)} <span class="badge-group">Конфа</span></div>
          </div>
          <div class="friend-sub-row">
            <div class="friend-last-msg">${group.member_count || 1} участников</div>
          </div>
        </div>
      `;
      container.appendChild(item);

      const avEl = item.querySelector(`.group-av-${group.id}`);
      updateAvatarElement(avEl, {
        avatar_url: group.avatar_url,
        avatar_color: group.avatar_color,
        name: group.name
      });
    });
    return;
  }

  

  if (!query) {
    const isSavedActive = state.activeFriend && Number(state.activeFriend.id) === Number(state.user.id);
    const savedItem = document.createElement("div");
    savedItem.className = `friend-item saved-messages-item ${isSavedActive ? "active" : ""}`;
    savedItem.onclick = () => openSavedMessages();
    savedItem.innerHTML = `
      <div class="avatar-wrapper">
        <div class="saved-messages-avatar">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
        </div>
      </div>
      <div class="friend-info">
        <div class="friend-header-row">
          <div class="friend-name">Избранное</div>
          <div class="friend-time" id="saved-last-time"></div>
        </div>
        <div class="friend-sub-row">
          <div class="friend-last-msg" id="saved-last-msg">Сохранённые сообщения</div>
        </div>
      </div>
    `;
    container.appendChild(savedItem);
  }

  if (!query || "ai chat luna gpt ии нейросеть".includes(query)) {
    const isAiActive = state.activeFriend && state.aiBot && Number(state.activeFriend.id) === Number(state.aiBot.id);
    const aiItem = document.createElement("div");
    aiItem.className = `friend-item ai-chat-item ${isAiActive ? "active" : ""}`;
    aiItem.onclick = () => openAiChat();
    aiItem.innerHTML = `
      <div class="avatar-wrapper">
        <div class="ai-chat-avatar">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z"/>
          </svg>
        </div>
        <div class="status-indicator online"></div>
      </div>
      <div class="friend-info">
        <div class="friend-header-row">
          <div class="friend-name" style="color:#10a37f;display:flex;align-items:center;gap:6px;">
            AI CHAT
            <span class="badge-ai-model">gpt-6-luna</span>
          </div>
          <div class="friend-time" id="ai-last-time"></div>
        </div>
        <div class="friend-sub-row">
          <div class="friend-last-msg" id="ai-last-msg">Нейросеть Luna онлайн</div>
        </div>
      </div>
    `;
    container.appendChild(aiItem);
  }

  if (state.friends.length === 0 && !query) {
    const emptyHint = document.createElement("div");
    emptyHint.className = "empty-friends";
    emptyHint.style.marginTop = "20px";
    emptyHint.innerHTML = "У тебя пока нет друзей.<br>Нажми <b>+</b> сверху и отправь другу код <b>" + state.user.user_code + "</b>";
    container.appendChild(emptyHint);
  }

  state.groups.forEach((group) => {
    if (query && !group.name.toLowerCase().includes(query)) return;

    const item = document.createElement("div");
    item.className = `friend-item ${state.activeGroup && state.activeGroup.id === group.id ? "active" : ""}`;
    item.onclick = () => selectGroup(group);

    item.innerHTML = `
      <div class="avatar-wrapper">
        <div class="avatar-circle group-av-${group.id}"></div>
      </div>
      <div class="friend-info">
        <div class="friend-header-row">
          <div class="friend-name">${escapeHtml(group.name)} <span class="badge-group">Конфа</span></div>
        </div>
        <div class="friend-sub-row">
          <div class="friend-last-msg">${group.member_count || 1} участников</div>
        </div>
      </div>
    `;
    container.appendChild(item);

    const avEl = item.querySelector(`.group-av-${group.id}`);
    updateAvatarElement(avEl, {
      avatar_url: group.avatar_url,
      avatar_color: group.avatar_color,
      name: group.name
    });
  });

  state.friends.forEach((friend) => {
    if (state.aiBot && Number(friend.id) === Number(state.aiBot.id)) {
      const lastMsgEl = document.getElementById("ai-last-msg");
      if (lastMsgEl && friend.last_message) lastMsgEl.textContent = friend.last_message;
      const lastTimeEl = document.getElementById("ai-last-time");
      if (lastTimeEl && friend.last_time) lastTimeEl.textContent = formatMessageTime(friend.last_time);
      return;
    }
    if (query && !friend.username.toLowerCase().includes(query) && !friend.user_code.includes(query)) {
      return;
    }
    const item = document.createElement("div");
    item.className = `friend-item ${state.activeFriend && state.activeFriend.id === friend.id ? "active" : ""}`;
    item.onclick = () => selectFriend(friend);

    const isOnline = friend.is_online;
    const unreadHtml = friend.unread_count > 0 ? `<span class="unread-badge">${friend.unread_count}</span>` : "";
    const nameColorStyle = friend.profile_color ? `style="color:${escapeHtml(friend.profile_color)};"` : "";
    const badgeHtml = friend.custom_status ? ` <span class="user-status-badge">${escapeHtml(friend.custom_status)}</span>` : "";

    item.innerHTML = `
      <div class="avatar-wrapper" title="Открыть профиль">
        <div class="avatar-circle friend-av-${friend.id}" style="cursor:pointer"></div>
        <div class="status-indicator ${isOnline ? "online" : "offline"}"></div>
      </div>
      <div class="friend-info">
        <div class="friend-header-row">
          <div class="friend-name" ${nameColorStyle}>${escapeHtml(friend.username)}${badgeHtml}</div>
          <div class="friend-time">${escapeHtml(formatMessageTime(friend.last_time) || "")}</div>
        </div>
        <div class="friend-sub-row">
          <div class="friend-last-msg">${escapeHtml(friend.last_message || friend.bio || friend.status_text || friend.user_code)}</div>
          ${unreadHtml}
        </div>
      </div>
    `;
    container.appendChild(item);

    const avEl = item.querySelector(`.friend-av-${friend.id}`);
    updateAvatarElement(avEl, friend);
    avEl.onclick = (e) => {
      e.stopPropagation();
      openTargetProfileModal(friend);
    };
  });
}

function filterFriends() {
  renderFriendsList();
}

async function selectFriend(friend) {
  cancelReply();
  cancelEditMessage();
  clearChatSearchHighlights();
  state.activeGroup = null;
  state.activeFriend = friend;
  friend.unread_count = 0;
  state.renderedMsgIds.clear();
  const container = document.getElementById("messagesContainer");
  if (container) container.innerHTML = "";
  renderFriendsList();

  document.getElementById("noChatSelected").classList.add("hidden");
  const activeChat = document.getElementById("activeChat");
  activeChat.classList.remove("hidden");
  document.getElementById("chatArea").classList.add("mobile-open");

  const targetUserEl = document.getElementById("targetUsername");
  targetUserEl.textContent = friend.username;
  if (friend.profile_color) {
    targetUserEl.style.color = friend.profile_color;
  } else {
    targetUserEl.style.color = "";
  }

  const targetBadgeEl = document.getElementById("targetStatusBadge");
  if (targetBadgeEl) {
    targetBadgeEl.textContent = friend.custom_status || "";
  }
  
  const statusEl = document.getElementById("targetStatus");
  statusEl.textContent = friend.status_text || (friend.is_online ? "в сети" : "был(а) недавно");
  statusEl.className = `target-status ${friend.is_online ? "online" : ""}`;

  const ind = document.getElementById("targetStatusIndicator");
  if (ind) ind.className = `status-indicator ${friend.is_online ? "online" : "offline"}`;

  const headerCallBtn = document.getElementById("headerCallBtn");
  if (headerCallBtn) headerCallBtn.classList.remove("hidden");

  const targetCodeBadge = document.getElementById("targetCodeBadge");
  if (targetCodeBadge) {
    targetCodeBadge.textContent = friend.code ? `#${friend.code}` : "";
  }

  updateAvatarElement(document.getElementById("targetAvatar"), friend);
  updateChatInputState();

  await loadMessages(friend.id, true);
  await loadPinnedMessage(friend.id, false);
  await markAsRead(friend.id);
  if (window.innerWidth > 768) {
    document.getElementById("messageInput").focus();
  }
}

async function openSavedMessages() {
  if (!state.user) return;
  const savedFriend = {
    id: state.user.id,
    username: "Избранное",
    user_code: state.user.user_code,
    avatar_color: "#5865F2",
    avatar_url: "",
    is_online: true,
    custom_status: "",
    profile_color: "",
    bio: "",
    last_message: "",
    last_time: "",
    unread_count: 0,
    is_saved: true
  };

  cancelReply();
  cancelEditMessage();
  clearChatSearchHighlights();
  state.activeGroup = null;
  state.activeFriend = savedFriend;
  savedFriend.unread_count = 0;
  state.renderedMsgIds.clear();
  const container = document.getElementById("messagesContainer");
  if (container) container.innerHTML = "";
  renderFriendsList();

  document.getElementById("noChatSelected").classList.add("hidden");
  document.getElementById("activeChat").classList.remove("hidden");
  document.getElementById("chatArea").classList.add("mobile-open");

  const targetUserEl = document.getElementById("targetUsername");
  targetUserEl.textContent = "Избранное";
  targetUserEl.style.color = "#5865F2";

  const targetBadgeEl = document.getElementById("targetStatusBadge");
  if (targetBadgeEl) targetBadgeEl.textContent = "";

  const statusEl = document.getElementById("targetStatus");
  statusEl.textContent = "Сохранённые сообщения";
  statusEl.className = "target-status";

  const ind = document.getElementById("targetStatusIndicator");
  if (ind) ind.className = "status-indicator";

  const headerCallBtn = document.getElementById("headerCallBtn");
  if (headerCallBtn) headerCallBtn.classList.add("hidden");

  const targetCodeBadge = document.getElementById("targetCodeBadge");
  if (targetCodeBadge) targetCodeBadge.textContent = "";

  const avatarEl = document.getElementById("targetAvatar");
  if (avatarEl) {
    avatarEl.style.backgroundImage = "";
    avatarEl.style.background = "linear-gradient(135deg, #5865F2, #7289DA)";
    avatarEl.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>`;
  }

  updateChatInputState();
  await loadMessages(state.user.id, true);
  if (window.innerWidth > 768) {
    document.getElementById("messageInput").focus();
  }
}

async function saveMessageToFavorites(msgId) {
  const wrap = document.getElementById(`msg-wrap-${msgId}`);
  if (!wrap) return;
  const textEl = wrap.querySelector(".message-text, .enc-content");
  const imgEl = wrap.querySelector(".message-image-wrap img");
  const content = textEl ? textEl.textContent.trim() : "";
  const mediaUrl = imgEl ? imgEl.src : "";
  const msgType = imgEl ? "image" : "text";

  const timeStr = getClientTimeStr();
  const payload = {
    receiver_id: state.user.id,
    group_id: null,
    content: content,
    timestamp: timeStr,
    msg_type: msgType,
    media_url: mediaUrl,
    temp_id: "temp_saved_" + Date.now()
  };

  try {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: "message", ...payload }));
    } else {
      await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${state.token}` },
        body: JSON.stringify(payload)
      });
    }
    showToast("✅ Сохранено в Избранное");
  } catch (e) {
    showToast("Ошибка при сохранении");
  }
}

function audioBufferToWavBlob(audioBuffer) {
  const numChannels = 1;
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.getChannelData(0);
  const dataLen = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataLen);
  const view = new DataView(buffer);

  function writeString(v, offset, str) {
    for (let i = 0; i < str.length; i++) {
      v.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLen, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLen, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    let s = samples[i];
    if (s > 1) s = 1;
    else if (s < -1) s = -1;
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: "audio/wav" });
}

async function convertAudioUrlToWavBase64(audioUrl) {
  const resp = await fetch(audioUrl);
  if (!resp.ok) throw new Error("Audio fetch failed");
  const arrayBuf = await resp.arrayBuffer();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) throw new Error("AudioContext unsupported");
  const audioCtx = new AudioCtx();
  const decoded = await audioCtx.decodeAudioData(arrayBuf);
  try {
    if (audioCtx.close) audioCtx.close();
  } catch (e) {}

  const targetSampleRate = 16000;
  let finalBuffer = decoded;
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (OfflineCtx && (decoded.sampleRate !== targetSampleRate || decoded.numberOfChannels !== 1)) {
    const numFrames = Math.max(1, Math.ceil(decoded.duration * targetSampleRate));
    const offlineCtx = new OfflineCtx(1, numFrames, targetSampleRate);
    const src = offlineCtx.createBufferSource();
    src.buffer = decoded;
    src.connect(offlineCtx.destination);
    src.start(0);
    finalBuffer = await offlineCtx.startRendering();
  }

  const wavBlob = audioBufferToWavBlob(finalBuffer);
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(wavBlob);
  });
}

async function transcribeVoice(msgId, btn) {
  let targetId = msgId;
  const parentWrap = btn ? btn.closest(".message-bubble-wrapper") : null;
  if (!targetId || isNaN(Number(targetId)) || String(targetId).startsWith("temp_")) {
    if (parentWrap && parentWrap.id && parentWrap.id.startsWith("msg-wrap-")) {
      const parsed = parentWrap.id.replace("msg-wrap-", "");
      if (parsed && !parsed.startsWith("temp_") && !isNaN(Number(parsed))) {
        targetId = Number(parsed);
      }
    }
  }

  if (String(targetId).startsWith("temp_")) {
    if (btn) {
      btn.innerHTML = VOICE_TRANSCRIBE_LOADING_ICON;
      btn.classList.add("loading");
      btn.disabled = true;
    }
    let attempts = 0;
    while (attempts < 20 && String(targetId).startsWith("temp_")) {
      await new Promise(r => setTimeout(r, 250));
      attempts++;
      if (parentWrap && parentWrap.id && parentWrap.id.startsWith("msg-wrap-")) {
        const parsed = parentWrap.id.replace("msg-wrap-", "");
        if (parsed && !parsed.startsWith("temp_") && !isNaN(Number(parsed))) {
          targetId = Number(parsed);
          break;
        }
      }
    }
    if (String(targetId).startsWith("temp_")) {
      if (btn) {
        btn.innerHTML = VOICE_TRANSCRIBE_ICON;
        btn.classList.remove("loading");
        btn.disabled = false;
      }
      showToast("Подождите отправки аудио");
      return;
    }
  }

  let box = document.getElementById(`voice-transcript-${targetId}`);
  if (!box && parentWrap) {
    box = parentWrap.querySelector(".voice-transcript-box");
    if (box) box.id = `voice-transcript-${targetId}`;
  }
  if (!box) return;

  if (box.querySelector(".voice-transcript-text") && box.querySelector(".voice-transcript-text").textContent.trim()) {
    const isNowHidden = box.classList.toggle("hidden");
    if (btn) btn.classList.toggle("active", !isNowHidden);
    return;
  }

  if (btn) {
    btn.innerHTML = VOICE_TRANSCRIBE_LOADING_ICON;
    btn.classList.add("loading");
    btn.disabled = true;
  }

  try {
    let audioUrl = null;
    const playBtn = document.getElementById(`voice-play-${targetId}`) || (parentWrap ? parentWrap.querySelector(".voice-play-btn") : null);
    if (playBtn && playBtn.dataset.audioUrl) {
      audioUrl = playBtn.dataset.audioUrl;
    }

    let wavBase64 = null;
    if (audioUrl) {
      try {
        wavBase64 = await convertAudioUrlToWavBase64(audioUrl);
      } catch (convErr) {
        console.warn("Client WAV conversion fallback:", convErr);
      }
    }

    const payload = { message_id: Number(targetId) };
    if (wavBase64) {
      payload.wav_data = wavBase64;
    }

    const res = await fetch("/api/messages/transcribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${state.token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.text) {
        box.innerHTML = `<span class="voice-transcript-icon">${VOICE_TRANSCRIBE_ICON}</span><span class="voice-transcript-text">${escapeHtml(data.text)}</span>`;
        box.classList.remove("hidden");
        if (btn) btn.classList.add("active");
      } else {
        showToast("Не удалось распознать речь");
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      showToast(errData.detail || "Ошибка при расшифровке");
    }
  } catch (e) {
    showToast("Сетевая ошибка");
  } finally {
    if (btn) {
      btn.innerHTML = VOICE_TRANSCRIBE_ICON;
      btn.classList.remove("loading");
      btn.disabled = false;
    }
  }
}

function openForwardModal(msg) {
  state.forwardingMsg = msg;
  const modal = document.getElementById("forwardModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  document.getElementById("forwardSearchInput").value = "";
  renderForwardTargets("");
}

function closeForwardModal() {
  const modal = document.getElementById("forwardModal");
  if (modal) modal.classList.add("hidden");
  state.forwardingMsg = null;
}

function filterForwardTargets(query) {
  renderForwardTargets(query.toLowerCase().trim());
}

function renderForwardTargets(filter) {
  const list = document.getElementById("forwardTargetsList");
  if (!list) return;
  list.innerHTML = "";

  const targets = [];
  targets.push({ type: "saved", id: state.user.id, name: "Избранное", icon: "🔖", color: "#5865F2" });
  if (state.aiBot) {
    targets.push({ type: "ai", id: state.aiBot.id, name: "AI CHAT", icon: "🤖", color: "#10a37f" });
  }

  state.friends.forEach(f => {
    if (state.aiBot && Number(f.id) === Number(state.aiBot.id)) return;
    targets.push({ type: "friend", id: f.id, name: f.username, icon: "👤", color: f.avatar_color || "#5865F2" });
  });

  state.groups.forEach(g => {
    targets.push({ type: "group", id: g.id, name: g.name, icon: "👥", color: g.avatar_color || "#FEE75C" });
  });

  targets.forEach(t => {
    if (filter && !t.name.toLowerCase().includes(filter)) return;
    const item = document.createElement("div");
    item.className = "forward-target-item";
    item.onclick = () => executeForwardMessage(t);
    item.innerHTML = `
      <div class="forward-target-icon" style="background:${t.color};">${t.icon}</div>
      <div class="forward-target-name">${escapeHtml(t.name)}</div>
    `;
    list.appendChild(item);
  });
}

async function executeForwardMessage(target) {
  const msg = state.forwardingMsg;
  if (!msg) return;
  closeForwardModal();

  const timeStr = getClientTimeStr();
  const forwardHeader = `Переслано от ${msg.sender_username || "пользователя"}`;
  const payload = {
    receiver_id: target.type === "group" ? null : target.id,
    group_id: target.type === "group" ? target.id : null,
    content: msg.content || "",
    timestamp: timeStr,
    msg_type: msg.msg_type || "text",
    media_url: msg.media_url || "",
    file_name: msg.file_name || "",
    file_size: msg.file_size || 0,
    duration: msg.duration || 0,
    reply_to_id: null,
    temp_id: "temp_fwd_" + Date.now()
  };

  try {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({
        type: "message",
        ...payload,
        reply_to: {
          username: forwardHeader,
          content: msg.content || (msg.msg_type === "image" ? "📷 Фото" : "Медиафайл")
        }
      }));
    } else {
      await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${state.token}` },
        body: JSON.stringify(payload)
      });
    }
    showToast(`Переслано в ${target.name}`);
  } catch (e) {
    showToast("Ошибка при пересылке");
  }
}

async function openAiChat() {
  if (!state.aiBot) {
    try {
      const r = await fetch("/api/ai/bot");
      if (r.ok) state.aiBot = await r.json();
    } catch (e) {}
  }
  if (!state.aiBot) return;

  const aiFriend = {
    id: state.aiBot.id,
    username: "AI CHAT",
    user_code: state.aiBot.user_code || "#00000",
    avatar_color: "#10a37f",
    avatar_url: "",
    is_online: true,
    custom_status: "🤖",
    profile_color: "#10a37f",
    bio: "Искусственный интеллект ChickenMax (модель: gpt-6-luna)",
    last_message: "",
    last_time: "",
    unread_count: 0,
    is_ai: true
  };

  cancelReply();
  cancelEditMessage();
  clearChatSearchHighlights();
  state.activeGroup = null;
  state.activeFriend = aiFriend;
  aiFriend.unread_count = 0;
  state.renderedMsgIds.clear();
  const container = document.getElementById("messagesContainer");
  if (container) container.innerHTML = "";
  renderFriendsList();

  document.getElementById("noChatSelected").classList.add("hidden");
  document.getElementById("activeChat").classList.remove("hidden");
  document.getElementById("chatArea").classList.add("mobile-open");

  const targetUserEl = document.getElementById("targetUsername");
  targetUserEl.textContent = "AI CHAT";
  targetUserEl.style.color = "#10a37f";

  const targetBadgeEl = document.getElementById("targetStatusBadge");
  if (targetBadgeEl) targetBadgeEl.textContent = "🤖";

  const statusEl = document.getElementById("targetStatus");
  statusEl.textContent = "модель: gpt-6-luna";
  statusEl.className = "target-status online";

  const ind = document.getElementById("targetStatusIndicator");
  if (ind) ind.className = "status-indicator online";

  const headerCallBtn = document.getElementById("headerCallBtn");
  if (headerCallBtn) headerCallBtn.classList.add("hidden");

  const targetCodeBadge = document.getElementById("targetCodeBadge");
  if (targetCodeBadge) targetCodeBadge.textContent = "gpt-6-luna";

  const avatarEl = document.getElementById("targetAvatar");
  if (avatarEl) {
    avatarEl.style.backgroundImage = "";
    avatarEl.style.background = "linear-gradient(135deg, #10a37f, #0d9488)";
    avatarEl.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="white"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z"/></svg>`;
  }

  updateChatInputState();
  await loadMessages(state.aiBot.id, true);
  if (window.innerWidth > 768) {
    document.getElementById("messageInput").focus();
  }
}

async function selectGroup(group) {
  cancelReply();
  cancelEditMessage();
  clearChatSearchHighlights();
  state.activeFriend = null;
  state.activeGroup = group;
  state.renderedMsgIds.clear();
  const container = document.getElementById("messagesContainer");
  if (container) container.innerHTML = "";
  renderFriendsList();

  document.getElementById("noChatSelected").classList.add("hidden");
  const activeChat = document.getElementById("activeChat");
  activeChat.classList.remove("hidden");
  document.getElementById("chatArea").classList.add("mobile-open");

  const targetUserEl = document.getElementById("targetUsername");
  targetUserEl.textContent = group.name;
  targetUserEl.style.color = "";

  const targetBadgeEl = document.getElementById("targetStatusBadge");
  if (targetBadgeEl) {
    targetBadgeEl.textContent = "";
  }
  
  const statusEl = document.getElementById("targetStatus");
  statusEl.textContent = `${group.member_count || "конфа"} участников`;
  statusEl.className = "target-status";

  const ind = document.getElementById("targetStatusIndicator");
  if (ind) ind.className = "status-indicator online";

  const headerCallBtn = document.getElementById("headerCallBtn");
  if (headerCallBtn) headerCallBtn.classList.add("hidden");

  const targetCodeBadge = document.getElementById("targetCodeBadge");
  if (targetCodeBadge) {
    targetCodeBadge.textContent = "";
  }

  updateAvatarElement(document.getElementById("targetAvatar"), {
    avatar_url: group.avatar_url,
    avatar_color: group.avatar_color,
    name: group.name
  });
  updateChatInputState();

  await loadGroupMessages(group.id, true);
  await loadPinnedMessage(group.id, true);
  if (window.innerWidth > 768) {
    document.getElementById("messageInput").focus();
  }
}

function closeChatMobile() {
  cancelReply();
  cancelEditMessage();
  clearChatSearchHighlights();
  const input = document.getElementById("messageInput");
  if (input) input.blur();
  const chatArea = document.getElementById("chatArea");
  chatArea.classList.remove("mobile-open");
  state.activeFriend = null;
  state.activeGroup = null;
  state.renderedMsgIds.clear();
  const container = document.getElementById("messagesContainer");
  if (container) container.innerHTML = "";
  renderFriendsList();
}

async function loadMessages(friendId, shouldScroll = false) {
  try {
    const res = await fetch(`/api/messages/${friendId}`, {
      headers: { "Authorization": `Bearer ${state.token}` }
    });
    if (res.ok) {
      if (!state.activeFriend || Number(state.activeFriend.id) !== Number(friendId)) return;
      const messages = await res.json();
      let hasNew = false;
      messages.forEach((msg) => {
        if (!state.renderedMsgIds.has(msg.id)) {
          appendMessage(msg);
          hasNew = true;
        } else {
          updateExistingMessage(msg);
        }
      });
      if (shouldScroll || hasNew) {
        scrollToBottom();
      }
    }
  } catch (e) {}
}

async function loadGroupMessages(groupId, shouldScroll = false) {
  try {
    const res = await fetch(`/api/groups/${groupId}/messages`, {
      headers: { "Authorization": `Bearer ${state.token}` }
    });
    if (res.ok) {
      if (!state.activeGroup || Number(state.activeGroup.id) !== Number(groupId)) return;
      const messages = await res.json();
      let hasNew = false;
      messages.forEach((msg) => {
        if (!state.renderedMsgIds.has(msg.id)) {
          appendMessage(msg);
          hasNew = true;
        } else {
          updateExistingMessage(msg);
        }
      });
      if (shouldScroll || hasNew) {
        scrollToBottom();
      }
    }
  } catch (e) {}
}

function updateExistingMessage(msg) {
  const wrapper = document.getElementById(`msg-wrap-${msg.id}`);
  if (wrapper) {
    if (msg.sender_id === state.user.id) {
      const icon = wrapper.querySelector(".check-icon");
      if (icon) {
        if (msg.is_read) {
          icon.className = "check-icon read";
          icon.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M12.354 4.354a.5.5 0 0 0-.708-.708L5 10.293 1.854 7.146a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l7-7zm2.5 0a.5.5 0 0 0-.708-.708L7.5 10.293 6.646 9.439a.5.5 0 0 0-.708.708l1.208 1.207a.5.5 0 0 0 .708 0l7-7z"/></svg>`;
        }
      }
    }
    updateMessageReactions(msg.id, msg.reactions);
  }
}

function updateMessageReactions(messageId, reactions) {
  const container = document.getElementById(`reactions-${messageId}`);
  if (!container) return;
  container.innerHTML = "";
  if (!reactions || reactions.length === 0) return;

  reactions.forEach((r) => {
    const isMine = r.users && r.users.includes(state.user.id);
    const pill = document.createElement("div");
    pill.className = `reaction-pill ${isMine ? "active" : ""}`;
    pill.innerHTML = `<span>${r.emoji}</span><span>${r.count}</span>`;
    pill.onclick = (e) => {
      e.stopPropagation();
      sendReaction(messageId, r.emoji);
    };
    container.appendChild(pill);
  });
}

function optimisticUpdateReaction(messageId, emoji) {
  const container = document.getElementById(`reactions-${messageId}`);
  if (!container) return;

  const existingPills = Array.from(container.querySelectorAll(".reaction-pill"));
  let targetPill = existingPills.find(p => p.querySelector("span:first-child") && p.querySelector("span:first-child").textContent === emoji);

  if (targetPill) {
    const isMine = targetPill.classList.contains("active");
    const countSpan = targetPill.querySelector("span:last-child");
    let count = parseInt(countSpan.textContent, 10) || 1;

    if (isMine) {
      count--;
      if (count <= 0) {
        targetPill.remove();
      } else {
        countSpan.textContent = count;
        targetPill.classList.remove("active");
      }
    } else {
      count++;
      countSpan.textContent = count;
      targetPill.classList.add("active");
    }
  } else {
    const pill = document.createElement("div");
    pill.className = "reaction-pill active";
    pill.innerHTML = `<span>${emoji}</span><span>1</span>`;
    pill.onclick = (e) => {
      e.stopPropagation();
      sendReaction(messageId, emoji);
    };
    container.appendChild(pill);
  }
}

async function sendReaction(messageId, emoji) {
  optimisticUpdateReaction(messageId, emoji);

  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: "react", message_id: messageId, emoji: emoji }));
  } else {
    try {
      const res = await fetch("/api/messages/react", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${state.token}`
        },
        body: JSON.stringify({ message_id: messageId, emoji: emoji })
      });
      if (res.ok) {
        const data = await res.json();
        updateMessageReactions(messageId, data.reactions);
      }
    } catch (e) {}
  }
}

function initSwipeToReply(wrapper, msg) {
  let startX = 0;
  let startY = 0;
  let currentDx = 0;
  let isSwiping = false;
  let triggered = false;

  const hint = document.createElement("div");
  hint.className = "swipe-reply-hint";
  hint.textContent = "↩";
  wrapper.appendChild(hint);

  wrapper.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentDx = 0;
    isSwiping = false;
    triggered = false;
    wrapper.style.transition = "none";
  }, { passive: true });

  wrapper.addEventListener("touchmove", (e) => {
    if (e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;

    if (!isSwiping) {
      if (Math.abs(dy) > Math.abs(dx) || dx < 10) return;
      isSwiping = true;
    }

    if (dx > 0) {
      currentDx = Math.min(dx * 0.5, 65);
      wrapper.style.transform = `translateX(${currentDx}px)`;
      if (currentDx > 38 && !triggered) {
        triggered = true;
        hint.classList.add("active");
        if (navigator.vibrate) navigator.vibrate(25);
      } else if (currentDx <= 38 && triggered) {
        triggered = false;
        hint.classList.remove("active");
      }
    }
  }, { passive: true });

  wrapper.addEventListener("touchend", () => {
    wrapper.style.transition = "transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.2)";
    wrapper.style.transform = "translateX(0)";
    hint.classList.remove("active");
    if (triggered) {
      startReply(msg);
    }
    isSwiping = false;
    triggered = false;
  });
}

function seekVoiceAudio(msgId, event) {
  event.stopPropagation();
  let audio = null;
  let durationSec = 0;
  if (state.activeAudio && String(state.activeAudio.msgId) === String(msgId)) {
    audio = state.activeAudio.audio;
    durationSec = audio.duration;
  } else {
    togglePlayVoice(msgId);
    if (state.activeAudio && String(state.activeAudio.msgId) === String(msgId)) {
      audio = state.activeAudio.audio;
      durationSec = audio.duration;
    }
  }
  if (!audio) return;
  const wrap = document.getElementById(`voice-bars-${msgId}`);
  if (!wrap) return;
  const rect = wrap.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clickX = clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
  const dur = durationSec || audio.duration || 1;
  audio.currentTime = ratio * dur;
}

function toggleSecretMode() {
  state.isSecretMode = !state.isSecretMode;
  const btn = document.getElementById("secretChatBtn");
  if (btn) btn.classList.toggle("active", state.isSecretMode);
  const banner = document.getElementById("secretChatBanner");
  if (banner) banner.classList.toggle("hidden", !state.isSecretMode);
  showToast(state.isSecretMode ? "Секретный E2EE режим включен" : "Секретный режим выключен");
}

function changeSecretTimer(val) {
  state.burnTimer = parseInt(val, 10) || 0;
}

async function getChatCryptoKey(peerId) {
  const myId = Number(state.user.id);
  const otherId = Number(peerId);
  const salt = `chickenmax_e2ee_${Math.min(myId, otherId)}_${Math.max(myId, otherId)}`;
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(salt + "_salt_secret_2026"),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptMessageText(text, peerId) {
  try {
    const key = await getChatCryptoKey(peerId);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encryptedBuf = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      enc.encode(text)
    );
    const ivB64 = btoa(String.fromCharCode(...iv));
    const dataB64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuf)));
    return `E2EE:${ivB64}:${dataB64}`;
  } catch (e) {
    return text;
  }
}

async function decryptMessageText(cipherText, peerId) {
  if (!cipherText || !cipherText.startsWith("E2EE:")) return cipherText;
  try {
    const parts = cipherText.split(":");
    const iv = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
    const data = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));
    const key = await getChatCryptoKey(peerId);
    const decryptedBuf = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data
    );
    const dec = new TextDecoder();
    return dec.decode(decryptedBuf);
  } catch (e) {
    return "[Зашифрованное сообщение]";
  }
}

function initBurnTimer(wrapper, msgId, seconds) {
  let remaining = seconds;
  const meta = wrapper.querySelector(".message-meta");
  const burnBadge = document.createElement("span");
  burnBadge.className = "burn-timer-badge";
  const flameSvg = `<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" style="vertical-align:-1px;margin-right:2px"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>`;
  burnBadge.innerHTML = `${flameSvg}${remaining}с`;
  if (meta) meta.prepend(burnBadge);

  const timer = setInterval(() => {
    remaining--;
    if (remaining > 0) {
      burnBadge.innerHTML = `${flameSvg}${remaining}с`;
    } else {
      clearInterval(timer);
      wrapper.classList.add("burning");
      setTimeout(() => {
        wrapper.remove();
        if (msgId) {
          fetch(`/api/messages/delete?message_id=${msgId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${state.token}` }
          }).catch(() => {});
        }
      }, 700);
    }
  }, 1000);
}

function buildWaveformBarsHtml(msgId) {
  const seed = typeof msgId === "number" ? msgId : String(msgId).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  let bars = "";
  for (let i = 0; i < 22; i++) {
    const h = 6 + ((seed * 13 + i * 19) % 18);
    bars += `<div class="voice-wave-bar" style="height:${h}px"></div>`;
  }
  return bars;
}

function appendMessage(msg) {
  if (msg.id && state.renderedMsgIds.has(msg.id)) return;

  if (state.activeFriend) {
    if (msg.group_id) return;
    const sId = Number(msg.sender_id);
    const rId = msg.receiver_id != null ? Number(msg.receiver_id) : null;
    const myId = Number(state.user.id);
    const fId = Number(state.activeFriend.id);
    const isRelated = (sId === myId && (!rId || rId === fId)) ||
                      (sId === fId && (!rId || rId === myId));
    if (!isRelated) return;
  } else if (state.activeGroup) {
    if (Number(msg.group_id) !== Number(state.activeGroup.id)) return;
  } else {
    return;
  }

  if (msg.id) state.renderedMsgIds.add(msg.id);

  const container = document.getElementById("messagesContainer");
  const isSelf = Number(msg.sender_id) === Number(state.user.id);
  
  const wrapper = document.createElement("div");
  wrapper.id = `msg-wrap-${msg.id || Date.now()}`;
  wrapper.className = `message-bubble-wrapper ${isSelf ? "self" : "incoming"}`;
  initSwipeToReply(wrapper, msg);

  const isSticker = msg.msg_type === "sticker";
  const bubble = document.createElement("div");
  bubble.className = `message-bubble ${isSelf ? "self" : "incoming"}${isSticker ? " sticker-bubble" : ""}`;
  bubble.ondblclick = () => startReply(msg);

  let checkHtml = "";
  if (isSelf) {
    if (msg.is_read) {
      checkHtml = `<span class="check-icon read" title="Прочитано"><svg viewBox="0 0 16 16" fill="currentColor"><path d="M12.354 4.354a.5.5 0 0 0-.708-.708L5 10.293 1.854 7.146a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l7-7zm2.5 0a.5.5 0 0 0-.708-.708L7.5 10.293 6.646 9.439a.5.5 0 0 0-.708.708l1.208 1.207a.5.5 0 0 0 .708 0l7-7z"/></svg></span>`;
    } else {
      checkHtml = `<span class="check-icon sent" title="Доставлено"><svg viewBox="0 0 16 16" fill="currentColor"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg></span>`;
    }
  }

  let replyHtml = "";
  if (msg.reply_to) {
    replyHtml = `
      <div class="quoted-message" onclick="scrollToMessage(${msg.reply_to.id})">
        <div class="quoted-author">${escapeHtml(msg.reply_to.username)}</div>
        <div class="quoted-text">${escapeHtml(msg.reply_to.content)}</div>
      </div>
    `;
  }

  let senderNameHtml = "";
  if (state.activeGroup && !isSelf && (msg.sender_username || msg.sender_name)) {
    const sName = escapeHtml(msg.sender_username || msg.sender_name);
    const sColor = msg.sender_profile_color ? `color:${escapeHtml(msg.sender_profile_color)};` : "color:var(--accent-primary);";
    const sBadge = msg.sender_custom_status ? ` <span class="user-status-badge">${escapeHtml(msg.sender_custom_status)}</span>` : "";
    senderNameHtml = `<div class="message-sender-name" style="${sColor}cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;margin-bottom:2px;" onclick="openTargetProfileModalById(${msg.sender_id})" title="Открыть профиль">${sName}${sBadge}</div>`;
  }

  let bodyHtml = "";
  if (msg.msg_type === "image") {
    const rawContent = (msg.content || "").trim();
    const isAutoName = !rawContent ||
      rawContent === "Фотография" ||
      rawContent === "GIF анимация" ||
      /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(rawContent) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(rawContent);

    const hasCaption = !isAutoName;
    if (!hasCaption && !msg.reply_to && !senderNameHtml) {
      bubble.classList.add("image-only-bubble");
    }

    bodyHtml = `
      <div class="message-image-wrap" onclick="openLightbox('${msg.media_url}')">
        <img src="${msg.media_url}" loading="lazy" alt="Фото">
      </div>
      ${hasCaption ? `<div class="message-text" style="margin-top:6px;">${escapeHtml(rawContent)}</div>` : ""}
    `;
  } else if (msg.msg_type === "voice") {
    const dur = msg.duration || 0;
    const m = Math.floor(dur / 60);
    const s = String(dur % 60).padStart(2, "0");
    const hasTranscript = msg.content && !msg.content.startsWith("Голосовое");
    bodyHtml = `
      <div class="message-voice-player">
        <button type="button" id="voice-play-${msg.id}" class="voice-play-btn" data-audio-url="${msg.media_url}" data-duration="${dur}" onclick="togglePlayVoice('${msg.id}', this)">${VOICE_PLAY_ICON}</button>
        <div class="voice-waveform-wrap" onclick="seekVoiceAudio('${msg.id}', event)">
          <div id="voice-bars-${msg.id}" class="voice-waveform-bars">
            ${buildWaveformBarsHtml(msg.id)}
          </div>
          <div class="voice-time-wrap">
            <span id="voice-time-${msg.id}">${m}:${s}</span>
            <div class="voice-actions-group">
              <span id="voice-speed-${msg.id}" class="voice-speed-badge" onclick="changeVoiceSpeed('${msg.id}')">1x</span>
              <button type="button" class="voice-transcribe-btn ${hasTranscript ? 'active' : ''}" onclick="transcribeVoice('${msg.id}', this)" title="Расшифровать в текст">${VOICE_TRANSCRIBE_ICON}</button>
            </div>
          </div>
        </div>
      </div>
      <div id="voice-transcript-${msg.id}" class="voice-transcript-box ${hasTranscript ? '' : 'hidden'}">${hasTranscript ? `<span class="voice-transcript-icon">${VOICE_TRANSCRIBE_ICON}</span><span class="voice-transcript-text">${escapeHtml(msg.content)}</span>` : ''}</div>
    `;
  } else if (msg.msg_type === "sticker") {
    bodyHtml = `<div class="sticker-content">${escapeHtml(msg.content)}</div>`;
  } else if (msg.msg_type === "video_note") {
    const dur = msg.duration || 0;
    const m = Math.floor(dur / 60);
    const s = String(dur % 60).padStart(2, "0");
    bodyHtml = `
      <div class="video-note-bubble" onclick="toggleVideoNotePlay(this)">
        <video src="${msg.media_url}" playsinline loop preload="metadata"></video>
        <div class="video-note-play-icon">▶</div>
        <div class="video-note-duration">${m}:${s}</div>
      </div>
    `;
  } else if (msg.msg_type === "file") {
    const ext = getFileExtension(msg.file_name || msg.content);
    const badge = getFileBadge(ext);
    bodyHtml = `
      <div class="message-file-card">
        <div class="file-icon-box ${badge.colorClass}">${badge.icon}</div>
        <div class="file-card-details">
          <div class="file-card-name" title="${escapeHtml(msg.file_name || msg.content)}">${escapeHtml(msg.file_name || msg.content)}</div>
          <div class="file-card-sub">
            <span class="file-card-size">${formatFileSize(msg.file_size || 0)}</span>
            <span class="file-card-ext">${ext.toUpperCase() || "FILE"}</span>
          </div>
        </div>
        <a href="${msg.media_url}" download="${escapeHtml(msg.file_name || 'file')}" class="file-download-btn" title="Скачать файл" target="_blank" onclick="event.stopPropagation()">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
        </a>
      </div>
    `;
  } else if (msg.msg_type === "encrypted") {
    bodyHtml = `
      <div class="message-text">
        <span class="encrypted-badge"><svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" style="vertical-align:-1px;margin-right:2px"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>E2EE</span>
        <span class="enc-content" id="enc-text-${msg.id || Date.now()}">${escapeHtml(msg.content)}</span>
      </div>
    `;
  } else if (msg.msg_type === "call_log") {
    const dur = msg.duration || 0;
    const isVideoMsg = msg.file_name === "video" || (msg.content && msg.content.toLowerCase().includes("видео"));
    let title = "";
    let color = "";
    let arrowHtml = "";
    const callLabel = isVideoMsg ? "Видеозвонок" : "Звонок";

    if (dur === 0) {
      if (isSelf) {
        title = isVideoMsg ? "Пропущенный видеозвонок" : "Пропущенный звонок";
        color = "var(--text-secondary)";
        arrowHtml = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style="vertical-align:-1px;"><path d="M9 5v2h6.59L4 18.59 5.41 20 17 8.41V15h2V5z"/></svg>`;
      } else {
        title = isVideoMsg ? "Отклонённый видеозвонок" : "Отклонённый звонок";
        color = "#ff4d4f";
        arrowHtml = `<svg viewBox="0 0 24 24" width="12" height="12" fill="#ff4d4f" style="vertical-align:-1px;"><path d="M20 5.41L18.59 4 7 15.59V9H5v10h10v-2H8.41z"/></svg>`;
      }
    } else {
      const m = Math.floor(dur / 60);
      const s = String(dur % 60).padStart(2, "0");
      if (isSelf) {
        title = isVideoMsg ? `Исходящий видеозвонок (${m}:${s})` : `Исходящий звонок (${m}:${s})`;
        color = "var(--text-primary)";
        arrowHtml = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style="vertical-align:-1px;"><path d="M9 5v2h6.59L4 18.59 5.41 20 17 8.41V15h2V5z"/></svg>`;
      } else {
        title = isVideoMsg ? `Входящий видеозвонок (${m}:${s})` : `Входящий звонок (${m}:${s})`;
        color = "var(--text-primary)";
        arrowHtml = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style="vertical-align:-1px;"><path d="M20 5.41L18.59 4 7 15.59V9H5v10h10v-2H8.41z"/></svg>`;
      }
    }

    const iconSvg = isVideoMsg
      ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>`
      : `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>`;

    bodyHtml = `
      <div class="message-call-log" style="display:flex;align-items:center;gap:12px;padding:2px 0 6px;">
        <div class="call-log-info" style="flex:1;">
          <div class="call-log-title" style="font-weight:600;color:${color};font-size:15px;margin-bottom:2px;">
            ${title}
          </div>
          <div class="call-log-subtitle" style="font-size:13px;color:var(--text-secondary);">
            ${arrowHtml} ${callLabel}
          </div>
        </div>
        <div class="call-log-icon" style="background:var(--accent-primary);opacity:0.9;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;color:#fff;">
          ${iconSvg}
        </div>
      </div>
    `;
  } else {
    bodyHtml = `<div class="message-text">${formatMessageText(msg.content)}</div>`;
  }

  const editedHtml = msg.is_edited ? `<span class="message-edited-tag">(изм.)</span>` : "";
  const pinnedHtml = msg.is_pinned ? `<span class="message-pinned-tag" title="Закреплено"><svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/></svg></span>` : "";

  bubble.innerHTML = `
    ${senderNameHtml}
    ${replyHtml}
    ${bodyHtml}
    <div class="message-meta">
      <span class="message-time">${escapeHtml(formatMessageTime(msg.timestamp))}</span>
      ${editedHtml}
      ${pinnedHtml}
      ${checkHtml}
    </div>
  `;

  const actionsBar = document.createElement("div");
  actionsBar.className = "message-actions-bar";

  const replyBtn = document.createElement("button");
  replyBtn.type = "button";
  replyBtn.className = "quick-react-btn quick-reply-btn";
  replyBtn.title = "Ответить";
  replyBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>`;
  replyBtn.onclick = (e) => {
    e.stopPropagation();
    startReply(msg);
  };
  actionsBar.appendChild(replyBtn);

  const pinBtn = document.createElement("button");
  pinBtn.type = "button";
  pinBtn.className = "quick-react-btn quick-action-icon-btn quick-pin-btn";
  pinBtn.title = msg.is_pinned ? "Открепить" : "Закрепить";
  pinBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/></svg>`;
  pinBtn.onclick = (e) => {
    e.stopPropagation();
    pinMessage(msg.id);
  };
  actionsBar.appendChild(pinBtn);

  if (isSelf && (msg.msg_type === "text" || msg.msg_type === "encrypted")) {
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "quick-react-btn quick-action-icon-btn quick-edit-btn";
    editBtn.title = "Редактировать";
    editBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
    editBtn.onclick = (e) => {
      e.stopPropagation();
      startEditMessage(msg);
    };
    actionsBar.appendChild(editBtn);
  }

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "quick-react-btn quick-action-icon-btn quick-del-btn";
  delBtn.title = isSelf ? "Удалить для всех" : "Удалить у себя";
  delBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;
  delBtn.onclick = (e) => {
    e.stopPropagation();
    deleteMessage(msg.id);
  };
  actionsBar.appendChild(delBtn);

  const isSavedChat = state.activeFriend && Number(state.activeFriend.id) === Number(state.user.id);
  if (!isSavedChat) {
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "quick-react-btn quick-action-icon-btn quick-save-btn";
    saveBtn.title = "Сохранить в Избранное";
    saveBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>`;
    saveBtn.onclick = (e) => {
      e.stopPropagation();
      saveMessageToFavorites(msg.id);
    };
    actionsBar.appendChild(saveBtn);
  }

  const forwardBtn = document.createElement("button");
  forwardBtn.type = "button";
  forwardBtn.className = "quick-react-btn quick-action-icon-btn quick-forward-btn";
  forwardBtn.title = "Переслать";
  forwardBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z"/></svg>`;
  forwardBtn.onclick = (e) => {
    e.stopPropagation();
    openForwardModal(msg);
  };
  actionsBar.appendChild(forwardBtn);

  QUICK_REACTIONS.forEach((em) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quick-react-btn";
    btn.textContent = em;
    btn.onclick = (e) => {
      e.stopPropagation();
      sendReaction(msg.id, em);
    };
    actionsBar.appendChild(btn);
  });

  const reactionsContainer = document.createElement("div");
  reactionsContainer.id = `reactions-${msg.id}`;
  reactionsContainer.className = "reactions-container";

  wrapper.appendChild(bubble);
  wrapper.appendChild(actionsBar);
  wrapper.appendChild(reactionsContainer);
  container.appendChild(wrapper);

  if (msg.reactions && msg.reactions.length > 0) {
    updateMessageReactions(msg.id, msg.reactions);
  }

  if (msg.msg_type === "encrypted") {
    const peerId = isSelf ? msg.receiver_id : msg.sender_id;
    const targetEl = wrapper.querySelector(".enc-content");
    if (targetEl && peerId) {
      decryptMessageText(msg.content, peerId).then((plain) => {
        targetEl.textContent = plain;
      });
    }
  }

  if (msg.burn_timer && Number(msg.burn_timer) > 0) {
    initBurnTimer(wrapper, msg.id, Number(msg.burn_timer));
  }
}

function startReply(msg) {
  const authorName = msg.sender_id === state.user.id ? "Себе" : (msg.sender_username || msg.sender_name || (state.activeFriend ? state.activeFriend.username : "Собеседнику"));
  state.replyingTo = {
    id: msg.id,
    username: authorName,
    content: msg.content
  };
  const bar = document.getElementById("replyPreviewBar");
  document.getElementById("replyPreviewUser").textContent = authorName;
  document.getElementById("replyPreviewText").textContent = msg.content;
  bar.classList.remove("hidden");
  document.getElementById("messageInput").focus();
}

function cancelReply() {
  state.replyingTo = null;
  const bar = document.getElementById("replyPreviewBar");
  if (bar) bar.classList.add("hidden");
}

function startEditMessage(msg) {
  state.editingMsg = msg;
  cancelReply();
  const bar = document.getElementById("editPreviewBar");
  let currentText = msg.content;
  const wrap = document.getElementById(`msg-wrap-${msg.id}`);
  if (wrap) {
    const encEl = wrap.querySelector(".enc-content");
    if (encEl) {
      currentText = encEl.textContent;
    } else {
      const textEl = wrap.querySelector(".message-text");
      if (textEl) currentText = textEl.textContent;
    }
  }
  document.getElementById("editTextPreview").textContent = currentText;
  bar.classList.remove("hidden");
  const input = document.getElementById("messageInput");
  input.value = currentText;
  input.focus();
  updateChatInputState();
}

function cancelEditMessage() {
  state.editingMsg = null;
  const bar = document.getElementById("editPreviewBar");
  if (bar) bar.classList.add("hidden");
  const input = document.getElementById("messageInput");
  if (input) {
    input.value = "";
    updateChatInputState();
  }
}

async function deleteMessage(msgId) {
  if (!confirm("Удалить сообщение для всех?")) return;
  removeMessageFromDom(msgId);
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: "delete", message_id: msgId }));
  } else {
    fetch("/api/messages/delete", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${state.token}`
      },
      body: JSON.stringify({ message_id: msgId })
    }).catch(() => {});
  }
}

function removeMessageFromDom(msgId) {
  const el = document.getElementById(`msg-wrap-${msgId}`);
  if (el) el.remove();
  state.renderedMsgIds.delete(msgId);
  if (state.pinnedMsg && state.pinnedMsg.id === msgId) {
    document.getElementById("pinnedMessageBar").classList.add("hidden");
    state.pinnedMsg = null;
  }
}

async function pinMessage(msgId) {
  const wrap = document.getElementById(`msg-wrap-${msgId}`);
  if (wrap) {
    const meta = wrap.querySelector(".message-meta");
    let pinTag = wrap.querySelector(".message-pinned-tag");
    const isNowPinned = !pinTag;
    if (isNowPinned) {
      pinTag = document.createElement("span");
      pinTag.className = "message-pinned-tag";
      pinTag.title = "Закреплено";
      pinTag.innerHTML = `<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/></svg>`;
      if (meta) meta.appendChild(pinTag);
      const text = wrap.querySelector(".message-text")?.textContent || "Сообщение";
      setPinnedMessage({ id: msgId, content: text });
      showToast("Сообщение закреплено!");
    } else {
      pinTag.remove();
      if (state.pinnedMsg && state.pinnedMsg.id === msgId) {
        setPinnedMessage(null);
      }
      showToast("Сообщение откреплено!");
    }
  }

  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: "pin", message_id: msgId }));
  } else {
    fetch("/api/messages/pin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${state.token}`
      },
      body: JSON.stringify({ message_id: msgId })
    }).catch(() => {});
  }
}

async function unpinCurrentMessage() {
  if (!state.pinnedMsg) return;
  await pinMessage(state.pinnedMsg.id);
}

function setPinnedMessage(msg) {
  state.pinnedMsg = msg;
  const bar = document.getElementById("pinnedMessageBar");
  if (!msg) {
    bar.classList.add("hidden");
    return;
  }
  document.getElementById("pinnedMessageText").textContent = msg.content || (msg.msg_type === "image" ? "Фотография" : "Голосовое сообщение");
  bar.classList.remove("hidden");
}

function jumpToPinnedMessage() {
  if (state.pinnedMsg) {
    scrollToMessage(state.pinnedMsg.id);
  }
}

async function loadPinnedMessage(targetId, isGroup) {
  try {
    const res = await fetch(`/api/messages/pinned/${targetId}?is_group=${isGroup}`, {
      headers: { "Authorization": `Bearer ${state.token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setPinnedMessage(data || null);
    }
  } catch (e) {}
}

function scrollToMessage(msgId) {
  const el = document.getElementById(`msg-wrap-${msgId}`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("highlight-flash");
    setTimeout(() => {
      el.classList.remove("highlight-flash");
    }, 1500);
  }
}

function scrollToBottom() {
  const container = document.getElementById("messagesContainer");
  if (!container) return;
  container.scrollTop = container.scrollHeight;
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
  });
}

async function sendMessage(event) {
  event.preventDefault();
  closeEmojiPicker();
  const input = document.getElementById("messageInput");
  const content = input.value.trim();
  if (!content) return;
  if (!state.activeFriend && !state.activeGroup) return;

  if (state.editingMsg) {
    const msgId = state.editingMsg.id;
    const isEnc = state.editingMsg.msg_type === "encrypted" || state.secretMode;
    cancelEditMessage();
    input.value = "";
    updateChatInputState();
    const wrap = document.getElementById(`msg-wrap-${msgId}`);
    if (wrap) {
      const encEl = wrap.querySelector(".enc-content");
      if (encEl) {
        encEl.textContent = content;
      } else {
        const t = wrap.querySelector(".message-text");
        if (t) t.textContent = content;
      }
      let editTag = wrap.querySelector(".message-edited-tag");
      if (!editTag) {
        editTag = document.createElement("span");
        editTag.className = "message-edited-tag";
        editTag.textContent = "(изм.)";
        const meta = wrap.querySelector(".message-meta");
        if (meta) meta.appendChild(editTag);
      }
    }

    let payloadContent = content;
    if (isEnc) {
      const peerId = state.activeFriend ? state.activeFriend.id : null;
      if (peerId) {
        payloadContent = await encryptChatMessage(content, peerId);
      }
    }

    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: "edit", message_id: msgId, content: payloadContent }));
    } else {
      fetch("/api/messages/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${state.token}`
        },
        body: JSON.stringify({ message_id: msgId, content: payloadContent })
      });
    }
    return;
  }

  const replyToId = state.replyingTo ? state.replyingTo.id : null;
  const replyObj = state.replyingTo ? { ...state.replyingTo } : null;
  cancelReply();

  input.value = "";
  input.focus();
  updateChatInputState();

  const tempId = "temp_" + Date.now();
  const timeStr = getClientTimeStr();

  const isEnc = state.isSecretMode && state.activeFriend;
  const burnSec = isEnc ? state.burnTimer : 0;
  let sentContent = content;
  if (isEnc) {
    sentContent = await encryptMessageText(content, state.activeFriend.id);
  }

  const optimisticMsg = {
    id: tempId,
    sender_id: state.user.id,
    receiver_id: state.activeFriend ? state.activeFriend.id : null,
    group_id: state.activeGroup ? state.activeGroup.id : null,
    content: isEnc ? sentContent : content,
    timestamp: timeStr,
    is_read: false,
    msg_type: isEnc ? "encrypted" : "text",
    burn_timer: burnSec,
    media_url: "",
    duration: 0,
    is_edited: false,
    is_pinned: false,
    reactions: [],
    reply_to: replyObj
  };

  appendMessage(optimisticMsg);
  scrollToBottom();
  playNotificationSound();
  updateFriendLastMessage(optimisticMsg);

  const payload = {
    receiver_id: state.activeFriend ? state.activeFriend.id : null,
    group_id: state.activeGroup ? state.activeGroup.id : null,
    content: sentContent,
    timestamp: timeStr,
    msg_type: isEnc ? "encrypted" : "text",
    burn_timer: burnSec,
    reply_to_id: replyToId,
    temp_id: tempId
  };

  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: "message", ...payload }));
  } else {
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${state.token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const confirmed = await res.json();
        reconcileTempMessage(tempId, confirmed.id);
      }
    } catch (e) {}
  }
}

function openLightbox(src) {
  const modal = document.getElementById("imageLightbox");
  if (!modal) return;
  const img = document.getElementById("lightboxImg");
  const vid = document.getElementById("lightboxVideo");
  const isVideo = src.endsWith(".webm") || src.endsWith(".mp4") || src.endsWith(".mov") || src.includes("video/") || src.startsWith("data:video/");
  if (isVideo) {
    if (img) img.classList.add("hidden");
    if (vid) {
      vid.src = src;
      vid.classList.remove("hidden");
      vid.play().catch(() => {});
    }
  } else {
    if (vid) {
      vid.pause();
      vid.src = "";
      vid.classList.add("hidden");
    }
    if (img) {
      img.src = src;
      img.classList.remove("hidden");
    }
  }
  modal.classList.remove("hidden");
}

function closeLightbox() {
  const modal = document.getElementById("imageLightbox");
  if (modal) modal.classList.add("hidden");
  const vid = document.getElementById("lightboxVideo");
  if (vid) {
    vid.pause();
    vid.src = "";
    vid.classList.add("hidden");
  }
}

async function handleImageFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  event.target.value = "";
  await sendImageFile(file);
}

async function sendImageFile(file) {
  if (!state.activeFriend && !state.activeGroup) {
    showToast("Выбери диалог или конфу");
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    showToast("Картинка слишком большая (макс. 8 МБ)");
    return;
  }

  const inputEl = document.getElementById("messageInput");
  const caption = (inputEl && inputEl.value ? inputEl.value.trim() : "");
  if (inputEl && caption) {
    inputEl.value = "";
    if (typeof updateChatInputState === "function") updateChatInputState();
  }

  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result;
    const replyToId = state.replyingTo ? state.replyingTo.id : null;
    const replyObj = state.replyingTo ? { ...state.replyingTo } : null;
    cancelReply();

    const tempId = "temp_" + Date.now();
    const timeStr = getClientTimeStr();

    const optimisticMsg = {
      id: tempId,
      sender_id: state.user.id,
      receiver_id: state.activeFriend ? state.activeFriend.id : null,
      group_id: state.activeGroup ? state.activeGroup.id : null,
      content: caption,
      file_name: file.name || "",
      timestamp: timeStr,
      is_read: false,
      msg_type: "image",
      media_url: base64,
      duration: 0,
      is_edited: false,
      is_pinned: false,
      reactions: [],
      reply_to: replyObj
    };

    appendMessage(optimisticMsg);
    scrollToBottom();
    playNotificationSound();
    updateFriendLastMessage(optimisticMsg);

    const payload = {
      receiver_id: state.activeFriend ? state.activeFriend.id : null,
      group_id: state.activeGroup ? state.activeGroup.id : null,
      content: caption,
      file_name: file.name || "",
      timestamp: timeStr,
      msg_type: "image",
      media_url: base64,
      reply_to_id: replyToId,
      temp_id: tempId
    };

    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: "message", ...payload }));
    } else {
      try {
        const res = await fetch("/api/messages/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${state.token}`
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const msg = await res.json();
          reconcileTempMessage(tempId, msg.id);
        }
      } catch (e) {}
    }
  };
  reader.readAsDataURL(file);
}

function toggleAttachMenu(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById("attachMenu");
  if (!menu) return;
  menu.classList.toggle("hidden");
}

function closeAttachMenu() {
  const menu = document.getElementById("attachMenu");
  if (menu) menu.classList.add("hidden");
}

function selectImageAttach() {
  closeAttachMenu();
  document.getElementById("imageFileInput").click();
}

function selectFileAttach() {
  closeAttachMenu();
  document.getElementById("generalFileInput").click();
}

async function handleGeneralFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = "";
  if (!file) return;
  await sendGeneralFile(file);
}

async function sendGeneralFile(file) {
  if (!state.activeFriend && !state.activeGroup) {
    showToast("Выбери диалог или конфу");
    return;
  }
  if (file.size > 50 * 1024 * 1024) {
    showToast("Файл слишком большой (макс. 50 МБ)");
    return;
  }

  showToast(`Загрузка файла: ${file.name}...`);
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${state.token}`
      },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Ошибка загрузки файла");
      return;
    }

    const replyToId = state.replyingTo ? state.replyingTo.id : null;
    const replyObj = state.replyingTo ? { ...state.replyingTo } : null;
    cancelReply();

    const tempId = "temp_" + Date.now();
    const timeStr = getClientTimeStr();

    const optimisticMsg = {
      id: tempId,
      sender_id: state.user.id,
      receiver_id: state.activeFriend ? state.activeFriend.id : null,
      group_id: state.activeGroup ? state.activeGroup.id : null,
      content: file.name,
      timestamp: timeStr,
      is_read: false,
      msg_type: "file",
      media_url: data.url,
      duration: 0,
      file_name: data.file_name || file.name,
      file_size: data.file_size || file.size,
      is_edited: false,
      is_pinned: false,
      reactions: [],
      reply_to: replyObj
    };

    appendMessage(optimisticMsg);
    scrollToBottom();
    playNotificationSound();
    updateFriendLastMessage(optimisticMsg);

    const payload = {
      receiver_id: state.activeFriend ? state.activeFriend.id : null,
      group_id: state.activeGroup ? state.activeGroup.id : null,
      content: file.name,
      timestamp: timeStr,
      msg_type: "file",
      media_url: data.url,
      duration: 0,
      file_name: data.file_name || file.name,
      file_size: data.file_size || file.size,
      reply_to_id: replyToId,
      temp_id: tempId
    };

    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: "message", ...payload }));
    } else {
      const sendRes = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${state.token}`
        },
        body: JSON.stringify(payload)
      });
      if (sendRes.ok) {
        const msg = await sendRes.json();
        reconcileTempMessage(tempId, msg.id);
      }
    }
  } catch (err) {
    showToast("Ошибка сети при отправке файла");
  }
}

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileExtension(filename) {
  if (!filename) return "";
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function getFileBadge(ext) {
  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext)) {
    return {
      icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 10h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V6h2v2z"/></svg>`,
      colorClass: "badge-archive"
    };
  }
  if (["pdf"].includes(ext)) {
    return {
      icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v4zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zm4.5 3h1v-3h-1v3zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z"/></svg>`,
      colorClass: "badge-pdf"
    };
  }
  if (["exe", "msi", "dll", "apk", "iso", "bin"].includes(ext)) {
    return {
      icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`,
      colorClass: "badge-exe"
    };
  }
  if (["mp3", "wav", "ogg", "flac", "m4a", "aac"].includes(ext)) {
    return {
      icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`,
      colorClass: "badge-audio"
    };
  }
  if (["mp4", "mkv", "avi", "mov", "webm"].includes(ext)) {
    return {
      icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>`,
      colorClass: "badge-video"
    };
  }
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)) {
    return {
      icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`,
      colorClass: "badge-doc"
    };
  }
  if (["txt", "log", "md", "json", "py", "cpp", "cs", "js", "html", "css", "sql"].includes(ext)) {
    return {
      icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      colorClass: "badge-code"
    };
  }
  return {
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`,
    colorClass: "badge-file"
  };
}

async function openVideoNoteModal() {
  if (!state.activeFriend && !state.activeGroup) {
    showToast("Выбери диалог или конфу");
    return;
  }
  const modal = document.getElementById("videoNoteModal");
  modal.classList.remove("hidden");
  await initVideoNoteStream();
}

async function initVideoNoteStream() {
  try {
    if (state.videoNoteRecorder.stream) {
      state.videoNoteRecorder.stream.getTracks().forEach(t => t.stop());
      state.videoNoteRecorder.stream = null;
    }

    const facing = state.videoNoteRecorder.facingMode || "user";
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 480 }, height: { ideal: 480 } },
        audio: true
      });
    } catch (e1) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: true
        });
      } catch (e2) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (e3) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }
    }

    state.videoNoteRecorder.stream = stream;
    const videoEl = document.getElementById("videoNotePreview");
    if (videoEl) {
      videoEl.srcObject = stream;
      videoEl.play().catch(() => {});
    }

    const candidateTypes = [
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=h264,opus",
      "video/webm",
      "video/mp4;codecs=avc1,mp4a.40.2",
      "video/mp4;codecs=avc1",
      "video/mp4"
    ];
    let selectedMime = "";
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported) {
      for (const t of candidateTypes) {
        if (MediaRecorder.isTypeSupported(t)) {
          selectedMime = t;
          break;
        }
      }
    }

    let rec;
    const recOptions = {
      videoBitsPerSecond: 1800000,
      audioBitsPerSecond: 128000
    };
    if (selectedMime) recOptions.mimeType = selectedMime;

    try {
      rec = new MediaRecorder(stream, recOptions);
    } catch (errRec) {
      try {
        rec = selectedMime ? new MediaRecorder(stream, { mimeType: selectedMime }) : new MediaRecorder(stream);
      } catch (errRec2) {
        rec = new MediaRecorder(stream);
      }
    }

    state.videoNoteRecorder.chunks = [];
    state.videoNoteRecorder.seconds = 0;
    const ring = document.getElementById("videoNoteProgressRing");
    if (ring) ring.style.strokeDashoffset = "289.02";
    document.getElementById("videoNoteTimer").textContent = "00:00 / 01:00";

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        state.videoNoteRecorder.chunks.push(e.data);
      }
    };
    state.videoNoteRecorder.mediaRecorder = rec;
    rec.start(250);

    clearInterval(state.videoNoteRecorder.timerInterval);
    state.videoNoteRecorder.timerInterval = setInterval(() => {
      state.videoNoteRecorder.seconds++;
      const sec = state.videoNoteRecorder.seconds;
      const m = String(Math.floor(sec / 60)).padStart(2, "0");
      const s = String(sec % 60).padStart(2, "0");
      document.getElementById("videoNoteTimer").textContent = `${m}:${s} / 01:00`;
      const ringEl = document.getElementById("videoNoteProgressRing");
      if (ringEl) {
        const maxOffset = 289.02;
        const progress = Math.min(1, sec / 60);
        ringEl.style.strokeDashoffset = String(maxOffset - (progress * maxOffset));
      }
      if (sec >= 60) {
        stopAndSendVideoNote();
      }
    }, 1000);
  } catch (err) {
    closeVideoNoteModal();
    showToast("Нет доступа к камере или микрофону");
  }
}

async function switchVideoNoteCamera() {
  state.videoNoteRecorder.facingMode = state.videoNoteRecorder.facingMode === "user" ? "environment" : "user";
  clearInterval(state.videoNoteRecorder.timerInterval);
  if (state.videoNoteRecorder.mediaRecorder && state.videoNoteRecorder.mediaRecorder.state !== "inactive") {
    state.videoNoteRecorder.mediaRecorder.stop();
  }
  await initVideoNoteStream();
}

function closeVideoNoteModal() {
  clearInterval(state.videoNoteRecorder.timerInterval);
  if (state.videoNoteRecorder.mediaRecorder && state.videoNoteRecorder.mediaRecorder.state !== "inactive") {
    try { state.videoNoteRecorder.mediaRecorder.stop(); } catch (e) {}
  }
  if (state.videoNoteRecorder.stream) {
    state.videoNoteRecorder.stream.getTracks().forEach(t => t.stop());
    state.videoNoteRecorder.stream = null;
  }
  const videoEl = document.getElementById("videoNotePreview");
  if (videoEl) videoEl.srcObject = null;
  state.videoNoteRecorder.chunks = [];
  state.videoNoteRecorder.seconds = 0;
  document.getElementById("videoNoteModal").classList.add("hidden");
}

function cancelVideoNoteRecording() {
  closeVideoNoteModal();
}

async function stopAndSendVideoNote() {
  const rec = state.videoNoteRecorder.mediaRecorder;
  if (!rec) {
    closeVideoNoteModal();
    return;
  }

  const duration = Math.max(1, state.videoNoteRecorder.seconds);
  clearInterval(state.videoNoteRecorder.timerInterval);

  if (state.videoNoteRecorder.stream) {
    state.videoNoteRecorder.stream.getTracks().forEach(t => t.stop());
    state.videoNoteRecorder.stream = null;
  }
  const videoEl = document.getElementById("videoNotePreview");
  if (videoEl) videoEl.srcObject = null;
  document.getElementById("videoNoteModal").classList.add("hidden");

  let recordedBlob = null;
  if (rec.state !== "inactive") {
    const blobPromise = new Promise((resolve) => {
      rec.addEventListener("stop", () => {
        const mime = rec.mimeType || "video/webm";
        const b = state.videoNoteRecorder.chunks.length > 0
          ? new Blob(state.videoNoteRecorder.chunks, { type: mime })
          : null;
        resolve(b);
      }, { once: true });
    });
    try { rec.requestData(); } catch (e) {}
    try { rec.stop(); } catch (e) {}
    recordedBlob = await blobPromise;
  } else if (state.videoNoteRecorder.chunks.length > 0) {
    const mime = rec.mimeType || "video/webm";
    recordedBlob = new Blob(state.videoNoteRecorder.chunks, { type: mime });
  }

  state.videoNoteRecorder.chunks = [];
  state.videoNoteRecorder.seconds = 0;
  state.videoNoteRecorder.mediaRecorder = null;

  if (!recordedBlob || recordedBlob.size === 0) {
    showToast("Не удалось записать кружочек");
    return;
  }

  const localUrl = URL.createObjectURL(recordedBlob);
  const tempId = "temp_" + Date.now();
  const timeStr = getClientTimeStr();

  const replyToId = state.replyingTo ? state.replyingTo.id : null;
  const replyObj = state.replyingTo ? { ...state.replyingTo } : null;
  cancelReply();

  const optimisticMsg = {
    id: tempId,
    sender_id: state.user.id,
    receiver_id: state.activeFriend ? state.activeFriend.id : null,
    group_id: state.activeGroup ? state.activeGroup.id : null,
    content: "Видео-кружочек",
    timestamp: timeStr,
    is_read: false,
    msg_type: "video_note",
    media_url: localUrl,
    duration: duration,
    file_name: "",
    file_size: recordedBlob.size,
    is_edited: false,
    is_pinned: false,
    reactions: [],
    reply_to: replyObj
  };

  appendMessage(optimisticMsg);
  scrollToBottom();
  playNotificationSound();
  updateFriendLastMessage(optimisticMsg);

  try {
    const isMp4 = Boolean(recordedBlob.type && recordedBlob.type.includes("mp4"));
    const ext = isMp4 ? ".mp4" : ".webm";
    const formData = new FormData();
    formData.append("file", recordedBlob, `video_note_${Date.now()}${ext}`);

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${state.token}`
      },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Ошибка загрузки кружочка");
      return;
    }

    const finalUrl = data.url || localUrl;
    const wrap = document.getElementById(`msg-wrap-${tempId}`);
    if (wrap) {
      const v = wrap.querySelector("video");
      if (v) v.src = finalUrl;
    }

    const payload = {
      receiver_id: state.activeFriend ? state.activeFriend.id : null,
      group_id: state.activeGroup ? state.activeGroup.id : null,
      content: "Видео-кружочек",
      timestamp: timeStr,
      msg_type: "video_note",
      media_url: finalUrl,
      duration: duration,
      file_name: "",
      file_size: data.file_size || recordedBlob.size,
      reply_to_id: replyToId,
      temp_id: tempId
    };

    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: "message", ...payload }));
    } else {
      const sendRes = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${state.token}`
        },
        body: JSON.stringify(payload)
      });
      if (sendRes.ok) {
        const msg = await sendRes.json();
        reconcileTempMessage(tempId, msg.id);
      }
    }
  } catch (err) {
    showToast("Ошибка отправки кружочка");
  }
}

function toggleVideoNotePlay(container) {
  const video = container.querySelector("video");
  const playIcon = container.querySelector(".video-note-play-icon");
  if (!video) return;
  if (video.paused) {
    document.querySelectorAll(".video-note-bubble video").forEach(v => {
      if (v !== video && !v.paused) {
        v.pause();
        const icon = v.parentElement.querySelector(".video-note-play-icon");
        if (icon) icon.style.opacity = "1";
      }
    });
    video.muted = false;
    video.play();
    if (playIcon) playIcon.style.opacity = "0";
  } else {
    video.pause();
    if (playIcon) playIcon.style.opacity = "1";
  }
}

async function sendSticker(stickerText) {
  closeEmojiPicker();
  if (!state.activeFriend && !state.activeGroup) return;
  const replyToId = state.replyingTo ? state.replyingTo.id : null;
  const replyObj = state.replyingTo ? { ...state.replyingTo } : null;
  cancelReply();

  const tempId = "temp_" + Date.now();
  const timeStr = getClientTimeStr();

  const optimisticMsg = {
    id: tempId,
    sender_id: state.user.id,
    receiver_id: state.activeFriend ? state.activeFriend.id : null,
    group_id: state.activeGroup ? state.activeGroup.id : null,
    content: stickerText,
    timestamp: timeStr,
    is_read: false,
    msg_type: "sticker",
    media_url: "",
    duration: 0,
    is_edited: false,
    is_pinned: false,
    reactions: [],
    reply_to: replyObj
  };

  appendMessage(optimisticMsg);
  scrollToBottom();
  playNotificationSound();
  updateFriendLastMessage(optimisticMsg);

  const payload = {
    receiver_id: state.activeFriend ? state.activeFriend.id : null,
    group_id: state.activeGroup ? state.activeGroup.id : null,
    content: stickerText,
    timestamp: timeStr,
    msg_type: "sticker",
    reply_to_id: replyToId,
    temp_id: tempId
  };

  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: "message", ...payload }));
  } else {
    fetch("/api/messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${state.token}`
      },
      body: JSON.stringify(payload)
    }).then(r => r.json()).then(m => reconcileTempMessage(tempId, m.id)).catch(() => {});
  }
}

async function sendGif(gifUrl) {
  closeEmojiPicker();
  if (!state.activeFriend && !state.activeGroup) return;
  const replyToId = state.replyingTo ? state.replyingTo.id : null;
  const replyObj = state.replyingTo ? { ...state.replyingTo } : null;
  cancelReply();

  const tempId = "temp_" + Date.now();
  const timeStr = getClientTimeStr();

  const optimisticMsg = {
    id: tempId,
    sender_id: state.user.id,
    receiver_id: state.activeFriend ? state.activeFriend.id : null,
    group_id: state.activeGroup ? state.activeGroup.id : null,
    content: "",
    timestamp: timeStr,
    is_read: false,
    msg_type: "image",
    media_url: gifUrl,
    duration: 0,
    is_edited: false,
    is_pinned: false,
    reactions: [],
    reply_to: replyObj
  };

  appendMessage(optimisticMsg);
  scrollToBottom();
  playNotificationSound();
  updateFriendLastMessage(optimisticMsg);

  const payload = {
    receiver_id: state.activeFriend ? state.activeFriend.id : null,
    group_id: state.activeGroup ? state.activeGroup.id : null,
    content: "",
    timestamp: timeStr,
    msg_type: "image",
    media_url: gifUrl,
    reply_to_id: replyToId,
    temp_id: tempId
  };

  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: "message", ...payload }));
  } else {
    fetch("/api/messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${state.token}`
      },
      body: JSON.stringify(payload)
    }).then(r => r.json()).then(m => reconcileTempMessage(tempId, m.id)).catch(() => {});
  }
}

function handleVoiceTouchMove(event) {
  if (!state.voiceRecorder.mediaRecorder || state.voiceLock.isLocked) return;
  if (!event.touches || !event.touches[0]) return;
  const currentY = event.touches[0].clientY;
  const dy = currentY - state.voiceLock.startY;
  if (dy < -38) {
    lockVoiceRecording();
  }
}

function lockVoiceRecording() {
  state.voiceLock.isLocked = true;
  const lockInd = document.getElementById("voiceLockIndicator");
  if (lockInd) lockInd.classList.add("hidden");
  const sendLockedBtn = document.getElementById("recSendLockedBtn");
  if (sendLockedBtn) sendLockedBtn.classList.remove("hidden");
  if (navigator.vibrate) navigator.vibrate(30);
}

function sendLockedVoiceRecording() {
  state.voiceLock.isLocked = false;
  const sendLockedBtn = document.getElementById("recSendLockedBtn");
  if (sendLockedBtn) sendLockedBtn.classList.add("hidden");
  stopVoiceRecording();
}

async function startVoiceRecording(event) {
  if (event && event.type === "touchstart") {
    if (event.touches && event.touches[0]) {
      state.voiceLock.startY = event.touches[0].clientY;
      const lockInd = document.getElementById("voiceLockIndicator");
      if (lockInd) lockInd.classList.remove("hidden");
    }
  }
  state.voiceLock.isLocked = false;
  if (event && event.cancelable) event.preventDefault();
  if (state.voiceRecorder.mediaRecorder) return;

  try {
    const audioConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: { ideal: 48000 },
        sampleSize: { ideal: 16 }
      }
    };
    const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
    state.voiceRecorder.stream = stream;
    state.voiceRecorder.chunks = [];

    const mimeCandidates = [
      "audio/webm;codecs=opus",
      "audio/ogg;codecs=opus",
      "audio/mp4",
      "audio/webm"
    ];
    let selectedMime = "";
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported) {
      for (const m of mimeCandidates) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }
    }

    let mediaRecorder;
    const recorderOptions = {
      audioBitsPerSecond: 160000
    };
    if (selectedMime) {
      recorderOptions.mimeType = selectedMime;
    }

    try {
      mediaRecorder = new MediaRecorder(stream, recorderOptions);
    } catch (e) {
      try {
        mediaRecorder = selectedMime ? new MediaRecorder(stream, { mimeType: selectedMime }) : new MediaRecorder(stream);
      } catch (e2) {
        mediaRecorder = new MediaRecorder(stream);
      }
    }
    state.voiceRecorder.mediaRecorder = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        state.voiceRecorder.chunks.push(e.data);
      }
    };

    mediaRecorder.start(100);
    state.voiceRecorder.seconds = 0;

    const recBtn = document.getElementById("recordVoiceBtn");
    if (recBtn) recBtn.classList.add("recording");

    const ind = document.getElementById("recordingIndicator");
    const timer = document.getElementById("recordingTimer");
    ind.classList.remove("hidden");
    timer.textContent = "00:00";

    clearInterval(state.voiceRecorder.timerInterval);
    state.voiceRecorder.timerInterval = setInterval(() => {
      state.voiceRecorder.seconds++;
      const m = String(Math.floor(state.voiceRecorder.seconds / 60)).padStart(2, "0");
      const s = String(state.voiceRecorder.seconds % 60).padStart(2, "0");
      timer.textContent = `${m}:${s}`;
    }, 1000);
  } catch (err) {
    const recBtn = document.getElementById("recordVoiceBtn");
    if (recBtn) recBtn.classList.remove("recording");
    const lockInd = document.getElementById("voiceLockIndicator");
    if (lockInd) lockInd.classList.add("hidden");
    showToast("Нет доступа к микрофону");
  }
}

async function stopVoiceRecording(event) {
  if (state.voiceLock.isLocked) return;
  const lockInd = document.getElementById("voiceLockIndicator");
  if (lockInd) lockInd.classList.add("hidden");
  if (event && event.cancelable) event.preventDefault();
  const recBtn = document.getElementById("recordVoiceBtn");
  if (recBtn) recBtn.classList.remove("recording");
  const rec = state.voiceRecorder.mediaRecorder;
  if (!rec || rec.state === "inactive") return;

  clearInterval(state.voiceRecorder.timerInterval);
  document.getElementById("recordingIndicator").classList.add("hidden");

  const duration = Math.max(1, state.voiceRecorder.seconds);

  rec.onstop = async () => {
    if (state.voiceRecorder.stream) {
      state.voiceRecorder.stream.getTracks().forEach(t => t.stop());
      state.voiceRecorder.stream = null;
    }
    state.voiceRecorder.mediaRecorder = null;

    if (state.voiceRecorder.chunks.length === 0) return;
    const mime = rec.mimeType || "audio/webm";
    const blob = new Blob(state.voiceRecorder.chunks, { type: mime });
    state.voiceRecorder.chunks = [];

    const localUrl = URL.createObjectURL(blob);
    await sendVoiceMessage(blob, localUrl, duration);
  };

  rec.stop();
}

function cancelVoiceRecording() {
  state.voiceLock.isLocked = false;
  const lockInd = document.getElementById("voiceLockIndicator");
  if (lockInd) lockInd.classList.add("hidden");
  const sendLockedBtn = document.getElementById("recSendLockedBtn");
  if (sendLockedBtn) sendLockedBtn.classList.add("hidden");

  const recBtn = document.getElementById("recordVoiceBtn");
  if (recBtn) recBtn.classList.remove("recording");
  clearInterval(state.voiceRecorder.timerInterval);
  document.getElementById("recordingIndicator").classList.add("hidden");

  if (state.voiceRecorder.mediaRecorder) {
    state.voiceRecorder.mediaRecorder.onstop = null;
    try {
      state.voiceRecorder.mediaRecorder.stop();
    } catch (e) {}
    state.voiceRecorder.mediaRecorder = null;
  }
  if (state.voiceRecorder.stream) {
    state.voiceRecorder.stream.getTracks().forEach(t => t.stop());
    state.voiceRecorder.stream = null;
  }
  state.voiceRecorder.chunks = [];
}

async function sendVoiceMessage(audioBlob, localUrl, duration) {
  if (!state.activeFriend && !state.activeGroup) return;
  const replyToId = state.replyingTo ? state.replyingTo.id : null;
  const replyObj = state.replyingTo ? { ...state.replyingTo } : null;
  cancelReply();

  const tempId = "temp_" + Date.now();
  const timeStr = getClientTimeStr();

  const optimisticMsg = {
    id: tempId,
    sender_id: state.user.id,
    receiver_id: state.activeFriend ? state.activeFriend.id : null,
    group_id: state.activeGroup ? state.activeGroup.id : null,
    content: "Голосовое сообщение",
    timestamp: timeStr,
    is_read: false,
    msg_type: "voice",
    media_url: localUrl,
    duration: duration,
    file_name: "",
    file_size: audioBlob.size || 0,
    is_edited: false,
    is_pinned: false,
    reactions: [],
    reply_to: replyObj
  };

  appendMessage(optimisticMsg);
  scrollToBottom();
  playNotificationSound();
  updateFriendLastMessage(optimisticMsg);

  try {
    const formData = new FormData();
    const ext = audioBlob.type && audioBlob.type.includes("mp4") ? ".mp4" : ".weba";
    formData.append("file", audioBlob, `voice_${Date.now()}${ext}`);

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${state.token}`
      },
      body: formData
    });
    const data = await res.json();
    const finalUrl = (res.ok && data.url) ? data.url : localUrl;

    const wrap = document.getElementById(`msg-wrap-${tempId}`);
    if (wrap) {
      const pBtn = wrap.querySelector(".voice-play-btn");
      if (pBtn) pBtn.dataset.audioUrl = finalUrl;
    } else {
      const btn = document.getElementById(`voice-play-${tempId}`);
      if (btn) btn.dataset.audioUrl = finalUrl;
    }

    const payload = {
      receiver_id: state.activeFriend ? state.activeFriend.id : null,
      group_id: state.activeGroup ? state.activeGroup.id : null,
      content: "Голосовое сообщение",
      timestamp: timeStr,
      msg_type: "voice",
      media_url: finalUrl,
      duration: duration,
      file_name: "",
      file_size: audioBlob.size || 0,
      reply_to_id: replyToId,
      temp_id: tempId
    };

    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: "message", ...payload }));
    } else {
      const sendRes = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${state.token}`
        },
        body: JSON.stringify(payload)
      });
      if (sendRes.ok) {
        const msg = await sendRes.json();
        reconcileTempMessage(tempId, msg.id);
      }
    }
  } catch (err) {
    showToast("Ошибка отправки голосового сообщения");
  }
}

function togglePlayVoice(msgId, btnEl, audioUrlParam, durationSecParam) {
  const btn = (btnEl instanceof HTMLElement) ? btnEl : document.getElementById(`voice-play-${msgId}`);
  const audioUrl = (btn && btn.dataset.audioUrl) || audioUrlParam;
  const durationSec = (btn && btn.dataset.duration) ? parseFloat(btn.dataset.duration) : (durationSecParam || 0);

  if (!audioUrl) return;

  if (state.activeAudio && String(state.activeAudio.msgId) === String(msgId)) {
    if (state.activeAudio.audio.paused) {
      const p = state.activeAudio.audio.play();
      if (p !== undefined) p.catch(() => {});
      if (btn) {
        btn.innerHTML = VOICE_PAUSE_ICON;
        btn.classList.add("playing");
      }
    } else {
      state.activeAudio.audio.pause();
      if (btn) {
        btn.innerHTML = VOICE_PLAY_ICON;
        btn.classList.remove("playing");
      }
    }
    return;
  }

  if (state.activeAudio) {
    try {
      state.activeAudio.audio.pause();
    } catch (e) {}
    const prevBtn = document.getElementById(`voice-play-${state.activeAudio.msgId}`);
    if (prevBtn) {
      prevBtn.innerHTML = VOICE_PLAY_ICON;
      prevBtn.classList.remove("playing");
    }
  }

  const audio = new Audio();
  audio.preload = "auto";
  audio.src = audioUrl;
  audio.playbackRate = 1.0;

  state.activeAudio = {
    msgId: msgId,
    audio: audio,
    speed: 1.0
  };

  if (btn) {
    btn.innerHTML = VOICE_PAUSE_ICON;
    btn.classList.add("playing");
  }

  audio.ontimeupdate = () => {
    const cur = Math.floor(audio.currentTime);
    const m = Math.floor(cur / 60);
    const s = String(cur % 60).padStart(2, "0");
    const activeId = state.activeAudio ? state.activeAudio.msgId : msgId;
    const label = document.getElementById(`voice-time-${activeId}`);
    if (label) label.textContent = `${m}:${s}`;

    const bars = document.querySelectorAll(`#voice-bars-${activeId} .voice-wave-bar`);
    const progress = audio.currentTime / (audio.duration || durationSec || 1);
    const playedCount = Math.floor(progress * bars.length);
    bars.forEach((bar, idx) => {
      bar.classList.toggle("played", idx <= playedCount);
    });
  };

  audio.onerror = () => {
    if (btn) {
      btn.innerHTML = VOICE_PLAY_ICON;
      btn.classList.remove("playing");
    }
    state.activeAudio = null;
    const err = audio.error;
    let msg = "неизвестно";
    if (err) {
      if (err.code === 1) msg = "Прервано";
      if (err.code === 2) msg = "Сеть";
      if (err.code === 3) msg = "Декодирование";
      if (err.code === 4) msg = "Не поддерживается";
    }
    showToast("Ошибка файла: " + msg);
  };

  audio.onended = () => {
    const activeId = state.activeAudio ? state.activeAudio.msgId : msgId;
    const curBtn = document.getElementById(`voice-play-${activeId}`);
    if (curBtn) {
      curBtn.innerHTML = VOICE_PLAY_ICON;
      curBtn.classList.remove("playing");
    }
    const bars = document.querySelectorAll(`#voice-bars-${activeId} .voice-wave-bar`);
    bars.forEach(bar => bar.classList.remove("played"));
    const m = Math.floor((durationSec || 0) / 60);
    const s = String((durationSec || 0) % 60).padStart(2, "0");
    const label = document.getElementById(`voice-time-${activeId}`);
    if (label) label.textContent = `${m}:${s}`;
    state.activeAudio = null;
  };

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch((err) => {
      if (err.name === "AbortError") return;
      if (btn) {
        btn.innerHTML = VOICE_PLAY_ICON;
        btn.classList.remove("playing");
      }
      state.activeAudio = null;
      showToast("Ошибка аудио: " + (err.message || err.name || "неизвестно"));
    });
  }
}

function changeVoiceSpeed(msgId) {
  if (!state.activeAudio || String(state.activeAudio.msgId) !== String(msgId)) return;
  const speeds = [1.0, 1.5, 2.0];
  const nextIdx = (speeds.indexOf(state.activeAudio.speed) + 1) % speeds.length;
  state.activeAudio.speed = speeds[nextIdx];
  state.activeAudio.audio.playbackRate = state.activeAudio.speed;
  const badge = document.getElementById(`voice-speed-${msgId}`);
  if (badge) badge.textContent = `${state.activeAudio.speed}x`;
}

function toggleChatSearch() {
  const box = document.getElementById("chatSearchBox");
  box.classList.toggle("hidden");
  if (!box.classList.contains("hidden")) {
    const input = document.getElementById("chatSearchInput");
    input.focus();
    input.value = "";
    document.getElementById("chatSearchCount").textContent = "";
  } else {
    clearChatSearchHighlights();
  }
}

function onSearchMessages() {
  const query = document.getElementById("chatSearchInput").value.trim().toLowerCase();
  const countEl = document.getElementById("chatSearchCount");

  if (!query) {
    countEl.textContent = "";
    clearChatSearchHighlights();
    return;
  }

  const wrappers = document.querySelectorAll(".message-bubble-wrapper");
  let found = 0;
  let firstEl = null;

  wrappers.forEach((w) => {
    const textEl = w.querySelector(".message-text");
    if (!textEl) return;
    const txt = textEl.textContent.toLowerCase();
    if (txt.includes(query)) {
      found++;
      w.style.opacity = "1";
      textEl.style.backgroundColor = "rgba(245, 158, 11, 0.35)";
      if (!firstEl) firstEl = w;
    } else {
      w.style.opacity = "0.35";
      textEl.style.backgroundColor = "transparent";
    }
  });

  countEl.textContent = `${found} найдено`;
  if (firstEl) {
    firstEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function clearChatSearchHighlights() {
  const wrappers = document.querySelectorAll(".message-bubble-wrapper");
  wrappers.forEach((w) => {
    w.style.opacity = "1";
    const textEl = w.querySelector(".message-text");
    if (textEl) textEl.style.backgroundColor = "transparent";
  });
}

const messageInputEl = document.getElementById("messageInput");
messageInputEl.addEventListener("input", () => {
  updateChatInputState();
  if (!state.activeFriend || !state.ws || state.ws.readyState !== WebSocket.OPEN) return;
  state.ws.send(JSON.stringify({
    type: "typing",
    receiver_id: state.activeFriend.id
  }));
});
messageInputEl.addEventListener("change", updateChatInputState);
messageInputEl.addEventListener("keyup", updateChatInputState);
messageInputEl.addEventListener("paste", () => setTimeout(updateChatInputState, 20));
updateChatInputState();

messageInputEl.addEventListener("focus", () => {
  setTimeout(() => {
    window.scrollTo(0, 0);
    setAppHeight();
    scrollToBottom();
  }, 60);
  setTimeout(() => {
    window.scrollTo(0, 0);
    setAppHeight();
    scrollToBottom();
  }, 260);
  setTimeout(() => {
    window.scrollTo(0, 0);
    setAppHeight();
    scrollToBottom();
  }, 450);
});

messageInputEl.addEventListener("click", () => {
  setTimeout(() => {
    window.scrollTo(0, 0);
    setAppHeight();
    scrollToBottom();
  }, 100);
});

const messagesContainerEl = document.getElementById("messagesContainer");
if (messagesContainerEl) {
  messagesContainerEl.addEventListener("touchstart", () => {
    if (document.activeElement === messageInputEl) {
      messageInputEl.blur();
    }
  }, { passive: true });
}

function showTypingIndicator() {
  const el = document.getElementById("typingIndicator");
  el.classList.remove("hidden");
  clearTimeout(state.typingTimer);
  state.typingTimer = setTimeout(() => {
    el.classList.add("hidden");
  }, 2000);
}

function updateFriendLastMessage(msg) {
  if (msg.group_id) return;
  const friendId = Number(msg.sender_id) === Number(state.user.id) ? Number(msg.receiver_id) : Number(msg.sender_id);
  const friend = state.friends.find(f => Number(f.id) === friendId);
  const lastTxt = msg.msg_type === "image" ? "📷 Фото" : (msg.msg_type === "voice" ? "🎙️ Голосовое" : (msg.msg_type === "sticker" ? "🐔 Стикер" : (msg.msg_type === "video_note" ? "📹 Кружочек" : (msg.msg_type === "file" ? `📁 ${msg.file_name || "Файл"}` : msg.content))));

  const tStr = formatMessageTime(msg.timestamp);

  if (friend) {
    friend.last_message = lastTxt;
    friend.last_time = tStr;
    if (Number(msg.sender_id) !== Number(state.user.id) && (!state.activeFriend || Number(state.activeFriend.id) !== friendId)) {
      friend.unread_count = (friend.unread_count || 0) + 1;
    }
    state.friends.sort((a, b) => (b.last_time || "").localeCompare(a.last_time || ""));
    renderFriendsList();
  } else {
    state.friends.unshift({
      id: friendId,
      username: msg.sender_username || "Кент",
      user_code: "",
      avatar_color: msg.sender_color || "#f59e0b",
      avatar_url: msg.sender_avatar || "",
      bio: "",
      last_message: lastTxt,
      last_time: tStr,
      unread_count: Number(msg.sender_id) !== Number(state.user.id) ? 1 : 0,
      is_online: true,
      status_text: "в сети"
    });
    renderFriendsList();
    loadFriends();
  }
}

function updateFriendPresence(userId, isOnline, statusText) {
  const friend = state.friends.find(f => f.id === userId);
  if (friend) {
    friend.is_online = isOnline;
    if (statusText) friend.status_text = statusText;
    renderFriendsList();
    if (state.activeFriend && state.activeFriend.id === userId) {
      const statusEl = document.getElementById("targetStatus");
      statusEl.textContent = statusText || (isOnline ? "в сети" : "был(а) недавно");
      statusEl.className = `target-status ${isOnline ? "online" : ""}`;
      const ind = document.getElementById("targetStatusIndicator");
      if (ind) ind.className = `status-indicator ${isOnline ? "online" : "offline"}`;
    }
  }
}

function openAddFriendModal() {
  const modal = document.getElementById("addFriendModal");
  if (modal) modal.classList.remove("hidden");
  const input = document.getElementById("addFriendInput");
  if (input) {
    input.value = "";
    setTimeout(() => input.focus(), 50);
  }
  const errEl = document.getElementById("addFriendError");
  if (errEl) errEl.classList.add("hidden");
  const succEl = document.getElementById("addFriendSuccess");
  if (succEl) succEl.classList.add("hidden");
}

function closeAddFriendModal() {
  const modal = document.getElementById("addFriendModal");
  if (modal) modal.classList.add("hidden");
}

async function handleAddFriend(event) {
  event.preventDefault();
  const input = document.getElementById("addFriendInput");
  const query = input ? input.value.trim() : "";
  const errEl = document.getElementById("addFriendError");
  const succEl = document.getElementById("addFriendSuccess");
  if (errEl) errEl.classList.add("hidden");
  if (succEl) succEl.classList.add("hidden");

  try {
    const res = await fetch("/api/friends/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${state.token}`
      },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    if (!res.ok) {
      if (errEl) {
        errEl.textContent = data.detail || "Не удалось добавить кента";
        errEl.classList.remove("hidden");
      }
      return;
    }

    if (data.friend) {
      if (succEl) {
        succEl.textContent = data.message || `Кент ${data.friend.username} добавлен!`;
        succEl.classList.remove("hidden");
      }
      const exists = state.friends.some(f => Number(f.id) === Number(data.friend.id));
      if (!exists) {
        state.friends.unshift(data.friend);
        renderFriendsList();
      }
      showToast(`🤝 Кент ${data.friend.username} добавлен в друзья!`);
      setTimeout(() => {
        closeAddFriendModal();
        selectFriend(data.friend);
      }, 500);
    }
  } catch (e) {
    if (errEl) {
      errEl.textContent = "Ошибка сети";
      errEl.classList.remove("hidden");
    }
  }
}

function copyMyCode() {
  if (!state.user) return;
  navigator.clipboard.writeText(state.user.user_code).then(() => {
    showToast(`Твой код ${state.user.user_code} скопирован в буфер!`);
  }).catch(() => {
    showToast(`Твой код: ${state.user.user_code}`);
  });
}

function showToast(text) {
  const toast = document.getElementById("toast");
  toast.textContent = text;
  toast.classList.remove("hidden");
  setTimeout(() => {
    toast.classList.add("hidden");
  }, 2500);
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatMessageText(text) {
  if (!text) return "";
  let escaped = escapeHtml(text);

  escaped = escaped.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre class="chat-code-block"><div class="code-block-header"><span>${lang || "код"}</span><button type="button" class="copy-code-btn" onclick="copyCodeText(this)">Копировать</button></div><code>${code.trim()}</code></pre>`;
  });

  escaped = escaped.replace(/`([^`\n]+)`/g, '<code class="chat-inline-code">$1</code>');
  escaped = escaped.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  escaped = escaped.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="chat-text-link">$1</a>');
  escaped = escaped.replace(/\n/g, '<br>');

  return escaped;
}

function copyCodeText(btn) {
  const codeEl = btn.closest(".chat-code-block")?.querySelector("code");
  if (codeEl) {
    navigator.clipboard.writeText(codeEl.textContent).then(() => {
      const orig = btn.textContent;
      btn.textContent = "Скопировано!";
      setTimeout(() => { btn.textContent = orig; }, 1500);
    }).catch(() => {});
  }
}

function getClientTimeStr() {
  const now = new Date();
  return String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
}

function formatMessageTime(raw) {
  if (!raw) return getClientTimeStr();
  const s = String(raw).trim();
  if (s.includes("T")) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    }
  }
  const m = s.match(/\b(\d{1,2}:\d{2})\b/);
  if (m) return m[1];
  return s;
}

function checkAndPromptNotifications() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted" || Notification.permission === "denied") return;
  const dismissed = sessionStorage.getItem("chicken_notif_prompt_dismissed");
  if (dismissed) return;
  setTimeout(() => {
    openNotificationPromptModal();
  }, 650);
}

function openNotificationPromptModal() {
  const modal = document.getElementById("notificationPromptModal");
  if (modal) modal.classList.remove("hidden");
}

function closeNotificationPromptModal() {
  const modal = document.getElementById("notificationPromptModal");
  if (modal) modal.classList.add("hidden");
}

function dismissNotificationPrompt() {
  closeNotificationPromptModal();
  sessionStorage.setItem("chicken_notif_prompt_dismissed", "1");
}

async function requestNotificationPermission() {
  closeNotificationPromptModal();
  if (!("Notification" in window)) {
    showToast("Браузер не поддерживает системные уведомления");
    return;
  }
  try {
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      showToast("Уведомления успешно включены! 🎉");
      sendTestNotification();
    } else if (perm === "denied") {
      showToast("Уведомления отклонены в настройках браузера");
    }
  } catch (e) {
    Notification.requestPermission((perm) => {
      if (perm === "granted") {
        showToast("Уведомления успешно включены! 🎉");
        sendTestNotification();
      }
    });
  }
  updateNotifSettingsToggle();
  if (Notification.permission === "granted") {
    registerWebPush();
  }
}

async function registerWebPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (!state.token) return;
  try {
    const keyRes = await fetch("/api/push/vapid-public-key");
    if (!keyRes.ok) return;
    const { public_key } = await keyRes.json();
    if (!public_key) return;

    let reg = await navigator.serviceWorker.getRegistration("/");
    if (!reg) {
      reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }
    const activeReg = reg || await navigator.serviceWorker.ready;
    let sub = await activeReg.pushManager.getSubscription();
    if (!sub) {
      const rawKey = public_key.replace(/-/g, "+").replace(/_/g, "/");
      const padding = "=".repeat((4 - rawKey.length % 4) % 4);
      const rawBytes = atob(rawKey + padding);
      const uint8 = new Uint8Array(rawBytes.length);
      for (let i = 0; i < rawBytes.length; i++) uint8[i] = rawBytes.charCodeAt(i);
      sub = await activeReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: uint8
      });
    }
    if (sub) {
      const subJson = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${state.token}`
        },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth
        })
      });
    }
  } catch (e) {
    console.warn("[Push] register error", e);
  }
}

async function sendTestNotification() {
  const title = "ChickenMax";
  const options = {
    body: "Уведомления успешно подключены!",
    icon: "/static/icon-192.png",
    badge: "/static/icon-192.png",
    tag: "test_notification"
  };

  if ("serviceWorker" in navigator) {
    try {
      const reg = (await navigator.serviceWorker.getRegistration("/")) || (await navigator.serviceWorker.ready);
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
      }
    } catch (e) {
      try { new Notification(title, options); } catch (err) {}
    }
  } else {
    try { new Notification(title, options); } catch (err) {}
  }

  if (state.token) {
    try {
      await fetch("/api/push/test", {
        method: "POST",
        headers: { "Authorization": `Bearer ${state.token}` }
      });
    } catch (e) {}
  }
}

function updateNotifSettingsToggle() {
  const t = document.getElementById("notifToggle");
  if (!t) return;
  if (!("Notification" in window)) {
    t.disabled = true;
    t.checked = false;
    return;
  }
  t.checked = Notification.permission === "granted";
}

async function toggleNotificationsFromSettings() {
  const t = document.getElementById("notifToggle");
  if (!t) return;
  if (t.checked) {
    await requestNotificationPermission();
  } else {
    showToast("Отключить уведомления можно в настройках сайта в браузере");
    t.checked = Notification.permission === "granted";
  }
}

async function showSystemNotification(msg) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const isChatActive = !document.hidden && document.hasFocus() && (
    (msg.group_id && state.activeGroup && Number(state.activeGroup.id) === Number(msg.group_id)) ||
    (!msg.group_id && state.activeFriend && Number(state.activeFriend.id) === Number(msg.sender_id))
  );

  if (isChatActive) return;

  const senderName = msg.sender_username || "Новое сообщение";
  let bodyText = "";

  if (msg.msg_type === "image") {
    bodyText = msg.content ? `📷 Фото: ${msg.content}` : "📷 Фотография";
  } else if (msg.msg_type === "voice") {
    bodyText = "🎙️ Голосовое сообщение";
  } else if (msg.msg_type === "video_note") {
    bodyText = "📹 Видео-кружочек";
  } else if (msg.msg_type === "file") {
    bodyText = `📁 Файл: ${msg.file_name || "документ"}`;
  } else if (msg.msg_type === "sticker") {
    bodyText = `🐔 Стикер ${msg.content || ""}`;
  } else if (msg.msg_type === "encrypted") {
    bodyText = "🔒 Зашифрованное сообщение";
  } else {
    bodyText = msg.content || "Новое сообщение";
  }

  const title = msg.group_id ? `Группа (${senderName})` : senderName;
  const options = {
    body: bodyText,
    icon: msg.sender_avatar || "/static/icon-192.png",
    badge: "/static/icon-192.png",
    tag: `chat_${msg.group_id ? 'group_' + msg.group_id : msg.sender_id}`,
    renotify: true,
    vibrate: [150, 70, 150],
    data: {
      url: "/",
      sender_id: msg.sender_id,
      group_id: msg.group_id
    }
  };

  if ("serviceWorker" in navigator) {
    try {
      const reg = (await navigator.serviceWorker.getRegistration("/")) || (await navigator.serviceWorker.ready);
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        return;
      }
    } catch (e) {}
  }
  try {
    new Notification(title, options);
  } catch (e) {}
}

async function showCallNotification(callerName) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const title = "Входящий звонок";
  const options = {
    body: `📞 Вам звонит ${callerName || "Кент"}`,
    icon: "/static/icon-192.png",
    badge: "/static/icon-192.png",
    tag: "incoming_call",
    renotify: true,
    vibrate: [300, 200, 300, 200, 500],
    requireInteraction: true,
    data: { url: "/" }
  };
  if ("serviceWorker" in navigator) {
    try {
      const reg = (await navigator.serviceWorker.getRegistration("/")) || (await navigator.serviceWorker.ready);
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        return;
      }
    } catch (e) {}
  }
  try {
    new Notification(title, options);
  } catch (e) {}
}

async function dismissCallNotification() {
  if (!("Notification" in window)) return;
  if ("serviceWorker" in navigator) {
    try {
      const reg = (await navigator.serviceWorker.getRegistration("/")) || (await navigator.serviceWorker.ready);
      if (reg && reg.getNotifications) {
        const ns = await reg.getNotifications({ tag: "incoming_call" });
        ns.forEach(n => n.close());
      }
    } catch (e) {}
  }
}

window.addEventListener("paste", (event) => {
  const items = (event.clipboardData || event.originalEvent.clipboardData).items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") !== -1) {
      const file = items[i].getAsFile();
      if (file) {
        sendImageFile(file);
        event.preventDefault();
        break;
      }
    }
  }
});

const dropTarget = document.getElementById("appScreen");
if (dropTarget) {
  dropTarget.addEventListener("dragover", (e) => e.preventDefault());
  dropTarget.addEventListener("drop", (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        sendImageFile(file);
      } else {
        sendGeneralFile(file);
      }
    }
  });
}

window.addEventListener("click", (e) => {
  if (!e.target.closest("#attachMenu") && !e.target.closest("#attachBtn")) {
    closeAttachMenu();
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (state.replyingTo) cancelReply();
    if (state.editingMsg) cancelEditMessage();
    closeLightbox();
    closeAttachMenu();
    closeVideoNoteModal();
  }
});

window.addEventListener("DOMContentLoaded", checkAuth);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((reg) => {
    reg.update().catch(() => {});
  }).catch(() => {});
}






