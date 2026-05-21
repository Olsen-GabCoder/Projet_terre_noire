import { Link } from 'react-router-dom';
import '../styles/Privacy.css';

const LAST_UPDATED = '21 mai 2026';

const Privacy = () => {
  return (
    <div className="privacy-page">
      <section className="privacy-hero">
        <div className="privacy-hero__orb privacy-hero__orb--1" />
        <div className="privacy-hero__grid-bg" />
        <div className="privacy-hero__inner">
          <div className="privacy-hero__line" />
          <h1 className="privacy-hero__title">Politique de confidentialite</h1>
          <p className="privacy-hero__sub">
            Terre Noire Editions s&apos;engage a proteger vos donnees personnelles conformement
            a la legislation gabonaise en vigueur.
          </p>
        </div>
      </section>

      <div className="privacy-hero-fade" />

      <div className="privacy-content">
        <p className="prv-intro">
          La presente politique decrit comment Terre Noire Editions collecte, utilise, conserve
          et protege vos donnees personnelles. Derniere mise a jour : <strong>{LAST_UPDATED}</strong>.
        </p>

        {/* ── SOMMAIRE ── */}
        <div className="prv-card prv-card--toc">
          <div className="prv-toc-header">
            <i className="fas fa-shield-halved" />
            <h2>Sommaire</h2>
          </div>
          <ol className="prv-toc">
            {[
              'Responsable du traitement',
              'Cadre juridique',
              'Donnees collectees',
              'Finalites du traitement',
              'Base legale du traitement',
              'Destinataires des donnees',
              'Duree de conservation',
              'Securite des donnees',
              'Vos droits',
              'Cookies et traceurs',
              'Soumission de manuscrits',
              'Newsletter',
              'Mineurs',
              'Transfert de donnees',
              'Modification de la politique',
              'Contact',
            ].map((t, i) => (
              <li key={i}><a href={`#prv-${i + 1}`}>{t}</a></li>
            ))}
          </ol>
        </div>

        {/* ── 1. RESPONSABLE ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">01</span>
            <h2 id="prv-1">Responsable du traitement</h2>
          </div>
          <div className="prv-info-grid">
            <div className="prv-info-row"><span>Responsable</span><strong>Terre Noire Editions</strong></div>
            <div className="prv-info-row"><span>Adresse</span><strong>Port-Gentil, Gabon</strong></div>
            <div className="prv-info-row"><span>Email</span><strong><a href="mailto:terrenoireeditions@gmail.com">terrenoireeditions@gmail.com</a></strong></div>
            <div className="prv-info-row"><span>Telephone</span><strong>+241 65 34 88 87</strong></div>
          </div>
          <p>
            Terre Noire Editions est responsable du traitement des donnees personnelles
            collectees sur le site <strong>terrenoireeditions.com</strong> et de l&apos;ensemble
            des services associes (boutique en ligne, newsletter, soumission de manuscrits,
            formulaire de contact).
          </p>
        </div>

        {/* ── 2. CADRE JURIDIQUE ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">02</span>
            <h2 id="prv-2">Cadre juridique</h2>
          </div>
          <p>
            Le traitement des donnees personnelles par Terre Noire Editions est effectue
            conformement aux textes suivants :
          </p>
          <ul className="prv-law-list">
            <li>
              <strong>Loi n° 001/2011 du 25 septembre 2011</strong> relative a la protection
              des donnees a caractere personnel en Republique gabonaise.
            </li>
            <li>
              <strong>Loi n° 025/2023 du 9 juillet 2023</strong> modifiant et completant
              certaines dispositions de la loi 001/2011, alignant le Gabon sur les standards
              internationaux de protection des donnees.
            </li>
            <li>
              <strong>Loi n° 025/2021 du 28 decembre 2021</strong> portant reglementation des
              transactions electroniques en Republique gabonaise.
            </li>
          </ul>
          <div className="prv-highlight">
            <i className="fas fa-landmark" />
            <p>
              L&apos;autorite de controle competente est l&apos;<strong>APDPVP</strong> (Autorite de
              Protection des Donnees Personnelles et de la Vie Privee du Gabon).
            </p>
          </div>
        </div>

        {/* ── 3. DONNEES COLLECTEES ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">03</span>
            <h2 id="prv-3">Donnees collectees</h2>
          </div>
          <p>
            Nous collectons uniquement les donnees strictement necessaires a la fourniture
            de nos services. Voici les categories de donnees traitees :
          </p>

          <h3><i className="fas fa-user" /> Donnees d&apos;identification</h3>
          <ul>
            <li>Nom, prenom, pseudonyme (le cas echeant)</li>
            <li>Adresse email</li>
            <li>Numero de telephone</li>
            <li>Photo de profil (facultatif)</li>
          </ul>

          <h3><i className="fas fa-map-marker-alt" /> Donnees de livraison</h3>
          <ul>
            <li>Adresse postale (rue, quartier, avenue)</li>
            <li>Ville</li>
            <li>Pays</li>
          </ul>

          <h3><i className="fas fa-shopping-bag" /> Donnees de commande</h3>
          <ul>
            <li>Historique des commandes (articles, quantites, montants)</li>
            <li>Moyen de paiement utilise (type uniquement, jamais les coordonnees bancaires)</li>
            <li>Codes promo utilises</li>
            <li>Adresse de livraison</li>
          </ul>

          <h3><i className="fas fa-laptop" /> Donnees de navigation</h3>
          <ul>
            <li>Adresse IP</li>
            <li>Type de navigateur et systeme d&apos;exploitation</li>
            <li>Pages consultees et duree de visite</li>
            <li>Cookies (voir section 10)</li>
          </ul>

          <h3><i className="fas fa-pen-to-square" /> Donnees de manuscrit</h3>
          <ul>
            <li>Titre, genre, langue, nombre de pages</li>
            <li>Fichier du manuscrit (PDF, DOCX)</li>
            <li>Description et synopsis</li>
          </ul>

          <div className="prv-highlight prv-highlight--green">
            <i className="fas fa-shield-halved" />
            <p>
              <strong>Nous ne collectons jamais :</strong> vos coordonnees bancaires completes,
              votre numero de carte, votre code PIN mobile money, ni aucune donnee biometrique.
              Les paiements sont traites par les operateurs (Airtel, Moov, Visa) sur leurs
              propres plateformes securisees.
            </p>
          </div>
        </div>

        {/* ── 4. FINALITES ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">04</span>
            <h2 id="prv-4">Finalites du traitement</h2>
          </div>
          <div className="prv-purpose-grid">
            {[
              ['fa-bag-shopping', 'Gestion des commandes', 'Traitement, suivi, livraison et facturation de vos achats.'],
              ['fa-user-gear', 'Gestion du compte', 'Creation et administration de votre espace personnel.'],
              ['fa-headset', 'Relation client', 'Reponse a vos demandes, support technique, reclamations.'],
              ['fa-envelope', 'Communication', 'Envoi de newsletters, alertes nouveautes et promotions (avec votre consentement).'],
              ['fa-book-open', 'Selection editoriale', 'Examen des manuscrits soumis et suivi du processus editorial.'],
              ['fa-chart-line', 'Amelioration', 'Analyse de l\'utilisation du site pour ameliorer nos services.'],
              ['fa-gavel', 'Obligations legales', 'Respect de nos obligations comptables, fiscales et reglementaires.'],
            ].map(([icon, title, desc], i) => (
              <div key={i} className="prv-purpose-item">
                <div className="prv-purpose-icon"><i className={`fas ${icon}`} /></div>
                <div>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. BASE LEGALE ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">05</span>
            <h2 id="prv-5">Base legale du traitement</h2>
          </div>
          <p>Chaque traitement repose sur une base legale distincte :</p>
          <div className="prv-table-wrap">
            <table className="prv-table">
              <thead>
                <tr>
                  <th>Traitement</th>
                  <th>Base legale</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Commandes et paiements</td><td>Execution du contrat de vente</td></tr>
                <tr><td>Creation de compte</td><td>Execution du contrat (conditions d&apos;utilisation)</td></tr>
                <tr><td>Newsletter</td><td>Consentement explicite (double opt-in)</td></tr>
                <tr><td>Cookies analytiques</td><td>Consentement</td></tr>
                <tr><td>Formulaire de contact</td><td>Interet legitime (repondre a vos demandes)</td></tr>
                <tr><td>Soumission de manuscrit</td><td>Consentement et interet legitime</td></tr>
                <tr><td>Obligations comptables</td><td>Obligation legale</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 6. DESTINATAIRES ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">06</span>
            <h2 id="prv-6">Destinataires des donnees</h2>
          </div>
          <p>Vos donnees personnelles sont accessibles uniquement aux personnes et entites suivantes :</p>
          <ul>
            <li><strong>L&apos;equipe Terre Noire Editions :</strong> personnel autorise pour la gestion des commandes, du support client et du processus editorial.</li>
            <li><strong>Prestataires de paiement :</strong> Airtel Money, Moov Money (Mobicash), Visa — pour le traitement securise des transactions.</li>
            <li><strong>Prestataires techniques :</strong> hebergeur du site, service d&apos;envoi d&apos;emails — agissant en qualite de sous-traitants et lies par des obligations de confidentialite.</li>
            <li><strong>Transporteurs :</strong> pour la livraison de vos commandes (nom, adresse, telephone).</li>
          </ul>
          <div className="prv-highlight">
            <i className="fas fa-ban" />
            <p>
              <strong>Vos donnees ne sont jamais vendues, louees ou cedees a des tiers a des fins
              commerciales ou publicitaires.</strong>
            </p>
          </div>
        </div>

        {/* ── 7. CONSERVATION ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">07</span>
            <h2 id="prv-7">Duree de conservation</h2>
          </div>
          <div className="prv-table-wrap">
            <table className="prv-table">
              <thead>
                <tr>
                  <th>Type de donnees</th>
                  <th>Duree de conservation</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Donnees de compte client</td><td>Duree de vie du compte + 3 ans apres derniere activite</td></tr>
                <tr><td>Donnees de commande</td><td>10 ans (obligations comptables et fiscales)</td></tr>
                <tr><td>Donnees de facturation</td><td>10 ans (obligation legale)</td></tr>
                <tr><td>Donnees de newsletter</td><td>Jusqu&apos;a desinscription + 30 jours</td></tr>
                <tr><td>Messages de contact</td><td>12 mois apres cloture de la demande</td></tr>
                <tr><td>Manuscrits non retenus</td><td>12 mois apres notification du refus</td></tr>
                <tr><td>Manuscrits acceptes</td><td>Duree du processus editorial et contrat d&apos;edition</td></tr>
                <tr><td>Cookies</td><td>13 mois maximum</td></tr>
                <tr><td>Logs de connexion</td><td>12 mois</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            A l&apos;expiration de ces delais, les donnees sont supprimees ou anonymisees de
            maniere irreversible.
          </p>
        </div>

        {/* ── 8. SECURITE ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">08</span>
            <h2 id="prv-8">Securite des donnees</h2>
          </div>
          <p>
            Terre Noire Editions met en oeuvre les mesures techniques et organisationnelles
            appropriees pour proteger vos donnees contre tout acces non autorise, perte,
            alteration ou divulgation :
          </p>
          <div className="prv-security-grid">
            {[
              ['fa-lock', 'Chiffrement HTTPS', 'Toutes les communications entre votre navigateur et notre serveur sont chiffrees (TLS/SSL).'],
              ['fa-key', 'Authentification securisee', 'Mots de passe hashes, tokens JWT avec cookies HttpOnly, sessions securisees.'],
              ['fa-database', 'Acces restreint', 'Seul le personnel autorise accede aux donnees, avec des niveaux de permissions differencies.'],
              ['fa-shield-halved', 'Paiements securises', 'Aucune coordonnee bancaire n\'est stockee sur nos serveurs. Les transactions sont traitees par les operateurs agrees.'],
            ].map(([icon, title, desc], i) => (
              <div key={i} className="prv-security-item">
                <i className={`fas ${icon}`} />
                <strong>{title}</strong>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 9. DROITS ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">09</span>
            <h2 id="prv-9">Vos droits</h2>
          </div>
          <p>
            Conformement a la <strong>Loi n° 001/2011 modifiee par la Loi n° 025/2023</strong>,
            vous disposez des droits suivants sur vos donnees personnelles :
          </p>
          <div className="prv-rights-grid">
            {[
              ['fa-eye', 'Droit d\'acces', 'Obtenir une copie de l\'ensemble des donnees personnelles que nous detenons a votre sujet.'],
              ['fa-pen', 'Droit de rectification', 'Faire corriger toute donnee inexacte ou incomplete vous concernant.'],
              ['fa-trash-can', 'Droit de suppression', 'Demander l\'effacement de vos donnees, sous reserve de nos obligations legales de conservation.'],
              ['fa-hand', 'Droit d\'opposition', 'Vous opposer au traitement de vos donnees pour des motifs legitimes, notamment pour la prospection.'],
              ['fa-pause', 'Droit a la limitation', 'Demander la suspension du traitement de vos donnees dans certains cas prevus par la loi.'],
              ['fa-download', 'Droit a la portabilite', 'Recevoir vos donnees dans un format structure et couramment utilise.'],
            ].map(([icon, title, desc], i) => (
              <div key={i} className="prv-right-item">
                <div className="prv-right-icon"><i className={`fas ${icon}`} /></div>
                <div>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="prv-highlight">
            <i className="fas fa-envelope" />
            <p>
              Pour exercer vos droits, adressez votre demande par email a{' '}
              <a href="mailto:terrenoireeditions@gmail.com">terrenoireeditions@gmail.com</a>{' '}
              en joignant une copie de votre piece d&apos;identite. Nous nous engageons a repondre
              dans un delai de <strong>30 jours</strong>.
            </p>
          </div>
          <p>
            En cas de litige, vous pouvez introduire une reclamation aupres de l&apos;APDPVP
            (Autorite de Protection des Donnees Personnelles et de la Vie Privee du Gabon).
          </p>
        </div>

        {/* ── 10. COOKIES ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">10</span>
            <h2 id="prv-10">Cookies et traceurs</h2>
          </div>
          <p>
            Notre site utilise des cookies — de petits fichiers texte deposes sur votre
            appareil — pour assurer son bon fonctionnement et ameliorer votre experience.
          </p>
          <div className="prv-table-wrap">
            <table className="prv-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Finalite</th>
                  <th>Duree</th>
                  <th>Consentement</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><strong>Essentiels</strong></td><td>Authentification, panier, securite</td><td>Session / 12h</td><td>Non requis</td></tr>
                <tr><td><strong>Preferences</strong></td><td>Langue, theme, parametres d&apos;affichage</td><td>12 mois</td><td>Non requis</td></tr>
                <tr><td><strong>Analytiques</strong></td><td>Statistiques de frequentation, pages vues</td><td>13 mois</td><td>Requis</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Vous pouvez gerer vos preferences de cookies a tout moment via les parametres
            de votre navigateur. La desactivation de certains cookies peut affecter le
            fonctionnement du site. Pour en savoir plus, consultez notre{' '}
            <Link to="/cookies">politique de cookies</Link>.
          </p>
        </div>

        {/* ── 11. MANUSCRITS ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">11</span>
            <h2 id="prv-11">Soumission de manuscrits</h2>
          </div>
          <p>
            Lorsque vous soumettez un manuscrit via notre formulaire, les donnees suivantes
            sont collectees : nom, prenom, pseudonyme, email, telephone, pays, genre litteraire,
            langue, description et fichier du manuscrit.
          </p>
          <ul>
            <li>Ces donnees sont utilisees <strong>exclusivement</strong> pour le processus de selection editoriale.</li>
            <li>Le comite de lecture examine votre oeuvre et vous contacte par email dans un delai indicatif de 2 a 4 semaines.</li>
            <li>Les manuscrits non retenus sont conserves <strong>12 mois</strong> puis definitivement supprimes.</li>
            <li>Les manuscrits acceptes sont conserves pour la duree du processus editorial.</li>
            <li>Vous pouvez demander le retrait de votre manuscrit a tout moment par email.</li>
          </ul>
        </div>

        {/* ── 12. NEWSLETTER ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">12</span>
            <h2 id="prv-12">Newsletter</h2>
          </div>
          <p>
            L&apos;inscription a notre newsletter est basee sur votre <strong>consentement
            explicite</strong> via un mecanisme de double opt-in :
          </p>
          <ol>
            <li>Vous saisissez votre email dans le formulaire d&apos;inscription.</li>
            <li>Un email de confirmation vous est envoye.</li>
            <li>Vous cliquez sur le lien de confirmation pour activer votre abonnement.</li>
          </ol>
          <p>
            Vous pouvez vous desinscrire a tout moment en cliquant sur le lien
            « Se desinscrire » present en bas de chaque email, ou en nous contactant
            directement. La desinscription est effective immediatement et sans frais.
          </p>
          <p>
            Seule votre adresse email est conservee pour l&apos;envoi de la newsletter.
            Elle est supprimee 30 jours apres votre desinscription.
          </p>
        </div>

        {/* ── 13. MINEURS ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">13</span>
            <h2 id="prv-13">Mineurs</h2>
          </div>
          <p>
            Le site Terre Noire Editions ne s&apos;adresse pas specifiquement aux mineurs.
            Les personnes de moins de 18 ans doivent obtenir le consentement de leur
            representant legal avant de creer un compte, passer commande ou soumettre
            des donnees personnelles.
          </p>
          <p>
            Si nous apprenons que des donnees ont ete collectees aupres d&apos;un mineur
            sans le consentement de son representant legal, nous les supprimerons dans
            les meilleurs delais.
          </p>
        </div>

        {/* ── 14. TRANSFERT ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">14</span>
            <h2 id="prv-14">Transfert de donnees</h2>
          </div>
          <p>
            Dans le cadre de nos services, certaines donnees peuvent etre traitees
            par des prestataires situes en dehors du Gabon (hebergement, envoi d&apos;emails).
            Le cas echeant, nous nous assurons que ces prestataires offrent un niveau
            de protection adequat conformement a la legislation gabonaise.
          </p>
          <p>
            Conformement a la <strong>Loi n° 025/2021</strong>, une copie des donnees
            relatives aux transactions electroniques ayant une implication au Gabon
            est conservee sur le territoire national.
          </p>
        </div>

        {/* ── 15. MODIFICATION ── */}
        <div className="prv-card">
          <div className="prv-section-header">
            <span className="prv-section-num">15</span>
            <h2 id="prv-15">Modification de la politique</h2>
          </div>
          <p>
            Terre Noire Editions se reserve le droit de modifier la presente politique
            de confidentialite a tout moment, afin de la mettre en conformite avec
            les evolutions legislatives ou les changements dans nos pratiques.
          </p>
          <p>
            En cas de modification substantielle, les utilisateurs inscrits en seront
            informes par email. La version en vigueur est celle publiee sur cette page
            avec la date de derniere mise a jour indiquee en haut de page.
          </p>
        </div>

        {/* ── 16. CONTACT ── */}
        <div className="prv-card prv-card--contact">
          <div className="prv-section-header">
            <span className="prv-section-num">16</span>
            <h2 id="prv-16">Contact</h2>
          </div>
          <p>
            Pour toute question relative a la protection de vos donnees personnelles
            ou pour exercer vos droits, contactez-nous :
          </p>
          <div className="prv-contact-grid">
            <a href="mailto:terrenoireeditions@gmail.com" className="prv-contact-item">
              <i className="fas fa-envelope" />
              <span>terrenoireeditions@gmail.com</span>
            </a>
            <a href="tel:+24165348887" className="prv-contact-item">
              <i className="fas fa-phone" />
              <span>+241 65 34 88 87</span>
            </a>
            <Link to="/contact" className="prv-contact-item">
              <i className="fas fa-message" />
              <span>Formulaire de contact</span>
            </Link>
          </div>
          <div className="prv-cta">
            <Link to="/cgv" className="prv-btn prv-btn--outline">
              <i className="fas fa-file-contract" /> Voir les CGV
            </Link>
            <Link to="/cookies" className="prv-btn prv-btn--outline">
              <i className="fas fa-cookie-bite" /> Politique de cookies
            </Link>
            <Link to="/catalog" className="prv-btn prv-btn--primary">
              <i className="fas fa-book" /> Retour au catalogue
            </Link>
          </div>
        </div>

      </div>
      <div className="privacy-footer-fade" />
    </div>
  );
};

export default Privacy;
