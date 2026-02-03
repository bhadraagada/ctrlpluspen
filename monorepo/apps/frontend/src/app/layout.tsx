import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";

import { TRPCReactProvider } from "~/trpc/react";
import { Navbar } from "~/app/_components/navbar";
import { auth } from "~/server/auth";

export const metadata: Metadata = {
  title: "Handwriting Studio",
  description: "Generate beautiful handwritten text from typed input and convert handwriting to digital text using AI",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return (
    <html lang="en" className={`${geist.variable}`}>
      <body className="min-h-screen text-white antialiased">
        <SessionProvider session={session}>
          <TRPCReactProvider>
            <Navbar />
            <main>{children}</main>
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
