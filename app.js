// =================================================================
// 1. CẤU HÌNH SUPABASE CLIENT
// =================================================================
const SUPABASE_URL = "https://kmypjbgjvkkbmyaomhrt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtteXBqYmdqdmtrYm15YW9taHJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyOTQxMjgsImV4cCI6MjEwNDg3MDEyOH0.LehadH5EP9rtre0Ielz4U3kuQ8wE6rZMw_yjg6iS_kw";

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Biến trạng thái toàn cục (State)
let currentUser = null;
let currentGame = {
  id: null,
  title: null,
  core: null,
  isLocal: false
};

// =================================================================
// 2. KHỞI TẠO VÀ CHẠY EMULATORJS
// =================================================================
function startEmulator(core, romSource, gameTitle = "Retro Game") {
  const container = document.getElementById("game-container");
  const placeholder = document.getElementById("game-placeholder");
  if (placeholder) placeholder.style.display = "none";

  container.innerHTML = '<div id="game"></div>';

  window.EJS_player = "#game";
  window.EJS_core = core;
  window.EJS_gameName = gameTitle;
  window.EJS_gameUrl = romSource;
  window.EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";
  window.EJS_startOnLoaded = true;

  // ================= VÔ HIỆU HÓA CÁC NÚT SAVE / LOAD MẶC ĐỊNH =================
  const noSaveButtons = {
    playPause: true,
    restart: true,
    mute: true,
    volume: true,
    settings: true,
    fullscreen: true,
    gamepad: true,
    // Tắt toàn bộ tính năng lưu/nạp mặc định
    saveState: false,
    loadState: false,
    quickSave: false,
    quickLoad: false,
    saveSavFiles: false,
    loadSavFiles: false,
    cacheManager: false
  };

  const oldScript = document.getElementById("ejs-loader");
  if (oldScript) oldScript.remove();

  const script = document.createElement("script");
  script.id = "ejs-loader";
  script.src = "https://cdn.emulatorjs.org/stable/data/loader.js";
  document.body.appendChild(script);
  window.EJS_buttons = noSaveButtons;
  window.EJS_defaultButtons = noSaveButtons;
  updateSaveSlotUI();
}

// =================================================================
// 3. TỰ NẠP FILE ROM CỤC BỘ (KÉO THẢ / FILE API)
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
    isLocal: true
  };

  const blobUrl = URL.createObjectURL(file);
  startEmulator(currentGame.core, blobUrl, file.name);
}

if (fileInput) {
  fileInput.addEventListener("change", (e) => handleFileSelection(e.target.files[0]));
}

if (dropZone) {
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  });
}

// =================================================================
// 4. QUẢN LÝ THƯ VIỆN GAME & BỘ LỌC (SEARCH / FILTER)
// =================================================================
let allGamesList = [];       // Cache toàn bộ danh sách game
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

// Khởi tạo sự kiện tìm kiếm và nút lọc hệ máy
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

// Lọc và hiển thị thẻ game
function renderFilteredGames() {
  const grid = document.getElementById("game-grid");
  if (!grid) return;

  const filtered = allGamesList.filter((game) => {
    // Lọc theo hệ máy (so khớp core hoặc system)
    const matchSystem = 
      currentFilterSystem === "ALL" || 
      game.core?.toUpperCase() === currentFilterSystem ||
      game.system?.toUpperCase() === currentFilterSystem;

    // Lọc theo tên tìm kiếm
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
      if (game.rom_url) {
        launchGameWithCache(game.id, game.core, game.rom_url, game.title);
      } else {
        alert("Game này cần bạn tự nạp file ROM từ máy tính.");
      }
    };
    grid.appendChild(card);
  });
}
// =================================================================
// 5. SUPABASE AUTH (QUẢN LÝ TÀI KHOẢN)
// =================================================================
// Biến lưu trữ hồ sơ người chơi
let userProfile = null;

async function initAuth() {
  if (!supabaseClient) return;

  const { data: { session } } = await supabaseClient.auth.getSession();
  currentUser = session ? session.user : null;
  
  if (currentUser) {
    await fetchUserProfile();
  }
  renderAuthUI();

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session ? session.user : null;
    if (currentUser) {
      await fetchUserProfile();
    } else {
      userProfile = null;
    }
    renderAuthUI();
    updateSaveSlotUI();
  });
}

