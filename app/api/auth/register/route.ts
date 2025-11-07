import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { UserRole } from "@prisma/client";
import { randomUUID } from "crypto";
import { ApiResponseHandler } from "@/lib/api-response";

interface RegisterPayload {
  email: string;
  password: string;
  fullName?: string;
  role?: UserRole;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterPayload;
    const email = body.email?.toLowerCase().trim();
    const password = body.password;
    const fullName = body.fullName?.trim();
    const role = (body.role ?? "user") as UserRole;

    if (!email || !password) {
      return ApiResponseHandler.badRequest("Email and password are required");
    }

    if (password.length < 6) {
      return ApiResponseHandler.badRequest("Password must be at least 6 characters");
    }

    if (!Object.values(UserRole).includes(role)) {
      return ApiResponseHandler.badRequest("Invalid role");
    }

    const existing = await prisma.profile.findUnique({ where: { email } });
    if (existing) {
      return ApiResponseHandler.conflict("An account with this email already exists");
    }

    const passwordHash = await hash(password, 12);
    const id = randomUUID();

    const profile = await prisma.profile.create({
      data: {
        id,
        email,
        fullName: fullName || null,
        role,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return ApiResponseHandler.created({ profile }, "Account created successfully");
  } catch (error: any) {
    console.error("Register POST error", error);
    return ApiResponseHandler.error("Failed to register", 500, error);
  }
}
