// =================================================================
// 0. CAPTURE AUDIO TOÀN CỤC CHO WEBRTC
// =================================================================
let netplayAudioStream = null;
const OrigAudioContext = window.AudioContext || window.webkitAudioContext;
if (OrigAudioContext) {
  const origConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function(destination, ...args) {
    try {
      if (destination && this.context) {
        const isDest = (destination instanceof AudioDestinationNode) || (destination === this.context.destination);
        if (isDest) {
          if (!this.context.__netplayDest) {
            this.context.__netplayDest = this.context.createMediaStreamDestination();
            netplayAudioStream = this.context.__netplayDest.stream;
          }
          origConnect.call(this, this.context.__netplayDest);
        }
      }
    } catch (e) {}
    return origConnect.call(this, destination, ...args);
  };
}

// =================================================================
// 1. SUPABASE CLIENT & TRẠNG THÁI TOÀN CỤC
// =================================================================
const SUPABASE_URL = "https://kmypjbgjvkkbmyaomhrt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtteXBqYmdqdmtrYm15YW9taHJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyOTQxMjgsImV4cCI6MjEwNDg3MDEyOH0.LehadH5EP9rtre0Ielz4U3kuQ8wE6rZMw_yjg6iS_kw";

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let currentUser = null;
let userProfile = null;
let currentGame = { id: null, title: null, core: null, isLocal: false };

// =================================================================
// 2. KHỞI CHẠY EMULATORJS & TIẾN TRÌNH TẢI
// =================================================================
async function fetchWithProgress(url, onProgress) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Máy chủ từ chối (${response.status}): ${response.statusText}`);

  if (!response.body || !response.body.getReader) {
    const blob = await response.blob();
    if (onProgress) onProgress(blob.size, blob.size);
    return blob;
  }

  const contentLength = response.headers.get("content-length");
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
  const reader = response.body.getReader();
  let receivedBytes = 0;
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    receivedBytes += value.length;
    if (onProgress) onProgress(receivedBytes, totalBytes);
  }

  return new Blob(chunks);
}

async function launchGameWithCache(gameId, core, romUrl, gameTitle) {
  currentGame = { id: gameId, title: gameTitle, core: core, isLocal: false };

  const container = document.getElementById("game-container");
  const placeholder = document.getElementById("game-placeholder");
  if (placeholder) placeholder.style.display = "none";

  let loader = document.getElementById("game-loader");
  if (!loader && container) {
    loader = document.createElement("div");
    loader.id = "game-loader";
    loader.innerHTML = `
      <div class="loading-box">
        <div class="loading-title" id="loader-title">Đang kết nối...</div>
        <div class="progress-track" id="loader-track"><div class="progress-fill" id="download-progress-bar"></div></div>
        <div class="loading-stats"><span id="download-size"></span><span class="loading-percent" id="download-percent"></span></div>
      </div>
    `;
    container.appendChild(loader);
  }

  const loaderTitle = document.getElementById("loader-title");
  const loaderTrack = document.getElementById("loader-track");
  const progressBar = document.getElementById("download-progress-bar");
  const sizeText = document.getElementById("download-size");
  const percentText = document.getElementById("download-percent");

  if (loader) loader.style.display = "flex";

  try {
    let romBlob = null;
    if (window.idbKeyval) {
      const cached = await window.idbKeyval.get(`rom_${gameId}`);
      if (cached instanceof Blob) romBlob = cached;
      else if (cached && cached.blob) romBlob = cached.blob;
    }

    if (romBlob) {
      if (loaderTrack) loaderTrack.style.display = "none";
      if (sizeText) sizeText.innerText = "";
      if (percentText) percentText.innerText = "";
      if (loaderTitle) loaderTitle.innerHTML = `⚡ Đang nạp <span style="color:var(--accent-cyan);">${gameTitle}</span> từ bộ nhớ...`;
    } else {
      if (loaderTrack) loaderTrack.style.display = "block";
      if (loaderTitle) loaderTitle.innerHTML = `Đang tải: <span style="color:var(--accent-cyan);">${gameTitle}</span>`;

      romBlob = await fetchWithProgress(romUrl, (received, total) => {
        const receivedMB = (received / (1024 * 1024)).toFixed(1);
        if (total > 0) {
          const totalMB = (total / (1024 * 1024)).toFixed(1);
          const percent = Math.min(100, Math.round((received / total) * 100));
          if (progressBar) progressBar.style.width = `${percent}%`;
          if (percentText) percentText.innerText = `${percent}%`;
          if (sizeText) sizeText.innerText = `${receivedMB} MB / ${totalMB} MB`;
        } else {
          if (sizeText) sizeText.innerText = `Đã nhận: ${receivedMB} MB`;
          if (percentText) percentText.innerText = "Đang tải...";
        }
      });

      if (window.idbKeyval) {
        await window.idbKeyval.set(`rom_${gameId}`, {
          blob: romBlob,
          title: gameTitle,
          core: core.toUpperCase(),
          savedAt: new Date().toLocaleDateString("vi-VN")
        });
      }
    }

    const blobUrl = URL.createObjectURL(romBlob);
    startEmulator(core, blobUrl, gameTitle);
    recordPlayHistory(gameId);

  } catch (error) {
    console.error("Lỗi nạp game:", error);
    alert("❌ Lỗi nạp game: " + error.message);
    if (loader) loader.style.display = "none";
    if (placeholder) placeholder.style.display = "flex";
  }
}

function startEmulator(core, romSource, gameTitle = "Retro Game") {
  const placeholder = document.getElementById("game-placeholder");
  const loader = document.getElementById("game-loader");
  const cloudBar = document.getElementById("cloud-save-panel");

  if (placeholder) placeholder.style.display = "none";
  if (loader) loader.style.display = "none";
  if (cloudBar) cloudBar.style.display = "flex";

  let gameDiv = document.getElementById("game");
  if (!gameDiv) {
    gameDiv = document.createElement("div");
    gameDiv.id = "game";
    document.getElementById("game-container").appendChild(gameDiv);
  } else {
    gameDiv.innerHTML = "";
  }

  window.EJS_player = "#game";
  window.EJS_core = core;
  window.EJS_gameName = gameTitle;
  window.EJS_gameUrl = romSource;
  window.EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";
  window.EJS_startOnLoaded = true;

  const noSaveButtons = {
    playPause: true, restart: true, mute: true, volume: true, settings: true,
    fullscreen: true, gamepad: true, saveState: false, loadState: false,
    quickSave: false, quickLoad: false, saveSavFiles: false, loadSavFiles: false, cacheManager: false
  };
  window.EJS_buttons = noSaveButtons;
  window.EJS_defaultButtons = noSaveButtons;

  const oldScript = document.getElementById("ejs-loader");
  if (oldScript) oldScript.remove();

  const script = document.createElement("script");
  script.id = "ejs-loader";
  script.src = "https://cdn.emulatorjs.org/stable/data/loader.js";
  document.body.appendChild(script);

  updateSaveSlotUI();
}

// =================================================================
// 3. NẠP ROM CỤC BỘ TỪ MÁY
// =================================================================
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const coreSelector = document.getElementById("core-selector");

function handleFileSelection(file) {
  if (!file) return;
  currentGame = {
    id: "local_" + file.name.replace(/[^a-zA-Z0-9]/g, "_"),
    title: file.name,
    core: coreSelector ? coreSelector.value : "gba",
    isLocal: true,
    file: file
  };
  const blobUrl = URL.createObjectURL(file);
  startEmulator(currentGame.core, blobUrl, file.name);
}

if (fileInput) fileInput.addEventListener("change", (e) => handleFileSelection(e.target.files[0]));
if (dropZone) {
  dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("dragover"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) handleFileSelection(e.dataTransfer.files[0]);
  });
}

// =================================================================
// 4. THƯ VIỆN GAME & TÌM KIẾM
// =================================================================
let allGamesList = [];
let currentFilterSystem = "ALL";
let currentSearchKeyword = "";

async function loadGamesFromSupabase() {
  const grid = document.getElementById("game-grid");
  if (!grid || !supabaseClient) return;

  try {
    const { data: games, error } = await supabaseClient.from("games").select("*");
    if (error) throw error;
    allGamesList = games || [];
    initFilterEvents();
    renderFilteredGames();
  } catch (err) {
    console.error("Lỗi Supabase:", err);
    grid.innerHTML = `<p style="color:#ff5555">Lỗi kết nối database: ${err.message}</p>`;
  }
}

function initFilterEvents() {
  const searchInput = document.getElementById("search-input");
  const filterGroup = document.getElementById("system-filters");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearchKeyword = e.target.value.trim().toLowerCase();
      renderFilteredGames();
    });
  }

  if (filterGroup) {
    const pills = filterGroup.querySelectorAll(".filter-pill");
    pills.forEach((btn) => {
      btn.addEventListener("click", () => {
        pills.forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        currentFilterSystem = btn.getAttribute("data-system");
        renderFilteredGames();
      });
    });
  }
}

function renderFilteredGames() {
  const grid = document.getElementById("game-grid");
  if (!grid) return;

  const filtered = allGamesList.filter((game) => {
    const matchSystem = currentFilterSystem === "ALL" ||
      game.core?.toUpperCase() === currentFilterSystem ||
      game.system?.toUpperCase() === currentFilterSystem;
    const matchKeyword = game.title.toLowerCase().includes(currentSearchKeyword);
    return matchSystem && matchKeyword;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="empty-state" style="grid-column: 1 / -1;">Không tìm thấy tựa game nào phù hợp.</p>`;
    return;
  }

  grid.innerHTML = "";
  filtered.forEach((game) => {
    const card = document.createElement("div");
    card.className = "game-card";
    card.innerHTML = `
      <img src="${game.cover_url || 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg'}" alt="${game.title}">
      <div class="info">
        <span>${game.system}</span>
        <h3>${game.title}</h3>
      </div>
    `;
    card.onclick = () => {
      if (game.rom_url) launchGameWithCache(game.id, game.core, game.rom_url, game.title);
      else alert("Game này cần bạn tự nạp file ROM từ máy tính.");
    };
    grid.appendChild(card);
  });
}

