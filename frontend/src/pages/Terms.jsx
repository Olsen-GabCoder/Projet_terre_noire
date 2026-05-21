import { Link } from 'react-router-dom';
import '../styles/Terms.css';

const LAST_UPDATED = '21 mai 2026';

const Terms = () => (
  <div className="terms-page">
    <section className="terms-hero">
      <div className="terms-hero__orb terms-hero__orb--1" />
      <div className="terms-hero__grid-bg" />
      <div className="terms-hero__inner">
        <div className="terms-hero__line" />
        <h1 className="terms-hero__title">Conditions generales d&apos;utilisation</h1>
        <p className="terms-hero__sub">
          Regles d&apos;utilisation du site et des services de Terre Noire Editions.
        </p>
      </div>
    </section>
    <div className="terms-hero-fade" />

    <div className="terms-content">
      <p className="tm-intro">
        L&apos;acces et l&apos;utilisation du site <strong>terrenoireeditions.com</strong> sont
        soumis aux presentes Conditions Generales d&apos;Utilisation (CGU). En naviguant sur
        le site, vous les acceptez sans reserve. Derniere mise a jour : <strong>{LAST_UPDATED}</strong>.
      </p>

      {/* ── SOMMAIRE ── */}
      <div className="tm-card tm-card--toc">
        <div className="tm-toc-header">
          <i className="fas fa-file-lines" />
          <h2>Sommaire</h2>
        </div>
        <ol className="tm-toc">
          {[
            'Definitions',
            'Objet',
            'Editeur du site et mentions legales',
            'Acces au site',
            'Inscription et compte utilisateur',
            'Securite du compte',
            'Obligations generales de l\'utilisateur',
            'Comportements interdits',
            'Contenu utilisateur (avis, commentaires, notes)',
            'Moderation et signalement',
            'Soumission de manuscrits',
            'Boutique en ligne et commandes',
            'Contenus numeriques (ebooks)',
            'Liste d\'envie (wishlist)',
            'Newsletter',
            'Propriete intellectuelle',
            'Marques et logos',
            'Liens hypertextes',
            'Disponibilite et maintenance du site',
            'Securite du site',
            'Limitation de responsabilite',
            'Force majeure',
            'Donnees personnelles et cookies',
            'Notifications et communications',
            'Modification des CGU',
            'Nullite partielle',
            'Droit applicable et litiges',
            'Contact',
          ].map((t, i) => (
            <li key={i}><a href={`#tm-${i + 1}`}>{t}</a></li>
          ))}
        </ol>
      </div>

      {/* ── 1. DEFINITIONS ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">01</span>
          <h2 id="tm-1">Definitions</h2>
        </div>
        <p>Dans les presentes CGU, les termes suivants ont la signification ci-apres :</p>
        <div className="tm-info-grid">
          <div className="tm-info-row"><span>« Site »</span><strong>Le site internet terrenoireeditions.com et l&apos;ensemble de ses sous-domaines</strong></div>
          <div className="tm-info-row"><span>« Editeur »</span><strong>Terre Noire Editions, editeur et proprietaire du Site</strong></div>
          <div className="tm-info-row"><span>« Utilisateur »</span><strong>Toute personne accedant au Site, inscrite ou non</strong></div>
          <div className="tm-info-row"><span>« Client »</span><strong>Utilisateur ayant passe une commande sur le Site</strong></div>
          <div className="tm-info-row"><span>« Compte »</span><strong>Espace personnel cree par l&apos;Utilisateur lors de son inscription</strong></div>
          <div className="tm-info-row"><span>« Contenu »</span><strong>Tout element publie sur le Site (textes, images, avis, commentaires)</strong></div>
          <div className="tm-info-row"><span>« Services »</span><strong>L&apos;ensemble des fonctionnalites proposees par le Site</strong></div>
          <div className="tm-info-row"><span>« Ebook »</span><strong>Ouvrage au format numerique (PDF) accessible par telechargement ou lecture en ligne</strong></div>
        </div>
      </div>

      {/* ── 2. OBJET ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">02</span>
          <h2 id="tm-2">Objet</h2>
        </div>
        <p>
          Les presentes Conditions Generales d&apos;Utilisation (ci-apres « CGU ») ont pour
          objet de definir les regles d&apos;acces et d&apos;utilisation du Site edite par Terre
          Noire Editions, maison d&apos;edition litteraire africaine basee a Port-Gentil, Gabon.
        </p>
        <p>Le Site propose les Services suivants :</p>
        <ul>
          <li>Consultation du catalogue de livres (papier et numeriques)</li>
          <li>Achat en ligne de livres avec livraison au Gabon</li>
          <li>Lecture en ligne d&apos;ebooks achetes</li>
          <li>Creation et gestion d&apos;un compte client personnel</li>
          <li>Gestion d&apos;une liste d&apos;envie (wishlist)</li>
          <li>Depot d&apos;avis et de commentaires sur les ouvrages</li>
          <li>Soumission de manuscrits pour examen editorial</li>
          <li>Inscription a la newsletter</li>
          <li>Formulaire de contact pour toute question ou demande</li>
          <li>Utilisation de codes promotionnels</li>
        </ul>
        <p>
          Les presentes CGU completent les <Link to="/cgv">Conditions Generales de Vente</Link> (CGV)
          qui regissent specifiquement les transactions commerciales, la <Link to="/privacy">Politique
          de confidentialite</Link> et la <Link to="/cookies">Politique de cookies</Link>.
        </p>
        <p>
          En cas de contradiction entre les CGU et les CGV, les CGV prevalent pour tout
          ce qui concerne les operations d&apos;achat et de vente.
        </p>
      </div>

      {/* ── 3. EDITEUR ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">03</span>
          <h2 id="tm-3">Editeur du site et mentions legales</h2>
        </div>
        <div className="tm-info-grid">
          <div className="tm-info-row"><span>Denomination</span><strong>Terre Noire Editions</strong></div>
          <div className="tm-info-row"><span>Siege social</span><strong>Port-Gentil, Gabon</strong></div>
          <div className="tm-info-row"><span>Email</span><strong><a href="mailto:terrenoireeditions@gmail.com">terrenoireeditions@gmail.com</a></strong></div>
          <div className="tm-info-row"><span>Telephone</span><strong>+241 65 34 88 87 / +241 07 65 93 535</strong></div>
          <div className="tm-info-row"><span>Directeur de la publication</span><strong>Terre Noire Editions</strong></div>
        </div>
        <p>
          Le Site est concu, developpe et maintenu par Terre Noire Editions. Les contenus
          editoriaux (fiches livres, biographies d&apos;auteurs, descriptions) sont rediges par
          l&apos;equipe editoriale de Terre Noire Editions ou fournis par les auteurs eux-memes.
        </p>
      </div>

      {/* ── 4. ACCES ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">04</span>
          <h2 id="tm-4">Acces au site</h2>
        </div>
        <h3>4.1 Acces libre</h3>
        <p>
          L&apos;acces au Site est ouvert a toute personne disposant d&apos;un acces a internet,
          sans restriction geographique. La consultation du catalogue, des fiches auteurs,
          des pages d&apos;information (a propos, FAQ, livraison) et des contenus editoriaux
          est libre et gratuite, sans obligation d&apos;inscription.
        </p>
        <h3>4.2 Acces avec compte</h3>
        <p>Certaines fonctionnalites necessitent la creation d&apos;un Compte :</p>
        <ul>
          <li>Passer une commande et suivre son statut</li>
          <li>Gerer sa liste d&apos;envie (sauvegardee de maniere permanente)</li>
          <li>Deposer un avis ou un commentaire sur un ouvrage</li>
          <li>Repondre aux avis d&apos;autres lecteurs</li>
          <li>Consulter l&apos;historique detaille de ses commandes</li>
          <li>Acceder a la liseuse ebook en ligne pour les livres achetes</li>
          <li>Telecharger les factures de ses commandes</li>
          <li>Modifier ses informations personnelles et de livraison</li>
        </ul>
        <h3>4.3 Configuration technique requise</h3>
        <p>
          Pour une experience optimale, l&apos;Utilisateur doit disposer d&apos;un navigateur web
          a jour (Chrome, Firefox, Safari, Edge dans leurs versions recentes), d&apos;une
          connexion internet stable et d&apos;un ecran d&apos;une resolution minimale de 320 pixels
          de large (compatible mobile).
        </p>
        <h3>4.4 Restriction d&apos;acces</h3>
        <p>
          Terre Noire Editions se reserve le droit de restreindre, suspendre ou interrompre
          l&apos;acces au Site, en tout ou partie, temporairement ou definitivement, sans preavis,
          notamment pour des raisons de maintenance, de mise a jour, de securite ou de
          force majeure. Aucune indemnite ne pourra etre reclamee a ce titre.
        </p>
      </div>

      {/* ── 5. INSCRIPTION ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">05</span>
          <h2 id="tm-5">Inscription et compte utilisateur</h2>
        </div>
        <h3>5.1 Conditions d&apos;inscription</h3>
        <p>
          L&apos;inscription est ouverte a toute personne physique agee d&apos;au moins 18 ans ou
          disposant de l&apos;autorisation de son representant legal. Les personnes morales
          peuvent egalement creer un compte pour des achats professionnels.
        </p>
        <p>
          L&apos;Utilisateur s&apos;engage a fournir des informations exactes, completes et a jour
          lors de son inscription. Tout compte cree avec des informations manifestement
          fausses pourra etre supprime sans preavis.
        </p>
        <h3>5.2 Processus d&apos;inscription</h3>
        <p>L&apos;inscription se fait en renseignant les informations suivantes :</p>
        <ul>
          <li>Nom et prenom (obligatoires)</li>
          <li>Adresse email valide (obligatoire, sert d&apos;identifiant)</li>
          <li>Mot de passe securise (obligatoire, minimum 8 caracteres recommandes)</li>
          <li>Numero de telephone (facultatif a l&apos;inscription, requis pour commander)</li>
          <li>Adresse de livraison (facultative a l&apos;inscription, requise pour commander)</li>
        </ul>
        <p>
          Un email de bienvenue est envoye a l&apos;Utilisateur apres la creation de son Compte.
          L&apos;inscription vaut acceptation des presentes CGU.
        </p>
        <h3>5.3 Unicite du compte</h3>
        <p>
          Chaque Utilisateur ne peut detenir qu&apos;un seul Compte. La creation de comptes
          multiples pour une meme personne est interdite et peut entrainer la suspension
          de l&apos;ensemble des comptes concernes.
        </p>
        <h3>5.4 Modification des informations</h3>
        <p>
          L&apos;Utilisateur peut modifier ses informations personnelles a tout moment depuis
          son espace « Mon profil ». Il est de sa responsabilite de maintenir ses informations
          a jour, notamment son adresse de livraison et son numero de telephone.
        </p>
        <h3>5.5 Suppression du compte</h3>
        <p>
          L&apos;Utilisateur peut demander la suppression de son Compte a tout moment en
          contactant le service client par email a{' '}
          <a href="mailto:terrenoireeditions@gmail.com">terrenoireeditions@gmail.com</a>.
          La suppression est effective sous 30 jours. Les donnees de facturation sont
          conservees conformement aux obligations legales (voir <Link to="/privacy">Politique
          de confidentialite</Link>).
        </p>
      </div>

      {/* ── 6. SECURITE COMPTE ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">06</span>
          <h2 id="tm-6">Securite du compte</h2>
        </div>
        <p>
          L&apos;Utilisateur est seul responsable de la confidentialite et de la securite de
          ses identifiants de connexion (adresse email et mot de passe).
        </p>
        <ul>
          <li>
            <strong>Mot de passe :</strong> l&apos;Utilisateur doit choisir un mot de passe
            robuste et ne pas le communiquer a des tiers. Il est recommande d&apos;utiliser
            un mot de passe d&apos;au moins 8 caracteres combinant lettres, chiffres et
            caracteres speciaux.
          </li>
          <li>
            <strong>Responsabilite :</strong> toute action effectuee depuis le Compte de
            l&apos;Utilisateur avec ses identifiants est reputee avoir ete faite par
            l&apos;Utilisateur lui-meme. Terre Noire Editions ne saurait etre tenue responsable
            d&apos;un acces non autorise resultant de la negligence de l&apos;Utilisateur dans
            la protection de ses identifiants.
          </li>
          <li>
            <strong>Signalement :</strong> en cas de perte, de vol ou de suspicion
            d&apos;utilisation frauduleuse de ses identifiants, l&apos;Utilisateur doit en informer
            immediatement Terre Noire Editions par email et proceder au changement de son
            mot de passe via la fonction « Mot de passe oublie ».
          </li>
        </ul>
        <div className="tm-highlight">
          <i className="fas fa-shield-halved" />
          <p>
            Terre Noire Editions met en oeuvre des mesures de securite avancees (chiffrement
            des mots de passe, authentification par tokens securises, cookies HttpOnly) pour
            proteger les comptes de ses Utilisateurs.
          </p>
        </div>
      </div>

      {/* ── 7. OBLIGATIONS ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">07</span>
          <h2 id="tm-7">Obligations generales de l&apos;utilisateur</h2>
        </div>
        <p>En accedant au Site et en utilisant les Services, l&apos;Utilisateur s&apos;engage a :</p>
        <ul>
          <li>Utiliser le Site conformement a sa destination et dans le respect de la legislation en vigueur en Republique gabonaise.</li>
          <li>Respecter les droits de propriete intellectuelle de Terre Noire Editions, de ses auteurs et de tout tiers.</li>
          <li>Fournir des informations exactes et a jour lors de toute interaction avec le Site (inscription, commande, contact, soumission de manuscrit).</li>
          <li>Ne pas porter atteinte a l&apos;ordre public, aux bonnes moeurs ou aux droits de tiers.</li>
          <li>Ne pas utiliser le Site a des fins commerciales non autorisees (revente, affiliation non agreee, publicite non sollicitee).</li>
          <li>Respecter les presentes CGU ainsi que les CGV, la Politique de confidentialite et la Politique de cookies.</li>
        </ul>
      </div>

      {/* ── 8. COMPORTEMENTS INTERDITS ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">08</span>
          <h2 id="tm-8">Comportements interdits</h2>
        </div>
        <p>Il est strictement interdit de :</p>
        <ul>
          <li>Tenter d&apos;acceder de maniere non autorisee aux systemes informatiques du Site, aux comptes d&apos;autres Utilisateurs ou aux bases de donnees (piratage, hacking, brute force).</li>
          <li>Introduire des virus, logiciels malveillants, chevaux de Troie, vers ou tout code nuisible sur le Site.</li>
          <li>Surcharger volontairement les serveurs du Site (attaques DDoS, requetes massives automatisees).</li>
          <li>Utiliser des robots, scripts, scrapers, crawlers ou tout moyen automatise pour acceder au Site, extraire des donnees ou reproduire son contenu.</li>
          <li>Collecter, stocker ou exploiter les donnees personnelles d&apos;autres Utilisateurs sans leur consentement.</li>
          <li>Usurper l&apos;identite d&apos;un tiers ou creer un faux profil.</li>
          <li>Publier, diffuser ou transmettre tout contenu illicite, diffamatoire, injurieux, discriminatoire, menaçant, obscene, pornographique ou contraire aux bonnes moeurs.</li>
          <li>Publier des contenus a caractere publicitaire, promotionnel ou de spam sans autorisation prealable.</li>
          <li>Contourner, desactiver ou interferer avec les mesures de securite du Site.</li>
          <li>Reproduire, copier, vendre, revendre ou exploiter toute partie du Site a des fins commerciales sans autorisation ecrite.</li>
          <li>Utiliser le Site pour des activites frauduleuses, de blanchiment d&apos;argent ou contraires a la loi.</li>
        </ul>
        <div className="tm-highlight">
          <i className="fas fa-gavel" />
          <p>
            <strong>Sanctions :</strong> tout manquement aux presentes regles peut entrainer,
            sans mise en demeure prealable : la suppression du contenu litigieux, la suspension
            temporaire ou definitive du Compte, l&apos;interdiction d&apos;acces au Site, et le cas
            echeant, des poursuites judiciaires et la reparation du prejudice subi par Terre
            Noire Editions.
          </p>
        </div>
      </div>

      {/* ── 9. CONTENU UTILISATEUR ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">09</span>
          <h2 id="tm-9">Contenu utilisateur (avis, commentaires, notes)</h2>
        </div>
        <h3>9.1 Publication d&apos;avis</h3>
        <p>
          Les Utilisateurs inscrits peuvent deposer des avis et attribuer des notes (de 1 a 5
          etoiles) sur les ouvrages du catalogue. Chaque Utilisateur ne peut deposer qu&apos;un
          seul avis principal par ouvrage. Il peut le modifier ou le supprimer a tout moment.
        </p>
        <h3>9.2 Reponses aux avis</h3>
        <p>
          Les Utilisateurs inscrits peuvent repondre aux avis d&apos;autres lecteurs. Les reponses
          ne comportent pas de note et sont rattachees a l&apos;avis parent.
        </p>
        <h3>9.3 Likes</h3>
        <p>
          Les Utilisateurs inscrits peuvent indiquer qu&apos;un avis leur a ete utile en cliquant
          sur « J&apos;aime ». Chaque Utilisateur ne peut liker un meme avis qu&apos;une seule fois.
        </p>
        <h3>9.4 Engagements de l&apos;Utilisateur</h3>
        <p>En publiant un contenu sur le Site, l&apos;Utilisateur :</p>
        <ul>
          <li>Garantit en etre l&apos;auteur original et detenir tous les droits necessaires a sa publication.</li>
          <li>Accorde a Terre Noire Editions un droit non exclusif, gratuit, mondial et pour la duree legale de protection des droits d&apos;auteur, d&apos;afficher, reproduire et adapter ce contenu sur le Site et ses supports de communication.</li>
          <li>S&apos;engage a publier des contenus pertinents, en rapport avec l&apos;ouvrage concerne.</li>
          <li>S&apos;engage a respecter les regles de courtoisie et de bienseance.</li>
          <li>S&apos;interdit de publier des spoilers majeurs sans avertissement, des propos hors sujet, des attaques personnelles ou des contenus promotionnels.</li>
        </ul>
        <h3>9.5 Responsabilite</h3>
        <p>
          L&apos;Utilisateur est seul responsable du contenu qu&apos;il publie. Terre Noire Editions
          ne saurait etre tenue responsable des propos tenus par les Utilisateurs.
        </p>
      </div>

      {/* ── 10. MODERATION ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">10</span>
          <h2 id="tm-10">Moderation et signalement</h2>
        </div>
        <h3>10.1 Moderation</h3>
        <p>
          Terre Noire Editions se reserve le droit de moderer a posteriori tout contenu publie
          par les Utilisateurs. Sont susceptibles d&apos;etre supprimes sans preavis ni justification :
        </p>
        <ul>
          <li>Les contenus contraires aux lois en vigueur</li>
          <li>Les propos injurieux, diffamatoires, discriminatoires ou haineux</li>
          <li>Les contenus sans rapport avec l&apos;ouvrage concerne</li>
          <li>Les contenus a caractere publicitaire ou promotionnel</li>
          <li>Les contenus portant atteinte aux droits de tiers</li>
          <li>Les faux avis ou avis manifestement non authentiques</li>
        </ul>
        <h3>10.2 Signalement</h3>
        <p>
          Tout Utilisateur peut signaler un contenu qu&apos;il juge inapproprie en contactant
          Terre Noire Editions par email. Le signalement sera examine dans les meilleurs delais.
        </p>
      </div>

      {/* ── 11. MANUSCRITS ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">11</span>
          <h2 id="tm-11">Soumission de manuscrits</h2>
        </div>
        <p>
          Terre Noire Editions propose un formulaire en ligne permettant aux auteurs de soumettre
          leurs manuscrits pour examen editorial. En soumettant un manuscrit, l&apos;auteur :
        </p>
        <ul>
          <li>Certifie etre l&apos;auteur original de l&apos;oeuvre soumise ou disposer des droits necessaires.</li>
          <li>Garantit que l&apos;oeuvre ne fait l&apos;objet d&apos;aucun contrat d&apos;exclusivite avec un autre editeur.</li>
          <li>Accepte que Terre Noire Editions examine son oeuvre sans garantie de publication.</li>
          <li>Comprend que la decision du comite de lecture est souveraine et definitive.</li>
          <li>Accepte que le delai d&apos;examen est de 2 a 4 semaines (indicatif).</li>
        </ul>
        <p>
          Les manuscrits non retenus sont conserves pendant 12 mois puis supprimes. L&apos;auteur
          peut demander le retrait anticipe de son manuscrit par email. En cas d&apos;acceptation,
          un contrat d&apos;edition specifique sera negocie et conclu separement.
        </p>
        <p>
          Les formats acceptes sont : PDF et DOCX. La taille maximale du fichier est
          determinee par les limites techniques du formulaire.
        </p>
      </div>

      {/* ── 12. BOUTIQUE ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">12</span>
          <h2 id="tm-12">Boutique en ligne et commandes</h2>
        </div>
        <p>
          L&apos;utilisation de la boutique en ligne (ajout au panier, passation de commande,
          paiement, suivi de livraison) est regie par les <Link to="/cgv">Conditions Generales
          de Vente</Link>. Les CGU s&apos;appliquent en complement pour tout ce qui concerne
          l&apos;utilisation du Site en tant que plateforme.
        </p>
        <p>
          L&apos;Utilisateur s&apos;engage a ne pas detourner les fonctionnalites de la boutique
          (commandes fictives, utilisation abusive de codes promotionnels, manipulation
          des prix ou des stocks). Tout comportement frauduleux sera sanctionne.
        </p>
      </div>

      {/* ── 13. EBOOKS ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">13</span>
          <h2 id="tm-13">Contenus numeriques (ebooks)</h2>
        </div>
        <p>
          Les ebooks achetes sur le Site sont accessibles via la liseuse integree ou par
          telechargement au format PDF. L&apos;achat confere a l&apos;Utilisateur une licence
          d&apos;utilisation personnelle, non exclusive et non transferable.
        </p>
        <p>Il est strictement interdit de :</p>
        <ul>
          <li>Copier, reproduire ou redistribuer un ebook achete, en tout ou partie.</li>
          <li>Partager son acces a la liseuse avec des tiers.</li>
          <li>Contourner les mesures techniques de protection du contenu.</li>
          <li>Mettre a disposition publique un ebook sur internet, les reseaux sociaux ou toute plateforme de partage.</li>
          <li>Modifier, adapter, traduire ou creer des oeuvres derivees a partir du contenu d&apos;un ebook.</li>
        </ul>
        <p>
          Tout manquement a ces regles constitue une contrefacon sanctionnee par la loi
          (Loi n° 1/87/PR du 29 juillet 1987 et Accord de Bangui de l&apos;OAPI).
        </p>
      </div>

      {/* ── 14. WISHLIST ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">14</span>
          <h2 id="tm-14">Liste d&apos;envie (wishlist)</h2>
        </div>
        <p>
          Le Site propose une fonctionnalite de liste d&apos;envie permettant de sauvegarder
          les ouvrages qui interessent l&apos;Utilisateur.
        </p>
        <ul>
          <li><strong>Utilisateurs non connectes :</strong> la liste est sauvegardee localement sur l&apos;appareil (localStorage). Elle peut etre perdue en cas de suppression des donnees du navigateur.</li>
          <li><strong>Utilisateurs connectes :</strong> la liste est sauvegardee en base de donnees et accessible depuis tout appareil. Lors de la connexion, la liste locale est automatiquement fusionnee avec la liste en ligne.</li>
        </ul>
        <p>
          L&apos;ajout d&apos;un ouvrage a la liste d&apos;envie ne constitue ni une reservation ni une
          garantie de disponibilite.
        </p>
      </div>

      {/* ── 15. NEWSLETTER ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">15</span>
          <h2 id="tm-15">Newsletter</h2>
        </div>
        <p>
          L&apos;Utilisateur peut s&apos;inscrire a la newsletter de Terre Noire Editions via le
          formulaire present dans le pied de page du Site. L&apos;inscription repose sur un
          mecanisme de double opt-in :
        </p>
        <ol>
          <li>Saisie de l&apos;adresse email dans le formulaire.</li>
          <li>Reception d&apos;un email de confirmation avec un lien a cliquer.</li>
          <li>Activation de l&apos;abonnement apres clic sur le lien (valable 72 heures).</li>
        </ol>
        <p>
          La newsletter contient des informations sur les nouveautes, les promotions et
          l&apos;actualite de la maison d&apos;edition. L&apos;Utilisateur peut se desinscrire a tout
          moment en cliquant sur le lien « Se desinscrire » present dans chaque email.
          La desinscription est effective immediatement et sans frais.
        </p>
        <p>
          Seule l&apos;adresse email est conservee pour l&apos;envoi de la newsletter. Aucune
          autre donnee n&apos;est collectee a cette fin.
        </p>
      </div>

      {/* ── 16. PROPRIETE INTELLECTUELLE ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">16</span>
          <h2 id="tm-16">Propriete intellectuelle</h2>
        </div>
        <p>
          L&apos;ensemble des elements composant le Site sont proteges par le droit de la
          propriete intellectuelle :
        </p>
        <ul>
          <li><strong>Contenus editoriaux :</strong> textes, descriptions, fiches livres, biographies d&apos;auteurs, articles.</li>
          <li><strong>Elements graphiques :</strong> design, charte graphique, maquettes, icons, illustrations, photographies.</li>
          <li><strong>Elements techniques :</strong> architecture du site, code source, base de donnees, algorithmes.</li>
          <li><strong>Ouvrages :</strong> les livres publies par Terre Noire Editions, en format papier comme numerique, sont des oeuvres protegees dont les droits appartiennent a leurs auteurs et/ou a Terre Noire Editions.</li>
        </ul>
        <p>
          Ces elements sont proteges par le <strong>droit d&apos;auteur gabonais</strong> (Loi
          n° 1/87/PR du 29 juillet 1987 instituant la protection du droit d&apos;auteur et
          des droits voisins) et par l&apos;<strong>Accord de Bangui</strong> de l&apos;Organisation
          Africaine de la Propriete Intellectuelle (OAPI).
        </p>
        <p>
          Toute reproduction, representation, modification, publication, transmission,
          denaturation, totale ou partielle, par quelque procede que ce soit, sans
          autorisation ecrite prealable, est interdite et constitue une contrefacon
          passible de sanctions penales et civiles.
        </p>
        <p>
          L&apos;Utilisateur est autorise a consulter le Site et a imprimer des pages pour
          son usage personnel et prive uniquement. Toute autre utilisation necessite
          une autorisation ecrite.
        </p>
      </div>

      {/* ── 17. MARQUES ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">17</span>
          <h2 id="tm-17">Marques et logos</h2>
        </div>
        <p>
          La denomination « Terre Noire Editions », son logo, sa charte graphique et
          ses elements distinctifs sont des marques protegees. Leur reproduction,
          imitation ou utilisation, totale ou partielle, sans autorisation ecrite
          prealable, est interdite.
        </p>
        <p>
          Les noms des auteurs, titres d&apos;ouvrages et visuels de couvertures appartiennent
          a leurs titulaires respectifs et sont utilises sur le Site a des fins de
          presentation et de commercialisation dans le cadre de contrats d&apos;edition.
        </p>
      </div>

      {/* ── 18. LIENS ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">18</span>
          <h2 id="tm-18">Liens hypertextes</h2>
        </div>
        <h3>18.1 Liens sortants</h3>
        <p>
          Le Site peut contenir des liens vers des sites tiers (reseaux sociaux, prestataires
          de paiement, partenaires, references bibliographiques). Terre Noire Editions n&apos;exerce
          aucun controle sur ces sites et decline toute responsabilite quant a leur contenu,
          leurs pratiques de confidentialite, leur securite ou leur disponibilite.
        </p>
        <p>
          L&apos;Utilisateur accede aux sites tiers sous sa propre responsabilite. Il est invite
          a consulter les conditions d&apos;utilisation et la politique de confidentialite de
          chaque site tiers avant de communiquer ses donnees personnelles.
        </p>
        <h3>18.2 Liens entrants</h3>
        <p>
          La creation de liens hypertextes pointant vers le Site est autorisee, sous reserve :
        </p>
        <ul>
          <li>De ne pas porter atteinte a l&apos;image ou a la reputation de Terre Noire Editions.</li>
          <li>De ne pas creer d&apos;impression de partenariat ou d&apos;affiliation non agreee.</li>
          <li>De ne pas utiliser de techniques de framing (cadrage), d&apos;inline linking ou de deep linking sans autorisation.</li>
          <li>De ne pas reproduire le contenu du Site dans un contexte trompeur ou prejudiciable.</li>
        </ul>
        <p>
          Terre Noire Editions se reserve le droit de demander la suppression de tout lien
          ne respectant pas ces conditions.
        </p>
      </div>

      {/* ── 19. DISPONIBILITE ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">19</span>
          <h2 id="tm-19">Disponibilite et maintenance du site</h2>
        </div>
        <p>
          Terre Noire Editions s&apos;efforce de maintenir le Site accessible 24 heures sur 24,
          7 jours sur 7. Toutefois, l&apos;Editeur ne garantit pas une disponibilite permanente
          et ininterrompue.
        </p>
        <p>L&apos;acces au Site peut etre temporairement interrompu en raison de :</p>
        <ul>
          <li>Operations de maintenance preventive ou corrective</li>
          <li>Mises a jour techniques ou de contenu</li>
          <li>Dysfonctionnements techniques (panne serveur, reseau, hebergeur)</li>
          <li>Incidents de securite necessitant une intervention immediate</li>
          <li>Cas de force majeure</li>
        </ul>
        <p>
          Terre Noire Editions s&apos;engage a informer les Utilisateurs dans la mesure du
          possible en cas de maintenance programmee. Aucune indemnite ne peut etre
          reclamee du fait de l&apos;indisponibilite du Site.
        </p>
      </div>

      {/* ── 20. SECURITE SITE ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">20</span>
          <h2 id="tm-20">Securite du site</h2>
        </div>
        <p>
          Terre Noire Editions met en oeuvre des mesures de securite adaptees pour
          proteger le Site et les donnees de ses Utilisateurs :
        </p>
        <ul>
          <li>Chiffrement des communications (protocole HTTPS / TLS)</li>
          <li>Protection des mots de passe par algorithme de hachage</li>
          <li>Authentification securisee par tokens</li>
          <li>Protection contre les attaques courantes (injection SQL, XSS, CSRF)</li>
          <li>Limitation du debit des requetes (rate limiting) pour prevenir les abus</li>
          <li>Sauvegardes regulieres des donnees</li>
        </ul>
        <p>
          L&apos;Utilisateur est responsable de la protection de son propre equipement
          informatique. Il est recommande d&apos;utiliser un antivirus a jour, un pare-feu
          actif et de maintenir son navigateur et son systeme d&apos;exploitation a jour.
        </p>
      </div>

      {/* ── 21. RESPONSABILITE ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">21</span>
          <h2 id="tm-21">Limitation de responsabilite</h2>
        </div>
        <p>
          Terre Noire Editions met tout en oeuvre pour fournir des informations fiables
          et a jour sur le Site. Toutefois, des erreurs, omissions ou inexactitudes
          peuvent survenir. Les informations sont fournies a titre indicatif et ne
          sauraient constituer un conseil juridique, financier ou professionnel.
        </p>
        <p>Terre Noire Editions ne saurait etre tenue responsable :</p>
        <ul>
          <li>Des dommages directs ou indirects resultant de l&apos;utilisation ou de l&apos;impossibilite d&apos;utiliser le Site.</li>
          <li>Des interruptions de service, pertes de donnees, virus ou attaques informatiques.</li>
          <li>Du contenu des sites tiers accessibles via des liens hypertextes.</li>
          <li>Des informations erronees saisies par l&apos;Utilisateur.</li>
          <li>De l&apos;utilisation frauduleuse du Compte de l&apos;Utilisateur par un tiers.</li>
          <li>De l&apos;incompatibilite du Site avec l&apos;equipement de l&apos;Utilisateur.</li>
          <li>Des contenus publies par les Utilisateurs (avis, commentaires).</li>
        </ul>
        <p>
          En tout etat de cause, la responsabilite de Terre Noire Editions au titre des
          presentes CGU est limitee aux dommages directs et previsibles, et ne saurait
          exceder le montant total des achats effectues par l&apos;Utilisateur au cours des
          12 derniers mois.
        </p>
      </div>

      {/* ── 22. FORCE MAJEURE ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">22</span>
          <h2 id="tm-22">Force majeure</h2>
        </div>
        <p>
          Terre Noire Editions ne saurait etre tenue responsable de l&apos;inexecution totale
          ou partielle de ses obligations si cette inexecution est due a un cas de force
          majeure, au sens du droit civil gabonais et du droit OHADA, c&apos;est-a-dire un
          evenement imprevisible, irresistible et exterieur a la volonte des parties.
        </p>
        <p>
          Sont notamment consideres comme des cas de force majeure : les catastrophes
          naturelles, les epidemies et pandemies, les conflits armes, les greves generales,
          les defaillances des reseaux de telecommunications ou d&apos;electricite, les decisions
          gouvernementales ou reglementaires, les cyberattaques majeures.
        </p>
        <p>
          En cas de force majeure, les obligations de Terre Noire Editions sont suspendues
          pendant la duree de l&apos;evenement. Si l&apos;evenement se prolonge au-dela de 3 mois,
          chacune des parties pourra resilier le contrat sans indemnite.
        </p>
      </div>

      {/* ── 23. DONNEES ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">23</span>
          <h2 id="tm-23">Donnees personnelles et cookies</h2>
        </div>
        <p>
          La collecte et le traitement des donnees personnelles sont effectues conformement
          a la <strong>Loi n° 001/2011 du 25 septembre 2011</strong> modifiee par la{' '}
          <strong>Loi n° 025/2023 du 9 juillet 2023</strong> relative a la protection des
          donnees a caractere personnel en Republique gabonaise.
        </p>
        <p>
          Pour toute information detaillee sur la nature des donnees collectees, les finalites
          du traitement, la duree de conservation, vos droits et les mesures de securite
          mises en oeuvre, consultez :
        </p>
        <ul>
          <li><Link to="/privacy">Politique de confidentialite</Link></li>
          <li><Link to="/cookies">Politique de cookies</Link></li>
        </ul>
      </div>

      {/* ── 24. NOTIFICATIONS ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">24</span>
          <h2 id="tm-24">Notifications et communications</h2>
        </div>
        <p>
          En utilisant le Site, l&apos;Utilisateur accepte de recevoir des communications
          electroniques de la part de Terre Noire Editions, notamment :
        </p>
        <ul>
          <li><strong>Emails transactionnels :</strong> confirmation de commande, de paiement, d&apos;expedition, factures. Ces emails sont necessaires a l&apos;execution du contrat et ne peuvent etre desactives.</li>
          <li><strong>Emails de service :</strong> changement de statut de manuscrit, notification de changement des CGU, alertes de securite du compte. Ces emails sont necessaires au fonctionnement des Services.</li>
          <li><strong>Emails marketing :</strong> newsletter, promotions, nouveautes. Ces emails sont envoyes uniquement avec le consentement prealable de l&apos;Utilisateur et peuvent etre desactives a tout moment.</li>
        </ul>
      </div>

      {/* ── 25. MODIFICATION CGU ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">25</span>
          <h2 id="tm-25">Modification des CGU</h2>
        </div>
        <p>
          Terre Noire Editions se reserve le droit de modifier les presentes CGU a tout moment,
          afin de les adapter aux evolutions legislatives, reglementaires ou aux modifications
          des Services proposes.
        </p>
        <p>
          En cas de modification substantielle, les Utilisateurs inscrits en seront informes
          par email au moins 15 jours avant l&apos;entree en vigueur des nouvelles conditions.
          La poursuite de l&apos;utilisation du Site apres l&apos;entree en vigueur des modifications
          vaut acceptation des nouvelles CGU.
        </p>
        <p>
          La version en vigueur est celle publiee sur cette page avec la date de derniere
          mise a jour indiquee en haut du document.
        </p>
      </div>

      {/* ── 26. NULLITE ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">26</span>
          <h2 id="tm-26">Nullite partielle</h2>
        </div>
        <p>
          Si l&apos;une quelconque des clauses des presentes CGU etait declaree nulle ou
          inapplicable par une juridiction competente, cette nullite n&apos;affecterait pas
          la validite des autres clauses, qui conserveraient leur pleine force et effet.
        </p>
        <p>
          Le fait pour Terre Noire Editions de ne pas exercer a un moment donne un droit
          prevu par les presentes CGU ne constitue en aucun cas une renonciation a ce droit.
        </p>
      </div>

      {/* ── 27. DROIT APPLICABLE ── */}
      <div className="tm-card">
        <div className="tm-section-header">
          <span className="tm-section-num">27</span>
          <h2 id="tm-27">Droit applicable et litiges</h2>
        </div>
        <p>
          Les presentes CGU sont redigees en langue francaise et sont soumises au
          <strong> droit de la Republique gabonaise</strong>. En cas de traduction, seule
          la version francaise fait foi.
        </p>
        <p>
          En cas de differend relatif a l&apos;interpretation, la validite ou l&apos;execution des
          presentes CGU, les parties s&apos;engagent a rechercher une solution amiable
          prealablement a toute action judiciaire.
        </p>
        <p>La procedure de resolution est la suivante :</p>
        <ol>
          <li>
            <strong>Reclamation amiable :</strong> l&apos;Utilisateur adresse sa reclamation par
            email a <a href="mailto:terrenoireeditions@gmail.com">terrenoireeditions@gmail.com</a>.
            Terre Noire Editions s&apos;engage a repondre dans un delai de 30 jours.
          </li>
          <li>
            <strong>Mediation :</strong> a defaut de resolution amiable, les parties peuvent
            recourir a un mediateur conformement a l&apos;Acte Uniforme OHADA relatif a la
            mediation.
          </li>
          <li>
            <strong>Juridiction competente :</strong> en dernier recours, tout litige sera
            soumis aux tribunaux competents de la Republique gabonaise.
          </li>
        </ol>
      </div>

      {/* ── 28. CONTACT ── */}
      <div className="tm-card tm-card--contact">
        <div className="tm-section-header">
          <span className="tm-section-num">28</span>
          <h2 id="tm-28">Contact</h2>
        </div>
        <p>
          Pour toute question relative aux presentes CGU, a l&apos;utilisation du Site ou
          aux Services proposes par Terre Noire Editions, contactez-nous :
        </p>
        <div className="tm-contact-row">
          <a href="mailto:terrenoireeditions@gmail.com" className="tm-contact-item">
            <i className="fas fa-envelope" />
            <span>terrenoireeditions@gmail.com</span>
          </a>
          <a href="tel:+24165348887" className="tm-contact-item">
            <i className="fas fa-phone" />
            <span>+241 65 34 88 87</span>
          </a>
          <Link to="/contact" className="tm-contact-item">
            <i className="fas fa-message" />
            <span>Formulaire de contact</span>
          </Link>
        </div>
        <div className="tm-cta">
          <Link to="/cgv" className="tm-btn tm-btn--outline">
            <i className="fas fa-file-contract" /> Conditions de vente
          </Link>
          <Link to="/privacy" className="tm-btn tm-btn--outline">
            <i className="fas fa-shield-halved" /> Confidentialite
          </Link>
          <Link to="/cookies" className="tm-btn tm-btn--outline">
            <i className="fas fa-cookie-bite" /> Cookies
          </Link>
          <Link to="/catalog" className="tm-btn tm-btn--primary">
            <i className="fas fa-book" /> Retour au catalogue
          </Link>
        </div>
      </div>

    </div>
    <div className="terms-footer-fade" />
  </div>
);

export default Terms;
