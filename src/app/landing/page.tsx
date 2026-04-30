'use client';

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import {
  ShieldCheck,
  Clock,
  MapPin,
  ArrowRight,
  Bike,
  Navigation,
  Zap,
  Route,
  TrendingUp,
  Phone,
  Globe,
  Lock,
  Sun,
  Moon,
  Satellite
} from "lucide-react";
import Link from "next/link";
import { useUser, useDoc } from "@/firebase";
import { useEffect, useRef, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LOGO_URL = "/logo.png";

const animCSS = `
@keyframes lpOrbDrift{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-40px) scale(1.08)}66%{transform:translate(-20px,25px) scale(.95)}}
@keyframes lpFadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes lpFadeLeft{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}
@keyframes lpFadeRight{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
@keyframes lpScaleIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
@keyframes lpShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.lp-fade-up{opacity:0;transform:translateY(30px);transition:all .7s cubic-bezier(.22,1,.36,1)}
.lp-fade-left{opacity:0;transform:translateX(-30px);transition:all .7s cubic-bezier(.22,1,.36,1)}
.lp-fade-right{opacity:0;transform:translateX(30px);transition:all .7s cubic-bezier(.22,1,.36,1)}
.lp-visible{opacity:1!important;transform:none!important}
.lp-float{animation:lpFloat 4s ease-in-out infinite}
@keyframes lpFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
`;

type Language = 'rw' | 'en' | 'fr';

export default function LandingPage() {
  const { user } = useUser();
  const { data: profile } = useDoc(user ? `users/${user.uid}` : null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const [lang, setLang] = useState<Language>('rw');

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
      { threshold: 0.1 }
    );
    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animCSS }} />
      <div className="min-h-screen bg-[#070b14] text-white overflow-x-hidden font-sans">
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute w-[600px] h-[600px] rounded-full top-[-200px] left-[-150px] opacity-20" style={{ background: 'radial-gradient(circle,#f59e0b,transparent)', animation: 'lpOrbDrift 24s ease-in-out infinite alternate' }} />
          <div className="absolute w-[500px] h-[500px] rounded-full bottom-[-150px] right-[-120px] opacity-12" style={{ background: 'radial-gradient(circle,#10b981,transparent)', animation: 'lpOrbDrift 24s ease-in-out infinite alternate-reverse' }} />
        </div>

        {/* Noise Layer with safe string interpolation */}
        <div 
          className="fixed inset-0 pointer-events-none z-[1] opacity-[0.02]" 
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} 
        />

        <div className="relative z-[2] flex flex-col min-h-screen">
          <header className={`fixed top-0 w-full z-[60] transition-all duration-500 ${scrolled ? 'bg-[#070b14]/90 backdrop-blur-2xl border-b border-white/[0.04]' : 'bg-transparent'}`}>
            <Container className="flex h-16 md:h-20 items-center justify-between">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-amber-500/20">
                  <Image src={LOGO_URL} alt="MUTAMBUKE Logo" fill className="object-contain" priority />
                </div>
                <span className="font-bold text-lg tracking-tight">MUTAMBUKE</span>
              </Link>

              <nav className="hidden md:flex items-center gap-8">
                {['Features', 'How it works', 'Security', 'Pricing'].map((item, i) => (
                  <a key={i} href={`#section-${i}`} className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] hover:text-white/70 transition-colors">
                    {item}
                  </a>
                ))}
              </nav>

              <Link href={user ? "/" : "/lib/auth"}>
                <Button className="rounded-xl font-bold text-[10px] uppercase tracking-[0.12em] px-6 h-11 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-lg shadow-amber-500/20">
                  {user && profile ? "DASHBOARD" : "TANGIRA"}
                  <ArrowRight size={14} className="ml-2" />
                </Button>
              </Link>
            </Container>
          </header>

          <section className="relative pt-32 md:pt-48 pb-20 md:pb-40 overflow-hidden">
            <Container className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="space-y-8 lp-fade-left lp-visible">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-amber-500/15 bg-amber-500/[0.06]">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-amber-400/80 uppercase tracking-[0.2em]">Real-Time Smart Transport</span>
                </div>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.88]">
                  SMART<br />
                  <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-transparent">URBAN</span><br />
                  <span className="text-white/60">TRAVEL.</span>
                </h1>

                <p className="text-base md:text-lg text-white/30 max-w-md leading-relaxed">
                  Uburyo bwizewe bwo kugenda mu mujyi. Tanga umushoferi wizewe, menya igiciro mbere y'urugendo, kandi wishyure mu buryo bworoshye.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href={user ? "/" : "/lib/auth"} className="flex-1">
                    <div className="py-4 md:py-5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 text-white text-center font-bold text-sm uppercase tracking-widest shadow-xl shadow-amber-500/20">
                      SHAKA URUGENDO
                    </div>
                  </Link>
                  <Link href={user ? "/" : "/lib/auth"} className="flex-1">
                    <div className="py-4 md:py-5 rounded-2xl border-2 border-white/[0.08] text-white/60 text-center font-bold text-sm uppercase tracking-widest hover:text-white transition-all">
                      BA UMUSHOFERI
                    </div>
                  </Link>
                </div>
              </div>

              <div className="relative lp-fade-right lp-visible">
                <div className="relative aspect-square md:aspect-[4/5] rounded-[2.5rem] overflow-hidden border border-white/[0.06] bg-gradient-to-br from-amber-900/30 to-[#0d1520]">
                  <div className="absolute inset-0 flex items-center justify-center p-12">
                    <Image src={LOGO_URL} alt="MUTAMBUKE" width={320} height={320} className="object-contain lp-float" />
                  </div>
                </div>
              </div>
            </Container>
          </section>

          <footer className="py-16 border-t border-white/[0.04]">
            <Container className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-3">
                <Image src={LOGO_URL} alt="MUTAMBUKE" width={36} height={36} className="object-contain" />
                <span className="font-bold text-base tracking-tight">MUTAMBUKE</span>
              </div>
              <p className="text-[10px] font-bold text-white/10 uppercase tracking-[0.2em]">
                © 2024 MUTAMBUKE TRANSPORT SYSTEM. UBUGENGANZIRA BWITE BURARINZWE.
              </p>
              <Select value={lang} onValueChange={(v) => setLang(v as Language)}>
                <SelectTrigger className="w-[150px] h-10 rounded-xl bg-white/[0.08] border-white/[0.1] text-white/40 text-[10px] font-bold uppercase tracking-widest">
                  <Globe size={14} className="mr-2 text-amber-400" />
                  <SelectValue placeholder="Ururimi" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-700 bg-[#0a0f1a] text-white">
                  <SelectItem value="rw">Kinyarwanda</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </Container>
          </footer>
        </div>
      </div>
    </>
  );
}