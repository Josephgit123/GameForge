import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import type { AdminUser } from '../lib/types';

function roleBadgeClass(role: AdminUser['role']) {
  if (role === 'ADMIN') return 'badge badge-danger';
  if (role === 'PUBLISHER') return 'badge badge-warning';
  return 'badge badge-success';
}

function publisherStatusBadgeClass(status: string) {
  if (status === 'APPROVED') return 'badge badge-success';
  if (status === 'REJECTED') return 'badge badge-danger';
  return 'badge badge-warning';
}

export function ManageUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  function refresh() {
    api
      .get<{ users: AdminUser[] }>('/admin/users', token)
      .then((res) => setUsers(res.users))
      .catch(() => setError('Could not load users.'));
  }

  useEffect(refresh, [token]);

  async function decide(publisherId: string, action: 'APPROVE' | 'REJECT') {
    setActingId(publisherId);
    setError(null);
    try {
      await api.patch(`/admin/publishers/${publisherId}`, { action }, token);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not process this application.');
    } finally {
      setActingId(null);
    }
  }

  const pendingPublishers = (users ?? []).filter((u) => u.publisher?.status === 'PENDING');

  return (
    <div className="page">
      <h1 style={{ marginBottom: 'var(--sp-8)' }}>Manage users</h1>
      {error && <div className="form-error-banner" style={{ marginBottom: 'var(--sp-6)' }}>{error}</div>}

      {pendingPublishers.length > 0 && (
        <>
          <h2 style={{ marginBottom: 'var(--sp-4)' }}>Pending publisher applications</h2>
          <div className="stack" style={{ gap: 'var(--sp-3)', marginBottom: 'var(--sp-8)' }}>
            {pendingPublishers.map((u) => (
              <div key={u.id} className="panel-card row" style={{ justifyContent: 'space-between' }}>
                <div className="stack" style={{ gap: 'var(--sp-1)' }}>
                  <span style={{ fontWeight: 600 }}>
                    {u.firstName} {u.lastName}
                  </span>
                  <span className="mono" style={{ fontSize: 13, color: 'var(--steam-400)' }}>{u.email}</span>
                  {u.publisher!.surfboardApplicationId ? (
                    <span className="mono" style={{ fontSize: 12, color: 'var(--steam-600)' }}>
                      Surfboard application: {u.publisher!.surfboardApplicationId}
                      {u.publisher!.webKybUrl && (
                        <>
                          {' · '}
                          <a href={u.publisher!.webKybUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--ember)' }}>
                            KYB link
                          </a>
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="mono" style={{ fontSize: 12, color: 'var(--danger)' }}>
                      No Surfboard application on file (Create Merchant failed at signup)
                    </span>
                  )}
                </div>
                <div className="row" style={{ gap: 'var(--sp-3)' }}>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={actingId === u.publisher!.id}
                    onClick={() => decide(u.publisher!.id, 'REJECT')}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={actingId === u.publisher!.id}
                    onClick={() => decide(u.publisher!.id, 'APPROVE')}
                  >
                    {actingId === u.publisher!.id ? 'Processing…' : 'Approve'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 style={{ marginBottom: 'var(--sp-4)' }}>All users</h2>
      {!error && !users && <p style={{ color: 'var(--steam-400)' }}>Loading…</p>}
      {users && users.length > 0 && (
        <div className="stack" style={{ gap: 'var(--sp-3)' }}>
          {users.map((u) => (
            <div key={u.id} className="panel-card row" style={{ justifyContent: 'space-between' }}>
              <div className="stack" style={{ gap: 'var(--sp-1)' }}>
                <span>
                  {u.firstName} {u.lastName}
                </span>
                <span className="mono" style={{ fontSize: 13, color: 'var(--steam-400)' }}>{u.email}</span>
              </div>
              <div className="row" style={{ gap: 'var(--sp-3)', alignItems: 'center' }}>
                {u.publisher && <span className={publisherStatusBadgeClass(u.publisher.status)}>{u.publisher.status}</span>}
                <span className={roleBadgeClass(u.role)}>{u.role}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
