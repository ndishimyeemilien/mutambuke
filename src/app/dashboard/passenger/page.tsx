'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  MapPin, User, LogOut, Loader2, Navigation, Bike, Car as CarIcon,
  X, Star, Phone, MessageSquare, Send, LocateFixed,
  Satellite, Sun, Moon, ArrowRight, Frown, UserCircle, Mail, ShieldCheck, History
} from 'lucide-react';
import { collection, doc, setDoc, query, where, serverTimestamp, updateDoc, addDoc, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { translations, Language } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

const GOOGLE_MAPS_API_KEY = "AIzaSyBYd7EGaMpDouB0Br1yUSwRarQeToFuiiA";
const kigaliCenter = { lat: -1.9441, lng: 30.0619 };

export default function PassengerDashboard() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'profile' | 'chat'>('home');
  const [isRequesting, setIsRequesting] = useState(false);
  const [passengerLocation, setPassengerLocation] = useState(kigaliCenter);
  const [isNightMode, setIsNightMode] = useState(true);
  const [mapTypeId, setMapTypeId] = useState<google.maps.MapTypeId | string>('roadmap');
  const [mapHeading, setMapHeading] = useState(0);
  const [chatMessage, setChatMessage] = useState('');
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  
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
      where('status', 'in', ['requested', 'accepted', 'started'])
    );
  }, [db, user]);
  const { data: activeRides } = useCollection(activeRideQuery);
  const currentRide = activeRides?.[0];

  const historyQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'rides'),
      where('passengerId', '==', user.uid),
      where('status', '==', 'completed'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  }, [db, user]);
  const { data: rideHistory } = useCollection(historyQuery);

  const { data: driverData } = useDoc(currentRide?.driverId ? `drivers/${currentRide.driverId}` : null);

  const ridersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'drivers'),
      where('status', '==', 'online'),
      where('verificationStatus', '==', 'approved')
    );
  }, [db]);
  const { data: availableDrivers, loading: driversLoading } = useCollection(ridersQuery);

  const chatQuery = useMemoFirebase(() => {
    if (!db || !currentRide) return null;
    return query(
      collection(db, 'rides', currentRide.rideId, 'messages'),
      orderBy('createdAt', 'asc')
    );
  }, [db, currentRide]);
  const { data: messages } = useCollection(chatQuery);

  const lang = (userProfile?.language as Language) || 'rw';
  const t = translations[lang];

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPassengerLocation(loc);
          if (db && currentRide && currentRide.status !== 'requested') {
            updateDoc(doc(db, 'rides', currentRide.rideId), { passengerLocation: loc });
          }
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [db, currentRide]);

  useEffect(() => {
    if (isLoaded && driverData?.currentLocation && passengerLocation && currentRide) {
      const service = new google.maps.DirectionsService();
      service.route(
        {
          origin: driverData.currentLocation,
          destination: passengerLocation,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "OK" && result) {
            setDirections(result);
            setDistance(result.routes[0].legs[0].distance?.text || null);
          }
        }
      );
    } else {
      setDirections(null);
      setDistance(null);
    }
  }, [isLoaded, driverData?.currentLocation, passengerLocation, currentRide]);

  async function handleQuickRequest(type: 'moto' | 'taxi') {
    if (!db || !user) return;
    setIsRequesting(true);
    try {
      const rideId = doc(collection(db, 'rides')).id;
      await setDoc(doc(db, 'rides', rideId), {
        rideId,
        passengerId: user.uid,
        passengerName: userProfile?.name || 'Anonymous',
        passengerPhone: userProfile?.phone || '',
        pickupLocation: passengerLocation,
        passengerLocation: passengerLocation,
        destination: null,
        status: 'requested',
        vehicleType: type,
        createdAt: serverTimestamp()
      });
      toast({ title: t.searching });
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    } finally {
      setIsRequesting(false);
    }
  }

  async function cancelRide() {
    if (!db || !currentRide) return;
    await updateDoc(doc(db, 'rides', currentRide.rideId), { status: 'cancelled' });
    if (currentRide.driverId) {
      await updateDoc(doc(db, 'drivers', currentRide.driverId), { status: 'online' });
    }
  }

  async function sendMessage() {
    if (!db || !currentRide || !chatMessage.trim()) return;
    const msg = chatMessage;
    setChatMessage('');
    await addDoc(collection(db, 'rides', currentRide.rideId, 'messages'), {
      text: msg,
      senderId: user?.uid,
      senderName: userProfile?.name || 'User',
      createdAt: serverTimestamp()
    });
  }

  async function handleLogout() {
    if (!auth) return;
    await signOut(auth);
    router.replace('/lib/auth');
  }

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-[#0F172A]"><Loader2 className="animate-spin text-secondary size-10" /></div>;

  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col ${isNightMode ? 'bg-[#0F172A] text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Header */}
      <header className={`h-16 flex items-center justify-between px-4 border-b ${isNightMode ? 'bg-[#0F172A]/80 border-white/[0.04]' : 'bg-white border-slate-200'} backdrop-blur-xl z-50`}>
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
             <Image src="/logo.png" alt="Logo" width={30} height={30} />
          </div>
          <span className="font-black text-lg tracking-tighter">MUTAMBUKE</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsNightMode(!isNightMode)} variant="ghost" size="icon" className="rounded-xl">
            {isNightMode ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          <Button onClick={() => setMapTypeId(mapTypeId === 'roadmap' ? 'hybrid' : mapTypeId === 'hybrid' ? 'satellite' : 'roadmap')} variant="ghost" size="icon" className="rounded-xl">
            <Satellite size={18} />
          </Button>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 relative">
        {activeTab === 'home' && (
          <>
            <div className="absolute inset-0 z-0">
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={passengerLocation}
                  zoom={16}
                  heading={mapHeading}
                  mapTypeId={mapTypeId}
                  options={{
                    disableDefaultUI: true,
                    styles: isNightMode ? [{featureType:"all",elementType:"all",stylers:[{invert_lightness:true},{saturation:10},{lightness:30},{gamma:0.9},{hue:"#435158"}]}] : []
                  }}
                  onLoad={(map) => { mapRef.current = map; }}
                >
                  <Marker position={passengerLocation} icon={{ url: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', scaledSize: { width: 40, height: 40 } as any }} />
                  
                  {!currentRide && availableDrivers?.map((d: any) => (
                    <Marker 
                      key={d.driverId}
                      position={d.currentLocation}
                      icon={{ url: d.vehicleType === 'moto' ? 'https://cdn-icons-png.flaticon.com/512/3194/3194514.png' : 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png', scaledSize: { width: 35, height: 35 } as any }}
                    />
                  ))}

                  {currentRide && driverData?.currentLocation && (
                    <Marker 
                      position={driverData.currentLocation}
                      icon={{ url: currentRide.vehicleType === 'moto' ? 'https://cdn-icons-png.flaticon.com/512/3194/3194514.png' : 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png', scaledSize: { width: 45, height: 45 } as any }}
                    />
                  )}

                  {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true, polylineOptions: { strokeColor: '#22C55E', strokeWeight: 5 } }} />}
                </GoogleMap>
              ) : <div className="size-full bg-slate-900 animate-pulse" />}
            </div>

            {/* Floating UI */}
            <div className="absolute top-4 inset-x-4 z-10">
               {currentRide ? (
                 <Card className="max-w-md mx-auto p-4 rounded-[2rem] bg-white/95 backdrop-blur-md border-none shadow-2xl flex items-center justify-between animate-in slide-in-from-top-5">
                    <div className="flex items-center gap-3">
                       <div className="size-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                          {currentRide.vehicleType === 'moto' ? <Bike size={24}/> : <CarIcon size={24}/>}
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{currentRide.status === 'requested' ? 'Gushakisha...' : 'Umushoferi ari mu nzira'}</p>
                          <h4 className="font-bold text-slate-900">{currentRide.driverName || 'Tegereza...'}</h4>
                          {distance && <p className="text-[9px] font-bold text-secondary uppercase">{distance} uvuye hano</p>}
                       </div>
                    </div>
                    <div className="flex gap-2">
                       {currentRide.status !== 'requested' && <Button size="icon" onClick={() => setActiveTab('chat')} className="rounded-xl bg-accent text-accent-foreground shadow-lg"><MessageSquare size={18}/></Button>}
                       <Button size="icon" variant="outline" onClick={cancelRide} className="rounded-xl text-red-500 border-red-100"><X size={18}/></Button>
                    </div>
                 </Card>
               ) : (
                 <div className="max-w-md mx-auto flex flex-col gap-2">
                    <div className="flex justify-between items-center bg-black/40 backdrop-blur-xl p-2 rounded-2xl border border-white/5">
                        <Button onClick={() => setMapHeading(h => (h + 90) % 360)} size="icon" variant="ghost" className="text-white"><LocateFixed size={20}/></Button>
                        <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em]">Hafi yawe hari abashoferi {availableDrivers?.length || 0}</p>
                        <div className="size-10" />
                    </div>
                 </div>
               )}
            </div>

            <div className="absolute bottom-4 inset-x-4 z-10">
               <div className="max-w-md mx-auto space-y-4">
                  {!currentRide && (
                    <div className="grid grid-cols-2 gap-4">
                       <button onClick={() => handleQuickRequest('moto')} disabled={isRequesting} className="h-32 rounded-[2.5rem] bg-secondary/10 border-2 border-secondary/20 text-secondary backdrop-blur-xl transition-all flex flex-col items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                          <Bike size={40} />
                          <span className="font-black uppercase text-xs tracking-widest">SABA MOTO</span>
                       </button>
                       <button onClick={() => handleQuickRequest('taxi')} disabled={isRequesting} className="h-32 rounded-[2.5rem] bg-accent/10 border-2 border-accent/20 text-accent backdrop-blur-xl transition-all flex flex-col items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                          <CarIcon size={40} />
                          <span className="font-black uppercase text-xs tracking-widest">SABA TAXI</span>
                       </button>
                    </div>
                  )}
               </div>
            </div>
          </>
        )}

        {activeTab === 'chat' && currentRide && (
          <div className="absolute inset-0 flex flex-col animate-in slide-in-from-right-full duration-500 bg-[#0F172A] z-50">
             <header className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <Button onClick={() => setActiveTab('home')} variant="ghost" size="icon" className="rounded-xl"><ArrowRight className="rotate-180"/></Button>
                   <div>
                      <h3 className="font-black text-sm uppercase tracking-tight">{currentRide.driverName}</h3>
                      <p className="text-[10px] font-bold text-white/30 uppercase">Ubutumwa m'uburyo bwa Text</p>
                   </div>
                </div>
                <a href={`tel:${currentRide.driverPhone}`} className="size-12 rounded-2xl bg-secondary text-white flex items-center justify-center shadow-xl"><Phone size={20}/></a>
             </header>
             <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                {messages?.map((m: any) => (
                  <div key={m.id} className={`flex ${m.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                     <div className={`p-4 rounded-[1.5rem] max-w-[80%] text-sm font-bold ${m.senderId === user?.uid ? 'bg-secondary text-white shadow-xl' : 'bg-white/10 text-white'}`}>
                        {m.text}
                     </div>
                  </div>
                ))}
             </div>
             <div className="p-6 bg-black/20 flex gap-3">
                <Input value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="Andika..." className="bg-white/5 border-white/10 h-14 rounded-2xl text-white font-bold" />
                <Button onClick={sendMessage} className="size-14 rounded-2xl bg-secondary text-white shadow-xl"><Send size={20}/></Button>
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="absolute inset-0 p-8 overflow-y-auto bg-[#0F172A] animate-in slide-in-from-right-10 duration-500 z-50">
             <div className="max-w-md mx-auto space-y-8">
                <div className="text-center">
                   <div className="size-28 mx-auto rounded-[2.5rem] bg-secondary/10 flex items-center justify-center text-secondary mb-6 shadow-2xl">
                      <UserCircle size={80}/>
                   </div>
                   <h2 className="text-4xl font-black uppercase tracking-tighter">{userProfile?.name}</h2>
                   <p className="text-xs font-bold text-white/30 uppercase tracking-[0.4em] mt-2">{userProfile?.phone}</p>
                </div>
                <div className="grid gap-4">
                   <ProfileItem icon={Mail} label="Imeyili" value={userProfile?.email} />
                   <ProfileItem icon={ShieldCheck} label="Uruhare" value={userProfile?.role} />
                   <ProfileItem icon={History} label="Ingendo Zose" value={rideHistory?.length || 0} />
                </div>
                <Button onClick={handleLogout} className="w-full h-20 rounded-[2.5rem] bg-red-500/10 text-red-500 border-2 border-red-500/10 text-lg font-black uppercase tracking-widest shadow-2xl mt-10 hover:bg-red-500 hover:text-white transition-all">
                   <LogOut className="mr-3" size={24}/> GUSOHOKA
                </Button>
             </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="absolute inset-0 p-8 overflow-y-auto bg-[#0F172A] animate-in slide-in-from-left-10 duration-500 z-50">
             <div className="max-w-md mx-auto space-y-6">
                <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3"><History className="text-secondary"/> IBYATAMBUTSE</h2>
                {rideHistory?.map((ride: any) => (
                  <Card key={ride.rideId} className="p-6 rounded-[2rem] bg-white/5 border-white/5 shadow-xl">
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                           <div className={`size-10 rounded-xl flex items-center justify-center ${ride.vehicleType === 'moto' ? 'bg-secondary/20 text-secondary' : 'bg-accent/20 text-accent'}`}>
                              {ride.vehicleType === 'moto' ? <Bike size={20}/> : <CarIcon size={20}/>}
                           </div>
                           <div>
                              <p className="font-black text-sm uppercase">{ride.driverName || 'N/A'}</p>
                              <p className="text-[9px] font-bold text-white/30 uppercase">{ride.createdAt?.toDate ? format(ride.createdAt.toDate(), 'PPP p') : 'Unknown'}</p>
                           </div>
                        </div>
                        <span className="text-[10px] font-black text-secondary bg-secondary/10 px-3 py-1 rounded-full">YARANGIYE</span>
                     </div>
                     <div className="flex items-center gap-3 text-xs text-white/40 border-t border-white/5 pt-4">
                        <MapPin size={14} className="text-secondary"/>
                        <span className="truncate">{ride.pickupLocation?.address || 'Kigali, Rwanda'}</span>
                     </div>
                  </Card>
                ))}
                {!rideHistory?.length && <div className="py-32 text-center opacity-20"><Frown size={60} className="mx-auto mb-4"/> <p className="font-black uppercase text-xs tracking-widest">Nta mateka y'ingendo ahari</p></div>}
             </div>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className={`h-20 flex justify-around items-center border-t ${isNightMode ? 'bg-[#0F172A] border-white/[0.04]' : 'bg-white border-slate-200'} z-[60]`}>
        {[
          { id: 'home', icon: Navigation, label: 'UMUGENZI' },
          { id: 'history', icon: History, label: 'IBYATAMBUTSE' },
          { id: 'profile', icon: UserCircle, label: 'UMWIRONDORO' }
        ].map((item: any) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? 'text-secondary scale-110' : 'opacity-30'}`}>
            <item.icon size={22} strokeWidth={activeTab === item.id ? 3 : 2} />
            <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function ProfileItem({ icon: Icon, label, value }: any) {
  return (
    <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 flex items-center gap-5 shadow-lg">
       <div className="size-14 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
          <Icon size={24}/>
       </div>
       <div>
          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">{label}</p>
          <p className="font-bold text-base mt-1">{value || '---'}</p>
       </div>
    </div>
  );
}