// =================================================================
// 5. SUPABASE AUTH & HỒ SƠ TÀI KHOẢN
// =================================================================
let isSignUpMode = false;

async function initAuth() {
  if (!supabaseClient) return;

  const { data: { session } } = await supabaseClient.auth.getSession();
  currentUser = session ? session.user : null;
  if (currentUser) await fetchUserProfile();
  renderAuthUI();

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session ? session.user : null;
    if (currentUser) await fetchUserProfile();
    else userProfile = null;
    renderAuthUI();
    updateSaveSlotUI();
  });
}

async function fetchUserProfile() {
  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", currentUser.id)
      .single();
    if (!error && data) userProfile = data;
  } catch (err) {
    console.warn("Chưa lấy được profile:", err.message);
  }
}

function renderAuthUI() {
  const authContainer = document.getElementById("auth-container");
  if (!authContainer) return;

  if (currentUser) {
    const displayName = (userProfile && userProfile.username) ? userProfile.username : currentUser.email.split("@")[0];
    authContainer.innerHTML = `
      <div class="user-badge" style="cursor:pointer;" onclick="openAccountModal()" title="Mở Quản Lý Tài Khoản">
        <span style="font-size:0.85rem; font-weight:600; color:var(--accent-cyan);">🎮 ${displayName}</span>
        <button class="btn-edit">⚙️</button>
      </div>
      <button class="btn btn-secondary" onclick="logout()">Đăng xuất</button>
    `;
  } else {
    authContainer.innerHTML = `<button class="btn btn-primary" onclick="openAuthModal()">Đăng nhập / Đăng ký</button>`;
  }
}

async function loginWithGoogle() {
  if (!supabaseClient) return alert("Chưa kết nối được với Supabase!");
  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
  } catch (err) {
    alert("Lỗi đăng nhập Google: " + err.message);
  }
}

async function logout() {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.auth.signOut();
  if (error) alert("Lỗi khi đăng xuất: " + error.message);
  else window.location.reload();
}

function openAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.style.display = "flex";
}

function closeAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.style.display = "none";
}

function toggleAuthMode() {
  isSignUpMode = !isSignUpMode;
  const title = document.getElementById("auth-modal-title");
  const submitBtn = document.getElementById("btn-submit-auth");
  const toggleBtn = document.getElementById("btn-toggle-auth");

  if (isSignUpMode) {
    if (title) title.innerText = "Đăng Ký Tài Khoản";
    if (submitBtn) { submitBtn.innerText = "Đăng ký"; submitBtn.setAttribute("onclick", "handleEmailAuth('signup')"); }
    if (toggleBtn) toggleBtn.innerText = "Đã có tài khoản? Đăng nhập";
  } else {
    if (title) title.innerText = "Đăng Nhập Game Thủ";
    if (submitBtn) { submitBtn.innerText = "Đăng nhập"; submitBtn.setAttribute("onclick", "handleEmailAuth('login')"); }
    if (toggleBtn) toggleBtn.innerText = "Chưa có tài khoản? Đăng ký ngay";
  }
}

async function handleEmailAuth(mode) {
  const email = document.getElementById("auth-email")?.value.trim();
  const password = document.getElementById("auth-password")?.value.trim();
  if (!email || !password) return alert("Vui lòng điền đầy đủ email và mật khẩu.");

  if (mode === "signup") {
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) return alert("Lỗi đăng ký: " + error.message);
    alert("Đăng ký thành công! Bạn có thể đăng nhập ngay.");
    toggleAuthMode();
  } else {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return alert("Lỗi đăng nhập: " + error.message);
    closeAuthModal();
  }
}

async function saveUsername() {
  const input = document.getElementById("input-username");
  const newName = input ? input.value.trim() : "";
  if (!newName) return alert("Nickname không được để trống!");
  if (newName.length < 3) return alert("Nickname phải có tối thiểu 3 ký tự!");

  try {
    const { error } = await supabaseClient
      .from("profiles")
      .update({ username: newName, updated_at: new Date().toISOString() })
      .eq("id", currentUser.id);

    if (error) throw error;
    if (!userProfile) userProfile = {};
    userProfile.username = newName;
    renderAuthUI();
    alert("Cập nhật Nickname thành công!");
  } catch (err) {
    alert("Không thể lưu Nickname: " + err.message);
  }
}