// Lấy thông tin từ bảng profiles
async function fetchUserProfile() {
  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", currentUser.id)
      .single();

    if (!error && data) {
      userProfile = data;
    }
  } catch (err) {
    console.warn("Chưa lấy được profile:", err.message);
  }
}

// Hiển thị UI có gắn nút chỉnh sửa Nickname
function renderAuthUI() {
  const authContainer = document.getElementById("auth-container");
  if (!authContainer) return;

  if (currentUser) {
    const displayName = (userProfile && userProfile.username) 
      ? userProfile.username 
      : currentUser.email.split("@")[0];

    authContainer.innerHTML = `
      <div class="user-badge">
        <span style="font-size:0.85rem; font-weight:600; color:var(--accent-color);">🎮 ${displayName}</span>
        <button class="btn-edit" title="Đổi Nickname" onclick="openProfileModal('${displayName}')">✏️</button>
      </div>
      <button class="btn btn-secondary" onclick="logout()">Đăng xuất</button>
    `;
  } else {
    authContainer.innerHTML = `
      <button class="btn btn-primary" onclick="loginWithGoogle()">Đăng nhập Google</button>
    `;
  }
}

// Điều khiển Modal
function openProfileModal(currentName) {
  const modal = document.getElementById("profile-modal");
  const input = document.getElementById("input-username");
  if (input) input.value = currentName || "";
  if (modal) modal.style.display = "flex";
}

function closeProfileModal() {
  const modal = document.getElementById("profile-modal");
  if (modal) modal.style.display = "none";
}

// Cập nhật Nickname vào database
async function saveUsername() {
  const input = document.getElementById("input-username");
  const newName = input ? input.value.trim() : "";

  if (!newName) {
    alert("Nickname không được để trống!");
    return;
  }
  if (newName.length < 3) {
    alert("Nickname phải có tối thiểu 3 ký tự!");
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("profiles")
      .update({ username: newName, updated_at: new Date().toISOString() })
      .eq("id", currentUser.id);

    if (error) throw error;

    if (!userProfile) userProfile = {};
    userProfile.username = newName;

    closeProfileModal();
    renderAuthUI();
    alert("Cập nhật Nickname thành công!");

  } catch (err) {
    alert("Không thể lưu Nickname: " + err.message);
  }
}

// =================================================================
// 6. CLOUD SAVE & LOAD (ĐÃ SỬA CHUẨN API EMULATORJS)
// =================================================================
async function saveToCloud(slotNumber) {
  if (!currentUser) {
    alert("Vui lòng đăng nhập để sử dụng tính năng Lưu đám mây!");
    return;
  }
  if (!currentGame.id) {
    alert("Chưa có game nào đang chạy để lưu.");
    return;
  }
  
  const gm = window.EJS_emulator?.gameManager;
  if (!gm) {
    alert("Trình giả lập chưa sẵn sàng.");
    return;
  }

  try {
    // 1. Lấy dữ liệu save từ EmulatorJS (hỗ trợ cả getSave và getState)
    let saveBinary = null;
    if (typeof gm.getSave === "function") {
      saveBinary = await gm.getSave();
    } else if (typeof gm.getState === "function") {
      saveBinary = await gm.getState();
    }

    if (!saveBinary || saveBinary.length === 0) {
      alert("Không tìm thấy dữ liệu lưu! Hãy chắc chắn bạn đã vào menu trong game để bấm SAVE trước.");
      return;
    }

    const filePath = `${currentUser.id}/${currentGame.id}_slot${slotNumber}.sav`;

    // 2. Upload file nhị phân lên bucket 'SaveGame'
    const { error: uploadError } = await supabaseClient.storage
      .from("SaveGame")
      .upload(filePath, saveBinary, {
        contentType: "application/octet-stream",
        upsert: true
      });

    if (uploadError) throw uploadError;

    // 3. Cập nhật vào bảng user_saves
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
    console.error("Lỗi khi lưu save:", err);
    alert("Lưu thất bại: " + err.message);
  }
}

