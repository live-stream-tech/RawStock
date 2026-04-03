import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { 
  Radio, 
  TrendingUp, 
  Users, 
  ArrowRight, 
  Award, 
  Zap,
  Camera,
  Edit3,
  ShoppingBag,
  Bell,
  Globe,
  Music,
  Heart,
  Mail,
  CheckCircle2,
  BarChart3,
  Flame,
  Layers,
  Settings2
} from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

import logoAsset from "figma:asset/da32ce1180d23d5a28e8ffcb227e16a2155b7d56.png";
import heroBgAsset from "figma:asset/309842f0ad72149da798df32c7ca400d2c1a681c.png";
import finalBgAsset from "figma:asset/7297cac4224d17f6386dfb8b7fc7e6ebcd88fab4.png";
import metalPatternAsset from "figma:asset/69679f731dbb4e472bf4a5e49e335dcaded790ad.png";

export default function LandingPage() {
  const navigate = useNavigate();

  const ecosystemRoles = [
    {
      title: "Indie Musicians / Bands",
      desc: "Sell your live set direct. No labels. No middlemen.",
      icon: <Music size={24} className="text-[#0891B2]" />
    },
    {
      title: "DJs & Producers",
      desc: "Stream sets. Drop exclusives. Keep 90%.",
      icon: <Radio size={24} className="text-[#0891B2]" />
    },
    {
      title: "Music Tutors",
      desc: "Run paid lessons & breakdowns. Set your own rate.",
      icon: <Heart size={24} className="text-[#0891B2]" />
    },
    {
      title: "Video Editors",
      desc: "Cut live footage for artists. Get work. Get paid.",
      icon: <Edit3 size={24} className="text-[#0891B2]" />
    },
    {
      title: "Scene Builders",
      desc: "Run your genre community. Earn 70% of ad revenue.",
      icon: <Users size={24} className="text-[#0891B2]" />
    },
    {
      title: "Promoters & Venues",
      desc: "Fund the next gig from community pooled revenue.",
      icon: <Award size={24} className="text-[#0891B2]" />
    }
  ];

  const processFlow = [
    { step: "01", title: "Film it", desc: "Capture the raw energy of the set", icon: <Camera size={24} /> },
    { step: "02", title: "Get it cut", desc: "Order an edit from registered editors", icon: <Edit3 size={24} /> },
    { step: "03", title: "Sell it", desc: "Your fans buy the footage direct", icon: <ShoppingBag size={24} /> },
    { step: "04", title: "Run it back", desc: "Promote the next gig. Repeat.", icon: <Bell size={24} /> }
  ];

  const revenueCases = [
    { name: "Standard", poster: "20%", artist: "60%", photographer: "10%", editor: "-", platform: "10%" },
    { name: "Fan-first", poster: "10%", artist: "50%", photographer: "30%", editor: "-", platform: "10%" },
    { name: "Full edit", poster: "10%", artist: "60%", photographer: "10%", editor: "10%", platform: "10%" },
    { name: "Solo artist", poster: "90%", artist: "-", photographer: "-", editor: "-", platform: "10%" },
  ];

  const liveLevels = [
    { level: "Level 4", agency: "95%", individual: "75%", note: "Top tier (criteria met)" },
    { level: "Level 3", agency: "90%", individual: "70%", note: "Advanced" },
    { level: "Level 2", agency: "80%", individual: "60%", note: "Intermediate" },
    { level: "Level 1", agency: "70%", individual: "50%", note: "New / Entry" },
  ];

  const genres = ["Rock", "HIP-HOP", "Electronic", "Jazz", "Punk", "Metal", "Idol", "R&B", "World"];

  return (
    <div className="min-h-screen bg-[#0a0f16] text-white selection:bg-[#0891B2]/30 font-sans overflow-x-hidden">
      <div className="w-full max-w-[540px] mx-auto min-h-screen bg-[#334155] relative flex flex-col overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border-x border-white/5">
        
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
          <div className="absolute inset-0 bg-noise opacity-20" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px]" />
          
          <div className="absolute top-20 left-4 text-[7px] font-black opacity-30 vertical-text tracking-widest uppercase">
            X_COORD_SYS_V4 // REF_MARKER_001
          </div>
          <div className="absolute top-20 right-4 text-[7px] font-black opacity-30 vertical-text tracking-widest uppercase">
            Y_COORD_SYS_V4 // REF_MARKER_002
          </div>
        </div>

        <header className="absolute top-0 left-0 right-0 z-[100] px-8 pt-[53px] flex flex-col items-center gap-2">
           <ImageWithFallback 
             src={logoAsset} 
             fallback={<div className="text-[#0891B2] font-black italic text-2xl tracking-tighter uppercase">RawStock</div>}
             className="h-[70px] w-auto object-contain"
             alt="RawStock Logo"
           />
           <div className="h-px w-24 bg-[#0891B2] mt-2" />
        </header>

        <section className="relative h-[90vh] min-h-[750px] flex flex-col items-center justify-start text-center px-8 pt-[190px]">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div 
              className="absolute inset-0 opacity-80"
              style={{ 
                backgroundImage: `url(${heroBgAsset})`,
                backgroundSize: '120% auto',
                backgroundRepeat: 'repeat-y',
                backgroundPosition: 'center top'
              }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none" />
            
            <div className="absolute inset-0 bg-[#0a0f16]/20 mix-blend-multiply z-[5]" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0f16]/90 z-10" />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative z-30 flex flex-col items-center"
          >
            <div className="px-5 py-2 border border-[#0891B2] bg-white/10 text-[#0891B2] text-[11px] font-black tracking-[0.2em] uppercase mb-6 rounded-lg backdrop-blur-sm">
              Underground Music Marketplace
            </div>
            
            <h1 className="font-black italic tracking-[-0.1em] uppercase leading-none mb-6 drop-shadow-2xl text-center">
              <span className="text-[42px] block text-white">
                <span className="bg-[#0891B2]/50 px-2 inline-block">Film it. Sell it.</span>
              </span>
              <span className="text-[32px] block mt-1 text-white">
                <span className="bg-[#0891B2]/50 px-2 inline-block">
                  Keep <span className="text-[#ea580c] text-[46px] underline decoration-[8px] decoration-[#0891B2]/60 underline-offset-[-2px]">90%</span>.
                </span>
              </span>
            </h1>

            <div className="flex flex-col items-center gap-12 w-full">
              <div className="h-14 w-[3px] bg-gradient-to-b from-transparent via-[#0891B2] to-transparent" />
              
              <div className="space-y-4 -mt-[110px]">
                <p className="text-xl text-white font-light italic leading-none tracking-[-0.05em] uppercase bg-[#0891B2]/10 px-6 py-2 border-y border-[#0891B2]/30">
                  No labels. No algorithms. Direct from stage to screen.
                </p>
              </div>

              <div className="bg-[#0a0f16]/50 border border-white/10 p-10 rounded-2xl max-w-[400px] text-center relative z-20">
                <p className="text-[13px] text-white/90 font-light leading-snug tracking-tight text-center">
                  AI can generate a million beats overnight.<br />
                  But the <span className="text-white font-bold">raw heat</span> of a live set at 2 AM?<br />
                  The crowd screaming every word back?<br />
                  That can never be manufactured.<br />
                  <span className="block mt-4 text-white/90">
                    We built RawStock to capture that energy,<br />
                    stock it as a permanent asset,<br />
                    and let the people who made it<br />
                    own it forever.
                  </span>
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="py-24 px-8 bg-[#0a0f16] relative flex flex-col items-center">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-black italic tracking-[-0.08em] uppercase mb-6 text-[#7dd3fc] leading-none">
              <span className="bg-[#0891B2]/20 px-2 inline-block">The Music</span><br />
              <span className="bg-[#0891B2]/20 px-2 inline-block mt-1">Ecosystem</span>
            </h2>
            <div className="flex flex-col items-center">
              <div className="h-8 w-[2px] bg-[#0891B2] opacity-50" />
              <div className="px-6 py-2 border border-[#0891B2]/40 inline-block rounded-lg mb-4">
                <p className="text-[11px] font-black text-[#7dd3fc] tracking-[0.3em] uppercase">Everyone eats. No one gets cut out.</p>
              </div>
              <div className="h-12 w-[2px] bg-gradient-to-b from-[#0891B2] to-transparent opacity-50" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 w-full">
            {ecosystemRoles.map((role, i) => (
              <div key={i} className="bg-[#1a2331] border border-[#0891B2]/30 p-8 flex flex-col items-center text-center gap-6 group hover:bg-[#0891B2]/20 transition-all relative overflow-hidden">
                <div className="absolute inset-0 z-0 pointer-events-none opacity-35 mix-blend-overlay">
                  <ImageWithFallback 
                    src={metalPatternAsset} 
                    className="w-full h-full object-cover" 
                    alt="" 
                  />
                </div>
                
                <div className="w-14 h-14 bg-black border border-[#0891B2]/20 flex items-center justify-center group-hover:border-[#0891B2] transition-colors relative overflow-hidden z-10">
                   <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                   {role.icon}
                </div>
                <div className="relative z-10">
                  <h4 className="text-[18px] font-black italic uppercase tracking-tight mb-2 text-[#0891B2] transition-colors">{role.title}</h4>
                  <p className="text-[13px] opacity-60 font-bold leading-relaxed">{role.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="py-24 px-8 bg-[#334155] border-y border-white/10 relative flex flex-col items-center">
          <div className="text-center mb-16 relative z-10">
            <h2 className="text-5xl font-black italic tracking-[-0.08em] uppercase mb-2 leading-none">How it works</h2>
            <div className="h-2 w-16 bg-[#0891B2] mx-auto mb-4" />
          </div>

          <div className="relative w-full max-w-[380px] flex flex-col items-center">
            <div className="absolute left-1/2 -translate-x-1/2 top-10 bottom-10 w-[2px] bg-gradient-to-b from-[#0891B2] via-white to-[#0891B2] opacity-20" />
            
            <div className="space-y-16 w-full">
              {processFlow.map((p, i) => (
                <div key={i} className="flex flex-col items-center relative z-10 group">
                   <div className="w-16 h-16 bg-black border-4 border-white/10 flex flex-col items-center justify-center group-hover:border-[#0891B2] transition-colors shadow-2xl mb-4 relative">
                      <div className="absolute -top-2 -right-2 w-7 h-7 bg-[#0891B2] flex items-center justify-center text-[11px] font-black italic shadow-xl">
                        {p.step}
                      </div>
                      {p.icon}
                   </div>
                   <div className="text-center px-4">
                     <h4 className="text-2xl font-black italic tracking-[-0.05em] uppercase mb-1 leading-tight">{p.title}</h4>
                     <p className="text-[14px] text-white/60 font-bold leading-snug group-hover:text-white transition-colors">{p.desc}</p>
                   </div>
                </div>
              ))}
            </div>

            <div className="mt-16 flex flex-col items-center w-full max-w-[400px]">
               <div className="w-full flex flex-col items-center">
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-[#0891B2]/50 to-transparent" />
                  <div className="py-3 px-8 flex items-center gap-4 justify-center">
                    <span className="text-[14px] font-black tracking-[-0.05em] text-[#7dd3fc] uppercase whitespace-nowrap text-center">
                      Every gig funds the next one.<br />A self-sustaining loop.
                    </span>
                  </div>
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-[#0891B2]/50 to-transparent" />
               </div>
               <div className="mt-4 flex flex-col items-center gap-1 opacity-20">
                  <div className="w-1 h-1 bg-[#0891B2] rounded-full" />
                  <div className="w-1 h-1 bg-[#0891B2] rounded-full" />
                  <div className="w-1 h-1 bg-[#0891B2] rounded-full" />
               </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 bg-[#0a0f16] flex flex-col items-center overflow-hidden">
          <div className="mb-16 text-center">
             <h2 className="text-4xl font-black italic tracking-[-0.08em] uppercase leading-none">Revenue<span className="text-[#0891B2] block text-xl mt-2 tracking-[0.1em]">(The Numbers)</span></h2>
          </div>

          <div className="w-full space-y-12">
            <div className="border-l-8 border-[#0891B2] pl-6 py-2">
              <h3 className="text-2xl font-black italic tracking-[-0.05em] uppercase mb-1 leading-tight">1. Paid Content</h3>
              <p className="text-[12px] font-bold text-white/50 uppercase tracking-widest leading-relaxed">Live recordings, music videos, setlists, breakdowns</p>
            </div>

            <div className="bg-[#1a2331] border border-white/10 p-8 rounded-xl space-y-8">
              <div className="flex justify-between items-center border-b border-white/10 pb-6">
                <span className="text-[13px] font-black uppercase text-white/40">Creator payout</span>
                <span className="text-6xl font-black italic tracking-tighter">90<span className="text-2xl text-[#0891B2]">%</span></span>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <CheckCircle2 size={18} className="text-[#0891B2] shrink-0 mt-1" />
                  <p className="text-[14px] font-bold leading-snug"><span className="text-red-500">90%</span> goes to the creator side<br /><span className="text-white/40 text-[12px]">(Platform takes 10% only)</span></p>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle2 size={18} className="text-[#0891B2] shrink-0 mt-1" />
                  <p className="text-[14px] font-bold leading-snug">Split it <span className="text-red-500">however you want</span> between artist, filmmaker, and editor</p>
                </div>
                <div className="flex items-start gap-4">
                  <Zap size={18} className="text-[#0891B2] shrink-0 mt-1" />
                  <p className="text-[14px] font-bold leading-snug text-[#0891B2]">Automatic revenue distribution. No manual transfers.</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <p className="text-[12px] font-black text-[#0891B2] uppercase tracking-[0.3em] text-center">Revenue split examples (% of total sale)</p>
              <div className="bg-black border border-white/10 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40">
                      <th className="p-4 border-r border-white/10">Case</th>
                      <th className="p-4 border-r border-white/10">Poster</th>
                      <th className="p-4 border-r border-white/10">Artist</th>
                      <th className="p-4 border-r border-white/10">Filmmaker</th>
                      <th className="p-4 border-r border-white/10">Editor</th>
                      <th className="p-4">Platform</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueCases.map((c, i) => (
                      <tr key={i} className="border-b border-white/5 text-[11px] font-bold hover:bg-white/5 transition-colors">
                        <td className="p-4 border-r border-white/10 bg-[#1a2331]">{c.name}</td>
                        <td className="p-4 border-r border-white/10">{c.poster}</td>
                        <td className="p-4 border-r border-white/10">{c.artist}</td>
                        <td className="p-4 border-r border-white/10">{c.photographer}</td>
                        <td className="p-4 border-r border-white/10">{c.editor}</td>
                        <td className="p-4 text-[#0891B2]">{c.platform}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="w-full mt-24 space-y-12">
            <div className="border-l-8 border-[#0891B2] pl-6 py-2">
              <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-2">2. Live Streaming</h3>
              <p className="text-[12px] font-bold text-white/50 uppercase tracking-widest leading-relaxed">Tiered payout based on level and affiliation</p>
            </div>

            <div className="space-y-6">
              <div className="bg-black border border-white/10 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40">
                      <th className="p-4 border-r border-white/10">Level</th>
                      <th className="p-4 border-r border-white/10">Agency</th>
                      <th className="p-4 border-r border-white/10">Independent</th>
                      <th className="p-4">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveLevels.map((l, i) => (
                      <tr key={i} className="border-b border-white/5 text-[10px] font-bold hover:bg-white/5 transition-colors">
                        <td className="p-4 border-r border-white/10 bg-[#1a2331] font-black italic">{l.level}</td>
                        <td className="p-4 border-r border-white/10 text-white text-[12px]">{l.agency}</td>
                        <td className="p-4 border-r border-white/10 text-[#0891B2] text-[12px]">{l.individual}</td>
                        <td className="p-4 text-white/40">{l.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-[#1a2331]/50 p-8 space-y-6 text-[13px] leading-relaxed font-bold border border-white/5">
                 <p><span className="text-[#0891B2]">Agency-affiliated:</span> Higher split accounts for management overhead (promo, contracts, dispute resolution)</p>
                 <p><span className="text-[#0891B2]">Independent:</span> Lower fees + agency-level tools (audience analytics, payment processing, booking)</p>
                 <p className="text-white/40 text-[11px] italic underline underline-offset-4">Level-up criteria: watch-time retention, consistent revenue, community contribution</p>
              </div>
            </div>
          </div>

          <div className="w-full mt-24 space-y-12">
            <div className="border-l-8 border-[#0891B2] pl-6 py-2">
              <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-2 leading-tight">3. Genre Communities</h3>
              <p className="text-[12px] font-bold text-white/50 uppercase tracking-widest leading-relaxed">Human-curated scenes. Not algorithmic feeds.</p>
            </div>

            <div className="bg-[#1a2331] border border-white/10 p-8 space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                 <Settings2 size={40} className="text-white/5" />
              </div>
              <div className="space-y-6">
                <div className="p-4 bg-black/40 border-l-2 border-[#0891B2]">
                  <p className="text-[14px] font-bold leading-relaxed italic">
                    "Admins and moderators curate what surfaces. Real taste, not engagement bait. The best music rises because people who know music say so."
                  </p>
                </div>
                <div className="bg-black border border-white/10 p-6 space-y-4">
                   <div className="flex justify-between items-center border-b border-white/10 pb-4">
                      <span className="text-[11px] font-black uppercase text-white/40 tracking-widest">Ad rate</span>
                      <span className="text-xl font-black italic">Members x ¥7 / day</span>
                   </div>
                </div>
                <div className="grid grid-cols-1 gap-4 text-[12px] font-black italic">
                   <div className="flex justify-between bg-white/5 p-4 items-center">
                      <span className="text-white/40">Event fund</span>
                      <span>10%</span>
                   </div>
                   <div className="flex justify-between bg-[#0891B2] p-4 items-center text-black">
                      <span>Admins & Moderators</span>
                      <span>70%</span>
                   </div>
                   <div className="flex justify-between bg-white/5 p-4 items-center">
                      <span className="text-white/40">Platform</span>
                      <span>20%</span>
                   </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full mt-24 bg-[#334155] border-4 border-black p-10 space-y-10 shadow-[20px_20px_0_rgba(0,0,0,0.4)]">
             <div className="text-center">
                <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-4">Genre Hubs</h3>
                <div className="flex flex-wrap justify-center gap-3">
                   {genres.map((g, i) => (
                     <span key={i} className="px-3 py-1 bg-black text-[#0891B2] text-[10px] font-black italic uppercase tracking-tighter border border-[#0891B2]/20">
                       {g}
                     </span>
                   ))}
                </div>
             </div>
             
             <div className="space-y-6 text-[13px] font-bold leading-relaxed text-center opacity-80">
                <p>Each genre gets its own page, its own community, its own economy.</p>
                <div className="bg-black border border-white/10 p-6 space-y-4 text-left">
                   <div className="flex justify-between items-center border-b border-white/10 pb-4">
                      <span className="text-[11px] font-black uppercase text-white/40 tracking-widest">Genre-wide ads</span>
                      <span className="text-xl font-black italic">Total members x ¥5 / day</span>
                   </div>
                </div>
                <p className="text-white/60">
                  The biggest community in each genre auto-appoints the genre admin monthly.<br />
                  Same transparent revenue split applies.
                </p>
             </div>
          </div>
        </section>

        <section className="relative py-32 px-10 flex flex-col items-center text-center overflow-hidden min-h-[600px] bg-[#0a0f16]">
          <div className="absolute inset-0 z-0 overflow-hidden flex items-start justify-center">
             <div className="w-full h-full relative">
               <ImageWithFallback 
                 src={finalBgAsset} 
                 fallback={<div className="w-full h-full bg-[#0a0f16]" />}
                 className="w-full h-full object-cover grayscale-[0.2] contrast-[1.1] brightness-[0.7] opacity-40 scale-[0.85] shrink-0"
                 style={{ 
                    maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)' 
                 }}
                 alt="Final Background"
               />
               <div className="absolute inset-0 bg-[#334155]/20 mix-blend-multiply" />
               <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0f16]/40 to-[#0a0f16]" />
             </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="relative z-20 max-w-[420px]"
          >
            <h2 className="text-2xl font-normal italic tracking-[0.1em] mb-12 text-white/90 underline decoration-[#0891B2]/40 underline-offset-8">Built for the underground</h2>
            
            <div className="space-y-10 text-[16px] font-medium leading-relaxed text-white/90">
              <p className="text-[20px] font-medium italic tracking-tight mb-8 text-white">
                <span className="bg-[#0891B2]/40 px-2 py-1">Somewhere out there, someone needs to hear this sound.</span>
              </p>
              
              <p>
                We're small now. But we're aiming global from day one.<br />
                Tokyo basements reaching Berlin warehouses,<br />
                Seoul back alleys, Brooklyn rooftops.
              </p>
              
              <div className="py-6 border-y border-white/10 bg-white/5">
                <p>
                  AI can translate the words.<br />
                  But the sweat, the screams, the moment<br />
                  the whole room catches fire—<br />
                  no machine can replicate that.
                </p>
              </div>

              <p className="text-lg text-white">
                RawStock exists to deliver that, raw and uncut.<br />
                Build this scene with us.
              </p>
            </div>

            <div className="mt-20">
               <a 
                 href="mailto:rawstock.infomation@gmail.com" 
                 className="inline-block w-full bg-[#0891B2] text-white py-8 text-2xl font-black italic tracking-tighter uppercase hover:bg-white hover:text-black transition-all shadow-[0_20px_50px_rgba(8,145,178,0.3)] active:scale-[0.98] border-2 border-transparent hover:border-black"
               >
                 Join the Movement
               </a>
            </div>
          </motion.div>
        </section>

        <footer className="py-16 bg-black px-8 text-center border-t border-white/10">
           <div className="opacity-30 space-y-4">
              <p className="text-[11px] font-black uppercase tracking-[1em]">RAWSTOCK_SYSTEM_v4.0</p>
              <p className="text-[10px] font-bold">© 2026 RAWSTOCK // UNDERGROUND MUSIC MARKETPLACE</p>
           </div>
        </footer>
      </div>

      <style>{`
        .bg-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3%3Cfilter id='noiseFilter'%3%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
        .vertical-text {
          writing-mode: vertical-rl;
        }
      `}</style>
    </div>
  );
}
