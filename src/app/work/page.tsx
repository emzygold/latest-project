import type { Metadata } from "next";
import { WorkIndex } from "@/components/work/WorkIndex";

export const metadata: Metadata = {
  title: "Work",
  description: "Selected Bubble.io projects by George Nnamdi: booking platforms, reservation systems and premium websites.",
};

export default function WorkPage() {
  return <WorkIndex />;
}
