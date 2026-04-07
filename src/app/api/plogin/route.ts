import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

function parseRut(identification: string): string {
  // Remove leading zeros, then remove last character (digito verificador)
  const trimmed = identification.replace(/^0+/, "");
  return trimmed.slice(0, -1);
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("jwt");

  if (!token) {
    return NextResponse.json({ error: "Missing JWT" }, { status: 400 });
  }

  const secret = process.env.VTI_JWT_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "VTI not configured" }, { status: 500 });
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { algorithms: ["HS256"] }
    );

    const identification = payload.identification as string;
    const email = payload.email as string;
    const name = payload.name as string;

    if (!identification || !email) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const rut = parseRut(identification);

    // Find or create user
    let user = await prisma.user.findUnique({ where: { rut } });

    if (!user) {
      const unusablePassword = await hash(randomUUID(), 10);
      user = await prisma.user.create({
        data: {
          email,
          name,
          rut,
          password: unusablePassword,
          roles: ["PROFESSOR"],
          profile: { create: {} },
        },
      });
    } else if (user.name !== name) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name },
      });
    }

    // Generate NextAuth session JWT
    const sessionToken = await encode({
      token: {
        sub: user.id,
        email: user.email,
        name: user.name,
        rut: user.rut ?? undefined,
        roles: user.roles,
      },
      secret: process.env.NEXTAUTH_SECRET!,
    });

    const isSecure = request.nextUrl.protocol === "https:";
    const cookieName = isSecure
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("VTI login error:", error);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
