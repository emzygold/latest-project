import type { Metadata } from "next";
import { ServicesView } from "@/components/services/ServicesView";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Bubble.io web apps, API integrations, automation with n8n and ElevenLabs, WordPress websites, UI/UX design and Notion/Airtable/Asana systems.",
};

export default function ServicesPage() {
  return <ServicesView />;
}
