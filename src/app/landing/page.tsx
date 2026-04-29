'use client';

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import {
  ShieldCheck,
  Clock,
  MapPin,
  Star,
  ArrowRight,
  Bike,
  Car,
  Navigation,
  Zap,
  Users,
  Route,
  TrendingUp,
  ChevronRight,
  Phone,
  Globe,
  Lock,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { useUser, useDoc } from "@/firebase";
import { useEffect, useRef, useState } from "react";

const LOGO_URL = "https://z-cdn-media.chatglm.cn/files/689f8402-5d9a-4dca-8e65-abeb3c01f777.png?auth_key=1877467706-69da9fab448f45dc9102a22566047435-0-b8297fd875c797f44808eb7527469c70";

const animCSS = `
@keyframes lpOrbDrift{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-40px) scale(1.08)}66%{transform:translate(-20px,25px) scale(.95)}}
@keyframes lpFadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes lpFadeLeft{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}
@keyframes lpFadeRight{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
@keyframes lpScaleIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
@keyframes lpPulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.6;transform:scale(1.06)}}
@keyframes lpFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes lpGlow{0%,100%{box-shadow:0 0 20px rgba(245,158,11,.15)}50%{box-shadow:0 0 50px rgba(245,158,11,.3)}}
@keyframes lpLine{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
@keyframes lpCounter{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes lpShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.lp-fade-up{opacity:0;transform:translateY(30px);transition:all .7s cubic-bezier(.22,1,.36,1)}
.lp-fade-left{opacity:0;transform:translateX(-30px);transition:all .7s cubic-bezier(.22,1,.36,1)}
.lp-fade-right{opacity:0;transform:translateX(30px);transition:all .7s cubic-bezier(.22,1,.36,1)}
.lp-scale-in{opacity:0;transform:scale(.92);transition:all .7s cubic-bezier(.22,1,.36,1)}
.lp-visible{opacity:1!important;transform:none!important}
.lp-float{animation:lpFloat 4s ease-in-out infinite}
.lp-glow{animation:lpGlow 3s ease-in-out infinite}
`;

export default function LandingPage() {
  const { user } = useUser();
  const { data: profile } = useDoc(user ? `users/${user.uid}` : null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [scrolled, setScrolled] = useState(false);

  const placeholderLogo = PlaceHolderImages.find(img => img.id === 'logo');
  const logoSrc = LOGO_URL || placeholderLogo?.imageUrl || "/logo.png";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('lp-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    );
    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });
    return () => observer.disconnect();
  }, []);

  const setRef = (idx: number) => (el: HTMLDivElement | null) => {
    sectionRefs.current[idx] = el;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animCSS }} />
      <div className="min-h-screen bg-[#070b14] text-white overflow-x-hidden" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute w-[600px] h-[600px] rounded-full top-[-200px] left-[-150px] opacity-20" style={{ background: 'radial-gradient(circle,#f59e0b,transparent)', animation: 'lpOrbDrift 24s ease-in-out infinite alternate' }} />
          <div className="absolute w-[500px] h-[500px] rounded-full bottom-[-150px] right-[-120px] opacity-12" style={{ background: 'radial-gradient(circle,#10b981,transparent)', animation: 'lpOrbDrift 24s ease-in-out infinite alternate-reverse' }} />
          <div className="absolute w-[350px] h-[350px] rounded-full top-[35%] right-[20%] opacity-8" style={{ background: 'radial-gradient(circle,#06b6d4,transparent)', animation: 'lpOrbDrift 20s ease-in-out infinite alternate', animationDelay: '-8s' }} />
        </div>

        <div className="fixed inset-0 pointer-events-none z-[1] opacity-[0.02]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 256 256\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"n\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.85\" numOctaves=\"4\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23n)\"/%3E%3C/svg%3E')" }} />

        <div className="relative z-[2] flex flex-col min-h-screen">
          <header className={`fixed top-0 w-full z-[60] transition-all duration-500 ${scrolled ? 'bg-[#070b14]/90 backdrop-blur-2xl border-b border-white/[0.04] shadow-xl shadow-black/20' : 'bg-transparent'}`}>
            <Container className="flex h-16 md:h-20 items-center justify-between">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative w-10 h-10 md:w-11 md:h-11 rounded-xl overflow-hidden lp-glow border border-amber-500/20 group-hover:border-amber-500/40 transition-colors">
                  <Image src={logoSrc} alt="MUTAMBUKE Logo" fill className="object-contain" priority />
                </div>
                <div className="flex flex-col">
                  <span className="font-[JetBrains_Mono,monospace] font-extrabold text-base md:text-lg tracking-tight leading-none">MUTAMBUKE</span>
                  <span className="text-[7px] font-bold text-white/15 uppercase tracking-[0.3em] hidden sm:block">Smart Urban Travel</span>
                </div>
              </Link>

              <nav className="hidden md:flex items-center gap-8">
                {['Ibyo Ukora', 'Umuhanzi', 'Umutekano', 'Ibyinjira'].map((item, i) => (
                  <a key={i} href={`#section-${i}`} className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] hover:text-white/70 transition-colors">
                    {item}
                  </a>
                ))}
              </nav>

              <Link href={user ? "/" : "/auth"}>
                <Button className={`rounded-xl font-[JetBrains_Mono,monospace] font-extrabold text-[10px] uppercase tracking-[0.12em] px-6 h-11 shadow-lg transition-all duration-300 active:scale-95 ${
                  scrolled
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-amber-500/20 hover:shadow-amber-500/30'
                    : 'bg-white/[0.08] backdrop-blur-md border border-white/[0.1] text-white hover:bg-white/[0.12]'
                }`}>
                  {user && profile ? "DASHBOARD" : "TANGIRA"}
                  <ArrowRight size={14} className="ml-2" />
                </Button>
              </Link>
            </Container>
          </header>

          <section className="relative pt-28 md:pt-40 pb-16 md:pb-32 overflow-hidden">
            <Container className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="space-y-8 lp-fade-left">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-amber-500/15 bg-amber-500/[0.06]">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-amber-400/80 uppercase tracking-[0.2em]">Real-Time Smart Transport</span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-[JetBrains_Mono,monospace] font-extrabold tracking-tighter leading-[0.88]">
                    <span className="text-white">SMART</span>
                    <br />
                    <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-transparent">URBAN</span>
                    <br />
                    <span className="text-white/60">TRAVEL.</span>
                  </h1>
                </div>

                <p className="text-base md:text-lg text-white/30 max-w-md leading-relaxed font-medium">
                 Uburyo bwizewe bwo kugenda mu mujyi. Tanga umushoferi wizewe, menya igiciro mbere y'urugendo, kandi wishyure mu buryo bworoshye.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Link href={user ? "/" : "/auth"} className="flex-1 group">
                    <div className="relative w-full py-4 md:py-5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 text-white text-center font-[JetBrains_Mono,monospace] font-extrabold text-sm md:text-base uppercase tracking-[0.08em] shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 hover:translate-y-[-2px] active:translate-y-0 transition-all overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundSize: '200% 100%', animation: 'lpShimmer 2s linear infinite' }} />
                      <span className="relative flex items-center justify-center gap-2">
                        SHAKA URUGENDO
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </Link>
                  <Link href={user ? "/" : "/auth"} className="flex-1">
                    <div className="w-full py-4 md:py-5 rounded-2xl border-2 border-white/[0.08] bg-white/[0.02] text-white/60 text-center font-[JetBrains_Mono,monospace] font-extrabold text-sm md:text-base uppercase tracking-[0.08em] hover:bg-white/[0.05] hover:border-white/[0.15] hover:text-white hover:translate-y-[-2px] active:translate-y-0 transition-all backdrop-blur-sm flex items-center justify-center gap-2">
                      <Bike size={18} />
                      BA UMUSHOFERI
                    </div>
                  </Link>
                </div>

                <div className="flex items-center gap-6 pt-4">
                  {[
                    { icon: ShieldCheck, text: 'Abashoferi Bizewe' },
                    { icon: Lock, text: 'Ibishyu Byizewe' },
                    { icon: Zap, text: 'Serivisi yihuse' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <item.icon size={13} className="text-emerald-400/50" />
                      <span className="text-[9px] font-bold text-white/20 uppercase tracking-wider hidden sm:block">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative lp-fade-right" style={{ transitionDelay: '150ms' }}>
                <div className="relative aspect-square md:aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/40 border border-white/[0.06]">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 via-[#0d1520] to-emerald-900/20" />
                  
                  <div className="absolute inset-0 flex items-center justify-center p-12">
                    <div className="relative w-full max-w-[320px] aspect-square lp-float">
                      <Image src={logoSrc} alt="MUTAMBUKE" fill className="object-contain drop-shadow-2xl" priority />
                      <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-3xl -z-10" />
                    </div>
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-transparent to-transparent" />
                </div>

                <div className="absolute -top-4 -right-4 w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/10 flex items-center justify-center lp-float" style={{ animationDelay: '-1s' }}>
                  <Bike size={28} className="text-amber-400/40" />
                </div>
                <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/10 flex items-center justify-center lp-float" style={{ animationDelay: '-2.5s' }}>
                  <Navigation size={22} className="text-emerald-400/40" />
                </div>
              </div>
            </Container>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
              <span className="text-[8px] font-bold uppercase tracking-[0.3em]">Kurikira</span>
              <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1">
                <div className="w-1 h-2 rounded-full bg-white/40 animate-bounce" />
              </div>
            </div>
          </section>

          <section id="section-0" ref={setRef(1)} className="py-24 md:py-36">
            <Container>
              <div className="text-center mb-16 md:mb-20 lp-fade-up">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] mb-6">
                  <Zap size={10} className="text-amber-400" />
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em]">Ibyangombwa</span>
                </div>
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-[JetBrains_Mono,monospace] font-extrabold tracking-tighter mb-4">
                  KUKI <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">MUTAMBUKE</span>?
                </h2>
                <p className="text-sm md:text-base text-white/25 max-w-lg mx-auto">
                  Dutanga serivisi zitandukanye kugirango urugendo rwawe rube rwiza kandi rwihuse.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                {[
                  {
                    icon: ShieldCheck,
                    title: 'Abashoferi Bemewe',
                    desc: "Umushoferi wese aratoranywa kandi akagenzurwa kugirango tumenye neza umutekano wawe.",
                    color: 'emerald',
                    gradient: 'from-emerald-500/10'
                  },
                  {
                    icon: Clock,
                    title: 'Kwakira Vuba',
                    desc: "Bona umushoferi ukwegereye mu masegonda, ntugategereze.",
                    color: 'amber',
                    gradient: 'from-amber-500/10'
                  },
                  {
                    icon: MapPin,
                    title: 'Gufata Ibyerekeye',
                    desc: "Kurikira umushoferi wawe ku ikarita mu gihe nyacyo ukoresheje GPS.",
                    color: 'blue',
                    gradient: 'from-blue-500/10'
                  },
                  {
                    icon: Lock,
                    title: 'Ibiciro Biroheje',
                    desc: "Menya igiciro cy'urugendo rwawe mbere yo guhaguruka, nta biciro byihishe.",
                    color: 'violet',
                    gradient: 'from-violet-500/10'
                  },
                  {
                    icon: Phone,
                    title: 'Ihamagara Ryoroshye',
                    desc: "Vugana n'umushoferi wawe mu buryo bworoshye igihe cyose ubishakiye.",
                    color: 'rose',
                    gradient: 'from-rose-500/10'
                  },
                  {
                    icon: TrendingUp,
                    title: 'Inyungu Z\'umushoferi',
                    desc: "Abashoferi bacu babona inyungu zikwiye, ibiciro bibanogeye, n'umutekano mu kazi.",
                    color: 'cyan',
                    gradient: 'from-cyan-500/10'
                  },
                ].map((feature, i) => (
                  <div
                    key={i}
                    ref={setRef(5 + i)}
                    className={`lp-fade-up group relative p-7 md:p-8 rounded-[2rem] border border-white/[0.04] bg-[#0a0f1a]/60 backdrop-blur-sm hover:bg-[#0d1520] hover:border-white/[0.08] hover:translate-y-[-4px] transition-all duration-500 overflow-hidden`}
                    style={{ transitionDelay: `${i * 80}ms` }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                    <div className="relative z-10">
                      <div className={`w-14 h-14 rounded-2xl bg-${feature.color}-500/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-${feature.color}-500/15 transition-all duration-300`}>
                        <feature.icon size={24} className={`text-${feature.color}-400`} />
                      </div>
                      <h3 className="text-lg font-bold tracking-tight mb-3">{feature.title}</h3>
                      <p className="text-sm text-white/25 leading-relaxed">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Container>
          </section>

          <section id="section-1" ref={setRef(2)} className="py-24 md:py-36 border-t border-white/[0.04]">
            <Container>
              <div className="text-center mb-16 lp-fade-up">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] mb-6">
                  <Route size={10} className="text-emerald-400" />
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em]">Uko Ikora</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-[JetBrains_Mono,monospace] font-extrabold tracking-tighter mb-4">
                  INTAMBWE <span className="text-white/30">MITATU</span>
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6 md:gap-8 relative">
                <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-blue-500/20" />

                {[
                  { step: '01', title: 'Shaka Umushoferi', desc: 'Hitamo ubwoko bw\'ikinyabiziga (Moto cyangwa Taxi) hanyuma usabe umushoferi hafi yawe.', icon: Navigation, color: 'amber' },
                  { step: '02', title: 'Umushoferi Kwakira', desc: 'Umushoferi wawe ahita yemera urugendo kandi akahagera vuba.', icon: Bike, color: 'emerald' },
                  { step: '03', title: 'Tangira Ingendo', desc: 'Injira mu kinyabiziga, ukurikire urugendo ku ikarita, hanyuma ugere iyo ujya mu mutekano.', icon: MapPin, color: 'blue' },
                ].map((item, i) => (
                  <div key={i} ref={setRef(11 + i)} className="lp-fade-up relative text-center" style={{ transitionDelay: `${i * 120}ms` }}>
                    <div className="relative inline-flex items-center justify-center mb-6">
                      <div className={`w-16 h-16 rounded-2xl bg-${item.color}-500/10 border border-${item.color}-500/15 flex items-center justify-center relative z-10`}>
                        <item.icon size={26} className={`text-${item.color}-400`} />
                      </div>
                      <span className="absolute -top-2 -right-2 w-7 h-7 rounded-lg bg-[#0a0f1a] border border-white/[0.08] flex items-center justify-center text-[9px] font-[JetBrains_Mono,monospace] font-extrabold text-white/40 z-20">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold tracking-tight mb-2">{item.title}</h3>
                    <p className="text-sm text-white/20 leading-relaxed max-w-xs mx-auto">{item.desc}</p>
                  </div>
                ))}
              </div>
            </Container>
          </section>

          <footer className="py-16 border-t border-white/[0.04]">
            <Container>
              <div className="space-y-12">
                <div className="grid md:grid-cols-4 gap-10">
                  <div className="md:col-span-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/[0.06]">
                        <Image src={logoSrc} alt="MUTAMBUKE" fill className="object-contain" />
                      </div>
                      <span className="font-[JetBrains_Mono,monospace] font-extrabold text-base tracking-tight">MUTAMBUKE</span>
                    </div>
                    <p className="text-xs text-white/15 leading-relaxed max-w-xs">
                      Uburyo bwa mbere bwizewe, bwihuse, kandi bugezweho bwo gutwara abantu mu Rwanda.
                    </p>
                  </div>

                  {[
                    { title: 'Ibicuruzwa', items: ['Shaka Ingendo', 'Uba Umushoferi', 'Ibiciro', 'Ibikorwa'] },
                    { title: 'Kumpanyi', items: ['Ibyerekeye', 'Umutekano', 'Amabwiriza', 'Ibyinjira'] },
                    { title: 'Ifashayobora', items: ['Ibibazo', 'Ihamagara', 'Imeyili', 'Ibyegeranye'] },
                  ].map((col, i) => (
                    <div key={i}>
                      <h4 className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4">{col.title}</h4>
                      <ul className="space-y-2.5">
                        {col.items.map((item, j) => (
                          <li key={j}>
                            <a href="#" className="text-xs text-white/15 hover:text-white/40 transition-colors">{item}</a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-[9px] font-bold text-white/10 uppercase tracking-[0.2em]">
                    © 2024 MUTAMBUKE TRANSPORT SYSTEM. UBUGENGANZIRA BWITE BURARINZWE.
                  </p>
                  <div className="flex items-center gap-4">
                    <Globe size={14} className="text-white/10" />
                    <span className="text-[10px] text-white/10">Kinyarwanda</span>
                  </div>
                </div>
              </div>
            </Container>
          </footer>
        </div>
      </div>
    </>
  );
}
