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
  ChevronRight,
  Menu,
  X,
  Star,
  Settings
} from 'lucide-react';
import { collection, doc, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { translations, Language } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = "AIzaSyBYd7EGaMpDouB0Br1yUSwRarQeToFuiiA";
const containerStyle = { width: "100%", height: "100vh" };
const kigaliCenter = { lat: -1.9441, lng: 30.0619 };

export default function PassengerDashboard() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [pickup, setPickup] = useState('Current Location');
  const [destination, setDestination] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [vehicleType, setVehicleType] = useState<'moto' | 'taxi'>('moto');
  const [passengerLocation, setPassengerLocation] = useState(kigaliCenter);
  const [activeTab, setActiveTab] = useState<'map' | 'profile' | 'history'>('map');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
      where('verificationStatus', '==', 'approved'),
      where('vehicleType', '==', vehicleType)
    );
  }, [db, vehicleType]);
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
      toast({ title: t.searching, description: "Searching for nearby riders..." });
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

  return (
    <div className="h-screen w-screen overflow-hidden relative flex flex-col font-body bg-slate-50">
      {/* FULL SCREEN MAP */}
      <div className="absolute inset-0 z-0">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={passengerLocation}
            zoom={15}
            options={{ disableDefaultUI: true, styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }] }}
          >
            <Marker position={passengerLocation} icon={{ url: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', scaledSize: { width: 40, height: 40 } as any }} />
            {availableDrivers?.map((d: any) => (
              <Marker key={d.id} position={d.currentLocation || passengerLocation} icon={{ url: d.vehicleType === 'moto' ? 'https://cdn-icons-png.flaticon.com/512/3194/3194514.png' : 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png', scaledSize: { width: 45, height: 45 } as any }} />
            ))}
          </GoogleMap>
        ) : <div className="h-full w-full bg-slate-200 animate-pulse" />}
        <div className="absolute inset-0 pointer-events-none map-focused-overlay" />
      </div>

      {/* FLOATING HEADER */}
      <header className="absolute top-6 left-6 right-6 z-50 flex items-center justify-between">
        <Button onClick={() => setIsMenuOpen(true)} className="size-14 rounded-2xl bg-[#0F172A] text-white shadow-2xl hover:scale-105 active:scale-95 transition-all">
          <Menu className="size-6" />
        </Button>
        <div className="bg-[#0F172A] px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl text-white">
          <div className="size-8 rounded-full bg-secondary flex items-center justify-center">
            <User className="size-4" />
          </div>
          <span className="font-bold text-sm uppercase">{userProfile?.name}</span>
        </div>
      </header>

      {/* SEARCH CARD */}
      <main className="absolute top-24 left-6 right-6 z-40 max-w-xl mx-auto space-y-4">
        <div className="floating-card p-6 rounded-[2.5rem] space-y-4">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 size-2.5 bg-secondary rounded-full" />
            <Input value={pickup} readOnly className="pill-input pl-12" />
          </div>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 size-2.5 bg-accent rounded-full" />
            <Input 
              placeholder={t.destination} 
              value={destination} 
              onChange={(e) => setDestination(e.target.value)} 
              className="pill-input pl-12" 
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
          </div>
        </div>

        {/* VEHICLE SELECTION */}
        <div className="flex gap-4">
          <Button 
            onClick={() => setVehicleType('moto')}
            className={`flex-1 h-20 rounded-3xl flex items-center justify-center gap-3 font-black uppercase italic transition-all shadow-xl ${vehicleType === 'moto' ? 'bg-[#0F172A] text-white scale-105' : 'bg-white text-[#0F172A] hover:bg-slate-50'}`}
          >
            <Bike className="size-6" /> {t.moto}
          </Button>
          <Button 
            onClick={() => setVehicleType('taxi')}
            className={`flex-1 h-20 rounded-3xl flex items-center justify-center gap-3 font-black uppercase italic transition-all shadow-xl ${vehicleType === 'taxi' ? 'bg-[#0F172A] text-white scale-105' : 'bg-white text-[#0F172A] hover:bg-slate-50'}`}
          >
            <CarIcon className="size-6" /> {t.taxi}
          </Button>
        </div>
      </main>

      {/* REQUEST BUTTON */}
      <footer className="absolute bottom-10 left-6 right-6 z-40 max-w-xl mx-auto">
        <Button 
          onClick={handleRequestRide}
          disabled={!destination || isRequesting}
          className="w-full h-20 rounded-[2rem] bg-secondary hover:bg-secondary/90 text-white text-2xl font-black italic uppercase tracking-tighter shadow-[0_15px_40px_rgba(34,197,94,0.3)] active:scale-[0.98] disabled:opacity-50"
        >
          {isRequesting ? <Loader2 className="size-8 animate-spin" /> : t.findRide}
        </Button>
      </footer>

      {/* MENU OVERLAY */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="absolute top-0 left-0 bottom-0 w-80 bg-white shadow-3xl animate-in slide-in-from-left duration-500 flex flex-col">
            <div className="p-8 flex justify-between items-center border-b">
              <h2 className="text-2xl font-black italic tracking-tighter text-[#0F172A]">MUTAMBUKE</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                <X className="size-6" />
              </Button>
            </div>
            <div className="flex-1 p-6 space-y-4">
              <Button variant="ghost" className="w-full h-16 justify-start gap-4 rounded-2xl font-bold uppercase text-xs tracking-widest text-slate-500 hover:text-[#0F172A] hover:bg-slate-50">
                <Navigation className="size-5" /> Umugenzi
              </Button>
              <Button variant="ghost" className="w-full h-16 justify-start gap-4 rounded-2xl font-bold uppercase text-xs tracking-widest text-slate-500 hover:text-[#0F172A] hover:bg-slate-50">
                <History className="size-5" /> Ingendo
              </Button>
              <Button onClick={() => setActiveTab('profile')} variant="ghost" className="w-full h-16 justify-start gap-4 rounded-2xl font-bold uppercase text-xs tracking-widest text-slate-500 hover:text-[#0F172A] hover:bg-slate-50">
                <UserCircle className="size-5" /> Umwirondoro
              </Button>
            </div>
            <div className="p-8 border-t space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rating</p>
                <div className="flex items-center gap-1 text-[#0F172A] font-black italic">
                  <Star className="size-4 fill-accent text-accent" /> 4.9
                </div>
              </div>
              <Button onClick={() => signOut(auth!)} className="w-full h-16 rounded-2xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white font-black uppercase italic tracking-tighter transition-all">
                <LogOut className="size-5 mr-3" /> {t.logout}
              </Button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsMenuOpen(false)} />
        </div>
      )}
    </div>
  );
}