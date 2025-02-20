"use client";
import { SignIn } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SignInContent() {
  const searchParams = useSearchParams();
  const invitation = searchParams.get('invitation');

  return (
    <>
      <div className='m-auto px-4 sm:px-6 lg:px-8 bg-pattern min-h-screen flex flex-col items-center justify-center'>
        {invitation && (
          <p className='my-4 text-xl font-mono text-gray-600'>
            Please check your Inbox for password
          </p>
        )}
        <SignIn />
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}