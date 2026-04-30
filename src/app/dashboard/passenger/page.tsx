'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  MapPin, User, LogOut, Loader2, Navigation, Bike, Car as CarIcon,
  X, Star, Phone, MessageSquare, Send, LocateFixed,
  Menu, Bell, ChevronDown, Home, History, Search, Plus, Sun, Moon
} from 'lucide-react';
import { collection, doc, setDoc, query, where, serverTimestamp, updateDoc, addDoc, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const GOOGLE_MAPS_API_KEY = "AIzaSyBYd7EGaMpDouB0Br1yUSwRarQeToFuiiA";
const kigaliCenter = { lat: -1.9441, lng: 30.0619 };

export default function PassengerDashboard() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'profile'>('home');
  const [isRequesting, setIsRequesting] = useState(false);
  const [passengerLocation, setPassengerLocation] = useState(kigaliCenter);
  const [vehicleType, setVehicleType] = useState<'moto' | 'taxi'>('moto');
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  const { data: userProfile, loading: profileLoading } = useDoc(user ? `users/${user.uid}` : null);

  const activeRideQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'rides'),
      where('passengerId', '==', user.uid),
      where('status', 'in', ['requested', 'accepted', 'started', 'arrived'])
    );
  }, [db, user]);
  const { data: activeRides } = useCollection(activeRideQuery);
  const currentRide = activeRides?.[0];

  const ridersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'drivers'),
      where('status', '==', 'online'),
      where('verificationStatus', '==', 'approved')
    );
  }, [db]);
  const { data: availableDrivers } = useCollection(ridersQuery);

  const rideHistoryQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'rides'),
      where('passengerId', '==', user.uid),
      where('status', '==', 'completed'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
  }, [db, user]);
  const { data: rideHistory } = useCollection(rideHistoryQuery);

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPassengerLocation(loc);
        },
        null, { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  async function handleFindRide(type: 'moto' | 'taxi') {
    if (!db || !user) return;
    setIsRequesting(true);
    setVehicleType(type);
    try {
      const rideId = doc(collection(db, 'rides')).id;
      await setDoc(doc(db, 'rides', rideId), {
        rideId,
        passengerId: user.uid,
        passengerName: userProfile?.name || 'Umugenzi',
        passengerPhone: userProfile?.phone || '',
        pickupLocation: passengerLocation,
        destination: 'Icyerekezo...',
        status: 'requested',
        vehicleType: type,
        createdAt: serverTimestamp()
      });
      toast({ title: "Gushakisha " + type + "..." });
    } catch (e: any) {
      toast({ variant: "destructive", description: "Ikosa ryamaze kubaho." });
    } finally {
      setIsRequesting(false);
    }
  }

  async function handleLogout() {
    if (!auth) return;
    await signOut(auth);
    router.replace('/lib/auth');
  }

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-[#0F172A]"><Loader2 className="animate-spin text-secondary size-10" /></div>;

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-white font-body overflow-x-hidden">
      
      {/* TOP HEADER */}
      <header className="h-20 flex items-center justify-between px-6 border-b border-white/5 bg-[#0F172A]/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
           <div className="size-10 bg-secondary rounded-xl flex items-center justify-center font-black text-white italic">M</div>
           <span className="font-black text-xl tracking-tighter text-white uppercase italic">MUTAMBUKE</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-2">
           <Button variant="ghost" onClick={() => setActiveTab('home')} className={`rounded-full h-10 px-6 gap-2 font-black uppercase text-[10px] tracking-widest ${activeTab === 'home' ? 'bg-secondary text-white' : 'text-white/40'}`}>
              <Navigation size={14}/> UMUGENZI
           </Button>
           <Button variant="ghost" onClick={() => setActiveTab('history')} className={`rounded-full h-10 px-6 gap-2 font-black uppercase text-[10px] tracking-widest ${activeTab === 'history' ? 'bg-white/5 text-white' : 'text-white/40'}`}>
              <History size={14}/> IBYATAMBUTSE
           </Button>
           <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`rounded-full h-10 px-6 gap-2 font-black uppercase text-[10px] tracking-widest ${activeTab === 'profile' ? 'bg-white/5 text-white' : 'text-white/40'}`}>
              <User size={14}/> UMWIRONDORO
           </Button>
        </nav>

        <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" className="rounded-full bg-white/5 relative">
              <Bell size={20} className="text-white/60"/>
              <div className="absolute top-2 right-2 size-2 bg-red-500 rounded-full animate-pulse" />
           </Button>
           <Button variant="ghost" size="icon" className="rounded-full bg-white/5">
              <Sun size={20} className="text-accent"/>
           </Button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
        
        {activeTab === 'home' ? (
          <>
            {/* MAP CONTAINER - AS SEEN IN SCREENSHOT */}
            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-[#0F172A] relative h-[450px] animate-in fade-in duration-700">
               {isLoaded ? (
                 <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={passengerLocation}
                    zoom={15}
                    mapTypeId="hybrid"
                    options={{
                      disableDefaultUI: true,
                      styles: [
                        { "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
                        { "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] },
                        { "feature": "water", "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] }
                      ]
                    }}
                    onLoad={(map) => { mapRef.current = map; }}
                 >
                    <Marker position={passengerLocation} icon={{
                       path: google.maps.SymbolPath.CIRCLE,
                       scale: 8,
                       fillColor: "#22C55E",
                       fillOpacity: 1,
                       strokeWeight: 4,
                       strokeColor: "rgba(34, 197, 94, 0.3)",
                    }} />

                    {availableDrivers?.map((d: any) => (
                      <Marker 
                        key={d.driverId}
                        position={d.currentLocation}
                        icon={{ 
                          url: d.vehicleType === 'moto' ? 'https://cdn-icons-png.flaticon.com/512/3194/3194514.png' : 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png', 
                          scaledSize: { width: 32, height: 32 } as any 
                        }}
                      />
                    ))}
                 </GoogleMap>
               ) : <div className="size-full flex items-center justify-center"><Loader2 className="animate-spin text-secondary"/></div>}
               
               <div className="absolute top-6 left-6 right-6">
                  <div className="glass-panel p-4 rounded-3xl flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <MapPin className="text-secondary" size={20}/>
                        <div>
                           <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-0.5">Aho uri</p>
                           <p className="text-xs font-bold text-white">Kigali, Rwanda</p>
                        </div>
                     </div>
                     <ChevronDown className="text-white/20" size={18}/>
                  </div>
               </div>

               <Button 
                  onClick={() => mapRef.current?.panTo(passengerLocation)} 
                  size="icon" 
                  className="absolute bottom-6 right-6 rounded-2xl bg-white text-[#0F172A] hover:bg-white/90 shadow-2xl"
               >
                  <LocateFixed size={20} />
               </Button>
            </Card>

            {/* QUICK ACTIONS - MOTO & TAXI */}
            <div className="grid grid-cols-2 gap-4 lg:gap-8">
               <button 
                  onClick={() => handleFindRide('moto')}
                  disabled={!!currentRide}
                  className={`p-10 rounded-[2.5rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-4 group active:scale-95 ${currentRide && 'opacity-50 cursor-not-allowed'}`}
               >
                  <div className="size-16 rounded-3xl bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                     <Bike size={40} />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tighter italic">SABA MOTO</h3>
               </button>
               
               <button 
                  onClick={() => handleFindRide('taxi')}
                  disabled={!!currentRide}
                  className={`p-10 rounded-[2.5rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-4 group active:scale-95 ${currentRide && 'opacity-50 cursor-not-allowed'}`}
               >
                  <div className="size-16 rounded-3xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                     <CarIcon size={40} />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tighter italic">SABA TAXI</h3>
               </button>
            </div>

            {/* ACTIVE RIDE STATUS */}
            {currentRide && (
               <Card className="rounded-[2.5rem] border-secondary/30 bg-secondary/10 p-8 flex items-center justify-between animate-in slide-in-from-bottom-5">
                  <div className="flex items-center gap-6">
                     <div className="size-16 rounded-3xl bg-secondary flex items-center justify-center text-[#0F172A]">
                        {currentRide.vehicleType === 'moto' ? <Bike size={32}/> : <CarIcon size={32}/>}
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-secondary uppercase tracking-[0.3em] mb-1">{currentRide.status === 'requested' ? 'GUSHAKISHA...' : 'ARI MU NZIRA'}</p>
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter">{currentRide.driverName || 'Turashaka umushoferi...'}</h3>
                        {currentRide.driverPhone && <p className="text-xs font-bold text-white/50">{currentRide.driverPhone}</p>}
                     </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <Button variant="ghost" size="icon" className="size-14 rounded-2xl bg-white/5 text-red-500 hover:bg-red-500 hover:text-white" onClick={() => updateDoc(doc(db!, 'rides', currentRide.rideId), { status: 'cancelled' })}>
                        <X size={24}/>
                     </Button>
                  </div>
               </Card>
            )}

            {/* NEARBY DRIVERS LIST - AS SEEN IN SCREENSHOT */}
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase tracking-[0.4em] text-white/20">ABASHOFERI BARI HAFI</h2>
                  <Badge variant="outline" className="border-white/5 text-[9px] font-black uppercase tracking-widest text-white/40">{availableDrivers?.length || 0} ONLINE</Badge>
               </div>
               
               <div className="grid gap-3">
                  {availableDrivers?.map((driver: any) => (
                    <Card key={driver.id} className="rounded-3xl border-none bg-white/5 p-4 flex items-center justify-between group hover:bg-white/10 transition-colors">
                       <div className="flex items-center gap-4">
                          <div className="size-12 rounded-2xl bg-[#070b14] overflow-hidden flex items-center justify-center text-secondary">
                             {driver.vehicleType === 'moto' ? <Bike size={24}/> : <CarIcon size={24}/>}
                          </div>
                          <div>
                             <h4 className="font-black text-sm uppercase italic tracking-tight">{driver.plateNumber || 'MOTO'}</h4>
                             <p className="text-[10px] font-black text-accent flex items-center gap-1">
                                <Star size={10} fill="currentColor"/> 4.9 • {driver.vehicleType}
                             </p>
                          </div>
                       </div>
                       <Button variant="ghost" size="icon" className="size-12 rounded-2xl bg-secondary/10 text-secondary hover:bg-secondary hover:text-white transition-all">
                          <Phone size={20}/>
                       </Button>
                    </Card>
                  ))}
                  {!availableDrivers?.length && (
                    <div className="py-10 text-center rounded-[2rem] border-2 border-dashed border-white/5 opacity-20">
                       <p className="text-[10px] font-black uppercase tracking-widest">Nta bashoferi bahari hafi</p>
                    </div>
                  )}
               </div>
            </div>
          </>
        ) : activeTab === 'history' ? (
          <div className="space-y-6 animate-in slide-in-from-right-5 duration-500">
             <h2 className="text-3xl font-black uppercase italic tracking-tighter">IBYATAMBUTSE</h2>
             <div className="grid gap-4">
                {rideHistory?.map((ride: any) => (
                  <Card key={ride.id} className="p-6 rounded-[2rem] bg-white/5 border-none flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="size-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/40">
                           {ride.vehicleType === 'moto' ? <Bike size={28}/> : <CarIcon size={28}/>}
                        </div>
                        <div>
                           <h4 className="font-black text-lg italic uppercase">{ride.driverName || 'Umushoferi'}</h4>
                           <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                              {ride.createdAt?.toDate ? format(ride.createdAt.toDate(), 'MMM dd, p') : 'Vuba aha'}
                           </p>
                        </div>
                     </div>
                     <div className="text-right">
                        <Badge className="bg-secondary/10 text-secondary border-none font-black italic text-[10px]">COMPLETED</Badge>
                        <p className="text-sm font-black text-accent mt-1 italic">1,200 RWF</p>
                     </div>
                  </Card>
                ))}
                {!rideHistory?.length && (
                  <div className="py-24 text-center opacity-20">
                    <History size={64} className="mx-auto mb-4" />
                    <p className="font-black uppercase text-xs tracking-[0.4em]">Nta mateka y'ingendo arahari</p>
                  </div>
                )}
             </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-right-5 duration-500 pb-20">
             <div className="p-12 rounded-[3rem] bg-white/5 border border-white/5 text-center relative overflow-hidden shadow-2xl">
                <div className="size-24 rounded-[2rem] bg-secondary/20 flex items-center justify-center text-secondary mx-auto mb-6 shadow-xl border-2 border-secondary/20">
                   <User size={48} strokeWidth={1.5}/>
                </div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter">{userProfile?.name}</h2>
                <p className="text-xs font-bold text-white/30 uppercase tracking-[0.4em] mt-2">{userProfile?.phone}</p>
                <div className="absolute top-0 right-0 size-40 bg-secondary/5 rounded-full -mr-20 -mt-20" />
             </div>

             <div className="grid gap-4">
                <ProfileCard icon={Star} label="Rating" value="4.8 Stars" color="text-accent" />
                <ProfileCard icon={History} label="Ingendo Zose" value={rideHistory?.length || 0} color="text-secondary" />
                <ProfileCard icon={Navigation} label="Aho uherereye" value="Kigali, Rwanda" color="text-blue-400" />
             </div>

             <Button 
               onClick={handleLogout}
               className="w-full h-20 rounded-[2rem] bg-red-500/10 text-red-500 border border-red-500/10 font-black text-sm uppercase tracking-[0.3em] hover:bg-red-500 hover:text-white transition-all shadow-2xl group mt-6"
             >
               <LogOut size={20} className="mr-4 group-hover:scale-110 transition-transform" /> GUSOHOKA
             </Button>
          </div>
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden h-24 bg-[#0F172A] border-t border-white/5 flex items-center justify-around px-6 sticky bottom-0 z-50 backdrop-blur-xl">
        <NavItem active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={Home} label="Home" />
        <NavItem active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={History} label="History" />
        <NavItem active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={User} label="Profile" />
      </nav>

    </div>
  );
}

function NavItem({ active, onClick, icon: Icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 transition-all ${active ? 'text-secondary scale-110' : 'text-white/20'}`}
    >
      <Icon size={24} fill={active ? 'currentColor' : 'none'} />
      <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
    </button>
  );
}

function ProfileCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 flex items-center justify-between shadow-xl">
       <div className="flex items-center gap-6">
          <div className={`size-14 rounded-2xl bg-white/5 flex items-center justify-center ${color}`}>
             <Icon size={24}/>
          </div>
          <div>
             <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">{label}</p>
             <p className="font-black text-lg uppercase italic">{value}</p>
          </div>
       </div>
    </div>
  );
}
