import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, BarChart3, Lock, Shield } from 'lucide-react';

export default function Home() {

  return (
    <div className="flex min-h-screen flex-col mx-auto justify-center items-center">
     

      <main className="flex-1">
        <section className="container space-y-6 py-24 sm:py-32">
          <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center">
            <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl lg:text-7xl">
              Optimize Your Amazon Bids
              <br />
              with Precision
            </h1>
            <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
              Advanced algorithms and real-time analytics to maximize your ROI on Amazon advertising campaigns
            </p>
            <div className="flex gap-4">
              <Button size="lg" asChild>
                <Link href="/sign-in">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/optimization">Start Optimization</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="container py-12 md:py-24">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Smart Analytics</h3>
              <p className="text-muted-foreground">
                Real-time performance tracking and intelligent bid adjustments based on your goals
              </p>
            </div>
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Enterprise Security</h3>
              <p className="text-muted-foreground">
                Bank-grade encryption and GDPR compliance to keep your data safe and secure
              </p>
            </div>
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Advanced Access Control</h3>
              <p className="text-muted-foreground">
                Role-based permissions and detailed audit logs for team collaboration
              </p>
            </div>
          </div>
        </section>
      </main>


    </div>
  );
}