"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"

interface User {
  email: string
  // Add other user properties as needed
}

export default function UserList({ users }: { users: User }) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")

  const generateDynamicMetrics = () => {
    const optimizations = Math.floor(Math.random() * 20) + 1 // Random number between 1 and 20

    return {
      optimizations,
    }
  }

  const sendEmail = async () => {
    setLoading(true)
    try {
      const metrics = generateDynamicMetrics()

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: users.email,
          metrics, // Pass dynamic metrics to the API
        }),
      })

      if (!response.ok) throw new Error("Failed to send email")

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

  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-700">{users.email}</span>
      <p>5</p>
      <div className="flex items-center gap-2">
        <Button
          onClick={sendEmail}
          disabled={loading}
          size="sm"
          variant="outline"
        >
          {loading ? "Sending..." : "Send Email"}
        </Button>

        {status === "success" && (
          <span className="text-sm text-green-500">Sent!</span>
        )}
        {status === "error" && (
          <span className="text-sm text-red-500">Error</span>
        )}
      </div>
    </div>
  )
}