async function loadFromCloud(slotNumber) {
  if (!currentUser) {
    alert("Vui lòng đăng nhập để tải dữ liệu lưu!");
    return;
  }
  if (!currentGame.id) {
    alert("Hãy mở game trước khi tải file lưu.");
    return;
  }

  const gm = window.EJS_emulator?.gameManager;
  if (!gm) {
    alert("Trình giả lập chưa sẵn sàng.");
    return;
  }

  try {
    const filePath = `${currentUser.id}/${currentGame.id}_slot${slotNumber}.sav`;

    // 1. Tải file từ Supabase Storage bucket 'SaveGame'
    const { data, error } = await supabaseClient.storage.from("SaveGame").download(filePath);
    if (error) throw new Error("Chưa có bản lưu nào ở Slot này.");

    // 2. Chuyển dữ liệu sang mảng Byte (Uint8Array)
    const arrayBuffer = await data.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // 3. Nạp vào EmulatorJS bằng hàm loadSave chuẩn
    if (typeof gm.loadSave === "function") {
      gm.loadSave(uint8Array);
    } else if (typeof gm.loadState === "function") {
      gm.loadState(uint8Array);
    } else {
      throw new Error("Phiên bản EmulatorJS này không hỗ trợ API nạp save trực tiếp.");
    }

    // Khởi động lại core để nạp dữ liệu save mới
    if (typeof gm.restart === "function") {
      gm.restart();
    }

    alert(`✅ Đã nạp dữ liệu [Slot ${slotNumber}] thành công!`);

  } catch (err) {
    console.error("Lỗi tải save:", err);
    alert("Tải file lưu thất bại: " + err.message);
  }
}
async function updateSaveSlotUI() {
  const savePanel = document.getElementById("cloud-save-panel");
  if (!savePanel) return;

  if (!currentUser || !currentGame.id) {
    savePanel.style.display = "none";
    return;
  }

  savePanel.style.display = "flex";
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
    console.warn("Không thể ghi log lịch sử chơi:", e);
  }
}

// =================================================================
// 7. HỆ THỐNG NETPLAY ONLINE (P2P WEBRTC + SUPABASE BROADCAST)
// =================================================================

let peerConnection = null;
let dataChannel = null;
let roomChannel = null;
let isHostPlayer = false;

// Cấu hình Google STUN miễn phí cho mạng WAN (Internet công cộng)
const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

// Phím mặc định cho Player 2 trên EmulatorJS
// Host sẽ nhận tín hiệu từ Guest và kích hoạt các phím này
const PLAYER2_KEYMAP = {
  "KeyW": "KeyI",       // Lên
  "KeyS": "KeyK",       // Xuống
  "KeyA": "KeyJ",       // Trái
  "KeyD": "KeyL",       // Phải
  "KeyU": "KeyY",       // Nút A / Tròn
  "KeyJ": "KeyU",       // Nút B / Vuông
  "KeyI": "KeyO",       // Nút X / Tam giác
  "KeyK": "KeyP",       // Nút Y / X
  "Enter": "Digit7",    // Start
  "ShiftRight": "Digit8"// Select
};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 1. TẠO PHÒNG ONLINE (DÀNH CHO HOST)
const btnCreateRoom = document.getElementById("btn-create-room");
if (btnCreateRoom) {
  btnCreateRoom.addEventListener("click", async () => {
    if (!currentUser) {
      alert("Vui lòng đăng nhập tài khoản để tạo phòng Online!");
      openAuthModal();
      return;
    }

    if (!currentGame.id) {
      alert("Hãy chọn và mở một tựa game trước khi tạo phòng!");
      return;
    }

    isHostPlayer = true;
    const roomId = generateRoomCode();
    prompt("Mã phòng của bạn (Gửi mã này cho bạn bè):", roomId);

    initSupabaseSignaling(roomId, true);
  });
}

// 2. VÀO PHÒNG ONLINE (DÀNH CHO GUEST)
const btnJoinRoom = document.getElementById("btn-join-room");
const roomInput = document.getElementById("room-input");
if (btnJoinRoom) {
  btnJoinRoom.addEventListener("click", async () => {
    if (!currentUser) {
      alert("Vui lòng đăng nhập tài khoản để vào phòng Online!");
      openAuthModal();
      return;
    }

    const roomId = roomInput.value.trim().toUpperCase();
    if (!roomId) {
      alert("Vui lòng nhập mã phòng!");
      return;
    }

    isHostPlayer = false;
    initSupabaseSignaling(roomId, false);
  });
}

