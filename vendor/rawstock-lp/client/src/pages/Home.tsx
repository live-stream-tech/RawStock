/* =============================================================
   RAW STOCK UK — Home Page (UK Culture Edition)
   Design: Neo-Brutalist Underground / "The Flyer"
   Palette: #050505 bg | #00ffcc neon teal | #ff4d00 hot orange
   Fonts: Barlow Condensed (display) + Courier Prime (body)
   Philosophy: No explanation. No gatekeepers. Just raw.
   ============================================================= */

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Music, Radio, Scissors, Users } from "lucide-react";

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
  }, [threshold]);
  return { ref, inView };
}

// ─── Animated section wrapper ─────────────────────────────────
function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────
export default function Home() {
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
            <a href="#how" className="font-mono-body text-xs text-white/60 hover:text-neon transition-colors tracking-widest uppercase">How</a>
            <a href="#revenue" className="font-mono-body text-xs text-white/60 hover:text-neon transition-colors tracking-widest uppercase">Revenue</a>
            <a href="#scene" className="font-mono-body text-xs text-white/60 hover:text-neon transition-colors tracking-widest uppercase">Scene</a>
            <a
              href="mailto:rawstock.infomation@gmail.com"
              className="font-display text-sm px-5 py-2 border border-neon text-neon hover:bg-neon hover:text-black transition-all duration-200"
            >
              Start selling
            </a>
          </div>
          <button
            className="md:hidden text-white/60 hover:text-neon transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div className="space-y-1">
              <span className={`block w-5 h-0.5 bg-current transition-transform duration-200 ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
              <span className={`block w-5 h-0.5 bg-current transition-opacity duration-200 ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block w-5 h-0.5 bg-current transition-transform duration-200 ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
            </div>
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-white/10 px-4 py-4 space-y-3" style={{ backgroundColor: "rgba(5,5,5,0.97)" }}>
            <a href="#how" className="block font-mono-body text-sm text-white/60 hover:text-neon transition-colors tracking-widest uppercase" onClick={() => setMenuOpen(false)}>How</a>
            <a href="#revenue" className="block font-mono-body text-sm text-white/60 hover:text-neon transition-colors tracking-widest uppercase" onClick={() => setMenuOpen(false)}>Revenue</a>
            <a href="#scene" className="block font-mono-body text-sm text-white/60 hover:text-neon transition-colors tracking-widest uppercase" onClick={() => setMenuOpen(false)}>Scene</a>
            <a href="mailto:rawstock.infomation@gmail.com" className="block font-display text-sm px-5 py-2 border border-neon text-neon text-center hover:bg-neon hover:text-black transition-all duration-200" onClick={() => setMenuOpen(false)}>Start selling</a>
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex flex-col justify-center overflow-hidden scanline-overlay"
        style={{
          backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663449879480/Y3Yn5f8wK9BzVPCXiSHai5/hero-bg-2AFwCiErEpzEQtgr4Vk2Df.webp)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-[#050505]" />
        <div className="absolute inset-0 halftone-bg opacity-30" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-20 pb-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 border border-hot-orange/60 px-3 py-1 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-hot-orange animate-pulse" />
            <span className="font-mono-body text-xs text-hot-orange tracking-widest uppercase">
              Live footage marketplace × Streaming platform
            </span>
          </div>

          {/* Main headline */}
          <h1 className="font-display leading-none mb-6">
            <span className="block text-6xl md:text-8xl lg:text-[9rem] text-white">
              Film it.
            </span>
            <span className="block text-6xl md:text-8xl lg:text-[9rem] text-neon neon-glow">
              Sell it.
            </span>
            <span className="block text-6xl md:text-8xl lg:text-[9rem] text-white">
              Keep 90%.
            </span>
          </h1>

          {/* Subheadline */}
          <div className="max-w-xl mb-10">
            <div className="border-l-2 border-neon pl-4">
              <p className="font-mono-body text-base text-white/70 leading-relaxed">
                No labels. No gatekeepers. No cuts.<br />
                Just real moments, sold by the people who were there.
              </p>
              <p className="font-mono-body text-sm text-white/50 mt-3 italic">
                If you were there, you know.
              </p>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 mb-16">
            <a
              href="mailto:rawstock.infomation@gmail.com"
              className="group inline-flex items-center gap-2 font-display text-lg px-8 py-4 bg-neon text-black hover:bg-white transition-all duration-200"
            >
              Start selling
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 font-display text-lg px-8 py-4 border border-white/30 text-white hover:border-neon hover:text-neon transition-all duration-200"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ────────────────────────────────────────────── */}
      <section className="relative py-20 overflow-hidden" style={{ backgroundColor: "#050505" }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,204,0.1) 2px, rgba(0,255,204,0.1) 4px)" }} />
        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Music, title: "Indie Artists", desc: "Sell your set. No middlemen." },
              { icon: Radio, title: "Live Streamers", desc: "Stream it. Get paid. Simple." },
              { icon: Scissors, title: "Coaches", desc: "Run sessions. Set your price." },
              { icon: Scissors, title: "Video Editors", desc: "Get work. Get paid. No delays." },
              { icon: Users, title: "Community Managers", desc: "Build scenes. Take your cut." },
              { icon: Users, title: "Event Organisers", desc: "Fund the next one. Keep it moving." },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="group relative bg-card-dark border border-white/10 p-6 hover:border-neon/50 transition-all duration-300 hover:neon-border-glow cursor-default">
                  <div className="absolute top-0 left-0 w-1 h-full bg-neon/0 group-hover:bg-neon/80 transition-all duration-300" />
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 flex items-center justify-center border border-neon/30 group-hover:border-neon/80 transition-colors duration-300 flex-shrink-0">
                      <item.icon size={18} className="text-neon" />
                    </div>
                    <div>
                      <h4 className="font-display text-lg text-white mb-1 group-hover:text-neon transition-colors duration-300">
                        {item.title}
                      </h4>
                      <p className="font-mono-body text-sm text-white/50 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <section id="how" className="relative py-20 overflow-hidden" style={{ backgroundColor: "#050505" }}>
        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-5xl font-bold mb-4">
              <span className="text-white">How it</span><br />
              <span className="neon-glow">works</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { num: "01", title: "Film it", desc: "Get it on camera." },
              { num: "02", title: "Get it cut", desc: "Order an edit." },
              { num: "03", title: "Sell it", desc: "Your fans buy it." },
              { num: "04", title: "Run it back", desc: "Next gig, repeat." },
            ].map((step, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="relative text-center">
                  <div className="w-16 h-16 bg-card-dark border border-neon/40 flex items-center justify-center relative mx-auto mb-6">
                    <span className="font-bebas text-2xl text-neon">{step.num}</span>
                  </div>
                  <h4 className="font-display text-xl text-white mb-2">{step.title}</h4>
                  <p className="font-mono-body text-sm text-white/50">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── ECOSYSTEM FLOW ──────────────────────────────────── */}
      <section
        id="ecosystem"
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
              <p className="font-mono-body text-sm text-hot-orange tracking-widest uppercase">// The Flow</p>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <h2 className="font-display text-5xl md:text-7xl text-white mb-16">
              HOW THE<br />
              <span className="text-neon neon-glow">ECOSYSTEM WORKS</span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {[
              { num: "01", title: "Shoot the Show", desc: "Film the gig on your phone. Raw, unfiltered, real." },
              { num: "02", title: "Commission an Editor", desc: "Order a cut from a registered editor on the platform." },
              { num: "03", title: "Sell the Footage", desc: "Fans who saw the review buy the full video naturally." },
              { num: "04", title: "Promote the Next Gig", desc: "Link to tickets and merch. The cycle continues." },
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
                A CIRCULAR MODEL — ASSETS THAT KEEP GENERATING VALUE
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── UNDERGROUND ────────────────────────────────────────────── */}
      <section className="relative py-20 overflow-hidden border-t border-white/10" style={{ backgroundColor: "#050505" }}>
        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <FadeIn>
            <div className="max-w-3xl">
              <h2 className="font-display text-5xl font-bold mb-8">
                <span className="text-white">// Built for the</span><br />
                <span className="neon-glow">underground</span>
              </h2>
              <p className="font-mono-body text-lg text-white/70 leading-relaxed mb-6">
                This isn't for everyone.<br />
                It's for the ones actually doing it.
              </p>
              <p className="font-mono-body text-sm text-white/50 italic">
                Not for everyone. And that's the point.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── REVENUE ────────────────────────────────────────────── */}
      <section id="revenue" className="relative py-20 overflow-hidden border-t border-white/10" style={{ backgroundColor: "#050505" }}>
        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <FadeIn>
            <div className="max-w-3xl">
              <h2 className="font-display text-5xl font-bold mb-8">
                <span className="text-white">Keep 90%.</span><br />
                <span className="neon-glow">No bullshit.</span>
              </h2>
              <div className="space-y-4 font-mono-body text-white/70">
                <p>Paid content → flat 90%</p>
                <p>Streaming → earn more as you grow</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── SCENE ────────────────────────────────────────────── */}
      <section id="scene" className="relative py-20 overflow-hidden border-t border-white/10" style={{ backgroundColor: "#050505" }}>
        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <FadeIn>
            <div className="max-w-3xl">
              <h2 className="font-display text-5xl font-bold mb-8">
                <span className="text-white">// Build your</span><br />
                <span className="neon-glow">scene</span>
              </h2>
              <p className="font-mono-body text-lg text-white/70 leading-relaxed">
                We're looking for the ones shaping what's next.<br />
                If that's you, get involved.
              </p>
            </div>
          </FadeIn>
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
            <p className="font-mono-body text-sm text-neon tracking-widest uppercase mb-6">// Finally</p>
            <div className="dashed-border p-8 mb-8 neon-border-glow">
              <h2 className="font-display text-4xl md:text-6xl text-white mb-4 leading-tight">
                SOMEONE OUT THERE NEEDS<br />
                <span className="text-neon neon-glow">TO HEAR THIS SOUND.</span>
              </h2>
            </div>
            <p className="font-mono-body text-base text-white/60 leading-relaxed max-w-2xl mx-auto mb-4">
              We're small right now. But we're thinking global from day one. When we have the infrastructure, the UK underground — from a Hackney basement to a Sheffield warehouse — will reach ears in Berlin, Seoul, and New York.
            </p>
            <p className="font-mono-body text-base text-white/60 leading-relaxed max-w-2xl mx-auto mb-4">
              Words connect people. But the shivers, the tears, the moment your chest fills up at a gig — that's something no AI can replicate.
            </p>
            <p className="font-mono-body text-base text-white/70 leading-relaxed max-w-2xl mx-auto mb-10">
              <span className="text-neon">Raw Stock</span> is where that gets delivered, raw and uncut. We're looking for artists, streamers, editors, and community builders to help shape this from the ground up.
            </p>
            <a
              href="mailto:rawstock.infomation@gmail.com"
              className="group inline-flex items-center gap-3 font-display text-2xl px-12 py-5 border-2 border-neon text-neon hover:bg-neon hover:text-black transition-all duration-300 neon-border-glow"
            >
              CONTACT THE PROJECT
              <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform" />
            </a>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER CTA ────────────────────────────────────────────── */}
      <section className="relative py-20 overflow-hidden border-t border-white/10" style={{ backgroundColor: "#050505" }}>
        <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
          <FadeIn>
            <a
              href="mailto:rawstock.infomation@gmail.com"
              className="group inline-flex items-center gap-2 font-display text-xl px-10 py-5 bg-neon text-black hover:bg-white transition-all duration-200"
            >
              Join the movement
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </FadeIn>
          
          {/* Language switcher */}
          <div className="mt-12 flex items-center justify-center gap-4">
            <a
              href="/"
              className="font-mono-body text-sm text-white/60 hover:text-neon transition-colors tracking-widest uppercase"
            >
              EN
            </a>
            <span className="text-white/30">|</span>
            <a
              href="/ja"
              className="font-mono-body text-sm text-white/60 hover:text-neon transition-colors tracking-widest uppercase"
            >
              JAP
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
