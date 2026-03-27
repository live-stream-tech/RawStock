import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { currentUser, userRevenueStats, revenueTransactions, payoutRequests } from "../data/mockData";
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  BarChart3,
  Wallet,
  CreditCard,
  Download,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  PieChart as PieChartIcon,
  Coins,
  ShoppingCart,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AppButton } from "../components/ui/AppButton";
import KycVerificationModal from "../components/KycVerificationModal";

const COLORS = ["#0891B2", "#475569", "#64748B", "#94A3B8"];

export default function Revenue() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState<"overview" | "transactions" | "payouts">("overview");
  const [showKycModal, setShowKycModal] = useState(false);
  const [isKycVerified, setIsKycVerified] = useState(currentUser.isKycVerified);

  // ─── Coin system ───────────────────────────────────────────────────────────────
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyingPackage, setBuyingPackage] = useState<string | null>(null);

  const COIN_PACKAGES = [
    { id: "pack-1",  coins: 1,  priceGBP: "£0.16", label: "1 Coin" },
    { id: "pack-5",  coins: 5,  priceGBP: "£0.75", label: "5 Coins", badge: "Popular" },
    { id: "pack-10", coins: 10, priceGBP: "£1.40", label: "10 Coins" },
    { id: "pack-30", coins: 30, priceGBP: "£3.90", label: "30 Coins", badge: "Best Value" },
  ];

  useEffect(() => {
    fetch("/api/coins/balance")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setCoinBalance(d.balance))
      .catch(() => {});
  }, []);

  const handleBuyCoins = async (packageId: string) => {
    setBuyingPackage(packageId);
    try {
      const res = await fetch("/api/coins/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, origin: window.location.origin }),
      });
      if (!res.ok) throw new Error("Failed");
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      alert("Failed to start payment. Please try again.");
    } finally {
      setBuyingPackage(null);
    }
  };

  if (!currentUser.isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#334155] p-6 flex flex-col items-center justify-center text-center text-white">
        <h1 className="text-2xl font-black mb-4 italic tracking-tighter uppercase">LOGIN REQUIRED</h1>
        <AppButton onClick={() => navigate("/auth")} size="xl">Login to View Revenue</AppButton>
      </div>
    );
  }

  const pieData = [
    { name: "Live Streams", value: userRevenueStats.bySource.liveStreams },
    { name: "Video Sales", value: userRevenueStats.bySource.videoSales },
    { name: "Tips", value: userRevenueStats.bySource.tips },
    { name: "Edited Videos", value: userRevenueStats.bySource.editedVideos },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded font-black uppercase tracking-tighter">Pending</span>;
      case "distributed":
        return <span className="text-[10px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded font-black uppercase tracking-tighter">Distributed</span>;
      case "refunded":
        return <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded font-black uppercase tracking-tighter">Refunded</span>;
      case "processing":
        return <span className="text-[10px] bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded font-black uppercase tracking-tighter">Processing</span>;
      case "completed":
        return <span className="text-[10px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded font-black uppercase tracking-tighter">Completed</span>;
      case "failed":
        return <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded font-black uppercase tracking-tighter">Failed</span>;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "live_stream": return "Live Stream";
      case "video_sale": return "Video Sale";
      case "tip": return "Tip";
      case "edited_video": return "Edited Video";
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-[#334155] pb-20 text-white">
      {/* Header */}
      <div className="sticky top-0 bg-[#475569]/95 backdrop-blur-xl border-b border-slate-700 px-4 py-4 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-black text-lg italic tracking-tighter uppercase">REVENUE</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Dashboard</p>
          </div>
        </div>
        {isKycVerified ? (
          <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full text-green-500">
            <ShieldCheck size={14} />
            <span className="text-[9px] font-black uppercase tracking-tighter">Verified</span>
          </div>
        ) : (
          <button 
            onClick={() => setShowKycModal(true)}
            className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full text-amber-500 hover:bg-amber-500/20 transition-all"
          >
            <AlertTriangle size={14} />
            <span className="text-[9px] font-black uppercase tracking-tighter">Identity Req</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700 px-4 bg-[#475569]/50 backdrop-blur sticky top-[69px] z-10">
        <div className="flex gap-6">
          {(["overview", "transactions", "payouts"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                selectedTab === tab ? "border-[#0891B2] text-[#0891B2]" : "border-transparent text-slate-400"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {selectedTab === "overview" && (
          <div className="space-y-6">
            {/* Coin Balance Card */}
            <div className="bg-gradient-to-br from-yellow-600/30 to-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Coins size={20} className="text-yellow-400" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-400/70">Jukebox Coins</p>
                  <p className="text-xl font-black italic tracking-tighter text-yellow-400">
                    {coinBalance !== null ? coinBalance : "--"}
                  </p>
                  <p className="text-[9px] text-yellow-400/50">1 coin = ¥30 / £0.16</p>
                </div>
              </div>
              <button
                onClick={() => setShowBuyModal(true)}
                className="flex items-center gap-1.5 bg-yellow-500/20 border border-yellow-500/40 rounded-xl px-3 py-2 text-yellow-400 hover:bg-yellow-500/30 transition-colors text-xs font-bold"
              >
                <ShoppingCart size={14} />
                Buy Coins
              </button>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-[#0891B2] to-[#0d9488] rounded-2xl p-5 shadow-2xl shadow-[#0891B2]/20 border border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <TrendingUp size={48} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70">Total Gross</p>
                </div>
                <p className="text-2xl font-black italic tracking-tighter">
                  ¥{userRevenueStats.totalRevenue.toLocaleString()}
                </p>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Withdrawable</p>
                  <p className="text-2xl font-black italic tracking-tighter text-green-500">
                    ¥{userRevenueStats.withdrawable.toLocaleString()}
                  </p>
                </div>
                {!isKycVerified && (
                  <div className="mt-2 flex items-center gap-1 text-[8px] font-bold text-amber-500 uppercase tracking-tighter">
                    <AlertTriangle size={10} />
                    KYC Required
                  </div>
                )}
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-lg">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Pending</p>
                <p className="text-lg font-black italic tracking-tighter text-amber-500">
                  ¥{userRevenueStats.pendingDistribution.toLocaleString()}
                </p>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-lg">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Distributed</p>
                <p className="text-lg font-black italic tracking-tighter text-slate-300">
                  ¥{userRevenueStats.distributed.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Chart Trend */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-[#0891B2]" />
                  <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-300">Revenue Trend (7D)</h3>
                </div>
                <span className="text-[9px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">+12.5%</span>
              </div>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={userRevenueStats.byPeriod}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#64748B"
                      fontSize={10}
                      fontWeight="bold"
                      axisLine={false}
                      tickLine={false}
                      tick={{ dy: 10 }}
                    />
                    <YAxis
                      stroke="#64748B"
                      fontSize={10}
                      fontWeight="bold"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `¥${value / 1000}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1E293B",
                        border: "1px solid #334155",
                        borderRadius: "12px",
                        fontSize: "10px",
                        fontWeight: "bold",
                        color: "white"
                      }}
                      itemStyle={{ color: "#0891B2" }}
                      formatter={(value: number) => [`¥${value.toLocaleString()}`, "Revenue"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#0891B2"
                      strokeWidth={4}
                      dot={{ fill: "#0891B2", r: 4, strokeWidth: 2, stroke: "#334155" }}
                      activeDot={{ r: 6, stroke: "white", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue Share Pie */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-6">
                <PieChartIcon size={16} className="text-[#0891B2]" />
                <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-300">Revenue Sources</h3>
              </div>
              <div className="flex items-center">
                <div className="h-[140px] w-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2 ml-4">
                  {pieData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="font-bold text-slate-400">{item.name}</span>
                      </div>
                      <span className="font-black">¥{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {!isKycVerified && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-start gap-4 mb-4 shadow-xl">
                  <ShieldAlert className="text-amber-500 shrink-0" size={24} />
                  <div className="min-w-0">
                    <h4 className="text-xs font-black uppercase tracking-widest text-amber-500 mb-1">Identity verification required</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                      Identity verification is required to request a payout. Please complete KYC to proceed.
                    </p>
                    <AppButton variant="amber" size="sm" onClick={() => setShowKycModal(true)}>
                      Start Verification
                    </AppButton>
                  </div>
                </div>
              )}
              
              <AppButton 
                fullWidth 
                size="xl" 
                variant={isKycVerified ? "primary" : "secondary"}
                disabled={!isKycVerified}
                onClick={() => setSelectedTab("payouts")}
                icon={<Wallet size={18} />}
              >
                Payout Request
              </AppButton>

              <AppButton 
                fullWidth 
                variant="outline"
                size="lg"
                onClick={() => {}}
                icon={<Download size={16} />}
              >
                Download Report (.PDF)
              </AppButton>
            </div>
          </div>
        )}

        {selectedTab === "transactions" && (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {["All", "Live Streams", "Video Sales", "Tips", "Edited"].map((filter, i) => (
                <button
                  key={filter}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                    i === 0 ? "bg-[#0891B2] text-white border-[#0891B2]" : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {revenueTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 hover:border-[#0891B2]/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[9px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-black uppercase tracking-tighter">
                          {getTypeLabel(transaction.type)}
                        </span>
                        {getStatusBadge(transaction.status)}
                      </div>
                      <h3 className="font-bold text-sm text-white truncate group-hover:text-[#0891B2] transition-colors">{transaction.contentTitle}</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">
                        {transaction.creatorName} • {transaction.purchaseDate}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-black text-lg italic tracking-tighter">
                        ¥{transaction.totalAmount.toLocaleString()}
                      </p>
                      <div className="flex items-center justify-end gap-1 text-[9px] text-slate-500 font-bold uppercase mt-1">
                        {transaction.paymentMethod === "stripe" ? <CreditCard size={10} /> : <Wallet size={10} />}
                        <span>{transaction.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Share Breakdown */}
                  <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700/50">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0891B2]">Revenue Share Breakdown</p>
                      <span className="text-[9px] text-slate-500">Gross: ¥{transaction.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Creator</span>
                        <span className="font-black text-white">¥{transaction.breakdown.creator.toLocaleString()}</span>
                      </div>
                      {transaction.breakdown.editor && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Editor</span>
                          <span className="font-black text-white">¥{transaction.breakdown.editor.toLocaleString()}</span>
                        </div>
                      )}
                      {transaction.breakdown.supporter && (
                        <div className="flex justify-between">
                          <span className="text-[#0891B2]">Supporter</span>
                          <span className="font-black text-[#0891B2]">¥{transaction.breakdown.supporter.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between opacity-50">
                        <span className="text-slate-400">Platform</span>
                        <span className="font-black text-white">¥{transaction.breakdown.platform.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === "payouts" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-green-500 to-[#0d9488] rounded-2xl p-6 shadow-2xl shadow-green-500/20 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Wallet size={64} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-2">Available for Payout</p>
              <p className="text-4xl font-black italic tracking-tighter mb-6">
                ¥{userRevenueStats.withdrawable.toLocaleString()}
              </p>
              <AppButton fullWidth variant="success" size="xl" onClick={() => {}} className="bg-white text-green-600 hover:bg-slate-50">
                Request Payout Now
              </AppButton>
            </div>

            <div>
              <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-3 px-1">Payout Method</h3>
              <div className="space-y-2">
                <div className="bg-slate-800 border-2 border-[#0891B2] rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center text-white">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white uppercase tracking-tight">Bank Transfer</p>
                      <p className="text-[10px] text-slate-400 font-bold">Barclays Bank • *** 1234567</p>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full border-4 border-[#0891B2] flex items-center justify-center">
                    <div className="w-2 h-2 bg-[#0891B2] rounded-full" />
                  </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex items-center justify-between hover:border-slate-600 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#0070ba]/20 rounded-xl flex items-center justify-center text-[#0070ba]">
                      <Wallet size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white uppercase tracking-tight">PayPal</p>
                      <p className="text-[10px] text-slate-400 font-bold">yamada***@email.com</p>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full border border-slate-700" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-3 px-1">Recent Requests</h3>
              <div className="space-y-3">
                {payoutRequests.map((payout) => (
                  <div key={payout.id} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        {getStatusBadge(payout.status)}
                        <p className="text-xl font-black italic tracking-tighter text-white mt-2">
                          ¥{payout.amount.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1 text-[9px] text-slate-500 font-black uppercase tracking-tighter">
                          {payout.method === "bank_transfer" ? <CreditCard size={12} /> : <Wallet size={12} />}
                          <span>{payout.method}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">{payout.requestedAt}</p>
                      </div>
                    </div>

                    {payout.bankInfo && (
                      <div className="bg-slate-900/50 rounded-xl p-3 text-[10px] border border-slate-700/50">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-slate-500 font-bold">Recipient</span>
                          <span className="text-slate-300 font-black uppercase">{payout.bankInfo.bankName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-bold">Account</span>
                          <span className="text-slate-300 font-black">*** {payout.bankInfo.accountNumber.slice(-4)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <KycVerificationModal 
        isOpen={showKycModal} 
        onClose={() => setShowKycModal(false)} 
        onVerified={() => setIsKycVerified(true)} 
      />

      {/* Buy Coins Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-slate-800 rounded-2xl p-5 space-y-4 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-black text-base italic tracking-tighter uppercase">Buy Jukebox Coins</h3>
                <p className="text-slate-400 text-xs mt-0.5">1 coin = ¥30 / £0.16 · Use to request tracks</p>
              </div>
              <button onClick={() => setShowBuyModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {COIN_PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handleBuyCoins(pkg.id)}
                  disabled={buyingPackage !== null}
                  className="w-full flex items-center justify-between bg-slate-700/50 border border-slate-600 rounded-xl p-3.5 hover:bg-slate-700 hover:border-yellow-500/40 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Coins size={16} className="text-yellow-400" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-bold">{pkg.label}</span>
                        {pkg.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            {pkg.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs">{pkg.priceGBP}</p>
                    </div>
                  </div>
                  {buyingPackage === pkg.id ? (
                    <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ShoppingCart size={16} className="text-slate-400" />
                  )}
                </button>
              ))}
            </div>

            <p className="text-slate-500 text-[10px] text-center">
              Payments processed securely by Stripe. Coins never expire.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
