import type { Metadata } from "next";
import { AboutView } from "@/components/about/AboutView";

export const metadata: Metadata = {
  title: "About",
  description:
    "George Nnamdi is a Bubble.io developer and founder of Nexorah, building booking platforms, reservation systems and premium websites with API integrations and automation.",
};

export default function AboutPage() {
  return <AboutView />;
}
