import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import '../styles/AppSidebar.css';

/**
 * Sidebar gauche globale — fixe sur desktop, drawer sur mobile.
 */
const AppSidebar = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fermer le drawer mobile quand on navigue
  useEffect(() => { setMobileOpen(false); }, [children]);

  return (
    <>
      {/* Desktop — toujours visible, pas de toggle */}
      <aside className="app-side">
        <div className="app-side__scroll">{children}</div>
      </aside>

      {/* Mobile FAB + drawer */}
      {createPortal(
        <>
          <button
            className="app-side-fab"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le panneau"
          >
            <i className="fas fa-book-open" />
          </button>
          {mobileOpen && (
            <>
              <div className="app-side-overlay" onClick={() => setMobileOpen(false)} />
              <aside className="app-side-drawer">
                <div className="app-side-drawer__header">
                  <span><i className="fas fa-book-open" /> Frollot</span>
                  <button onClick={() => setMobileOpen(false)}><i className="fas fa-times" /></button>
                </div>
                <div className="app-side-drawer__scroll">{children}</div>
              </aside>
            </>
          )}
        </>,
        document.body
      )}
    </>
  );
};

export default AppSidebar;
