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
// 4. LẤY DANH SÁCH GAME TỪ SUPABASE
// =================================================================
async function loadGamesFromSupabase() {
  const grid = document.getElementById("game-grid");
  if (!grid) return;

  if (!supabaseClient) {
    grid.innerHTML = `<p style="color:red">Chưa khởi tạo được Supabase Client.</p>`;
    return;
  }

  try {
    const { data: games, error } = await supabaseClient.from("games").select("*");
    if (error) throw error;

    if (!games || games.length === 0) {
      grid.innerHTML = "<p>Database chưa có game nào. Hãy thêm vào bảng 'games' trên Supabase.</p>";
      return;
    }

    grid.innerHTML = "";
    games.forEach((game) => {
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
  } catch (err) {
    console.error("Lỗi Supabase:", err);
    grid.innerHTML = `<p style="color:#ff5555">Lỗi kết nối database: ${err.message}</p>`;
  }
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
// 7. TÍNH NĂNG PHÒNG CHƠI ONLINE (NETPLAY SIGNALING)
// =================================================================
const btnCreateRoom = document.getElementById("btn-create-room");
const btnJoinRoom = document.getElementById("btn-join-room");
const roomInput = document.getElementById("room-input");

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

if (btnCreateRoom) {
  btnCreateRoom.addEventListener("click", async () => {
    if (!supabaseClient) return;
    const roomId = generateRoomCode();
    const { error } = await supabaseClient.from("rooms").insert([
      { id: roomId, host_peer_id: "HOST_" + roomId, status: "waiting" }
    ]);

    if (error) {
      alert("Lỗi khi tạo phòng: " + error.message);
      return;
    }

    alert(`Tạo phòng thành công!\nMã phòng: ${roomId}\nGửi mã này cho bạn bè.`);
    listenRoomChannel(roomId);
  });
}

if (btnJoinRoom) {
  btnJoinRoom.addEventListener("click", async () => {
    if (!supabaseClient || !roomInput) return;
    const roomId = roomInput.value.trim().toUpperCase();
    if (!roomId) return alert("Vui lòng nhập mã phòng!");

    const { data, error } = await supabaseClient.from("rooms").select("*").eq("id", roomId).single();
    if (error || !data) {
      alert("Phòng không tồn tại hoặc đã đóng.");
      return;
    }

    await supabaseClient.from("rooms").update({ guest_peer_id: "GUEST_" + roomId, status: "playing" }).eq("id", roomId);
    alert(`Đã vào phòng ${roomId}! Chuẩn bị kết nối...`);
    listenRoomChannel(roomId);
  });
}

function listenRoomChannel(roomId) {
  if (!supabaseClient) return;
  supabaseClient
    .channel(`room_${roomId}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, (payload) => {
      console.log("Cập nhật phòng:", payload.new);
      if (payload.new.status === "playing") {
        console.log("Hai người chơi đã sẵn sàng kết nối P2P!");
      }
    })
    .subscribe();
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

    // 1. Kiểm tra cache IndexedDB trong máy trước
    if (window.idbKeyval) {
      romBlob = await window.idbKeyval.get(`rom_${gameId}`);
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
      
      // Khởi tạo khung giao diện thanh tiến trình
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

      // Tải game và cập nhật giao diện liên tục
      romBlob = await fetchWithProgress(romUrl, (received, total) => {
        const receivedMB = (received / (1024 * 1024)).toFixed(1);

        if (total > 0) {
          const totalMB = (total / (1024 * 1024)).toFixed(1);
          const percent = Math.min(100, Math.round((received / total) * 100));

          progressBar.style.width = `${percent}%`;
          percentText.innerText = `${percent}%`;
          sizeText.innerText = `${receivedMB} MB / ${totalMB} MB`;
        } else {
          // Trường hợp server không trả header content-length
          sizeText.innerText = `Đã nạp: ${receivedMB} MB`;
          percentText.innerText = "Đang tải...";
        }
      });

      // Lưu file vào IndexedDB để lần chơi sau không cần tải lại
      if (window.idbKeyval) {
        await window.idbKeyval.set(`rom_${gameId}`, romBlob);
        console.log("💾 Đã lưu ROM vào IndexedDB thành công.");
      }
    }

    // 2. Nạp ROM vào trình giả lập và chạy
    const blobUrl = URL.createObjectURL(romBlob);
    startEmulator(core, blobUrl, gameTitle);

    // Ghi lại lịch sử chơi
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