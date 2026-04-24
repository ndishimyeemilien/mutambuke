
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { MapPin, ShieldCheck, Smartphone, Star, CheckCircle2, UserCircle2, Bike } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-moto');
  const mapImage = PlaceHolderImages.find(img => img.id === 'map-preview');

  return (
    <div className="flex flex-col min-h-screen font-body">
      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <Bike className="size-8" />
            <span>MUTAMBUKE</span>
          </div>
          <div className="flex gap-2">
            <Link href="/auth">
              <Button variant="outline" size="sm">Login</Button>
            </Link>
            <Link href="/auth">
              <Button size="sm">Register</Button>
            </Link>
          </div>
        </Container>
      </header>

      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-b from-primary/10 to-transparent py-20 lg:py-32">
          <Container className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl font-extrabold tracking-tight text-primary lg:text-6xl">
                  Mutambuke Transport System
                </h1>
                <p className="text-xl text-muted-foreground">
                  Connecting Passengers with Trusted Motorcycle Riders in Real-Time.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Link href="/auth">
                  <Button size="lg" className="px-8 bg-primary hover:bg-primary/90">Book a Ride</Button>
                </Link>
                <Link href="/auth">
                  <Button size="lg" className="px-8 bg-secondary hover:bg-secondary/90 text-white">Become a Rider</Button>
                </Link>
              </div>
            </div>
            <div className="relative aspect-square lg:aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
              {heroImage && (
                <Image
                  src={heroImage.imageUrl}
                  alt={heroImage.description}
                  fill
                  className="object-cover"
                  data-ai-hint={heroImage.imageHint}
                  priority
                />
              )}
            </div>
          </Container>
        </section>

        {/* Workflow Info (from image) */}
        <section className="py-24 bg-white">
          <Container className="grid md:grid-cols-2 gap-12">
            <Card className="shadow-lg border-none bg-blue-50/50">
              <CardContent className="p-8 space-y-6">
                <h3 className="text-2xl font-bold text-primary text-center">How Passengers Use Mutambuke</h3>
                <ol className="space-y-4">
                  {[
                    "Register Account",
                    "Login",
                    "See Nearby Riders on Map",
                    "Request Ride",
                    "Track Rider",
                    "Payment After Trip"
                  ].map((step, i) => (
                    <li key={i} className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
                      <div className="size-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">{i+1}</div>
                      <span className="font-medium">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-none bg-orange-50/50">
              <CardContent className="p-8 space-y-6">
                <h3 className="text-2xl font-bold text-secondary text-center">How Riders Use Mutambuke</h3>
                <ol className="space-y-4">
                  {[
                    "Register Account",
                    "Submit Documents",
                    "Go Online",
                    "Accept Requests",
                    "Start Trip",
                    "Receive Payment"
                  ].map((step, i) => (
                    <li key={i} className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
                      <div className="size-8 rounded-full bg-secondary text-white flex items-center justify-center font-bold">{i+1}</div>
                      <span className="font-medium">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </Container>
        </section>
      </main>
    </div>
  );
}
