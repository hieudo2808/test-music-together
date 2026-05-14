async function handleFile(file) {
    if (!S.isHost) {
        toast("Chỉ Host mới có thể tải file lên", "warn");
        return;
    }
    if (file.size > 100 * 1024 * 1024) {
        toast("File quá lớn — tối đa 100MB", "err");
        return;
    }
    const okType =
        /^audio\/|^video\/mp4/.test(file.type) ||
        /\.(mp3|wav|ogg|flac|aac|m4a|opus|webm)$/i.test(file.name);
    if (!okType) {
        toast("Định dạng không hỗ trợ", "err");
        return;
    }
    showLoad(`Đang xử lý "${file.name.slice(0, 30)}..."`);
    try {
        const url = URL.createObjectURL(file);
        const a = S.aud;
        a.srcObject = null;
        a.src = url;
        await new Promise((res, rej) => {
            a.onloadedmetadata = res;
            a.onerror = () => rej(new Error("Không đọc được file"));
            setTimeout(() => rej(new Error("Timeout")), 10000);
        });
        if (!S.ctx) {
            S.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (S.ctx.state === "suspended") await S.ctx.resume();
        if (!S.asSrc) {
            S.asSrc = S.ctx.createMediaElementSource(a);
            S.asDst = S.ctx.createMediaStreamDestination();
            S.asSrc.connect(S.asDst);
            S.asSrc.connect(S.ctx.destination);
        }
        for (const [pid, c] of Object.entries(S.conns)) {
            if (!c?.open) continue;
            if (S.calls[pid]) {
                try {
                    S.calls[pid].close();
                } catch (e) {}
            }
            try {
                const cl = S.peer.call(pid, S.asDst.stream);
                S.calls[pid] = cl;
            } catch (e) {}
        }
        const title = file.name.replace(/\.[^.]+$/, "").slice(0, 80);
        const track = { id: rid(), type: "file", title, addedBy: san(S.name, 20) };
        S.queue.push(track);
        bcast({ type: M.QUEUE, queue: S.queue });
        renderQueue();
        const idx = S.queue.length - 1;
        S.idx = idx;
        S.playing = true;
        a.volume = S.vol;
        a.onended = playNext;
        await a.play();
        bcastSelf({ type: M.LOAD, idx, st: 0, play: true });
        $("trk-title").textContent = title;
        $("trk-art").textContent = "📁";
        $("trk-sub").textContent = `Thêm bởi ${esc(san(S.name, 20))}`;
        hideLoad();
        toast(`▶ ${title}`, "ok");
    } catch (e) {
        hideLoad();
        toast("Lỗi: " + e.message, "err");
        console.error(e);
    }
}
function initYT() {
    return new Promise((res) => {
        if (window.YT?.Player) {
            createYTPlayer(res);
            return;
        }
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            prev?.();
            createYTPlayer(res);
        };
        if (!$("_ytscript")) {
            const s = document.createElement("script");
            s.id = "_ytscript";
            s.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(s);
        }
    });
}
function createYTPlayer(cb) {
    let el = $("yt-el");
    if (!el) {
        el = document.createElement("div");
        el.id = "yt-el";
        $("yt-wrap").appendChild(el);
    }
    S.yt = new YT.Player("yt-el", {
        width: "100%",
        height: "100%",
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, fs: 1 },
        events: {
            onReady: () => {
                S.ytOK = true;
                if (S.pendingLoad) {
                    const { tr, st, play } = S.pendingLoad;
                    S.pendingLoad = null;
                    try {
                        S.yt.loadVideoById({ videoId: tr.videoId, startSeconds: st });
                        if (!play) setTimeout(() => S.yt.pauseVideo(), 800);
                    } catch (e) {}
                }
                cb();
            },
            onStateChange: (e) => {
                if (!S.isHost) return;
                if (e.data === YT.PlayerState.ENDED) playNext();
                if (e.data === YT.PlayerState.PLAYING) {
                    S.playing = true;
                    renderCtrl();
                }
                if (e.data === YT.PlayerState.PAUSED) {
                    S.playing = false;
                    renderCtrl();
                }
            },
            onError: () =>
                toast("YouTube: video này không thể phát (có thể bị chặn embed)", "warn"),
        },
    });
}
async function fetchYTMeta(vid) {
    if (!vid) return;
    try {
        const r = await fetch(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`
        );
        if (!r.ok) return;
        const d = await r.json();
        const title = san(d.title || "", 100);
        const thumb = `https://img.youtube.com/vi/${vid}/mqdefault.jpg`;
        const i = S.queue.findIndex((t) => t.videoId === vid);
        if (i >= 0 && S.isHost) {
            S.queue[i].title = title;
            S.queue[i].thumb = thumb;
            bcastSelf({ type: M.QUEUE, queue: S.queue });
            if (S.idx === i) {
                $("trk-title").textContent = title;
                $("trk-art").innerHTML = `<img src="${esc(thumb)}" alt="" loading="lazy">`;
            }
        }
    } catch (e) {}
}
