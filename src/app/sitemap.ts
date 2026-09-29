import type { MetadataRoute } from "next";
import { nav, projects, site } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = nav.map((n) => ({ url: `${site.url}${n.href === "/" ? "" : n.href}`, changeFrequency: "monthly" as const, priority: n.href === "/" ? 1 : 0.8 }));
  const work = projects.map((p) => ({ url: `${site.url}/work/${p.slug}`, changeFrequency: "yearly" as const, priority: 0.7 }));
  return [...pages, ...work];
}
