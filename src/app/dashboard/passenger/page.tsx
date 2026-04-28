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
  LocateFixed,
  Star,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { collection, doc, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { translations, Language } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = "AIzaSyBYd7EGaMpDouB0Br1yUSwRarQeToFuiiA";

const containerStyle = {
  width: "100%",
  height: "100vh",
};

const kigaliCenter = { lat: -1.9441, lng: 30.0619 };

export default function PassengerDashboard() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [pickup, setPickup] = useState('My Current Location');
  const [destination, setDestination] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<'moto' | 'taxi'>('moto');
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
      where('vehicleType', '==', vehicleTypeFilter)
    );
  }, [db, vehicleTypeFilter]);
  const { data: availableDrivers } = useCollection(ridersQuery);

  const lang = (userProfile?.language as Language) || 'rw';
  const t = translations[lang];

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/landing');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPassengerLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => console.log("Using default Kigali center"),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  async function handleRequestRide() {
    if (!db || !user || !destination) return;
    setIsRequesting(true);
    
    try {
      const rideId = doc(collection(db, 'rides')).id;
      const rideData = {
        rideId,
        passengerId: user.uid,
        passengerName: userProfile?.name || 'Passenger',
        passengerPhone: userProfile?.phone || '',
        pickupLocation: pickup,
        destination: destination,
        status: 'requested',
        vehicleType: vehicleTypeFilter,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'rides', rideId), rideData);
      toast({
        title: t.searching,
        description: "Connecting you to MUTAMBUKE network...",
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsRequesting(false);
    }
  }

  async function handleLogout() {
    if (auth) {
      await signOut(auth);
      router.replace('/landing');
    }
  }

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="size-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userProfile) return null;

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 relative flex flex-col font-body">
      {/* Background Map */}
      <div className="absolute inset-0 z-0">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={passengerLocation}
            zoom={14}
            options={{
              disableDefaultUI: true,
              styles: [
                { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
              ]
            }}
          >
            <Marker 
              position={passengerLocation} 
              icon={{
                url: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
                scaledSize: { width: 40, height: 40 } as any
              }}
            />
            {availableDrivers?.map((driver) => (
              <Marker
                key={driver.id}
                position={driver.currentLocation || passengerLocation}
                icon={{
                  url: driver.vehicleType === 'moto' 
                    ? 'https://cdn-icons-png.flaticon.com/512/3194/3194514.png' 
                    : 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png',
                  scaledSize: { width: 45, height: 45 } as any
                }}
              />
            ))}
          </GoogleMap>
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Loader2 className="size-12 animate-spin text-primary" />
          </div>
        )}
        <div className="absolute inset-0 pointer-events-none map-gradient-overlay" />
      </div>

      {/* Header / Menu Toggle */}
      <header className="absolute top-6 left-6 right-6 z-50 flex items-center justify-between">
        <Button 
          variant="secondary" 
          size="icon" 
          className="size-14 rounded-2xl shadow-xl glass-panel text-primary hover:scale-105 active:scale-95 transition-all"
          onClick={() => setIsMenuOpen(true)}
        >
          <Menu className="size-6" />
        </Button>
        <div className="glass-panel px-6 py-3 rounded-2xl flex items-center gap-3 shadow-xl">
          <div className="size-8 rounded-full bg-secondary flex items-center justify-center text-white">
            <User className="size-4" />
          </div>
          <p className="font-black text-sm uppercase tracking-tighter text-primary">{userProfile.name}</p>
        </div>
      </header>

      {/* Floating Search Panel */}
      <main className="absolute top-24 left-6 right-6 z-40 max-w-xl mx-auto space-y-4">
        <div className="glass-panel p-6 rounded-[2rem] shadow-3xl space-y-4 animate-in slide-in-from-top-4 duration-500">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 size-2 bg-secondary rounded-full shadow-[0_0_10px_#22c55e]" />
            <Input 
              value={pickup}
              readOnly
              className="h-14 pl-10 border-none bg-slate-50 rounded-xl font-bold text-slate-900" 
            />
          </div>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 size-2 bg-primary rounded-full shadow-[0_0_10px_#0f172a]" />
            <Input 
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={t.destination}
              className="h-14 pl-10 border-none bg-slate-50 rounded-xl font-bold text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary/20" 
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-slate-300" />
          </div>
        </div>

        {/* Vehicle Choice */}
        <div className="flex gap-4 animate-in slide-in-from-top-6 duration-700">
          <Button 
            onClick={() => setVehicleTypeFilter('moto')}
            className={`flex-1 h-20 rounded-2xl flex items-center justify-center gap-3 font-black uppercase italic transition-all shadow-xl ${vehicleTypeFilter === 'moto' ? 'bg-primary text-white scale-105' : 'glass-panel text-primary'}`}
          >
            <Bike className="size-6" /> {t.moto}
          </Button>
          <Button 
            onClick={() => setVehicleTypeFilter('taxi')}
            className={`flex-1 h-20 rounded-2xl flex items-center justify-center gap-3 font-black uppercase italic transition-all shadow-xl ${vehicleTypeFilter === 'taxi' ? 'bg-primary text-white scale-105' : 'glass-panel text-primary'}`}
          >
            <CarIcon className="size-6" /> {t.taxi}
          </Button>
        </div>
      </main>

      {/* Bottom Action Button */}
      <footer className="absolute bottom-10 left-6 right-6 z-40 max-w-xl mx-auto">
        <Button 
          onClick={handleRequestRide}
          disabled={!destination || isRequesting}
          className="w-full h-20 rounded-3xl bg-secondary hover:bg-secondary/90 text-white text-2xl font-black italic uppercase tracking-tighter shadow-3xl transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isRequesting ? <Loader2 className="size-8 animate-spin" /> : t.findRide}
        </Button>
      </footer>

      {/* Sidebar Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-primary/20 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="absolute top-0 left-0 bottom-0 w-80 bg-white shadow-2xl animate-in slide-in-from-left duration-500 flex flex-col">
            <div className="p-8 border-b flex justify-between items-center">
              <h2 className="text-2xl font-black italic tracking-tighter text-primary uppercase">MUTAMBUKE</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                <X className="size-6" />
              </Button>
            </div>
            
            <div className="flex-1 p-6 space-y-4">
              <Button 
                variant="ghost" 
                className="w-full h-14 justify-start gap-4 rounded-xl font-black uppercase text-xs tracking-widest text-slate-600 hover:text-primary hover:bg-slate-50"
                onClick={() => { setActiveTab('map'); setIsMenuOpen(false); }}
              >
                <Navigation className="size-5" /> UMUGENZI
              </Button>
              <Button 
                variant="ghost" 
                className="w-full h-14 justify-start gap-4 rounded-xl font-black uppercase text-xs tracking-widest text-slate-600 hover:text-primary hover:bg-slate-50"
                onClick={() => { setActiveTab('history'); setIsMenuOpen(false); }}
              >
                <History className="size-5" /> IBYATAMBUTSE
              </Button>
              <Button 
                variant="ghost" 
                className="w-full h-14 justify-start gap-4 rounded-xl font-black uppercase text-xs tracking-widest text-slate-600 hover:text-primary hover:bg-slate-50"
                onClick={() => { setActiveTab('profile'); setIsMenuOpen(false); }}
              >
                <UserCircle className="size-5" /> UMWIRONDORO
              </Button>
            </div>

            <div className="p-8 border-t space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                 <div className="size-10 rounded-full bg-secondary flex items-center justify-center text-white font-bold">
                    <Star className="size-5 fill-white" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Rating</p>
                    <p className="text-lg font-black text-primary italic">4.9/5.0</p>
                 </div>
              </div>
              <Button 
                onClick={handleLogout}
                className="w-full h-16 rounded-2xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white font-black uppercase italic tracking-tighter transition-all"
              >
                <LogOut className="size-5 mr-3" /> {t.logout}
              </Button>
            </div>
          </div>
          <div className="flex-1 cursor-pointer" onClick={() => setIsMenuOpen(false)} />
        </div>
      )}

      {/* Tab Content Overlays */}
      {activeTab === 'profile' && (
        <div className="fixed inset-0 z-50 bg-white animate-in slide-in-from-bottom duration-500 overflow-y-auto no-scrollbar">
          <div className="max-w-xl mx-auto p-8 pt-16 space-y-12">
            <div className="flex items-center justify-between">
               <h2 className="text-4xl font-black italic uppercase tracking-tighter text-primary">PROFILE</h2>
               <Button variant="outline" size="icon" className="rounded-2xl" onClick={() => setActiveTab('map')}>
                 <X className="size-6" />
               </Button>
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="size-40 rounded-[3rem] bg-slate-100 flex items-center justify-center text-slate-300 relative shadow-2xl border-4 border-white">
                <UserCircle className="size-24" />
                <div className="absolute bottom-2 right-2 size-10 bg-secondary rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <Star className="size-5 fill-white" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-3xl font-black italic uppercase text-primary">{userProfile.name}</h3>
                <p className="font-bold text-slate-400 uppercase tracking-[0.3em] text-xs">GOLD MEMBER</p>
              </div>
            </div>

            <div className="space-y-4">
               <div className="bg-slate-50 p-6 rounded-3xl flex items-center justify-between">
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</p>
                     <p className="text-lg font-bold text-primary">{userProfile.phone}</p>
                  </div>
                  <ChevronRight className="text-slate-200" />
               </div>
               <div className="bg-slate-50 p-6 rounded-3xl flex items-center justify-between">
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Language</p>
                     <p className="text-lg font-bold text-primary uppercase">{userProfile.language}</p>
                  </div>
                  <ChevronRight className="text-slate-200" />
               </div>
            </div>

            <Button onClick={handleLogout} className="w-full h-20 rounded-3xl bg-red-600 hover:bg-red-700 text-white text-xl font-black uppercase italic tracking-tighter shadow-2xl transition-all">
               <LogOut className="size-6 mr-3" /> {t.logout}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}