// 3. KHỞI TẠO BẮT TAY QUA SUPABASE REALTIME BROADCAST (0 IOPS, KHÔNG DÙNG DB)
function initSupabaseSignaling(roomId, isHost) {
  if (roomChannel) supabaseClient.removeChannel(roomChannel);

  // Kênh ảo ephemeral, không tốn dung lượng cơ sở dữ liệu
  roomChannel = supabaseClient.channel(`room_${roomId}`, {
    config: { broadcast: { self: false } }
  });

  roomChannel
    .on("broadcast", { event: "signal" }, async ({ payload }) => {
      await handleIncomingSignal(payload);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setupPeerConnection(isHost);
        if (!isHost) {
          // Guest phát tín hiệu đã vào phòng để Host tạo Offer
          roomChannel.send({
            type: "broadcast",
            event: "signal",
            payload: { type: "guest_ready", guestName: userProfile?.username || currentUser.email }
          });
        }
      }
    });
}

// 4. THIẾT LẬP KẾT NỐI WEBRTC TRỰC TIẾP GIỮA 2 MÁY
function setupPeerConnection(isHost) {
  peerConnection = new RTCPeerConnection(rtcConfig);

  // Gửi ICE Candidate cho đối phương qua Supabase Broadcast
  peerConnection.onicecandidate = (e) => {
    if (e.candidate && roomChannel) {
      roomChannel.send({
        type: "broadcast",
        event: "signal",
        payload: { type: "candidate", candidate: e.candidate }
      });
    }
  };

  if (isHost) {
    // HOST: Bắt khung hình và âm thanh từ Canvas giả lập để stream sang Guest
    const canvas = document.querySelector("#game canvas");
    if (canvas) {
      const stream = canvas.captureStream(60); // 60 FPS mượt mà
      stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
    }

    // Mở DataChannel để nhận phím từ Guest
    dataChannel = peerConnection.createDataChannel("gamepad");
    dataChannel.onmessage = (e) => {
      const { type, code } = JSON.parse(e.data);
      injectPlayer2Input(type, code);
    };

    dataChannel.onopen = () => alert("🎮 Bạn bè đã kết nối! Bắt đầu chơi chế độ 2 người.");
  } else {
    // GUEST: Nhận luồng video/audio từ Host và hiển thị lên màn hình
    peerConnection.ontrack = (e) => {
      renderRemoteVideo(e.streams[0]);
    };

    peerConnection.ondatachannel = (e) => {
      dataChannel = e.channel;
      dataChannel.onopen = () => {
        alert("🎮 Đã kết nối với máy Host! Dùng phím W/A/S/D và U/I/O/J để điều khiển.");
        bindGuestInputListeners();
      };
    };
  }
}

// 5. XỬ LÝ TÍN HIỆU SDP & ICE
async function handleIncomingSignal(data) {
  if (data.type === "guest_ready" && isHostPlayer) {
    // Khi Guest sẵn sàng, Host tạo Offer kết nối
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    roomChannel.send({
      type: "broadcast",
      event: "signal",
      payload: { type: "offer", sdp: offer }
    });
  } else if (data.type === "offer" && !isHostPlayer) {
    // Guest nhận Offer, tạo Answer phản hồi
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    roomChannel.send({
      type: "broadcast",
      event: "signal",
      payload: { type: "answer", sdp: answer }
    });
  } else if (data.type === "answer" && isHostPlayer) {
    // Host nhận Answer và khóa chu kỳ bắt tay
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
  } else if (data.type === "candidate" && peerConnection) {
    // Bổ sung thông tin tuyến mạng
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (err) {
      console.warn("Lỗi ICE Candidate:", err);
    }
  }
}

// 6. GUEST: HIỂN THỊ MÀN HÌNH CHƠI TỪ HOST
function renderRemoteVideo(mediaStream) {
  const container = document.getElementById("game-container");
  const placeholder = document.getElementById("game-placeholder");
  if (placeholder) placeholder.style.display = "none";

  container.innerHTML = `
    <video id="remote-stream-video" autoplay playsinline 
      style="width:100%; height:100%; object-fit:contain; background:#000;">
    </video>
  `;

  const video = document.getElementById("remote-stream-video");
  video.srcObject = mediaStream;
}

