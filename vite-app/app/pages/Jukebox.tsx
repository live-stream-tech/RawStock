import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { ChevronLeft, Music, Plus, Send, Trash2, Search, X, Users, Coins, Wallet, ShoppingCart, CheckCircle } from "lucide-react";
import { useJukebox, QueueItem } from "../contexts/JukeboxContext";
import { useAuth } from "../../lib/auth";
import { TranslateButton } from "../components/TranslateButton";

// ─── YouTube helpers ──────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.hostname.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/");
      const idx = parts.indexOf("embed");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    }
    return null;
  } catch {
    return null;
  }
}

function fmtSecs(s: number): string {
  if (!s || s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ─── Coin packages ────────────────────────────────────────────────────────────

const COIN_PACKAGES = [
  { id: "pack-1",  coins: 1,  priceGBP: "£0.16", label: "1 Coin" },
  { id: "pack-5",  coins: 5,  priceGBP: "£0.75", label: "5 Coins", badge: "Popular" },
  { id: "pack-10", coins: 10, priceGBP: "£1.40", label: "10 Coins" },
  { id: "pack-30", coins: 30, priceGBP: "£3.90", label: "30 Coins", badge: "Best Value" },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function JukeboxPage() {
  const { id } = useParams<{ id: string }>();
  const communityId = parseInt(id ?? "0", 10);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, enterJukebox, leaveJukebox, refetch, onYouTubeEnded } = useJukebox();

  const state = data?.state ?? null;
  const queue = data?.queue ?? [];
  const chat = data?.chat ?? [];

  // ─── Chat ──────────────────────────────────────────────────────────────────
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ─── Add modal ─────────────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [ytUrl, setYtUrl] = useState("");
  const [ytQuery, setYtQuery] = useState("");
  const [ytResults, setYtResults] = useState<{ videoId: string; title: string; thumbnail: string }[]>([]);
  const [ytSearching, setYtSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  // ─── Coin system ───────────────────────────────────────────────────────────
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [freeRemaining, setFreeRemaining] = useState<number | null>(null);
  const [freeLimit] = useState(3);
  // Payment modal: shown when 4th+ request
  const [showPayModal, setShowPayModal] = useState(false);
  const [pendingTrack, setPendingTrack] = useState<{
    videoTitle: string; videoThumbnail: string; videoDurationSecs: number;
    youtubeId?: string; videoId?: number;
  } | null>(null);
  // Coin purchase modal
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyingPackage, setBuyingPackage] = useState<string | null>(null);
  const [payingWithRevenue, setPayingWithRevenue] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // Fetch coin balance and request count
  const fetchCoinStatus = useCallback(async () => {
    if (!user) return;
    try {
      const [balRes, countRes] = await Promise.all([
        fetch("/api/coins/balance"),
        fetch(`/api/coins/request-count?communityId=${communityId}`),
      ]);
      if (balRes.ok) {
        const { balance } = await balRes.json();
        setCoinBalance(balance);
      }
      if (countRes.ok) {
        const { freeRemaining: fr } = await countRes.json();
        setFreeRemaining(fr);
      }
    } catch {}
  }, [user, communityId]);

  useEffect(() => {
    fetchCoinStatus();
  }, [fetchCoinStatus]);

  // ─── YouTube player ────────────────────────────────────────────────────────
  const ytContainerId = useRef(`jukebox-yt-${Math.random().toString(36).slice(2)}`).current;
  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const onYouTubeEndedRef = useRef(onYouTubeEnded);
  onYouTubeEndedRef.current = onYouTubeEnded;

  // ─── Enter / leave ─────────────────────────────────────────────────────────
  useEffect(() => {
    enterJukebox(communityId);
    return () => {
      leaveJukebox();
      resizeCleanupRef.current?.();
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
      if (ytContainerRef.current?.parentNode) {
        ytContainerRef.current.parentNode.removeChild(ytContainerRef.current);
        ytContainerRef.current = null;
      }
    };
  }, [communityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── YouTube IFrame player ─────────────────────────────────────────────────
  useEffect(() => {
    const vid = state?.currentVideoYoutubeId;
    if (!vid) {
      resizeCleanupRef.current?.();
      resizeCleanupRef.current = null;
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
      if (ytContainerRef.current?.parentNode) {
        ytContainerRef.current.parentNode.removeChild(ytContainerRef.current);
        ytContainerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    function ensureYT(): Promise<any> {
      return new Promise((resolve) => {
        const w = window as any;
        if (w.YT?.Player) { resolve(w.YT); return; }
        const prev = w.onYouTubeIframeAPIReady;
        w.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(w.YT); };
        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
          const s = document.createElement("script");
          s.src = "https://www.youtube.com/iframe_api";
          document.body.appendChild(s);
        }
      });
    }

    ensureYT().then((YT: any) => {
      if (cancelled) return;
      const startSec = state?.elapsedSecs && state.elapsedSecs > 0
        ? state.elapsedSecs
        : Math.max(0, (Date.now() - new Date(state!.startedAt).getTime()) / 1000);

      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.loadVideoById({ videoId: vid, startSeconds: startSec });
        } catch {
          try { ytPlayerRef.current.destroy(); } catch {}
          ytPlayerRef.current = null;
        }
      }

      if (!ytPlayerRef.current) {
        const anchor = document.getElementById("jukebox-yt-holder");
        if (!anchor) return;
        const rect = anchor.getBoundingClientRect();
        const container = document.createElement("div");
        container.id = ytContainerId;
        container.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;z-index:10;`;
        document.body.appendChild(container);
        ytContainerRef.current = container;

        const syncPosition = () => {
          const a = document.getElementById("jukebox-yt-holder");
          if (a && container.parentNode) {
            const r = a.getBoundingClientRect();
            container.style.left = `${r.left}px`;
            container.style.top = `${r.top}px`;
            container.style.width = `${r.width}px`;
            container.style.height = `${r.height}px`;
          }
        };
        window.addEventListener("resize", syncPosition);
        window.addEventListener("scroll", syncPosition, true);
        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncPosition) : null;
        ro?.observe(anchor);
        resizeCleanupRef.current = () => {
          window.removeEventListener("resize", syncPosition);
          window.removeEventListener("scroll", syncPosition, true);
          ro?.disconnect();
        };

        ytPlayerRef.current = new YT.Player(ytContainerId, {
          videoId: vid,
          playerVars: { autoplay: 1, rel: 0, controls: 1, playsinline: 1, start: Math.floor(startSec) },
          events: {
            onReady: (e: any) => { try { e.target?.unMute?.(); } catch {} },
            onStateChange: (e: any) => {
              try {
                if (e.data === (window as any).YT?.PlayerState?.ENDED) {
                  onYouTubeEndedRef.current();
                }
              } catch {}
            },
          },
        });
      }
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [state?.currentVideoYoutubeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auto-scroll chat ──────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length]);

  // ─── Auto-start if queue has items but not playing ─────────────────────────
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!user) return;
    if (autoStartedRef.current) return;
    if (!data) return;
    const hasQueue = (data.queue ?? []).some((q) => !q.isPlayed);
    if (hasQueue && !data.state?.isPlaying) {
      autoStartedRef.current = true;
      fetch(`/api/jukebox/${communityId}/next`, { method: "POST" })
        .then(() => refetch())
        .catch(() => {});
    } else {
      autoStartedRef.current = true;
    }
  }, [data, user, communityId, refetch]);

  // ─── Core: add track to queue ──────────────────────────────────────────────
  const doAddTrack = useCallback(async (track: {
    videoTitle: string; videoThumbnail: string; videoDurationSecs: number;
    youtubeId?: string; videoId?: number;
  }) => {
    if (!user) { navigate("/auth"); return; }
    const myName = user.name ?? user.displayName ?? "Guest";
    const myAvatar = user.avatar ?? user.profileImageUrl ?? null;
    await fetch(`/api/jukebox/${communityId}/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: JSON.stringify({
        videoTitle: track.videoTitle,
        videoThumbnail: track.videoThumbnail,
        videoDurationSecs: track.videoDurationSecs,
        youtubeId: track.youtubeId,
        videoId: track.videoId,
        addedBy: myName,
        addedByAvatar: myAvatar,
      }),
    });
    setShowAddModal(false);
    setYtResults([]);
    setYtQuery("");
    setYtUrl("");
    refetch();
    fetchCoinStatus();
  }, [user, communityId, navigate, refetch, fetchCoinStatus]);

  // ─── Request flow: check if free or paid ──────────────────────────────────
  const handleRequestTrack = useCallback(async (track: {
    videoTitle: string; videoThumbnail: string; videoDurationSecs: number;
    youtubeId?: string; videoId?: number;
  }) => {
    if (!user) { navigate("/auth"); return; }
    // If free requests remain, add directly and record
    if (freeRemaining === null || freeRemaining > 0) {
      try {
        await doAddTrack(track);
        // Record free request
        await fetch("/api/coins/record-free-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ communityId }),
        });
        fetchCoinStatus();
      } catch {
        alert("Failed to add track. Please try again.");
      }
      return;
    }
    // 4th+ request: show payment modal
    setPendingTrack(track);
    // Fetch wallet balance for revenue option
    try {
      const res = await fetch("/api/revenue/wallet");
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data.balanceAvailable ?? 0);
      }
    } catch {}
    setShowPayModal(true);
  }, [user, freeRemaining, doAddTrack, communityId, navigate, fetchCoinStatus]);

  // ─── Pay with coins ────────────────────────────────────────────────────────
  const handlePayWithCoins = useCallback(async () => {
    if (!pendingTrack || !user) return;
    if ((coinBalance ?? 0) < 1) {
      // Not enough coins → open buy modal
      setShowPayModal(false);
      setShowBuyModal(true);
      return;
    }
    setPayingWithRevenue(false);
    try {
      const res = await fetch("/api/coins/spend-jukebox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId }),
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.error === "Insufficient coins") {
          setShowPayModal(false);
          setShowBuyModal(true);
          return;
        }
        throw new Error(err.error);
      }
      await doAddTrack(pendingTrack);
      setPendingTrack(null);
      setShowPayModal(false);
      fetchCoinStatus();
    } catch (e: any) {
      alert(e.message ?? "Payment failed. Please try again.");
    }
  }, [pendingTrack, user, coinBalance, communityId, doAddTrack, fetchCoinStatus]);

  // ─── Pay with revenue balance ──────────────────────────────────────────────
  const handlePayWithRevenue = useCallback(async () => {
    if (!pendingTrack || !user) return;
    if ((walletBalance ?? 0) < 30) {
      alert("Insufficient revenue balance. You need at least ¥30 / £0.16.");
      return;
    }
    setPayingWithRevenue(true);
    try {
      const res = await fetch("/api/coins/use-revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      await doAddTrack(pendingTrack);
      setPendingTrack(null);
      setShowPayModal(false);
      fetchCoinStatus();
    } catch (e: any) {
      alert(e.message ?? "Payment failed. Please try again.");
    } finally {
      setPayingWithRevenue(false);
    }
  }, [pendingTrack, user, walletBalance, communityId, doAddTrack, fetchCoinStatus]);

  // ─── Buy coins via Stripe ──────────────────────────────────────────────────
  const handleBuyCoins = useCallback(async (packageId: string) => {
    if (!user) { navigate("/auth"); return; }
    setBuyingPackage(packageId);
    try {
      const res = await fetch("/api/coins/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, origin: window.location.origin }),
      });
      if (!res.ok) throw new Error("Failed to create checkout");
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      alert("Failed to start payment. Please try again.");
    } finally {
      setBuyingPackage(null);
    }
  }, [user, navigate]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const sendChat = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || sendingChat) return;
    if (!user) { navigate("/auth"); return; }
    setSendingChat(true);
    setChatInput("");
    try {
      await fetch(`/api/jukebox/${communityId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ username: user.name ?? user.displayName, avatar: user.avatar ?? user.profileImageUrl, message: msg }),
      });
      refetch();
    } catch {
      setChatInput(msg);
    } finally {
      setSendingChat(false);
    }
  }, [chatInput, sendingChat, user, communityId, navigate, refetch]);

  const handleAddByUrl = useCallback(async () => {
    const url = ytUrl.trim();
    if (!url) return;
    const ytId = extractYouTubeId(url);
    if (!ytId) { alert("Please enter a valid YouTube URL"); return; }
    if (!user) { navigate("/auth"); return; }
    setAddingId(ytId);
    try {
      await handleRequestTrack({
        videoTitle: "YouTube Request",
        videoThumbnail: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
        videoDurationSecs: 0,
        youtubeId: ytId,
      });
    } catch {
      alert("Failed to add video. Please try again.");
    } finally {
      setAddingId(null);
    }
  }, [ytUrl, user, communityId, navigate, handleRequestTrack]);

  const handleSearchYouTube = useCallback(async () => {
    const q = ytQuery.trim();
    if (!q || ytSearching) return;
    setYtSearching(true);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setYtResults(Array.isArray(json) ? json : []);
    } catch {
      alert("YouTube search failed. Please try again.");
    } finally {
      setYtSearching(false);
    }
  }, [ytQuery, ytSearching]);

  const handleAddFromSearch = useCallback(async (item: { videoId: string; title: string; thumbnail: string }) => {
    if (!user) { navigate("/auth"); return; }
    if (addingId === item.videoId) return;
    setAddingId(item.videoId);
    try {
      await handleRequestTrack({
        videoTitle: item.title,
        videoThumbnail: item.thumbnail,
        videoDurationSecs: 0,
        youtubeId: item.videoId,
      });
    } catch {
      alert("Failed to add video. Please try again.");
    } finally {
      setAddingId(null);
    }
  }, [user, communityId, navigate, addingId, handleRequestTrack]);

  const handleRemoveRequest = useCallback(async (item: QueueItem) => {
    if (!user) return;
    const myName = user.name ?? user.displayName ?? "Guest";
    if (item.addedBy !== myName) return;
    try {
      await fetch(`/api/jukebox/${communityId}/queue/${item.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ addedBy: myName }),
      });
      refetch();
    } catch {
      alert("Failed to remove request.");
    }
  }, [user, communityId, refetch]);

  // ─── Progress bar ──────────────────────────────────────────────────────────
  const [elapsedDisplay, setElapsedDisplay] = useState(0);
  useEffect(() => {
    if (!state) return;
    const calcElapsed = () => {
      const base = !state.isPlaying && typeof state.elapsedSecs === "number"
        ? state.elapsedSecs
        : (Date.now() - new Date(state.startedAt).getTime()) / 1000;
      return Math.min(base, state.currentVideoDurationSecs);
    };
    setElapsedDisplay(calcElapsed());
    if (state.isPlaying) {
      const iv = setInterval(() => setElapsedDisplay(calcElapsed()), 1000);
      return () => clearInterval(iv);
    }
  }, [state?.isPlaying, state?.startedAt, state?.currentVideoDurationSecs, state?.currentVideoYoutubeId, state?.elapsedSecs]); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = state?.currentVideoDurationSecs
    ? Math.min(elapsedDisplay / state.currentVideoDurationSecs, 1)
    : 0;

  const myName = user?.name ?? user?.displayName ?? "Guest";

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-sm z-20 relative">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 bg-[#0891B2]/20 border border-[#0891B2]/40 rounded-full px-2.5 py-0.5">
            <Music size={11} className="text-[#0891B2]" />
            <span className="text-[#0891B2] text-xs font-bold tracking-widest">JUKEBOX</span>
          </div>
          <span className="text-sm text-white/60 truncate">Community Listening</span>
        </div>
        {/* Coin balance badge */}
        {user && coinBalance !== null && (
          <button
            onClick={() => setShowBuyModal(true)}
            className="flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full px-2.5 py-0.5 hover:bg-yellow-500/30 transition-colors"
          >
            <Coins size={11} className="text-yellow-400" />
            <span className="text-yellow-400 text-xs font-bold">{coinBalance}</span>
          </button>
        )}
        {state?.watchersCount != null && (
          <div className="flex items-center gap-1 text-white/50 text-xs">
            <Users size={12} />
            <span>{state.watchersCount}</span>
          </div>
        )}
      </div>

      {/* Now Playing */}
      <div className="relative bg-black" style={{ aspectRatio: "16/9", maxHeight: "40vh" }}>
        {state?.currentVideoYoutubeId ? (
          <div id="jukebox-yt-holder" className="absolute inset-0 bg-black" />
        ) : state?.currentVideoThumbnail ? (
          <img
            src={state.currentVideoThumbnail}
            alt={state.currentVideoTitle ?? ""}
            className="w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0a0f]">
            <Music size={48} className="text-white/20" />
            <p className="text-white/40 text-sm">No track playing</p>
          </div>
        )}

        {/* Overlay info */}
        {state?.currentVideoTitle && !state.currentVideoYoutubeId && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white font-semibold text-sm line-clamp-1">{state.currentVideoTitle}</p>
          </div>
        )}

        {/* Progress bar */}
        {state && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-[#0891B2] transition-all duration-1000"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Now playing info bar */}
      {state?.currentVideoTitle && (
        <div className="px-4 py-2 bg-[#111118] border-b border-white/5 flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{state.currentVideoTitle}</p>
            <p className="text-white/40 text-xs">
              {fmtSecs(elapsedDisplay)} / {fmtSecs(state.currentVideoDurationSecs)}
            </p>
          </div>
          {state.isPlaying && (
            <div className="flex items-center gap-1">
              <span className="w-1 h-3 bg-[#0891B2] rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-4 bg-[#0891B2] rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
              <span className="w-1 h-2 bg-[#0891B2] rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
            </div>
          )}
        </div>
      )}

      {/* Queue */}
      <div className="px-4 py-2 border-b border-white/5 bg-[#0d0d14]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Queue</span>
            {/* Free request indicator */}
            {user && freeRemaining !== null && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                freeRemaining > 0
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
              }`}>
                {freeRemaining > 0 ? `${freeRemaining} free left` : "1 coin/request"}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              if (!user) { navigate("/auth"); return; }
              setShowAddModal(true);
            }}
            className="flex items-center gap-1 text-xs text-[#0891B2] hover:text-[#06b6d4] transition-colors"
          >
            <Plus size={14} />
            Add Track
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {queue.filter(q => !q.isPlayed).length === 0 ? (
            <p className="text-white/30 text-xs py-1">No tracks in queue — add one!</p>
          ) : (
            queue.filter(q => !q.isPlayed).map((item) => {
              const isCurrentlyPlaying =
                state?.isPlaying &&
                ((item.youtubeId && item.youtubeId === state.currentVideoYoutubeId) ||
                 (item.videoId != null && item.videoId === state.currentVideoId));
              const isMine = item.addedBy === myName;
              return (
                <div
                  key={item.id}
                  className={`flex-shrink-0 flex items-center gap-2 rounded-lg px-2.5 py-1.5 border text-xs ${
                    isCurrentlyPlaying
                      ? "bg-[#0891B2]/20 border-[#0891B2]/50"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  {item.videoThumbnail && (
                    <img src={item.videoThumbnail} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                  )}
                  <div className="max-w-[120px]">
                    <p className="text-white/80 truncate">{item.videoTitle}</p>
                    <p className="text-white/40 truncate">{item.addedBy}</p>
                  </div>
                  {isMine && !isCurrentlyPlaying && (
                    <button
                      onClick={() => handleRemoveRequest(item)}
                      className="ml-1 text-white/30 hover:text-red-400 transition-colors"
                      title="Remove my request"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 min-h-0">
        {chat.length === 0 ? (
          <p className="text-white/30 text-xs text-center mt-4">No messages yet. Say hello!</p>
        ) : (
          chat.map((msg) => {
            const isMe = msg.username === myName;
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                {!isMe && (
                  <div className="w-6 h-6 rounded-full bg-white/10 flex-shrink-0 overflow-hidden">
                    {msg.avatar ? (
                      <img src={msg.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/40 text-xs">
                        {msg.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
                <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                  {!isMe && <span className="text-white/40 text-[10px] ml-1">{msg.username}</span>}
                  <div className={`rounded-2xl px-3 py-1.5 text-sm ${isMe ? "bg-[#0891B2] text-white rounded-tr-sm" : "bg-white/10 text-white/90 rounded-tl-sm"}`}>
                    {msg.message}
                  </div>
                  <TranslateButton text={msg.message} className="mt-0.5" />
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat input */}
      <div className="px-4 py-3 border-t border-white/10 bg-[#0a0a0f]/80 backdrop-blur-sm">
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
            placeholder={user ? "Type a message..." : "Sign in to chat"}
            disabled={!user || sendingChat}
            className="flex-1 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#0891B2]/50 disabled:opacity-50"
          />
          <button
            onClick={sendChat}
            disabled={!chatInput.trim() || sendingChat || !user}
            className="w-9 h-9 rounded-full bg-[#0891B2] flex items-center justify-center disabled:opacity-40 hover:bg-[#06b6d4] transition-colors flex-shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* Add Track Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div
            className="w-full max-w-lg bg-[#111118] rounded-t-2xl p-5 space-y-4 border-t border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-base">Add to Queue</h3>
                {user && freeRemaining !== null && (
                  <p className="text-xs mt-0.5">
                    {freeRemaining > 0
                      ? <span className="text-green-400">{freeRemaining} free request{freeRemaining !== 1 ? "s" : ""} remaining today</span>
                      : <span className="text-yellow-400">1 coin per request (you have {coinBalance ?? 0} coins)</span>
                    }
                  </p>
                )}
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* URL input */}
            <div className="space-y-1.5">
              <label className="text-white/50 text-xs font-medium uppercase tracking-wider">YouTube URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#0891B2]/50"
                />
                <button
                  onClick={handleAddByUrl}
                  disabled={!ytUrl.trim() || addingId !== null}
                  className="px-3 py-2 bg-[#0891B2] text-white text-sm rounded-lg disabled:opacity-40 hover:bg-[#06b6d4] transition-colors whitespace-nowrap"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="space-y-1.5">
              <label className="text-white/50 text-xs font-medium uppercase tracking-wider">Search YouTube</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ytQuery}
                  onChange={(e) => setYtQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearchYouTube(); }}
                  placeholder="Artist, song, or keyword..."
                  className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#0891B2]/50"
                />
                <button
                  onClick={handleSearchYouTube}
                  disabled={!ytQuery.trim() || ytSearching}
                  className="px-3 py-2 bg-white/10 text-white text-sm rounded-lg disabled:opacity-40 hover:bg-white/20 transition-colors"
                >
                  {ytSearching ? "..." : <Search size={16} />}
                </button>
              </div>

              {ytResults.length > 0 && (
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {ytResults.map((item) => (
                    <button
                      key={item.videoId}
                      onClick={() => handleAddFromSearch(item)}
                      disabled={addingId === item.videoId}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors text-left disabled:opacity-50"
                    >
                      <img src={item.thumbnail} alt="" className="w-12 h-9 rounded object-cover flex-shrink-0" />
                      <span className="text-white/80 text-sm line-clamp-2 flex-1">{item.title}</span>
                      <Plus size={16} className="text-[#0891B2] flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Modal (4th+ request) */}
      {showPayModal && pendingTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-[#111118] rounded-2xl p-5 space-y-4 border border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-base">Request Track</h3>
              <button onClick={() => setShowPayModal(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Track preview */}
            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
              {pendingTrack.videoThumbnail && (
                <img src={pendingTrack.videoThumbnail} alt="" className="w-12 h-9 rounded object-cover flex-shrink-0" />
              )}
              <p className="text-white/80 text-sm line-clamp-2 flex-1">{pendingTrack.videoTitle}</p>
            </div>

            <p className="text-white/50 text-xs text-center">
              You've used your {freeLimit} free requests today. Choose how to pay for this request.
            </p>

            {/* Option 1: Use coins */}
            <button
              onClick={handlePayWithCoins}
              disabled={payingWithRevenue}
              className="w-full flex items-center justify-between bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Coins size={18} className="text-yellow-400" />
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-medium">Use 1 Coin</p>
                  <p className="text-white/40 text-xs">Balance: {coinBalance ?? 0} coins</p>
                </div>
              </div>
              {(coinBalance ?? 0) >= 1 ? (
                <CheckCircle size={16} className="text-yellow-400" />
              ) : (
                <span className="text-yellow-400 text-xs font-medium">Buy coins →</span>
              )}
            </button>

            {/* Option 2: Use revenue balance */}
            <button
              onClick={handlePayWithRevenue}
              disabled={payingWithRevenue || (walletBalance ?? 0) < 30}
              className="w-full flex items-center justify-between bg-[#0891B2]/10 border border-[#0891B2]/30 rounded-xl p-4 hover:bg-[#0891B2]/20 transition-colors disabled:opacity-40"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#0891B2]/20 flex items-center justify-center">
                  <Wallet size={18} className="text-[#0891B2]" />
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-medium">Use Revenue Balance</p>
                  <p className="text-white/40 text-xs">
                    {walletBalance !== null ? `¥${walletBalance} available` : "Loading..."} · costs ¥30
                  </p>
                </div>
              </div>
              {payingWithRevenue && (
                <div className="w-4 h-4 border-2 border-[#0891B2] border-t-transparent rounded-full animate-spin" />
              )}
            </button>

            <p className="text-white/30 text-[10px] text-center">
              1 coin = ¥30 · Revenue from your streams can be used directly
            </p>
          </div>
        </div>
      )}

      {/* Buy Coins Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-[#111118] rounded-2xl p-5 space-y-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-base">Buy Coins</h3>
                <p className="text-white/40 text-xs mt-0.5">1 coin = ¥30 / £0.16</p>
              </div>
              <button onClick={() => setShowBuyModal(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {COIN_PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handleBuyCoins(pkg.id)}
                  disabled={buyingPackage !== null}
                  className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3.5 hover:bg-white/10 hover:border-yellow-500/40 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Coins size={16} className="text-yellow-400" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">{pkg.label}</span>
                        {pkg.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            {pkg.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-white/40 text-xs">{pkg.priceGBP}</p>
                    </div>
                  </div>
                  {buyingPackage === pkg.id ? (
                    <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ShoppingCart size={16} className="text-white/40" />
                  )}
                </button>
              ))}
            </div>

            <p className="text-white/30 text-[10px] text-center">
              Payments processed securely by Stripe. Coins never expire.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
