
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  MapPin, 
  User, 
  LogOut, 
  Loader2, 
  Phone, 
  Navigation, 
  Bike, 
  Car as CarIcon, 
  Search,
  CheckCircle2,
  Clock,
  History,
  Info,
  PhoneCall,
  UserCircle,
  Moon,
  LayoutDashboard,
  FileText,
  BarChart3,
  LocateFixed
} from 'lucide-react';
import { collection, doc, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { translations, Language } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = "AIzaSyBYd7EGaMpDouB0Br1yUSwRarQeToFuiiA";

const containerStyle = {
  width: "100%",
  height: "500px",
};

const kigaliCenter = { lat: -1.9441, lng: 30.0619 };

export default function PassengerDashboard() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [pickup, setPickup] = useState('Aho uherereye');
  const [destination, setDestination] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<'moto' | 'taxi'>('taxi');
  const [passengerLocation, setPassengerLocation] = useState(kigaliCenter);
  const [mapType, setMapType] = useState<google.maps.MapTypeId | string>('roadmap');
  const [activeTab, setActiveTab] = useState('request');

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

  const activeRideQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'rides'),
      where('passengerId', '==', user.uid),
      where('status', 'in', ['requested', 'accepted', 'started'])
    );
  }, [db, user]);
  const { data: activeRides } = useCollection(activeRideQuery);
  const currentRide = activeRides?.[0];

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
        description: "Connecting you to the nearest rider...",
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userProfile) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-body">
      {/* Top Header */}
      <header className="p-4 flex items-center justify-between border-b border-white/5 bg-[#0a0a0a]">
        <div className="flex items-center gap-4">
           {/* Empty spacer to align content */}
        </div>
        <div className="flex items-center gap-6">
           <Button variant="ghost" size="icon" className="text-white/40 hover:text-white">
              <Moon className="size-5" />
           </Button>
           <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-black tracking-widest uppercase">{userProfile.name}</p>
                <p className="text-[10px] text-white/40 font-bold uppercase">{userProfile.role || 'Umugenzi'}</p>
              </div>
              <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-2 border-primary/30">
                 <User className="size-6 text-primary" />
              </div>
           </div>
        </div>
      </header>

      {/* Main Navigation Menu */}
      <nav className="p-6 flex flex-wrap justify-center gap-4">
         <div className="flex bg-[#1a1a1a] p-1.5 rounded-[1.25rem] shadow-2xl border border-white/5">
            <Button variant="ghost" className="rounded-xl h-12 px-6 gap-2 bg-primary text-white font-black italic uppercase text-xs shadow-[0_0_20px_rgba(37,99,235,0.4)]">
               <Navigation className="size-4" /> UMUGENZI
            </Button>
            <Button variant="ghost" className="rounded-xl h-12 px-6 gap-2 text-white/40 font-black italic uppercase text-xs hover:text-white">
               <History className="size-4" /> IBYATAMBUTSE
            </Button>
            <Button variant="ghost" className="rounded-xl h-12 px-6 gap-2 text-white/40 font-black italic uppercase text-xs hover:text-white">
               <Info className="size-4" /> IGISOBANURO
            </Button>
            <Button variant="ghost" className="rounded-xl h-12 px-6 gap-2 text-white/40 font-black italic uppercase text-xs hover:text-white">
               <PhoneCall className="size-4" /> CONTACT
            </Button>
            <Button variant="ghost" className="rounded-xl h-12 px-6 gap-2 text-white/40 font-black italic uppercase text-xs hover:text-white">
               <UserCircle className="size-4" /> UMWIRONDORO
            </Button>
         </div>
      </nav>

      {/* Sub-Navigation (Request, Reports, Analytics) */}
      <div className="px-6 flex justify-center mb-8">
         <div className="bg-[#1a1a1a] rounded-2xl p-1 flex gap-2 border border-white/5 w-full max-w-2xl">
            <Button onClick={() => setActiveTab('request')} variant="ghost" className={`flex-1 h-12 rounded-xl gap-2 font-black uppercase text-xs tracking-widest transition-all ${activeTab === 'request' ? 'bg-[#333] text-white shadow-inner' : 'text-white/40 hover:text-white'}`}>
               <LayoutDashboard className="size-4" /> Request
            </Button>
            <Button onClick={() => setActiveTab('reports')} variant="ghost" className={`flex-1 h-12 rounded-xl gap-2 font-black uppercase text-xs tracking-widest transition-all ${activeTab === 'reports' ? 'bg-[#333] text-white shadow-inner' : 'text-white/40 hover:text-white'}`}>
               <FileText className="size-4" /> Reports
            </Button>
            <Button onClick={() => setActiveTab('analytics')} variant="ghost" className={`flex-1 h-12 rounded-xl gap-2 font-black uppercase text-xs tracking-widest transition-all ${activeTab === 'analytics' ? 'bg-[#333] text-white shadow-inner' : 'text-white/40 hover:text-white'}`}>
               <BarChart3 className="size-4" /> Analytics
            </Button>
         </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 pb-20 space-y-8 animate-in fade-in duration-700">
        
        {/* Purple Hero Banner */}
        <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#6b21a8] to-[#3b0764] p-12 shadow-[0_20px_50px_rgba(107,33,168,0.3)]">
           <div className="relative z-10 space-y-2">
              <h2 className="text-5xl font-black italic uppercase tracking-tighter">Urerekeza he?</h2>
              <p className="text-white/60 font-bold italic">Saba urugendo mu masegonda make.</p>
           </div>
           {/* Decorative circles */}
           <div className="absolute top-0 right-0 size-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
           <div className="absolute bottom-0 left-10 size-32 bg-white/5 rounded-full translate-y-1/2" />
        </div>

        {/* Input Fields */}
        <div className="space-y-4">
           <div className="bg-[#1a1a1a] rounded-[2rem] p-6 border border-white/5 shadow-2xl space-y-3">
              <div className="relative group">
                 <div className="absolute left-6 top-1/2 -translate-y-1/2 size-2 bg-green-500 rounded-full shadow-[0_0_10px_#22c55e]" />
                 <Input 
                   value={pickup}
                   onChange={(e) => setPickup(e.target.value)}
                   className="h-16 pl-14 pr-20 bg-transparent border-none text-lg font-bold placeholder:text-white/20 focus-visible:ring-0" 
                   placeholder="Aho uherereye" 
                 />
                 <div className="absolute right-6 top-1/2 -translate-y-1/2 flex gap-4 text-white/40">
                    <LocateFixed className="size-5 hover:text-white cursor-pointer transition-colors" />
                    <Search className="size-5 hover:text-white cursor-pointer transition-colors" />
                 </div>
              </div>
              <div className="h-px bg-white/5 mx-4" />
              <div className="relative group">
                 <div className="absolute left-6 top-1/2 -translate-y-1/2 size-2 bg-red-500 rounded-full shadow-[0_0_10px_#ef4444]" />
                 <Input 
                   value={destination}
                   onChange={(e) => setDestination(e.target.value)}
                   className="h-16 pl-14 pr-12 bg-transparent border-none text-lg font-bold placeholder:text-white/20 focus-visible:ring-0" 
                   placeholder="Aho ugiye" 
                 />
                 <div className="absolute right-6 top-1/2 -translate-y-1/2 text-white/40">
                    <Search className="size-5 hover:text-white cursor-pointer transition-colors" />
                 </div>
              </div>
           </div>
        </div>

        {/* Vehicle Choice */}
        <div className="space-y-4">
           <p className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase px-2">CHOOSE VEHICLE</p>
           <div className="grid grid-cols-2 gap-6">
              <Button 
                onClick={() => setVehicleTypeFilter('taxi')}
                className={`h-40 rounded-[2.5rem] flex flex-col gap-4 font-black italic uppercase transition-all ${vehicleTypeFilter === 'taxi' ? 'bg-[#1d72d2] text-white shadow-[0_0_30px_rgba(29,114,210,0.3)]' : 'bg-[#1a1a1a] text-white/20 border border-white/5'}`}
              >
                 <CarIcon className="size-12" />
                 <span className="text-sm tracking-widest">Car</span>
              </Button>
              <Button 
                onClick={() => setVehicleTypeFilter('moto')}
                className={`h-40 rounded-[2.5rem] flex flex-col gap-4 font-black italic uppercase transition-all ${vehicleTypeFilter === 'moto' ? 'bg-[#1d72d2] text-white shadow-[0_0_30px_rgba(29,114,210,0.3)]' : 'bg-[#1a1a1a] text-white/20 border border-white/5'}`}
              >
                 <Bike className="size-12" />
                 <span className="text-sm tracking-widest">Moto</span>
              </Button>
           </div>
        </div>

        {/* Nearby Drivers & Map */}
        <div className="space-y-6">
           <div className="flex items-center justify-between px-2">
              <p className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">ABASHOFERI BARI HAFI</p>
              <div className="bg-green-500/10 px-3 py-1 rounded-full">
                 <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">{availableDrivers?.length || 0} NARIYO</p>
              </div>
           </div>

           <div className="relative rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={containerStyle}
                  center={passengerLocation}
                  zoom={14}
                  mapTypeId={mapType}
                  options={{
                    disableDefaultUI: true,
                    styles: [
                        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                        {
                          featureType: "administrative.locality",
                          elementType: "labels.text.fill",
                          stylers: [{ color: "#d59563" }],
                        },
                        {
                          featureType: "poi",
                          elementType: "labels.text.fill",
                          stylers: [{ color: "#d59563" }],
                        },
                        {
                          featureType: "poi.park",
                          elementType: "geometry",
                          stylers: [{ color: "#263c3f" }],
                        },
                        {
                          featureType: "poi.park",
                          elementType: "labels.text.fill",
                          stylers: [{ color: "#6b9a76" }],
                        },
                        {
                          featureType: "road",
                          elementType: "geometry",
                          stylers: [{ color: "#38414e" }],
                        },
                        {
                          featureType: "road",
                          elementType: "geometry.stroke",
                          stylers: [{ color: "#212a37" }],
                        },
                        {
                          featureType: "road",
                          elementType: "labels.text.fill",
                          stylers: [{ color: "#9ca5b3" }],
                        },
                        {
                          featureType: "road.highway",
                          elementType: "geometry",
                          stylers: [{ color: "#746855" }],
                        },
                        {
                          featureType: "road.highway",
                          elementType: "geometry.stroke",
                          stylers: [{ color: "#1f2835" }],
                        },
                        {
                          featureType: "road.highway",
                          elementType: "labels.text.fill",
                          stylers: [{ color: "#f3d19c" }],
                        },
                        {
                          featureType: "transit",
                          elementType: "geometry",
                          stylers: [{ color: "#2f3948" }],
                        },
                        {
                          featureType: "transit.station",
                          elementType: "labels.text.fill",
                          stylers: [{ color: "#d59563" }],
                        },
                        {
                          featureType: "water",
                          elementType: "geometry",
                          stylers: [{ color: "#17263c" }],
                        },
                        {
                          featureType: "water",
                          elementType: "labels.text.fill",
                          stylers: [{ color: "#515c6d" }],
                        },
                        {
                          featureType: "water",
                          elementType: "labels.text.stroke",
                          stylers: [{ color: "#17263c" }],
                        },
                      ],
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
                        scaledSize: { width: 35, height: 35 } as any
                      }}
                    />
                  ))}
                </GoogleMap>
              ) : (
                <div className="h-[500px] w-full flex items-center justify-center bg-[#1a1a1a]">
                  <Loader2 className="size-10 animate-spin text-white/10" />
                </div>
              )}

              {/* Map Type Controls */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 flex p-1 bg-white rounded-2xl shadow-2xl z-20">
                 <Button onClick={() => setMapType('roadmap')} variant="ghost" className={`h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest ${mapType === 'roadmap' ? 'bg-black text-white' : 'text-black/40'}`}>
                    Map
                 </Button>
                 <Button onClick={() => setMapType('hybrid')} variant="ghost" className={`h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest ${mapType === 'hybrid' ? 'bg-black text-white' : 'text-black/40'}`}>
                    <span className="flex items-center gap-1">
                       <CheckCircle2 className={`size-3 ${mapType === 'hybrid' ? 'block' : 'hidden'}`} /> Hybrid
                    </span>
                 </Button>
                 <Button onClick={() => setMapType('satellite')} variant="ghost" className={`h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest ${mapType === 'satellite' ? 'bg-black text-white' : 'text-black/40'}`}>
                    Satellite
                 </Button>
              </div>

              {/* Map Zoom Controls */}
              <div className="absolute right-6 bottom-6 flex flex-col gap-2 z-20">
                 <Button variant="secondary" className="size-12 rounded-xl bg-white text-black font-black text-2xl shadow-xl">+</Button>
                 <Button variant="secondary" className="size-12 rounded-xl bg-white text-black font-black text-2xl shadow-xl">-</Button>
              </div>
           </div>
        </div>

        {/* Request Button */}
        <Button 
           onClick={handleRequestRide} 
           disabled={!destination || isRequesting} 
           className="w-full h-20 rounded-[2rem] bg-primary hover:bg-primary/90 text-2xl font-black italic uppercase tracking-tighter shadow-[0_20px_50px_rgba(37,99,235,0.4)]"
        >
           {isRequesting ? <Loader2 className="size-8 animate-spin" /> : 'Confirm Order'}
        </Button>
      </main>

      {/* Logout Footer */}
      <footer className="p-8 flex justify-center border-t border-white/5">
         <Button onClick={handleLogout} variant="ghost" className="text-white/20 hover:text-red-500 font-black italic uppercase text-[10px] tracking-[0.4em]">
            <LogOut className="size-4 mr-2" /> LOGOUT SYSTEM
         </Button>
      </footer>
    </div>
  );
}
