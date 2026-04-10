import { BookOpen, ChartNoAxesCombined, Server } from 'lucide-react';

export function Footer() {
  return (
    <footer className="footer container">
      <div>
        <strong>Education Portal Module</strong>
        <p>
          Publish reusable courses, attach brochures and downloadable materials, and monitor learner progress in real time.
        </p>
      </div>
      <div className="footer-actions">
        <span className="footer-chip"><Server size={16} /> Express API + Mongo-ready storage</span>
        <span className="footer-chip"><BookOpen size={16} /> Dynamic course catalog</span>
        <span className="footer-chip"><ChartNoAxesCombined size={16} /> Live progress analytics</span>
      </div>
    </footer>
  );
}
