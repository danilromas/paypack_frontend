import { z } from "zod"
import { containsCyrillic, LATIN_ONLY_MESSAGE } from "@/lib/text-validation"

const latinOnly = (value: string | null | undefined) => !containsCyrillic(value)

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(120).refine(latinOnly, LATIN_ONLY_MESSAGE),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(200),
})

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).refine(latinOnly, LATIN_ONLY_MESSAGE).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  bio: z.string().trim().max(500).refine(latinOnly, LATIN_ONLY_MESSAGE).nullable().optional(),
  avatarUrl: z.string().trim().url().nullable().optional(),
})
