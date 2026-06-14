import type { AdminViewServerProps } from 'payload'

const count = async (
  req: AdminViewServerProps['initPageResult']['req'],
  collection: 'directory-audit-logs' | 'directory-categories' | 'directory-items' | 'directory-jobs',
  where?: Parameters<typeof req.payload.find>[0]['where'],
) => {
  const result = await req.payload.find({
    collection,
    limit: 1,
    pagination: false,
    where,
  })

  return result.totalDocs
}

const recentJobs = async (req: AdminViewServerProps['initPageResult']['req']) =>
  req.payload.find({
    collection: 'directory-jobs',
    limit: 6,
    sort: '-createdAt',
  })

const recentAuditLogs = async (req: AdminViewServerProps['initPageResult']['req']) =>
  req.payload.find({
    collection: 'directory-audit-logs',
    limit: 6,
    sort: '-createdAt',
  })

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div
    style={{
      border: '1px solid var(--theme-elevation-150)',
      borderRadius: 6,
      padding: 16,
    }}
  >
    <div style={{ color: 'var(--theme-elevation-600)', fontSize: 12 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.2 }}>{value}</div>
  </div>
)

const JobButton = ({ action, label, targetId }: { action: string; label: string; targetId: string }) => (
  <form action={action} method="post">
    <input name="targetId" type="hidden" value={targetId} />
    <button className="btn btn--style-primary" type="submit">
      {label}
    </button>
  </form>
)

export default async function DirectoryDashboard({ initPageResult }: AdminViewServerProps) {
  const req = initPageResult.req
  const [
    categories,
    publishedItems,
    pendingItems,
    cacheJobs,
    sitemapJobs,
    failedJobs,
    jobs,
    auditLogs,
  ] = await Promise.all([
    count(req, 'directory-categories'),
    count(req, 'directory-items', { status: { equals: 'published' } }),
    count(req, 'directory-items', { status: { equals: 'pending' } }),
    count(req, 'directory-jobs', { type: { equals: 'cache.rebuild' } }),
    count(req, 'directory-jobs', { type: { equals: 'sitemap.rebuild' } }),
    count(req, 'directory-jobs', { status: { equals: 'failed' } }),
    recentJobs(req),
    recentAuditLogs(req),
  ])

  return (
    <main style={{ display: 'grid', gap: 24, padding: 24 }}>
      <header>
        <h1 style={{ margin: 0 }}>Directory</h1>
      </header>

      <section
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        }}
      >
        <Stat label="Categories" value={categories} />
        <Stat label="Published items" value={publishedItems} />
        <Stat label="Pending review" value={pendingItems} />
        <Stat label="Cache jobs" value={cacheJobs} />
        <Stat label="Sitemap jobs" value={sitemapJobs} />
        <Stat label="Failed jobs" value={failedJobs} />
      </section>

      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <JobButton action="/api/directory/cache-rebuild" label="Create cache rebuild job" targetId="all" />
        <JobButton action="/api/directory/sitemap-rebuild" label="Create sitemap rebuild job" targetId="all" />
      </section>

      <section style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <div>
          <h2>Recent Jobs</h2>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {jobs.docs.map((job) => (
                <tr key={job.id}>
                  <td>{job.type}</td>
                  <td>{job.status}</td>
                  <td>{job.targetId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2>Recent Audit Logs</h2>
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Target</th>
                <th>Actor</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.docs.map((log) => (
                <tr key={log.id}>
                  <td>{log.action}</td>
                  <td>{log.targetId}</td>
                  <td>{log.actorType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
