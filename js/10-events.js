document.addEventListener("DOMContentLoaded", () => {
    if (S.name) {
        $("l-cname").value = S.name;
        $("l-jname").value = S.name;
    }
    window.addEventListener("beforeunload", () => {
        if (S.peer) {
            try {
                S.peer.destroy();
            } catch (e) {}
        }
    });
    const savedTheme = localStorage.getItem("syncbeat_theme");
    if (savedTheme === "light") {
        document.documentElement.classList.add("light-theme");
    }
    document.querySelectorAll(".btn-theme-toggle").forEach((btn) => {
        btn.addEventListener("click", () => {
            const isLight = document.documentElement.classList.toggle("light-theme");
            localStorage.setItem("syncbeat_theme", isLight ? "light" : "dark");
        });
    });
    $("l-bcreate").addEventListener("click", createRoom);
    $("l-bjoin").addEventListener("click", joinRoom);
    $("l-cname").addEventListener("keydown", (e) => e.key === "Enter" && createRoom());
    $("l-jcode").addEventListener("keydown", (e) => e.key === "Enter" && joinRoom());
    $("l-jname").addEventListener("keydown", (e) => e.key === "Enter" && $("l-jcode").focus());
    $("l-jcode").addEventListener("input", (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    });
    const urlP = new URLSearchParams(location.search).get("room") || "";
    if (/^[A-Z0-9]{6}$/i.test(urlP)) {
        $("l-jcode").value = urlP.toUpperCase();
        setTimeout(() => $("l-jname").focus(), 100);
    }
    $("btn-leave").addEventListener("click", leaveRoom);
    $("btn-copy").addEventListener("click", () => {
        navigator.clipboard.writeText(S.room).then(() => toast("Đã copy mã phòng!", "ok"));
    });
    $("btn-share").addEventListener("click", () => {
        const url = `${location.origin}${location.pathname}?room=${S.room}`;
        navigator.clipboard.writeText(url).then(() => toast("Đã copy link mời!", "ok"));
    });
    $("btn-pp").addEventListener("click", () => {
        if (!S.queue.length) {
            toast("Thêm bài hát trước đã!", "info");
            return;
        }
        if (S.playing) toHost({ type: M.R_PAUSE });
        else toHost({ type: M.R_PLAY });
    });
    $("btn-next").addEventListener("click", () => {
        if (S.isHost) playNext();
        else toast("Chỉ Host mới có thể chuyển bài", "info");
    });
    $("btn-prev").addEventListener("click", () => {
        if (S.isHost) playPrev();
        else toast("Chỉ Host mới có thể chuyển bài", "info");
    });
    $("btn-shuf").addEventListener("click", () => {
        if (!S.isHost) {
            toast("Chỉ Host mới có thể thay đổi chế độ phát", "info");
            return;
        }
        S.shuffle = !S.shuffle;
        $("btn-shuf").classList.toggle("on", S.shuffle);
        toast(S.shuffle ? "🔀 Shuffle bật" : "🔀 Shuffle tắt", "info");
    });
    $("btn-rep").addEventListener("click", () => {
        if (!S.isHost) {
            toast("Chỉ Host mới có thể thay đổi chế độ phát", "info");
            return;
        }
        S.repeat = !S.repeat;
        $("btn-rep").classList.toggle("on", S.repeat);
        toast(S.repeat ? "🔁 Lặp lại bật" : "🔁 Lặp lại tắt", "info");
    });
    const seekInp = $("seek-inp");
    const seekTrk = $("seek-track");
    const seekFill = $("seek-fill");
    const seekThumb = $("seek-thumb");
    function seekStart() {
        S.seekDrag = true;
        seekTrk.classList.add("drag");
    }
    function seekEnd() {
        S.seekDrag = false;
        seekTrk.classList.remove("drag");
        const pct = seekInp.value / 100000;
        const dur = S.isHost ? getDur() : S.dur;
        toHost({ type: M.R_SEEK, t: pct * dur });
    }
    seekInp.addEventListener("mousedown", seekStart);
    seekInp.addEventListener("touchstart", seekStart, { passive: true });
    seekInp.addEventListener("mouseup", seekEnd);
    seekInp.addEventListener("touchend", seekEnd);
    seekInp.addEventListener("input", () => {
        const pct = seekInp.value / 100000;
        const dur = S.isHost ? getDur() : S.dur;
        seekFill.style.width = pct * 100 + "%";
        seekThumb.style.left = pct * 100 + "%";
        $("t-cur").textContent = fmt(pct * dur);
        seekFill.style.transition = "none";
        setTimeout(() => (seekFill.style.transition = ""), 50);
    });
    const volInp = $("vol-inp");
    volInp.addEventListener("input", () => {
        const v = volInp.value / 100;
        S.vol = v;
        S.aud.volume = v;
        if (S.yt)
            try {
                S.yt.setVolume(volInp.value);
            } catch (e) {}
        $("vol-pct").textContent = volInp.value + "%";
        const ic = $("vol-ic");
        ic.textContent = v === 0 ? "🔇" : v < 0.4 ? "🔈" : v < 0.75 ? "🔉" : "🔊";
    });
    document.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        if ($("scr-room").hidden) return;
        if (e.code === "Space") {
            e.preventDefault();
            $("btn-pp").click();
        }
        if (e.code === "ArrowLeft" && S.isHost && e.altKey) {
            hSeek(Math.max(0, getT() - 10));
        }
        if (e.code === "ArrowRight" && S.isHost && e.altKey) {
            hSeek(getT() + 10);
        }
    });
    document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("on"));
            document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("on"));
            btn.classList.add("on");
            $("tab-" + tab).classList.add("on");
        });
    });
    function addYT() {
        const url = $("yt-inp").value.trim();
        const vid = parseYT(url);
        if (!vid) {
            toast("URL YouTube không hợp lệ", "err");
            return;
        }
        toHost({
            type: M.R_ADD,
            track: {
                id: rid(),
                type: "youtube",
                videoId: vid,
                title: "YouTube…",
                addedBy: san(S.name, 20),
            },
        });
        $("yt-inp").value = "";
        toast("Đang thêm vào hàng đợi…", "info");
    }
    $("btn-addyt").addEventListener("click", addYT);
    $("yt-inp").addEventListener("keydown", (e) => e.key === "Enter" && addYT());
    const fileInp = $("file-inp");
    const fileZone = $("file-zone");
    fileInp.addEventListener("change", (e) => {
        const f = e.target.files[0];
        if (f) handleFile(f);
        e.target.value = "";
    });
    fileZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        fileZone.classList.add("drag");
    });
    fileZone.addEventListener("dragleave", () => fileZone.classList.remove("drag"));
    fileZone.addEventListener("drop", (e) => {
        e.preventDefault();
        fileZone.classList.remove("drag");
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    });

    function sendChat() {
        const text = san($("chat-inp").value);
        if (!text) return;
        toHost({ type: M.R_CHAT, name: san(S.name, 20), text });
        $("chat-inp").value = "";
    }
    $("btn-send").addEventListener("click", sendChat);
    $("chat-inp").addEventListener("keydown", (e) => e.key === "Enter" && sendChat());
    document.addEventListener(
        "click",
        () => {
            if (S.ctx && S.ctx.state === "suspended") S.ctx.resume();
        },
        { once: false, passive: true }
    );
});