// 7. GUEST: BẮT PHÍM BẤM VÀ TRUYỀN SANG HOST QUA WEBRTC DATACHANNEL
function bindGuestInputListeners() {
  const sendKey = (type, code) => {
    if (dataChannel && dataChannel.readyState === "open") {
      dataChannel.send(JSON.stringify({ type, code }));
    }
  };

  window.addEventListener("keydown", (e) => {
    if (["KeyW", "KeyA", "KeyS", "KeyD", "KeyU", "KeyI", "KeyO", "KeyJ", "Enter"].includes(e.code)) {
      sendKey("keydown", e.code);
    }
  });

  window.addEventListener("keyup", (e) => {
    if (["KeyW", "KeyA", "KeyS", "KeyD", "KeyU", "KeyI", "KeyO", "KeyJ", "Enter"].includes(e.code)) {
      sendKey("keyup", e.code);
    }
  });
}

// 8. HOST: MÔ PHỎNG PHÍM PLAYER 2 ĐƯA VÀO GIẢ LẬP
function injectPlayer2Input(type, incomingCode) {
  const targetCode = PLAYER2_KEYMAP[incomingCode] || incomingCode;
  
  // Phát trực tiếp sự kiện phím vào Canvas của EmulatorJS
  const event = new KeyboardEvent(type, {
    code: targetCode,
    bubbles: true,
    cancelable: true
  });

  const canvas = document.querySelector("#game canvas") || window;
  canvas.dispatchEvent(event);
}
// =================================================================
// 8. KHỞI CHẠY HỆ THỐNG
// =================================================================
window.addEventListener("DOMContentLoaded", () => {
  initAuth();
  loadGamesFromSupabase();
});
let isSignUpMode = false;

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
    title.innerText = "Đăng Ký Tài Khoản";
    submitBtn.innerText = "Đăng ký";
    submitBtn.setAttribute("onclick", "handleEmailAuth('signup')");
    toggleBtn.innerText = "Đã có tài khoản? Đăng nhập";
  } else {
    title.innerText = "Đăng Nhập Game Thủ";
    submitBtn.innerText = "Đăng nhập";
    submitBtn.setAttribute("onclick", "handleEmailAuth('login')");
    toggleBtn.innerText = "Chưa có tài khoản? Đăng ký ngay";
  }
}

