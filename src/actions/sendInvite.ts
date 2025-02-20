"use server";
import { CheckUser } from "@/lib/checkuser";
import prisma from "@/utils/prisma";
import sendMail from "@/utils/sendMail";
import crypto from 'crypto';


async function sendInvite(name:any, email:any, role:string) {
    console.log("role",name, role, email);
    const username = name
    const rolem = role.toLowerCase()
  const user = await CheckUser();
  
  const userId = user?.id
  
  if (!userId) {
    return {error: "User not found"};
  }
  try {


    if (!email || !role) {
      console.log("Invalid Email or Role");
      
    }

    // Generate secure token
    const tokengenerated = crypto.randomBytes(32).toString('hex');
    console.log("tokengenerated", tokengenerated);
    console.log("username", username);
    
    // Save invitation in DB
    const data = await prisma.invitation.create({
        data:{
            email: email,
            name: username,
            //@ts-ignore
            role: rolem,
            token: tokengenerated,
        }
    })
    console.log("send data to DB",data);
    
    // Send invitation email
    const inviteLink = `${process.env.NODE_ENV == 'development'? "http://localhost:3000/":"https://bidventor.vercel.app/"}invite?token=${tokengenerated}`;
    await sendMail(email, "You're Invited! - BidVentor", `You're Invited to join Bidventor. Click here to join: ${inviteLink}`);
    console.log("send email");
    
    return{response: "Success"}
  } catch (error) {
    return{response: "error"}

  }
  }

  export default sendInvite;