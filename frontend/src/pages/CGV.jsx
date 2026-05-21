import { Link } from 'react-router-dom';
import '../styles/CGV.css';

const LAST_UPDATED = '21 mai 2026';

const CGV = () => {
  return (
    <div className="cgv-page">
      <section className="cgv-hero">
        <div className="cgv-hero__orb cgv-hero__orb--1" />
        <div className="cgv-hero__grid-bg" />
        <div className="cgv-hero__inner">
          <div className="cgv-hero__line" />
          <h1 className="cgv-hero__title">Conditions generales de vente</h1>
          <p className="cgv-hero__sub">
            Les presentes conditions regissent l&apos;ensemble des ventes realisees par Terre Noire Editions.
          </p>
        </div>
      </section>

      <div className="cgv-hero-fade" />

      <div className="cgv-content">
        <p className="cgv-intro">
          En passant commande sur notre site, vous acceptez sans reserve les presentes Conditions Generales de Vente.
          Derniere mise a jour : <strong>{LAST_UPDATED}</strong>.
        </p>

        {/* ── TABLE DES MATIERES ── */}
        <div className="cgv-card" style={{ marginBottom: 24, padding: '20px 28px' }}>
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Sommaire</h2>
          <ol className="cgv-toc">
            {[
              'Identification du vendeur',
              'Objet et champ d\'application',
              'Produits',
              'Prix et fiscalite',
              'Commandes',
              'Moyens de paiement',
              'Livraison',
              'Droit de retractation et retours',
              'Garanties',
              'Contenus numeriques (ebooks)',
              'Propriete intellectuelle',
              'Responsabilite',
              'Donnees personnelles',
              'Reglement des litiges',
              'Dispositions finales',
            ].map((title, i) => (
              <li key={i}><a href={`#cgv-${i + 1}`}>{title}</a></li>
            ))}
          </ol>
        </div>

        <div className="cgv-card">

          {/* ── 1. IDENTIFICATION ── */}
          <h2 id="cgv-1">Article 1 — Identification du vendeur</h2>
          <div className="cgv-info-grid">
            <div className="cgv-info-row"><span>Denomination sociale</span><strong>Terre Noire Editions</strong></div>
            <div className="cgv-info-row"><span>Siege social</span><strong>Port-Gentil, Gabon</strong></div>
            <div className="cgv-info-row"><span>Email</span><strong><a href="mailto:terrenoireeditions@gmail.com">terrenoireeditions@gmail.com</a></strong></div>
            <div className="cgv-info-row"><span>Telephone</span><strong>+241 65 34 88 87 / +241 07 65 93 535</strong></div>
            <div className="cgv-info-row"><span>Directeur de la publication</span><strong>Terre Noire Editions</strong></div>
          </div>

          {/* ── 2. OBJET ── */}
          <h2 id="cgv-2">Article 2 — Objet et champ d&apos;application</h2>
          <p>
            Les presentes Conditions Generales de Vente (ci-apres « CGV ») s&apos;appliquent a l&apos;ensemble des ventes
            de livres (format papier et numerique) realisees par Terre Noire Editions aupres de toute personne
            physique ou morale (ci-apres « le Client ») via le site internet <strong>terrenoireeditions.com</strong>.
          </p>
          <p>
            Elles sont conclues conformement a la legislation gabonaise en vigueur, notamment la
            <strong> Loi n° 025/2021 du 28 decembre 2021</strong> portant reglementation des transactions electroniques
            en Republique gabonaise, ainsi qu&apos;aux dispositions du droit commercial OHADA applicables.
          </p>
          <p>
            Toute commande implique l&apos;acceptation pleine et entiere des presentes CGV. Terre Noire Editions
            se reserve le droit de les modifier a tout moment ; les conditions applicables sont celles en vigueur
            au jour de la validation de la commande.
          </p>

          {/* ── 3. PRODUITS ── */}
          <h2 id="cgv-3">Article 3 — Produits</h2>
          <p>
            Terre Noire Editions propose a la vente des ouvrages litteraires en deux formats :
          </p>
          <ul>
            <li><strong>Livres papier :</strong> ouvrages imprimes, neufs, livres physiquement au Client.</li>
            <li><strong>Ebooks :</strong> ouvrages au format numerique (PDF), accessibles par telechargement apres achat.</li>
          </ul>
          <p>
            Les descriptions et photographies des produits sont aussi fideles que possible. Toutefois,
            de legeres variations (couleur de couverture, mise en page) peuvent exister entre la
            presentation en ligne et le produit recu. Ces variations ne sauraient constituer un defaut
            de conformite.
          </p>
          <p>
            Les produits sont proposes dans la limite des stocks disponibles. En cas d&apos;indisponibilite
            apres validation de la commande, le Client en sera informe dans les meilleurs delais et
            pourra choisir entre un remplacement ou un remboursement integral.
          </p>

          {/* ── 4. PRIX ── */}
          <h2 id="cgv-4">Article 4 — Prix et fiscalite</h2>
          <p>
            Les prix sont indiques en <strong>Francs CFA (XAF)</strong>, monnaie ayant cours legal dans la
            zone CEMAC. Ils sont exprimes toutes taxes comprises (TTC), incluant la Taxe sur la Valeur
            Ajoutee (TVA) au taux en vigueur en Republique gabonaise (<strong>18 %</strong>).
          </p>
          <p>
            Les frais de livraison ne sont pas inclus dans le prix des produits et sont calcules
            separement lors de la commande (voir Article 7). Terre Noire Editions se reserve le droit
            de modifier ses prix a tout moment. Les produits seront factures sur la base des tarifs
            en vigueur au moment de la validation de la commande.
          </p>

          {/* ── 5. COMMANDES ── */}
          <h2 id="cgv-5">Article 5 — Commandes</h2>
          <p>Le processus de commande se deroule en quatre etapes :</p>
          <ol>
            <li><strong>Selection :</strong> le Client ajoute les ouvrages souhaites a son panier.</li>
            <li><strong>Verification :</strong> le Client verifie le contenu de son panier, les quantites et les prix.</li>
            <li><strong>Paiement :</strong> le Client choisit son moyen de paiement et procede au reglement.</li>
            <li><strong>Confirmation :</strong> un email de confirmation recapitulant la commande est envoye au Client.</li>
          </ol>
          <p>
            La validation de la commande vaut acceptation des prix, des quantites, de la nature
            des produits et des frais de livraison. Terre Noire Editions se reserve le droit de
            refuser ou d&apos;annuler toute commande en cas de :
          </p>
          <ul>
            <li>Incident de paiement ou paiement non confirme ;</li>
            <li>Adresse de livraison incomplete ou erronee ;</li>
            <li>Commande anormale ou suspicion de fraude ;</li>
            <li>Indisponibilite du produit apres validation.</li>
          </ul>

          {/* ── 6. PAIEMENT ── */}
          <h2 id="cgv-6">Article 6 — Moyens de paiement</h2>
          <p>Le Client peut regler sa commande par les moyens suivants :</p>
          <ul>
            <li><strong>Mobicash (Moov Money) :</strong> paiement mobile via le reseau Moov Africa.</li>
            <li><strong>Airtel Money :</strong> paiement mobile via le reseau Airtel Gabon.</li>
            <li><strong>Carte bancaire :</strong> Visa, via passerelle de paiement securisee.</li>
            <li><strong>Especes :</strong> paiement a la livraison (uniquement pour les livraisons a Port-Gentil).</li>
          </ul>
          <p>
            Le paiement est exigible a la commande. Les transactions electroniques sont securisees.
            Le Client garantit qu&apos;il dispose des autorisations necessaires pour utiliser le moyen
            de paiement choisi. En cas d&apos;echec ou de refus du paiement, la commande est automatiquement
            annulee.
          </p>

          {/* ── 7. LIVRAISON ── */}
          <h2 id="cgv-7">Article 7 — Livraison</h2>
          <h3>7.1 Zones et delais</h3>
          <p>Terre Noire Editions livre sur l&apos;ensemble du territoire gabonais :</p>
          <ul>
            <li><strong>Port-Gentil :</strong> livraison sous 24 a 72 heures ouvrees.</li>
            <li><strong>Libreville et grandes villes :</strong> livraison sous 3 a 7 jours ouvres.</li>
            <li><strong>Autres localites :</strong> livraison sous 5 a 10 jours ouvres.</li>
          </ul>
          <p>
            Les delais indiques sont estimatifs. Terre Noire Editions ne saurait etre tenue
            responsable des retards dus au transporteur ou a un cas de force majeure.
          </p>
          <h3>7.2 Frais de livraison</h3>
          <p>
            Les frais de livraison sont calcules en fonction de la destination et du montant
            de la commande. Ils sont affiches au Client avant la validation de la commande.
            Un seuil de gratuite peut etre applique ; les conditions en vigueur sont consultables
            sur la page panier au moment de la commande.
          </p>
          <p>
            Les ebooks (contenus numeriques) ne sont pas soumis a des frais de livraison.
            Ils sont accessibles immediatement apres confirmation du paiement.
          </p>
          <h3>7.3 Transfert des risques</h3>
          <p>
            Le transfert des risques de perte ou d&apos;endommagement du produit intervient au moment
            de la remise du colis au Client. En cas de colis endommage a la reception, le Client
            doit emettre des reserves aupres du transporteur et contacter Terre Noire Editions
            dans un delai de 48 heures.
          </p>

          {/* ── 8. RETRACTATION ── */}
          <h2 id="cgv-8">Article 8 — Droit de retractation et retours</h2>
          <h3>8.1 Livres papier</h3>
          <p>
            Conformement a l&apos;article 57 de la <strong>Loi n° 025/2021</strong>, le Client dispose d&apos;un
            delai de <strong>quatorze (14) jours calendaires</strong> a compter de la reception du
            produit pour exercer son droit de retractation, sans avoir a justifier de motif
            ni a payer de penalites.
          </p>
          <p>Pour exercer ce droit, le Client doit :</p>
          <ol>
            <li>Notifier sa decision par email a <a href="mailto:terrenoireeditions@gmail.com">terrenoireeditions@gmail.com</a> ou via le <Link to="/contact">formulaire de contact</Link>.</li>
            <li>Retourner le produit dans son etat d&apos;origine : non lu, non annote, non corne, non tache, avec son emballage.</li>
          </ol>
          <p>
            Les frais de retour sont a la charge du Client, sauf en cas de produit defectueux
            ou d&apos;erreur imputable a Terre Noire Editions.
            Le remboursement est effectue dans un delai maximum de <strong>30 jours</strong> suivant
            la reception et la verification du retour, par le meme moyen de paiement que celui
            utilise pour la commande.
          </p>
          <h3>8.2 Contenus numeriques (ebooks)</h3>
          <p>
            Conformement a la loi, le droit de retractation <strong>ne s&apos;applique pas</strong> aux
            contenus numeriques fournis sans support materiel dont l&apos;execution a commence avec
            l&apos;accord prealable et expres du Client. Lors de l&apos;achat d&apos;un ebook, le Client
            reconnait expressement renoncer a son droit de retractation des le debut du telechargement.
          </p>
          <p>
            En cas de fichier defectueux ou inaccessible, Terre Noire Editions s&apos;engage a
            renvoyer un lien de telechargement fonctionnel dans les meilleurs delais.
          </p>

          {/* ── 9. GARANTIES ── */}
          <h2 id="cgv-9">Article 9 — Garanties</h2>
          <p>Tous les ouvrages vendus beneficient :</p>
          <ul>
            <li>
              <strong>Garantie legale de conformite :</strong> le produit livre doit correspondre
              a la description et aux caracteristiques annoncees. En cas de defaut de conformite
              (pages manquantes, erreur d&apos;impression, produit different de la commande), le Client
              peut demander le remplacement ou le remboursement du produit.
            </li>
            <li>
              <strong>Garantie des vices caches :</strong> conformement au Code civil gabonais,
              Terre Noire Editions est tenue des defauts caches rendant le produit impropre a
              l&apos;usage auquel il est destine.
            </li>
          </ul>
          <p>
            Pour faire valoir ces garanties, le Client doit contacter Terre Noire Editions
            en fournissant une description du defaut constate et, si possible, des photographies.
          </p>

          {/* ── 10. EBOOKS ── */}
          <h2 id="cgv-10">Article 10 — Contenus numeriques (ebooks)</h2>
          <h3>10.1 Nature du contrat</h3>
          <p>
            L&apos;achat d&apos;un ebook confere au Client une <strong>licence d&apos;utilisation personnelle,
            non exclusive et non transferable</strong>. Le Client n&apos;acquiert pas la propriete
            intellectuelle de l&apos;oeuvre mais un droit de lecture strictement personnel et prive.
          </p>
          <h3>10.2 Conditions d&apos;utilisation</h3>
          <ul>
            <li>L&apos;ebook est fourni au format PDF.</li>
            <li>Le telechargement est accessible depuis l&apos;espace client apres confirmation du paiement.</li>
            <li>Toute copie, redistribution, revente, pret, mise a disposition publique ou modification du fichier est <strong>strictement interdite</strong>.</li>
            <li>L&apos;usage est reserve a un cadre strictement personnel et prive.</li>
          </ul>

          {/* ── 11. PROPRIETE INTELLECTUELLE ── */}
          <h2 id="cgv-11">Article 11 — Propriete intellectuelle</h2>
          <p>
            L&apos;ensemble des contenus du site (textes, images, logos, maquettes, graphismes, charte
            graphique, base de donnees) sont proteges par le <strong>droit d&apos;auteur gabonais</strong> (Loi
            n° 1/87/PR du 29 juillet 1987) et par l&apos;<strong>Accord de Bangui</strong> de l&apos;Organisation
            Africaine de la Propriete Intellectuelle (OAPI).
          </p>
          <p>
            Les ouvrages publies par Terre Noire Editions sont des oeuvres protegees. Toute
            reproduction, representation, adaptation, traduction ou exploitation, totale ou
            partielle, par quelque procede que ce soit, sans autorisation ecrite prealable de
            Terre Noire Editions ou des ayants droit, est illicite et constitue une contrefacon
            sanctionnee par la loi.
          </p>
          <p>
            La marque « Terre Noire Editions », son logo et ses elements distinctifs sont proteges.
            Leur utilisation sans autorisation est interdite.
          </p>

          {/* ── 12. RESPONSABILITE ── */}
          <h2 id="cgv-12">Article 12 — Responsabilite</h2>
          <p>
            Terre Noire Editions s&apos;engage a fournir des produits conformes a la commande et
            a mettre en oeuvre tous les moyens necessaires au bon fonctionnement du site.
          </p>
          <p>La responsabilite de Terre Noire Editions ne saurait etre engagee dans les cas suivants :</p>
          <ul>
            <li>Force majeure (evenement imprevisible, irresistible et exterieur, au sens du droit civil gabonais et du droit OHADA) ;</li>
            <li>Dysfonctionnement technique independant de sa volonte (interruption du reseau internet, du service d&apos;hebergement, etc.) ;</li>
            <li>Utilisation non conforme du produit par le Client ;</li>
            <li>Retard imputable au transporteur ;</li>
            <li>Inexactitude des informations fournies par le Client (adresse, telephone).</li>
          </ul>
          <p>
            En tout etat de cause, la responsabilite de Terre Noire Editions est limitee au
            montant de la commande concernee. Les dommages indirects (perte de profit, perte
            de donnees, prejudice commercial) sont exclus sauf en cas de faute lourde ou intentionnelle.
          </p>

          {/* ── 13. DONNEES PERSONNELLES ── */}
          <h2 id="cgv-13">Article 13 — Donnees personnelles</h2>
          <p>
            Les donnees personnelles collectees lors de la commande (nom, email, adresse, telephone)
            sont traitees conformement a la <strong>Loi n° 001/2011 du 25 septembre 2011</strong> relative
            a la protection des donnees a caractere personnel, modifiee par la <strong>Loi n° 025/2023
            du 9 juillet 2023</strong>.
          </p>
          <p>Ces donnees sont collectees pour les finalites suivantes :</p>
          <ul>
            <li>Traitement et suivi des commandes ;</li>
            <li>Gestion de la relation client ;</li>
            <li>Envoi de la newsletter (avec consentement prealable du Client) ;</li>
            <li>Amelioration de nos services.</li>
          </ul>
          <p>
            Le Client dispose d&apos;un droit d&apos;acces, de rectification et de suppression de ses donnees.
            Pour exercer ces droits, il peut contacter Terre Noire Editions par email ou consulter
            notre <Link to="/privacy">politique de confidentialite</Link>.
          </p>
          <p>
            Les donnees ne sont jamais cedees a des tiers a des fins commerciales. Elles sont
            conservees pendant la duree necessaire au traitement de la commande et a la gestion
            de la relation client, conformement a la reglementation en vigueur.
          </p>

          {/* ── 14. LITIGES ── */}
          <h2 id="cgv-14">Article 14 — Reglement des litiges</h2>
          <p>
            En cas de differend relatif a l&apos;interpretation ou a l&apos;execution des presentes CGV,
            les parties s&apos;engagent a rechercher une solution amiable avant toute action judiciaire.
          </p>
          <p>Le reglement des litiges s&apos;effectue selon la procedure suivante :</p>
          <ol>
            <li>
              <strong>Reclamation amiable :</strong> le Client adresse sa reclamation par email a{' '}
              <a href="mailto:terrenoireeditions@gmail.com">terrenoireeditions@gmail.com</a> ou par
              telephone au +241 65 34 88 87. Terre Noire Editions s&apos;engage a repondre dans
              un delai de <strong>30 jours</strong>.
            </li>
            <li>
              <strong>Mediation :</strong> a defaut de resolution amiable, le Client peut saisir
              le Service de Securite des Consommateurs de la DGCCRF (Direction Generale de la
              Concurrence, de la Consommation et de la Repression des Fraudes du Gabon).
            </li>
            <li>
              <strong>Juridiction competente :</strong> en dernier recours, tout litige sera soumis
              aux tribunaux competents de la Republique gabonaise, conformement au droit gabonais
              et aux dispositions du droit OHADA.
            </li>
          </ol>

          {/* ── 15. DISPOSITIONS FINALES ── */}
          <h2 id="cgv-15">Article 15 — Dispositions finales</h2>
          <p>
            Si l&apos;une des clauses des presentes CGV etait declaree nulle ou inapplicable, les
            autres clauses conserveraient leur pleine validite et continueraient a s&apos;appliquer.
          </p>
          <p>
            Le fait pour Terre Noire Editions de ne pas exercer un droit prevu par les presentes
            CGV ne constitue pas une renonciation a ce droit.
          </p>
          <p>
            Les presentes CGV sont redigees en langue francaise. En cas de traduction, seule la
            version francaise fera foi.
          </p>
          <p>
            <strong>Droit applicable :</strong> les presentes CGV sont soumises au droit de la
            Republique gabonaise.
          </p>

          {/* ── CTA ── */}
          <div className="cgv-cta">
            <Link to="/contact" className="cgv-btn cgv-btn--primary">
              <i className="fas fa-envelope" style={{ marginRight: 8 }} />
              Nous contacter
            </Link>
            <Link to="/catalog" className="cgv-btn cgv-btn--outline">
              <i className="fas fa-book" style={{ marginRight: 8 }} />
              Retour au catalogue
            </Link>
          </div>
        </div>
      </div>
      <div className="cgv-footer-fade" />
    </div>
  );
};

export default CGV;