async function handleEmailAuth(mode) {
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value.trim();

  if (!email || !password) {
    alert("Vui lòng điền đầy đủ email và mật khẩu.");
    return;
  }

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

// Cập nhật lại nút hiển thị khi chưa đăng nhập
function renderAuthUI() {
  const authContainer = document.getElementById("auth-container");
  if (!authContainer) return;

  if (currentUser) {
    const displayName = (userProfile && userProfile.username) 
      ? userProfile.username 
      : currentUser.email.split("@")[0];

    authContainer.innerHTML = `
      <div class="user-badge">
        <span style="font-size:0.85rem; font-weight:600; color:var(--accent-color);">🎮 ${displayName}</span>
        <button class="btn-edit" title="Đổi Nickname" onclick="openProfileModal('${displayName}')">✏️</button>
      </div>
      <button class="btn btn-secondary" onclick="logout()">Đăng xuất</button>
    `;
  } else {
    authContainer.innerHTML = `
      <button class="btn btn-primary" onclick="openAuthModal()">Đăng nhập / Đăng ký</button>
    `;
  }
}
// ================= BỔ SUNG HÀM ĐĂNG NHẬP GOOGLE & ĐĂNG XUẤT =================
async function loginWithGoogle() {
  if (!supabaseClient) {
    alert("Chưa kết nối được với Supabase. Hãy kiểm tra lại URL và Key!");
    return;
  }

  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin // Tự động chuyển hướng về lại trang web sau khi đăng nhập
      }
    });

    if (error) throw error;
  } catch (err) {
    console.error("Lỗi đăng nhập Google:", err);
    alert("Lỗi đăng nhập Google: " + err.message);
  }
}
// Hàm tải dữ liệu kèm theo dõi tiến độ % chi tiết
async function fetchWithProgress(url, onProgress) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Lỗi tải (${response.status}): ${response.statusText}`);
  }

  // Lấy tổng dung lượng file từ Header (nếu server có cung cấp)
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

    // Bắn sự kiện cập nhật giao diện
    if (onProgress) {
      onProgress(receivedBytes, totalBytes);
    }
  }

  // Ghép các mảng dữ liệu lại thành 1 file Blob hoàn chỉnh
  return new Blob(chunks);
}

// Nâng cấp hàm mở game: Có hiển thị thanh phần trăm tải
async function launchGameWithCache(gameId, core, romUrl, gameTitle) {
  currentGame = { id: gameId, title: gameTitle, core: core, isLocal: false };
  const container = document.getElementById("game-container");
  const placeholder = document.getElementById("game-placeholder");
  if (placeholder) placeholder.style.display = "none";

  try {
    let romBlob = null;

    // 1. Kiểm tra cache trong IndexedDB
    if (window.idbKeyval) {
      const cached = await window.idbKeyval.get(`rom_${gameId}`);
      // Tương thích cả bản lưu cũ (Blob) và bản lưu mới (Object có title)
      if (cached instanceof Blob) {
        romBlob = cached;
      } else if (cached && cached.blob) {
        romBlob = cached.blob;
      }
    }

    if (romBlob) {
      console.log("⚡ Đã có trong máy, nạp ngay lập tức!");
      container.innerHTML = `
        <div class="loading-box">
          <div class="loading-title">⚡ Đang nạp ${gameTitle} từ bộ nhớ máy...</div>
        </div>
      `;
    } else {
      console.log("🌐 Đang tải game từ internet...");
      container.innerHTML = `
        <div class="loading-box">
          <div class="loading-title">Đang tải: <span style="color:var(--accent-cyan);">${gameTitle}</span></div>
          <div class="progress-track">
            <div class="progress-fill" id="download-progress-bar"></div>
          </div>
          <div class="loading-stats">
            <span id="download-size">Đang kết nối...</span>
            <span class="loading-percent" id="download-percent">0%</span>
          </div>
        </div>
      `;

      const progressBar = document.getElementById("download-progress-bar");
      const sizeText = document.getElementById("download-size");
      const percentText = document.getElementById("download-percent");

      romBlob = await fetchWithProgress(romUrl, (received, total) => {
        const receivedMB = (received / (1024 * 1024)).toFixed(1);
        if (total > 0) {
          const totalMB = (total / (1024 * 1024)).toFixed(1);
          const percent = Math.min(100, Math.round((received / total) * 100));
          progressBar.style.width = `${percent}%`;
          percentText.innerText = `${percent}%`;
          sizeText.innerText = `${receivedMB} MB / ${totalMB} MB`;
        } else {
          sizeText.innerText = `Đã nạp: ${receivedMB} MB`;
          percentText.innerText = "Đang tải...";
        }
      });

      // LƯU CẢ FILE BLOB LẪN TÊN GAME VÀO INDEXEDDB
      if (window.idbKeyval) {
        await window.idbKeyval.set(`rom_${gameId}`, {
          blob: romBlob,
          title: gameTitle,
          core: core.toUpperCase(),
          savedAt: new Date().toLocaleDateString("vi-VN")
        });
        console.log("💾 Đã lưu ROM và Metadata vào IndexedDB.");
      }
    }

    const blobUrl = URL.createObjectURL(romBlob);
    startEmulator(core, blobUrl, gameTitle);
    recordPlayHistory(gameId);

  } catch (error) {
    console.error("Lỗi khi nạp game:", error);
    container.innerHTML = `
      <div style="color:#ff5555; text-align:center; padding: 2rem;">
        <p>❌ Không thể tải trò chơi!</p>
        <small>${error.message}</small>
      </div>
    `;
  }
}
// =================================================================
// QUẢN LÝ ACCOUNT DASHBOARD (LOCAL ROMS & CLOUD SAVES)
// =================================================================

function openAccountModal() {
  const modal = document.getElementById("account-modal");
  if (!modal) return;
  
  const input = document.getElementById("input-username");
  if (input && userProfile) {
    input.value = userProfile.username || "";
  }
  
  modal.style.display = "flex";
  switchAccountTab("profile");
}

function closeAccountModal() {
  const modal = document.getElementById("account-modal");
  if (modal) modal.style.display = "none";
}

function switchAccountTab(tabName) {
  // Đổi active button
  document.querySelectorAll(".tab-btn").forEach((btn, idx) => {
    btn.classList.toggle("active", 
      (tabName === 'profile' && idx === 0) ||
      (tabName === 'roms' && idx === 1) ||
      (tabName === 'saves' && idx === 2)
    );
  });

  // Đổi active content
  document.getElementById("tab-profile").classList.toggle("active", tabName === "profile");
  document.getElementById("tab-roms").classList.toggle("active", tabName === "roms");
  document.getElementById("tab-saves").classList.toggle("active", tabName === "saves");

  if (tabName === "roms") renderLocalRoms();
  if (tabName === "saves") renderCloudSaves();
}

// 1. Quét & hiển thị ROM trong IndexedDB
async function renderLocalRoms() {
  const listContainer = document.getElementById("local-roms-list");
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

      // Kiểm tra cấu trúc dữ liệu lưu trong IndexedDB
      if (data instanceof Blob) {
        sizeMB = (data.size / (1024 * 1024)).toFixed(1);
        gameTitle = key.replace("rom_", ""); // Bản lưu cũ chưa có metadata
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

// Xóa ROM khỏi IndexedDB
async function deleteLocalRom(key) {
  if (!confirm("Bạn có chắc chắn muốn xóa ROM này khỏi bộ nhớ máy? Lần sau chơi sẽ cần tải lại.")) return;
  
  await window.idbKeyval.del(key);
  renderLocalRoms();
}

// 2. Lấy & hiển thị file Save trên Supabase
async function renderCloudSaves() {
  const listContainer = document.getElementById("cloud-saves-list");
  if (!currentUser) {
    listContainer.innerHTML = `<p class="empty-state">Vui lòng đăng nhập để xem các file save đám mây.</p>`;
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
      listContainer.innerHTML = `<p class="empty-state">Bạn chưa có file lưu tiến trình nào trên Đám Mây.</p>`;
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

// Xóa Save khỏi Storage bucket 'SaveGame' và Database table 'user_saves'
async function deleteCloudSave(saveId, filePath) {
  if (!confirm("Bạn có chắc chắn muốn xóa bản lưu này trên đám mây? Dữ liệu không thể phục hồi!")) return;

  try {
    // 1. Xóa file trong bucket SaveGame
    const { error: storageErr } = await supabaseClient.storage.from("SaveGame").remove([filePath]);
    if (storageErr) console.warn("Lỗi xóa file storage:", storageErr.message);

    // 2. Xóa bản ghi trong database
    const { error: dbErr } = await supabaseClient.from("user_saves").delete().eq("id", saveId);
    if (dbErr) throw dbErr;

    renderCloudSaves();
  } catch (err) {
    alert("Xóa bản lưu thất bại: " + err.message);
  }
}

// Cập nhật lại nút mở Modal trên thanh Header
function renderAuthUI() {
  const authContainer = document.getElementById("auth-container");
  if (!authContainer) return;

  if (currentUser) {
    const displayName = (userProfile && userProfile.username) 
      ? userProfile.username 
      : currentUser.email.split("@")[0];

    authContainer.innerHTML = `
      <div class="user-badge" style="cursor:pointer;" onclick="openAccountModal()" title="Mở Quản Lý Tài Khoản">
        <span style="font-size:0.85rem; font-weight:600; color:var(--accent-cyan);">🎮 ${displayName}</span>
        <button class="btn-edit">⚙️</button>
      </div>
      <button class="btn btn-secondary" onclick="logout()">Đăng xuất</button>
    `;
  } else {
    authContainer.innerHTML = `
      <button class="btn btn-primary" onclick="openAuthModal()">Đăng nhập / Đăng ký</button>
    `;
  }
}

// Gắn hàm vào window để gọi từ HTML
window.openAccountModal = openAccountModal;
window.closeAccountModal = closeAccountModal;
window.switchAccountTab = switchAccountTab;
window.deleteLocalRom = deleteLocalRom;
window.deleteCloudSave = deleteCloudSave;
async function logout() {
  if (!supabaseClient) return;
  
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    alert("Lỗi khi đăng xuất: " + error.message);
  } else {
    // Làm mới trang để xóa sạch trạng thái phiên đăng nhập cũ
    window.location.reload();
  }
}

// Gắn trực tiếp vào window để đảm bảo nút bấm HTML luôn gọi được
window.loginWithGoogle = loginWithGoogle;
window.logout = logout;