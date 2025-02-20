'use server';

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { clerkClient, createClerkClient } from '@clerk/nextjs/server';
import { CheckUser } from '@/lib/checkuser';
import sendMail from '@/utils/sendMail';

export async function acceptInvitation(token: string) {
  try {
    if (!token) {
      return { error: 'Token is required', status: 400 };
    }
    const client = await clerkClient()

    // Find the invitation in the database
    const invite = await prisma.invitation.findUnique({ where: { token } });
    if (!invite || invite.used) {
      return { error: 'Invalid or expired token', status: 400 };
    }

    // Hash token as password
    const hashedPassword = token
    // User names
    const username = invite.name

    // Register user in Clerk & Prisma
    const clerkUser = await client.users.createUser({
      emailAddress: [invite.email],
      firstName: invite.name as string,
      password: token, // Clerk handles hashing internally
    });
    console.log("clerkUser", clerkUser);
    // const data = await CheckUser()
    
    const user = await prisma.user.create({
      data: {
        clerkUserId: clerkUser.id,
        name: username,
        email: invite.email,
        password: hashedPassword, // Store hashed password for reference
        Role: invite.role,
      },
    });
    console.log("data", user);

    // Mark invitation as used
    await prisma.invitation.update({
      where: { token },
      data: { used: true },
    });

    sendMail(user.email, "Password - Bidventor", `Your password is ${hashedPassword}`)
    return { response: 'User registered and logged in successfully!', status: 201 };
  } catch (error) {
    return { error: 'Error accepting invitation', status: 500 };
  }
}