// =================================================================
// 6. CLOUD SAVE & LOAD (BUCKET 'SaveGame')
// =================================================================
async function saveToCloud(slotNumber) {
  if (!currentUser) return alert("Vui lòng đăng nhập để lưu đám mây!");
  if (!currentGame.id) return alert("Chưa có game nào đang chạy để lưu.");

  const gm = window.EJS_emulator?.gameManager;
  if (!gm) return alert("Trình giả lập chưa sẵn sàng.");

  try {
    let saveBinary = null;
    if (typeof gm.getSave === "function") saveBinary = await gm.getSave();
    else if (typeof gm.getState === "function") saveBinary = await gm.getState();

    if (!saveBinary || saveBinary.length === 0) {
      alert("Không tìm thấy dữ liệu lưu! Hãy chắc chắn bạn đã vào menu game để lưu trước.");
      return;
    }

    const filePath = `${currentUser.id}/${currentGame.id}_slot${slotNumber}.sav`;
    const { error: uploadError } = await supabaseClient.storage
      .from("SaveGame")
      .upload(filePath, saveBinary, { contentType: "application/octet-stream", upsert: true });

    if (uploadError) throw uploadError;

    const { error: dbError } = await supabaseClient
      .from("user_saves")
      .upsert({
        user_id: currentUser.id,
        game_id: currentGame.isLocal ? null : currentGame.id,
        slot: slotNumber,
        file_path: filePath,
        file_size: saveBinary.length,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id,game_id,slot" });

    if (dbError) throw dbError;
    alert(`✅ Đã lưu thành công vào Đám Mây [Slot ${slotNumber}]!`);
    updateSaveSlotUI();
  } catch (err) {
    console.error("Lỗi lưu save:", err);
    alert("Lưu thất bại: " + err.message);
  }
}

async function loadFromCloud(slotNumber) {
  if (!currentUser) return alert("Vui lòng đăng nhập để tải save!");
  if (!currentGame.id) return alert("Hãy mở game trước khi tải file lưu.");

  const gm = window.EJS_emulator?.gameManager;
  if (!gm) return alert("Trình giả lập chưa sẵn sàng.");

  try {
    const filePath = `${currentUser.id}/${currentGame.id}_slot${slotNumber}.sav`;
    const { data, error } = await supabaseClient.storage.from("SaveGame").download(filePath);
    if (error) throw new Error("Chưa có bản lưu nào ở Slot này.");

    const arrayBuffer = await data.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    if (typeof gm.loadSave === "function") gm.loadSave(uint8Array);
    else if (typeof gm.loadState === "function") gm.loadState(uint8Array);
    else throw new Error("Không hỗ trợ API nạp save.");

    if (typeof gm.restart === "function") gm.restart();
    alert(`✅ Đã nạp dữ liệu [Slot ${slotNumber}] thành công!`);
  } catch (err) {
    console.error("Lỗi tải save:", err);
    alert("Tải file lưu thất bại: " + err.message);
  }
}

function updateSaveSlotUI() {
  const savePanel = document.getElementById("cloud-save-panel");
  if (savePanel) savePanel.style.display = (!currentUser || !currentGame.id) ? "none" : "flex";
}

async function recordPlayHistory(gameId) {
  if (!currentUser || !supabaseClient || !gameId) return;
  try {
    await supabaseClient.from("play_history").upsert({
      user_id: currentUser.id,
      game_id: gameId,
      last_played: new Date().toISOString()
    }, { onConflict: "user_id,game_id" });
  } catch (e) {
    console.warn("Lỗi ghi log lịch sử:", e);
  }
}

// =================================================================
// 7. P2P LOCKSTEP NETPLAY: MỖI MÁY 1 ROM & DUAL ROLE CONTROL MATRIX
// =================================================================
let peerConnection = null;
let dataChannel = null;
let roomChannel = null;
let isHostPlayer = false;
let netplayActive = false;
let currentLobbyCode = null;
let netplayGameTarget = null;
let guestChosenGame = null;
let iceCandidateQueue = [];

let localCoreFrame = 0;
let remoteCoreFrame = 0;
let isThrottlingPacer = false;

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

function updateNetplayStatusBadge(state, text) {
  const badge = document.getElementById("netplay-status-badge");
  const txt = document.getElementById("netplay-status-text");
  if (!badge || !txt) return;

  badge.className = `netplay-status-badge status-${state}`;
  txt.innerText = text;
}

// TẬP PHÍM TRUYỀN TÍN HIỆU ĐỘC LẬP CHO ĐỐI THỦ (NUMPAD)
const REMOTE_INJECTION_KEYS = {
  "UP":     { code: "Numpad8",        keyCode: 104, key: "8" },
  "DOWN":   { code: "Numpad2",        keyCode: 98,  key: "2" },
  "LEFT":   { code: "Numpad4",        keyCode: 100, key: "4" },
  "RIGHT":  { code: "Numpad6",        keyCode: 102, key: "6" },
  "A":      { code: "Numpad1",        keyCode: 97,  key: "1" },
  "B":      { code: "Numpad3",        keyCode: 99,  key: "3" },
  "X":      { code: "Numpad7",        keyCode: 103, key: "7" },
  "Y":      { code: "Numpad9",        keyCode: 105, key: "9" },
  "L":      { code: "NumpadDivide",   keyCode: 111, key: "/" },
  "R":      { code: "NumpadMultiply", keyCode: 106, key: "*" },
  "START":  { code: "NumpadEnter",    keyCode: 13,  key: "Enter" },
  "SELECT": { code: "Numpad0",        keyCode: 96,  key: "0" }
};

// Chuẩn hóa tên nút để khớp với mọi hệ máy (PS1, GBA, SNES, NES)
function getCanonicalBtnName(btnKey) {
  const k = String(btnKey).toLowerCase();
  if (k === "up" || k === "4") return "UP";
  if (k === "down" || k === "5") return "DOWN";
  if (k === "left" || k === "6") return "LEFT";
  if (k === "right" || k === "7") return "RIGHT";
  if (k === "a" || k === "8") return "A";
  if (k === "b" || k === "0") return "B";
  if (k === "x" || k === "9") return "X";
  if (k === "y" || k === "1") return "Y";
  if (k === "l" || k === "10") return "L";
  if (k === "r" || k === "11") return "R";
  if (k === "start" || k === "3") return "START";
  if (k === "select" || k === "2") return "SELECT";
  return k.toUpperCase();
}

// THIẾT LẬP BẢNG MAPPING CHUẨN: HOST = P1, CLIENT = P2
function configureDualRoleControls(isHost) {
  if (!window.EJS_emulator || !window.EJS_emulator.controls) return false;
  const controls = window.EJS_emulator.controls;

  // Lấy schema điều khiển gốc của core
  const template = controls[0];
  if (!template || typeof template !== "object" || Object.keys(template).length === 0) {
    return false;
  }

  // 1. Tạo bảng gán phím Numpad chuyên biệt để nhận lệnh từ đối thủ
  const remoteTable = {};
  for (const btnKey in template) {
    const action = getCanonicalBtnName(btnKey);
    const injectInfo = REMOTE_INJECTION_KEYS[action];
    remoteTable[btnKey] = {
      value: injectInfo ? injectInfo.code : "",
      value2: "" // Tắt Gamepad API để không bị xung đột
    };
  }

  if (isHost) {
    // --- MÁY HOST (PLAYER 1) ---
    // Player 1: Giữ nguyên 100% phím bấm quen thuộc của Host!
    // Player 2: Nạp bảng phím Numpad để nhận lệnh từ Client!
    controls[1] = remoteTable;
  } else {
    // --- MÁY GUEST (PLAYER 2) ---
    // Di chuyển toàn bộ phím chơi đơn quen thuộc của Client sang Player 2!
    controls[1] = JSON.parse(JSON.stringify(template));
    // Player 1: Nạp bảng phím Numpad để nhận lệnh từ Host!
    controls[0] = remoteTable;
  }

  return true;
}

function startControlsSyncDaemon(isHost) {
  let count = 0;
  const timer = setInterval(() => {
    count++;
    const ok = configureDualRoleControls(isHost);
    if (ok || count > 25) clearInterval(timer);
  }, 200);
}

// Phát sự kiện bàn phím Numpad khi nhận gói tin từ đối thủ
function injectRemoteInput(action, btnName) {
  const keyInfo = REMOTE_INJECTION_KEYS[btnName];
  if (!keyInfo) return;

  const event = new KeyboardEvent(action, {
    key: keyInfo.key,
    code: keyInfo.code,
    keyCode: keyInfo.keyCode,
    which: keyInfo.keyCode,
    bubbles: true,
    cancelable: true,
    composed: true
  });

  Object.defineProperty(event, "keyCode", { get: () => keyInfo.keyCode });
  Object.defineProperty(event, "which", { get: () => keyInfo.keyCode });
  Object.defineProperty(event, "code", { get: () => keyInfo.code });

  window.dispatchEvent(event);
  document.dispatchEvent(event);
  const canvas = document.querySelector("#game canvas") || document.getElementById("game");
  if (canvas) canvas.dispatchEvent(event);
}

// ĐIỀU TỐC KHUNG HÌNH (DYNAMIC FRAME PACER)
function hookCoreCanvasRenderer() {
  const canvas = document.querySelector("#game canvas");
  if (!canvas) return;

  const onNewFrameRendered = () => {
    if (!netplayActive) return;
    localCoreFrame++;

    if (localCoreFrame % 15 === 0 && dataChannel && dataChannel.readyState === "open") {
      try {
        dataChannel.send(JSON.stringify({ type: "SYNC_TICK", frame: localCoreFrame }));
      } catch (e) {}
    }
  };

  const gl = canvas.getContext("webgl") || canvas.getContext("webgl2") || canvas.getContext("experimental-webgl");
  if (gl && !gl.__lockstepHooked) {
    gl.__lockstepHooked = true;
    const origDrawArrays = gl.drawArrays;
    gl.drawArrays = function(...args) { onNewFrameRendered(); return origDrawArrays.apply(this, args); };
    const origDrawElements = gl.drawElements;
    gl.drawElements = function(...args) { onNewFrameRendered(); return origDrawElements.apply(this, args); };
  }

  const ctx = canvas.getContext("2d");
  if (ctx && !ctx.__lockstepHooked) {
    ctx.__lockstepHooked = true;
    const origPut = ctx.putImageData;
    ctx.putImageData = function(...args) { onNewFrameRendered(); return origPut.apply(this, args); };
  }
}

function handleSyncTick(incomingFrame) {
  remoteCoreFrame = incomingFrame;
  if (!netplayActive) return;

  const frameDiff = localCoreFrame - remoteCoreFrame;
  if (frameDiff > 3 && !isThrottlingPacer) {
    isThrottlingPacer = true;
    const gm = window.EJS_emulator?.gameManager;
    if (gm && typeof gm.pause === "function") {
      gm.pause();
      const waitMs = Math.min(frameDiff * 16, 100);
      setTimeout(() => {
        if (gm && typeof gm.resume === "function" && netplayActive) gm.resume();
        isThrottlingPacer = false;
      }, waitMs);
    } else {
      isThrottlingPacer = false;
    }
  }
}

// QUẢN LÝ SẢNH LOBBY
function switchNetplayView(viewId) {
  document.querySelectorAll(".np-view").forEach(v => v.classList.remove("active"));
  document.getElementById(viewId)?.classList.add("active");
}

function openNetplayModal() {
  if (!currentUser) {
    alert("Vui lòng đăng nhập tài khoản trước khi chơi Online!");
    openAuthModal();
    return;
  }
  document.getElementById("netplay-modal").style.display = "flex";
  switchNetplayView("np-view-select");
}

function closeNetplayModal() {
  if (currentLobbyCode && !netplayActive) cancelNetplayLobby();
  document.getElementById("netplay-modal").style.display = "none";
}

function npBackToSelect() {
  switchNetplayView("np-view-select");
}

function renderHostGameOptions(games) {
  const select = document.getElementById("np-host-game-select");
  if (!select) return;
  select.innerHTML = '<option value="">-- Chọn game trong danh sách --</option>';
  games.forEach(g => {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.innerText = `[${g.system || 'ROM'}] ${g.title}`;
    select.appendChild(opt);
  });
  if (games.length === 1) select.selectedIndex = 1;
}

function filterHostGames(keyword) {
  const kw = (keyword || "").trim().toLowerCase();
  renderHostGameOptions(allGamesList.filter(g => g.title.toLowerCase().includes(kw)));
}

function renderGuestGameOptions(games) {
  const select = document.getElementById("np-guest-game-select");
  if (!select) return;
  select.innerHTML = '<option value="">-- Tự động nạp theo Host (Mặc định) --</option>';
  games.forEach(g => {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.innerText = `[${g.system || 'ROM'}] ${g.title}`;
    select.appendChild(opt);
  });
}

function filterGuestGames(keyword) {
  const kw = (keyword || "").trim().toLowerCase();
  renderGuestGameOptions(allGamesList.filter(g => g.title.toLowerCase().includes(kw)));
}

function npShowHostSelect() {
  renderHostGameOptions(allGamesList);
  switchNetplayView("np-view-host-select");
}

function hostConfirmCreateLobby() {
  const select = document.getElementById("np-host-game-select");
  const fileInput = document.getElementById("np-host-file-input");
  const selectedGameId = select ? select.value : "";
  const localFile = fileInput?.files[0];

  if (!selectedGameId && !localFile) return alert("Vui lòng chọn 1 game hoặc nạp ROM!");

  isHostPlayer = true;
  netplayActive = false;
  currentLobbyCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  if (selectedGameId) {
    const found = allGamesList.find(g => g.id === selectedGameId);
    netplayGameTarget = { ...found, isLocal: false };
  } else {
    netplayGameTarget = { id: "local_" + Date.now(), title: localFile.name, core: "gba", isLocal: true, file: localFile };
  }

  document.getElementById("np-display-pin").innerText = currentLobbyCode;
  document.getElementById("np-lobby-gamename").innerText = netplayGameTarget.title;
  switchNetplayView("np-view-host-lobby");

  updateNetplayStatusBadge("waiting", "Đang chờ P2 vào phòng...");
  initNetplaySignaling(currentLobbyCode, true);
}

function cancelNetplayLobby() {
  if (roomChannel) {
    try {
      roomChannel.send({ type: "broadcast", event: "signal", payload: { type: "lobby_closed" } });
      supabaseClient.removeChannel(roomChannel);
    } catch (e) {}
    roomChannel = null;
  }
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  dataChannel = null;
  currentLobbyCode = null;
  netplayActive = false;
  iceCandidateQueue = [];
  localCoreFrame = 0;
  remoteCoreFrame = 0;
  updateNetplayStatusBadge("idle", "Đơn đấu");
  switchNetplayView("np-view-select");
}

function npShowGuestInput() {
  const searchInput = document.getElementById("np-guest-search");
  if (searchInput) searchInput.value = "";
  const fileInput = document.getElementById("np-guest-file-input");
  if (fileInput) fileInput.value = "";

  renderGuestGameOptions(allGamesList);
  switchNetplayView("np-view-guest");
}

function clientJoinLobby() {
  const pinInput = document.getElementById("np-guest-pin-input");
  const roomId = pinInput ? pinInput.value.trim().toUpperCase() : "";
  if (roomId.length !== 6) return alert("Mã phòng hợp lệ gồm đúng 6 ký tự!");

  const select = document.getElementById("np-guest-game-select");
  const fileInput = document.getElementById("np-guest-file-input");
  const selectedGameId = select ? select.value : "";
  const localFile = fileInput?.files[0];

  if (localFile) {
    guestChosenGame = { id: "local_" + Date.now(), title: localFile.name, core: "gba", isLocal: true, file: localFile };
  } else if (selectedGameId) {
    const found = allGamesList.find(g => g.id === selectedGameId);
    guestChosenGame = found ? { ...found, isLocal: false } : null;
  } else {
    guestChosenGame = null;
  }

  isHostPlayer = false;
  netplayActive = false;
  currentLobbyCode = roomId;

  switchNetplayView("np-view-sync");
  document.getElementById("np-sync-status").innerText = "Đang kết nối tới máy Host...";
  updateNetplayStatusBadge("waiting", "Đang bắt tay P2P...");

  initNetplaySignaling(currentLobbyCode, false);
}

function initNetplaySignaling(roomId, isHost) {
  if (roomChannel) supabaseClient.removeChannel(roomChannel);
  iceCandidateQueue = [];

  roomChannel = supabaseClient.channel(`room_${roomId}`, { config: { broadcast: { self: false } } });
  roomChannel
    .on("broadcast", { event: "signal" }, async ({ payload }) => {
      await handleNetplaySignal(payload);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setupPeerConnection(isHost);
        if (!isHost) {
          roomChannel.send({ type: "broadcast", event: "signal", payload: { type: "guest_joined" } });
        }
      }
    });
}

async function flushIceCandidateQueue() {
  while (iceCandidateQueue.length > 0) {
    const candidate = iceCandidateQueue.shift();
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {}
  }
}

async function waitForCanvasReady() {
  for (let i = 0; i < 60; i++) {
    const canvas = document.querySelector("#game canvas");
    if (canvas && canvas.width > 0 && canvas.height > 0) return canvas;
    await new Promise(r => setTimeout(r, 200));
  }
  return document.querySelector("#game canvas");
}

async function handleNetplaySignal(data) {
  if (data.type === "lobby_closed") {
    alert("Đối thủ đã rời hoặc hủy phòng.");
    closeNetplayModal();
    updateNetplayStatusBadge("idle", "Đơn đấu");
    netplayActive = false;
    return;
  }

  if (data.type === "guest_joined" && isHostPlayer) {
    switchNetplayView("np-view-sync");
    document.getElementById("np-sync-status").innerText = "P2 đã vào phòng! Đang khởi động 2 ROM...";

    roomChannel.send({
      type: "broadcast",
      event: "signal",
      payload: {
        type: "load_game_target",
        game: {
          id: netplayGameTarget.id,
          title: netplayGameTarget.title,
          core: netplayGameTarget.core,
          rom_url: netplayGameTarget.rom_url,
          isLocal: netplayGameTarget.isLocal
        }
      }
    });

    if (netplayGameTarget.isLocal) {
      startEmulator(netplayGameTarget.core, URL.createObjectURL(netplayGameTarget.file), netplayGameTarget.title);
    } else {
      await launchGameWithCache(netplayGameTarget.id, netplayGameTarget.core, netplayGameTarget.rom_url, netplayGameTarget.title);
    }

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    roomChannel.send({ type: "broadcast", event: "signal", payload: { type: "offer", sdp: offer } });

  } else if (data.type === "load_game_target" && !isHostPlayer) {
    netplayGameTarget = data.game;

    if (guestChosenGame && guestChosenGame.isLocal) {
      document.getElementById("np-sync-status").innerText = `Đang nạp ROM từ máy bạn: [${guestChosenGame.title}]...`;
      startEmulator(netplayGameTarget.core, URL.createObjectURL(guestChosenGame.file), guestChosenGame.title);
    } else if (guestChosenGame && !guestChosenGame.isLocal) {
      document.getElementById("np-sync-status").innerText = `Đang nạp ROM: [${guestChosenGame.title}]...`;
      await launchGameWithCache(guestChosenGame.id, guestChosenGame.core || netplayGameTarget.core, guestChosenGame.rom_url, guestChosenGame.title);
    } else {
      document.getElementById("np-sync-status").innerText = `Đang đồng bộ ROM theo Host: [${netplayGameTarget.title}]...`;
      if (!netplayGameTarget.isLocal) {
        await launchGameWithCache(netplayGameTarget.id, netplayGameTarget.core, netplayGameTarget.rom_url, netplayGameTarget.title);
      } else {
        alert(`Host nạp file từ máy [${netplayGameTarget.title}]. Hãy chọn cùng file này.`);
      }
    }

  } else if (data.type === "offer" && !isHostPlayer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
    await flushIceCandidateQueue();

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    roomChannel.send({ type: "broadcast", event: "signal", payload: { type: "answer", sdp: answer } });

  } else if (data.type === "answer" && isHostPlayer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
    await flushIceCandidateQueue();

  } else if (data.type === "candidate" && peerConnection) {
    if (data.candidate) {
      if (!peerConnection.remoteDescription) {
        iceCandidateQueue.push(data.candidate);
      } else {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {}
      }
    }
  }
}

function setupPeerConnection(isHost) {
  peerConnection = new RTCPeerConnection(rtcConfig);

  peerConnection.onicecandidate = (e) => {
    if (e.candidate && roomChannel) {
      roomChannel.send({
        type: "broadcast",
        event: "signal",
        payload: {
          type: "candidate",
          candidate: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate
        }
      });
    }
  };

  peerConnection.onconnectionstatechange = () => {
    if (peerConnection.connectionState === "disconnected" || peerConnection.connectionState === "failed") {
      netplayActive = false;
      updateNetplayStatusBadge("idle", "Đã ngắt kết nối P2P");
    }
  };

  if (isHost) {
    dataChannel = peerConnection.createDataChannel("lockstep_input_channel", { ordered: true });
    setupDataChannelHandlers();
  } else {
    peerConnection.ondatachannel = (e) => {
      dataChannel = e.channel;
      setupDataChannelHandlers();
    };
  }
}

function setupDataChannelHandlers() {
  dataChannel.onopen = async () => {
    netplayActive = true;
    const roleText = isHostPlayer ? "Host (P1)" : "Guest (P2)";
    updateNetplayStatusBadge("connected", `🟢 2P Lockstep • ${roleText}`);

    await waitForCanvasReady();
    hookCoreCanvasRenderer();
    startControlsSyncDaemon(isHostPlayer);

    if (isHostPlayer) {
      dataChannel.send(JSON.stringify({ type: "START_COUNTDOWN" }));
      runCountdownAnimation();
    }
  };

  dataChannel.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === "START_COUNTDOWN") {
        runCountdownAnimation();
      } else if (msg.type === "SYNC_TICK") {
        handleSyncTick(msg.frame);
      } else if (msg.type === "INPUT") {
        // Nhận thao tác từ đối thủ và kích hoạt phím Numpad trên máy mình
        injectRemoteInput(msg.action, msg.btn);
      }
    } catch (err) {}
  };

  dataChannel.onclose = () => {
    netplayActive = false;
    updateNetplayStatusBadge("idle", "Đơn đấu (Đối thủ đã thoát)");
  };
}

