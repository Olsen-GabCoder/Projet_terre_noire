import { Link } from 'react-router-dom';
import '../styles/CGV.css';

const CGV = () => {
  return (
    <div className="cgv-page">
      <section className="cgv-hero">
        <div className="cgv-hero__orb cgv-hero__orb--1" />
        <div className="cgv-hero__grid-bg" />
        <div className="cgv-hero__inner">
          <div className="cgv-hero__line" />
          <h1 className="cgv-hero__title">Conditions générales de vente</h1>
          <p className="cgv-hero__sub">
            Les présentes conditions régissent les ventes de livres de Terre Noire Éditions.
          </p>
        </div>
      </section>

      <div className="cgv-hero-fade" />

      <div className="cgv-content">
        <p className="cgv-intro">
          En passant commande sur notre site, vous acceptez sans réserve les présentes conditions générales de vente. Nous vous invitons à les lire attentivement avant toute transaction.
        </p>
        <div className="cgv-card">
          <h2>1. Objet et champ d&apos;application</h2>
          <p>Les présentes Conditions Générales de Vente (CGV) s&apos;appliquent à toutes les ventes de livres effectuées par Terre Noire Éditions, société établie à Port-Gentil (Gabon), avenue Ivan Le Terrible. Elles régissent les relations entre Terre Noire Éditions et ses clients, qu&apos;il s&apos;agisse de particuliers ou de professionnels.</p>
          <p>Toute commande passée sur notre site implique l&apos;acceptation pleine et entière des présentes CGV. Nous nous réservons le droit de modifier ces conditions à tout moment ; les conditions applicables sont celles en vigueur au jour de la commande.</p>

          <h2>2. Produits et commandes</h2>
          <p>Les ouvrages proposés à la vente sont ceux présentés sur notre catalogue en ligne. Les photographies et descriptions sont les plus fidèles possibles ; toutefois, de légères variations peuvent exister. Les prix sont indiqués en Francs CFA (FCFA) et sont valables dans la limite des stocks disponibles.</p>
          <p>La validation de la commande vaut acceptation des prix, des quantités et des frais de livraison. Une confirmation vous est envoyée par email. Nous nous réservons le droit d&apos;annuler toute commande en cas de difficulté de paiement, d&apos;adresse erronée ou de comportement suspect.</p>

          <h2>3. Prix et paiement</h2>
          <p>Les prix sont indiqués en FCFA TTC. Les frais de livraison sont calculés selon le montant de la commande : livraison gratuite à partir de 25 000 FCFA, sinon 2 000 FCFA. Le paiement est exigible à la commande.</p>
          <p>Nous acceptons les moyens de paiement suivants : Mobicash, Airtel Money, espèces et cartes Visa. Les transactions sont sécurisées. En cas de refus de paiement, la commande sera annulée.</p>

          <h2>4. Livraison</h2>
          <p>Les commandes sont expédiées sous 5 à 10 jours ouvrés au Gabon. Les délais peuvent varier selon la destination et les conditions de transport. Vous recevez un email de confirmation d&apos;expédition avec les informations de suivi.</p>
          <p>En cas de retard ou de problème, contactez-nous à terrenoireeditions@gmail.com ou par téléphone. Le risque du transport est transféré au client dès la remise du colis au transporteur.</p>

          <h2>5. Droit de rétractation et retours</h2>
          <p>Conformément à notre politique de retour, vous disposez de 30 jours à compter de la réception pour retourner un ouvrage non conforme ou endommagé. Le livre doit être en parfait état (non lu, non annoté). Les retours pour défaut ou erreur de notre part sont à notre charge.</p>
          <p>Pour toute demande de retour, contactez-nous par email, téléphone ou via notre formulaire de contact. Le remboursement est effectué sous 14 jours après réception et vérification du retour.</p>

          <h2>6. Propriété intellectuelle</h2>
          <p>Tous les contenus du site (textes, images, logos, maquettes) sont protégés par le droit d&apos;auteur et appartiennent à Terre Noire Éditions ou à ses ayants droit. Toute reproduction, représentation ou exploitation non autorisée est interdite.</p>

          <h2>7. Responsabilité</h2>
          <p>Terre Noire Éditions s&apos;engage à livrer des produits conformes à la commande. Notre responsabilité est limitée à la valeur des produits commandés. Nous ne pouvons être tenus responsables des dommages indirects (retard, perte de profit, etc.) sauf en cas de faute lourde.</p>

          <h2>8. Données personnelles</h2>
          <p>Les données collectées lors de la commande sont traitées conformément à notre <Link to="/privacy">politique de confidentialité</Link>. Elles servent à la gestion des commandes, de la relation client et, avec votre accord, à l&apos;envoi de notre newsletter.</p>

          <h2>9. Litiges et droit applicable</h2>
          <p>En cas de litige, une solution amiable sera recherchée avant toute action judiciaire. Le droit gabonais est applicable. Pour toute question, contactez-nous à terrenoireeditions@gmail.com ou au +241 65 34 88 87.</p>

          <div className="cgv-cta">
            <Link to="/contact" className="cgv-btn cgv-btn--primary">Nous contacter</Link>
            <Link to="/catalog" className="cgv-btn cgv-btn--outline">Retour au catalogue</Link>
          </div>
        </div>
      </div>
      <div className="cgv-footer-fade" />
    </div>
  );
};

export default CGV;
