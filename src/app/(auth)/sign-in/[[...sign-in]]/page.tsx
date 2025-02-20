"use client"
import { SignIn } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation';

export default function Page() {
    const searchParams = useSearchParams();
    const invitation = searchParams.get('invitation');
  return (
  <>
  <div className='m-auto  px-4 sm:px-6 lg:px-8 bg-pattern min-h-screen flex flex-col items-center justify-center'>
  {invitation && <p className='my-4 text-xl font-mono text-foreground'>Please check your Inbox for password</p>}
  <SignIn />
  </div>
  
  </>
  )
}