function runCountdownAnimation() {
  switchNetplayView("np-view-sync");
  const spinner = document.querySelector(".sync-spinner");
  const statusTxt = document.getElementById("np-sync-status");
  const countdownEl = document.getElementById("np-countdown");

  if (spinner) spinner.style.display = "none";
  if (statusTxt) statusTxt.innerText = "ĐỒNG BỘ HOÀN TẤT! TRẬN ĐẤU BẮT ĐẦU:";
  if (countdownEl) countdownEl.style.display = "block";

  let count = 3;
  if (countdownEl) countdownEl.innerText = count;

  const timer = setInterval(() => {
    count--;
    if (count > 0) {
      if (countdownEl) countdownEl.innerText = count;
    } else {
      clearInterval(timer);
      document.getElementById("netplay-modal").style.display = "none";

      configureDualRoleControls(isHostPlayer);
      hookCoreCanvasRenderer();

      // Đồng bộ khởi động lại core để khớp 100% Frame 0
      if (window.EJS_emulator?.gameManager?.restart) {
        window.EJS_emulator.gameManager.restart();
      }
      setTimeout(() => configureDualRoleControls(isHostPlayer), 1000);
    }
  }, 1000);
}

function copyRoomCode() {
  if (!currentLobbyCode) return;
  navigator.clipboard.writeText(currentLobbyCode).then(() => alert("Đã copy: " + currentLobbyCode));
}

