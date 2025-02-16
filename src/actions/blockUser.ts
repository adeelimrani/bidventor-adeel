"use server";
import { CheckUser } from "@/lib/checkuser";
import prisma from "@/utils/prisma";
import { User } from "@prisma/client";
import { revalidatePath } from "next/cache";

async function blockUsers(userId:string,blocked:boolean) {
  const user = await CheckUser();
  
//   const userId = user?.id
  
  if (!user) {
    return {error: "User not found"};
  }
  try {
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { blocked },
      });
      revalidatePath('/admin')
    return {response: updatedUser};
  } catch (error) {
    return {error: "Failed to get UsgetUsers"};
  }
  }

  export default blockUsers;