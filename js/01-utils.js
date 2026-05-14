// 01-utils.js
// Utilities: DOM helper, escaping, parsers, rate limiter, toast/loading helpers.

// ═══════════════════════════════════════════
// §1  UTILITIES
// ═══════════════════════════════════════════
const $ = (id) => document.getElementById(id);

// XSS-safe escape
function esc(s) {
    const d = document.createElement("div");
    d.appendChild(document.createTextNode(String(s ?? "")));
    return d.innerHTML;
}

// Sanitize user input
function san(s, max = 200) {
    return String(s ?? "")
        .trim()
        .slice(0, max);
}

// Format seconds → m:ss
function fmt(s) {
    if (!Number.isFinite(s) || s < 0) return "0:00";
    s = Math.floor(s);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Random ID
function rid(n = 8) {
    return Math.random()
        .toString(36)
        .slice(2, 2 + n);
}

// Room code (6 chars, no ambiguous letters)
function genCode() {
    const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join("");
}

// Parse YouTube URL → videoId or null
function parseYT(url) {
    if (!url || typeof url !== "string") return null;
    const m = url.match(/(?:[?&]v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
}

// Parse Spotify URL → {type,id} or null
function parseSP(url) {
    const m = url?.match(/open\.spotify\.com\/(track|playlist|album|episode)\/([A-Za-z0-9]+)/);
    return m ? { type: m[1], id: m[2] } : null;
}

// Validate & clean a track object
function cleanTrack(t) {
    if (!t || typeof t !== "object") return null;
    if (!["youtube", "file", "spotify"].includes(t.type)) return null;
    if (t.type === "youtube") {
        if (!/^[a-zA-Z0-9_-]{11}$/.test(t.videoId)) return null;
    }
    if (t.type === "spotify") {
        if (!/^[A-Za-z0-9]+$/.test(t.spotifyId)) return null;
        if (!["track", "playlist", "album", "episode"].includes(t.spotifyType)) return null;
    }
    if (t.type === "file" && !t.title) return null;
    return {
        id: san(t.id || rid(), 20),
        type: t.type,
        title: san(t.title || "Unknown", 100),
        videoId: t.videoId || null,
        spotifyId: t.spotifyId || null,
        spotifyType: t.spotifyType || null,
        thumb: typeof t.thumb === "string" ? t.thumb : null,
        addedBy: san(t.addedBy || "?", 20),
    };
}

// Rate limiter factory
function mkRL(max, winMs) {
    const ts = [];
    return () => {
        const now = Date.now();
        const ok = ts.filter((t) => now - t < winMs);
        ts.length = 0;
        ts.push(...ok);
        if (ts.length >= max) return false;
        ts.push(now);
        return true;
    };
}

// Toast
let toastTimer;
function toast(msg, type = "info", dur = 3200) {
    const el = $("toast");
    el.textContent = msg;
    el.className = `toast ${type} show`;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        el.classList.remove("show");
        setTimeout(() => (el.hidden = true), 280);
    }, dur);
}

function showLoad(t = "Đang tải...") {
    $("load-lbl").textContent = t;
    $("load-ov").hidden = false;
}
function hideLoad() {
    $("load-ov").hidden = true;
}