window.addEventListener("beforeunload", () => {
  if (roomChannel) {
    try {
      roomChannel.send({ type: "broadcast", event: "signal", payload: { type: "lobby_closed" } });
    } catch (e) {}
  }
});

// =================================================================
// 8. BẮT PHÍM CỤC BỘ & PHÁT ĐỒNG THỜI CHO ĐỐI THỦ
// =================================================================

const DEFAULT_P1_KEYMAP = {
  "ArrowUp": "UP",
  "ArrowDown": "DOWN",
  "ArrowLeft": "LEFT",
  "ArrowRight": "RIGHT",
  "KeyX": "A",
  "KeyZ": "B",
  "KeyS": "X",
  "KeyA": "Y",
  "KeyQ": "L",
  "KeyE": "R",
  "Enter": "START",
  "ShiftRight": "SELECT"
};

function getActiveKeymap() {
  const saved = localStorage.getItem("retrocloud_keymap_p1");
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return { ...DEFAULT_P1_KEYMAP };
}

function saveActiveKeymap(map) {
  localStorage.setItem("retrocloud_keymap_p1", JSON.stringify(map));
}

// Bơm phím từ nút bấm cảm ứng (Mobile)
function dispatchGameAction(type, actionName) {
  // 1. Kích hoạt trực tiếp trên máy mình
  if (isHostPlayer) {
    // Host điều khiển Player 1
    const p1Map = getActiveKeymap();
    const boundKey = Object.keys(p1Map).find(k => p1Map[k] === actionName);
    if (boundKey) {
      const ev = new KeyboardEvent(type, { code: boundKey, key: boundKey, bubbles: true });
      window.dispatchEvent(ev);
    }
  } else {
    // Guest điều khiển Player 2
    const p2Map = getActiveKeymap();
    const boundKey = Object.keys(p2Map).find(k => p2Map[k] === actionName);
    if (boundKey) {
      const ev = new KeyboardEvent(type, { code: boundKey, key: boundKey, bubbles: true });
      window.dispatchEvent(ev);
    }
  }

  // 2. Gửi sang máy đối thủ qua WebRTC
  if (netplayActive && dataChannel && dataChannel.readyState === "open") {
    try {
      dataChannel.send(JSON.stringify({
        type: "INPUT",
        action: type,
        btn: actionName
      }));
    } catch (e) {}
  }
}

