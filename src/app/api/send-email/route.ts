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
    subject: "Your Optimization | Bidventor",
    text: `Hello,
  
  Here’s your optimization and lead report:
  
  - ${metrics.optimizations} optimizations performed.
  
  Stay ahead with Bidventor. Let us know if you have any questions.
  
  Best regards,  
  The Bidventor Team`,
  
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333; text-align: center;">Your Optimization Report</h2>
        <p style="color: #555; text-align: center;">Stay informed with the latest insights from Bidventor.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 15px;">
          <p style="font-size: 16px; color: #333; margin: 0;">
            <strong>Optimizations Performed:</strong> ${metrics.optimizations}
          </p>
        </div>
        <p style="color: #555; margin-top: 20px;">If you have any questions or need assistance, feel free to reach out.</p>
        <p style="color: #333; font-weight: bold; margin-top: 10px;">Best regards, <br> The Bidventor Team</p>
      </div>
    `,
  };

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