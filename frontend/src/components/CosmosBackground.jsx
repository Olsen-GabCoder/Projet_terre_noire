import React from 'react';
import '../styles/CosmosBackground.css';

/**
 * CosmosBackground — Fond immersif fixe (étoiles + nébuleuses).
 * Subtil en light, immersif en dark. Rendu une seule fois, derrière tout.
 */
const CosmosBackground = React.memo(function CosmosBackground() {
  return (
    <div className="cosmos" aria-hidden="true">
      <div className="cosmos__stars" />
      <div className="cosmos__nebula cosmos__nebula--1" />
      <div className="cosmos__nebula cosmos__nebula--2" />
      <div className="cosmos__nebula cosmos__nebula--3" />
    </div>
  );
});

export default CosmosBackground;
