import { Suspense } from "react";
import { GUIDA } from "@/lib/guida";
import { GuidaPage } from "../guida-page";

export function generateStaticParams() {
  return GUIDA.filter((p) => p.slug).map((p) => ({ slug: p.slug }));
}

// params si legge dietro <Suspense> (Cache Components); con generateStaticParams le pagine
// restano comunque prerenderizzate.
export default function GuidaSlugPage({ params }: PageProps<"/guida/[slug]">) {
  return (
    <Suspense fallback={null}>
      <GuidaSlug params={params} />
    </Suspense>
  );
}

async function GuidaSlug({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <GuidaPage slug={slug} />;
}
