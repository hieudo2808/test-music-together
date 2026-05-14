// 05-playback.js
// Playback control logic and client-side apply handlers.

// ═══════════════════════════════════════════
// §6  HOST PLAYBACK ACTIONS
// ═══════════════════════════════════════════
function getT() {
    const tr = S.queue[S.idx];
    if (!tr) return 0;
    if (tr.type === "youtube" && S.yt) {
        try {
            return S.yt.getCurrentTime() || 0;
        } catch (e) {
            return 0;
        }
    }
    if (!S.aud.srcObject) return S.aud.currentTime || 0;
    return S.curT;
}
function getDur() {
    const tr = S.queue[S.idx];
    if (!tr) return 0;
    if (tr.type === "youtube" && S.yt) {
        try {
            return S.yt.getDuration() || 0;
        } catch (e) {
            return 0;
        }
    }
    return isFinite(S.aud.duration) ? S.aud.duration : 0;
}

function hPlay() {
    S.playing = true;
    const tr = S.queue[S.idx];
    if (!tr) return;
    if (tr.type === "youtube") S.yt?.playVideo();
    else if (!S.aud.srcObject) S.aud.play().catch(() => {});
    bcastSelf({ type: M.PLAY, t: getT() });
}
function hPause() {
    S.playing = false;
    const tr = S.queue[S.idx];
    if (tr?.type === "youtube") S.yt?.pauseVideo();
    else S.aud.pause();
    bcastSelf({ type: M.PAUSE, t: getT() });
}
function hSeek(t) {
    const tr = S.queue[S.idx];
    if (!tr) return;
    if (tr.type === "youtube") S.yt?.seekTo(t, true);
    else if (!S.aud.srcObject) S.aud.currentTime = t;
    bcastSelf({ type: M.SEEK, t });
}
function hLoad(idx, st = 0, play = true) {
    if (idx < 0 || idx >= S.queue.length) return;
    S.idx = idx;
    S.playing = play;
    stopPlayer();
    bcastSelf({ type: M.LOAD, idx, st, play });
}
function stopPlayer() {
    if (S.yt) {
        try {
            S.yt.stopVideo();
        } catch (e) {}
    }
    if (!S.aud.srcObject) {
        S.aud.pause();
        S.aud.removeAttribute("src");
    }
}

function playNext() {
    if (!S.isHost || !S.queue.length) return;
    let n;
    if (S.shuffle) n = Math.floor(Math.random() * S.queue.length);
    else if (S.repeat) n = S.idx;
    else {
        n = S.idx + 1;
        if (n >= S.queue.length) {
            S.playing = false;
            renderCtrl();
            return;
        }
    }
    hLoad(n, 0, true);
}
function playPrev() {
    if (!S.isHost) return;
    if (getT() > 3) {
        hSeek(0);
        return;
    }
    hLoad(Math.max(0, S.idx - 1), 0, true);
}

// ═══════════════════════════════════════════
// §7  CLIENT APPLY EVENTS
// ═══════════════════════════════════════════
function applyPlay(t) {
    S.playing = true;
    const tr = S.queue[S.idx];
    if (!tr) return;
    if (tr.type === "youtube" && S.yt) {
        try {
            S.yt.seekTo(t + 0.15, true);
            S.yt.playVideo();
        } catch (e) {}
    }
    if (!S.isHost && tr.type === "file" && S.aud.srcObject)
        S.aud.play().catch(() => toast("Nhấn ▶ để phát nhạc", "info"));
    renderCtrl();
}
function applyPause(t) {
    S.playing = false;
    const tr = S.queue[S.idx];
    if (tr?.type === "youtube" && S.yt) {
        try {
            S.yt.seekTo(t, true);
            S.yt.pauseVideo();
        } catch (e) {}
    }
    if (!S.isHost && S.aud.srcObject) S.aud.pause();
    renderCtrl();
}
function applySeek(t) {
    const tr = S.queue[S.idx];
    if (tr?.type === "youtube" && S.yt) {
        try {
            S.yt.seekTo(t, true);
        } catch (e) {}
    }
    S.curT = t;
    if (!S.seekDrag) renderSeek();
}

function applyLoad(idx, st, play) {
    const tr = S.queue[idx];
    if (!tr) return;
    S.idx = idx;
    S.playing = !!play;

    const ytW = $("yt-wrap"),
        spW = $("sp-wrap");
    ytW.classList.remove("show");
    ytW.style.display = "none";
    spW.classList.remove("show");
    spW.style.display = "none";

    $("trk-title").textContent = tr.title;
    $("trk-sub").textContent = `Thêm bởi ${tr.addedBy}`;
    const art = $("trk-art");

    if (tr.type === "youtube") {
        ytW.style.display = "block";
        setTimeout(() => ytW.classList.add("show"), 10);
        art.innerHTML = tr.thumb ? `<img src="${esc(tr.thumb)}" alt="" loading="lazy">` : "▶️";
        if (S.ytOK && S.yt) {
            // Check if YT player element still exists in DOM
            try {
                S.yt.loadVideoById({ videoId: tr.videoId, startSeconds: st });
                if (!play) setTimeout(() => S.yt.pauseVideo(), 800);
            } catch (e) {}
        } else {
            S.pendingLoad = { tr, st, play };
        }
    } else if (tr.type === "spotify") {
        spW.style.display = "block";
        setTimeout(() => spW.classList.add("show"), 10);
        art.textContent = "🎵";
        spW.innerHTML = `<iframe
      src="https://open.spotify.com/embed/${esc(tr.spotifyType)}/${esc(tr.spotifyId)}?utm_source=generator&theme=0"
      width="100%" height="152" frameborder="0"
      allow="autoplay;clipboard-write;encrypted-media;fullscreen;picture-in-picture"
      style="border-radius:10px"></iframe>`;
    } else {
        // file — host plays locally, guests hear stream
        art.textContent = "📁";
        if (S.isHost) {
            if (st > 0 && !S.aud.srcObject) S.aud.currentTime = st;
            if (play && !S.aud.srcObject) S.aud.play().catch(() => {});
        }
    }
    renderCtrl();
    renderQueue();
}
