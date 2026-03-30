import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Coins, CheckCircle, ArrowRight } from "lucide-react";

export default function CoinSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id") ?? "";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [coins, setCoins] = useState(0);
  const [newBalance, setNewBalance] = useState(0);

  useEffect(() => {
    if (!sessionId) { setStatus("error"); return; }
    fetch(`/api/coins/verify-purchase?session_id=${encodeURIComponent(sessionId)}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setCoins(d.coins);
          setNewBalance(d.newBalance);
          setStatus("success");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        {status === "loading" && (
          <>
            <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-white/60">Verifying your purchase...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="relative inline-flex">
              <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Coins size={40} className="text-yellow-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle size={16} className="text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold">Purchase Successful!</h1>
              <p className="text-white/60 mt-1">
                {coins} coin{coins !== 1 ? "s" : ""} added to your account
              </p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
              <p className="text-yellow-400/70 text-xs uppercase tracking-wider mb-1">New Balance</p>
              <p className="text-yellow-400 text-3xl font-bold">{newBalance}</p>
              <p className="text-yellow-400/50 text-xs mt-1">coins</p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="w-full flex items-center justify-center gap-2 bg-[#0891B2] text-white rounded-xl py-3 font-medium hover:bg-[#06b6d4] transition-colors"
            >
              Back to Jukebox
              <ArrowRight size={16} />
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
              <Coins size={40} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold">Verification Failed</h1>
              <p className="text-white/60 mt-1">
                We couldn't verify your purchase. If you were charged, please contact support.
              </p>
            </div>
            <button
              onClick={() => navigate("/revenue")}
              className="w-full bg-white/10 text-white rounded-xl py-3 font-medium hover:bg-white/20 transition-colors"
            >
              Go to Revenue
            </button>
          </>
        )}
      </div>
    </div>
  );
}
