import { useState } from 'react';
import { Button, ErrorState, Spinner } from '../../components/ui/primitives';
import { useAudit } from '../api';
import { Card, Field, PageHeader, TextInput, fmtDate } from '../components/ui';

export default function AuditPage() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({ page: String(page), ...(action ? { action } : {}) }).toString();
  const q = useAudit(query);
  const total = q.data?.meta?.total ?? 0;
  return (
    <>
      <PageHeader title="Audit logs" description="Security-relevant administrative actions. Metadata never includes passwords, tokens or feedback text." />
      <Card className="mb-6">
        <Field label="Filter by exact action (e.g. content.published, auth.login_failed)" className="max-w-md">
          {(id) => <TextInput id={id} value={action} onChange={(e) => { setAction(e.target.value.trim()); setPage(1); }} />}
        </Field>
      </Card>
      {q.isPending ? <Spinner /> : q.isError ? <ErrorState onRetry={() => void q.refetch()} /> : (
        <Card title={`${total} entries`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-xs uppercase text-muted"><tr><th scope="col" className="py-2">Time</th><th scope="col">Actor</th><th scope="col">Action</th><th scope="col">Entity</th><th scope="col">Details</th></tr></thead>
              <tbody>
                {q.data.data.map((a) => (
                  <tr key={a.id} className="border-t border-line align-top">
                    <td className="whitespace-nowrap py-2 pr-3 text-muted">{fmtDate(a.timestamp)}</td>
                    <td className="pr-3">{a.actor}</td>
                    <td className="pr-3"><code>{a.action}</code></td>
                    <td className="pr-3 text-muted">{a.entityType}{a.entityId ? ` · ${a.entityId}` : ''}</td>
                    <td className="text-xs text-muted"><code className="break-all">{Object.keys(a.metadata ?? {}).length ? JSON.stringify(a.metadata) : '—'}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-between">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button size="sm" variant="secondary" disabled={page * 30 >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </Card>
      )}
    </>
  );
}
