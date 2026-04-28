
'use client';

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { ShieldCheck, Clock, MapPin, Star, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/firebase";

export default function LandingPage() {
  const { user } = useUser();
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-moto');
  const logo = PlaceHolderImages.find(img => img.id === 'logo');

  return (
    <div className="flex flex-col min-h-screen font-body bg-white overflow-x-hidden">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b">
        <Container className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-2 font-black text-2xl text-primary italic tracking-tighter">
            <div className="relative w-10 h-10">
               {logo && <Image src={logo.imageUrl} alt="Logo" fill className="object-contain rounded-xl" />}
            </div>
            <span>MUTAMBUKE</span>
          </div>
          <Link href={user ? "/" : "/auth"}>
            <Button size="sm" className="rounded-full bg-slate-900 hover:bg-slate-800 text-white font-black px-6 h-12 uppercase italic text-xs tracking-widest shadow-lg active:scale-95 transition-all">
              {user ? "DASHBOARD" : "GET STARTED"}
            </Button>
          </Link>
        </Container>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-32 pb-12 md:pt-48 md:pb-24">
          <Container className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-700">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                  <Star className="size-3 fill-primary" /> REAL-TIME SMART TRANSPORT
                </div>
                <h1 className="text-7xl font-black tracking-tighter text-slate-900 leading-[0.85] md:text-9xl italic uppercase">
                  SMART <br /> <span className="text-secondary">URBAN</span> <br /> TRAVEL.
                </h1>
                <p className="text-xl text-slate-500 max-w-md font-medium italic">
                  Experience the fastest way to navigate the city. Reliable riders, transparent pricing, and instant bookings.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href={user ? "/" : "/auth"} className="flex-1">
                  <Button size="lg" className="w-full rounded-[1.5rem] h-20 bg-primary hover:bg-primary/90 text-white text-2xl font-black shadow-2xl uppercase italic tracking-tighter active:scale-95 transition-all group">
                    BOOK RIDE <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href={user ? "/" : "/auth"} className="flex-1">
                  <Button size="lg" variant="outline" className="w-full rounded-[1.5rem] h-20 border-2 border-slate-100 text-2xl font-black hover:bg-slate-50 uppercase italic tracking-tighter active:scale-95 transition-all">
                    BECOME RIDER
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative aspect-square md:aspect-[4/5] rounded-[3.5rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-700 border-[12px] border-white ring-1 ring-slate-100">
              {heroImage && (
                <Image
                  src={heroImage.imageUrl}
                  alt={heroImage.description}
                  fill
                  className="object-cover"
                  priority
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
              <div className="absolute bottom-10 left-10 right-10 text-white">
                <div className="flex gap-4">
                  <div className="bg-white/10 backdrop-blur-2xl p-6 rounded-[2rem] flex-1 border border-white/20">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Active Riders</p>
                    <p className="text-3xl font-black italic">2.4k+</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-2xl p-6 rounded-[2rem] flex-1 border border-white/20">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Response</p>
                    <p className="text-3xl font-black italic">3 min</p>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Features */}
        <section className="py-32 bg-slate-50">
          <Container>
            <div className="text-center mb-20 space-y-4">
                <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter">WHY MUTAMBUKE?</h2>
                <div className="h-2 w-24 bg-primary mx-auto rounded-full" />
            </div>
            <div className="grid md:grid-cols-3 gap-10">
              {[
                { icon: ShieldCheck, title: "Verified Riders", desc: "Every rider undergoes a strict document verification process.", color: "text-blue-600", bg: "bg-blue-50" },
                { icon: Clock, title: "Instant Pickup", desc: "Get matched with the nearest rider in seconds.", color: "text-orange-500", bg: "bg-orange-50" },
                { icon: MapPin, title: "Live Tracking", desc: "Follow your rider's movement in real-time on the map.", color: "text-green-600", bg: "bg-green-50" }
              ].map((feature, i) => (
                <div key={i} className="bg-white p-10 rounded-[3rem] shadow-sm hover:shadow-2xl transition-all group border border-slate-100 hover:-translate-y-2">
                  <div className={`size-20 rounded-[1.75rem] ${feature.bg} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform ${feature.color}`}>
                    <feature.icon className="size-10" />
                  </div>
                  <h3 className="text-2xl font-black mb-4 uppercase italic tracking-tighter">{feature.title}</h3>
                  <p className="text-slate-500 leading-relaxed font-medium italic">{feature.desc}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      </main>

      <footer className="py-16 border-t bg-white">
        <Container className="text-center space-y-8">
          <div className="flex items-center justify-center gap-2 font-black text-2xl text-slate-300 italic grayscale opacity-50">
            <div className="relative w-8 h-8">
               {logo && <Image src={logo.imageUrl} alt="Logo" fill className="object-contain" />}
            </div>
            <span>MUTAMBUKE</span>
          </div>
          <p className="text-slate-400 text-[10px] font-black italic tracking-[0.4em] uppercase">
            © 2024 MUTAMBUKE TRANSPORT SYSTEM. ALL RIGHTS RESERVED.
          </p>
        </Container>
      </footer>
    </div>
  );
}
