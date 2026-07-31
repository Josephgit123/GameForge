import { useLocation, useNavigate } from 'react-router-dom';

interface OnboardingState {
  onboarding: { applicationId: string; webKybUrl: string } | null;
}

// Rendered as its own route, not inline inside PublisherSignup — the
// moment signup succeeds, AuthContext's user updates and Layout switches
// from the customer shell to the publisher PortalNav (a structurally
// different tree), which remounts everything under it and wipes local
// component state before an inline confirmation could ever be seen.
// Passing the result via router state to a route that only ever renders
// under the already-switched shell avoids that entirely.
export function PublisherOnboarding() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as OnboardingState | null;

  if (!state) {
    navigate('/publisher/games', { replace: true });
    return null;
  }

  const { onboarding } = state;

  return (
    <div className="page">
      <h1 style={{ marginBottom: 'var(--sp-6)' }}>Account created</h1>
      {onboarding ? (
        <>
          <p style={{ color: 'var(--steam-400)', marginBottom: 'var(--sp-4)' }}>
            Your Surfboard merchant application has been started for real. Complete KYB verification to be approved
            as a merchant — until then your account stays pending.
          </p>
          <div className="panel-card stack" style={{ gap: 'var(--sp-2)', marginBottom: 'var(--sp-6)' }}>
            <span style={{ fontSize: 12, color: 'var(--steam-600)' }}>Application ID</span>
            <span className="mono" style={{ fontSize: 14 }}>{onboarding.applicationId}</span>
            <a href={onboarding.webKybUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--ember)', fontSize: 14 }}>
              Complete KYB verification →
            </a>
          </div>
        </>
      ) : (
        <p style={{ color: 'var(--steam-400)', marginBottom: 'var(--sp-6)' }}>
          Your account was created, but starting the Surfboard merchant application failed. An admin can see this on
          your account, and you can complete onboarding later.
        </p>
      )}
      <button type="button" className="btn btn-primary" onClick={() => navigate('/publisher/games', { replace: true })}>
        Continue to publisher portal
      </button>
    </div>
  );
}
