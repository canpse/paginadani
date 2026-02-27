import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Wisenerd - Diario de Midias",
  description: "Plataforma standalone para anotar livros, filmes e series.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
