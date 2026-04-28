
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  ArrowLeft, 
  Loader2, 
  Globe, 
  CheckCircle2, 
  Phone, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Calendar, 
  Car, 
  FileText, 
  Languages, 
  Camera,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth, useFirestore, useUser, useDoc } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
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
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  
  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // Driver specific fields
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [licenseCategory, setLicenseCategory] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const auth = useAuth();
  const db = useFirestore();

  const logo = PlaceHolderImages.find(img => img.id === 'logo');

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
      const cleanPhone = phone.trim().replace(/\s+/g, '');
      const internalEmail = `${cleanPhone}@mutambuke.com`;

      if (isLogin) {
        await signInWithEmailAndPassword(auth, internalEmail, password);
        setIsSuccess(true);
      } else {
        if (!name.trim()) throw new Error(t.fullName);
        if (!phone.trim()) throw new Error(t.phone);
        if (role === 'driver' && !plateNumber.trim()) throw new Error(t.plateNumber);

        const userCredential = await createUserWithEmailAndPassword(auth, internalEmail, password);
        const newUser = userCredential.user;

        const userData = {
          userId: newUser.uid,
          name: name.trim(),
          email: internalEmail,
          phone: cleanPhone,
          role: role,
          language: lang,
          createdAt: serverTimestamp(),
        };

        await setDoc(doc(db, 'users', newUser.uid), userData);

        if (role === 'driver') {
          await setDoc(doc(db, 'drivers', newUser.uid), {
            driverId: newUser.uid,
            status: 'offline',
            verificationStatus: 'pending',
            vehicleType: vehicleBrand.toLowerCase().includes('moto') ? 'moto' : 'taxi',
            plateNumber: plateNumber.trim().toUpperCase(),
            gender,
            dob,
            licenseCategory,
            vehicleModel,
            licenseNumber,
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

  const InputWrapper = ({ icon: Icon, children, className = "" }: { icon: any, children: React.ReactNode, className?: string }) => (
    <div className={`relative group ${className}`}>
      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors">
        <Icon size={20} />
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1f2d3a] flex flex-col items-center justify-center p-4 md:p-8 font-body text-white">
      {isSuccess && (
        <div className="fixed inset-0 z-50 bg-[#1f2d3a] flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="size-24 rounded-[2rem] bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6 scale-110 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
            <CheckCircle2 className="size-12" />
          </div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">SUCCESSFUL</h2>
          <p className="text-slate-400 font-bold italic mt-2">Connecting to Mutambuke network...</p>
        </div>
      )}

      <div className="max-w-md w-full space-y-8">
        {/* Language Selector */}
        <div className="flex justify-end">
          <Select value={lang} onValueChange={(v: Language) => setLang(v)}>
            <SelectTrigger className="w-[120px] h-10 rounded-xl bg-slate-800/50 border-slate-700/50 text-xs font-black">
              <Globe className="size-3 mr-2 text-blue-400" />
              <SelectValue placeholder="Lang" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-700 bg-slate-900 text-white">
              <SelectItem value="rw" className="font-black">RWANDA</SelectItem>
              <SelectItem value="en" className="font-black">ENGLISH</SelectItem>
              <SelectItem value="fr" className="font-black">FRANÇAIS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Form Container */}
        <div className="space-y-6">
          {/* Header Toggle */}
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4 mb-8">
              <Button 
                onClick={() => setRole('passenger')}
                className={`h-24 rounded-[1.5rem] border-2 flex flex-col items-center justify-center gap-2 transition-all ${role === 'passenger' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-slate-800/30 border-slate-700/50 text-slate-500'}`}
              >
                <div className="size-8 rounded-full bg-slate-700/50 flex items-center justify-center" />
                <span className="text-[10px] font-black uppercase tracking-widest">{t.passenger}</span>
              </Button>
              <Button 
                onClick={() => setRole('driver')}
                className={`h-24 rounded-[1.5rem] border-2 flex flex-col items-center justify-center gap-2 transition-all ${role === 'driver' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-slate-800/30 border-slate-700/50 text-slate-500'}`}
              >
                <ShieldCheck className="size-8" />
                <span className="text-[10px] font-black uppercase tracking-widest">{t.rider}</span>
              </Button>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {/* Common Fields */}
            {!isLogin && (
              <InputWrapper icon={User}>
                <Input 
                  placeholder={t.fullName} 
                  className="h-14 pl-14 rounded-2xl bg-slate-800/40 border-slate-700/50 focus:border-blue-500/50 transition-all font-bold placeholder:text-slate-500" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </InputWrapper>
            )}

            <InputWrapper icon={Phone}>
              <Input 
                placeholder={t.phone} 
                className="h-14 pl-14 rounded-2xl bg-slate-800/40 border-slate-700/50 focus:border-blue-500/50 transition-all font-bold placeholder:text-slate-500" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                required 
              />
            </InputWrapper>

            <InputWrapper icon={Lock}>
              <Input 
                type={showPassword ? "text" : "password"}
                placeholder={t.password} 
                className="h-14 pl-14 pr-12 rounded-2xl bg-slate-800/40 border-slate-700/50 focus:border-blue-500/50 transition-all font-bold placeholder:text-slate-500" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </InputWrapper>

            {/* Driver Specific Section */}
            {!isLogin && role === 'driver' && (
              <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center justify-center gap-2 py-2">
                   <div className="h-px bg-slate-700/50 flex-1" />
                   <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      <CheckCircle2 size={12} className="text-blue-500" />
                      {t.driverDetails}
                   </div>
                   <div className="h-px bg-slate-700/50 flex-1" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <InputWrapper icon={User}>
                    <Input 
                      placeholder={t.gender} 
                      className="h-14 pl-14 rounded-2xl bg-slate-800/40 border-slate-700/50 font-bold placeholder:text-slate-500" 
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    />
                  </InputWrapper>
                  <InputWrapper icon={Calendar}>
                    <Input 
                      placeholder={t.dob} 
                      className="h-14 pl-14 rounded-2xl bg-slate-800/40 border-slate-700/50 font-bold placeholder:text-slate-500" 
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                    />
                  </InputWrapper>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <InputWrapper icon={Car}>
                    <Input 
                      placeholder={t.vehicleBrand} 
                      className="h-14 pl-14 rounded-2xl bg-slate-800/40 border-slate-700/50 font-bold placeholder:text-slate-500" 
                      value={vehicleBrand}
                      onChange={(e) => setVehicleBrand(e.target.value)}
                    />
                  </InputWrapper>
                  <InputWrapper icon={FileText}>
                    <Input 
                      placeholder={t.licenseCategory} 
                      className="h-14 pl-14 rounded-2xl bg-slate-800/40 border-slate-700/50 font-bold placeholder:text-slate-500" 
                      value={licenseCategory}
                      onChange={(e) => setLicenseCategory(e.target.value)}
                    />
                  </InputWrapper>
                </div>

                <InputWrapper icon={Car}>
                  <Input 
                    placeholder={t.vehicleModel} 
                    className="h-14 pl-14 rounded-2xl bg-slate-800/40 border-slate-700/50 font-bold placeholder:text-slate-500" 
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                  />
                </InputWrapper>

                <InputWrapper icon={Languages}>
                  <Input 
                    placeholder={t.plateNumber} 
                    className="h-14 pl-14 rounded-2xl bg-slate-800/40 border-slate-700/50 font-bold placeholder:text-slate-500 uppercase" 
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                  />
                </InputWrapper>

                <InputWrapper icon={FileText}>
                  <Input 
                    placeholder={t.licenseNumber} 
                    className="h-14 pl-14 rounded-2xl bg-slate-800/40 border-slate-700/50 font-bold placeholder:text-slate-500" 
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                  />
                </InputWrapper>

                <InputWrapper icon={Camera}>
                  <Input 
                    placeholder={t.profilePhoto} 
                    className="h-14 pl-14 rounded-2xl bg-slate-800/40 border-slate-700/50 font-bold placeholder:text-slate-500" 
                    readOnly
                  />
                </InputWrapper>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-6">
              <Button 
                type="submit" 
                className="w-full h-16 rounded-2xl bg-gradient-to-r from-[#4d6b82] to-[#3a4a58] hover:opacity-90 text-white text-xl font-black italic shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2 group"
                disabled={isLoading || isSuccess}
              >
                {isLoading ? <Loader2 className="animate-spin" /> : (
                  <>
                    {isLogin ? t.login : t.signup}
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Toggle Login/Register */}
          <div className="text-center pt-4">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 hover:text-blue-300 transition-colors"
            >
              {isLogin ? "Kora konti nshya" : "Sanzwe ufite konti? Yinjira"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
