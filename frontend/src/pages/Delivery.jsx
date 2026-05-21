import { Link } from 'react-router-dom';
import { useDeliveryConfig } from '../context/DeliveryConfigContext';
import '../styles/Delivery.css';

const fmtPrice = (n) => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });

const Delivery = () => {
  const { shippingFreeThreshold, shippingCost } = useDeliveryConfig();

  return (
    <div className="delivery-page">

      {/* ══════════ HERO ══════════ */}
      <section className="dlv-hero">
        <div className="dlv-hero__orb dlv-hero__orb--1" />
        <div className="dlv-hero__orb dlv-hero__orb--2" />
        <div className="dlv-hero__grid-bg" />
        <div className="dlv-hero__inner">
          <span className="dlv-hero__pill"><i className="fas fa-truck-fast" /> Livraison au Gabon</span>
          <div className="dlv-hero__line" />
          <h1 className="dlv-hero__title">Livraison &amp; <span className="dlv-hero__title-accent">Retours</span></h1>
          <p className="dlv-hero__sub">
            Livraison rapide sur tout le territoire gabonais et conditions de retour
            simplifiees. Vos livres en toute serenite.
          </p>
        </div>
      </section>

      <div className="dlv-hero-fade" />

      <div className="dlv-content">

        {/* ══════════ LIVRAISON ══════════ */}
        <div className="dlv-card">
          <div className="dlv-section-header">
            <span className="dlv-section-num">01</span>
            <h2>Delais de livraison</h2>
          </div>
          <p>
            Votre commande est preparee et expediee sous <strong>5 a 10 jours ouvres</strong> au Gabon.
            Nous traitons chaque commande avec soin pour garantir que vos livres arrivent en parfait etat.
          </p>
          <div className="dlv-zones">
            {[
              ['fa-location-dot', 'Port-Gentil & environs', '5 a 7 jours ouvres', 'var(--color-primary)'],
              ['fa-city', 'Libreville, Franceville, Lambarene...', '7 a 10 jours ouvres', 'var(--tn-gold, #C8956C)'],
              ['fa-map', 'Autres localites du Gabon', '7 a 10 jours ouvres', 'var(--color-gray-500)'],
            ].map(([icon, zone, delay, color]) => (
              <div key={zone} className="dlv-zone">
                <div className="dlv-zone__icon" style={{ background: `${color}12`, color }}><i className={`fas ${icon}`} /></div>
                <div>
                  <strong>{zone}</strong>
                  <p>{delay}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="dlv-note">
            <i className="fas fa-info-circle" /> Les delais sont estimatifs et peuvent varier selon la saison
            et les conditions de transport. Des l&apos;expedition, vous recevez un email de notification.
          </p>
        </div>

        {/* ══════════ FRAIS ══════════ */}
        <div className="dlv-card">
          <div className="dlv-section-header">
            <span className="dlv-section-num">02</span>
            <h2>Frais de livraison</h2>
          </div>
          <div className="dlv-pricing">
            <div className="dlv-price-card dlv-price-card--free">
              <div className="dlv-price-card__badge"><i className="fas fa-gift" /></div>
              <h3>Gratuit</h3>
              <p>A partir de <strong>{fmtPrice(shippingFreeThreshold)} FCFA</strong> d&apos;achat</p>
            </div>
            <div className="dlv-price-card">
              <div className="dlv-price-card__badge"><i className="fas fa-truck" /></div>
              <h3>{fmtPrice(shippingCost)} FCFA</h3>
              <p>Pour les commandes inferieures a {fmtPrice(shippingFreeThreshold)} FCFA</p>
            </div>
          </div>
          <p>
            Les frais sont calcules automatiquement lors du passage en caisse. Les ebooks (contenus
            numeriques) ne sont pas soumis a des frais de livraison — ils sont accessibles immediatement
            apres confirmation du paiement.
          </p>
        </div>

        {/* ══════════ SUIVI ══════════ */}
        <div className="dlv-card">
          <div className="dlv-section-header">
            <span className="dlv-section-num">03</span>
            <h2>Suivi de commande</h2>
          </div>
          <div className="dlv-steps">
            {[
              ['fa-check-circle', 'Confirmation', 'Email de confirmation avec le detail de votre commande.'],
              ['fa-box', 'Preparation', 'Votre commande est preparee et emballee avec soin.'],
              ['fa-truck', 'Expedition', 'Email de notification avec informations de suivi.'],
              ['fa-hand-holding-heart', 'Reception', 'Votre colis arrive — verifiez son etat a la reception.'],
            ].map(([icon, title, desc], i) => (
              <div key={i} className="dlv-step">
                <div className="dlv-step__num">{i + 1}</div>
                <div className="dlv-step__icon"><i className={`fas ${icon}`} /></div>
                <div>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p>
            Vous pouvez consulter l&apos;etat de vos commandes a tout moment depuis votre{' '}
            <Link to="/profile">espace client</Link>.
          </p>
        </div>

        {/* ══════════ RETOURS ══════════ */}
        <div className="dlv-card">
          <div className="dlv-section-header">
            <span className="dlv-section-num">04</span>
            <h2>Droit de retractation</h2>
          </div>
          <div className="dlv-highlight">
            <i className="fas fa-gavel" />
            <p>
              Conformement a la <strong>Loi n° 025/2021</strong>, vous disposez de{' '}
              <strong>14 jours calendaires</strong> a compter de la reception pour exercer
              votre droit de retractation, sans avoir a justifier de motif.
            </p>
          </div>
          <h3><i className="fas fa-check" /> Conditions acceptees</h3>
          <ul>
            <li>Livre en parfait etat : non lu, non annote, non corne, non tache</li>
            <li>Emballage d&apos;origine intact</li>
            <li>Demande effectuee dans les 14 jours suivant la reception</li>
          </ul>
          <h3><i className="fas fa-coins" /> Frais de retour</h3>
          <ul>
            <li><strong>A notre charge :</strong> defaut d&apos;impression, livre endommage a la livraison, erreur de commande</li>
            <li><strong>A votre charge :</strong> changement d&apos;avis, doublon, autre motif personnel</li>
          </ul>
          <h3><i className="fas fa-ban" /> Exclusion ebooks</h3>
          <p>
            Le droit de retractation ne s&apos;applique pas aux contenus numeriques dont le
            telechargement a commence. En cas de fichier defectueux, nous renvoyons un lien
            fonctionnel dans les meilleurs delais.
          </p>
        </div>

        {/* ══════════ PROCEDURE ══════════ */}
        <div className="dlv-card">
          <div className="dlv-section-header">
            <span className="dlv-section-num">05</span>
            <h2>Procedure de retour</h2>
          </div>
          <div className="dlv-steps">
            {[
              ['fa-envelope', 'Contactez-nous', 'Par email, telephone ou formulaire de contact en precisant votre numero de commande et le motif.'],
              ['fa-reply', 'Confirmation', 'Nous validons la prise en charge et vous indiquons la marche a suivre.'],
              ['fa-box-open', 'Envoi du retour', 'Emballez soigneusement le livre et envoyez-le a l\'adresse indiquee.'],
              ['fa-money-bill-wave', 'Remboursement', 'Sous 30 jours apres reception et verification, par le meme moyen de paiement.'],
            ].map(([icon, title, desc], i) => (
              <div key={i} className="dlv-step">
                <div className="dlv-step__num">{i + 1}</div>
                <div className="dlv-step__icon"><i className={`fas ${icon}`} /></div>
                <div>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════ CONTACT ══════════ */}
        <div className="dlv-card dlv-card--cta">
          <div className="dlv-cta-content">
            <h2>Une question sur la livraison ou les retours ?</h2>
            <p>
              Notre equipe est disponible pour vous accompagner. Nous repondons generalement
              sous 24 heures.
            </p>
            <div className="dlv-contact-row">
              <a href="mailto:terrenoireeditions@gmail.com" className="dlv-contact-item">
                <i className="fas fa-envelope" /> terrenoireeditions@gmail.com
              </a>
              <a href="tel:+24165348887" className="dlv-contact-item">
                <i className="fas fa-phone" /> +241 65 34 88 87
              </a>
            </div>
            <div className="dlv-cta-btns">
              <Link to="/contact" className="dlv-btn dlv-btn--primary"><i className="fas fa-message" /> Nous contacter</Link>
              <Link to="/faq" className="dlv-btn dlv-btn--outline"><i className="fas fa-circle-question" /> FAQ</Link>
              <Link to="/catalog" className="dlv-btn dlv-btn--outline"><i className="fas fa-book" /> Catalogue</Link>
            </div>
          </div>
        </div>

      </div>
      <div className="dlv-footer-fade" />
    </div>
  );
};

export default Delivery;
