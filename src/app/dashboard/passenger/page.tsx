
'use client';

import React, { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MapPin, 
  User, 
  LogOut, 
  Loader2, 
  Navigation, 
  Bike, 
  Car as CarIcon, 
  Search,
  History,
  UserCircle,
  Menu,
  X,
  Star,
  Phone,
  Heart,
  ShieldCheck,
  Layers,
  Map as MapIcon,
  Moon,
  Sun
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

export default function PassengerDashboard() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const logo = PlaceHolderImages.find(img => img.id === 'logo');

  const [pickup, setPickup] = useState('Current Location');
  const [destination, setDestination] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [vehicleType, setVehicleType] = useState<'moto' | 'taxi'>('moto');
  const [passengerLocation, setPassengerLocation] = useState(kigaliCenter);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

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

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPassengerLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log("Defaulting to Kigali"),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  async function handleRequestRide() {
    if (!db || !user || !destination) return;
    setIsRequesting(true);
    try {
      const rideId = doc(collection(db, 'rides')).id;
      await setDoc(doc(db, 'rides', rideId), {
        rideId, passengerId: user.uid, passengerName: userProfile?.name,
        passengerPhone: userProfile?.phone, pickupLocation: pickup,
        destination, status: 'requested', vehicleType, createdAt: serverTimestamp()
      });
      toast({ title: t.searching, description: "Connecting to MUTAMBUKE network..." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsRequesting(false);
    }
  }

  if (authLoading || profileLoading) return (
    <div className="h-screen flex items-center justify-center bg-[#0F172A]">
      <Loader2 className="size-10 animate-spin text-secondary" />
    </div>
  );

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col font-body overflow-x-hidden pb-10 transition-colors duration-500 ${isDark ? 'bg-black' : 'bg-[#F0F0F4]'}`}>
      {/* HEADER NAVIGATION */}
      <header className={`sticky top-0 z-[60] backdrop-blur-md p-6 flex items-center justify-between border-b transition-colors ${isDark ? 'bg-black/95 border-white/5' : 'bg-white/90 border-slate-200'}`}>
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              {logo && <Image src={logo.imageUrl} alt="Logo" fill className="object-contain" />}
            </div>
            <h1 className={`text-2xl font-black italic tracking-tighter uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>MUTAMBUKE</h1>
          </div>
          <nav className="hidden md:flex items-center gap-8">
             {['UMUGENZI', 'IBYATAMBUTSE', 'IGISOBANURO', 'CONTACT', 'UMWIRONDORO'].map((link) => (
               <button key={link} className={`text-[10px] font-black tracking-[0.2em] transition-colors uppercase ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                 {link}
               </button>
             ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
           <Button 
             onClick={() => setTheme(isDark ? 'light' : 'dark')} 
             variant="ghost" 
             className={`size-12 rounded-2xl transition-colors ${isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-900'}`}
           >
              {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
           </Button>
           <Button onClick={() => setIsMenuOpen(true)} variant="ghost" className={`size-12 rounded-2xl md:hidden ${isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-900'}`}>
              <Menu className="size-6" />
           </Button>
           <div className={`px-5 py-2.5 rounded-2xl flex items-center gap-3 border transition-colors ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'}`}>
              <User className="size-4 text-secondary" />
              <span className="font-bold text-xs uppercase tracking-tighter">{userProfile?.name}</span>
           </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        {/* MAP SECTION */}
        <div className={`relative h-[400px] md:h-[500px] w-full rounded-[2.5rem] overflow-hidden shadow-2xl border-4 transition-colors ${isDark ? 'border-white/5 bg-slate-900' : 'border-white bg-slate-200'}`}>
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={passengerLocation}
              zoom={15}
              mapTypeId={mapType}
              options={{ disableDefaultUI: true }}
            >
              <Marker position={passengerLocation} icon={{ url: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', scaledSize: { width: 40, height: 40 } as any }} />
              {availableDrivers?.map((d: any) => (
                <Marker key={d.id} position={d.currentLocation || passengerLocation} icon={{ url: d.vehicleType === 'moto' ? 'https://cdn-icons-png.flaticon.com/512/3194/3194514.png' : 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png', scaledSize: { width: 45, height: 45 } as any }} />
              ))}
            </GoogleMap>
          ) : <div className="h-full w-full bg-slate-800 animate-pulse" />}
          
          {/* MAP CONTROLS */}
          <div className="absolute top-6 right-6 flex items-center gap-2 bg-white p-1 rounded-2xl shadow-2xl">
            <Button 
              size="sm" 
              onClick={() => setMapType('roadmap')}
              className={`h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${mapType === 'roadmap' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-slate-100'}`}
            >
              <MapIcon className="size-3 mr-2" /> Map
            </Button>
            <Button 
              size="sm" 
              onClick={() => setMapType('hybrid')}
              className={`h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${mapType === 'hybrid' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-slate-100'}`}
            >
              <Layers className="size-3 mr-2" /> Hybrid
            </Button>
            <Button 
              size="sm" 
              onClick={() => setMapType('satellite')}
              className={`h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${mapType === 'satellite' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-slate-100'}`}
            >
              <Layers className="size-3 mr-2" /> Satellite
            </Button>
          </div>
        </div>

        {/* NEARBY DRIVERS LIST */}
        <section className="space-y-4 pt-4">
           <div className="flex items-center justify-between px-2">
              <h3 className={`text-xl font-black italic uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>Abashoferi bari hafi</h3>
              <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${isDark ? 'text-secondary bg-secondary/10' : 'text-secondary bg-secondary/20'}`}>
                {availableDrivers?.length || 0} bari hafi
              </span>
           </div>

           <div className="grid gap-3">
              {availableDrivers?.map((driver: any) => (
                <div key={driver.driverId} className={`group relative border rounded-full p-4 flex items-center justify-between transition-all duration-300 shadow-xl hover:scale-[1.01] active:scale-[0.99] ${isDark ? 'bg-[#1A1A1A] hover:bg-[#222222] border-white/5' : 'bg-white hover:bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <Avatar className={`size-14 border-2 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                        <AvatarImage src={`https://picsum.photos/seed/${driver.driverId}/200`} />
                        <AvatarFallback className="bg-slate-800 text-white"><User /></AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 bg-[#22C55E] text-white p-1 rounded-full border-2 border-black">
                        <ShieldCheck className="size-3" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h4 className={`text-lg font-black italic leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>{driver.name || 'Umushoferi'}</h4>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-slate-500'}`}>{driver.vehicleType === 'moto' ? 'MOTORCYCLE' : 'CAR'}</span>
                        <div className="flex items-center gap-1 text-[#FACC15]">
                          <span className="text-xs font-black">4.8</span>
                          <Star className="size-3 fill-current" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 pr-2">
                    <Button variant="ghost" size="icon" className={`size-12 rounded-full transition-all ${isDark ? 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10' : 'bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-200'}`}>
                       <Heart className="size-5" />
                    </Button>
                    <a href={`tel:${driver.phone || '0780000000'}`}>
                      <Button size="icon" className={`size-12 rounded-full shadow-xl transition-all ${isDark ? 'bg-white text-black hover:bg-white/90' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                         <Phone className="size-5" />
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
              
              {(!availableDrivers || availableDrivers.length === 0) && (
                <div className={`py-20 text-center space-y-4 rounded-[3rem] border-2 border-dashed ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                  <Navigation className="size-12 mx-auto text-slate-400 animate-pulse" />
                  <p className={`font-black italic uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Nta mushoferi uri hafi muri uyu mwanya</p>
                </div>
              )}
           </div>
        </section>

        {/* REQUEST SECTION */}
        <section className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] p-8 md:p-12 rounded-[3rem] shadow-3xl space-y-8 border border-white/5">
           <div className="space-y-2">
             <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white">Urerekeza he?</h2>
             <p className="text-white/40 font-medium italic">Saba urugendo mu masegonda make kuri MUTAMBUKE.</p>
           </div>

           <div className="grid md:grid-cols-2 gap-6">
              <div className="relative">
                <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 size-5 text-secondary" />
                <Input value={pickup} onChange={(e) => setPickup(e.target.value)} className="h-20 pl-16 rounded-3xl bg-black/40 border-white/10 text-white font-bold text-lg focus:ring-secondary/20" />
              </div>
              <div className="relative">
                <Navigation className="absolute left-6 top-1/2 -translate-y-1/2 size-5 text-accent" />
                <Input placeholder={t.destination} value={destination} onChange={(e) => setDestination(e.target.value)} className="h-20 pl-16 rounded-3xl bg-black/40 border-white/10 text-white font-bold text-lg focus:ring-accent/20" />
              </div>
           </div>

           <div className="flex flex-col md:flex-row gap-4">
              <Button 
                onClick={() => setVehicleType('moto')}
                className={`flex-1 h-24 rounded-3xl flex items-center justify-center gap-4 text-xl font-black uppercase italic transition-all shadow-xl ${vehicleType === 'moto' ? 'bg-secondary text-white scale-105 ring-4 ring-secondary/20' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
              >
                <Bike className="size-8" /> {t.moto}
              </Button>
              <Button 
                onClick={() => setVehicleType('taxi')}
                className={`flex-1 h-24 rounded-3xl flex items-center justify-center gap-4 text-xl font-black uppercase italic transition-all shadow-xl ${vehicleType === 'taxi' ? 'bg-secondary text-white scale-105 ring-4 ring-secondary/20' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
              >
                <CarIcon className="size-8" /> {t.taxi}
              </Button>
           </div>

           <Button 
             onClick={handleRequestRide}
             disabled={!destination || isRequesting}
             className="w-full h-24 rounded-[2rem] bg-white hover:bg-white/90 text-black text-3xl font-black italic uppercase tracking-tighter shadow-2xl transition-all active:scale-95 disabled:opacity-50"
           >
             {isRequesting ? <Loader2 className="size-10 animate-spin" /> : 'FIND A RIDE'}
           </Button>
        </section>
      </main>

      {/* MOBILE MENU */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl animate-in fade-in duration-300 flex justify-end">
           <div className={`w-80 h-full p-8 space-y-10 animate-in slide-in-from-right duration-500 border-l ${isDark ? 'bg-[#121b24] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8">
                       {logo && <Image src={logo.imageUrl} alt="Logo" fill className="object-contain" />}
                    </div>
                    <h2 className={`text-2xl font-black italic tracking-tighter uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>MUTAMBUKE</h2>
                 </div>
                 <Button variant="ghost" onClick={() => setIsMenuOpen(false)} className={isDark ? 'text-white' : 'text-slate-900'}><X /></Button>
              </div>
              <div className="space-y-4">
                 {['UMUGENZI', 'IBYATAMBUTSE', 'IGISOBANURO', 'CONTACT', 'UMWIRONDORO'].map((link) => (
                   <Button key={link} variant="ghost" className={`w-full h-16 justify-start text-xs font-black tracking-widest uppercase transition-colors ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                     {link}
                   </Button>
                 ))}
              </div>
              <div className="pt-10 border-t border-white/10">
                <Button onClick={() => signOut(auth!)} className="w-full h-16 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-black uppercase italic transition-all">
                   <LogOut className="size-5 mr-3" /> {t.logout}
                </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
