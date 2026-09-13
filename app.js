// ================= CẤU HÌNH SUPABASE =================
// Thay thông tin từ Supabase Dashboard -> Project Settings -> API
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_KEY = "YOUR_ANON_PUBLIC_KEY";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ================= EMULATORJS CONTROLLER =================
function startEmulator(core, romSource, gameTitle = "Retro Game") {
  const container = document.getElementById("game-container");
  const placeholder = document.getElementById("game-placeholder");
  if (placeholder) placeholder.style.display = "none";

  // Dọn dẹp iframe/canvas cũ nếu đang chơi game khác
  container.innerHTML = '<div id="game"></div>';

  // Cấu hình tham số toàn cục cho EmulatorJS
  window.EJS_player = "#game";
  window.EJS_core = core; // gba, psx, nes, snes
  window.EJS_gameName = gameTitle;
  window.EJS_gameUrl = romSource; // Có thể là Direct Link (HTTP) hoặc ObjectURL (blob:)
  window.EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";
  window.EJS_startOnLoaded = true;

  // Nhúng loader script để khởi động lõi WASM
  const script = document.createElement("script");
  script.src = "https://cdn.emulatorjs.org/stable/data/loader.js";
  document.body.appendChild(script);
}

// ================= LẤY GAME TỪ SUPABASE =================
async function loadGamesFromSupabase() {
  const grid = document.getElementById("game-grid");
  const { data: games, error } = await supabase.from("games").select("*");

  if (error) {
    grid.innerHTML = `<p style="color:red">Không thể tải dữ liệu: ${error.message}</p>`;
    return;
  }

  if (!games || games.length === 0) {
    grid.innerHTML = "<p>Chưa có game nào trong database. Hãy thêm bản ghi vào Supabase!</p>";
    return;
  }

  grid.innerHTML = "";
  games.forEach((game) => {
    const card = document.createElement("div");
    card.className = "game-card";
    card.innerHTML = `
      <img src="${game.cover_url || 'https://via.placeholder.com/200x140?text=Retro'}" alt="${game.title}">
      <div class="info">
        <span>${game.system}</span>
        <h3>${game.title}</h3>
      </div>
    `;
    card.onclick = () => {
      if (game.rom_url) {
        startEmulator(game.core, game.rom_url, game.title);
      } else {
        alert("Game này yêu cầu tự nạp file ROM từ máy tính.");
      }
    };
    grid.appendChild(card);
  });
}

// ================= XỬ LÝ FILE ROM TỰ TẢI (FILE API) =================
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const coreSelector = document.getElementById("core-selector");

function handleFileSelection(file) {
  if (!file) return;

  // Tạo URL ảo dạng blob trỏ thẳng vào RAM trình duyệt (0đ băng thông, không upload lên mạng)
  const blobUrl = URL.createObjectURL(file);
  const selectedCore = coreSelector.value;
  
  startEmulator(selectedCore, blobUrl, file.name);
}

// Bắt sự kiện chọn file từ thẻ input
fileInput.addEventListener("change", (e) => {
  handleFileSelection(e.target.files[0]);
});

// Bắt sự kiện kéo thả (Drag & Drop)
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

// ================= TÍNH NĂNG PHÒNG ONLINE (REALTIME SIGNALING) =================
const btnCreateRoom = document.getElementById("btn-create-room");
const btnJoinRoom = document.getElementById("btn-join-room");
const roomInput = document.getElementById("room-input");

// Tạo mã phòng ngẫu nhiên gồm 6 ký tự
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

btnCreateRoom.addEventListener("click", async () => {
  const roomId = generateRoomCode();
  
  // Lưu phòng vào bảng rooms trên Supabase
  const { error } = await supabase.from("rooms").insert([
    { id: roomId, host_peer_id: "HOST_" + roomId, status: "waiting" }
  ]);

  if (error) {
    alert("Lỗi khi tạo phòng: " + error.message);
    return;
  }

  alert(`Đã tạo phòng thành công! Mã phòng của bạn: ${roomId}\nHãy gửi mã này cho bạn bè.`);
  listenRoomChannel(roomId);
});

btnJoinRoom.addEventListener("click", async () => {
  const roomId = roomInput.value.trim().toUpperCase();
  if (!roomId) return alert("Vui lòng nhập mã phòng!");

  // Kiểm tra phòng có tồn tại không
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (error || !data) {
    alert("Phòng không tồn tại hoặc đã bị hủy.");
    return;
  }

  // Cập nhật trạng thái khách vào phòng
  await supabase
    .from("rooms")
    .update({ guest_peer_id: "GUEST_" + roomId, status: "playing" })
    .eq("id", roomId);

  alert(`Đã vào phòng ${roomId}! Đang chuẩn bị đồng bộ Netplay...`);
  listenRoomChannel(roomId);
});

// Lắng nghe sự kiện qua Supabase Realtime
function listenRoomChannel(roomId) {
  supabase
    .channel(`room_${roomId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
      (payload) => {
        console.log("Cập nhật phòng:", payload.new);
        if (payload.new.status === "playing") {
          console.log("Hai người chơi đã sẵn sàng kết nối P2P!");
        }
      }
    )
    .subscribe();
}

// Khởi chạy khi trang tải xong
window.addEventListener("DOMContentLoaded", () => {
  loadGamesFromSupabase();
});