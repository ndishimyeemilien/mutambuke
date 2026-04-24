
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { MapPin, ShieldCheck, Smartphone, Star, CheckCircle2, UserCircle2, Bike } from "lucide-react";

export default function Home() {
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
          <nav className="hidden md:flex gap-8 font-medium">
            <a href="#" className="hover:text-primary transition-colors">Home</a>
            <a href="#" className="hover:text-primary transition-colors">About</a>
            <a href="#" className="hover:text-primary transition-colors">Services</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </nav>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Login</Button>
            <Button size="sm">Register</Button>
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
                <Button size="lg" className="px-8 bg-primary hover:bg-primary/90">
                  Book a Ride
                </Button>
                <Button size="lg" className="px-8 bg-secondary hover:bg-secondary/90 text-white">
                  Become a Rider
                </Button>
              </div>
              <div className="relative aspect-[16/10] max-w-md rounded-2xl overflow-hidden border-4 border-white shadow-2xl">
                {mapImage && (
                  <Image
                    src={mapImage.imageUrl}
                    alt={mapImage.description}
                    fill
                    className="object-cover"
                    data-ai-hint={mapImage.imageHint}
                  />
                )}
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

        {/* How It Works */}
        <section className="py-24 bg-white">
          <Container>
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">How It Works</h2>
              <div className="w-24 h-1 bg-secondary mx-auto"></div>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-t-4 border-t-primary">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold mb-8 text-primary text-center">For Passengers</h3>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <UserCircle2 className="size-6" />
                      </div>
                      <div>
                        <p className="font-bold">Sign Up</p>
                        <p className="text-sm text-muted-foreground">Create your account in seconds</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Smartphone className="size-6" />
                      </div>
                      <div>
                        <p className="font-bold">Request a Ride</p>
                        <p className="text-sm text-muted-foreground">Set your destination and get a rider</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <MapPin className="size-6" />
                      </div>
                      <div>
                        <p className="font-bold">Track Your Rider</p>
                        <p className="text-sm text-muted-foreground">See your rider arriving in real-time</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-secondary">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold mb-8 text-secondary text-center">For Riders</h3>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                        <UserCircle2 className="size-6" />
                      </div>
                      <div>
                        <p className="font-bold">Register</p>
                        <p className="text-sm text-muted-foreground">Submit your documents for verification</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                        <ShieldCheck className="size-6" />
                      </div>
                      <div>
                        <p className="font-bold">Get Approved</p>
                        <p className="text-sm text-muted-foreground">Start your journey with us once verified</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                        <Bike className="size-6" />
                      </div>
                      <div>
                        <p className="font-bold">Start Earning</p>
                        <p className="text-sm text-muted-foreground">Accept rides and grow your business</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Container>
        </section>

        {/* Features */}
        <section className="py-24 bg-muted/30">
          <Container>
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Our Features</h2>
              <div className="w-24 h-1 bg-secondary mx-auto"></div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: MapPin, title: "Live GPS Tracking", color: "text-red-500" },
                { icon: ShieldCheck, title: "Safe & Trusted Riders", color: "text-green-500" },
                { icon: Smartphone, title: "Mobile Money Payment", color: "text-blue-500" },
                { icon: Star, title: "Ratings & Reviews", color: "text-orange-500" },
              ].map((feature, i) => (
                <div key={i} className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className={`size-16 rounded-full bg-muted flex items-center justify-center mb-4 ${feature.color}`}>
                    <feature.icon className="size-8" />
                  </div>
                  <h4 className="font-bold">{feature.title}</h4>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Why Choose Us */}
        <section className="py-24 bg-white">
          <Container className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <h2 className="text-3xl font-bold border-l-4 border-l-primary pl-4">Why Choose Us?</h2>
              <ul className="space-y-4">
                {["Quick Transport", "Easy Booking", "Safe Rides"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                    <CheckCircle2 className="text-green-500" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-8">
              <h2 className="text-3xl font-bold border-l-4 border-l-secondary pl-4">For Riders</h2>
              <ul className="space-y-4">
                {["More Customers", "Steady Income", "Flexible Work"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                    <CheckCircle2 className="text-green-500" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </section>

        {/* CTA */}
        <section className="py-20 bg-primary text-white">
          <Container className="text-center space-y-8">
            <h2 className="text-4xl font-bold">Get Started Today!</h2>
            <p className="text-xl opacity-90">Join MUTAMBUKE Now</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" variant="secondary" className="px-12">Register Now</Button>
              <Button size="lg" variant="outline" className="px-12 bg-transparent text-white border-white hover:bg-white/10">Login</Button>
            </div>
          </Container>
        </section>
      </main>

      <footer className="py-12 bg-slate-900 text-slate-400">
        <Container className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 font-bold text-2xl text-white">
            <Bike className="size-8 text-primary" />
            <span>MUTAMBUKE</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} Mutambuke System. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </Container>
      </footer>
    </div>
  );
}