// Lắng nghe bàn phím vật lý của người chơi
function setupKeyboardListeners() {
  window.addEventListener("keydown", (e) => {
    if (!e.isTrusted) return; // Bỏ qua các phím giả lập để chống lặp đệ quy
    if (document.getElementById("keymap-modal")?.style.display === "flex") return;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

    // Tìm tên nút logic tương ứng (UP, DOWN, A, B...)
    let action = null;
    if (window.EJS_emulator?.controls) {
      const myControls = isHostPlayer ? window.EJS_emulator.controls[0] : window.EJS_emulator.controls[1];
      if (myControls) {
        for (const btnKey in myControls) {
          if (myControls[btnKey]?.value === e.code) {
            action = getCanonicalBtnName(btnKey);
            break;
          }
        }
      }
    }
    if (!action) {
      const map = getActiveKeymap();
      action = map[e.code];
    }

    // Bắn sang đối thủ qua WebRTC
    if (action && netplayActive && dataChannel && dataChannel.readyState === "open") {
      try {
        dataChannel.send(JSON.stringify({
          type: "INPUT",
          action: "keydown",
          btn: action
        }));
      } catch (err) {}
    }
  });

  window.addEventListener("keyup", (e) => {
    if (!e.isTrusted) return;
    if (document.getElementById("keymap-modal")?.style.display === "flex") return;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

    let action = null;
    if (window.EJS_emulator?.controls) {
      const myControls = isHostPlayer ? window.EJS_emulator.controls[0] : window.EJS_emulator.controls[1];
      if (myControls) {
        for (const btnKey in myControls) {
          if (myControls[btnKey]?.value === e.code) {
            action = getCanonicalBtnName(btnKey);
            break;
          }
        }
      }
    }
    if (!action) {
      const map = getActiveKeymap();
      action = map[e.code];
    }

    if (action && netplayActive && dataChannel && dataChannel.readyState === "open") {
      try {
        dataChannel.send(JSON.stringify({
          type: "INPUT",
          action: "keyup",
          btn: action
        }));
      } catch (err) {}
    }
  });
}

function setupVirtualButtonEvents() {
  document.querySelectorAll(".v-btn").forEach(btn => {
    const press = (e) => {
      if (isConfigMode) return;
      e.preventDefault();
      btn.classList.add("pressed");
      if (navigator.vibrate) navigator.vibrate(15);
      const actionName = btn.getAttribute("data-pad-btn");
      if (actionName) dispatchGameAction("keydown", actionName);
    };

    const release = (e) => {
      if (isConfigMode) return;
      e.preventDefault();
      btn.classList.remove("pressed");
      const actionName = btn.getAttribute("data-pad-btn");
      if (actionName) dispatchGameAction("keyup", actionName);
    };

    btn.addEventListener("touchstart", press, { passive: false });
    btn.addEventListener("touchend", release, { passive: false });
    btn.addEventListener("touchcancel", release, { passive: false });
    btn.addEventListener("mousedown", press);
    btn.addEventListener("mouseup", release);
  });
}

// TỰ ĐỘNG LÀM MỜ NÚT TIỆN ÍCH KHI RẢNH
let idleMenuTimer = null;
function initFloatingQuickMenu() {
  const menuContainer = document.getElementById("floating-quick-menu");
  const toggleBtn = document.getElementById("btn-quick-toggle");
  const dropdown = document.getElementById("quick-menu-dropdown");
  const gameContainer = document.getElementById("game-container");

  const resetIdle = () => {
    menuContainer?.classList.remove("is-idle");
    clearTimeout(idleMenuTimer);
    idleMenuTimer = setTimeout(() => {
      if (dropdown && dropdown.style.display === "none") {
        menuContainer?.classList.add("is-idle");
      }
    }, 3500);
  };

  gameContainer?.addEventListener("mousemove", resetIdle);
  gameContainer?.addEventListener("touchstart", resetIdle, { passive: true });
  gameContainer?.addEventListener("click", resetIdle);

  toggleBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = (dropdown.style.display === "flex");
    dropdown.style.display = isOpen ? "none" : "flex";
    resetIdle();
  });

  document.addEventListener("click", (e) => {
    if (!menuContainer?.contains(e.target) && dropdown) {
      dropdown.style.display = "none";
      resetIdle();
    }
  });

  resetIdle();
}

function toggleVirtualGamepad() {
  const overlay = document.getElementById("virtual-gamepad");
  if (overlay) {
    overlay.style.display = (overlay.style.display === "none") ? "block" : "none";
  }
}

function toggleFullscreen() {
  const container = document.getElementById("game-container");
  if (!document.fullscreenElement) {
    container.requestFullscreen().catch(err => alert("Không thể phóng to: " + err.message));
  } else {
    document.exitFullscreen();
  }
}

const BUTTON_NAMES_VN = {
  "UP": "Mũi tên LÊN",
  "DOWN": "Mũi tên XUỐNG",
  "LEFT": "Mũi tên TRÁI",
  "RIGHT": "Mũi tên PHẢI",
  "A": "Nút A (Xác nhận / Tròn)",
  "B": "Nút B (Hủy / Vuông)",
  "X": "Nút X (Tam giác)",
  "Y": "Nút Y (X)",
  "L": "Nút vai L1",
  "R": "Nút vai R1",
  "START": "Nút START",
  "SELECT": "Nút SELECT"
};

function formatKeyName(code) {
  if (!code) return "Chưa gán";
  return code
    .replace("Key", "")
    .replace("Digit", "")
    .replace("ArrowUp", "▲ Lên")
    .replace("ArrowDown", "▼ Xuống")
    .replace("ArrowLeft", "◀ Trái")
    .replace("ArrowRight", "▶ Phải")
    .replace("ShiftRight", "Shift Phải")
    .replace("ShiftLeft", "Shift Trái");
}

function openKeymapModal() {
  const modal = document.getElementById("keymap-modal");
  const list = document.getElementById("keymap-list");
  const title = document.getElementById("keymap-title");
  if (!modal || !list) return;

  title.innerText = "⌨️ Cài Đặt Phím Bấm Chơi Đơn & Online";

  const currentMap = getActiveKeymap();
  list.innerHTML = "";

  Object.keys(BUTTON_NAMES_VN).forEach(action => {
    const boundKey = Object.keys(currentMap).find(k => currentMap[k] === action) || "";

    const row = document.createElement("div");
    row.className = "keymap-row";
    row.innerHTML = `
      <span class="keymap-label">${BUTTON_NAMES_VN[action]}</span>
      <button class="keymap-btn" id="kbtn-${action}" onclick="listenForNewKey('${action}')">${formatKeyName(boundKey)}</button>
    `;
    list.appendChild(row);
  });

  switchKeymapTab("keyboard");
  modal.style.display = "flex";
}

function closeKeymapModal() {
  document.getElementById("keymap-modal").style.display = "none";
}

function switchKeymapTab(tab) {
  document.getElementById("tab-btn-kb")?.classList.toggle("active", tab === "keyboard");
  document.getElementById("tab-btn-vpad")?.classList.toggle("active", tab === "vpad");
  document.getElementById("keymap-tab-kb")?.classList.toggle("active", tab === "keyboard");
  document.getElementById("keymap-tab-vpad")?.classList.toggle("active", tab === "vpad");
}

function listenForNewKey(action) {
  const btn = document.getElementById(`kbtn-${action}`);
  if (!btn) return;

  document.querySelectorAll(".keymap-btn").forEach(b => b.classList.remove("is-listening"));
  btn.classList.add("is-listening");
  btn.innerText = "Bấm 1 phím...";

  const handler = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const currentMap = getActiveKeymap();
    Object.keys(currentMap).forEach(k => {
      if (currentMap[k] === action) delete currentMap[k];
    });

    currentMap[e.code] = action;
    saveActiveKeymap(currentMap);

    btn.classList.remove("is-listening");
    btn.innerText = formatKeyName(e.code);

    window.removeEventListener("keydown", handler, { capture: true });
  };

  window.addEventListener("keydown", handler, { capture: true, once: true });
}

function resetCurrentKeymap() {
  localStorage.removeItem("retrocloud_keymap_p1");
  openKeymapModal();
}

