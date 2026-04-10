import { BookMarked, LogIn, Rocket, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link className="brand" to="/">
          <span className="brand-mark">EP</span>
          <span>Education Portal</span>
        </Link>

        <nav className="nav-links">
          <Link to="/">Catalog</Link>
          <a href="#features">Features</a>
          <a href="#features">Courses</a>
        </nav>

        <div className="nav-cta-row">
          <span className="nav-pill">
            <BookMarked size={16} /> Reusable course engine
          </span>
          {isAuthenticated ? (
            <Link className="btn small primary" to={isAdmin ? '/portal/admin' : '/portal'}>
              {isAdmin ? <ShieldCheck size={16} /> : <Rocket size={16} />} Open portal
            </Link>
          ) : (
            <Link className="btn small primary" to="/login">
              <LogIn size={16} /> Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
