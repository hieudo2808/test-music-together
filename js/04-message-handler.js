function onMsg(msg, from) {
    if (!valid(msg)) return;
    if (S.isHost) {
        switch (msg.type) {
            case M.JOIN: {
                const uid = san(msg.uid || "", 20);
                const name = san(msg.name || "Ẩn danh", 20);
                if (!uid || from === "__self__") break;
                S.members[uid] = { name, peerId: from };
                renderMembers();
                sysChat(`${name} đã tham gia 🎉`);
                bcast({ type: M.MEMBERS, members: S.members }, from);
                if (S.asDst && from !== "__self__") {
                    try {
                        const cl = S.peer.call(from, S.asDst.stream);
                        S.calls[from] = cl;
                    } catch (e) {}
                }
                send(from, {
                    type: M.SYNC,
                    queue: S.queue,
                    idx: S.idx,
                    playing: S.playing,
                    curT: getT(),
                    members: S.members,
                });
                break;
            }
            case M.R_PLAY:
                if (RL.ctrl()) hPlay();
                break;
            case M.R_PAUSE:
                if (RL.ctrl()) hPause();
                break;
            case M.R_SEEK:
                if (RL.ctrl() && typeof msg.t === "number" && msg.t >= 0 && msg.t <= 86400)
                    hSeek(msg.t);
                break;
            case M.R_LOAD:
                if (
                    RL.ctrl() &&
                    typeof msg.idx === "number" &&
                    msg.idx >= 0 &&
                    msg.idx < S.queue.length
                )
                    hLoad(msg.idx);
                break;
            case M.R_ADD: {
                if (!RL.add()) {
                    if (from !== "__self__") send(from, { type: "err", msg: "Thêm quá nhanh!" });
                    break;
                }
                const t = cleanTrack(msg.track);
                if (!t) break;
                S.queue.push(t);
                bcastSelf({ type: M.QUEUE, queue: S.queue });
                if (S.idx === -1) hLoad(0);
                if (t.type === "youtube") fetchYTMeta(t.videoId);
                break;
            }
            case M.R_RM: {
                const i = msg.idx;
                if (typeof i !== "number" || i < 0 || i >= S.queue.length) break;
                S.queue.splice(i, 1);
                if (S.idx >= S.queue.length) S.idx = Math.max(0, S.queue.length - 1);
                bcastSelf({ type: M.QUEUE, queue: S.queue });
                break;
            }
            case M.R_CHAT: {
                if (!RL.chat()) break;
                const cm = {
                    type: M.CHAT,
                    from: san(msg.from || S.uid, 20),
                    name: san(msg.name || "?", 20),
                    text: san(msg.text || "", 200),
                    t: Date.now(),
                };
                if (!cm.text) break;
                bcastSelf(cm);
                break;
            }
        }
    }
    switch (msg.type) {
        case M.SYNC:
            S.queue = (Array.isArray(msg.queue) ? msg.queue : []).map(cleanTrack).filter(Boolean);
            S.idx = typeof msg.idx === "number" ? msg.idx : -1;
            S.members = msg.members || {};
            renderMembers();
            renderQueue();
            if (S.idx >= 0 && S.queue[S.idx]) applyLoad(S.idx, msg.curT || 0, msg.playing);
            break;
        case M.QUEUE:
            S.queue = (Array.isArray(msg.queue) ? msg.queue : []).map(cleanTrack).filter(Boolean);
            renderQueue();
            break;
        case M.MEMBERS:
            S.members = msg.members || {};
            renderMembers();
            break;
        case M.PLAY:
            S.playing = true;
            applyPlay(msg.t || 0);
            renderCtrl();
            break;
        case M.PAUSE:
            S.playing = false;
            applyPause(msg.t || 0);
            renderCtrl();
            break;
        case M.SEEK:
            applySeek(msg.t || 0);
            break;
        case M.LOAD:
            S.idx = msg.idx;
            applyLoad(msg.idx, msg.st || 0, msg.play);
            break;
        case M.PROG:
            if (!S.isHost) {
                S.curT = msg.t || 0;
                S.dur = msg.dur || 0;
                if (!S.seekDrag) renderSeek();
            }
            break;
        case M.CHAT:
            renderChat(msg);
            break;
    }
}