function applyVirtualPadPreset(preset) {
  const btnX = document.getElementById("vbtn-x");
  const btnY = document.getElementById("vbtn-y");
  const btnB = document.getElementById("vbtn-b");
  const btnA = document.getElementById("vbtn-a");

  if (preset === "nintendo") {
    btnA.setAttribute("data-pad-btn", "A"); btnA.innerText = "A";
    btnB.setAttribute("data-pad-btn", "B"); btnB.innerText = "B";
    btnX.setAttribute("data-pad-btn", "X"); btnX.innerText = "X";
    btnY.setAttribute("data-pad-btn", "Y"); btnY.innerText = "Y";
    localStorage.setItem("retrocloud_vpad_preset", "nintendo");
    alert("Đã áp dụng Layout Nintendo (A bên phải, B bên dưới)!");
  } else {
    btnA.setAttribute("data-pad-btn", "B"); btnA.innerText = "B";
    btnB.setAttribute("data-pad-btn", "A"); btnB.innerText = "A";
    btnX.setAttribute("data-pad-btn", "Y"); btnX.innerText = "Y";
    btnY.setAttribute("data-pad-btn", "X"); btnY.innerText = "X";
    localStorage.setItem("retrocloud_vpad_preset", "xbox");
    alert("Đã áp dụng Layout Xbox (A bên dưới, B bên phải)!");
  }
}

// BẢNG TÙY CHỈNH VỊ TRÍ & KÍCH THƯỚC PHÍM ẢO
let isConfigMode = false;
let selectedElementId = "all";
let padLayoutSettings = {};

function initVirtualGamepad() {
  setupKeyboardListeners();
  setupVirtualButtonEvents();
  initFloatingQuickMenu();
  loadGamepadConfig();

  const savedVpadPreset = localStorage.getItem("retrocloud_vpad_preset");
  if (savedVpadPreset === "xbox") applyVirtualPadPreset("xbox");

  document.getElementById("slider-pad-scale")?.addEventListener("input", (e) => {
    const val = e.target.value / 100;
    document.getElementById("val-pad-scale").innerText = `${e.target.value}%`;
    updateElementStyle(selectedElementId, "scale", val);
  });

  document.getElementById("slider-pad-opacity")?.addEventListener("input", (e) => {
    const val = e.target.value / 100;
    document.getElementById("val-pad-opacity").innerText = `${e.target.value}%`;
    updateElementStyle(selectedElementId, "opacity", val);
  });

  document.querySelectorAll(".pad-element").forEach(el => setupSmartDraggableElement(el));
}

function setupSmartDraggableElement(el) {
  let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
  let isDragging = false;

  const onStart = (e) => {
    if (!isConfigMode) return;
    selectPadElement(el.id);

    const point = e.touches ? e.touches[0] : e;
    startX = point.clientX;
    startY = point.clientY;

    const rect = el.getBoundingClientRect();
    const parentRect = el.offsetParent.getBoundingClientRect();
    initialLeft = rect.left - parentRect.left;
    initialTop = rect.top - parentRect.top;
    isDragging = true;

    const onMove = (mvEvent) => {
      if (!isDragging) return;
      const movePoint = mvEvent.touches ? mvEvent.touches[0] : mvEvent;
      const curLeft = initialLeft + (movePoint.clientX - startX);
      const curTop = initialTop + (movePoint.clientY - startY);
      const parentW = el.offsetParent.clientWidth;
      const parentH = el.offsetParent.clientHeight;

      if (curTop + el.offsetHeight / 2 > parentH / 2) {
        el.style.top = "auto";
        el.style.bottom = `${parentH - (curTop + el.offsetHeight)}px`;
      } else {
        el.style.bottom = "auto";
        el.style.top = `${curTop}px`;
      }

      if (curLeft + el.offsetWidth / 2 > parentW / 2) {
        el.style.left = "auto";
        el.style.right = `${parentW - (curLeft + el.offsetWidth)}px`;
      } else {
        el.style.right = "auto";
        el.style.left = `${curLeft}px`;
      }
    };

    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      if (!padLayoutSettings[el.id]) padLayoutSettings[el.id] = {};
      padLayoutSettings[el.id].top = el.style.top;
      padLayoutSettings[el.id].bottom = el.style.bottom;
      padLayoutSettings[el.id].left = el.style.left;
      padLayoutSettings[el.id].right = el.style.right;

      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  };

  el.addEventListener("mousedown", onStart);
  el.addEventListener("touchstart", onStart, { passive: false });
}

function toggleGamepadConfig(active) {
  isConfigMode = active;
  const configBar = document.getElementById("gamepad-config-bar");
  const overlay = document.getElementById("virtual-gamepad");

  if (configBar) configBar.style.display = active ? "flex" : "none";
  if (overlay) overlay.classList.toggle("is-editing", active);

  if (!active) {
    saveGamepadConfig();
    clearSelection();
  } else {
    selectPadElement("all");
  }
}

function selectPadElement(elementId) {
  selectedElementId = elementId;
  const targetLabel = document.getElementById("cfg-target-name");
  const sliderScale = document.getElementById("slider-pad-scale");
  const sliderOpacity = document.getElementById("slider-pad-opacity");

  document.querySelectorAll(".pad-element").forEach(el => el.classList.remove("is-selected"));

  if (elementId === "all") {
    if (targetLabel) targetLabel.innerText = "Toàn bộ phím";
    const curScale = padLayoutSettings["all"]?.scale || 1.0;
    const curOpacity = padLayoutSettings["all"]?.opacity || 0.8;
    if (sliderScale) sliderScale.value = curScale * 100;
    if (sliderOpacity) sliderOpacity.value = curOpacity * 100;
    document.getElementById("val-pad-scale").innerText = `${Math.round(curScale * 100)}%`;
    document.getElementById("val-pad-opacity").innerText = `${Math.round(curOpacity * 100)}%`;
  } else {
    const targetEl = document.getElementById(elementId);
    if (targetEl) {
      targetEl.classList.add("is-selected");
      if (targetLabel) targetLabel.innerText = targetEl.getAttribute("data-name") || elementId;
      const itemConf = padLayoutSettings[elementId] || {};
      const scale = itemConf.scale !== undefined ? itemConf.scale : (padLayoutSettings["all"]?.scale || 1.0);
      const opacity = itemConf.opacity !== undefined ? itemConf.opacity : (padLayoutSettings["all"]?.opacity || 0.8);
      if (sliderScale) sliderScale.value = scale * 100;
      if (sliderOpacity) sliderOpacity.value = opacity * 100;
      document.getElementById("val-pad-scale").innerText = `${Math.round(scale * 100)}%`;
      document.getElementById("val-pad-opacity").innerText = `${Math.round(opacity * 100)}%`;
    }
  }
}

function clearSelection() {
  document.querySelectorAll(".pad-element").forEach(el => el.classList.remove("is-selected"));
}

function updateElementStyle(id, prop, value) {
  if (id === "all") {
    if (!padLayoutSettings["all"]) padLayoutSettings["all"] = {};
    padLayoutSettings["all"][prop] = value;
    document.querySelectorAll(".pad-element").forEach(el => applySingleElementStyle(el.id));
  } else {
    if (!padLayoutSettings[id]) padLayoutSettings[id] = {};
    padLayoutSettings[id][prop] = value;
    applySingleElementStyle(id);
  }
}

function applySingleElementStyle(id) {
  const el = document.getElementById(id);
  if (!el) return;

  const itemConf = padLayoutSettings[id] || {};
  const globalConf = padLayoutSettings["all"] || { scale: 1.0, opacity: 0.8 };
  const scale = itemConf.scale !== undefined ? itemConf.scale : globalConf.scale;
  const opacity = itemConf.opacity !== undefined ? itemConf.opacity : globalConf.opacity;

  el.style.transform = `scale(${scale})`;
  el.style.opacity = opacity;

  if (itemConf.top) el.style.top = itemConf.top;
  if (itemConf.bottom) el.style.bottom = itemConf.bottom;
  if (itemConf.left) el.style.left = itemConf.left;
  if (itemConf.right) el.style.right = itemConf.right;
}

function saveGamepadConfig() {
  localStorage.setItem("retrocloud_custom_layout_v3", JSON.stringify(padLayoutSettings));
}

function loadGamepadConfig() {
  localStorage.removeItem("retrocloud_custom_layout_v2");
  localStorage.removeItem("retrocloud_pad_config");
  const saved = localStorage.getItem("retrocloud_custom_layout_v3");
  if (saved) {
    try {
      padLayoutSettings = JSON.parse(saved);
      document.querySelectorAll(".pad-element").forEach(el => applySingleElementStyle(el.id));
    } catch (e) {}
  }
}

