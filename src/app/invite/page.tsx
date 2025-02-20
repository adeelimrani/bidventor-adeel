"use client";
import { acceptInvitation } from '@/actions/acceptInvite';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from "react";
import { toast } from 'sonner';

export default function AcceptInvite() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [message, setMessage] = useState("");
  async function handleAcceptInvite() {
    if (!token) return;
    
    const { response, error } = await acceptInvitation(token);

    if (error) {
      setMessage(error);
    } else {
      setMessage(response as string);

      toast.info("Your password is send to your mail")
      router.push("/sign-in?invitation=true"); // Redirect to sign-in page after authentication
    }
  }

  useEffect(() => {
    if (token) handleAcceptInvite();
  }, [token]);

  return (
    <div className='mx-auto container h-[80vh]'>
      <h2 className='text-xl m-auto'>Processing Invitation...</h2>
      {message && <p>{message}</p>}
    </div>
  );
}
