'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  MapPin, User, LogOut, Loader2, Navigation, Bike, Car as CarIcon,
  X, Star, Phone, MessageSquare, Send, LocateFixed,
  Menu, Bell, ChevronDown, Home, History, Search, Plus
} from 'lucide-react';
import { collection, doc, setDoc, query, where, serverTimestamp, updateDoc, addDoc, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const GOOGLE_MAPS_API_KEY = "AIzaSyBYd7EGaMpDouB0Br1yUSwRarQeToFuiiA";
const kigaliCenter = { lat: -1.9441, lng: 30.0619 };

const DARK_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1e293b" }] },
  { "feature": "administrative", "elementType": "geometry", "stylers": [{ "color": "#334155" }] },
  { "feature": "poi", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "feature": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#334155" }] },
  { "feature": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#64748b" }] },
  { "feature": "water", "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] }
];

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

  const rideHistoryQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'rides'),
      where('passengerId', '==', user.uid),
      where('status', '==', 'completed'),
      orderBy('createdAt', 'desc'),
      limit(15)
    );
  }, [db, user]);
  const { data: rideHistory } = useCollection(rideHistoryQuery);

  const ridersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'drivers'),
      where('status', '==', 'online'),
      where('verificationStatus', '==', 'approved')
    );
  }, [db]);
  const { data: availableDrivers } = useCollection(ridersQuery);

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

  async function handleFindRide() {
    if (!db || !user) return;
    setIsRequesting(true);
    try {
      const rideId = doc(collection(db, 'rides')).id;
      await setDoc(doc(db, 'rides', rideId), {
        rideId,
        passengerId: user.uid,
        passengerName: userProfile?.name || 'User',
        passengerPhone: userProfile?.phone || '',
        pickupLocation: passengerLocation,
        destination: 'Not specified',
        status: 'requested',
        vehicleType: vehicleType,
        createdAt: serverTimestamp()
      });
      toast({ title: "Gushakisha umushoferi..." });
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
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
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0F172A] relative text-white font-body">
      
      {/* TOP HEADER */}
      <header className="absolute top-0 inset-x-0 h-16 flex items-center justify-between px-4 z-50 bg-[#0F172A]/80 backdrop-blur-md border-b border-white/5 shadow-2xl">
        <Button variant="ghost" size="icon" className="text-white">
          <Menu size={24} />
        </Button>
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8">
            <Image src="/logo.png" alt="MUTAMBUKE" fill className="object-contain" priority />
          </div>
          <span className="font-black text-lg tracking-tighter text-white italic">MUTAMBUKE</span>
        </div>
        <div className="relative">
          <Button variant="ghost" size="icon" className="text-white">
            <Bell size={24} />
            <div className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-[#0F172A]" />
          </Button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 relative pt-16">
        {activeTab === 'home' ? (
          <>
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={passengerLocation}
                zoom={15}
                options={{
                  disableDefaultUI: true,
                  styles: DARK_MAP_STYLE
                }}
                onLoad={(map) => { mapRef.current = map; }}
              >
                <Marker position={passengerLocation} icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: "#22C55E",
                  fillOpacity: 1,
                  strokeWeight: 4,
                  strokeColor: "rgba(34, 197, 94, 0.2)",
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
            ) : <div className="size-full bg-[#0F172A]" />}

            <div className="absolute top-20 inset-x-4 z-20">
               <Card className="p-4 flex items-center justify-between shadow-2xl border-none rounded-2xl bg-white/10 backdrop-blur-xl border-white/5">
                  <div className="flex items-center gap-3">
                     <div className="size-2 rounded-full bg-secondary shadow-[0_0_10px_#22C55E]" />
                     <div>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-none mb-1">Aho uri</p>
                        <p className="text-sm font-black text-white">Kigali, Rwanda</p>
                     </div>
                  </div>
                  <ChevronDown className="text-white/40" size={20} />
               </Card>
            </div>

            <Button 
              onClick={() => mapRef.current?.panTo(passengerLocation)} 
              size="icon" 
              className="absolute bottom-[48%] right-4 z-20 rounded-full bg-[#0F172A]/80 backdrop-blur-md shadow-2xl text-white hover:bg-[#0F172A] border-white/5"
            >
              <LocateFixed size={20} />
            </Button>

            {/* Floating Bottom Ride Panel */}
            <div className="absolute bottom-16 inset-x-0 z-40">
              <div className="w-full bg-[#0F172A] rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.4)] p-6 pb-8 border-t border-white/5">
                <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6" />
                
                {currentRide ? (
                  <div className="space-y-6">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="size-14 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                              {currentRide.vehicleType === 'moto' ? <Bike size={32}/> : <CarIcon size={32}/>}
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{currentRide.status === 'requested' ? 'GUSHAKISHA...' : 'ARI MU NZIRA'}</p>
                              <h3 className="text-lg font-black text-white uppercase italic">{currentRide.driverName || 'Finding Driver...'}</h3>
                              {currentRide.driverPhone && <p className="text-xs font-bold text-secondary">{currentRide.driverPhone}</p>}
                           </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => updateDoc(doc(db!, 'rides', currentRide.rideId), { status: 'cancelled' })} className="text-red-500 hover:bg-red-500/10"><X size={24}/></Button>
                     </div>
                     <div className="p-8 text-center bg-white/5 rounded-2xl border-2 border-dashed border-white/5">
                        <Loader2 className="animate-spin text-secondary mx-auto mb-4 size-8" />
                        <p className="text-sm font-bold text-white/60 uppercase tracking-widest leading-relaxed">Turagushakira umumotari uri hafi yawe ako kanya...</p>
                     </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setVehicleType('moto')}
                        className={`p-5 rounded-2xl flex flex-col items-center gap-3 transition-all ${vehicleType === 'moto' ? 'bg-secondary text-white shadow-xl shadow-secondary/20' : 'bg-white/5 border border-white/5 text-white/40'}`}
                      >
                        <Bike size={32} />
                        <div className="text-center">
                          <p className="text-xs font-black uppercase">Moto</p>
                          <p className="text-[9px] font-bold opacity-60">1,200 RWF</p>
                        </div>
                      </button>
                      <button 
                        onClick={() => setVehicleType('taxi')}
                        className={`p-5 rounded-2xl flex flex-col items-center gap-3 transition-all ${vehicleType === 'taxi' ? 'bg-accent text-[#0F172A] shadow-xl shadow-accent/20' : 'bg-white/5 border border-white/5 text-white/40'}`}
                      >
                        <CarIcon size={32} />
                        <div className="text-center">
                          <p className="text-xs font-black uppercase">Taxi</p>
                          <p className="text-[9px] font-bold opacity-60">2,500 RWF</p>
                        </div>
                      </button>
                    </div>

                    <Button 
                      onClick={handleFindRide}
                      disabled={isRequesting}
                      className="w-full h-16 rounded-2xl bg-secondary hover:bg-secondary/90 text-white font-black text-lg uppercase tracking-widest shadow-2xl active:scale-95 transition-all italic"
                    >
                      {isRequesting ? <Loader2 className="animate-spin" /> : 'SHAKA URUGENDO'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : activeTab === 'history' ? (
          <div className="p-6 space-y-6 overflow-y-auto h-full pb-32 no-scrollbar">
             <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">IBYATAMBUTSE</h2>
             <div className="grid gap-4">
                {rideHistory?.map((ride: any) => (
                   <Card key={ride.id} className="p-5 rounded-2xl border-none bg-white/5 shadow-xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                           {ride.vehicleType === 'moto' ? <Bike size={24}/> : <CarIcon size={24}/>}
                        </div>
                        <div>
                           <p className="font-black text-white text-sm uppercase italic">{ride.driverName || 'Driver'}</p>
                           <p className="text-[10px] text-white/40 font-bold uppercase">{ride.createdAt?.toDate ? format(ride.createdAt.toDate(), 'MMM dd, p') : 'Recent'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="text-xs font-black text-secondary uppercase">Completed</p>
                         <p className="text-[10px] font-bold text-accent italic">1,200 RWF</p>
                      </div>
                   </Card>
                ))}
                {!rideHistory?.length && (
                  <div className="py-24 text-center opacity-20">
                    <History size={64} className="mx-auto mb-4" />
                    <p className="font-black uppercase text-xs tracking-[0.4em]">Nta mateka ahari</p>
                  </div>
                )}
             </div>
          </div>
        ) : (
          <div className="p-6 space-y-8 overflow-y-auto h-full pb-32 no-scrollbar">
             <div className="text-center py-10 relative overflow-hidden rounded-[3rem] bg-white/5 border border-white/5 shadow-2xl">
                <div className="size-24 rounded-[2rem] bg-secondary/10 flex items-center justify-center text-secondary mx-auto mb-4 border-2 border-secondary/20 shadow-xl">
                   <User size={48} strokeWidth={1.5} />
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">{userProfile?.name}</h2>
                <p className="text-xs font-bold text-white/30 uppercase tracking-[0.4em] mt-1">{userProfile?.phone}</p>
                <div className="absolute top-0 right-0 size-32 bg-secondary/5 rounded-full -mr-16 -mt-16" />
             </div>
             
             <div className="grid gap-3">
                <ProfileInfoRow icon={Star} label="Rating" value="4.8 Stars" color="text-accent" />
                <ProfileInfoRow icon={History} label="Ingendo Zose" value={rideHistory?.length || 0} color="text-secondary" />
                <ProfileInfoRow icon={Navigation} label="Kigali, Rwanda" value="Umujyi" color="text-blue-400" />
             </div>

             <Button 
               onClick={handleLogout}
               variant="outline" 
               className="w-full h-16 rounded-[2rem] border-red-500/20 bg-red-500/5 text-red-500 font-black text-xs uppercase tracking-[0.3em] hover:bg-red-500 hover:text-white transition-all shadow-xl"
             >
               <LogOut size={18} className="mr-3" /> GUSOHOKA
             </Button>
          </div>
        )}
      </main>

      {/* BOTTOM TAB NAVIGATION */}
      <nav className="h-20 bg-[#0F172A] border-t border-white/5 flex items-center justify-around px-6 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'home' ? 'text-secondary' : 'text-white/20 hover:text-white/40'}`}
        >
          <Home size={22} fill={activeTab === 'home' ? 'currentColor' : 'none'} />
          <span className="text-[9px] font-black uppercase tracking-widest">UMUGENZI</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'history' ? 'text-secondary' : 'text-white/20 hover:text-white/40'}`}
        >
          <History size={22} />
          <span className="text-[9px] font-black uppercase tracking-widest">IBYATAMBUTSE</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'profile' ? 'text-secondary' : 'text-white/20 hover:text-white/40'}`}
        >
          <User size={22} fill={activeTab === 'profile' ? 'currentColor' : 'none'} />
          <span className="text-[9px] font-black uppercase tracking-widest">UMWIRONDORO</span>
        </button>
      </nav>

    </div>
  );
}

function ProfileInfoRow({ icon: Icon, label, value, color }: any) {
  return (
    <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 flex items-center justify-between shadow-lg">
       <div className="flex items-center gap-4">
          <div className={`size-10 rounded-xl bg-white/5 flex items-center justify-center ${color}`}>
             <Icon size={20}/>
          </div>
          <div>
             <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">{label}</p>
             <p className="font-black text-sm uppercase italic">{value}</p>
          </div>
       </div>
    </div>
  );
}