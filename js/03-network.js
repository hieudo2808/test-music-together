// 03-network.js
// PeerJS setup, host/guest connections, broadcast helpers.

// ═══════════════════════════════════════════
// §4  NETWORKING
// ═══════════════════════════════════════════
function initPeer(specId) {
    return new Promise((res, rej) => {
        const cfg = {
            config: {
                iceServers: [
                    { urls: "stun:stun.l.google.com:19302" },
                    { urls: "stun:stun1.l.google.com:19302" },
                    { urls: "stun:global.stun.twilio.com:3478" },
                ],
            },
        };
        const p = specId ? new Peer(specId, cfg) : new Peer(cfg);
        p.on("open", (id) => {
            S.peer = p;
            res(id);
        });
        p.on("error", (e) => {
            if (e.type === "unavailable-id") rej(new Error("Mã phòng đang được sử dụng"));
            else rej(e);
        });
        p.on("connection", onConn);
        p.on("call", onCall);
        p.on("disconnected", () => {
            setStatus("🟡 Đang kết nối lại…", "warn");
            p.reconnect();
        });
        p.on("close", () => setStatus("🔴 Đã đóng kết nối", "err"));
        setTimeout(() => rej(new Error("Timeout")), 15000);
    });
}

function onConn(conn) {
    conn.on("open", () => {
        S.conns[conn.peer] = conn;
        conn.on("data", (d) => onMsg(d, conn.peer));
        conn.on("close", () => peerGone(conn.peer));
        conn.on("error", (e) => console.warn("conn err", e));
    });
}

// Guest receives host's audio stream
function onCall(call) {
    call.answer();
    call.on("stream", (stream) => {
        const a = S.aud;
        a.srcObject = stream;
        a.volume = S.vol;
        a.play().catch(() => toast("Nhấn ▶ để bắt đầu nghe", "info"));
    });
    call.on("close", () => {
        if (S.aud.srcObject) S.aud.srcObject = null;
    });
}

function peerGone(pid) {
    delete S.conns[pid];
    if (S.calls[pid]) {
        try {
            S.calls[pid].close();
        } catch (e) {}
        delete S.calls[pid];
    }
    let name = "";
    for (const [uid, m] of Object.entries(S.members)) {
        if (m.peerId === pid) {
            name = m.name;
            delete S.members[uid];
            break;
        }
    }
    if (name) {
        sysChat(`${name} đã rời phòng`);
        renderMembers();
    }
    if (S.isHost) bcast({ type: M.MEMBERS, members: S.members });
    if (!S.isHost && pid === S.hostPid) toast("Host đã rời phòng!", "err");
}

async function connectHost(hostPid) {
    return new Promise((res, rej) => {
        const c = S.peer.connect(hostPid, { reliable: true, serialization: "json" });
        c.on("open", () => {
            S.conns[hostPid] = c;
            S.hostPid = hostPid;
            c.on("data", (d) => onMsg(d, hostPid));
            c.on("close", () => peerGone(hostPid));
            // announce
            c.send({ type: M.JOIN, uid: S.uid, name: san(S.name, 20), peerId: S.peer.id });
            res();
        });
        c.on("error", rej);
        setTimeout(() => rej(new Error("Timeout kết nối")), 13000);
    });
}

function send(pid, msg) {
    const c = S.conns[pid];
    if (c?.open) c.send(msg);
}
function bcast(msg, skip) {
    for (const [pid, c] of Object.entries(S.conns)) if (pid !== skip && c?.open) c.send(msg);
}
// Send request to host (or process directly if we are host)
function toHost(msg) {
    if (S.isHost) onMsg({ ...msg, from: S.uid }, "__self__");
    else send(S.hostPid, { ...msg, from: S.uid });
}
// Broadcast to all peers AND apply locally
function bcastSelf(msg) {
    bcast(msg);
    onMsg(msg, "__self__");
}
