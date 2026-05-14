// 02-state-protocol.js
// Global app state, rate limiters, and message protocol constants.

// ═══════════════════════════════════════════
// §2  STATE
// ═══════════════════════════════════════════
const S = {
    // identity
    uid: rid(),
    name: "",
    room: "",
    isHost: false,
    // network
    peer: null,
    conns: {}, // peerId→DataConnection
    calls: {}, // peerId→MediaConnection
    hostPid: "", // guest's host peer ID
    // room state (synced)
    queue: [],
    idx: -1,
    playing: false,
    curT: 0,
    dur: 0,
    shuffle: false,
    repeat: false,
    members: {}, // uid→{name,peerId}
    // player
    yt: null,
    ytOK: false,
    aud: $("aud"),
    ctx: null, // AudioContext
    asSrc: null, // MediaElementAudioSourceNode
    asDst: null, // MediaStreamAudioDestinationNode
    // ui
    seekDrag: false,
    vol: 0.8,
    // pending
    pendingLoad: null, // track to load once yt is ready
};

// Rate limiters
const RL = {
    add: mkRL(5, 10000),
    ctrl: mkRL(30, 5000),
    chat: mkRL(10, 5000),
};

// ═══════════════════════════════════════════
// §3  MESSAGE PROTOCOL
// ═══════════════════════════════════════════
// Types
const M = {
    SYNC: "sync",
    PLAY: "play",
    PAUSE: "pause",
    SEEK: "seek",
    LOAD: "load",
    QUEUE: "queue",
    PROG: "prog",
    JOIN: "join",
    MEMBERS: "members",
    CHAT: "chat",
    // Requests (guest→host)
    R_PLAY: "r_play",
    R_PAUSE: "r_pause",
    R_SEEK: "r_seek",
    R_LOAD: "r_load",
    R_ADD: "r_add",
    R_RM: "r_rm",
};
const ALL_M = new Set(Object.values(M));

function valid(msg) {
    return msg && typeof msg === "object" && ALL_M.has(msg.type);
}