function resetGamepadLayout() {
  localStorage.removeItem("retrocloud_custom_layout_v3");
  padLayoutSettings = {};
  document.querySelectorAll(".pad-element").forEach(el => {
    el.removeAttribute("style");
  });
  toggleGamepadConfig(false);
}

// =================================================================
// 9. QUẢN LÝ BỘ NHỚ LOCAL & CLOUD SAVES
// =================================================================
function openAccountModal() {
  const modal = document.getElementById("account-modal");
  if (!modal) return;
  const input = document.getElementById("input-username");
  if (input && userProfile) input.value = userProfile.username || "";
  modal.style.display = "flex";
  switchAccountTab("profile");
}

function closeAccountModal() {
  const modal = document.getElementById("account-modal");
  if (!modal) return;
  modal.style.display = "none";
}

function switchAccountTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn, idx) => {
    btn.classList.toggle("active",
      (tabName === 'profile' && idx === 0) || (tabName === 'roms' && idx === 1) || (tabName === 'saves' && idx === 2)
    );
  });
  document.getElementById("tab-profile")?.classList.toggle("active", tabName === "profile");
  document.getElementById("tab-roms")?.classList.toggle("active", tabName === "roms");
  document.getElementById("tab-saves")?.classList.toggle("active", tabName === "saves");

  if (tabName === "roms") renderLocalRoms();
  if (tabName === "saves") renderCloudSaves();
}

async function renderLocalRoms() {
  const listContainer = document.getElementById("local-roms-list");
  if (!listContainer) return;
  if (!window.idbKeyval) {
    listContainer.innerHTML = `<p class="empty-state">Trình duyệt không hỗ trợ IndexedDB.</p>`;
    return;
  }

  listContainer.innerHTML = `<p class="empty-state">Đang quét bộ nhớ thiết bị...</p>`;

  try {
    const keys = await window.idbKeyval.keys();
    const romKeys = keys.filter(k => typeof k === "string" && k.startsWith("rom_"));

    if (romKeys.length === 0) {
      listContainer.innerHTML = `<p class="empty-state">Chưa có ROM nào được lưu trong bộ nhớ máy.</p>`;
      return;
    }

    listContainer.innerHTML = "";
    for (const key of romKeys) {
      const data = await window.idbKeyval.get(key);
      let gameTitle = "Game chưa đặt tên";
      let systemTag = "ROM";
      let sizeMB = "0";

      if (data instanceof Blob) {
        sizeMB = (data.size / (1024 * 1024)).toFixed(1);
        gameTitle = key.replace("rom_", "");
      } else if (data && data.blob) {
        sizeMB = (data.blob.size / (1024 * 1024)).toFixed(1);
        gameTitle = data.title || "Game không tên";
        systemTag = data.core || "ROM";
      }

      const item = document.createElement("div");
      item.className = "storage-item";
      item.innerHTML = `
        <div class="storage-item-info">
          <span class="storage-item-name">🎮 ${gameTitle}</span>
          <span class="storage-item-meta">Hệ máy: <strong>${systemTag}</strong> • Dung lượng: ${sizeMB} MB</span>
        </div>
        <button class="btn-delete" onclick="deleteLocalRom('${key}')">Xóa bộ nhớ</button>
      `;
      listContainer.appendChild(item);
    }
  } catch (err) {
    listContainer.innerHTML = `<p class="empty-state">Lỗi quét dữ liệu: ${err.message}</p>`;
  }
}

async function deleteLocalRom(key) {
  if (!confirm("Bạn có chắc chắn muốn xóa ROM này khỏi bộ nhớ máy?")) return;
  await window.idbKeyval.del(key);
  renderLocalRoms();
}

async function renderCloudSaves() {
  const listContainer = document.getElementById("cloud-saves-list");
  if (!listContainer) return;
  if (!currentUser) {
    listContainer.innerHTML = `<p class="empty-state">Vui lòng đăng nhập để xem file lưu đám mây.</p>`;
    return;
  }

  listContainer.innerHTML = `<p class="empty-state">Đang tải danh sách save...</p>`;

  try {
    const { data: saves, error } = await supabaseClient
      .from("user_saves")
      .select("id, slot, file_path, file_size, updated_at, games(title)")
      .eq("user_id", currentUser.id)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    if (!saves || saves.length === 0) {
      listContainer.innerHTML = `<p class="empty-state">Bạn chưa có file lưu nào trên Đám Mây.</p>`;
      return;
    }

    listContainer.innerHTML = "";
    saves.forEach(save => {
      const gameTitle = save.games?.title || "Game Tự Nạp / Local";
      const sizeKB = save.file_size ? (save.file_size / 1024).toFixed(1) : "--";
      const date = new Date(save.updated_at).toLocaleString("vi-VN");

      const item = document.createElement("div");
      item.className = "storage-item";
      item.innerHTML = `
        <div class="storage-item-info">
          <span class="storage-item-name">${gameTitle} — <strong style="color:var(--accent-cyan);">Slot ${save.slot}</strong></span>
          <span class="storage-item-meta">${sizeKB} KB • Cập nhật: ${date}</span>
        </div>
        <button class="btn-delete" onclick="deleteCloudSave('${save.id}', '${save.file_path}')">Xóa Save</button>
      `;
      listContainer.appendChild(item);
    });
  } catch (err) {
    listContainer.innerHTML = `<p class="empty-state">Lỗi tải Save: ${err.message}</p>`;
  }
}

async function deleteCloudSave(saveId, filePath) {
  if (!confirm("Bạn có chắc chắn muốn xóa bản lưu này trên đám mây? Dữ liệu không thể phục hồi!")) return;
  try {
    const { error: storageErr } = await supabaseClient.storage.from("SaveGame").remove([filePath]);
    if (storageErr) console.warn("Lỗi xóa file storage:", storageErr.message);

    const { error: dbErr } = await supabaseClient.from("user_saves").delete().eq("id", saveId);
    if (dbErr) throw dbErr;

    renderCloudSaves();
  } catch (err) {
    alert("Xóa bản lưu thất bại: " + err.message);
  }
}

// =================================================================
// 10. GẮN HÀM WINDOW & KHỞI CHẠY HỆ THỐNG
// =================================================================
window.launchGameWithCache = launchGameWithCache;
window.saveToCloud = saveToCloud;
window.loadFromCloud = loadFromCloud;
window.loginWithGoogle = loginWithGoogle;
window.logout = logout;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.toggleAuthMode = toggleAuthMode;
window.handleEmailAuth = handleEmailAuth;
window.saveUsername = saveUsername;
window.openAccountModal = openAccountModal;
window.closeAccountModal = closeAccountModal;
window.switchAccountTab = switchAccountTab;
window.deleteLocalRom = deleteLocalRom;
window.deleteCloudSave = deleteCloudSave;
window.openNetplayModal = openNetplayModal;
window.closeNetplayModal = closeNetplayModal;
window.npShowHostSelect = npShowHostSelect;
window.npBackToSelect = npBackToSelect;
window.filterHostGames = filterHostGames;
window.filterGuestGames = filterGuestGames;
window.hostConfirmCreateLobby = hostConfirmCreateLobby;
window.cancelNetplayLobby = cancelNetplayLobby;
window.npShowGuestInput = npShowGuestInput;
window.clientJoinLobby = clientJoinLobby;
window.copyRoomCode = copyRoomCode;
window.resetGamepadLayout = resetGamepadLayout;
window.toggleGamepadConfig = toggleGamepadConfig;
window.openKeymapModal = openKeymapModal;
window.closeKeymapModal = closeKeymapModal;
window.switchKeymapTab = switchKeymapTab;
window.listenForNewKey = listenForNewKey;
window.resetCurrentKeymap = resetCurrentKeymap;
window.applyVirtualPadPreset = applyVirtualPadPreset;
window.toggleVirtualGamepad = toggleVirtualGamepad;
window.toggleFullscreen = toggleFullscreen;

window.addEventListener("DOMContentLoaded", () => {
  initAuth();
  loadGamesFromSupabase();
  initVirtualGamepad();
});