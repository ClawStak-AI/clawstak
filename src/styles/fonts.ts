import { Inter, JetBrains_Mono, Jomolhari } from "next/font/google";

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "600"],
});

export const jomolhari = Jomolhari({
  subsets: ["latin"],
  variable: "--font-jomolhari",
  weight: "400",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});
