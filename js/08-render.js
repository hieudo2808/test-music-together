// 08-render.js
// UI render functions for controls, queue, members, chat, and status.

// ═══════════════════════════════════════════
// §11  RENDER FUNCTIONS
// ═══════════════════════════════════════════
function renderCtrl() {
    const pp = $("btn-pp");
    pp.textContent = S.playing ? "⏸" : "▶";
    // sync animated bars
    document.querySelectorAll(".bars").forEach((b) => b.classList.toggle("paused", !S.playing));
}

function renderQueue() {
    const list = $("q-list");
    $("q-count").textContent = `${S.queue.length} bài`;
    if (!S.queue.length) {
        list.innerHTML = '<li class="q-empty">Thêm bài hát để bắt đầu nghe cùng nhau 🎶</li>';
        return;
    }
    const icons = { youtube: "▶️", file: "📁", spotify: "🎵" };
    list.innerHTML = S.queue
        .map((t, i) => {
            const active = i === S.idx;
            const thumbContent = t.thumb
                ? `<img src="${esc(t.thumb)}" alt="" loading="lazy">`
                : icons[t.type] || "🎵";
            return `<li class="q-item${active ? " active" : ""}" data-i="${i}">
      <span class="q-num">${i + 1}</span>
      <span class="q-bars-wrap"><span class="bars${S.playing ? "" : " paused"}">
        <span class="bar"></span><span class="bar"></span><span class="bar"></span>
      </span></span>
      <span class="q-thumb">${thumbContent}</span>
      <span class="q-info">
        <span class="q-title">${esc(t.title)}</span>
        <span class="q-by">bởi ${esc(t.addedBy)}</span>
      </span>
      <button class="q-del" data-i="${i}" title="Xóa">✕</button>
    </li>`;
        })
        .join("");
    list.querySelectorAll(".q-item").forEach((el) => {
        el.addEventListener("dblclick", () => {
            const idx = +el.dataset.i;
            toHost({ type: M.R_LOAD, idx });
        });
    });
    list.querySelectorAll(".q-del").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            toHost({ type: M.R_RM, idx: +btn.dataset.i });
        });
    });
    // Scroll active into view
    const active = list.querySelector(".q-item.active");
    if (active) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function renderMembers() {
    const list = $("mbr-list");
    const entries = Object.entries(S.members);
    $("mbr-cnt").textContent = `(${entries.length})`;
    if (!entries.length) {
        list.innerHTML =
            '<li class="mbr-item"><span style="color:var(--t3);font-size:12px">Chưa có ai</span></li>';
        return;
    }
    list.innerHTML = entries
        .map(([uid, m]) => {
            const you = uid === S.uid;
            const isHostPeer = S.isHost ? m.peerId === S.peer?.id : m.peerId === S.hostPid;
            return `<li class="mbr-item">
      <span class="mbr-av">${esc((m.name || "?")[0].toUpperCase())}</span>
      <span class="mbr-info">
        <span class="mbr-name">${esc(m.name)}${you ? ' <span style="color:var(--t3);font-size:11px;font-weight:400">(bạn)</span>' : ""}</span>
        ${isHostPeer ? '<span class="mbr-role">👑 Host</span>' : ""}
      </span>
    </li>`;
        })
        .join("");
}

function sysChat(txt) {
    const el = document.createElement("div");
    el.className = "chat-sys";
    el.textContent = txt;
    $("chat-msgs").appendChild(el);
    scrollChat();
}
function renderChat(msg) {
    const el = document.createElement("div");
    el.className = "chat-msg";
    const t = new Date(msg.t || Date.now()).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
    });
    el.innerHTML = `<div class="chat-msg-top">
    <span class="chat-uname">${esc(msg.name)}</span>
    <span class="chat-time">${t}</span>
  </div>
  <div class="chat-body">${esc(msg.text)}</div>`;
    $("chat-msgs").appendChild(el);
    scrollChat();
}
function scrollChat() {
    const c = $("chat-msgs");
    c.scrollTop = c.scrollHeight;
}

function setStatus(txt, cls = "") {
    const el = $("hdr-status");
    el.textContent = txt;
    el.className = `status-dot${cls ? " st-" + cls : ""}`;
}
