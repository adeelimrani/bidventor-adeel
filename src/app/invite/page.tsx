"use client";
import { acceptInvitation } from '@/actions/acceptInvite';
import { useSearchParams, useRouter, notFound } from 'next/navigation';
import { useState, useEffect, Suspense } from "react";
import { toast } from 'sonner';

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [message, setMessage] = useState("");

  async function handleAcceptInvite() {
    if (!token) return notFound();
    
    const { response, error } = await acceptInvitation(token);

    if (error) {
      setMessage(error);
    } else {
      setMessage(response as string);

      toast.info("Your password is sent to your email");
      router.push("/sign-in?invitation=true"); // Redirect to sign-in page after authentication
    }
  }

  useEffect(() => {
    if (!token) return notFound();
    if (token) handleAcceptInvite();

  }, [token]);

  return (
    <div className='mx-auto container h-[80vh] flex flex-col justify-center items-center'>
      <h2 className='text-xl'>Processing Invitation...</h2>
      {message && <p className='text-red-500'>{message}</p>}
    </div>
  );
}

export default function AcceptInvite() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AcceptInviteContent />
    </Suspense>
  );
}