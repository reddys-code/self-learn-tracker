import { Loader2, RefreshCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePortalData } from '../hooks/usePortalData';
import { WeekExplorer } from '../components/WeekExplorer';

export function RoadmapTrackerPage() {
  const { isAdmin } = useAuth();
  const { content, progressMap, loading, error, saveProgress, savingDay, reload } = usePortalData({ isAdmin });

  if (loading) {
    return (
      <div className="portal-page">
        <div className="fullscreen-center compact">
          <Loader2 className="spin" size={28} />
          <p>Loading tracker...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="portal-page">
        <div className="alert-box error">{error || 'Roadmap content unavailable.'}</div>
      </div>
    );
  }

  return (
    <div className="portal-page">
      <div className="page-header-row">
        <div>
          <span className="eyebrow soft">TRACKER</span>
          <h1>Daily roadmap tracker</h1>
          <p>Every day card is writable. Update status, notes, and evidence links so the admin portal reflects live execution.</p>
        </div>
        <button type="button" className="btn" onClick={() => void reload()}>
          <RefreshCcw size={16} /> Refresh
        </button>
      </div>

      {error ? <div className="alert-box error">{error}</div> : null}

      <WeekExplorer
        phases={content.phases}
        weeks={content.weeks}
        progressMap={progressMap}
        onSaveProgress={saveProgress}
        savingDay={savingDay}
        readOnly={false}
        title="Write progress directly into the live portal"
        description="Each save updates your personal dashboard immediately and pushes a live event to the admin console so progress can be monitored as it happens."
      />
    </div>
  );
}
