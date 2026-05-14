function getUid() {
    let u = localStorage.getItem("syncbeat_uid");
    if (!u) {
        u = window.crypto && crypto.randomUUID 
            ? crypto.randomUUID() 
            : "u_" + Date.now().toString(36) + rid(8);
        localStorage.setItem("syncbeat_uid", u);
    }
    return u;
}
const S = {
    uid: getUid(),
    name: localStorage.getItem("syncbeat_name") || "",
    room: "",
    isHost: false,
    peer: null,
    conns: {}, 
    calls: {}, 
    hostPid: "", 
    queue: [],
    idx: -1,
    playing: false,
    curT: 0,
    dur: 0,
    shuffle: false,
    repeat: false,
    members: {}, 
    yt: null,
    ytOK: false,
    aud: $("aud"),
    ctx: null, 
    asSrc: null, 
    asDst: null, 
    seekDrag: false,
    vol: 0.8,
    pendingLoad: null, 
};
const RL = {
    add: mkRL(5, 10000),
    ctrl: mkRL(30, 5000),
    chat: mkRL(10, 5000),
};
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
    R_PLAY: "r_play",
    R_PAUSE: "r_pause",
    R_SEEK: "r_seek",
    R_LOAD: "r_load",
    R_ADD: "r_add",
    R_RM: "r_rm",
    R_CHAT: "r_chat",
};
const ALL_M = new Set(Object.values(M));
function valid(msg) {
    return msg && typeof msg === "object" && ALL_M.has(msg.type);
}
