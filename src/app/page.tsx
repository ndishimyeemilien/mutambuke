import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function Home() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-image');

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <div className="size-8 rounded bg-primary" />
            <span>Studio App</span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Button variant="ghost" size="sm">Features</Button>
            <Button variant="ghost" size="sm">About</Button>
            <Button size="sm">Get Started</Button>
          </nav>
        </Container>
      </header>

      <main className="flex-1">
        <section className="py-20 md:py-32">
          <Container>
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div className="flex flex-col gap-6">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                  Build your next idea <br />
                  <span className="text-muted-foreground">with Firebase Studio</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-[600px]">
                  A high-performance starter template featuring Next.js 15, ShadCN UI, and seamless Firebase integration.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <Button size="lg" className="px-8">
                    Start Prototyping
                  </Button>
                  <Button size="lg" variant="outline" className="px-8">
                    View Documentation
                  </Button>
                </div>
              </div>
              <div className="relative aspect-video overflow-hidden rounded-xl border shadow-2xl">
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
            </div>
          </Container>
        </section>
      </main>

      <footer className="border-t py-12 bg-muted/40">
        <Container className="flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Studio App. Built with Firebase Studio.
          </p>
          <div className="flex gap-4">
            <Button variant="link" size="sm" className="text-muted-foreground">Privacy</Button>
            <Button variant="link" size="sm" className="text-muted-foreground">Terms</Button>
          </div>
        </Container>
      </footer>
    </div>
  );
}
