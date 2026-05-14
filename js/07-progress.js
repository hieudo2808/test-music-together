// 07-progress.js
// Progress timer and seek bar rendering.

// ═══════════════════════════════════════════
// §10  PROGRESS & SEEK BAR
// ═══════════════════════════════════════════
setInterval(() => {
    // Host broadcasts progress
    if (S.isHost && S.playing && S.idx >= 0) {
        const t = getT(),
            dur = getDur();
        S.curT = t;
        S.dur = dur;
        bcast({ type: M.PROG, t, dur });
    }
    if (!S.seekDrag) renderSeek();
}, 500);

function renderSeek() {
    let t = S.curT,
        dur = S.dur;
    if (S.isHost) {
        t = getT();
        dur = getDur();
        S.curT = t;
        S.dur = dur;
    }
    const pct = dur > 0 ? t / dur : 0;
    $("t-cur").textContent = fmt(t);
    $("t-dur").textContent = fmt(dur);
    if (!S.seekDrag) {
        $("seek-inp").value = Math.round(pct * 100000);
        $("seek-fill").style.width = pct * 100 + "%";
        $("seek-thumb").style.left = pct * 100 + "%";
    }
}
