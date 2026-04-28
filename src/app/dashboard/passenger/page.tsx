
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
  Phone, 
  Navigation, 
  Bike, 
  Car as CarIcon, 
  Search,
  CheckCircle2,
  History,
  Info,
  PhoneCall,
  UserCircle,
  Moon,
  Sun,
  LayoutDashboard,
  FileText,
  BarChart3,
  LocateFixed,
  Pencil,
  Star,
  Flag,
  Calendar,
  Mail,
  UserRound,
  AlertCircle,
  ChevronRight
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
  height: "100%",
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
  const [activeTab, setActiveTab] = useState<'request' | 'reports' | 'analytics' | 'profile'>('request');
  const [isDarkMode, setIsDarkMode] = useState(true);

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
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-[#F0F0F4]'}`}>
        <Loader2 className="size-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userProfile) return null;

  const bgClass = isDarkMode ? 'bg-[#0a0a0a]' : 'bg-[#F0F0F4]';
  const textClass = isDarkMode ? 'text-white' : 'text-slate-900';
  const cardBg = isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white';
  const borderClass = isDarkMode ? 'border-white/5' : 'border-slate-200';
  const mutedText = isDarkMode ? 'text-white/40' : 'text-slate-500';

  return (
    <div className={`min-h-screen ${bgClass} ${textClass} flex flex-col font-body transition-colors duration-300`}>
      {/* Top Header */}
      <header className={`px-6 py-4 flex items-center justify-between border-b ${borderClass} ${bgClass} sticky top-0 z-50`}>
        <div className="flex items-center gap-2">
           <h1 className="text-2xl font-black italic tracking-tighter text-blue-500 uppercase">MUTAMBUKE</h1>
        </div>
        <div className="flex items-center gap-8">
           <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`${mutedText} hover:text-blue-500`}
           >
              {isDarkMode ? <Sun className="size-5" /> : <Moon className="size-5" />}
           </Button>
           <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className={`text-sm font-black tracking-widest uppercase leading-none mb-1 ${textClass}`}>{userProfile.name}</p>
                <p className={`text-[10px] ${mutedText} font-bold uppercase tracking-tighter`}>{userProfile.role || 'Umugenzi'}</p>
              </div>
              <div className={`size-12 rounded-2xl ${isDarkMode ? 'bg-primary/20 border-primary/30' : 'bg-white border-slate-200'} flex items-center justify-center overflow-hidden border-2 shadow-lg`}>
                 <User className="size-7 text-primary" />
              </div>
           </div>
        </div>
      </header>

      {/* Main Navigation Menu */}
      <nav className="p-4 md:p-8 flex flex-wrap justify-center gap-4">
         <div className={`${cardBg} p-2 rounded-[1.5rem] shadow-2xl border ${borderClass} w-full max-w-4xl overflow-x-auto no-scrollbar flex`}>
            <Button 
              onClick={() => setActiveTab('request')}
              variant="ghost" 
              className={`flex-1 rounded-xl h-14 px-8 gap-2 font-black italic uppercase text-xs md:text-sm transition-all whitespace-nowrap ${activeTab !== 'profile' ? 'bg-primary text-white shadow-lg' : mutedText + ' hover:text-primary'}`}
            >
               <Navigation className="size-5" /> UMUGENZI
            </Button>
            <Button variant="ghost" className={`flex-1 rounded-xl h-14 px-8 gap-2 ${mutedText} font-black italic uppercase text-xs md:text-sm hover:text-primary whitespace-nowrap`}>
               <History className="size-5" /> IBYATAMBUTSE
            </Button>
            <Button variant="ghost" className={`flex-1 rounded-xl h-14 px-8 gap-2 ${mutedText} font-black italic uppercase text-xs md:text-sm hover:text-primary whitespace-nowrap`}>
               <Info className="size-5" /> IGISOBANURO
            </Button>
            <Button variant="ghost" className={`flex-1 rounded-xl h-14 px-8 gap-2 ${mutedText} font-black italic uppercase text-xs md:text-sm hover:text-primary whitespace-nowrap`}>
               <PhoneCall className="size-5" /> CONTACT
            </Button>
            <Button 
              onClick={() => setActiveTab('profile')}
              variant="ghost" 
              className={`flex-1 rounded-xl h-14 px-8 gap-2 font-black italic uppercase text-xs md:text-sm transition-all whitespace-nowrap ${activeTab === 'profile' ? 'bg-primary text-white shadow-lg' : mutedText + ' hover:text-primary'}`}
            >
               <UserCircle className="size-5" /> UMWIRONDORO
            </Button>
         </div>
      </nav>

      {activeTab !== 'profile' && (
        <div className="px-6 flex justify-center mb-8">
           <div className={`${cardBg} rounded-[1.75rem] p-1.5 flex gap-2 border ${borderClass} w-full max-w-2xl`}>
              <Button onClick={() => setActiveTab('request')} variant="ghost" className={`flex-1 h-14 rounded-2xl gap-2 font-black uppercase text-xs tracking-[0.15em] transition-all ${activeTab === 'request' ? (isDarkMode ? 'bg-[#333] text-white' : 'bg-slate-100 text-slate-900') : mutedText}`}>
                 <LayoutDashboard className="size-5" /> Request
              </Button>
              <Button onClick={() => setActiveTab('reports')} variant="ghost" className={`flex-1 h-14 rounded-2xl gap-2 font-black uppercase text-xs tracking-[0.15em] transition-all ${activeTab === 'reports' ? (isDarkMode ? 'bg-[#333] text-white' : 'bg-slate-100 text-slate-900') : mutedText}`}>
                 <FileText className="size-5" /> Reports
              </Button>
              <Button onClick={() => setActiveTab('analytics')} variant="ghost" className={`flex-1 h-14 rounded-2xl gap-2 font-black uppercase text-xs tracking-[0.15em] transition-all ${activeTab === 'analytics' ? (isDarkMode ? 'bg-[#333] text-white' : 'bg-slate-100 text-slate-900') : mutedText}`}>
                 <BarChart3 className="size-5" /> Analytics
              </Button>
           </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 pb-24 space-y-12 animate-in fade-in duration-700">
        
        {activeTab === 'profile' ? (
          <div className="space-y-10 animate-in slide-in-from-bottom-8">
             {/* Profile Header Card */}
             <div className="relative overflow-hidden rounded-[3.5rem] bg-gradient-to-br from-[#4c1d95] to-[#1e1b4b] p-10 md:p-14 shadow-2xl">
                <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-end justify-between gap-10">
                   <div className="flex flex-col md:flex-row items-center gap-10">
                      <div className={`size-40 md:size-48 rounded-[3.5rem] ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'} border-[6px] border-[#312e81] flex items-center justify-center overflow-hidden relative shadow-2xl`}>
                         <User className={`size-24 ${isDarkMode ? 'text-white/20' : 'text-slate-200'}`} />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      </div>
                      <div className="text-center md:text-left space-y-3">
                         <h2 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter text-white">{userProfile.name}</h2>
                         <p className="text-lg font-bold text-white/60 uppercase tracking-[0.2em]">
                            {userProfile.role || 'Umugenzi'} • {userProfile.phone}@swiftride.app
                         </p>
                      </div>
                   </div>
                   <Button variant="secondary" className="bg-white text-black h-16 px-10 rounded-2xl font-black uppercase text-sm gap-3 hover:bg-white/90 shadow-2xl active:scale-95 transition-all">
                      <Pencil className="size-5" /> Hindura umwirondoro
                   </Button>
                </div>
             </div>

             {/* Stats Cards */}
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className={`${cardBg} rounded-[2.5rem] p-10 border ${borderClass} flex flex-col items-center justify-center gap-4 text-center group transition-all hover:scale-[1.02] shadow-xl`}>
                   <div className="size-16 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                      <Star className="size-8 fill-orange-500" />
                   </div>
                   <div className="space-y-1">
                      <p className={`text-5xl font-black italic ${textClass}`}>4.8</p>
                      <p className={`text-xs font-black ${mutedText} uppercase tracking-[0.3em]`}>INYENYERI</p>
                   </div>
                </div>
                <div className={`${cardBg} rounded-[2.5rem] p-10 border ${borderClass} flex flex-col items-center justify-center gap-4 text-center group transition-all hover:scale-[1.02] shadow-xl`}>
                   <div className="size-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <Flag className="size-8" />
                   </div>
                   <div className="space-y-1">
                      <p className={`text-5xl font-black italic ${textClass}`}>12</p>
                      <p className={`text-xs font-black ${mutedText} uppercase tracking-[0.3em]`}>INGENDO ZOSE</p>
                   </div>
                </div>
                <div className={`${cardBg} rounded-[2.5rem] p-10 border ${borderClass} flex flex-col items-center justify-center gap-4 text-center group transition-all hover:scale-[1.02] shadow-xl`}>
                   <div className="size-16 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
                      <Calendar className="size-8" />
                   </div>
                   <div className="space-y-1">
                      <p className={`text-5xl font-black italic ${textClass}`}>2025</p>
                      <p className={`text-xs font-black ${mutedText} uppercase tracking-[0.3em]`}>WATANGIYE MURI</p>
                   </div>
                </div>
             </div>

             {/* Account Info List */}
             <div className="space-y-6">
                <p className={`text-xs font-black tracking-[0.3em] ${mutedText} uppercase px-4`}>IBIRANGA KONTI</p>
                <div className={`${cardBg} rounded-[3rem] overflow-hidden border ${borderClass} shadow-2xl`}>
                   <div className={`p-8 md:p-10 flex items-center justify-between group cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-[#222]' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-6">
                         <div className="size-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
                            <Mail className="size-8 text-white" />
                         </div>
                         <div>
                            <p className={`text-xs font-black ${mutedText} uppercase tracking-[0.2em] leading-none mb-2`}>EMAIL</p>
                            <p className={`font-bold text-xl ${textClass}`}>{userProfile.phone}@mutambuke.com</p>
                         </div>
                      </div>
                      <ChevronRight className={`size-8 ${mutedText} group-hover:text-primary transition-all`} />
                   </div>
                   <div className={`h-px ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'} mx-8`} />
                   <div className={`p-8 md:p-10 flex items-center justify-between group cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-[#222]' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-6">
                         <div className="size-16 rounded-2xl bg-green-600 flex items-center justify-center shadow-lg">
                            <Phone className="size-8 text-white" />
                         </div>
                         <div>
                            <p className={`text-xs font-black ${mutedText} uppercase tracking-[0.2em] leading-none mb-2`}>NIMERO YA TEREFONE</p>
                            <p className={`font-bold text-xl ${textClass}`}>{userProfile.phone}</p>
                         </div>
                      </div>
                      <ChevronRight className={`size-8 ${mutedText} group-hover:text-primary transition-all`} />
                   </div>
                </div>
             </div>

             {/* Logout Button */}
             <div className="pt-10">
                <Button 
                   onClick={handleLogout}
                   className="w-full h-24 rounded-[3rem] bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white border-2 border-red-600/20 text-2xl font-black italic uppercase tracking-tighter transition-all shadow-2xl active:scale-[0.98]"
                >
                   <LogOut className="size-8 mr-4" /> SOHOKA MURI SISITEMU
                </Button>
             </div>
          </div>
        ) : (
          <>
            {/* Hero Banner */}
            <div className={`relative overflow-hidden rounded-[4rem] ${isDarkMode ? 'bg-gradient-to-br from-[#6b21a8] to-[#3b0764]' : 'bg-gradient-to-br from-blue-600 to-blue-800'} p-14 md:p-20 shadow-2xl`}>
               <div className="relative z-10 space-y-4 max-w-2xl">
                  <h2 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-[0.85] text-white">Urerekeza he?</h2>
                  <p className="text-xl md:text-2xl text-white/60 font-bold italic">Saba urugendo mu masegonda make.</p>
               </div>
               <div className="absolute top-0 right-0 size-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            </div>

            {/* Input Fields */}
            <div className="space-y-6">
               <div className={`${cardBg} rounded-[3rem] p-8 border ${borderClass} shadow-2xl space-y-4`}>
                  <div className="relative group">
                     <div className="absolute left-8 top-1/2 -translate-y-1/2 size-3 bg-green-500 rounded-full shadow-[0_0_15px_#22c55e]" />
                     <Input 
                       value={pickup}
                       onChange={(e) => setPickup(e.target.value)}
                       className={`h-20 pl-16 pr-24 bg-transparent border-none text-2xl font-bold placeholder:${mutedText} focus-visible:ring-0 ${textClass}`} 
                       placeholder="Aho uherereye" 
                     />
                     <div className={`absolute right-8 top-1/2 -translate-y-1/2 flex gap-6 ${mutedText}`}>
                        <LocateFixed className="size-7 hover:text-blue-500 cursor-pointer transition-colors" />
                        <Search className="size-7 hover:text-blue-500 cursor-pointer transition-colors" />
                     </div>
                  </div>
                  <div className={`h-px ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'} mx-6`} />
                  <div className="relative group">
                     <div className="absolute left-8 top-1/2 -translate-y-1/2 size-3 bg-red-500 rounded-full shadow-[0_0_15px_#ef4444]" />
                     <Input 
                       value={destination}
                       onChange={(e) => setDestination(e.target.value)}
                       className={`h-20 pl-16 pr-16 bg-transparent border-none text-2xl font-bold placeholder:${mutedText} focus-visible:ring-0 ${textClass}`} 
                       placeholder="Aho ugiye" 
                     />
                     <div className={`absolute right-8 top-1/2 -translate-y-1/2 ${mutedText}`}>
                        <Search className="size-7 hover:text-blue-500 cursor-pointer transition-colors" />
                     </div>
                  </div>
               </div>
            </div>

            {/* Vehicle Choice */}
            <div className="space-y-6">
               <p className={`text-xs font-black tracking-[0.4em] ${mutedText} uppercase px-4`}>CHOOSE VEHICLE</p>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <Button 
                    onClick={() => setVehicleTypeFilter('taxi')}
                    className={`h-56 md:h-64 rounded-[3.5rem] flex flex-col gap-6 font-black italic uppercase transition-all hover:scale-[1.03] ${vehicleTypeFilter === 'taxi' ? 'bg-blue-600 text-white shadow-xl' : isDarkMode ? 'bg-[#1a1a1a] text-white/20 border border-white/5' : 'bg-white text-slate-300 border border-slate-200'}`}
                  >
                     <CarIcon className="size-20" />
                     <span className="text-2xl tracking-[0.2em]">Car</span>
                  </Button>
                  <Button 
                    onClick={() => setVehicleTypeFilter('moto')}
                    className={`h-56 md:h-64 rounded-[3.5rem] flex flex-col gap-6 font-black italic uppercase transition-all hover:scale-[1.03] ${vehicleTypeFilter === 'moto' ? 'bg-blue-600 text-white shadow-xl' : isDarkMode ? 'bg-[#1a1a1a] text-white/20 border border-white/5' : 'bg-white text-slate-300 border border-slate-200'}`}
                  >
                     <Bike className="size-20" />
                     <span className="text-2xl tracking-[0.2em]">Moto</span>
                  </Button>
               </div>
            </div>

            {/* Nearby Drivers & Map */}
            <div className="space-y-8">
               <div className="flex items-center justify-between px-4">
                  <p className={`text-xs font-black tracking-[0.4em] ${mutedText} uppercase`}>ABASHOFERI BARI HAFI</p>
                  <div className="bg-green-500/10 px-5 py-2 rounded-full border border-green-500/20">
                     <p className="text-xs font-black text-green-500 uppercase tracking-widest">{availableDrivers?.length || 0} NARIYO</p>
                  </div>
               </div>

               <div className={`relative h-[600px] rounded-[4rem] overflow-hidden border ${borderClass} shadow-3xl ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-slate-200'}`}>
                  {isLoaded ? (
                    <GoogleMap
                      mapContainerStyle={containerStyle}
                      center={passengerLocation}
                      zoom={14}
                      mapTypeId={mapType}
                      options={{
                        disableDefaultUI: true,
                        styles: isDarkMode ? [
                            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                            { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
                            { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
                          ] : [],
                      }}
                    >
                      <Marker 
                        position={passengerLocation} 
                        icon={{
                          url: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
                          scaledSize: { width: 50, height: 50 } as any
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
                      <Loader2 className={`size-16 animate-spin ${mutedText}`} />
                    </div>
                  )}

                  {/* Map Controls */}
                  <div className={`absolute top-8 left-1/2 -translate-x-1/2 flex p-2 ${isDarkMode ? 'bg-white/10' : 'bg-white/90'} backdrop-blur-md rounded-3xl shadow-2xl z-20 gap-2`}>
                     <Button onClick={() => setMapType('roadmap')} variant="ghost" className={`h-12 px-8 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all ${mapType === 'roadmap' ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white') : mutedText}`}>
                        Map
                     </Button>
                     <Button onClick={() => setMapType('hybrid')} variant="ghost" className={`h-12 px-8 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all ${mapType === 'hybrid' ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white') : mutedText}`}>
                        Hybrid
                     </Button>
                     <Button onClick={() => setMapType('satellite')} variant="ghost" className={`h-12 px-8 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all ${mapType === 'satellite' ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white') : mutedText}`}>
                        Satellite
                     </Button>
                  </div>

                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="absolute bottom-8 right-8 size-16 rounded-[1.5rem] bg-white text-black shadow-2xl hover:scale-110 active:scale-95 transition-all z-20"
                    onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition((pos) => {
                            setPassengerLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                          });
                        }
                    }}
                  >
                    <LocateFixed className="size-8" />
                  </Button>
               </div>
            </div>

            <Button 
               onClick={handleRequestRide} 
               disabled={!destination || isRequesting} 
               className="w-full h-24 rounded-[3.5rem] bg-blue-600 hover:bg-blue-700 text-3xl font-black italic uppercase tracking-tighter shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 text-white"
            >
               {isRequesting ? <Loader2 className="size-10 animate-spin" /> : 'Confirm Order'}
            </Button>
          </>
        )}
      </main>

      <footer className={`p-12 flex justify-center border-t ${borderClass} ${isDarkMode ? 'bg-[#050505]' : 'bg-white'}`}>
         <p className={`${mutedText} font-black italic uppercase text-xs tracking-[0.5em]`}>
            MUTAMBUKE SMART SYSTEM © 2025
         </p>
      </footer>
    </div>
  );
}
