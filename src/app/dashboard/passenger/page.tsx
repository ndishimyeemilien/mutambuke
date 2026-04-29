'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  MapPin, User, LogOut, Loader2, Navigation, Bike, Car as CarIcon,
  Menu, X, Star, Phone, Heart, ShieldCheck, Map as MapIcon,
  Mail, Calendar, Settings, Bell, ChevronRight, History,
  UserCircle, Clock, Route, Search, Layers, Zap, CheckCircle2,
  MessageCircle, Share2, ArrowRight, MapPinned, CircleDot,
  Minus, Plus, Compass, Satellite, Sun, Moon
} from 'lucide-react';
import { collection, doc, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { translations, Language } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const GOOGLE_MAPS_API_KEY = "AIzaSyBYd7EGaMpDouB0Br1yUSwRarQeToFuiiA";
const kigaliCenter = { lat: -1.9441, lng: 30.0619 };

const animStyles = `
@keyframes orbDrift {
  0%,100%{transform:translate(0,0) scale(1)}
  33%{transform:translate(25px,-35px) scale(1.08)}
  66%{transform:translate(-18px,28px) scale(.94)}
}
@keyframes fadeUp {
  from{opacity:0;transform:translateY(18px)}
  to{opacity:1;transform:translateY(0)}
}
@keyframes spin {to{transform:rotate(360deg)}}
.anim-fade-up {animation:fadeUp .55s cubic-bezier(.22,1,.36,1) forwards}
`;

export default function PassengerDashboard() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const logo = PlaceHolderImages.find(img => img.id === 'logo');

  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'history'>('home');
  const [isRequesting, setIsRequesting] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<'moto' | 'taxi' | null>(null);
  const [passengerLocation, setPassengerLocation] = useState(kigaliCenter);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [rideConfirmed, setRideConfirmed] = useState(false);
  const [isNightMode, setIsNightMode] = useState(true);
  const mapRef = useRef<any>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  const { data: userProfile, loading: profileLoading } = useDoc(user ? `users/${user.uid}` : null);

  const ridersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'drivers'),
      where('status', '==', 'online'),
      where('verificationStatus', '==', 'approved')
    );
  }, [db]);
  const { data: availableDrivers } = useCollection(ridersQuery);

  const lang = (userProfile?.language as Language) || 'rw';
  const t = translations[lang];

  const fallbackDrivers = [
    { id: 'd1', name: 'Jean Pierre', phone: '0788123456', vehicleType: 'moto', rating: 4.9, trips: 1240, distance: '0.3 km', photo: 'driver1' },
    { id: 'd2', name: 'Emmanuel Habimana', phone: '0730456789', vehicleType: 'taxi', rating: 4.8, trips: 890, distance: '0.7 km', photo: 'driver2' },
    { id: 'd3', name: 'Patrick Mugisha', phone: '0785987654', vehicleType: 'moto', rating: 4.7, trips: 2100, distance: '1.1 km', photo: 'driver3' },
  ];

  const drivers = (availableDrivers && availableDrivers.length > 0)
    ? availableDrivers.map((d: any, i: number) => ({
        id: d.driverId || d.id,
        name: d.name || fallbackDrivers[i % fallbackDrivers.length]?.name || 'Umushoferi',
        phone: d.phone || fallbackDrivers[i % fallbackDrivers.length]?.phone || '',
        vehicleType: d.vehicleType || 'moto',
        rating: d.rating || 4.8,
        trips: d.trips || 500,
        distance: d.distance || `${(Math.random() * 2 + 0.2).toFixed(1)} km`,
        photo: d.photo || `driver${i + 1}`
      }))
    : fallbackDrivers;

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPassengerLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log("Defaulting to Kigali"),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  async function handleQuickRequest(type: 'moto' | 'taxi') {
    if (!db || !user) return;
    setSelectedVehicle(type);
    setIsRequesting(true);
    try {
      const rideId = doc(collection(db, 'rides')).id;
      await setDoc(doc(db, 'rides', rideId), {
        rideId,
        passengerId: user.uid,
        passengerName: userProfile?.name || user.displayName || 'User',
        passengerPhone: userProfile?.phone || user.phoneNumber || '',
        pickupLocation: 'Aho uherereye',
        destination: 'Aho ugana',
        status: 'requested',
        vehicleType: type,
        createdAt: serverTimestamp()
      });
      setRideConfirmed(true);
      toast({ title: "Gushakisha...", description: "MUTAMBUKE irimo gushaka umushoferi..." });
      setTimeout(() => {
        setRideConfirmed(false);
        setSelectedVehicle(null);
      }, 5000);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Ikosa", description: e.message });
    } finally {
      setIsRequesting(false);
    }
  }

  if (authLoading || profileLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#070b14] gap-4">
      <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  const themeClass = isNightMode ? "bg-[#070b14] text-white" : "bg-[#F0F0F4] text-slate-900";
  const cardClass = isNightMode ? "bg-[#0d1520]/80 border-white/[0.06]" : "bg-white border-slate-200 shadow-lg";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animStyles }} />
      <div className={`min-h-screen ${themeClass} font-[Space_Grotesk,sans-serif] overflow-x-hidden relative transition-colors duration-500`}>
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute w-[500px] h-[500px] rounded-full top-[-180px] left-[-120px] opacity-20" style={{ background: 'radial-gradient(circle,#10b981,transparent)', animation: 'orbDrift 22s ease-in-out infinite alternate' }} />
        </div>

        <div className="fixed inset-0 pointer-events-none z-[1] opacity-[0.02]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 256 256\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"n\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.85\" numOctaves=\"4\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23n)\"/%3E%3C/svg%3E')" }} />

        <div className="relative z-[2] flex flex-col min-h-screen">
          <header className={`sticky top-0 z-[60] backdrop-blur-2xl ${isNightMode ? 'bg-[#070b14]/80' : 'bg-white/80'} border-b ${isNightMode ? 'border-white/[0.04]' : 'border-slate-200'}`}>
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
                <div className="relative w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center overflow-hidden">
                  {logo ? <Image src={logo.imageUrl} alt="Logo" fill className="object-cover" /> : <span className="text-white font-black">M</span>}
                </div>
                <span className="font-mono font-extrabold text-lg tracking-tight hidden sm:block">MUTAMBUKE</span>
              </div>

              <nav className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-black/5">
                {[
                  { id: 'home' as const, label: 'UMUGENZI', icon: Navigation },
                  { id: 'history' as const, label: 'IBYATAMBUTSE', icon: History },
                  { id: 'profile' as const, label: 'UMWIRONDORO', icon: UserCircle }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all ${activeTab === item.id
                      ? 'bg-emerald-500 text-white shadow-lg'
                      : 'text-white/40 hover:text-emerald-400'
                    }`}
                  >
                    <item.icon size={13} />
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="flex items-center gap-2">
                <button onClick={() => setIsNightMode(!isNightMode)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isNightMode ? 'bg-white/5 text-yellow-400' : 'bg-black/5 text-blue-600'}`}>
                  {isNightMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button onClick={() => setIsMenuOpen(true)} className="md:hidden w-9 h-9 rounded-xl bg-black/5 flex items-center justify-center">
                  <Menu size={18} />
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-6xl w-full mx-auto px-4 pb-8 pt-5">
            {activeTab === 'home' && (
              <div className="space-y-5 anim-fade-up">
                <div className={`relative h-[380px] md:h-[480px] rounded-[2rem] overflow-hidden border ${isNightMode ? 'border-white/[0.06]' : 'border-slate-200'} shadow-2xl`}>
                  {isLoaded ? (
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={passengerLocation}
                      zoom={15}
                      mapTypeId={mapType}
                      options={{
                        disableDefaultUI: true,
                        styles: isNightMode ? [
                          { elementType: 'geometry', stylers: [{ color: '#0d1520' }] },
                          { elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
                          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2332' }] },
                          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c1929' }] },
                        ] : []
                      }}
                      onLoad={(map) => { mapRef.current = map; }}
                    >
                      <Marker position={passengerLocation} icon={{ url: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', scaledSize: { width: 40, height: 40 } as any }} />
                    </GoogleMap>
                  ) : <div className="h-full w-full bg-slate-200 animate-pulse" />}

                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <button onClick={() => setMapType(mapType === 'roadmap' ? 'satellite' : 'roadmap')} className="w-10 h-10 rounded-xl bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg"><Satellite size={16} /></button>
                    <button onClick={() => mapRef.current?.setCenter(passengerLocation)} className="w-10 h-10 rounded-xl bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg"><Compass size={16} /></button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => handleQuickRequest('moto')} disabled={isRequesting} className={`h-32 rounded-[2rem] border-2 transition-all flex flex-col items-center justify-center gap-2 ${isNightMode ? 'bg-[#1a2332] border-white/5' : 'bg-white border-slate-100 shadow-xl'}`}>
                    <Bike size={40} className="text-amber-500" />
                    <span className="font-black italic uppercase tracking-tighter">SABA MOTO</span>
                  </button>
                  <button onClick={() => handleQuickRequest('taxi')} disabled={isRequesting} className={`h-32 rounded-[2rem] border-2 transition-all flex flex-col items-center justify-center gap-2 ${isNightMode ? 'bg-[#1a2332] border-white/5' : 'bg-white border-slate-100 shadow-xl'}`}>
                    <CarIcon size={40} className="text-blue-500" />
                    <span className="font-black italic uppercase tracking-tighter">SABA TAXI</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 px-2">Abashoferi bari hafi</h3>
                  <div className="space-y-3">
                    {drivers.slice(0, 5).map((d: any) => (
                      <div key={d.id} className={`p-4 rounded-[1.75rem] flex items-center gap-4 border transition-all ${isNightMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <div className="size-12 rounded-2xl overflow-hidden bg-slate-200">
                          <img src={`https://picsum.photos/seed/${d.id}/200`} className="size-full object-cover" alt="" />
                        </div>
                        <div className="flex-1">
                          <p className="font-black uppercase text-sm">{d.name}</p>
                          <div className="flex items-center gap-2">
                            <Star size={10} className="text-yellow-500 fill-yellow-500" />
                            <span className="text-[10px] font-bold">{d.rating} • {d.vehicleType.toUpperCase()}</span>
                          </div>
                        </div>
                        <a href={`tel:${d.phone}`} className="size-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg"><Phone size={18} /></a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6 anim-fade-up">
                <div className={`p-8 rounded-[2.5rem] border ${cardClass} text-center`}>
                  <div className="size-24 rounded-[2rem] overflow-hidden mx-auto mb-4 border-4 border-emerald-500/20">
                    <img src={`https://picsum.photos/seed/${user?.uid}/400`} className="size-full object-cover" alt="" />
                  </div>
                  <h2 className="text-2xl font-black italic uppercase">{userProfile?.name || 'Umukoresha'}</h2>
                  <p className="text-xs font-bold text-white/30 uppercase tracking-widest">{userProfile?.phone}</p>
                </div>

                <div className="grid gap-3">
                  {[
                    { label: 'Imeyili', value: userProfile?.email, icon: Mail },
                    { label: 'Telefone', value: userProfile?.phone, icon: Phone },
                    { label: 'Umutekano', value: 'Yemejwe neza', icon: ShieldCheck },
                  ].map((item, i) => (
                    <div key={i} className={`p-4 rounded-2xl border ${cardClass} flex items-center gap-4`}>
                      <item.icon size={20} className="text-emerald-500" />
                      <div>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{item.label}</p>
                        <p className="font-bold text-sm">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button onClick={() => signOut(auth!)} variant="destructive" className="w-full h-16 rounded-2xl text-lg font-black italic uppercase shadow-2xl">
                  <LogOut className="mr-2" /> {t.logout || 'Gusohoka'}
                </Button>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="py-20 text-center space-y-4 anim-fade-up">
                <div className="size-20 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center mx-auto"><History size={40} className="text-white/10" /></div>
                <h3 className="text-xl font-black italic uppercase">Nta mateka arimo</h3>
                <p className="text-sm text-white/30">Ingendo zawe zizagaragara hano.</p>
              </div>
            )}
          </main>

          {isMenuOpen && (
            <div className="fixed inset-0 z-[100] flex">
              <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
              <div className={`w-72 ${isNightMode ? 'bg-[#0a0f1a]' : 'bg-white'} p-6 flex flex-col gap-6 shadow-2xl`}>
                <div className="flex justify-between items-center">
                  <span className="font-black italic uppercase">MUTAMBUKE</span>
                  <button onClick={() => setIsMenuOpen(false)}><X /></button>
                </div>
                <nav className="flex flex-col gap-2">
                  {[
                    { id: 'home' as const, label: 'UMUGENZI' },
                    { id: 'history' as const, label: 'IBYATAMBUTSE' },
                    { id: 'profile' as const, label: 'UMWIRONDORO' }
                  ].map(item => (
                    <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }} className={`p-4 rounded-xl font-black text-left uppercase text-xs tracking-widest ${activeTab === item.id ? 'bg-emerald-500 text-white' : 'hover:bg-emerald-500/10'}`}>{item.label}</button>
                  ))}
                </nav>
                <div className="mt-auto">
                  <Button onClick={() => signOut(auth!)} variant="destructive" className="w-full h-14 rounded-xl font-black uppercase italic tracking-tighter"><LogOut size={16} className="mr-2" /> Gusohoka</Button>
                </div>
              </div>
            </div>
          )}

          <nav className={`md:hidden sticky bottom-0 z-[50] ${isNightMode ? 'bg-[#070b14]/95' : 'bg-white/95'} backdrop-blur-2xl border-t ${isNightMode ? 'border-white/[0.04]' : 'border-slate-200'} flex justify-around py-3 pb-6`}>
            {[
              { id: 'home' as const, icon: Navigation, label: 'UMUGENZI' },
              { id: 'history' as const, icon: History, label: 'IBYATAMBUTSE' },
              { id: 'profile' as const, icon: UserCircle, label: 'UMWIRONDORO' },
            ].map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 ${activeTab === item.id ? 'text-emerald-500' : 'text-white/20'}`}>
                <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 1.5} />
                <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
