"use server";
import { CheckUser } from "@/lib/checkuser";
import prisma from "@/utils/prisma";
import { User } from "@prisma/client";

async function getAllUsers() {
  const user = await CheckUser();
  
  const userId = user?.id
  
  if (!userId) {
    return {error: "User not found"};
  }
  try {
    const getUsers= await prisma.user.findMany();
    
    return {response: getUsers};
  } catch (error) {
    return {error: "Failed to get UsgetUsers"};
  }
  }

  export default getAllUsers;