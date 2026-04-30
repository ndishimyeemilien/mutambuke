'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  MapPin, User, LogOut, Loader2, Navigation, Bike, Car as CarIcon,
  X, Star, Phone, MessageSquare, Send, LocateFixed,
  Satellite, Sun, Moon, ArrowRight, Frown, UserCircle, Mail, ShieldCheck, History, MoreVertical, CheckCircle2
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
import { Badge } from '@/components/ui/badge';

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
  const [isNightMode, setIsNightMode] = useState(true);
  const [mapTypeId, setMapTypeId] = useState<google.maps.MapTypeId | string>('roadmap');
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
  const { data: availableDrivers } = useCollection(ridersQuery);

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
        null, { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [db, currentRide]);

  useEffect(() => {
    if (isLoaded && driverData?.currentLocation && passengerLocation && currentRide) {
      const service = new google.maps.DirectionsService();
      service.route({
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
      
      {/* Navbar UI (Desktop & Mobile Labels Fixed) */}
      <header className={`h-16 flex items-center justify-between px-6 border-b ${isNightMode ? 'bg-[#0F172A]/80 border-white/[0.04]' : 'bg-white border-slate-200'} backdrop-blur-xl z-50`}>
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
             <Image src="/logo.png" alt="Logo" width={30} height={30} />
          </div>
          <span className="font-black text-lg tracking-tighter uppercase">MUTAMBUKE</span>
        </div>

        <nav className="hidden md:flex gap-8">
            {['home', 'history', 'profile'].map((tab) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab as any)}
                  className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'text-secondary' : 'opacity-40 hover:opacity-100'}`}
                >
                    {tab === 'home' ? 'UMUGENZI' : tab === 'history' ? 'IBYATAMBUTSE' : 'UMWIRONDORO'}
                </button>
            ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button onClick={() => setIsNightMode(!isNightMode)} variant="ghost" size="icon" className="rounded-xl">
            {isNightMode ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          <Button onClick={() => setMapTypeId(mapTypeId === 'roadmap' ? 'hybrid' : 'roadmap')} variant="ghost" size="icon" className="rounded-xl">
            <Satellite size={18} />
          </Button>
        </div>
      </header>

      {/* Main Split View */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Map (50% or full on mobile) */}
        <div className={`flex-1 relative border-r ${isNightMode ? 'border-white/[0.04]' : 'border-slate-200'}`}>
           {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={passengerLocation}
                  zoom={16}
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
            
            {!currentRide && (
                <div className="absolute top-4 left-4 z-10 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest">
                    {availableDrivers?.length || 0} Abashoferi bari hafi
                </div>
            )}
        </div>

        {/* Right Side: Interaction Panel (Fixed 400px on desktop) */}
        <div className={`hidden md:flex flex-col w-[450px] overflow-y-auto ${isNightMode ? 'bg-[#0F172A]' : 'bg-white'}`}>
            
            {activeTab === 'home' && (
                <div className="p-8 space-y-8 animate-in slide-in-from-right-10">
                    {currentRide ? (
                        <div className="space-y-6">
                            <Card className={`p-6 rounded-[2rem] border-none shadow-2xl ${isNightMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                                <div className="flex items-center justify-between mb-6">
                                   <div className="flex items-center gap-4">
                                      <div className="size-16 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                                         {currentRide.vehicleType === 'moto' ? <Bike size={32}/> : <CarIcon size={32}/>}
                                      </div>
                                      <div>
                                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentRide.status === 'requested' ? 'Gushakisha...' : 'Umushoferi ari mu nzira'}</p>
                                         <h3 className="text-xl font-black uppercase">{currentRide.driverName || '---'}</h3>
                                         {driverData?.plateNumber && <Badge className="bg-accent text-accent-foreground font-black italic mt-1">{driverData.plateNumber}</Badge>}
                                      </div>
                                   </div>
                                   <Button variant="outline" size="icon" onClick={cancelRide} className="rounded-xl text-red-500 border-red-500/20"><X size={20}/></Button>
                                </div>
                                {distance && <div className="p-4 rounded-2xl bg-secondary/10 text-secondary text-center text-xs font-black uppercase tracking-widest">Uruhetse ruri mu ntera ya {distance}</div>}
                            </Card>

                            {currentRide.status !== 'requested' && (
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <a href={`tel:${currentRide.driverPhone}`} className="flex-1 h-14 rounded-2xl bg-secondary text-white font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl"><Phone size={20}/> HAMAGARA</a>
                                        <Button className="flex-1 h-14 rounded-2xl bg-accent text-accent-foreground font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl"><MessageSquare size={20}/> TEXT</Button>
                                    </div>

                                    {/* Live Chat UI */}
                                    <div className={`h-[350px] flex flex-col rounded-[2.5rem] border ${isNightMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                                            {messages?.map((m: any) => (
                                                <div key={m.id} className={`flex ${m.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`p-4 rounded-2xl max-w-[80%] text-xs font-bold ${m.senderId === user?.uid ? 'bg-secondary text-white' : 'bg-white/10 text-white'}`}>
                                                        {m.text}
                                                    </div>
                                                </div>
                                            ))}
                                            {!messages?.length && <div className="h-full flex items-center justify-center opacity-20 text-[10px] font-black uppercase">Nta butumwa burimo</div>}
                                        </div>
                                        <div className="p-4 border-t border-white/5 flex gap-2">
                                            <Input value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="Andika..." className="bg-transparent border-none h-12 rounded-xl text-xs font-bold" />
                                            <Button onClick={sendMessage} size="icon" className="bg-secondary text-white rounded-xl h-12 w-12"><Send size={18}/></Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Find a Ride</h2>
                                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Wizere Mutambuke ku ngendo zawe</p>
                            </div>

                            <div className="grid gap-4">
                               <button onClick={() => handleQuickRequest('moto')} disabled={isRequesting} className="group h-32 rounded-[2.5rem] bg-secondary/10 border-2 border-secondary/20 hover:bg-secondary/20 transition-all flex items-center p-8 gap-6 text-left active:scale-95 disabled:opacity-50">
                                  <div className="size-16 rounded-3xl bg-secondary flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
                                    <Bike size={40} />
                                  </div>
                                  <div>
                                    <span className="font-black uppercase text-xl tracking-tight block">SABA MOTO</span>
                                    <span className="text-[10px] font-black text-secondary/60 uppercase tracking-widest">Yihuta mu muhanda</span>
                                  </div>
                               </button>
                               <button onClick={() => handleQuickRequest('taxi')} disabled={isRequesting} className="group h-32 rounded-[2.5rem] bg-accent/10 border-2 border-accent/20 hover:bg-accent/20 transition-all flex items-center p-8 gap-6 text-left active:scale-95 disabled:opacity-50">
                                  <div className="size-16 rounded-3xl bg-accent flex items-center justify-center text-accent-foreground shadow-xl group-hover:scale-110 transition-transform">
                                    <CarIcon size={40} />
                                  </div>
                                  <div>
                                    <span className="font-black uppercase text-xl tracking-tight block">SABA TAXI</span>
                                    <span className="text-[10px] font-black text-accent/60 uppercase tracking-widest">Umutekano n'ubwisanzure</span>
                                  </div>
                               </button>
                            </div>
                            
                            <div className="pt-8">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Abashoferi bari hafi</h4>
                                <div className="space-y-3">
                                    {availableDrivers?.slice(0,4).map((d: any) => (
                                        <div key={d.driverId} className={`p-4 rounded-2xl border ${isNightMode ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'} flex items-center justify-between`}>
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-xl bg-slate-800 flex items-center justify-center text-white font-black text-xs uppercase">
                                                    {d.plateNumber?.slice(-2)}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase">{d.vehicleType}</p>
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase">{d.plateNumber}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 text-accent">
                                                <Star size={10} fill="currentColor"/>
                                                <span className="text-[10px] font-black">4.8</span>
                                            </div>
                                        </div>
                                    ))}
                                    {!availableDrivers?.length && <div className="py-10 text-center opacity-20 font-black uppercase text-[10px] tracking-widest">Nta bashoferi bari hafi</div>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'profile' && (
                <div className="p-10 animate-in slide-in-from-right-10 h-full flex flex-col">
                    <div className="text-center mb-10">
                       <div className="size-24 mx-auto rounded-[2rem] bg-secondary/10 flex items-center justify-center text-secondary mb-6 shadow-2xl">
                          <UserCircle size={70}/>
                       </div>
                       <h2 className="text-3xl font-black uppercase tracking-tighter">{userProfile?.name}</h2>
                       <p className="text-xs font-bold text-white/30 uppercase tracking-[0.4em] mt-2">{userProfile?.phone}</p>
                    </div>
                    <div className="space-y-4 flex-1">
                       <ProfileItem icon={Mail} label="Email" value={userProfile?.email} />
                       <ProfileItem icon={ShieldCheck} label="Role" value={userProfile?.role} />
                       <ProfileItem icon={History} label="Trips" value={rideHistory?.length || 0} />
                    </div>
                    <Button onClick={handleLogout} className="w-full h-16 rounded-[2rem] bg-red-500/10 text-red-500 border-2 border-red-500/10 text-sm font-black uppercase tracking-widest shadow-2xl mt-10 hover:bg-red-500 hover:text-white transition-all">
                       <LogOut className="mr-3" size={20}/> GUSOHOKA
                    </Button>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="p-8 animate-in slide-in-from-left-10 overflow-y-auto">
                    <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3 mb-8"><History className="text-secondary"/> IBYATAMBUTSE</h2>
                    <div className="space-y-4">
                        {rideHistory?.map((ride: any) => (
                            <Card key={ride.rideId} className={`p-6 rounded-[2rem] border-none ${isNightMode ? 'bg-white/5' : 'bg-slate-100'}`}>
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
                            </Card>
                        ))}
                        {!rideHistory?.length && <div className="py-32 text-center opacity-20"><Frown size={60} className="mx-auto mb-4"/> <p className="font-black uppercase text-xs tracking-widest">Nta mateka y'ingendo ahari</p></div>}
                    </div>
                </div>
            )}
        </div>
      </main>

      {/* Bottom Nav (Mobile Only Labels Fixed) */}
      <nav className={`md:hidden h-20 flex justify-around items-center border-t ${isNightMode ? 'bg-[#0F172A] border-white/[0.04]' : 'bg-white border-slate-200'} z-[60]`}>
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
       <div className="size-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
          <Icon size={22}/>
       </div>
       <div>
          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">{label}</p>
          <p className="font-bold text-sm mt-1">{value || '---'}</p>
       </div>
    </div>
  );
}
