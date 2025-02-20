"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import sendInvite from "@/actions/sendInvite";

export function AddUserDialog() {
  // console.log(properties);
  const roles = ["Admin", "Manager", "User"];

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    setLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name");
    const email = formData.get("email");
    const role = formData.get("roleId");

    if (!name || !email || !role) {
      setMessage("Fill all fields");
    }

    const { response, error } = await sendInvite(
      name as string,
      email as any,
      role as string
    );
    if (!error) {
      setLoading(false);
      toast.success("Invitation Sent!");
    } else {
      setLoading(false);
      toast.error("Failed to Send Invitation");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input placeholder="John Doe" id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              placeholder="johndoa@example.com"
              id="email"
              name="email"
              type="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roleId">Role</Label>
            <Select name="roleId" required>
              <SelectTrigger>
                <SelectValue placeholder="Select User Role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((items, index) => (
                  <SelectItem key={index} value={items}>
                    {items}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button disabled={loading} type="submit" className="w-full">
            {loading ? "Sending Invitation" : "Send Invitation"}
          </Button>
          {message && <p>{message}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
}
