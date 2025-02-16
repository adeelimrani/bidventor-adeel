"use client"

import blockUsers from "@/actions/blockUser";
import updateRole from "@/actions/updateRole";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  TableCell,
  TableRow
} from "@/components/ui/table";
import { useState } from "react";
import { toast } from "sonner";


const roles = ["Admin", "Manager", "User"];

export default function UserList({ users }: any) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")

  const generateDynamicMetrics = () => {
    const optimizations = Math.floor(Math.random() * 20) + 1 //Random number between 1 and 20

    return {
      optimizations,
    }
  }

  const sendEmail = async () => {
    setLoading(true)
    try {
    toast.loading("Sending mail...")
      
      const metrics = generateDynamicMetrics()

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: users.email,
          metrics,// Pass dynamic metrics to the API
        }),
      })

      if (!response.ok) toast.error("Failed to send email")
        toast.dismiss()
      toast.success("Successfully send email!")
      setStatus("success")
      setTimeout(() => setStatus("idle"), 3000)
    } catch (error) {
      console.error(error)
      setStatus("error")
      setTimeout(() => setStatus("idle"), 3000)
    } finally {
      setLoading(false)
    }
  }

  async function toggleBlock(userId: string, blocked: boolean) {
    toast.loading("Blocking/Unblocking...")
    const updatedUser = await blockUsers(userId, !blocked)
    if(updatedUser.response){
      toast.dismiss()
      toast.success("Successfully block user")
    }else{
      toast.dismiss()
      toast.error("Failed to block user")
    }
    
  }

  async function changeRole(userId: string, newRole: string) {
    toast.loading("Changing role...")
    const changeRole = await updateRole(userId, newRole)
    if(changeRole.response){
      toast.dismiss()
      toast.success("Successfully update user role")
    }else{
      toast.dismiss()
      toast.error("Failed to update user role")
    }
  }

  return (
    <>
    
    <TableRow>
      <TableCell className="font-medium">{users.email}</TableCell>
      <TableCell >2</TableCell>
      <TableCell >
      <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="uppercase">
                    {users.Role}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {roles.map((role) => (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => changeRole(users.id, role.toLowerCase())}
                      className={role.toLowerCase() === users.Role ? "font-bold text-orange-600 capitalize" : ""}
                    >
                      {role}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              </TableCell>
      <TableCell>
      <div className="flex justify-end items-end gap-2">
        <Button
          onClick={sendEmail}
          disabled={loading}
          size="sm"
          variant="outline"
        >
          {loading ? "Sending..." : "Send Email"}
        </Button>

        {status === "success" && (
          <span className="text-sm text-center text-green-500">Sent!</span>
        )}
        {status === "error" && (
          <span className="text-sm text-center text-red-500">Error</span>
        )}
        <Button variant={'default'} size="sm" onClick={() => toggleBlock(users.id, users.blocked)}>{users.blocked ? "Unblock" : "Block"}</Button>
      </div>
      </TableCell>
    </TableRow>
        </>
  )
}