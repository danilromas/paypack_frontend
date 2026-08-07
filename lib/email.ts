import "server-only"
import { Resend } from "resend"
import nodemailer from "nodemailer"

const FROM = process.env.RESEND_FROM_EMAIL ?? "PayPack <onboarding@resend.dev>"

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const subject = "Reset your PayPack password"
  const html = `
    <p>Someone requested a password reset for this PayPack account.</p>
    <p><a href="${resetUrl}">Click here to set a new password</a>. This link expires in 1 hour.</p>
    <p>If you didn't request this, you can ignore this email.</p>
  `

  const smtpHost = process.env.SMTP_HOST
  if (smtpHost) {
    // Local dev (docker-compose points this at Maildev) — view sent mail at http://localhost:1080
    const transport = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: false,
    })
    await transport.sendMail({ from: FROM, to, subject, html })
    return
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log(`[email] No SMTP_HOST/RESEND_API_KEY configured — password reset link for ${to}:\n${resetUrl}`)
    return
  }

  const resend = new Resend(apiKey)
  await resend.emails.send({ from: FROM, to, subject, html })
}
