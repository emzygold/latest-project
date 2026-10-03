import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseStudy } from "@/components/work/CaseStudy";
import { projects } from "@/content/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = projects.find((x) => x.slug === slug);
  if (!p) return {};
  return {
    title: `${p.title}: ${p.short}`,
    description: p.description,
    openGraph: { images: [{ url: p.image, alt: p.imageAlt }] },
  };
}

export default async function ProjectPage(props: PageProps<"/work/[slug]">) {
  const { slug } = await props.params;
  const index = projects.findIndex((x) => x.slug === slug);
  if (index === -1) notFound();
  const next = projects[(index + 1) % projects.length];
  return <CaseStudy p={projects[index]} next={next} index={index} />;
}
