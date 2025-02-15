import { NextResponse } from "next/server"
import sgMail from "@sendgrid/mail"

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

interface EmailMetrics {
  optimizations: number
}

export async function POST(request: Request) {
  const { to, metrics }: { to: string; metrics: EmailMetrics } = await request.json()

  const emailContent = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL!,
    subject: "Optimization | Bidventor",
    text: `Here's your weekly optimization and lead report:
    
    - Optimizations ${metrics.optimizations} optimizations
    
    Thanks!`,
    html: `
      <div>
        <h1>Optimization | Bidventor</h1>
        <ul>
          <li>Performed ${metrics.optimizations} optimizations</li>
        <p>Thanks!</p>
      </div>
    `,
  }

  try {
    await sgMail.send(emailContent)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    )
  }
}