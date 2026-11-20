import type { Metadata } from "next";
import { JetBrains_Mono, Roboto_Flex } from "next/font/google";
import "./globals.css";

// Font del design system (DESIGN.md): Roboto Flex per il testo, JetBrains Mono per codice e ID.
const fontSans = Roboto_Flex({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fontMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ASDP Workspace",
  description: "Gestione dei progetti DST con il framework ASDP",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
