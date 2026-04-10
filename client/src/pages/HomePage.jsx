import { HeroSection } from '../components/HeroSection';
import { DashboardPanel } from '../components/DashboardPanel';
import { OverviewGrid } from '../components/OverviewGrid';
import { PhaseGrid } from '../components/PhaseGrid';
import { CheckpointStrip } from '../components/CheckpointStrip';
import { WeekExplorer } from '../components/WeekExplorer';
import { ArtifactGrid } from '../components/ArtifactGrid';
import { SprintGrid } from '../components/SprintGrid';
import { ScreenGallery } from '../components/ScreenGallery';
import { DownloadsPanel } from '../components/DownloadsPanel';
import { Footer } from '../components/Footer';

export function HomePage({ content, progressMap, summary, onSaveProgress, savingDay, readOnly = false }) {
  return (
    <>
      <HeroSection hero={content.hero} stats={content.stats} />
      {summary ? <DashboardPanel summary={summary} /> : null}
      <OverviewGrid cards={content.introCards} />
      <PhaseGrid phases={content.phases} />
      <CheckpointStrip checkpoints={content.checkpoints} />
      <WeekExplorer
        phases={content.phases}
        weeks={content.weeks}
        progressMap={progressMap}
        onSaveProgress={onSaveProgress}
        savingDay={savingDay}
        readOnly={readOnly}
      />
      <ArtifactGrid artifacts={content.artifacts} />
      <SprintGrid sprints={content.designSprints} />
      <ScreenGallery screens={content.screens} />
      <DownloadsPanel downloads={content.downloads} />
      <Footer />
    </>
  );
}
