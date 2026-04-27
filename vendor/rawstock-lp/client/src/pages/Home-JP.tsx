import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

const LP_LINK_X = "https://x.com/ndjtpamwu";
const LP_LINK_CAMPFIRE =
  "https://camp-fire.jp/projects/937352/preview?token=33fzs9q3&utm_campaign=cp_po_share_c_msg_projects_show";

// ─── Intersection observer hook ──────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, inView };
}

// ─── FadeIn animation component ──────────────────────────────
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(20px)",
        transition: `all 0.6s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function HomeJP() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#050505", color: "#e8e4dc" }}>
      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-sm" style={{ backgroundColor: "rgba(5,5,5,0.9)" }}>
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-1">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663449879480/Y3Yn5f8wK9BzVPCXiSHai5/logo-icon-UtffSyBQcbbEmRWixUFkkb.webp"
              alt="Raw Stock UK"
              className="h-12 w-auto object-contain"
            />
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663449879480/Y3Yn5f8wK9BzVPCXiSHai5/logo-raw-stock_9e50ecdf.png"
              alt="Raw Stock UK"
              className="h-12 w-auto object-contain scale-95"
            />
          </div>
          <div className="hidden md:flex items-center gap-8 ml-auto">
            <a href="#ecosystem" className="font-mono-body text-xs text-white/60 hover:text-neon transition-colors tracking-widest uppercase">仕組み</a>
            <a href="#structure" className="font-mono-body text-xs text-white/60 hover:text-neon transition-colors tracking-widest uppercase">構成</a>
            <a href="#promise" className="font-mono-body text-xs text-white/60 hover:text-neon transition-colors tracking-widest uppercase">3つの約束</a>
            <a href="#revenue" className="font-mono-body text-xs text-white/60 hover:text-neon transition-colors tracking-widest uppercase">収益分配</a>
            <a
              href={LP_LINK_X}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono-body text-xs text-white/60 hover:text-neon transition-colors tracking-widest uppercase"
            >
              X
            </a>
            <a
              href={LP_LINK_CAMPFIRE}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono-body text-xs text-white/60 hover:text-neon transition-colors tracking-widest uppercase"
            >
              CAMPFIRE
            </a>
            <a
              href={LP_LINK_CAMPFIRE}
              target="_blank"
              rel="noopener noreferrer"
              className="font-display text-sm px-5 py-2 border border-neon text-neon hover:bg-neon hover:text-black transition-all duration-200"
            >
              CAMPFIRE (preview)
            </a>
          </div>
          <button
            className="md:hidden text-white/60 hover:text-neon transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-white/10 bg-black/95">
            <a href="#ecosystem" className="block px-4 py-2 text-white/60 hover:text-neon">仕組み</a>
            <a href="#structure" className="block px-4 py-2 text-white/60 hover:text-neon">構成</a>
            <a href="#promise" className="block px-4 py-2 text-white/60 hover:text-neon">3つの約束</a>
            <a href="#revenue" className="block px-4 py-2 text-white/60 hover:text-neon">収益分配</a>
            <a href={LP_LINK_X} target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-white/60 hover:text-neon">
              X
            </a>
            <a href={LP_LINK_CAMPFIRE} target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-neon">
              CAMPFIRE (preview)
            </a>
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden scanline-overlay" style={{ backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663449879480/Y3Yn5f8wK9BzVPCXiSHai5/hero-bg-2AFwCiErEpzEQtgr4Vk2Df.webp)`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-[#050505]" />
        <div className="absolute inset-0 halftone-bg opacity-30" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-20 pb-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 border border-hot-orange/60 px-3 py-1 mb-8 flex-wrap">
            <span className="w-1.5 h-1.5 rounded-full bg-hot-orange animate-pulse flex-shrink-0" />
            <span className="font-mono-body text-xs text-hot-orange tracking-widest uppercase">
              国産ライブプラットフォーム
            </span>
          </div>

          {/* Main headline (aligned with rawstock.live marketing LP) */}
          <h1 className="font-display mb-10">
            <span className="block text-5xl md:text-6xl lg:text-7xl text-neon neon-glow leading-[1.08] tracking-tight">
              脱中央集権。価値を生む人へ90%還元。
            </span>
            <span className="block text-2xl md:text-3xl lg:text-4xl text-white mt-4 leading-tight">
              国産プラットフォーム RawStock
            </span>
          </h1>

          {/* Subheadline — sans-serif + size/line-height tuned for long JP copy */}
          <div className="max-w-2xl mb-12">
            <div className="border-l-2 border-neon pl-5 md:pl-6">
              <p className="font-prose-ja text-lg md:text-xl text-white/90 leading-[1.85] tracking-normal mb-7 font-medium">
                「子育てをしながらなんて、甘い。全てを注ぎ込めないなら無理だ」 あの日、溝口さんにそう言われて、私の挑戦は終わるはずでした。
              </p>
              <p className="font-prose-ja text-base md:text-lg text-white/80 leading-[1.9] tracking-normal">
                私は「NexTV」という構想を掲げ、「REAL CAREER」の門を叩きました。結果は「最初に敗退」。子育てをしながらの挑戦は「遊び」だと揶揄され、プロの世界の厳しさを突きつけられました。
                <br />
                <br />
                でも、どうしても諦めきれない想いがあり、一人ClaudeCodeと向き合い、最低限の機能が動くところまで来ました。でも、一人で考えた仕様には限界があります。本物の「現場の武器」にするためには、私一人の力では足りません。
              </p>
              <p className="font-prose-ja text-base md:text-lg text-white/85 leading-[1.9] tracking-normal mt-7">
                本当は自分が前に出たい訳ではない。でも想いに共感するあなたの目線で、このプロダクトを一緒に叩き直してください。
              </p>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 mb-16">
            <a
              href={LP_LINK_X}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 font-display text-lg px-8 py-4 bg-neon text-black hover:bg-white transition-all duration-200"
            >
              Follow on X
            </a>
            <a
              href={LP_LINK_CAMPFIRE}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 font-display text-lg px-8 py-4 border border-neon text-neon hover:bg-neon/10 transition-all duration-200"
            >
              CAMPFIRE (crowdfunding)
            </a>
            <a
              href="/stations"
              className="group inline-flex items-center gap-2 font-display text-lg px-8 py-4 border border-neon text-neon hover:bg-neon/10 transition-all duration-200"
            >
              Open the app (stations)
            </a>
          </div>
        </div>
      </section>

      {/* ── ECOSYSTEM ────────────────────────────────────────────── */}
      <section id="ecosystem" className="relative py-20 overflow-hidden" style={{ backgroundColor: "#050505" }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,204,0.1) 2px, rgba(0,255,204,0.1) 4px)" }} />
        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-5xl font-bold mb-4">
              <span className="text-white">私たちが創る</span><br />
              <span className="text-neon neon-glow">共同経済圏</span>
            </h2>
            <p className="font-mono-body text-white/60">自分たちで回す、新しいエコシステム</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "インディーズアーティスト / 地下アイドル", desc: "現場の熱量を動画レポートにして世界に届ける" },
              { title: "ライバー", desc: "生配信で最大95%還元" },
              { title: "メンタルコーチ・講師", desc: "有料ライブ販売・個別セッションで直接収益化" },
              { title: "動画編集者", desc: "現場動画の編集依頼を受けて稼ぐ" },
              { title: "コミュニティ管理人", desc: "広告収益の70%をコミュニティへ還元" },
              { title: "コンテスト賞金・イベント積立", desc: "コミュニティに貯まった資金でイベント開催" },
            ].map((item, idx) => (
              <div key={idx} className="border border-white/10 p-6 hover:border-neon/50 transition-colors">
                <h3 className="font-display text-lg mb-2 text-white">{item.title}</h3>
                <p className="font-mono-body text-sm text-white/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FLOW ────────────────────────────────────────────── */}
      <section className="relative py-20 overflow-hidden" style={{ backgroundColor: "#0a0a0a" }}>
        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-5xl font-bold mb-4">
              <span className="text-white">エコシステムの</span><br />
              <span className="text-neon neon-glow">流れ</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { num: "01", title: "現場でスマホ撮影", desc: "その場の生の熱気と一瞬を切り取る" },
              { num: "02", title: "編集者に依頼", desc: "登録編集者に直接オーダー可能" },
              { num: "03", title: "映像を販売", desc: "ライブレビューから自然な流れで動画購入" },
              { num: "04", title: "次のライブ告知・集客", desc: "外部サイトへの動線でチケットや音源販売に繋ぐ" },
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="text-neon font-display text-4xl font-bold mb-2">{item.num}</div>
                <h3 className="font-display text-lg mb-2 text-white">{item.title}</h3>
                <p className="font-mono-body text-sm text-white/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CURRENT STRUCTURE + 3 PROMISES（lp-standalone と同系のコピー） ── */}
      <section
        id="structure"
        className="relative py-20 overflow-hidden"
        style={{
          backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663449879480/Y3Yn5f8wK9BzVPCXiSHai5/ecosystem-bg-MkdKoSdKc7CcaezdC4tTWA.webp)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/86" />
        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <div className="flex items-end gap-4 mb-4">
            <p className="font-mono-body text-sm text-hot-orange tracking-widest uppercase">Current Structure</p>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl text-white mb-3">今構成はこうなっています</h2>
          <p className="font-prose-ja text-base text-white/75 mb-12 max-w-3xl leading-relaxed">
            足りない部分、危ない仕様、運用で詰まる点を、現場目線で教えてください。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
            {[
              {
                num: "01",
                title: "公式ステーション × コミュニティ",
                body: (
                  <>
                    公式ステーションをHUBにして各コミュニティを作成できます。
                    <br />
                    コミュニティの管理者はそのコミュニティで生まれた収益を得ることができます。
                    <br />
                    イベント告知等掲示板、動画のアップロード（無料/有料）、好きな動画を同時視聴できるJUKEBOX
                  </>
                ),
              },
              {
                num: "02",
                title: "クリエイター・アーティスト",
                body: (
                  <>
                    クリエイター・アーティストは幅広いマネタイズポイントがあります。
                    <br />
                    全て90％還元します。有料のライブセッション、投げ銭、有料動画販売。
                    <br />
                    Stripe Connect 搭載で投稿者は複数名に分配を直接分けることも可能です。
                  </>
                ),
              },
              {
                num: "03",
                title: "動画編集者",
                body: (
                  <>
                    動画編集者としての登録もお待ちしています。
                    <br />
                    自分で編集できないことがハードルになっている人のために、編集者と繋ぐことでより多くのアーティストが作品を公開できる仕組みを作ります。
                    <br />
                    レベニューシェアか単価か編集者側で設定できます。
                  </>
                ),
              },
            ].map((card) => (
              <div
                key={card.num}
                className="border border-white/10 bg-black/40 p-6 hover:border-neon/40 transition-colors"
              >
                <div className="inline-block bg-hot-orange text-black font-display text-xs font-bold px-2 py-1 mb-4">
                  {card.num}
                </div>
                <h3 className="font-display text-xl text-white mb-3">{card.title}</h3>
                <p className="font-prose-ja text-sm md:text-base text-white/80 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>

          <div id="promise" className="scroll-mt-24">
            <div className="flex items-end gap-4 mb-4">
              <p className="font-mono-body text-sm text-hot-orange tracking-widest uppercase">3 Promises</p>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <h2 className="font-display text-3xl md:text-4xl text-white mb-4">
              RawStockが死守する<span className="text-neon neon-glow">「3つの約束」</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              {[
                {
                  n: "1",
                  title: "脱中央集権",
                  desc: "ひとつのフィード、ひとつの運営者に現場の未来を預けない。",
                },
                {
                  n: "2",
                  title: "国内循環",
                  desc: "日本のファンが払ったお金を、そのまま日本の現場へ戻す。",
                },
                {
                  n: "3",
                  title: "90%還元",
                  desc: "価値を生む人へ直接届ける。",
                },
              ].map((row) => (
                <div
                  key={row.n}
                  className="border border-neon/25 bg-neon/5 p-6 hover:border-neon/50 transition-colors"
                >
                  <h4 className="font-display text-2xl text-neon mb-2">
                    {row.n}. {row.title}
                  </h4>
                  <p className="font-prose-ja text-sm text-white/85 leading-relaxed">{row.desc}</p>
                </div>
              ))}
            </div>
            <p className="font-prose-ja text-base md:text-lg text-white/90 leading-relaxed max-w-3xl">
              想いに共感してくれる、エンジニア、アーティスト、動画クリエイター、コミュニティ管理者、ライバーと一緒に作り上げませんか？
            </p>
          </div>
        </div>
      </section>

      {/* ── REVENUE ────────────────────────────────────────────── */}
      <section id="revenue" className="relative py-20 overflow-hidden" style={{ backgroundColor: "#050505" }}>
        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-5xl font-bold mb-4">
              <span className="text-white">収益化の</span><br />
              <span className="text-neon neon-glow">仕組み</span>
            </h2>
          </div>

          <div className="space-y-12">
            {/* Content Sales */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="font-bebas text-4xl text-hot-orange orange-glow">01</span>
                <div>
                  <h3 className="font-display text-3xl text-white">コンテンツ販売</h3>
                  <p className="font-mono-body text-sm text-white/50">動画レポート・写真・記事など</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-card-dark border border-white/10 p-6">
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="font-bebas text-7xl text-neon neon-glow">90</span>
                    <span className="font-display text-3xl text-neon">%</span>
                    <span className="font-mono-body text-sm text-white/50 ml-2">クリエイター側へ</span>
                  </div>
                  <ul className="space-y-3">
                    {[
                      "売上の90%がクリエイター側へ",
                      "アップロード時に協力者との分配を自由に設定",
                      "AIが自動で分配を処理——手動転送なし",
                      "10%のプラットフォーム維持費は決済処理とインフラをカバー",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="text-neon mt-0.5 flex-shrink-0">✓</span>
                        <span className="font-mono-body text-sm text-white/60">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-card-dark border border-white/10 p-4 overflow-x-auto">
                  <p className="font-mono-body text-xs text-white/40 tracking-widest uppercase mb-4">
                    // 収益分配例（売上の%）
                  </p>
                  <table className="w-full text-sm font-mono-body">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 text-white/40 font-normal text-xs">シナリオ</th>
                        <th className="text-center py-2 text-white/40 font-normal text-xs">投稿者</th>
                        <th className="text-center py-2 text-white/40 font-normal text-xs">アーティスト</th>
                        <th className="text-center py-2 text-white/40 font-normal text-xs">撮影者</th>
                        <th className="text-center py-2 text-white/40 font-normal text-xs">編集者</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "標準", poster: "20%", artist: "60%", shooter: "10%", editor: "—" },
                        { label: "ファン重視", poster: "10%", artist: "50%", shooter: "30%", editor: "—" },
                        { label: "フル編集", poster: "10%", artist: "60%", shooter: "10%", editor: "10%" },
                        { label: "ソロ", poster: "90%", artist: "—", shooter: "—", editor: "—" },
                      ].map((row, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                          <td className="py-2.5 text-white/70">{row.label}</td>
                          <td className="py-2.5 text-center text-white/60">{row.poster}</td>
                          <td className="py-2.5 text-center text-white/60">{row.artist}</td>
                          <td className="py-2.5 text-center text-white/60">{row.shooter}</td>
                          <td className="py-2.5 text-center text-white/60">{row.editor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="font-mono-body text-xs text-white/30 mt-3">
                    → 100ドルの売上（標準）の場合：アーティストは60ドル、クリエイター側合計は90ドル（10%のプラットフォーム維持費が適用）
                  </p>
                </div>
              </div>
            </div>

            {/* Live Streaming */}
            <div>
              <h3 className="font-display text-2xl mb-4 text-white">2. ライブ配信収益分配</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono-body">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-2 text-white/60">レベル</th>
                      <th className="text-left py-2 px-2 text-white/60">有料配信</th>
                      <th className="text-left py-2 px-2 text-white/60">ライブ配信</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/10">
                      <td className="py-2 px-2 text-white">Level 4</td>
                      <td className="py-2 px-2 text-neon">90%</td>
                      <td className="py-2 px-2 text-neon">95%</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-2 px-2 text-white">Level 3</td>
                      <td className="py-2 px-2 text-neon">90%</td>
                      <td className="py-2 px-2 text-neon">90%</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-2 px-2 text-white">Level 2</td>
                      <td className="py-2 px-2 text-neon">90%</td>
                      <td className="py-2 px-2 text-neon">80%</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 text-white">Level 1</td>
                      <td className="py-2 px-2 text-neon">90%</td>
                      <td className="py-2 px-2 text-neon">70%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="font-mono-body text-white/60 text-xs mt-4">
                ※ 有料配信は一律90%。ライブ配信は配信回数 × ビュー数 × 投げ銭で判定。<br />
                10% platform maintenance fee covers payment processing & infrastructure
              </p>
            </div>

            {/* Community */}
            <div>
              <h3 className="font-display text-2xl mb-4 text-white">3. コミュニティは自治区</h3>
              <div className="border border-white/10 p-6 mb-4">
                <p className="font-mono-body text-white/60 text-sm">
                  「管理人＋モデレーターによる目利き選定で質を担保。アルゴリズム偏重ではなく、人間による推薦で本当に良いコンテンツが届く」
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-white/10 p-4">
                  <p className="font-display text-white mb-2">広告単価目安</p>
                  <p className="font-mono-body text-white/60 text-sm">メンバー数 × 7円/日</p>
                  <p className="font-mono-body text-white/60 text-sm">最低保証 10,000円/月〜</p>
                </div>
                <div className="border border-white/10 p-4">
                  <p className="font-display text-white mb-2">分配</p>
                  <ul className="font-mono-body text-white/60 text-sm space-y-1">
                    <li>イベント積立: 10%</li>
                    <li>管理人・モデレーター: 70%</li>
                    <li>PLATFORM: 20%</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ECOSYSTEM FLOW ──────────────────────────────────── */}
      <section
        id="how-it-works"
        className="relative py-24 px-4 overflow-hidden"
        style={{
          backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663449879480/Y3Yn5f8wK9BzVPCXiSHai5/ecosystem-bg-MkdKoSdKc7CcaezdC4tTWA.webp)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/85" />
        <div className="relative max-w-6xl mx-auto">
          <FadeIn>
            <div className="flex items-end gap-4 mb-4">
              <p className="font-mono-body text-sm text-hot-orange tracking-widest uppercase">// 仕組み</p>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <h2 className="font-display text-5xl md:text-7xl text-white mb-16">
              どうやって<br />
              <span className="text-neon neon-glow">成り立つのか</span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {[
              { num: "01", title: "撮影する", desc: "スマホで現場を撮影。生のまま、フィルターなし。" },
              { num: "02", title: "編集を依頼", desc: "プラットフォーム登録者の編集者に編集を発注。" },
              { num: "03", title: "販売する", desc: "見た人が自然と動画を購入。" },
              { num: "04", title: "次のギグへ", desc: "チケットやグッズへのリンク。サイクルは続く。" },
            ].map((step, i) => (
              <FadeIn key={i} delay={i * 150}>
                <div className="text-center">
                  <div className="font-bebas text-4xl text-hot-orange orange-glow mb-2">{step.num}</div>
                  <h4 className="font-display text-lg text-white mb-2">{step.title}</h4>
                  <p className="font-mono-body text-sm text-white/60">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={600}>
            <div className="border border-neon/30 p-6 text-center neon-border-glow">
              <p className="font-display text-2xl md:text-3xl text-neon neon-glow">
                循環モデル — 資産は何度も価値を生む
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── SCENE ────────────────────────────────────────────── */}
      <section id="scene" className="relative py-20 overflow-hidden" style={{ backgroundColor: "#0a0a0a" }}>
        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-5xl font-bold mb-4">
              <span className="text-white">コミュニティを</span><br />
              <span className="text-neon neon-glow">構築中</span>
            </h2>
            <p className="font-mono-body text-white/60">一緒に設計してくれるライバーやコミュニティマネージャーを募集しています。</p>
          </div>

          <div className="text-center flex flex-wrap gap-4 justify-center">
            <a
              href={LP_LINK_X}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 font-display text-lg px-8 py-4 bg-neon text-black hover:bg-white transition-all duration-200"
            >
              Follow on X
            </a>
            <a
              href={LP_LINK_CAMPFIRE}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 font-display text-lg px-8 py-4 border border-neon text-neon hover:bg-neon/10 transition-all duration-200"
            >
              Open CAMPFIRE
            </a>
          </div>
        </div>
      </section>

      {/* ── CLOSING / CTA ────────────────────────────────────── */}
      <section
        id="contact"
        className="relative py-32 px-4 overflow-hidden scanline-overlay"
        style={{
          backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663449879480/Y3Yn5f8wK9BzVPCXiSHai5/closing-bg-kETaPzfj9rBgkoWzcAfChb.webp)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/60" />
        <div className="relative max-w-4xl mx-auto text-center">
          <FadeIn>
            <p className="font-mono-body text-sm text-neon tracking-widest uppercase mb-6">// 最後に</p>
            <div className="dashed-border p-8 mb-8 neon-border-glow">
              <h2 className="font-display text-4xl md:text-6xl text-white mb-4 leading-tight">
                どこかで<br />
                <span className="text-neon neon-glow">この音を待ってる人がいる。</span>
              </h2>
            </div>
            <p className="font-mono-body text-base text-white/60 leading-relaxed max-w-2xl mx-auto mb-4">
              今は小さい。でも最初からグローバルを考えてる。インフラが整ったら、UK地下シーン——Hackney の地下室から Sheffield の倉庫まで——は Berlin、Seoul、New York の耳に届く。
            </p>
            <p className="font-mono-body text-base text-white/60 leading-relaxed max-w-2xl mx-auto mb-4">
              言葉は人を繋ぐ。でも、ライブで胸が熱くなる瞬間——それは AI には絶対に再現できない。
            </p>
            <p className="font-mono-body text-base text-white/70 leading-relaxed max-w-2xl mx-auto mb-10">
              <span className="text-neon">Raw Stock</span> はそれを、Raw のまま届ける場所。アーティスト、ライバー、編集者、コミュニティマネージャー——一緒にこれを作ってくれる人を探してる。
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href={LP_LINK_X}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 font-display text-2xl px-12 py-5 border-2 border-neon text-neon hover:bg-neon hover:text-black transition-all duration-300 neon-border-glow"
              >
                Follow on X
                <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform" />
              </a>
              <a
                href={LP_LINK_CAMPFIRE}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 font-display text-2xl px-12 py-5 bg-neon text-black hover:bg-white transition-all duration-300"
              >
                CAMPFIRE (preview)
                <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform" />
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="relative py-12 border-t border-white/10" style={{ backgroundColor: "#050505" }}>
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
          <p className="font-mono-body text-white/60 text-sm">© 2026 Raw Stock UK. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="/" className="font-mono-body text-xs text-white/60 hover:text-neon transition-colors">EN</a>
            <span className="text-white/30">|</span>
            <a href="/ja" className="font-mono-body text-xs text-neon">JAP</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
