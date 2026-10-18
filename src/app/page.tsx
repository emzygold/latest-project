import { Hero } from "@/components/home/Hero";
import { AboutIntro } from "@/components/sections/AboutIntro";
import { Process } from "@/components/sections/Process";
import { ServicesList } from "@/components/sections/ServicesList";
import { StackStrip } from "@/components/sections/StackStrip";
import { StackedWork } from "@/components/sections/StackedWork";
import { Testimonials } from "@/components/sections/Testimonials";
import { ToolsBand } from "@/components/sections/ToolsBand";

export default function Home() {
  return (
    <>
      <Hero />
      <StackStrip />
      <ToolsBand />
      <AboutIntro />
      <StackedWork />
      <ServicesList />
      <Process />
      <Testimonials />
    </>
  );
}
