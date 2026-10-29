import Head from 'next/head';

export function JsonLdHead({ graphs }: { graphs: Record<string, unknown>[] }) {
  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(graphs.length === 1 ? graphs[0] : graphs) }}
      />
    </Head>
  );
}
