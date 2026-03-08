import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/FAQ.css';

const FAQ_ITEMS = [
  {
    q: 'Comment passer une commande ?',
    a: 'Parcourez notre catalogue, ajoutez les livres souhaités à votre panier, puis cliquez sur « Procéder au paiement ». Renseignez vos coordonnées et votre adresse de livraison, choisissez votre moyen de paiement (Mobicash, Airtel Money, espèces ou carte Visa) et validez. Vous recevrez une confirmation par email.',
  },
  {
    q: 'Quels sont les délais de livraison ?',
    a: 'Les commandes sont expédiées sous 5 à 10 jours ouvrés au Gabon. Pour Port-Gentil et environs : 5 à 7 jours. Pour les autres villes (Libreville, Lambaréné, Franceville, etc.) : 7 à 10 jours. Vous recevez un email de suivi dès l\'expédition.',
  },
  {
    q: 'Quels sont les frais de livraison ?',
    a: 'La livraison est gratuite à partir de 25 000 FCFA d\'achat. En dessous de ce montant, les frais sont de 2 000 FCFA. Les frais sont calculés automatiquement lors du passage en caisse.',
  },
  {
    q: 'Comment suivre ma commande ?',
    a: 'Une fois votre commande expédiée, vous recevez un email avec les informations de suivi. Vous pouvez aussi consulter l\'état de vos commandes dans votre espace client (Mon compte > Mes commandes) après connexion.',
  },
  {
    q: 'Puis-je retourner un livre ?',
    a: 'Oui. Vous disposez de 30 jours à compter de la réception pour retourner un livre non conforme ou endommagé. Le livre doit être en parfait état (non lu, non annoté). Contactez-nous par email, téléphone ou via le formulaire de contact pour signaler votre retour. Le remboursement est effectué sous 14 jours après réception.',
  },
  {
    q: 'Quels moyens de paiement acceptez-vous ?',
    a: 'Nous acceptons Mobicash, Airtel Money, les espèces et les cartes Visa. Toutes les transactions sont sécurisées.',
  },
  {
    q: 'Comment soumettre un manuscrit ?',
    a: 'Rendez-vous sur la page « Soumettre un manuscrit » et remplissez le formulaire en joignant votre fichier. Notre comité de lecture examine chaque proposition et vous contacte sous 2 à 4 semaines. La décision est communiquée par email.',
  },
  {
    q: 'Livrez-vous en dehors du Gabon ?',
    a: 'Pour l\'instant, nos livraisons sont limitées au Gabon. Nous travaillons à étendre notre service à d\'autres pays de la sous-région. Restez connectés à notre newsletter pour être informés des évolutions.',
  },
  {
    q: 'Comment vous contacter ?',
    a: 'Par email : terrenoireeditions@gmail.com. Par téléphone : +241 65 34 88 87 ou +241 76 59 35 35. Ou via notre formulaire de contact sur le site. Nous répondons généralement sous 24 heures. Horaires : Lun-Ven 7h30-18h30, Sam 10h-18h30.',
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="faq-page">
      <section className="faq-hero">
        <div className="faq-hero__orb faq-hero__orb--1" />
        <div className="faq-hero__grid-bg" />
        <div className="faq-hero__inner">
          <div className="faq-hero__line" />
          <h1 className="faq-hero__title">Questions fréquentes</h1>
          <p className="faq-hero__sub">
            Retrouvez les réponses aux questions les plus courantes sur nos livres, commandes et services.
          </p>
        </div>
      </section>

      <div className="faq-hero-fade" />

      <div className="faq-content">
        <p className="faq-intro">
          Vous ne trouvez pas la réponse à votre question ? N&apos;hésitez pas à nous contacter — notre équipe est à votre écoute.
        </p>
        <div className="faq-list">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className={`faq-item ${openIndex === i ? 'faq-item--open' : ''}`}
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            >
              <div className="faq-item__header">
                <h3 className="faq-item__q">{item.q}</h3>
                <span className="faq-item__icon">
                  <i className={`fas fa-chevron-${openIndex === i ? 'up' : 'down'}`} />
                </span>
              </div>
              <div className="faq-item__body">
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="faq-cta">
          <Link to="/contact" className="faq-btn faq-btn--primary">Nous contacter</Link>
          <Link to="/delivery" className="faq-btn faq-btn--outline">Livraison & Retours</Link>
        </div>
      </div>
      <div className="faq-footer-fade" />
    </div>
  );
};

export default FAQ;
