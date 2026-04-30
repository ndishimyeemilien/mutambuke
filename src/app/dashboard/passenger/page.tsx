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
      limit(10)
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
      <header className="h-20 flex items-center justify-between px-6 border-b border-white/5 bg-[#0F172A]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
           <div className="size-10 bg-secondary rounded-xl flex items-center justify-center font-black text-white italic">M</div>
           <span className="font-black text-xl tracking-tighter text-white uppercase italic">MUTAMBUKE</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-2">
           <Button variant="ghost" onClick={() => setActiveTab('home')} className={`rounded-full h-10 px-6 gap-2 font-black uppercase text-[10px] tracking-widest ${activeTab === 'home' ? 'bg-secondary text-white shadow-lg shadow-secondary/20' : 'text-white/40 hover:text-white/60'}`}>
              <Navigation size={14}/> UMUGENZI
           </Button>
           <Button variant="ghost" onClick={() => setActiveTab('history')} className={`rounded-full h-10 px-6 gap-2 font-black uppercase text-[10px] tracking-widest ${activeTab === 'history' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}>
              <History size={14}/> IBYATAMBUTSE
           </Button>
           <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`rounded-full h-10 px-6 gap-2 font-black uppercase text-[10px] tracking-widest ${activeTab === 'profile' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}>
              <User size={14}/> UMWIRONDORO
           </Button>
        </nav>

        <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" className="rounded-full bg-white/5 relative">
              <Bell size={20} className="text-white/60"/>
              <div className="absolute top-2 right-2 size-2 bg-red-500 rounded-full animate-pulse" />
           </Button>
           <Button variant="ghost" size="icon" className="rounded-full bg-white/5 md:hidden" onClick={() => setActiveTab('profile')}>
              <Menu size={20} className="text-white/60"/>
           </Button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
        
        {activeTab === 'home' ? (
          <>
            {/* HYBRID MAP CARD - REDESIGNED PER SCREENSHOT */}
            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-[#0F172A] relative h-[450px] animate-in fade-in zoom-in-95 duration-700">
               {isLoaded ? (
                 <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={passengerLocation}
                    zoom={15}
                    mapTypeId="hybrid"
                    options={{
                      disableDefaultUI: true,
                    }}
                    onLoad={(map) => { mapRef.current = map; }}
                 >
                    {/* RED USER LOCATION MARKER */}
                    <Marker position={passengerLocation} icon={{
                       path: google.maps.SymbolPath.CIRCLE,
                       scale: 9,
                       fillColor: "#EF4444",
                       fillOpacity: 1,
                       strokeWeight: 5,
                       strokeColor: "rgba(239, 68, 68, 0.3)",
                    }} />

                    {availableDrivers?.map((d: any) => (
                      <Marker 
                        key={d.driverId}
                        position={d.currentLocation}
                        icon={{ 
                          url: d.vehicleType === 'moto' ? 'https://cdn-icons-png.flaticon.com/512/3194/3194514.png' : 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png', 
                          scaledSize: { width: 35, height: 35 } as any 
                        }}
                      />
                    ))}
                 </GoogleMap>
               ) : <div className="size-full flex items-center justify-center"><Loader2 className="animate-spin text-secondary"/></div>}
               
               <div className="absolute top-6 left-6 right-6">
                  <div className="glass-panel p-5 rounded-3xl flex items-center justify-between shadow-2xl backdrop-blur-2xl">
                     <div className="flex items-center gap-4">
                        <div className="size-10 rounded-2xl bg-secondary/20 flex items-center justify-center text-secondary">
                          <MapPin size={20}/>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-0.5">Aho uri ubu</p>
                           <p className="text-sm font-bold text-white italic">Kigali, Rwanda</p>
                        </div>
                     </div>
                     <ChevronDown className="text-white/20" size={18}/>
                  </div>
               </div>

               <Button 
                  onClick={() => mapRef.current?.panTo(passengerLocation)} 
                  size="icon" 
                  className="absolute bottom-6 right-6 size-14 rounded-2xl bg-white text-[#0F172A] hover:bg-white/90 shadow-2xl transition-transform active:scale-90"
               >
                  <LocateFixed size={24} />
               </Button>
            </Card>

            {/* QUICK ACTIONS - MOTO & TAXI */}
            <div className="grid grid-cols-2 gap-4 lg:gap-8">
               <button 
                  onClick={() => handleFindRide('moto')}
                  disabled={!!currentRide}
                  className={`p-10 rounded-[2.5rem] bg-[#0F172A] border border-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-6 group active:scale-95 shadow-xl ${currentRide && 'opacity-50 cursor-not-allowed'}`}
               >
                  <div className="size-20 rounded-[2rem] bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform shadow-inner">
                     <Bike size={48} />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white">SABA MOTO</h3>
               </button>
               
               <button 
                  onClick={() => handleFindRide('taxi')}
                  disabled={!!currentRide}
                  className={`p-10 rounded-[2.5rem] bg-[#0F172A] border border-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-6 group active:scale-95 shadow-xl ${currentRide && 'opacity-50 cursor-not-allowed'}`}
               >
                  <div className="size-20 rounded-[2rem] bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform shadow-inner">
                     <CarIcon size={48} />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white">SABA TAXI</h3>
               </button>
            </div>

            {/* ACTIVE RIDE STATUS */}
            {currentRide && (
               <Card className="rounded-[3rem] border-none bg-secondary/10 p-8 flex items-center justify-between animate-in slide-in-from-bottom-10 duration-500 shadow-2xl">
                  <div className="flex items-center gap-8">
                     <div className="size-20 rounded-[2rem] bg-secondary flex items-center justify-center text-[#0F172A] shadow-lg">
                        {currentRide.vehicleType === 'moto' ? <Bike size={40}/> : <CarIcon size={40}/>}
                     </div>
                     <div>
                        <p className="text-[11px] font-black text-secondary uppercase tracking-[0.3em] mb-2">{currentRide.status === 'requested' ? 'GUSHAKISHA...' : 'URUGENDO RURIHO'}</p>
                        <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white">{currentRide.driverName || 'Turashaka umushoferi...'}</h3>
                        <p className="text-sm font-bold text-white/40 mt-1 flex items-center gap-2">
                           <ShieldCheck size={14} className="text-secondary"/> 
                           {currentRide.driverPlate || 'Ikinyabiziga kiremeza...'}
                        </p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <Button variant="ghost" size="icon" className="size-16 rounded-[1.5rem] bg-white/5 text-red-500 hover:bg-red-500 hover:text-white transition-all" onClick={() => updateDoc(doc(db!, 'rides', currentRide.rideId), { status: 'cancelled' })}>
                        <X size={28}/>
                     </Button>
                  </div>
               </Card>
            )}

            {/* NEARBY DRIVERS LIST */}
            <div className="space-y-6">
               <div className="flex items-center justify-between px-2">
                  <h2 className="text-xs font-black uppercase tracking-[0.4em] text-white/20 italic">ABASHOFERI BARI HAFI</h2>
                  <Badge variant="outline" className="border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 px-4 py-1.5 rounded-full">{availableDrivers?.length || 0} ONLINE</Badge>
               </div>
               
               <div className="grid gap-4">
                  {availableDrivers?.map((driver: any) => (
                    <Card key={driver.id} className="rounded-[2rem] border-none bg-[#0F172A] p-5 flex items-center justify-between group hover:bg-white/5 transition-all shadow-lg hover:translate-x-1">
                       <div className="flex items-center gap-5">
                          <div className="size-14 rounded-2xl bg-[#070b14] overflow-hidden flex items-center justify-center text-secondary shadow-inner">
                             {driver.vehicleType === 'moto' ? <Bike size={28}/> : <CarIcon size={28}/>}
                          </div>
                          <div>
                             <h4 className="font-black text-lg uppercase italic tracking-tight text-white">{driver.plateNumber || 'MOTO'}</h4>
                             <p className="text-[10px] font-black text-accent flex items-center gap-1.5 mt-0.5">
                                <Star size={12} fill="currentColor"/> 4.9 • {driver.vehicleType}
                             </p>
                          </div>
                       </div>
                       <Button variant="ghost" size="icon" className="size-14 rounded-2xl bg-secondary/10 text-secondary hover:bg-secondary hover:text-white transition-all">
                          <Phone size={24}/>
                       </Button>
                    </Card>
                  ))}
                  {!availableDrivers?.length && (
                    <div className="py-16 text-center rounded-[3rem] border-2 border-dashed border-white/5 bg-white/[0.02] opacity-30">
                       <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Nta bashoferi bahari ubu</p>
                    </div>
                  )}
               </div>
            </div>
          </>
        ) : activeTab === 'history' ? (
          <div className="space-y-8 animate-in slide-in-from-right-5 duration-500">
             <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">IBYATAMBUTSE</h2>
             <div className="grid gap-4">
                {rideHistory?.map((ride: any) => (
                  <Card key={ride.id} className="p-8 rounded-[2.5rem] bg-[#0F172A] border-none flex items-center justify-between shadow-xl group hover:bg-white/5 transition-all">
                     <div className="flex items-center gap-6">
                        <div className="size-16 rounded-[1.5rem] bg-white/5 flex items-center justify-center text-white/20 group-hover:text-secondary transition-colors">
                           {ride.vehicleType === 'moto' ? <Bike size={32}/> : <CarIcon size={32}/>}
                        </div>
                        <div>
                           <h4 className="font-black text-xl italic uppercase text-white">{ride.driverName || 'Umushoferi'}</h4>
                           <p className="text-xs font-bold text-white/30 uppercase tracking-widest mt-1">
                              {ride.createdAt?.toDate ? format(ride.createdAt.toDate(), 'MMM dd, p') : 'Vuba aha'}
                           </p>
                        </div>
                     </div>
                     <div className="text-right">
                        <Badge className="bg-secondary/10 text-secondary border-none font-black italic text-[10px] mb-2 px-3 py-1">COMPLETED</Badge>
                        <p className="text-lg font-black text-accent italic">1,200 RWF</p>
                     </div>
                  </Card>
                ))}
                {!rideHistory?.length && (
                  <div className="py-32 text-center opacity-10">
                    <History size={80} className="mx-auto mb-6" />
                    <p className="font-black uppercase text-sm tracking-[0.5em]">Nta mateka arahari</p>
                  </div>
                )}
             </div>
          </div>
        ) : (
          <div className="space-y-10 animate-in slide-in-from-right-5 duration-500 pb-24">
             <div className="p-14 rounded-[3.5rem] bg-[#0F172A] border border-white/5 text-center relative overflow-hidden shadow-2xl">
                <div className="size-32 rounded-[2.5rem] bg-secondary/20 flex items-center justify-center text-secondary mx-auto mb-8 shadow-2xl border-2 border-secondary/10 relative z-10">
                   <User size={64} strokeWidth={1.5}/>
                </div>
                <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white relative z-10">{userProfile?.name}</h2>
                <p className="text-sm font-bold text-white/30 uppercase tracking-[0.5em] mt-4 relative z-10">{userProfile?.phone}</p>
                <div className="absolute top-0 right-0 size-64 bg-secondary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                <div className="absolute bottom-0 left-0 size-48 bg-accent/5 rounded-full -ml-24 -mb-24 blur-2xl" />
             </div>

             <div className="grid gap-6">
                <ProfileCard icon={Star} label="Rating" value="4.9 Stars" color="text-accent" />
                <ProfileCard icon={History} label="Ingendo Zose" value={rideHistory?.length || 0} color="text-secondary" />
                <ProfileCard icon={Navigation} label="Umujyi" value="Kigali, Rwanda" color="text-blue-400" />
             </div>

             <Button 
               onClick={handleLogout}
               className="w-full h-24 rounded-[2.5rem] bg-red-500/10 text-red-500 border border-red-500/10 font-black text-lg uppercase tracking-[0.4em] hover:bg-red-500 hover:text-white transition-all shadow-2xl group mt-10 active:scale-95"
             >
               <LogOut size={24} className="mr-5 group-hover:scale-110 transition-transform" /> GUSOHOKA
             </Button>
          </div>
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden h-24 bg-[#0F172A]/90 border-t border-white/5 flex items-center justify-around px-8 sticky bottom-0 z-50 backdrop-blur-2xl shadow-2xl">
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
      className={`flex flex-col items-center gap-2 transition-all ${active ? 'text-secondary scale-125' : 'text-white/20'}`}
    >
      <Icon size={26} fill={active ? 'currentColor' : 'none'} />
      <span className="text-[8px] font-black uppercase tracking-[0.2em]">{label}</span>
    </button>
  );
}

function ProfileCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="p-8 rounded-[2.5rem] bg-[#0F172A] border border-white/5 flex items-center justify-between shadow-xl hover:bg-white/5 transition-colors group">
       <div className="flex items-center gap-8">
          <div className={`size-16 rounded-[1.5rem] bg-white/5 flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
             <Icon size={32}/>
          </div>
          <div>
             <p className="text-[11px] font-black text-white/20 uppercase tracking-[0.3em] mb-1.5">{label}</p>
             <p className="font-black text-2xl uppercase italic text-white">{value}</p>
          </div>
       </div>
    </div>
  );
}
