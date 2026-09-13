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

  // Dọn dẹp canvas cũ
  container.innerHTML = '<div id="game"></div>';

  window.EJS_player = "#game";
  window.EJS_core = core; // 'gba', 'nes', 'snes', 'psx'
  window.EJS_gameName = gameTitle;
  window.EJS_gameUrl = romSource;
  window.EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";
  window.EJS_startOnLoaded = true;

  // Tự động load save mới nhất nếu người chơi có
  window.EJS_onLoadSave = () => {
    console.log("Trình giả lập đã tải xong, sẵn sàng nạp save state.");
  };

  const oldScript = document.getElementById("ejs-loader");
  if (oldScript) oldScript.remove();

  const script = document.createElement("script");
  script.id = "ejs-loader";
  script.src = "https://cdn.emulatorjs.org/stable/data/loader.js";
  document.body.appendChild(script);

  updateSaveSlotUI();
}

// Hàm nạp game thông minh: Tự kiểm tra cache IndexedDB trước khi tải từ mạng
async function launchGameWithCache(gameId, core, romUrl, gameTitle) {
  currentGame = { id: gameId, title: gameTitle, core: core, isLocal: false };
  const container = document.getElementById("game-container");
  const placeholder = document.getElementById("game-placeholder");
  if (placeholder) placeholder.style.display = "none";

  try {
    let romBlob = null;

    // Kiểm tra xem trình duyệt đã nạp thư viện idbKeyval chưa
    if (window.idbKeyval) {
      romBlob = await window.idbKeyval.get(`rom_${gameId}`);
    }

    if (romBlob) {
      console.log("⚡ Tìm thấy ROM trong IndexedDB, nạp ngay không cần tải lại!");
    } else {
      console.log("🌐 Chưa có trong máy, đang tải ROM từ server...");
      container.innerHTML = '<div style="color:#00e5ff; text-align:center; padding-top:200px; font-size:1.2rem;">Đang tải dữ liệu trò chơi, vui lòng đợi...</div>';

      const response = await fetch(romUrl);
      if (!response.ok) throw new Error(`Lỗi tải ROM (${response.status}): ${response.statusText}`);
      
      romBlob = await response.blob();

      // Lưu vào bộ nhớ máy người dùng cho lần sau
      if (window.idbKeyval) {
        await window.idbKeyval.set(`rom_${gameId}`, romBlob);
        console.log("💾 Đã lưu ROM vào IndexedDB thành công.");
      }
    }

    const blobUrl = URL.createObjectURL(romBlob);
    startEmulator(core, blobUrl, gameTitle);

    // Ghi nhận lịch sử chơi nếu đã đăng nhập
    recordPlayHistory(gameId);

  } catch (error) {
    console.error("Lỗi khi nạp game:", error);
    alert("Không thể khởi động game: " + error.message);
  }
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
// 6. CLOUD SAVE & LOAD (GIỚI HẠN 3 SLOT)
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
  if (!window.EJS_emulator || !window.EJS_emulator.gameManager) {
    alert("Trình giả lập chưa sẵn sàng hoặc không hỗ trợ trích xuất file save.");
    return;
  }

  try {
    // 1. Trích xuất file save (.sav) từ EmulatorJS
    const saveBinary = window.EJS_emulator.gameManager.getSaveFile();
    if (!saveBinary || saveBinary.length === 0) {
      alert("Chưa tìm thấy dữ liệu lưu trong game (Hãy lưu game trong menu trò chơi trước).");
      return;
    }

    const filePath = `${currentUser.id}/${currentGame.id}_slot${slotNumber}.sav`;

    // 2. Upload file nhị phân lên bucket 'saves' (Private)
    const { error: uploadError } = await supabaseClient.storage
      .from("saves")
      .upload(filePath, saveBinary, {
        contentType: "application/octet-stream",
        upsert: true
      });

    if (uploadError) throw uploadError;

    // 3. Cập nhật thông tin vào bảng user_saves
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

    alert(`Đã lưu tiến trình thành công vào Đám mây [Slot ${slotNumber}]!`);
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
  if (!window.EJS_emulator || !window.EJS_emulator.gameManager) {
    alert("Trình giả lập chưa sẵn sàng.");
    return;
  }

  try {
    const filePath = `${currentUser.id}/${currentGame.id}_slot${slotNumber}.sav`;

    // 1. Tải file từ Supabase Storage
    const { data, error } = await supabaseClient.storage.from("saves").download(filePath);
    if (error) throw new Error("Không tìm thấy file lưu ở Slot này.");

    // 2. Nạp mảng byte vào EmulatorJS
    const arrayBuffer = await data.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    window.EJS_emulator.gameManager.loadSaveFile(uint8Array);
    alert(`Đã nạp file save [Slot ${slotNumber}]! Hãy reset hoặc tiếp tục chơi.`);

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