import React from 'react'
import { BarChart3} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { CheckUser } from '@/lib/checkuser';

const Header =  async () => {
  const user = await CheckUser();

  return (
    <header className="border-b flex justify-center ">
    <div className="container flex h-16 items-center justify-between">
      <Link href={'/'} className="flex items-center gap-2 font-bold">
        <BarChart3 className="h-6 w-6" />
        <span>BidVentor</span>
      </Link>
      <nav className="flex gap-4">
      <SignedOut>
              <Button variant="secondary" asChild><Link href={"/sign-in"}>Log In</Link></Button>
              <Button variant="default" asChild><Link href={"/sign-up"}>Get Started</Link></Button>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
        
      </nav>
    </div>
  </header>
  )
}

export default Header
