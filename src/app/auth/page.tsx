
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Loader2, Globe, Hash, CheckCircle2 } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth, useFirestore, useUser, useDoc } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';
import Link from 'next/link';
import { translations, Language } from '@/lib/translations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

export default function AuthPage() {
  const [lang, setLang] = useState<Language>('rw');
  const t = translations[lang];
  const { toast } = useToast();
  const router = useRouter();

  const { user, loading: authLoading } = useUser();
  const { data: profile } = useDoc(user ? `users/${user.uid}` : null);
  
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  const [vehicleType, setVehicleType] = useState<'moto' | 'taxi'>('moto');
  const [plateNumber, setPlateNumber] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const auth = useAuth();
  const db = useFirestore();

  const authImage = PlaceHolderImages.find(img => img.id === 'auth-illustration');
  const logo = PlaceHolderImages.find(img => img.id === 'logo');

  // Unified redirection logic
  useEffect(() => {
    if (user && profile && isSuccess) {
      const timer = setTimeout(() => {
        router.replace('/');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, profile, isSuccess, router]);

  const getErrorMessage = (error: any) => {
    const code = error.code;
    if (code === 'auth/email-already-in-use') return t.errorEmailInUse;
    if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') return t.errorInvalidAuth;
    return error.message || t.errorGeneric;
  };

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!auth || !db) return;

    setIsLoading(true);
    try {
      if (isLogin) {
        let loginEmail = identifier.trim().toLowerCase();
        
        if (!loginEmail.includes('@')) {
          const q = query(collection(db, 'users'), where('phone', '==', identifier.trim()), limit(1));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            loginEmail = snapshot.docs[0].data().email;
          } else {
            throw { code: 'auth/user-not-found' };
          }
        }

        await signInWithEmailAndPassword(auth, loginEmail, password);
        setIsSuccess(true);
      } else {
        const cleanEmail = email.trim().toLowerCase();
        if (role === 'driver' && !plateNumber.trim()) {
          throw new Error(lang === 'rw' ? 'Ntabwo washyizeho plaque.' : 'Plate number is required.');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const newUser = userCredential.user;
        const userRole = cleanEmail === 'admin@mutambuke.com' ? 'admin' : role;

        const userData = {
          userId: newUser.uid,
          name: name.trim(),
          email: cleanEmail,
          phone: phone.trim(),
          role: userRole,
          language: lang,
          createdAt: serverTimestamp(),
        };

        await setDoc(doc(db, 'users', newUser.uid), userData);

        if (userRole === 'driver') {
          await setDoc(doc(db, 'drivers', newUser.uid), {
            driverId: newUser.uid,
            status: 'offline',
            verificationStatus: 'pending',
            vehicleType: vehicleType,
            plateNumber: plateNumber.trim().toUpperCase(),
            updatedAt: serverTimestamp(),
          });
        }

        setIsSuccess(true);
      }
    } catch (error: any) {
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: lang === 'rw' ? "Ikosa" : "Error",
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row overflow-hidden">
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
            {logo && <Image src={logo.imageUrl} alt="Logo" fill className="object-contain rounded-[2.5rem]" />}
          </div>
          <h1 className="text-7xl font-black italic mb-6 leading-[0.9] uppercase tracking-tighter">
            Join the <br /> <span className="text-secondary">Movement.</span>
          </h1>
          <p className="text-2xl font-medium opacity-90 max-w-md italic leading-tight">
            Connecting thousands of riders and passengers across the city every day.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center p-6 md:p-12 bg-white relative">
        {isSuccess && (
          <div className="absolute inset-0 z-50 bg-white flex flex-col items-center justify-center animate-in fade-in duration-300">
             <div className="size-24 rounded-[2rem] bg-green-100 flex items-center justify-center text-green-600 mb-6 scale-110">
                <CheckCircle2 className="size-12" />
             </div>
             <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">SUCCESSFUL</h2>
             <p className="text-slate-500 font-bold italic mt-2">Connecting to Mutambuke network...</p>
          </div>
        )}

        <div className="max-w-md w-full mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex justify-between items-center">
            <Link href="/landing" className="inline-flex items-center gap-2 text-slate-400 hover:text-primary transition-colors font-black text-xs uppercase italic tracking-widest">
              <ArrowLeft className="size-4" /> Home
            </Link>
            
            <Select value={lang} onValueChange={(v: Language) => setLang(v)}>
              <SelectTrigger className="w-[120px] h-10 rounded-xl bg-slate-50 border-none font-black text-xs">
                <Globe className="size-3 mr-2" />
                <SelectValue placeholder="Lang" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                <SelectItem value="rw" className="font-black">RWANDA</SelectItem>
                <SelectItem value="en" className="font-black">ENGLISH</SelectItem>
                <SelectItem value="fr" className="font-black">FRANÇAIS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <h2 className="text-4xl font-black italic text-slate-900 uppercase tracking-tighter">
              {isLogin ? t.welcome : t.createAccount}
            </h2>
            <p className="text-slate-500 font-bold italic text-sm">
              Access the MUTAMBUKE smart urban network.
            </p>
          </div>

          <Tabs value={isLogin ? 'login' : 'register'} onValueChange={(v) => setIsLogin(v === 'login')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl h-12 bg-slate-100 p-1 mb-8">
              <TabsTrigger value="login" className="rounded-xl font-black uppercase text-xs tracking-widest">{t.login}</TabsTrigger>
              <TabsTrigger value="register" className="rounded-xl font-black uppercase text-xs tracking-widest">{t.signup}</TabsTrigger>
            </TabsList>

            <form onSubmit={handleAuth} className="space-y-4">
              <TabsContent value="login" className="space-y-4 mt-0">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-2">{t.emailOrPhone}</Label>
                  <Input 
                    placeholder="Email or Phone Number" 
                    className="h-16 rounded-[1.25rem] border-slate-100 bg-slate-50 font-bold text-lg" 
                    required 
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-2">{t.password}</Label>
                  <Input 
                    placeholder="••••••••" 
                    className="h-16 rounded-[1.25rem] border-slate-100 bg-slate-50 font-bold text-lg" 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-2">{t.fullName}</Label>
                    <Input placeholder="John Doe" className="h-16 rounded-[1.25rem] border-slate-100 bg-slate-50 font-bold" required value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-2">{t.phone}</Label>
                    <Input placeholder="+250..." className="h-16 rounded-[1.25rem] border-slate-100 bg-slate-50 font-bold" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-2">EMAIL</Label>
                  <Input placeholder="email@example.com" className="h-16 rounded-[1.25rem] border-slate-100 bg-slate-50 font-bold" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-2">{t.password}</Label>
                  <Input placeholder="Min. 8 characters" className="h-16 rounded-[1.25rem] border-slate-100 bg-slate-50 font-bold" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-2">{t.registerAs}</Label>
                  <RadioGroup value={role} className="flex gap-4" onValueChange={(v) => setRole(v as any)}>
                    <div onClick={() => setRole('passenger')} className={`flex flex-1 items-center justify-between p-5 rounded-[1.25rem] border-2 cursor-pointer transition-all ${role === 'passenger' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100'}`}>
                      <span className="text-xs font-black uppercase tracking-widest">{t.passenger}</span>
                      <RadioGroupItem value="passenger" className="border-slate-200" />
                    </div>
                    <div onClick={() => setRole('driver')} className={`flex flex-1 items-center justify-between p-5 rounded-[1.25rem] border-2 cursor-pointer transition-all ${role === 'driver' ? 'border-secondary bg-secondary/5 text-secondary' : 'border-slate-100'}`}>
                      <span className="text-xs font-black uppercase tracking-widest">{t.rider}</span>
                      <RadioGroupItem value="driver" className="border-slate-200" />
                    </div>
                  </RadioGroup>
                </div>

                {role === 'driver' && (
                  <div className="animate-in slide-in-from-top-2 space-y-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-2">{t.plateNumber}</Label>
                      <div className="relative">
                        <Hash className="absolute left-5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input 
                          placeholder="RAA 000 A" 
                          className="h-16 pl-14 rounded-[1.25rem] border-slate-100 bg-slate-50 font-black uppercase tracking-widest" 
                          required 
                          value={plateNumber} 
                          onChange={(e) => setPlateNumber(e.target.value)} 
                        />
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <Button type="submit" className={`w-full h-20 rounded-[1.5rem] text-2xl font-black shadow-2xl transition-all active:scale-95 italic uppercase tracking-tighter ${role === 'driver' && !isLogin ? 'bg-secondary hover:bg-secondary/90' : 'bg-primary hover:bg-primary/90'}`} disabled={isLoading || isSuccess}>
                {isLoading ? <Loader2 className="animate-spin" /> : (isLogin ? t.login : t.signup)}
              </Button>
            </form>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
