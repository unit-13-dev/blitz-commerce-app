import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import "./globals.css";
import { AppProviders } from "@/lib/AppProvider";
import { authOptions } from "@/app/api/auth/[...nextauth]/option";

export const metadata: Metadata = {
  title: "Gup Shop",
  description: "A social commerce experience built with Next.js",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <AppProviders session={session}>{children}</AppProviders>
      </body>
    </html>
  );
}
