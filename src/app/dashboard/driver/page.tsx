'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Bike, Car, LogOut, Navigation, User, Phone, Star, Loader2, ShieldCheck, MapPin, MessageSquare, Send, Satellite, X, History, UserCircle, Mail } from 'lucide-react';
import { collection, doc, updateDoc, query, where, serverTimestamp, addDoc, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { translations, Language } from '@/lib/translations';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

const GOOGLE_MAPS_API_KEY = "AIzaSyBYd7EGaMpDouB0Br1yUSwRarQeToFuiiA";
const containerStyle = { width: "100%", height: "100%" };
const kigaliCenter = { lat: -1.9441, lng: 30.0619 };

export default function DriverDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useState(kigaliCenter);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [mapTypeId, setMapTypeId] = useState('roadmap');
  const [activeView, setActiveView] = useState<'map' | 'profile' | 'history'>('map');
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [distance, setDistance] = useState<string | null>(null);

  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });
  const { data: profile } = useDoc(user ? `users/${user.uid}` : null);
  const { data: driver, loading: dLoading } = useDoc(user ? `drivers/${user.uid}` : null);

  const lang = (profile?.language as Language) || 'rw';
  const t = translations[lang];

  const status = driver?.status || 'offline';
  const isOnline = status === 'online';
  const isBusy = status === 'busy';
  const isApproved = driver?.verificationStatus === 'approved';
  const vehicleType = driver?.vehicleType || 'moto';

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !isOnline || !isApproved) return null;
    return query(collection(db, 'rides'), where('status', '==', 'requested'), where('vehicleType', '==', vehicleType));
  }, [db, isOnline, isApproved, vehicleType]);
  const { data: requests } = useCollection(requestsQuery);

  const activeQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'rides'), where('driverId', '==', user.uid), where('status', 'in', ['accepted', 'started']));
  }, [db, user]);
  const { data: activeRides } = useCollection(activeQuery);
  const currentRide = activeRides?.[0];

  const historyQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'rides'),
      where('driverId', '==', user.uid),
      where('status', '==', 'completed'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  }, [db, user]);
  const { data: rideHistory } = useCollection(historyQuery);

  const chatQuery = useMemoFirebase(() => {
    if (!db || !currentRide) return null;
    return query(collection(db, 'rides', currentRide.rideId, 'messages'), orderBy('createdAt', 'asc'));
  }, [db, currentRide]);
  const { data: messages } = useCollection(chatQuery);

  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(newLoc);
          if (db && user && (isOnline || isBusy)) {
            updateDoc(doc(db, 'drivers', user.uid), { currentLocation: newLoc, updatedAt: serverTimestamp() });
          }
        },
        null, { enableHighAccuracy: true }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [db, user, isOnline, isBusy]);

  // Handle Directions & Distance to Passenger
  useEffect(() => {
    if (isLoaded && currentRide?.passengerLocation && location && isBusy) {
      const service = new google.maps.DirectionsService();
      service.route(
        {
          origin: location,
          destination: currentRide.passengerLocation,
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
  }, [isLoaded, currentRide?.passengerLocation, location, isBusy]);

  async function toggleStatus() {
    if (!db || !user || !isApproved || isBusy) return;
    await updateDoc(doc(db, 'drivers', user.uid), { status: isOnline ? 'offline' : 'online', updatedAt: serverTimestamp() });
  }

  async function acceptRide(rideId: string) {
    if (!db || !user) return;
    await updateDoc(doc(db, 'rides', rideId), {
      status: 'accepted',
      driverId: user.uid,
      driverName: profile?.name || 'Umushoferi',
      driverPhone: profile?.phone || ''
    });
    await updateDoc(doc(db, 'drivers', user.uid), { status: 'busy', updatedAt: serverTimestamp() });
  }

  async function handleUpdateRideStatus(ride: any) {
    if (!db || !user || !ride) return;
    const rideRef = doc(db, 'rides', ride.rideId);
    const driverRef = doc(db, 'drivers', user.uid);
    if (ride.status === 'accepted') {
      await updateDoc(rideRef, { status: 'started' });
    } else if (ride.status === 'started') {
      await updateDoc(rideRef, { status: 'completed', completedAt: serverTimestamp() });
      await updateDoc(driverRef, { status: 'online' });
    }
  }

  async function sendMessage() {
    if (!db || !currentRide || !chatMessage.trim()) return;
    const msg = chatMessage;
    setChatMessage('');
    await addDoc(collection(db, 'rides', currentRide.rideId, 'messages'), {
      text: msg,
      senderId: user?.uid,
      senderName: profile?.name,
      createdAt: serverTimestamp()
    });
  }

  if (dLoading) return <div className="h-screen flex items-center justify-center bg-[#070b14]"><Loader2 className="animate-spin text-secondary size-10" /></div>;
  
  if (!isApproved) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#070b14] text-white p-10 text-center">
        <ShieldCheck className="size-20 text-accent mb-6"/>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-4">Konti iragenzurwa</h1>
        <p className="text-white/40 max-w-md font-bold text-sm uppercase tracking-widest">Genzura amakuru yawe arimo kurangira. Murakoze kwihangana.</p>
    </div>
  )

  return (
    <div className="h-screen w-screen overflow-hidden relative flex flex-col bg-[#070b14] text-white">
      {/* Map View */}
      {activeView === 'map' && (
        <>
          {isLoaded ? (
            <GoogleMap 
              mapContainerStyle={containerStyle} 
              center={location} 
              zoom={16} 
              mapTypeId={mapTypeId}
              options={{ 
                disableDefaultUI: true, 
                styles: [{featureType:"all",elementType:"all",stylers:[{invert_lightness:!0},{saturation:10},{lightness:30},{gamma:.9},{hue:"#435158"}]}] 
              }}
            >
              <Marker position={location} icon={{ url: vehicleType === 'moto' ? 'https://cdn-icons-png.flaticon.com/512/3194/3194514.png' : 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png', scaledSize: { width: 50, height: 50 } as any }} />
              
              {currentRide?.passengerLocation && (
                <>
                   <Marker position={currentRide.passengerLocation} icon={{ url: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', scaledSize: { width: 40, height: 40 } as any }} />
                   <InfoWindow position={currentRide.passengerLocation}>
                      <div className="text-[10px] font-bold text-slate-900">{currentRide.passengerName}</div>
                   </InfoWindow>
                </>
              )}

              {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true, polylineOptions: { strokeColor: '#FACC15', strokeWeight: 5 } }} />}
            </GoogleMap>
          ) : <div className="h-full w-full bg-slate-900 animate-pulse" />}
          
          <div className="absolute top-4 inset-x-4 z-10 flex flex-col gap-2">
            <div className="max-w-md mx-auto w-full bg-black/40 backdrop-blur-xl rounded-[2rem] p-4 border border-white/10 flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-4">
                    <div className={`size-12 rounded-2xl flex items-center justify-center ${vehicleType === 'moto' ? 'bg-secondary/20 text-secondary' : 'bg-accent/20 text-accent'}`}>
                        {vehicleType === 'moto' ? <Bike size={24}/> : <Car size={24}/>}
                    </div>
                    <div>
                        <p className="font-black text-sm uppercase tracking-tight">{profile?.name || 'Umushoferi'}</p>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-0.5">{driver?.plateNumber}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={() => setMapTypeId(mapTypeId === 'roadmap' ? 'hybrid' : 'roadmap')} size="icon" variant="ghost" className="rounded-xl bg-white/5"><Satellite size={18}/></Button>
                    <Button onClick={() => setActiveView('profile')} size="icon" variant="ghost" className="rounded-xl bg-white/5"><User size={18}/></Button>
                </div>
            </div>
            {distance && isBusy && (
              <div className="max-w-md mx-auto w-full bg-secondary/90 text-[#0F172A] p-2 rounded-full text-center text-[10px] font-black uppercase tracking-widest animate-pulse">
                Uruhetse ruri mu ntera ya {distance}
              </div>
            )}
          </div>

          <div className="absolute bottom-4 inset-x-4 z-10">
            <div className="max-w-md mx-auto space-y-4">
                {currentRide ? (
                   <div className="space-y-4">
                      {showChat ? (
                        <Card className="bg-black/60 backdrop-blur-2xl border-white/10 rounded-[2.5rem] p-4 h-[400px] flex flex-col text-white shadow-2xl">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <h3 className="font-black uppercase text-xs tracking-widest">{currentRide.passengerName}</h3>
                                <Button variant="ghost" size="icon" onClick={() => setShowChat(false)} className="rounded-full bg-white/5"><X size={16}/></Button>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
                               {messages?.map((m: any) => (
                                 <div key={m.id} className={`flex ${m.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-3 rounded-2xl max-w-[80%] text-xs font-bold ${m.senderId === user?.uid ? 'bg-secondary text-black shadow-lg' : 'bg-white/10'}`}>
                                       {m.text}
                                    </div>
                                 </div>
                               ))}
                            </div>
                            <div className="mt-4 flex gap-2">
                                <Input value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="Andika..." className="bg-white/5 border-none h-12 rounded-xl text-xs font-bold px-4" />
                                <Button onClick={sendMessage} size="icon" className="bg-secondary text-black rounded-xl h-12 w-12 shadow-xl"><Send size={18}/></Button>
                            </div>
                        </Card>
                      ) : (
                        <Card className="rounded-[2.5rem] border-white/10 bg-black/60 backdrop-blur-2xl p-6 text-white animate-in slide-in-from-bottom-5 shadow-2xl">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="size-14 rounded-2xl bg-secondary/10 flex items-center justify-center">
                                    <User size={28} className="text-secondary" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Umugenzi</p>
                                    <h3 className="text-xl font-black uppercase tracking-tight">{currentRide.passengerName}</h3>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => setShowChat(true)} size="icon" className="size-12 rounded-2xl bg-accent text-accent-foreground shadow-lg"><MessageSquare size={20}/></Button>
                                <a href={`tel:${currentRide.passengerPhone}`} className="size-12 rounded-2xl bg-secondary text-black flex items-center justify-center shadow-lg active:scale-95"><Phone size={20} /></a>
                            </div>
                          </div>
                          <Button onClick={() => handleUpdateRideStatus(currentRide)} className="w-full h-16 rounded-2xl bg-secondary text-black font-black text-lg uppercase tracking-widest shadow-2xl active:scale-95 transition-all">
                              {currentRide.status === 'accepted' ? 'TANGIRA URUGENDO' : 'SOZA URUGENDO'}
                          </Button>
                        </Card>
                      )}
                   </div>
                ) : isOnline ? (
                  requests?.length ? (
                    requests.map((req: any) => (
                      <Card key={req.rideId} className="rounded-[2rem] border-white/10 bg-black/60 backdrop-blur-2xl p-6 flex items-center justify-between gap-4 animate-in slide-in-from-bottom-5 text-white shadow-2xl">
                        <div className="flex items-center gap-4">
                          <div className="size-14 rounded-2xl bg-secondary/10 flex items-center justify-center">
                            <User size={28} className="text-secondary" />
                          </div>
                          <div>
                            <h3 className="font-black uppercase tracking-tight">{req.passengerName}</h3>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-1">Hafi yawe</p>
                          </div>
                        </div>
                        <Button onClick={() => acceptRide(req.rideId)} className="h-14 px-8 rounded-2xl bg-secondary text-black font-black text-xs tracking-widest shadow-xl active:scale-95">
                          TAKE TRIP
                        </Button>
                      </Card>
                    ))
                  ) : (
                    <div className="bg-black/40 backdrop-blur-xl p-10 rounded-[2.5rem] text-center space-y-4 border border-white/10 shadow-2xl">
                      <Navigation className="size-12 mx-auto animate-pulse text-secondary" />
                      <h2 className="text-xl font-black uppercase tracking-tighter">Tegereje abagenzi...</h2>
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Uri ku kazi, amasegonda arimo kubarwa.</p>
                      <Button onClick={() => setActiveView('history')} variant="ghost" className="text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white"><History size={12} className="mr-2"/> Reba amateka</Button>
                    </div>
                  )
                ) : (
                  <div className="bg-black/40 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 flex items-center justify-between shadow-2xl">
                      <div className="px-2">
                          <p className="font-black text-lg uppercase tracking-tighter">Nturi ku kazi</p>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Kanda hano uhindure</p>
                      </div>
                      <Switch 
                          checked={isOnline} 
                          onCheckedChange={toggleStatus} 
                          disabled={isBusy}
                          className="h-10 w-16 data-[state=checked]:bg-secondary"
                      />
                  </div>
                )}
            </div>
          </div>
        </>
      )}

      {/* Profile & History Views */}
      {(activeView === 'profile' || activeView === 'history') && (
        <div className="flex-1 p-8 overflow-y-auto bg-[#070b14] animate-in slide-in-from-right-10 duration-500">
           <header className="flex items-center justify-between mb-10">
              <Button onClick={() => setActiveView('map')} variant="ghost" className="rounded-2xl bg-white/5 text-white"><ArrowRight className="rotate-180 mr-2"/> NYUMA</Button>
              <h2 className="text-2xl font-black uppercase tracking-tighter italic">{activeView}</h2>
              <div className="size-10" />
           </header>

           {activeView === 'profile' && (
             <div className="max-w-md mx-auto space-y-6">
                <div className="p-10 rounded-[3rem] bg-white/5 border border-white/5 text-center shadow-2xl relative overflow-hidden">
                   <div className="size-24 mx-auto rounded-[2rem] bg-accent/20 flex items-center justify-center text-accent mb-4 shadow-lg">
                      <UserCircle size={60}/>
                   </div>
                   <h3 className="text-3xl font-black uppercase tracking-tighter">{profile?.name || 'Driver'}</h3>
                   <p className="text-xs font-bold text-white/20 uppercase tracking-widest mt-2">{profile?.phone}</p>
                </div>
                <div className="grid gap-4">
                    <DriverInfoCard icon={Mail} label="Email" value={profile?.email} />
                    <DriverInfoCard icon={ShieldCheck} label="Vehicle" value={driver?.vehicleType} />
                    <DriverInfoCard icon={Navigation} label="License" value={driver?.licenseNumber || '---'} />
                    <DriverInfoCard icon={Star} label="Rating" value={ (driver?.rating || 4.8).toFixed(1) } />
                </div>
                <Button onClick={() => signOut(auth!)} className="w-full h-16 rounded-[2rem] bg-red-500/10 text-red-500 font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all mt-8">
                   <LogOut size={18} className="mr-2"/> GUSOHOKA
                </Button>
             </div>
           )}

           {activeView === 'history' && (
             <div className="max-w-md mx-auto space-y-4">
                {rideHistory?.map((ride: any) => (
                  <Card key={ride.rideId} className="bg-white/5 border-white/5 rounded-[2rem] p-6 shadow-xl">
                     <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                           <div className="size-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                              <User size={20}/>
                           </div>
                           <div>
                              <p className="font-black text-sm uppercase">{ride.passengerName}</p>
                              <p className="text-[9px] font-bold text-white/20 uppercase">{ride.createdAt?.toDate ? format(ride.createdAt.toDate(), 'PPP p') : 'Unknown'}</p>
                           </div>
                        </div>
                        <span className="text-[10px] font-black text-secondary bg-secondary/10 px-2 py-1 rounded-full uppercase">COMPLETED</span>
                     </div>
                  </Card>
                ))}
                {!rideHistory?.length && (
                  <div className="py-20 text-center opacity-20">
                     <History size={60} className="mx-auto mb-4"/>
                     <p className="font-black uppercase text-xs tracking-widest">Nta mateka y'ingendo ahari</p>
                  </div>
                )}
             </div>
           )}
        </div>
      )}
    </div>
  );
}

function DriverInfoCard({ icon: Icon, label, value }: any) {
  return (
    <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 flex items-center gap-5 shadow-lg">
       <div className="size-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
          <Icon size={22}/>
       </div>
       <div>
          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">{label}</p>
          <p className="font-bold text-sm mt-0.5">{value || 'N/A'}</p>
       </div>
    </div>
  );
}
