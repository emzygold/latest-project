import type { Metadata } from "next";
import { ContactView } from "@/components/contact/ContactView";

export const metadata: Metadata = {
  title: "Contact",
  description: "Start a project with George Nnamdi, Bubble.io developer. Email, WhatsApp, Upwork or send a project brief.",
};

export default function ContactPage() {
  return <ContactView />;
}
