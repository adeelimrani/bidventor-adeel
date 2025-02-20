import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import sendMail from '@/utils/sendMail';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log(body);
    
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json(
        { message: 'Email and role are required' },
        { status: 400 }
      );
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');

    // Save invitation in DB
    await prisma.invitation.create({
      data: { email, role, token },
    });

    // Send invitation email
    const inviteLink = `http://localhost:3000/invite?token=${token}`;
    const subject = "You're Invited!"
    await sendMail(email, subject, inviteLink);

    return NextResponse.json(
      { message: 'Invitation sent successfully!' },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Error sending invitation' },
      { status: 500 }
    );
  }
}