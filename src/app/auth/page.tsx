'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Bike, User, Lock, ArrowLeft, Loader2, Car, Globe } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';
import Link from 'next/link';
import { translations, Language } from '@/lib/translations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from '@/hooks/use-toast';

export default function AuthPage() {
  const [lang, setLang] = useState<Language>('rw');
  const t = translations[lang];

  const { user, loading: authChecking } = useUser();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  const [vehicleType, setVehicleType] = useState<'moto' | 'taxi'>('moto');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  const auth = useAuth();
  const db = useFirestore();

  const authImage = PlaceHolderImages.find(img => img.id === 'auth-illustration');
  const logo = PlaceHolderImages.find(img => img.id === 'logo');

  useEffect(() => {
    // Only redirect if a user is settled and we are NOT currently trying to log in/register
    if (user && !isLoading && !authChecking) {
      router.replace('/');
    }
  }, [user, router, isLoading, authChecking]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!auth || !db) return;

    setIsLoading(true);
    try {
      if (isLogin) {
        let loginEmail = identifier.trim();
        
        // Phone number lookup logic
        if (!loginEmail.includes('@')) {
          const q = query(collection(db, 'users'), where('phone', '==', loginEmail), limit(1));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            loginEmail = snapshot.docs[0].data().email;
          } else {
            throw new Error(lang === 'rw' ? 'Nta konti ibonetse kuri iyi telefone.' : 'No account found with this phone number.');
          }
        }

        await signInWithEmailAndPassword(auth, loginEmail, password);
      } else {
        const cleanEmail = email.trim().toLowerCase();
        const cleanPhone = phone.trim();

        // Unique checks
        const emailQuery = query(collection(db, 'users'), where('email', '==', cleanEmail), limit(1));
        const emailSnapshot = await getDocs(emailQuery);
        if (!emailSnapshot.empty) {
          throw new Error(lang === 'rw' ? 'Iyi email isanzwe ikoreshwa.' : 'This email is already in use.');
        }

        const phoneQuery = query(collection(db, 'users'), where('phone', '==', cleanPhone), limit(1));
        const phoneSnapshot = await getDocs(phoneQuery);
        if (!phoneSnapshot.empty) {
          throw new Error(lang === 'rw' ? 'Iyi telefone isanzwe ikoreshwa.' : 'This phone number is already in use.');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const newUser = userCredential.user;

        const userRole = cleanEmail === 'adimini@gmail.com' ? 'admin' : role;

        const userData = {
          userId: newUser.uid,
          name: name.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          role: userRole,
          language: lang,
          createdAt: serverTimestamp(),
        };

        await setDoc(doc(db, 'users', newUser.uid), userData);

        if (userRole === 'driver') {
          await setDoc(doc(db, 'drivers', newUser.uid), {
            driverId: newUser.uid,
            status: 'offline',
            isVerified: false,
            vehicleType: vehicleType,
            updatedAt: serverTimestamp(),
          });
        }

        toast({
          title: "Success",
          description: lang === 'rw' ? "Konti yafunguwe neza!" : "Account created successfully!",
        });
      }
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (authChecking && !user) {
    return <div className="min-h-screen bg-white" />;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row overflow-hidden">
      {/* Left side Illustration - Hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 relative bg-slate-900">
        {authImage && (
          <Image
            src={authImage.imageUrl}
            alt="Auth illustration"
            fill
            className="object-cover opacity-60"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/40 to-transparent flex flex-col justify-center p-20 text-white z-10">
          <div className="relative w-32 h-32 mb-10">
            {logo && (
              <Image 
                src={logo.imageUrl} 
                alt="Logo" 
                fill 
                className="object-contain rounded-[2.5rem]" 
              />
            )}
          </div>
          <h1 className="text-7xl font-black italic mb-6 leading-[0.9] uppercase tracking-tighter">
            Join the <br /> <span className="text-secondary">Movement.</span>
          </h1>
          <p className="text-2xl font-medium opacity-90 max-w-md italic leading-tight">
            Connecting thousands of riders and passengers across the city every day.
          </p>
        </div>
      </div>

      {/* Right side Form */}
      <div className="flex-1 flex flex-col justify-center p-6 md:p-12 bg-white relative">
        <div className="max-w-md w-full mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <Link href="/landing" className="inline-flex items-center gap-2 text-slate-400 hover:text-primary transition-colors font-bold text-xs uppercase italic">
              <ArrowLeft className="size-4" /> Home
            </Link>
            
            <Select value={lang} onValueChange={(v: Language) => setLang(v)}>
              <SelectTrigger className="w-[120px] h-10 rounded-xl bg-slate-50 border-none font-bold text-xs">
                <Globe className="size-3 mr-2" />
                <SelectValue placeholder="Lang" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                <SelectItem value="rw" className="font-bold">RWANDA</SelectItem>
                <SelectItem value="en" className="font-bold">ENGLISH</SelectItem>
                <SelectItem value="fr" className="font-bold">FRANÇAIS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
             <div className="md:hidden relative w-20 h-20 mb-4">
                {logo && <Image src={logo.imageUrl} alt="Logo" fill className="object-contain rounded-2xl" />}
             </div>
            <h2 className="text-4xl font-black italic text-slate-900 uppercase tracking-tighter">
              {isLogin ? t.welcome : t.createAccount}
            </h2>
            <p className="text-slate-500 font-medium italic">
              Access the MUTAMBUKE smart urban network.
            </p>
          </div>

          <Tabs value={isLogin ? 'login' : 'register'} onValueChange={(v) => setIsLogin(v === 'login')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl h-12 bg-slate-100 p-1 mb-8">
              <TabsTrigger value="login" className="rounded-xl font-bold uppercase">{t.login}</TabsTrigger>
              <TabsTrigger value="register" className="rounded-xl font-bold uppercase">{t.signup}</TabsTrigger>
            </TabsList>

            <form onSubmit={handleAuth} className="space-y-4">
              <TabsContent value="login" className="space-y-4 mt-0">
                <div className="space-y-1">
                  <Label className="text-xs font-black text-slate-400 tracking-widest uppercase">{t.emailOrPhone}</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input 
                      placeholder="Email or Phone Number" 
                      className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold" 
                      required 
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-black text-slate-400 tracking-widest uppercase">{t.password}</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input 
                      placeholder="••••••••" 
                      className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold" 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-black text-slate-400 tracking-widest uppercase">{t.fullName}</Label>
                    <Input placeholder="John Doe" className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold" required value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-black text-slate-400 tracking-widest uppercase">{t.phone}</Label>
                    <Input placeholder="+250..." className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-black text-slate-400 tracking-widest uppercase">EMAIL</Label>
                  <Input placeholder="email@example.com" className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-black text-slate-400 tracking-widest uppercase">{t.password}</Label>
                  <Input placeholder="Min. 8 characters" className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="text-xs font-black text-slate-400 tracking-widest uppercase">{t.registerAs}</Label>
                  <RadioGroup defaultValue="passenger" className="flex gap-4" onValueChange={(v) => setRole(v as any)}>
                    <div className={`flex flex-1 items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${role === 'passenger' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100'}`}>
                      <span className="text-sm font-bold uppercase">{t.passenger}</span>
                      <RadioGroupItem value="passenger" className="border-slate-200" />
                    </div>
                    <div className={`flex flex-1 items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${role === 'driver' ? 'border-secondary bg-secondary/5 text-secondary' : 'border-slate-100'}`}>
                      <span className="text-sm font-bold uppercase">{t.rider}</span>
                      <RadioGroupItem value="driver" className="border-slate-200" />
                    </div>
                  </RadioGroup>
                </div>

                {role === 'driver' && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <Label className="text-xs font-black text-slate-400 tracking-widest uppercase">{t.vehicleType}</Label>
                    <RadioGroup defaultValue="moto" className="flex gap-4" onValueChange={(v) => setVehicleType(v as any)}>
                      <div className={`flex flex-1 items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${vehicleType === 'moto' ? 'border-secondary bg-secondary/5 text-secondary' : 'border-slate-100'}`}>
                        <div className="flex items-center gap-2">
                          <Bike className="size-4" />
                          <span className="text-sm font-bold">{t.moto}</span>
                        </div>
                        <RadioGroupItem value="moto" className="border-slate-200" />
                      </div>
                      <div className={`flex flex-1 items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${vehicleType === 'taxi' ? 'border-secondary bg-secondary/5 text-secondary' : 'border-slate-100'}`}>
                        <div className="flex items-center gap-2">
                          <Car className="size-4" />
                          <span className="text-sm font-bold">{t.taxi}</span>
                        </div>
                        <RadioGroupItem value="taxi" className="border-slate-200" />
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </TabsContent>

              <Button type="submit" className={`w-full h-16 rounded-2xl text-xl font-black shadow-lg transition-transform active:scale-95 italic ${role === 'driver' && !isLogin ? 'bg-secondary hover:bg-secondary/90' : 'bg-primary hover:bg-primary/90'}`} disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : (isLogin ? t.login : t.signup)}
              </Button>
            </form>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
