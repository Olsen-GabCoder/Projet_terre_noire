import { Link } from 'react-router-dom';
import '../styles/Delivery.css';

const Delivery = () => {
  return (
    <div className="delivery-page">

      {/* ── HERO COMPACT ── */}
      <section className="delivery-hero">
        <div className="delivery-hero__orb delivery-hero__orb--1" />
        <div className="delivery-hero__grid-bg" />

        <div className="delivery-hero__inner">
          <div className="delivery-hero__line" />
          <h1 className="delivery-hero__title">Livraison & Retours</h1>
          <p className="delivery-hero__sub">
            Livraison rapide au Gabon et conditions de retour simplifiées.
            <br />
            Vos livres en toute sérénité.
          </p>
        </div>
      </section>

      <div className="delivery-hero-fade" />

      {/* ── CONTENU BENTO GRID ── */}
      <div className="delivery-content">
        <p className="delivery-intro">
          Chez Terre Noire Éditions, nous mettons tout en œuvre pour que vos livres vous parviennent rapidement et en parfait état. Cette page détaille nos conditions de livraison au Gabon ainsi que notre politique de retour, conçue pour votre sérénité.
        </p>
        <div className="delivery-layout">

          {/* Livraison — Délais */}
          <div className="card card--md">
            <span className="card__tag">Délais</span>
            <h2>Délai de livraison</h2>
            <p>Votre commande est préparée et expédiée sous <strong>5 à 10 jours ouvrés</strong> au Gabon. Nous traitons chaque commande avec soin pour garantir que vos livres arrivent en parfait état.</p>
            <p>Pour Port-Gentil et environs, comptez généralement 5 à 7 jours. Pour les autres villes du Gabon (Libreville, Lambaréné, Franceville, Mouila, Oyem, etc.), prévoyez 7 à 10 jours. Les délais peuvent varier selon la saison et les conditions de transport.</p>
            <p>Dès que votre colis est expédié, vous recevez une notification par email pour suivre votre livraison en temps réel.</p>
          </div>

          {/* Livraison — Tarifs */}
          <div className="card card--md">
            <span className="card__tag">Tarifs</span>
            <h2>Frais de livraison</h2>
            <ul className="delivery-list">
              <li><strong>Gratuit</strong> — À partir de 25 000 FCFA d&apos;achat</li>
              <li><strong>2 000 FCFA</strong> — Pour les commandes inférieures à 25 000 FCFA</li>
            </ul>
            <p>Les frais de livraison sont calculés automatiquement lors du passage en caisse. Profitez de la livraison gratuite en regroupant plusieurs ouvrages dans une même commande — c&apos;est l&apos;occasion idéale de découvrir plusieurs auteurs de notre catalogue.</p>
          </div>

          {/* Zones */}
          <div className="card card--md">
            <span className="card__tag">Couverture</span>
            <h2>Zones de livraison</h2>
            <p>Nous livrons partout au <strong>Gabon</strong> : Port-Gentil, Libreville, Lambaréné, Franceville, Mouila, Oyem et toutes les autres villes du pays.</p>
            <p>Notre réseau de distribution couvre l&apos;ensemble du territoire gabonais. Que vous soyez en ville ou dans une localité plus éloignée, nous nous engageons à vous faire parvenir vos livres dans les meilleurs délais possibles.</p>
          </div>

          {/* Suivi */}
          <div className="card card--md">
            <span className="card__tag">Suivi</span>
            <h2>Suivi de commande</h2>
            <p>Une fois votre commande expédiée, vous recevez un email avec les informations de suivi. Vous pouvez aussi consulter l&apos;état de vos commandes dans votre <Link to="/profile">espace client</Link>.</p>
            <p>En cas de retard ou de question sur votre livraison, n&apos;hésitez pas à nous contacter. Notre équipe est disponible pour vous renseigner et vous accompagner jusqu&apos;à la réception de votre colis.</p>
          </div>

          {/* Retours — Conditions */}
          <div className="card card--md card--wide">
            <span className="card__tag">Retours</span>
            <h2>Conditions de retour</h2>
            <p>Vous pouvez retourner un livre dans les <strong>30 jours</strong> suivant la réception, à condition qu&apos;il soit en parfait état (non lu, non annoté, emballage d&apos;origine intact). Nous accordons ce délai pour vous laisser le temps de vérifier votre commande en toute tranquillité.</p>
            <p>Les retours sont acceptés pour : défaut d&apos;impression, livre endommagé à la livraison, ou erreur de commande de notre part. Dans ces cas, les frais de retour sont à notre charge.</p>
            <p>Pour tout autre motif (changement d&apos;avis, doublon, etc.), le retour reste possible dans les 30 jours mais les frais d&apos;expédition du retour sont à la charge du client. Le remboursement est effectué dès réception et vérification du livre.</p>
          </div>

          {/* Retours — Procédure */}
          <div className="card card--md">
            <span className="card__tag">Procédure</span>
            <h2>Comment retourner ?</h2>
            <p className="delivery-contact-methods">Vous pouvez nous contacter pour signaler un retour de trois façons :</p>
            <ul className="delivery-return-methods">
              <li><strong>Par email</strong> — terrenoireeditions@gmail.com</li>
              <li><strong>Par téléphone</strong> — +241 65 34 88 87 ou +241 76 59 35 35</li>
              <li><strong>Depuis le site</strong> — via notre <Link to="/contact">formulaire de contact</Link></li>
            </ul>
            <p>Indiquez-nous le numéro de commande et le motif du retour. Nous vous confirmerons la prise en charge et vous indiquerons les étapes à suivre.</p>
            <ol className="delivery-steps">
              <li>Contactez-nous par l&apos;un des moyens ci-dessus pour signaler le retour</li>
              <li>Emballage soigné du livre dans son état d&apos;origine</li>
              <li>Envoi à notre adresse : Avenue Ivan Le Terrible, Port-Gentil</li>
              <li>Remboursement sous 14 jours après réception et vérification</li>
            </ol>
          </div>

          {/* CTA */}
          <div className="card card--cta">
            <div>
              <h2>Une question sur la livraison ou les retours ?</h2>
              <p>Notre équipe est disponible pour vous accompagner. Que ce soit pour un délai, un suivi de colis, un retour ou toute autre question, n&apos;hésitez pas à nous contacter. Nous répondons généralement sous 24 heures.</p>
            </div>
            <div className="cta-btns">
              <Link to="/contact" className="btn btn--primary">Nous contacter</Link>
              <Link to="/catalog" className="btn btn--outline">Voir le catalogue</Link>
            </div>
          </div>

        </div>
      </div>

      <div className="delivery-footer-fade" />
    </div>
  );
};

export default Delivery;
