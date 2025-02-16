import prisma from "@/utils/prisma";
import { currentUser } from "@clerk/nextjs/server";



export const CheckUser = async () => {
    const user = await currentUser()

    // check for current user 
    if(!user){
        return null;
    }

    // check if user in the prisma 
    const loggedInUser = await prisma.user.findUnique({
        where: {
            clerkUserId: user.id
        }
    })

    // if user in prisma return user details
    if (loggedInUser){
        return loggedInUser
    }

    // if not in the prisma, create new user 
    const newUser = await prisma.user.create({
        data:{
            clerkUserId: user.id,
            name: `${user.firstName} ${user.lastName}`,
            imageUrl: user.imageUrl,
            email : user.emailAddresses[0]?.emailAddress!,
            Role: 'user',
            blocked: false
        }
    })
    
    return newUser
}