// 09-room.js
// Create/join/enter/leave room flow.

// ═══════════════════════════════════════════
// §12  ROOM MANAGEMENT
// ═══════════════════════════════════════════
async function createRoom() {
    const name = san($("l-cname").value);
    if (!name) {
        toast("Nhập tên của bạn", "err");
        return;
    }
    S.name = name;
    S.isHost = true;
    S.uid = rid();

    // Try up to 3 codes in case of conflict
    let attempts = 0;
    async function tryCreate() {
        S.room = genCode();
        showLoad("Đang tạo phòng...");
        try {
            await initYT();
            await initPeer(`sb-${S.room}`);
            S.members[S.uid] = { name: san(name, 20), peerId: S.peer.id };
            hideLoad();
            enterRoom();
            toast(`Phòng ${S.room} đã sẵn sàng 🎉`, "ok");
        } catch (e) {
            if (e.message?.includes("đang được sử dụng") && attempts++ < 3) {
                if (S.peer) {
                    try {
                        S.peer.destroy();
                    } catch (x) {}
                    S.peer = null;
                }
                return tryCreate();
            }
            hideLoad();
            S.isHost = false;
            if (S.peer) {
                try {
                    S.peer.destroy();
                } catch (x) {}
                S.peer = null;
            }
            toast("Lỗi: " + (e.message || "Không thể tạo phòng"), "err");
        }
    }
    await tryCreate();
}

async function joinRoom() {
    const name = san($("l-jname").value);
    const code = $("l-jcode").value.trim().toUpperCase();
    if (!name) {
        toast("Nhập tên của bạn", "err");
        return;
    }
    if (!code || !/^[A-Z0-9]{6}$/.test(code)) {
        toast("Mã phòng không hợp lệ (6 ký tự)", "err");
        return;
    }
    S.name = name;
    S.isHost = false;
    S.room = code;
    S.uid = rid();
    showLoad("Đang kết nối vào phòng...");
    try {
        await initYT();
        await initPeer(); // random peer ID
        await connectHost(`sb-${code}`);
        hideLoad();
        enterRoom();
        toast("Đã tham gia phòng 🎉", "ok");
    } catch (e) {
        hideLoad();
        S.isHost = false;
        if (S.peer) {
            try {
                S.peer.destroy();
            } catch (x) {}
            S.peer = null;
        }
        toast("Không thể kết nối: " + (e.message || "Phòng không tồn tại hoặc đã đóng"), "err");
    }
}

function enterRoom() {
    $("scr-land").hidden = true;
    $("scr-room").hidden = false;
    $("hdr-code").textContent = S.room;
    $("hdr-host").hidden = !S.isHost;
    $("file-only-note").hidden = S.isHost;
    renderMembers();
    renderQueue();
    renderCtrl();
    setStatus("🟢 Đã kết nối", "");
    if (S.isHost) {
        sysChat(`Bạn là Host — chia sẻ mã phòng: ${S.room}`);
        sysChat("Mời bạn bè vào phòng để nghe nhạc cùng nhau!");
    } else {
        sysChat("Đã vào phòng! Double-click vào bài hát để chuyển bài.");
    }
}

function leaveRoom() {
    if (!confirm("Bạn có muốn rời phòng?")) return;
    if (S.peer) {
        try {
            S.peer.destroy();
        } catch (e) {}
        S.peer = null;
    }
    if (S.ctx) {
        try {
            S.ctx.close();
        } catch (e) {}
        S.ctx = null;
    }
    Object.assign(S, {
        conns: {},
        calls: {},
        queue: [],
        idx: -1,
        playing: false,
        members: {},
        yt: null,
        ytOK: false,
        asSrc: null,
        asDst: null,
        isHost: false,
        pendingLoad: null,
    });
    S.aud.src = "";
    S.aud.srcObject = null;
    $("yt-wrap").classList.remove("show");
    $("yt-wrap").style.display = "none";
    $("sp-wrap").classList.remove("show");
    $("sp-wrap").innerHTML = "";
    $("chat-msgs").innerHTML = "";
    $("scr-room").hidden = true;
    $("scr-land").hidden = false;
    toast("Đã rời phòng", "info");
}
