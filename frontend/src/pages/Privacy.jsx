import '../styles/Privacy.css';

const Privacy = () => {
  return (
    <div className="privacy-page">
      <section className="privacy-hero">
        <div className="privacy-hero__orb privacy-hero__orb--1" />
        <div className="privacy-hero__grid-bg" />
        <div className="privacy-hero__inner">
          <div className="privacy-hero__line" />
          <h1 className="privacy-hero__title">Politique de confidentialité</h1>
          <p className="privacy-hero__sub">
            Terre Noire Éditions s'engage à protéger vos données personnelles.
          </p>
        </div>
      </section>

      <div className="privacy-hero-fade" />

      <div className="privacy-content">
        <div className="privacy-card">
          <h2>Collecte des données</h2>
          <p>
            Les données collectées via le formulaire de soumission de manuscrit (nom, email, téléphone, description, fichier)
            sont utilisées exclusivement pour le processus de sélection éditoriale. Elles ne sont ni vendues ni partagées
            avec des tiers.
          </p>

          <h2>Conditions de soumission</h2>
          <p>
            En soumettant un manuscrit, vous acceptez que Terre Noire Éditions examine votre œuvre et vous contacte
            par email dans un délai de 2 à 4 semaines. La décision du comité de lecture est définitive.
          </p>

          <h2>Conservation</h2>
          <p>
            Les manuscrits non retenus sont conservés pendant 12 mois puis supprimés. Les manuscrits acceptés
            sont conservés selon les besoins du processus éditorial.
          </p>

          <h2>Vos droits</h2>
          <p>
            Conformément au RGPD, vous pouvez demander l'accès, la rectification ou la suppression de vos données
            en nous contactant à <a href="mailto:terrenoireeditions@gmail.com">terrenoireeditions@gmail.com</a>.
          </p>

          <h2>Contact</h2>
          <p>
            Pour toute question : <a href="mailto:terrenoireeditions@gmail.com">terrenoireeditions@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
