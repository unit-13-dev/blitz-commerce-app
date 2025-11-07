import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { UserRole } from "@prisma/client";
import { randomUUID } from "crypto";

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
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }

    const existing = await prisma.profile.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ message: "An account with this email already exists" }, { status: 409 });
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
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error("Register POST error", error);
    return NextResponse.json({ message: "Failed to register" }, { status: 500 });
  }
}
