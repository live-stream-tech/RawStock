import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

const LP_LINK_X = "https://x.com/ndjtpamwu";
const LP_LINK_CAMPFIRE =
  "https://camp-fire.jp/projects/937352/preview?token=33fzs9q3&utm_campaign=cp_po_share_c_msg_projects_show";
const LP_LINK_APP = "/stations";

/** Text & inline images: centered column, max 750px. */
const LP_COL = "w-full max-w-[750px] mx-auto px-4";
const CTA_GREEN_3D =
  "flex w-full sm:flex-1 min-h-[3rem] sm:min-h-[3.25rem] justify-center items-center gap-2 font-display text-base sm:text-lg px-4 py-3.5 text-[#04210f] bg-[#58d67c] border border-[#2e9e54] rounded-[4px] shadow-[0_5px_0_#1f7a3f,0_8px_14px_rgba(0,0,0,0.45)] hover:bg-[#6ae28c] hover:translate-y-[1px] hover:shadow-[0_4px_0_#1f7a3f,0_7px_12px_rgba(0,0,0,0.4)] active:translate-y-[3px] active:shadow-[0_2px_0_#1f7a3f,0_3px_8px_rgba(0,0,0,0.35)] transition-all duration-150 text-center";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 0.55s ease-out ${delay}ms, transform 0.55s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ en, ja }: { en: string; ja: string }) {
  return (
    <div className="flex items-end gap-4 mb-3">
      <p className="font-mono-body text-xs text-hot-orange tracking-widest uppercase">{en}</p>
      <span className="font-prose-ja text-sm text-white/45 pb-0.5">{ja}</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

export default function HomeJP() {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "#structure", label: "機能" },
    { href: "#promise", label: "3つの約束" },
    { href: "#ecosystem", label: "仕組み" },
    { href: "#revenue", label: "収益" },
    { href: "#join", label: "参加" },
  ] as const;

  return (
    <div className="min-h-screen antialiased" style={{ backgroundColor: "#050505", color: "#e8e4dc" }}>
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-md"
        style={{ backgroundColor: "rgba(5,5,5,0.92)" }}
      >
        <div className={`${LP_COL} flex flex-wrap items-center justify-between gap-x-2 gap-y-2 min-h-14 py-2 lg:py-0`}>
          <a href="#top" className="flex items-center gap-1 shrink-0">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663449879480/Y3Yn5f8wK9BzVPCXiSHai5/logo-icon-UtffSyBQcbbEmRWixUFkkb.webp"
              alt=""
              className="h-10 w-auto object-contain"
            />
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663449879480/Y3Yn5f8wK9BzVPCXiSHai5/logo-raw-stock_9e50ecdf.png"
              alt="Raw Stock"
              className="h-10 w-auto object-contain scale-95"
            />
          </a>
          <div className="hidden lg:flex flex-wrap items-center justify-end gap-x-2 gap-y-1 ml-auto min-w-0">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="font-mono-body text-[10px] text-white/55 hover:text-neon transition-colors tracking-wide whitespace-nowrap"
              >
                {l.label}
              </a>
            ))}
            <a
              href={LP_LINK_X}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono-body text-[10px] text-white/55 hover:text-neon transition-colors whitespace-nowrap"
            >
              X
            </a>
            <a
              href={LP_LINK_CAMPFIRE}
              target="_blank"
              rel="noopener noreferrer"
              className="font-display text-xs px-3 py-1.5 border border-neon text-neon hover:bg-neon hover:text-black transition-colors whitespace-nowrap shrink-0"
            >
              CAMPFIRE
            </a>
          </div>
          <button
            type="button"
            className="lg:hidden text-white/70 hover:text-neon p-2 -mr-2"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        {menuOpen && (
          <div className="lg:hidden border-t border-white/10 bg-black/98 pb-4">
            <div className={LP_COL}>
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="block px-4 py-3 text-white/75 hover:text-neon border-b border-white/5"
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <a
              href={LP_LINK_X}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 text-white/75 hover:text-neon"
            >
              X
            </a>
            <a
              href={LP_LINK_CAMPFIRE}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 text-neon font-display"
            >
              CAMPFIRE
            </a>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO：一言で伝わる → 行動 ───────────────────── */}
      <section
        id="top"
        className="relative min-h-[88svh] flex flex-col justify-center overflow-hidden"
        style={{
          backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663449879480/Y3Yn5f8wK9BzVPCXiSHai5/hero-bg-2AFwCiErEpzEQtgr4Vk2Df.webp)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/68 via-black/48 to-[#050505]/92" />
        <div className={`relative z-10 ${LP_COL} pt-24 pb-24 md:pb-28`}>
          <p className="inline-flex flex-wrap items-center gap-2 border border-hot-orange/50 px-3 py-2 sm:px-4 sm:py-2.5 mb-6 text-hot-orange max-w-full">
            <span className="w-1.5 h-1.5 rounded-full bg-hot-orange animate-pulse shrink-0" />
            <span className="font-prose-ja text-sm sm:text-base leading-snug">
              クリエイター・アーティストへ、
              <span className="text-[1.2em] sm:text-[1.26em] inline-block align-baseline tabular-nums font-semibold">
                90
              </span>
              %還元。
            </span>
          </p>

          <header className="mb-8 md:mb-10">
            <h1 className="font-display font-black tracking-tight text-neon leading-[1.08] text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="block">自分たちで育てる</span>
              <span className="block mt-1 sm:mt-2">国産プラットフォーム</span>
            </h1>
            <p className="mt-10 sm:mt-11 md:mt-14 text-base sm:text-lg md:text-xl text-white/88 font-prose-ja leading-[1.85] md:leading-relaxed">
              動画の販売を中心に、ライブ配信、<br />個別セッション配信、<br />同じ趣味のコミュニティで同時視聴パーティー、<br />動画編集者とのマッチング、動画コンテスト等を行う<br />「活動」「交流」「成長」の場です。
            </p>
          </header>

          <div className="border border-white/15 bg-black/45 rounded-[6px] p-4 sm:p-5 mb-6">
            <p className="font-mono-body text-[11px] tracking-widest text-neon mb-3">NOW / STATUS</p>
            <ul className="space-y-2 font-prose-ja text-sm sm:text-base text-white/82 leading-relaxed">
              <li><span className="text-white">使える:</span> ステーション閲覧・モック導線の体験</li>
              <li><span className="text-white">モック中:</span> 活動カード / 投稿・公開・収益化フロー</li>
              <li><span className="text-white">次予定:</span> 決済導線・編集マッチング・参加導線の実装</li>
            </ul>
          </div>

          <div className="w-full flex flex-col sm:flex-row gap-3 mb-6">
            <a
              href={LP_LINK_X}
              target="_blank"
              rel="noopener noreferrer"
              className={CTA_GREEN_3D}
            >
              Xでつながる（参加）
            </a>
            <a
              href={LP_LINK_CAMPFIRE}
              target="_blank"
              rel="noopener noreferrer"
              className={CTA_GREEN_3D}
            >
              CAMPFIREで応援（資金）
            </a>
            <a
              href={LP_LINK_APP}
              className={CTA_GREEN_3D}
            >
              アプリを触る（体験）
            </a>
          </div>

          <div className="mb-8 border-l-4 border-neon/80 pl-5 sm:pl-6">
            <p className="font-prose-ja text-base sm:text-lg md:text-xl text-white/92 leading-relaxed font-medium">
              「子育てをしながらなんて、甘い。99％失敗する」
            </p>
            <p className="font-prose-ja text-sm sm:text-base text-white/78 mt-3 leading-relaxed">
              ——あの日そう言われ、私の挑戦は終わるはずでした。
            </p>
          </div>

          <div className="mt-6 space-y-5 font-prose-ja text-sm sm:text-base text-white/80 leading-[1.85]">
            <p>
              私は「NexTV」という構想を掲げ、「REAL CAREER」の門を叩きました。結果は「最初に敗退」。子育てをしながらの挑戦は「遊び」だと揶揄され、プロの世界の厳しさを突きつけられました。
            </p>

            {/* YouTube Embed */}
            <div className="my-8 aspect-video w-full border border-white/10 bg-black/40 overflow-hidden rounded-sm shadow-2xl">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/DANWox4tTO4"
                title="RawStock Background Story"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="opacity-90 hover:opacity-100 transition-opacity"
              ></iframe>
            </div>

            <p>
              それでも諦めきれない想いがあり、一人 Claude Code と向き合い、最低限の機能が動くところまで来ました。同時に、一人で考えた仕様には限界があることも分かりました。本物の「現場の武器」にするには、私一人の力では足りません。
            </p>
            <p className="text-white/85">
              前に出たいわけではありません。
            </p>
          </div>

          <p className="font-prose-ja text-base sm:text-lg text-white/86 mt-8 leading-relaxed">
            このプロダクトを一緒に叩き直してほしい——それがこのページを書いた理由です。
          </p>
        </div>
      </section>

      <section
        id="structure"
        className="scroll-mt-20 border-t border-white/10 py-16 md:py-24"
        style={{ backgroundColor: "#060606" }}
      >
        <div className={LP_COL}>
          <SectionLabel en="Product" ja="いまの構成" />
          <h2 className="font-display text-3xl md:text-4xl text-white mb-4">アプリは、こういう骨格です</h2>
          <p className="font-prose-ja text-base text-white/75 mb-12 leading-relaxed">
            足りない点・危ない仕様・運用で詰まるところは、遠慮なく教えてください。クラファンとコミュニティのフィードバックで形を固めていきます。
          </p>

          <div className="grid grid-cols-1 gap-5 mb-20 md:mb-24">
            {[
              {
                num: "01",
                title: "公式ステーション × コミュニティ",
                lines: [
                  "公式ステーションをハブに、コミュニティを作成可能。",
                  "管理者はコミュニティ内で生まれた収益を得られます。",
                  "掲示板、動画アップロード（無料/有料）、JUKEBOX 同時視聴 など。",
                ],
              },
              {
                num: "02",
                title: "クリエイター・アーティスト",
                lines: [
                  "有料ライブ、投げ銭、有料動画など複数のマネタイズ。",
                  "クリエイター側への還元は高い水準を維持する方針です。",
                  "Stripe Connect により、投稿者が複数名への分配を設定可能。",
                ],
              },
              {
                num: "03",
                title: "動画編集者",
                lines: [
                  "編集者として登録し、依頼とマッチング。",
                  "自分で編集できない人のハードルを下げ、作品が増える流れを作ります。",
                  "レベニューシェアか単価かは編集者側で設定。",
                ],
              },
            ].map((card) => (
              <div key={card.num} className="border border-white/10 bg-black/50 p-6 hover:border-neon/35 transition-colors">
                <div className="inline-block bg-hot-orange text-black font-display text-xs font-bold px-2 py-1 mb-4">{card.num}</div>
                <h3 className="font-display text-xl text-white mb-4 normal-case tracking-normal">{card.title}</h3>
                <ul className="font-prose-ja text-sm text-white/80 leading-relaxed space-y-3 list-disc pl-4 marker:text-neon/60">
                  {card.lines.map((line, i) => (
                    <li key={`${card.num}-${i}`}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div id="promise" className="scroll-mt-24">
            <SectionLabel en="Principles" ja="変えない軸" />
            <h2 className="font-display text-2xl md:text-4xl text-white mb-8">
              RawStock が守る<span className="text-neon neon-glow"> 3 つの約束</span>
            </h2>
            <div className="grid grid-cols-1 gap-4 mb-10">
              {[
                { n: "1", title: "脱中央集権", desc: "一つのフィードと一つの運営者に、現場の未来を預けない。" },
                { n: "2", title: "国内循環", desc: "日本のファンが払ったお金が、日本の現場に戻る設計を重視する。" },
                { n: "3", title: "高い還元", desc: "価値を生んだ人の手元に、正当な取り分が届くようにする。" },
              ].map((row) => (
                <div key={row.n} className="border border-neon/25 bg-neon/[0.06] p-6 hover:border-neon/45 transition-colors">
                  <h4 className="font-display text-xl text-neon mb-2 normal-case">
                    {row.n}. {row.title}
                  </h4>
                  <p className="font-prose-ja text-sm text-white/85 leading-relaxed">{row.desc}</p>
                </div>
              ))}
            </div>
            <p className="font-prose-ja text-base md:text-lg text-white/88 leading-relaxed mb-10">
              エンジニア、アーティスト、動画クリエイター、コミュニティ管理者、ライバー——立場は違っても、同じ「現場」を良くしたい人と一緒に作りたいです。
            </p>
          </div>

          <div className="w-full flex flex-col sm:flex-row gap-3 mb-8">
            <a
              href={LP_LINK_X}
              target="_blank"
              rel="noopener noreferrer"
              className={CTA_GREEN_3D}
            >
              Xでつながる（参加）
            </a>
            <a
              href={LP_LINK_CAMPFIRE}
              target="_blank"
              rel="noopener noreferrer"
              className={CTA_GREEN_3D}
            >
              CAMPFIREで応援（資金）
            </a>
            <a
              href={LP_LINK_APP}
              className={CTA_GREEN_3D}
            >
              アプリを触る（体験）
            </a>
          </div>

          <p className="font-mono-body text-xs text-white/35">
            アプリの試用は <a href="/stations" className="text-neon/90 hover:text-neon underline underline-offset-2">ステーション一覧</a> から。
          </p>
        </div>
      </section>

      {/* ── ECOSYSTEM ───────────────────────────────────── */}
      <section id="ecosystem" className="scroll-mt-20 relative py-20 md:py-24 overflow-hidden" style={{ backgroundColor: "#050505" }}>
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,204,0.12) 2px, rgba(0,255,204,0.12) 4px)",
          }}
        />
        <div className={`relative z-10 ${LP_COL}`}>
          <SectionLabel en="Ecosystem" ja="誰のための仕組みか" />
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            共同で回す<span className="text-neon neon-glow"> 経済圏</span>
          </h2>
          <p className="font-prose-ja text-white/70 text-base md:text-lg mb-14 leading-relaxed">
            公式の10ステーションはジャンルごとの柱です。名前のあとに、発信者・クリエイターのイメージを並べています。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                num: "01",
                title: "バンド・クラブレイヴ系",
                desc: "バンド、DJ、クラブレイヴ系アーティスト。音と現場の熱量で世界観を構築する表現者。",
              },
              {
                num: "02",
                title: "ライバー / ストリーマー",
                desc: "雑談、実況、企画配信。リアルタイムのコミュニケーションで熱狂を作るタレント。",
              },
              {
                num: "03",
                title: "AI動画クリエイター",
                desc: "AI技術を駆使して、現実を超えた映像美や物語を生成・発信する新世代の表現者。",
              },
              {
                num: "04",
                title: "ビジュアル・パフォーマー",
                desc: "ダンサー、コスプレイヤー、モデル。自らの身体をメディアとして表現するスター。",
              },
              {
                num: "05",
                title: "メンター / 専門家",
                desc: "コンサル、コーチ、講師。動画を通じて知識や経験を「価値」として届ける発信者。",
              },
              {
                num: "06",
                title: "Vライバー / アバター",
                desc: "仮想の肉体を持ち、性別や姿を超えて「個」の魅力を発信するデジタル表現者。",
              },
              {
                num: "07",
                title: "ボイス・アーティスト",
                desc: "声優、朗読、ASMR。声の力だけで視聴者の感情を揺さぶる「音」の表現者。",
              },
              {
                num: "08",
                title: "ライフスタイル・インフルエンサー",
                desc: "旅、食、日常。自身の生き方そのものをコンテンツ化し、共感を集める発信者。",
              },
              {
                num: "09",
                title: "歌手・アイドル系",
                desc: "シンガー、アイドル、ボーカル中心の表現者。歌とキャラクターでファン体験を作る存在。",
              },
              {
                num: "10",
                title: "ダンス・パフォーマー",
                desc: "ダンサー、振付師、パフォーマー。身体表現で観客の感情を直接動かすライブ表現者。",
              },
            ].map((item) => (
              <div key={item.num} className="border border-white/10 bg-black/30 p-6 hover:border-neon/40 transition-colors">
                <div className="inline-block bg-hot-orange text-black font-display text-xs font-bold px-2 py-1 mb-3">{item.num}</div>
                <h3 className="font-display text-lg text-white mb-2 normal-case tracking-normal">{item.title}</h3>
                <p className="font-prose-ja text-sm text-white/68 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REVENUE ───────────────────────────────────────── */}
      <section id="revenue" className="scroll-mt-20 relative py-20 md:py-24" style={{ backgroundColor: "#050505" }}>
        <div className={LP_COL}>
          <SectionLabel en="Revenue" ja="お金の流れ" />
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            収益化の<span className="text-neon neon-glow">考え方</span>
          </h2>
          <p className="font-prose-ja text-white/65 mb-14">数字は目安・設計方針です。詳細は利用規約・各機能の説明に準じます。</p>

          <div className="space-y-16">
            <div>
              <div className="flex flex-wrap items-baseline gap-3 mb-6">
                <span className="font-bebas text-4xl text-hot-orange">01</span>
                <h3 className="font-display text-2xl md:text-3xl text-white normal-case">コンテンツ販売</h3>
                <span className="font-mono-body text-xs text-white/45">動画レポート・写真・記事など</span>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-card-dark border border-white/10 p-6">
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="font-bebas text-6xl md:text-7xl text-neon neon-glow">90</span>
                    <span className="font-display text-2xl text-neon">%</span>
                    <span className="font-mono-body text-xs text-white/50 ml-1">クリエイター側のイメージ</span>
                  </div>
                  <ul className="space-y-3 font-prose-ja text-sm text-white/75">
                    {[
                      "売上の大部分をクリエイター側へ。",
                      "アップロード時に協力者との分配を設定可能。",
                      "プラットフォーム側は決済・インフラ維持に充当する部分を確保。",
                    ].map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-neon shrink-0">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-card-dark border border-white/10 p-5 overflow-x-auto">
                  <p className="font-mono-body text-[10px] text-white/40 tracking-widest uppercase mb-3">分配の例（クリエイター側 90% の内訳イメージ）</p>
                  <table className="w-full text-sm font-mono-body min-w-[320px]">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 text-white/45 font-normal text-xs">パターン</th>
                        <th className="text-center py-2 text-white/45 font-normal text-xs">投稿</th>
                        <th className="text-center py-2 text-white/45 font-normal text-xs">出演</th>
                        <th className="text-center py-2 text-white/45 font-normal text-xs">撮影</th>
                        <th className="text-center py-2 text-white/45 font-normal text-xs">編集</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "標準", poster: "20%", artist: "60%", shooter: "10%", editor: "—" },
                        { label: "ファン重視", poster: "10%", artist: "50%", shooter: "30%", editor: "—" },
                        { label: "フル編集", poster: "10%", artist: "60%", shooter: "10%", editor: "10%" },
                        { label: "ソロ", poster: "90%", artist: "—", shooter: "—", editor: "—" },
                      ].map((row) => (
                        <tr key={row.label} className="border-b border-white/5 hover:bg-white/[0.03]">
                          <td className="py-2.5 text-white/75">{row.label}</td>
                          <td className="py-2.5 text-center text-white/60">{row.poster}</td>
                          <td className="py-2.5 text-center text-white/60">{row.artist}</td>
                          <td className="py-2.5 text-center text-white/60">{row.shooter}</td>
                          <td className="py-2.5 text-center text-white/60">{row.editor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="font-prose-ja text-xs text-white/45 mt-3 leading-relaxed">
                    表はイメージです。実際の比率は投稿時の設定と決済手数料によります。
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-baseline gap-3 mb-4">
                <span className="font-bebas text-4xl text-hot-orange">02</span>
                <h3 className="font-display text-2xl text-white normal-case">ライブ配信の還元（レベル別）</h3>
              </div>
              <div className="overflow-x-auto border border-white/10">
                <table className="w-full text-sm font-mono-body min-w-[280px]">
                  <thead>
                    <tr className="border-b border-white/10 bg-black/40">
                      <th className="text-left py-3 px-3 text-white/55">レベル</th>
                      <th className="text-left py-3 px-3 text-white/55">有料配信</th>
                      <th className="text-left py-3 px-3 text-white/55">ライブ配信</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { lv: "Level 4", paid: "90%", live: "95%" },
                      { lv: "Level 3", paid: "90%", live: "90%" },
                      { lv: "Level 2", paid: "90%", live: "80%" },
                      { lv: "Level 1", paid: "90%", live: "70%" },
                    ].map((r) => (
                      <tr key={r.lv} className="border-b border-white/5 last:border-0">
                        <td className="py-2.5 px-3 text-white">{r.lv}</td>
                        <td className="py-2.5 px-3 text-neon">{r.paid}</td>
                        <td className="py-2.5 px-3 text-neon">{r.live}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="font-prose-ja text-xs text-white/50 mt-3 leading-relaxed">
                有料配信は一定の還元率、ライブ配信は配信実績やエンゲージメントに応じたレベル設計です（詳細はアプリ内表記に準じます）。
              </p>
            </div>

            <div>
              <div className="flex flex-wrap items-baseline gap-3 mb-4">
                <span className="font-bebas text-4xl text-hot-orange">03</span>
                <h3 className="font-display text-2xl text-white normal-case">コミュニティは「自治区」</h3>
              </div>
              <p className="font-prose-ja text-white/70 text-sm md:text-base mb-5 leading-relaxed border-l-2 border-white/20 pl-4">
                管理人とモデレーターによる目利きで質を担保し、アルゴリズム一辺倒ではなく、人による推薦で良いコンテンツが届く流れを重視します。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-white/10 p-5 bg-black/30">
                  <p className="font-display text-white mb-2 normal-case text-lg">広告単価の目安</p>
                  <p className="font-prose-ja text-white/65 text-sm">メンバー数 × 7円/日（例）</p>
                  <p className="font-prose-ja text-white/65 text-sm">最低保証 10,000円/月〜 などの設計</p>
                </div>
                <div className="border border-white/10 p-5 bg-black/30">
                  <p className="font-display text-white mb-3 normal-case text-lg">分配イメージ</p>
                  <ul className="font-prose-ja text-white/65 text-sm space-y-1.5">
                    <li>イベント積立: 10%</li>
                    <li>管理人・モデレーター: 70%</li>
                    <li>プラットフォーム: 20%</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── JOIN ──────────────────────────────────────────── */}
      <section id="join" className="scroll-mt-20 relative py-20 md:py-24 border-t border-white/10" style={{ backgroundColor: "#0a0a0a" }}>
        <div className={LP_COL}>
          <p className="font-mono-body text-xs text-hot-orange tracking-widest uppercase mb-3">JOIN</p>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-10 leading-snug">
            一緒に設計するライバー事務所・コミュニティ運営・エンジニア・決済サービス会社のシナジーを募集しています
          </h2>

          <div className="space-y-10 mb-12">
            {[
              {
                n: "1",
                title: "決済基盤の国内最適化と次世代化",
                content:
                  "Stripe Connectによる複雑な分配ロジックを維持しつつ、国内決済サービスへの適応や、将来的なステーブルコイン決済の実装。",
                intent: "手数料の最小化と、クリエイターへの迅速かつ自由度の高い支払いを実現するため。",
              },
              {
                n: "2",
                title: "コンテキスト理解による多言語最適化API",
                content:
                  "ユーザーの属性（入力、プロフィール、過去ログ）から文脈を読み取り、UIやコンテンツを動的に翻訳・最適化して表示。",
                intent:
                  "「翻訳」レベルではなく、その国の文化や文脈に合わせた「現地化（ローカライズ）」を自動で行い、グローバル展開の障壁をなくすため。",
              },
              {
                n: "3",
                title: "AI動画編集連携API",
                content: "Claudeが生成した構成案（プロンプト）と素材を投げるだけで、自動で編集済み動画を生成する仕組み。",
                intent: "制作コストを圧倒的に下げ、誰もが質の高い発信を続けられる環境を作るため。",
              },
            ].map((item) => (
              <div key={item.n} className="border border-white/10 bg-black/25 p-5 sm:p-6">
                <h3 className="font-display text-lg sm:text-xl text-white mb-4 normal-case tracking-normal">
                  {item.n}. {item.title}
                </h3>
                <div className="space-y-3 font-prose-ja text-sm sm:text-base text-white/78 leading-relaxed">
                  <p>
                    <span className="text-neon/90 font-medium">内容</span>
                    <span className="text-white/40">: </span>
                    {item.content}
                  </p>
                  <p>
                    <span className="text-neon/90 font-medium">意図</span>
                    <span className="text-white/40">: </span>
                    {item.intent}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="font-prose-ja text-white/70 text-base leading-relaxed mb-8">
            まだ小さなプロダクトです。一緒に画面と収益の流れを詰めていける方に連絡してほしいです。
          </p>

          <div className="w-full flex flex-col sm:flex-row gap-3">
            <a
              href={LP_LINK_X}
              target="_blank"
              rel="noopener noreferrer"
              className={CTA_GREEN_3D}
            >
              Xでつながる（参加）
            </a>
            <a
              href={LP_LINK_CAMPFIRE}
              target="_blank"
              rel="noopener noreferrer"
              className={CTA_GREEN_3D}
            >
              CAMPFIREで応援（資金）
            </a>
            <a
              href={LP_LINK_APP}
              className={CTA_GREEN_3D}
            >
              アプリを触る（体験）
            </a>
          </div>
        </div>
      </section>

      {/* ── CLOSING ───────────────────────────────────────── */}
      <section
        id="contact"
        className="relative py-28 md:py-36 overflow-hidden"
        style={{
          backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663449879480/Y3Yn5f8wK9BzVPCXiSHai5/closing-bg-kETaPzfj9rBgkoWzcAfChb.webp)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/55" />
        <div className={`relative z-10 ${LP_COL} text-center`}>
          <FadeIn>
            <p className="font-mono-body text-xs text-neon tracking-widest uppercase mb-6">Closing</p>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-white mb-8 leading-tight">
              どこかで、この音を
              <span className="text-neon neon-glow"> 待っている人</span>がいる。
            </h2>
            <div className="font-prose-ja text-base md:text-lg text-white/70 leading-[1.85] space-y-5 text-left md:text-center mb-12">
              <p>
                言葉と配信だけでは届かない熱量が、ライブハウスの床で起きています。AI が真似できないのは、その一瞬の空気です。
              </p>
              <p>
                RawStock は、その熱を削がずに届けるための「箱」と「分配」の実験です。まだ途中で、荒削りです。それでも現場側のあなたと一緒に、筋の良い形にしたいと考えています。
              </p>
            </div>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href={LP_LINK_X}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 font-display text-lg md:text-xl px-10 py-4 border-2 border-neon text-neon hover:bg-neon hover:text-black transition-colors"
              >
                Xでつながる（参加）
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href={LP_LINK_CAMPFIRE}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 font-display text-lg md:text-xl px-10 py-4 border-2 border-neon text-neon hover:bg-neon hover:text-black transition-colors"
              >
                CAMPFIREで応援（資金）
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      <footer className="relative py-10 border-t border-white/10" style={{ backgroundColor: "#050505" }}>
        <div className={`${LP_COL} flex flex-col md:flex-row items-center justify-between gap-4`}>
          <p className="font-mono-body text-white/50 text-xs">© 2026 Raw Stock UK. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="/" className="font-mono-body text-xs text-white/50 hover:text-neon transition-colors">
              EN
            </a>
            <span className="text-white/25">|</span>
            <span className="font-mono-body text-xs text-neon">日本語</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
