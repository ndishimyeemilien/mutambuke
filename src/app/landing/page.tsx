'use client';

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { ShieldCheck, Clock, MapPin, Star } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/firebase";

export default function LandingPage() {
  const { user } = useUser();
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-moto');
  const logo = PlaceHolderImages.find(img => img.id === 'logo');

  return (
    <div className="flex flex-col min-h-screen font-body bg-white">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b">
        <Container className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-2 font-black text-2xl text-primary italic">
            <div className="relative w-10 h-10">
               {logo && <Image src={logo.imageUrl} alt="Logo" fill className="object-contain" />}
            </div>
            <span>MUTAMBUKE</span>
          </div>
          <Link href={user ? "/" : "/auth"}>
            <Button size="sm" className="rounded-full bg-secondary hover:bg-secondary/90 text-white font-bold px-8 h-12">
              {user ? "DASHBOARD" : "GET STARTED"}
            </Button>
          </Link>
        </Container>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-32 pb-12 md:pt-40 md:pb-24">
          <Container className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
                  <Star className="size-3" /> Real-time Moto Hailing
                </div>
                <h1 className="text-6xl font-black tracking-tight text-slate-900 leading-[0.9] md:text-8xl italic uppercase">
                  SMART <br /> <span className="text-secondary">URBAN</span> <br /> TRAVEL.
                </h1>
                <p className="text-lg text-slate-600 max-w-md">
                  Experience the fastest way to navigate the city. Reliable riders, transparent pricing, and instant bookings.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href={user ? "/" : "/auth"} className="flex-1">
                  <Button size="lg" className="w-full rounded-2xl h-16 bg-primary hover:bg-primary/90 text-white text-xl font-black shadow-xl">
                    BOOK RIDE
                  </Button>
                </Link>
                <Link href={user ? "/" : "/auth"} className="flex-1">
                  <Button size="lg" variant="outline" className="w-full rounded-2xl h-16 border-2 text-xl font-black hover:bg-slate-50">
                    BECOME RIDER
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative aspect-square md:aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-700">
              {heroImage && (
                <Image
                  src={heroImage.imageUrl}
                  alt={heroImage.description}
                  fill
                  className="object-cover"
                  priority
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-8 left-8 right-8 text-white">
                <div className="flex gap-4">
                  <div className="bg-white/20 backdrop-blur-lg p-4 rounded-2xl flex-1">
                    <p className="text-xs opacity-80">Active Riders</p>
                    <p className="text-2xl font-black">2.4k+</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-lg p-4 rounded-2xl flex-1">
                    <p className="text-xs opacity-80">Avg. Response</p>
                    <p className="text-2xl font-black">3 min</p>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Features */}
        <section className="py-24 bg-slate-50">
          <Container>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: ShieldCheck, title: "Verified Riders", desc: "Every rider undergoes a strict document verification process.", color: "text-blue-600" },
                { icon: Clock, title: "Instant Pickup", desc: "Get matched with the nearest rider in seconds.", color: "text-orange-500" },
                { icon: MapPin, title: "Live Tracking", desc: "Follow your rider's movement in real-time on the map.", color: "text-green-600" }
              ].map((feature, i) => (
                <div key={i} className="bg-white p-8 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow group">
                  <div className={`size-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${feature.color}`}>
                    <feature.icon className="size-8" />
                  </div>
                  <h3 className="text-xl font-black mb-2 uppercase">{feature.title}</h3>
                  <p className="text-slate-500 leading-relaxed font-medium">{feature.desc}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      </main>

      <footer className="py-12 border-t">
        <Container className="text-center text-slate-400 text-sm font-black italic tracking-widest uppercase">
          <p>© 2024 MUTAMBUKE TRANSPORT SYSTEM. ALL RIGHTS RESERVED.</p>
        </Container>
      </footer>
    </div>
  );
}
