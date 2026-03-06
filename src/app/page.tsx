export default function Home() {
  return (
    <main className="container" style={{ padding: '2rem 1rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Next.js Starter Template</h1>
      <p className="text-muted" style={{ marginBottom: '2rem' }}>
        A full-stack Next.js starter with TypeScript, Prisma, and Zod validation.
      </p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>API Endpoints</h2>
        <ul style={{ listStyle: 'none' }}>
          <li style={{ marginBottom: '0.5rem' }}>
            <code style={{
              background: 'var(--muted)',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px'
            }}>
              GET /api/health
            </code>
            {' '}— Health check
          </li>
        </ul>
        <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
          Add your API routes in <code>src/app/api/</code>
        </p>
      </section>

      <section>
        <h2 style={{ marginBottom: '1rem' }}>Getting Started</h2>
        <ol style={{ paddingLeft: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>Define your Prisma models in <code>prisma/schema.prisma</code></li>
          <li style={{ marginBottom: '0.5rem' }}>Create Zod schemas in <code>src/schemas/</code></li>
          <li style={{ marginBottom: '0.5rem' }}>Add services in <code>src/server/services/</code></li>
          <li style={{ marginBottom: '0.5rem' }}>Create API routes in <code>src/app/api/</code></li>
        </ol>
      </section>
    </main>
  );
}
