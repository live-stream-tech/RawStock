import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { ChevronLeft, Info, Calendar, CheckCircle, AlertCircle, Users, DollarSign, Settings } from "lucide-react";

interface PricingInfo {
  memberCount: number;
  dailyRate: number;
  minDays: number;
  minAmount: number;
  ratePerMember: number;
}

interface AvailabilityInfo {
  available: boolean;
  conflicts: { id: number; startDate: string; endDate: string }[];
}

interface Moderator {
  userId: number;
  displayName: string | null;
  profileImageUrl: string | null;
}

interface RevenueSettings {
  moderators: Moderator[];
  distribution: Record<string, number>;
  revenueStructure: { eventFund: number; adminAndMods: number; platform: number };
}

const API_BASE = "";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AdReservationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const communityId = Number(id) || 0;

  // タブ: apply | revenue
  const [tab, setTab] = useState<"apply" | "revenue">("apply");

  // 料金情報
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
  const [pricingLoading, setPricingLoading] = useState(true);

  // フォーム
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // 空き枠確認
  const [availability, setAvailability] = useState<AvailabilityInfo | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  // 料金計算
  const [calculatedDays, setCalculatedDays] = useState(0);
  const [calculatedTotal, setCalculatedTotal] = useState(0);

  // 送信
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 収益分配設定
  const [revenueSettings, setRevenueSettings] = useState<RevenueSettings | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [revenueSaving, setRevenueSaving] = useState(false);
  const [revenueSaveMsg, setRevenueSaveMsg] = useState("");

  // 料金情報取得
  useEffect(() => {
    if (!communityId) return;
    setPricingLoading(true);
    fetch(`${API_BASE}/api/community-ads/pricing?communityId=${communityId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.dailyRate !== undefined) setPricing(data);
      })
      .finally(() => setPricingLoading(false));
  }, [communityId]);

  // 日付変更時に料金計算
  useEffect(() => {
    if (!startDate || !endDate || !pricing) {
      setCalculatedDays(0);
      setCalculatedTotal(0);
      setAvailability(null);
      return;
    }
    const startD = new Date(startDate);
    const endD = new Date(endDate);
    if (isNaN(startD.getTime()) || isNaN(endD.getTime()) || endD < startD) {
      setCalculatedDays(0);
      setCalculatedTotal(0);
      return;
    }
    const days = Math.ceil((endD.getTime() - startD.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    setCalculatedDays(days);
    setCalculatedTotal(days * pricing.dailyRate);
  }, [startDate, endDate, pricing]);

  // 空き枠確認
  const checkAvailability = useCallback(async () => {
    if (!startDate || !endDate || !communityId) return;
    setAvailabilityLoading(true);
    try {
      const r = await fetch(
        `${API_BASE}/api/community-ads/availability?communityId=${communityId}&start=${startDate}&end=${endDate}`
      );
      const data = await r.json();
      setAvailability(data);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [communityId, startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate) {
      const t = setTimeout(checkAvailability, 500);
      return () => clearTimeout(t);
    }
  }, [startDate, endDate, checkAvailability]);

  // 収益分配設定取得
  useEffect(() => {
    if (tab !== "revenue" || !communityId) return;
    setRevenueLoading(true);
    fetch(`${API_BASE}/api/community-ads/revenue-settings/${communityId}`, {
      headers: getAuthHeaders(),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.moderators) {
          setRevenueSettings(data);
          setDistribution(data.distribution ?? {});
        }
      })
      .finally(() => setRevenueLoading(false));
  }, [tab, communityId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setSubmitError("料金規約に同意してください");
      return;
    }
    if (!availability?.available) {
      setSubmitError("指定期間は既に予約済みです。別の日程を選んでください。");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const r = await fetch(`${API_BASE}/api/community-ads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId,
          companyName,
          contactName,
          email,
          bannerUrl,
          linkUrl,
          startDate,
          endDate,
          agreedToTerms,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setSubmitError(data.error ?? "申し込みに失敗しました");
      } else {
        setSubmitSuccess(true);
      }
    } catch {
      setSubmitError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevenueSave = async () => {
    const total = Object.values(distribution).reduce((s, v) => s + Number(v), 0);
    if (Math.abs(total - 100) > 1) {
      setRevenueSaveMsg(`合計が${total}%です。100%になるよう調整してください。`);
      return;
    }
    setRevenueSaving(true);
    setRevenueSaveMsg("");
    try {
      const r = await fetch(`${API_BASE}/api/community-ads/revenue-settings/${communityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ distribution }),
      });
      const data = await r.json();
      if (!r.ok) {
        setRevenueSaveMsg(data.error ?? "保存に失敗しました");
      } else {
        setRevenueSaveMsg("保存しました");
      }
    } catch {
      setRevenueSaveMsg("通信エラーが発生しました");
    } finally {
      setRevenueSaving(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const maxDate = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split("T")[0];
  })();

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <div className="bg-[#1E293B] rounded-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">申し込みを受け付けました</h2>
          <p className="text-slate-400 text-sm mb-6">
            モデレーターの審査後、管理人が最終承認します。<br />
            審査結果はメールでご連絡します。
          </p>
          <button
            onClick={() => navigate(-1)}
            className="bg-[#0891B2] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#0891B2]/90 transition-all"
          >
            コミュニティに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] pb-20">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-[#0F172A]/95 backdrop-blur border-b border-slate-700/50 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-white font-bold text-lg">コミュニティ広告</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* タブ */}
        <div className="flex gap-2 mb-6 bg-[#1E293B] rounded-xl p-1">
          <button
            onClick={() => setTab("apply")}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              tab === "apply" ? "bg-[#0891B2] text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            広告申し込み
          </button>
          <button
            onClick={() => setTab("revenue")}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              tab === "revenue" ? "bg-[#0891B2] text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            収益分配設定
          </button>
        </div>

        {tab === "apply" && (
          <>
            {/* 料金情報カード */}
            {pricingLoading ? (
              <div className="bg-[#1E293B] rounded-2xl p-6 mb-6 animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-1/2 mb-3" />
                <div className="h-8 bg-slate-700 rounded w-3/4" />
              </div>
            ) : pricing ? (
              <div className="bg-gradient-to-br from-[#0891B2]/20 to-indigo-900/30 border border-[#0891B2]/30 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5 text-[#0891B2]" />
                  <h2 className="text-white font-bold">広告料金</h2>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-[#0F172A]/50 rounded-xl p-3">
                    <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                      <Users className="w-3 h-3" />
                      現在のメンバー数
                    </div>
                    <div className="text-white font-bold text-xl">{pricing.memberCount.toLocaleString()}人</div>
                  </div>
                  <div className="bg-[#0F172A]/50 rounded-xl p-3">
                    <div className="text-slate-400 text-xs mb-1">1日あたりの料金</div>
                    <div className="text-[#0891B2] font-bold text-xl">
                      ¥{pricing.dailyRate.toLocaleString()}
                    </div>
                    <div className="text-slate-500 text-xs">({pricing.ratePerMember}円 × {pricing.memberCount.toLocaleString()}人)</div>
                  </div>
                </div>
                <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-3 flex gap-2">
                  <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-amber-300 text-xs leading-relaxed">
                    <strong>料金固定の保証：</strong>予約時点のメンバー数（{pricing.memberCount.toLocaleString()}人）で料金が確定します。
                    その後メンバーが増えても追加請求はありません。<br />
                    最低出稿金額 ¥10,000 / 最短 {pricing.minDays}日間
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-900/20 border border-red-700/30 rounded-2xl p-4 mb-6 text-red-400 text-sm">
                料金情報の取得に失敗しました
              </div>
            )}

            {/* 収益分配の説明 */}
            <div className="bg-[#1E293B] rounded-2xl p-4 mb-6">
              <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-400" />
                収益分配の仕組み
              </h3>
              <div className="space-y-2">
                {[
                  { label: "イベント基金", pct: 10, color: "bg-emerald-500" },
                  { label: "管理人・モデレーター", pct: 70, color: "bg-[#0891B2]" },
                  { label: "プラットフォーム", pct: 20, color: "bg-slate-500" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-24 text-slate-400 text-xs">{item.label}</div>
                    <div className="flex-1 bg-slate-700 rounded-full h-2">
                      <div
                        className={`${item.color} h-2 rounded-full`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                    <div className="text-white text-xs font-bold w-8 text-right">{item.pct}%</div>
                  </div>
                ))}
              </div>
              <p className="text-slate-500 text-xs mt-3">
                ※ 管理人・モデレーター間の分配比率は「収益分配設定」タブで管理人が設定できます
              </p>
            </div>

            {/* 申し込みフォーム */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-[#1E293B] rounded-2xl p-6">
                <h3 className="text-white font-bold mb-4">申し込み情報</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">会社名・団体名 *</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                      placeholder="株式会社〇〇"
                      className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-[#0891B2]"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">担当者名 *</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      required
                      placeholder="山田 太郎"
                      className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-[#0891B2]"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">メールアドレス *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="contact@example.com"
                      className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-[#0891B2]"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">バナー画像URL *</label>
                    <input
                      type="url"
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      required
                      placeholder="https://example.com/banner.jpg"
                      className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-[#0891B2]"
                    />
                    <p className="text-slate-500 text-xs mt-1">推奨サイズ: 1200×300px（横長）</p>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">クリック先URL（任意）</label>
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-[#0891B2]"
                    />
                  </div>
                </div>
              </div>

              {/* 掲載期間 */}
              <div className="bg-[#1E293B] rounded-2xl p-6">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#0891B2]" />
                  掲載期間
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">開始日 *</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={today}
                      max={maxDate}
                      required
                      className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#0891B2]"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">終了日 *</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || today}
                      max={maxDate}
                      required
                      className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#0891B2]"
                    />
                  </div>
                </div>

                {/* 料金計算結果 */}
                {calculatedDays > 0 && pricing && (
                  <div className="bg-[#0F172A]/50 rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-400 text-sm">掲載日数</span>
                      <span className="text-white font-bold">{calculatedDays}日間</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-400 text-sm">1日あたり</span>
                      <span className="text-white">¥{pricing.dailyRate.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-slate-700 pt-2 flex justify-between items-center">
                      <span className="text-white font-bold">合計金額</span>
                      <span
                        className={`font-bold text-lg ${
                          calculatedTotal < 10000 ? "text-red-400" : "text-[#0891B2]"
                        }`}
                      >
                        ¥{calculatedTotal.toLocaleString()}
                      </span>
                    </div>
                    {calculatedTotal < 10000 && (
                      <p className="text-red-400 text-xs mt-2">
                        最低出稿金額（¥10,000）を下回っています。最低 {pricing.minDays}日間 必要です。
                      </p>
                    )}
                  </div>
                )}

                {/* 空き枠確認 */}
                {startDate && endDate && (
                  <div className="flex items-center gap-2 text-sm">
                    {availabilityLoading ? (
                      <span className="text-slate-400">空き枠を確認中...</span>
                    ) : availability ? (
                      availability.available ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-green-400">この期間は空いています</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          <span className="text-red-400">この期間は既に予約済みです</span>
                        </>
                      )
                    ) : null}
                  </div>
                )}
              </div>

              {/* 同意チェックボックス */}
              <div className="bg-[#1E293B] rounded-2xl p-6">
                <h3 className="text-white font-bold mb-3">料金規約への同意</h3>
                <div className="bg-[#0F172A]/50 rounded-xl p-4 mb-4 text-slate-400 text-xs leading-relaxed space-y-2">
                  <p>・掲載料金は<strong className="text-white">予約時点のメンバー数</strong>で確定し、その後のメンバー数変動による追加請求・返金はありません。</p>
                  <p>・最低出稿金額は¥10,000（税込）です。</p>
                  <p>・掲載期間は予約日から最大3ヶ月先まで指定できます。</p>
                  <p>・申し込み後、モデレーターの仮承認・管理人の最終承認が必要です。</p>
                  <p>・審査で不承認となった場合、料金は発生しません。</p>
                  <p>・承認後のキャンセルは原則不可です。</p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#0891B2]"
                  />
                  <span className="text-white text-sm">
                    上記の料金規約を読み、内容に同意します
                  </span>
                </label>
              </div>

              {submitError && (
                <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-4 flex gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-red-400 text-sm">{submitError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  !agreedToTerms ||
                  !availability?.available ||
                  calculatedTotal < 10000
                }
                className="w-full bg-[#0891B2] text-white py-4 rounded-2xl font-bold text-base hover:bg-[#0891B2]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#0891B2]/20"
              >
                {submitting ? "送信中..." : "広告を申し込む"}
              </button>
            </form>
          </>
        )}

        {tab === "revenue" && (
          <div className="space-y-4">
            <div className="bg-[#1E293B] rounded-2xl p-6">
              <h3 className="text-white font-bold mb-2">収益分配の仕組み</h3>
              <p className="text-slate-400 text-sm mb-4">
                広告収益の70%が管理人・モデレーターに分配されます。
                管理人はモデレーター間の分配比率を設定できます。
              </p>
              <div className="space-y-3">
                {[
                  { label: "イベント基金", pct: 10, desc: "コミュニティイベントの開催資金", color: "text-emerald-400" },
                  { label: "管理人・モデレーター", pct: 70, desc: "下記の比率で分配", color: "text-[#0891B2]" },
                  { label: "プラットフォーム", pct: 20, desc: "RawStockの運営費", color: "text-slate-400" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                    <div>
                      <div className={`font-bold text-sm ${item.color}`}>{item.label}</div>
                      <div className="text-slate-500 text-xs">{item.desc}</div>
                    </div>
                    <div className={`font-bold text-lg ${item.color}`}>{item.pct}%</div>
                  </div>
                ))}
              </div>
            </div>

            {revenueLoading ? (
              <div className="bg-[#1E293B] rounded-2xl p-6 animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-1/2 mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-slate-700 rounded-xl" />
                  ))}
                </div>
              </div>
            ) : revenueSettings ? (
              <div className="bg-[#1E293B] rounded-2xl p-6">
                <h3 className="text-white font-bold mb-1">モデレーター間の分配比率</h3>
                <p className="text-slate-500 text-xs mb-4">
                  管理人・モデレーター合計70%の内訳を設定します（合計100%）
                </p>
                {revenueSettings.moderators.length === 0 ? (
                  <p className="text-slate-400 text-sm">モデレーターがいません</p>
                ) : (
                  <div className="space-y-3">
                    {revenueSettings.moderators.map((mod) => {
                      const key = String(mod.userId);
                      const val = distribution[key] ?? 0;
                      return (
                        <div key={mod.userId} className="flex items-center gap-3">
                          <img
                            src={mod.profileImageUrl ?? `https://api.dicebear.com/7.x/thumbs/svg?seed=${mod.userId}`}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <div className="text-white text-sm font-medium">{mod.displayName ?? "Unknown"}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={val}
                              onChange={(e) =>
                                setDistribution((prev) => ({
                                  ...prev,
                                  [key]: Number(e.target.value),
                                }))
                              }
                              className="w-16 bg-[#0F172A] border border-slate-700 rounded-lg px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-[#0891B2]"
                            />
                            <span className="text-slate-400 text-sm">%</span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="border-t border-slate-700 pt-3 flex justify-between items-center">
                      <span className="text-slate-400 text-sm">合計</span>
                      <span
                        className={`font-bold ${
                          Math.abs(
                            Object.values(distribution).reduce((s, v) => s + Number(v), 0) - 100
                          ) <= 1
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {Object.values(distribution).reduce((s, v) => s + Number(v), 0)}%
                      </span>
                    </div>
                  </div>
                )}
                {revenueSaveMsg && (
                  <div
                    className={`mt-3 text-sm ${
                      revenueSaveMsg === "保存しました" ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {revenueSaveMsg}
                  </div>
                )}
                <button
                  onClick={handleRevenueSave}
                  disabled={revenueSaving}
                  className="mt-4 w-full bg-[#0891B2] text-white py-3 rounded-xl font-bold hover:bg-[#0891B2]/90 transition-all disabled:opacity-50"
                >
                  {revenueSaving ? "保存中..." : "分配比率を保存"}
                </button>
              </div>
            ) : (
              <div className="bg-[#1E293B] rounded-2xl p-6 text-slate-400 text-sm">
                管理人のみ収益分配設定を変更できます
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
