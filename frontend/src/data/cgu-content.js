/**
 * Contenu des Conditions Générales d'Utilisation de Frollot.
 *
 * Ce fichier est la source unique du texte des CGU.
 * Le composant Terms.jsx le consomme et le rend.
 * Pour corriger le texte, modifier uniquement ce fichier.
 */

export const CGU_LAST_UPDATED = '2026-04-12';

export const CGU_SECTIONS = [
  // ═══════════════════════════════════════════
  // SECTION 1 — Préambule
  // ═══════════════════════════════════════════
  {
    id: 'section-1',
    number: '1',
    title: 'Préambule',
    content: `
<p>Frollot est une plateforme numérique dédiée au livre et à l'écosystème éditorial en Afrique francophone. Sa mission est de connecter les acteurs du livre — auteurs, maisons d'édition, libraires, bibliothèques, prestataires de services éditoriaux, livreurs et lecteurs — au sein d'un espace commun, équitable et transparent.</p>

<p>Frollot a été conçu avec la conviction que le monde du livre en Afrique francophone mérite une infrastructure numérique à la hauteur de sa richesse culturelle et de son potentiel créatif. La plateforme s'adresse en priorité à l'ensemble des pays d'Afrique francophone, tout en étant accessible depuis n'importe quel pays du monde.</p>

<p>La plateforme réunit plusieurs grandes familles de fonctionnalités, qui peuvent évoluer dans le temps :</p>

<ul>
  <li><strong>Un espace de soumission de manuscrits</strong>, permettant aux auteurs de proposer leurs œuvres directement aux maisons d'édition partenaires ou de les rendre visibles sur un marché ouvert où plusieurs éditeurs peuvent manifester leur intérêt.</li>
  <li><strong>Un système de devis éditoriaux</strong>, facilitant la négociation transparente entre auteurs et éditeurs, encadré par des règles éthiques destinées à protéger les auteurs contre les pratiques éditoriales abusives. Frollot ne perçoit aucune commission sur les contrats d'édition conclus via la plateforme.</li>
  <li><strong>Un catalogue de livres et une marketplace</strong>, où les maisons d'édition, les librairies et les vendeurs indépendants peuvent proposer leurs ouvrages à la vente, en format papier ou numérique.</li>
  <li><strong>Une marketplace de services professionnels</strong>, mettant en relation les auteurs, les éditeurs et les porteurs de projets éditoriaux avec des prestataires qualifiés : correcteurs, illustrateurs, traducteurs, maquettistes, graphistes.</li>
  <li><strong>Un réseau de bibliothèques</strong>, permettant aux bibliothèques partenaires de gérer leurs collections, leurs adhésions, leurs prêts et leurs réservations via la plateforme.</li>
  <li><strong>Un espace social et communautaire</strong>, comprenant un fil d'actualité, des clubs de lecture avec messagerie intégrée, des listes de lecture partagées, des avis et des recommandations entre lecteurs.</li>
  <li><strong>Un réseau logistique</strong>, coordonnant la livraison des ouvrages physiques à travers les pays couverts par la plateforme, en s'appuyant sur des livreurs partenaires indépendants.</li>
</ul>

<p>Frollot fournit l'infrastructure technique permettant à ses utilisateurs d'interagir, de publier, de vendre, d'acheter et de collaborer. La plateforme agit en qualité d'hébergeur et d'intermédiaire technique au sens des législations applicables et n'exerce pas de contrôle éditorial a priori sur les contenus publiés par ses utilisateurs.</p>

<p>Les présentes Conditions Générales d'Utilisation (ci-après « les CGU ») définissent les règles applicables à tout utilisateur de la plateforme Frollot, quels que soient son pays de résidence, son profil et l'usage qu'il fait des services proposés. Elles constituent un contrat entre l'utilisateur et la société exploitant Frollot. L'inscription sur la plateforme ou l'utilisation de ses services vaut acceptation pleine et entière des présentes CGU.</p>

<p>Des conditions spécifiques peuvent s'appliquer à certaines catégories de services (Conditions Générales de Vente pour les achats de livres, conditions propres aux abonnements Frollot Pro, conditions spécifiques aux prestataires de services professionnels). En cas de contradiction entre les présentes CGU et des conditions spécifiques, ces dernières prévalent pour le service concerné.</p>
`
  },

  // ═══════════════════════════════════════════
  // SECTION 2 — Définitions
  // ═══════════════════════════════════════════
  {
    id: 'section-2',
    number: '2',
    title: 'Définitions',
    content: `
<p>Les termes définis ci-dessous ont la signification qui leur est attribuée dans la présente section, qu'ils soient employés au singulier ou au pluriel. Dans l'ensemble des présentes CGU, ces termes apparaissent avec une majuscule initiale afin de signaler qu'ils renvoient à leur définition. Pour faciliter la lecture, les définitions sont regroupées par thématiques.</p>

<h3>Termes structurants</h3>

<p><strong>Plateforme</strong> ou <strong>Frollot</strong> : l'ensemble des services, fonctionnalités, interfaces et contenus accessibles via le site web frollot.com, ses sous-domaines, ses applications mobiles éventuelles et toute autre interface numérique exploitée par la Société exploitante sous la marque Frollot.</p>

<p><strong>Société exploitante</strong> : la société de droit gabonais exploitant la Plateforme Frollot, dont le siège social est situé à Libreville, Gabon. Désignée ci-après indifféremment par « Frollot », « nous » ou « la Société ».</p>

<p><strong>Utilisateur</strong> : toute personne physique qui crée un Compte sur la Plateforme et accepte les présentes CGU. Un Utilisateur peut cumuler plusieurs Profils et exercer simultanément plusieurs rôles sur la Plateforme. Les entreprises et autres entités juridiques ne créent pas de Compte en tant que telles, mais sont représentées sur la Plateforme via des Organisations administrées par une ou plusieurs personnes physiques.</p>

<p><strong>Compte</strong> : l'espace personnel créé par un Utilisateur lors de son inscription sur la Plateforme, protégé par des identifiants de connexion (adresse email et mot de passe), et donnant accès à l'ensemble des fonctionnalités autorisées par le ou les Profils activés. Un seul Compte est autorisé par personne physique.</p>

<p><strong>Profil</strong> : une facette fonctionnelle du Compte de l'Utilisateur, correspondant à un rôle spécifique sur la Plateforme (Lecteur, Auteur, Éditeur, Correcteur, Illustrateur, Traducteur, Livreur, etc.). Un Utilisateur peut activer un ou plusieurs Profils depuis son Compte. Chaque Profil peut disposer d'une page publique accessible aux autres Utilisateurs.</p>

<p><strong>Visiteur</strong> : toute personne qui consulte la Plateforme sans disposer d'un Compte ou sans être connectée. Le Visiteur a accès aux contenus publics de la Plateforme mais ne peut pas interagir avec les autres Utilisateurs ni utiliser les fonctionnalités réservées aux Utilisateurs inscrits.</p>

<h3>Catégories d'utilisateurs</h3>

<p><strong>Lecteur</strong> : Utilisateur dont le Profil lui permet de consulter le catalogue, d'acheter des Livres, de publier des Avis, de rejoindre des Clubs de lecture, de constituer des Listes de lecture et des Listes de souhaits, et de participer à la vie sociale de la Plateforme. Tout Utilisateur dispose par défaut d'un Profil Lecteur.</p>

<p><strong>Auteur</strong> : Utilisateur dont le Profil lui permet de soumettre des Manuscrits aux Maisons d'édition via la Plateforme, de recevoir et de négocier des Devis éditoriaux, et de disposer d'une page publique présentant ses œuvres.</p>

<p><strong>Éditeur</strong> : Utilisateur dont le Profil lui permet d'exercer des fonctions éditoriales au sein d'une Organisation de type Maison d'édition.</p>

<p><strong>Prestataire de services professionnels</strong> : Utilisateur dont le Profil correspond à l'un des métiers suivants : Correcteur, Illustrateur, Traducteur, Maquettiste ou Graphiste.</p>

<p><strong>Libraire</strong> : Utilisateur exerçant des fonctions au sein d'une Organisation de type Librairie.</p>

<p><strong>Bibliothécaire</strong> : Utilisateur exerçant des fonctions au sein d'une Organisation de type Bibliothèque.</p>

<p><strong>Livreur</strong> : Utilisateur dont le Profil lui permet d'assurer la livraison physique de Commandes.</p>

<p><strong>Vendeur</strong> : Utilisateur ou Membre d'Organisation autorisé à proposer des Livres à la vente via la Marketplace de la Plateforme, qu'il s'agisse de livres neufs ou d'occasion. Le terme Vendeur peut désigner une personne agissant en son nom propre ou au nom d'une Maison d'édition, d'une Librairie ou de toute autre Organisation autorisée à vendre sur la Plateforme.</p>

<p><strong>Administrateur de plateforme</strong> : membre de l'équipe Frollot disposant de droits d'administration sur l'ensemble de la Plateforme. Les Administrateurs de plateforme agissent au nom et pour le compte de la Société exploitante.</p>

<h3>Organisations</h3>

<p><strong>Organisation</strong> : entité professionnelle créée sur la Plateforme par un Utilisateur et rattachée à l'un des types suivants : Maison d'édition, Librairie, Bibliothèque ou Imprimerie.</p>

<p><strong>Maison d'édition</strong> : Organisation dont l'activité principale est l'édition et la publication de Livres.</p>

<p><strong>Librairie</strong> : Organisation dont l'activité principale est la vente de Livres.</p>

<p><strong>Bibliothèque</strong> : Organisation dont l'activité principale est le prêt de Livres et l'accueil de lecteurs.</p>

<p><strong>Imprimerie</strong> : Organisation dont l'activité principale est l'impression de Livres.</p>

<p><strong>Membre d'Organisation</strong> : Utilisateur rattaché à une Organisation avec un Rôle défini.</p>

<p><strong>Rôle</strong> : niveau de responsabilité et de permissions attribué à un Membre au sein d'une Organisation. Les Rôles disponibles sont : <strong>Propriétaire</strong> (créateur, tous les droits), <strong>Administrateur</strong> (droits étendus de gestion), <strong>Éditeur</strong> (gestion éditoriale), <strong>Commercial</strong> (gestion des ventes et relations clients), <strong>Membre</strong> (accès limité en lecture).</p>

<h3>Contenus et œuvres</h3>

<p><strong>Manuscrit</strong> : fichier numérique (au format PDF, DOC ou DOCX) soumis par un Auteur via la Plateforme en vue d'être proposé à une ou plusieurs Maisons d'édition.</p>

<p><strong>Œuvre</strong> : toute création intellectuelle originale soumise, publiée ou référencée sur la Plateforme.</p>

<p><strong>Livre</strong> : ouvrage référencé dans le catalogue de la Plateforme, disponible à la vente en format papier et/ou numérique.</p>

<p><strong>Livre numérique</strong> ou <strong>Ebook</strong> : Livre disponible sous forme de fichier téléchargeable. L'achat d'un Livre numérique confère à l'acheteur un droit d'usage personnel, non cessible et non transférable.</p>

<p><strong>Catalogue</strong> : l'ensemble des Livres référencés et disponibles sur la Plateforme.</p>

<p><strong>Avis</strong> : appréciation rédigée par un Utilisateur à propos d'un Livre ou d'une Organisation, pouvant inclure une note chiffrée (de 1 à 5) et un commentaire textuel.</p>

<p><strong>Contenu utilisateur</strong> : tout contenu publié sur la Plateforme par un Utilisateur, notamment les Avis, les commentaires, les messages de Club de lecture, les publications sur le Fil d'actualité et tout autre texte, image ou fichier mis en ligne.</p>

<h3>Transactions et services</h3>

<p><strong>Devis éditorial</strong> ou <strong>DQE</strong> (Devis Quantitatif Éditorial) : document chiffré émis par une Maison d'édition à destination d'un Auteur, détaillant les conditions financières et techniques proposées pour la publication d'un Manuscrit.</p>

<p><strong>Modèle de publication</strong> : cadre contractuel proposé pour la publication d'un Manuscrit. Les modèles incluent : <strong>Compte d'éditeur</strong>, <strong>Coédition</strong>, <strong>Compte d'auteur</strong>, <strong>Auto-édition accompagnée</strong>, <strong>Numérique pur</strong> et <strong>Réédition</strong>.</p>

<p><strong>Projet éditorial</strong> : espace de suivi créé automatiquement lors de l'acceptation d'un DQE.</p>

<p><strong>Commande</strong> : transaction par laquelle un Utilisateur achète un ou plusieurs Livres via la Plateforme.</p>

<p><strong>Service professionnel</strong> : prestation proposée par un Prestataire via la Marketplace de services professionnels (correction, illustration, traduction, conception de couverture, mise en page, relecture).</p>

<p><strong>Demande de service</strong> : requête formulée par un Utilisateur à destination d'un Prestataire.</p>

<p><strong>Adhérent</strong> : Utilisateur ayant souscrit une Adhésion auprès d'une Bibliothèque, lui ouvrant les droits associés à cette Adhésion.</p>

<p><strong>Adhésion</strong> : inscription d'un Utilisateur auprès d'une Bibliothèque. L'Adhésion peut être de type Standard, Premium ou Étudiant.</p>

<p><strong>Prêt</strong> : mise à disposition temporaire d'un exemplaire d'un Livre par une Bibliothèque au bénéfice d'un de ses Adhérents.</p>

<p><strong>Réservation</strong> : demande formulée par un Adhérent pour emprunter un Livre dont tous les exemplaires sont actuellement prêtés.</p>

<p><strong>Marché ouvert</strong> : mode de soumission de Manuscrit dans lequel l'Auteur ne cible pas une Maison d'édition particulière. Le Manuscrit est rendu visible à toutes les Maisons d'édition dont les critères éditoriaux correspondent au genre de l'Œuvre.</p>

<p><strong>Soumission ciblée</strong> : mode de soumission de Manuscrit dans lequel l'Auteur adresse son Œuvre à une Maison d'édition spécifique.</p>

<h3>Vie sociale</h3>

<p><strong>Fil d'actualité</strong> : flux de publications des Utilisateurs, Auteurs et Organisations suivis.</p>

<p><strong>Club de lecture</strong> : espace communautaire créé par un Utilisateur, rassemblant des Membres autour d'intérêts littéraires communs, avec messagerie intégrée.</p>

<p><strong>Liste de lecture</strong> : collection de Livres constituée par un Utilisateur, publique ou privée.</p>

<p><strong>Liste de souhaits</strong> (ou <strong>Wishlist</strong>) : liste de Livres qu'un Utilisateur souhaite acquérir ultérieurement.</p>

<p><strong>Abonnement social</strong> (ou <strong>Suivi</strong>) : action de suivre un autre Utilisateur, un Auteur ou une Organisation. L'Abonnement social est gratuit et ne doit pas être confondu avec les abonnements payants Frollot Pro ou Frollot Pro Premium.</p>

<h3>Termes économiques et juridiques</h3>

<p><strong>Commission de plateforme</strong> : pourcentage prélevé par Frollot sur certaines transactions (ventes de Livres, Services professionnels). Les taux sont précisés dans la grille tarifaire accessible depuis la page Tarifs. Aucune Commission n'est prélevée sur les Devis éditoriaux.</p>

<p><strong>Frollot Pro</strong> : formule d'abonnement payant optionnel donnant accès à des fonctionnalités supplémentaires.</p>

<p><strong>Frollot Pro Premium</strong> : formule d'abonnement payant de niveau supérieur offrant notamment une Commission de plateforme réduite.</p>

<p><strong>Données personnelles</strong> : toute information se rapportant à une personne physique identifiée ou identifiable, au sens du Règlement général sur la protection des données (UE) 2016/679 et des législations nationales applicables.</p>

<p><strong>Hébergeur</strong> : au sens de la loi française n° 2004-575 du 21 juin 2004 (LCEN) et des législations équivalentes applicables, personne qui assure le stockage de contenus fournis par des destinataires de services en vue de leur mise à disposition du public.</p>

<p><strong>Contenu illicite</strong> : tout contenu publié sur la Plateforme qui contrevient aux lois et réglementations en vigueur.</p>

<p><strong>Notification de contenu illicite</strong> : signalement formel adressé à Frollot par toute personne estimant qu'un Contenu utilisateur est illicite. La procédure est détaillée à la section 15.</p>
`
  },

  // ═══════════════════════════════════════════
  // SECTION 3 — Objet et champ d'application
  // ═══════════════════════════════════════════
  {
    id: 'section-3',
    number: '3',
    title: 'Objet et champ d\'application',
    content: `
<h3>3.1 Objet des CGU</h3>

<p>Les présentes Conditions Générales d'Utilisation ont pour objet de définir les conditions dans lesquelles tout Utilisateur ou Visiteur peut accéder à la Plateforme Frollot et utiliser ses fonctionnalités : consultation du Catalogue, inscription et gestion d'un Compte, soumission de Manuscrits, émission et réception de Devis éditoriaux, achat et vente de Livres, fourniture et achat de Services professionnels, gestion de Bibliothèques et de Prêts, participation à la vie sociale de la Plateforme.</p>

<p>Les CGU ne régissent pas les relations contractuelles directes conclues entre Utilisateurs. En particulier, lorsqu'un Auteur accepte un Devis éditorial émis par une Maison d'édition, le contrat d'édition qui en résulte est conclu directement entre l'Auteur et la Maison d'édition. Frollot n'est pas partie à ce contrat.</p>

<p>Les présentes CGU sont complétées par :</p>
<ul>
  <li>les <strong>Conditions Générales de Vente</strong>, applicables aux achats de Livres ;</li>
  <li>la <strong>Politique de confidentialité</strong> ;</li>
  <li>la <strong>Politique de cookies</strong> ;</li>
  <li>les <strong>conditions spécifiques Frollot Pro et Frollot Pro Premium</strong> ;</li>
  <li>les <strong>conditions spécifiques aux Prestataires de services professionnels</strong>, le cas échéant.</li>
</ul>

<p>En cas de contradiction entre les présentes CGU et l'un de ces documents, les dispositions du document complémentaire prévalent pour le service qu'il régit.</p>

<h3>3.2 Champ d'application territorial</h3>

<p>La Plateforme est accessible depuis n'importe quel pays disposant d'une connexion internet. Les présentes CGU s'appliquent à tout Utilisateur et à tout Visiteur, quel que soit son pays de résidence.</p>

<p>Certaines fonctionnalités peuvent être restreintes ou indisponibles dans certains pays pour des raisons légales, techniques ou opérationnelles. Ces restrictions ne constituent pas une discrimination et ne donnent droit à aucune indemnisation.</p>

<h3>3.3 Champ d'application personnel</h3>

<p>Les présentes CGU s'appliquent :</p>
<ul>
  <li>aux <strong>Visiteurs</strong>, pour les dispositions relatives à la consultation des contenus publics, à la propriété intellectuelle et à la protection des Données personnelles ;</li>
  <li>aux <strong>Utilisateurs inscrits</strong>, pour l'intégralité des dispositions des CGU ;</li>
  <li>aux <strong>Membres d'Organisation</strong>, à la fois en leur qualité d'Utilisateurs et au titre des obligations applicables à leur Organisation.</li>
</ul>

<h3>3.4 Acceptation des CGU</h3>

<p>L'inscription sur la Plateforme nécessite l'acceptation explicite des présentes CGU par le biais d'une case à cocher lors de la création du Compte. Cette acceptation est horodatée et conservée par Frollot à titre de preuve.</p>

<p>L'utilisation continue de la Plateforme après modification des CGU vaut acceptation des nouvelles conditions, sous réserve du préavis de trente (30) jours prévu à la section 18.</p>

<h3>3.5 Capacité juridique</h3>

<p>Les conditions d'âge applicables sont les suivantes :</p>
<ul>
  <li><strong>16 ans minimum</strong> pour l'inscription générale et l'accès aux fonctionnalités non transactionnelles.</li>
  <li><strong>18 ans minimum</strong> pour toute opération à caractère financier : achat ou vente de Livres, soumission de Manuscrit, émission ou acceptation de Devis éditorial, fourniture ou achat de Service professionnel.</li>
</ul>

<p>Les Utilisateurs âgés de 16 à 17 ans disposent d'un Compte avec un accès limité aux fonctionnalités non transactionnelles. Pour les Utilisateurs résidant dans un pays où la législation locale fixe un âge minimum supérieur, l'âge le plus protecteur s'applique.</p>

<h3>3.6 Force obligatoire et nullité partielle</h3>

<p>Si l'une quelconque des dispositions des présentes CGU venait à être déclarée nulle par une juridiction compétente, cette nullité n'affecterait pas les autres dispositions. Le fait pour Frollot de ne pas exercer un droit prévu par les CGU ne constitue pas une renonciation à ce droit.</p>
`
  },

  // ═══════════════════════════════════════════
  // SECTION 4 — Inscription, comptes et profils
  // ═══════════════════════════════════════════
  {
    id: 'section-4',
    number: '4',
    title: 'Inscription, comptes et profils utilisateurs',
    content: `
<h3>4.1 Création du Compte</h3>

<p>La procédure d'inscription requiert : nom, prénom, adresse email, mot de passe, pays de résidence et numéro de téléphone. Un email de vérification est envoyé et le Compte n'est activé qu'après validation de l'adresse email.</p>

<p>Un seul Compte est autorisé par personne physique. La création de Comptes multiples est interdite et peut entraîner la suppression de l'ensemble des Comptes concernés. La création du Compte implique l'acceptation explicite des CGU et de la Politique de confidentialité.</p>

<h3>4.2 Exactitude et mise à jour des informations</h3>

<p>L'Utilisateur s'engage à fournir des informations exactes, véridiques et complètes, et à les maintenir à jour. Toute fausse déclaration peut entraîner la suspension ou la suppression du Compte.</p>

<h3>4.3 Identifiants et sécurité du Compte</h3>

<p>L'Utilisateur est seul responsable de la confidentialité de ses identifiants. Toute activité réalisée depuis un Compte est présumée effectuée par son titulaire. Frollot propose une authentification à deux facteurs (2FA) et recommande son activation pour les Profils à responsabilité élevée.</p>

<h3>4.4 Profils multiples</h3>

<p>Un Utilisateur peut activer un ou plusieurs Profils depuis son Compte unique (Lecteur, Auteur, Éditeur, Correcteur, Illustrateur, Traducteur, Livreur, entre autres). Le Profil Lecteur est attribué par défaut. L'activation de certains Profils peut nécessiter des informations ou vérifications complémentaires.</p>

<p>Frollot se réserve le droit de désactiver un Profil en cas de manquement, sans que cela n'entraîne nécessairement la suppression du Compte.</p>

<h3>4.5 Connexion sociale</h3>

<p>Frollot peut proposer la connexion via des services tiers (Google, Facebook, GitHub). L'Utilisateur reste soumis aux présentes CGU. Les données transmises sont traitées conformément à la Politique de confidentialité.</p>

<h3>4.6 Usage personnel et non-cession du Compte</h3>

<p>Le Compte est strictement personnel et incessible. Il est interdit de prêter, louer, vendre ou céder son Compte. L'accès aux fonctionnalités d'une Organisation par plusieurs personnes se fait exclusivement par le mécanisme des Membres d'Organisation prévu à la section 5.</p>

<h3>4.7 Usages interdits</h3>

<p>L'Utilisateur s'interdit notamment de :</p>
<ul>
  <li>usurper l'identité d'un tiers ou fournir de fausses informations ;</li>
  <li>créer plusieurs Comptes pour une même personne physique ;</li>
  <li>utiliser des systèmes automatisés (robots, scrapers) sans autorisation ;</li>
  <li>contourner les mesures techniques de sécurité ;</li>
  <li>publier des Contenus illicites ;</li>
  <li>harceler, menacer ou diffamer d'autres Utilisateurs ;</li>
  <li>diffuser du spam ou de la publicité non autorisée ;</li>
  <li>tenter d'accéder sans autorisation aux systèmes de Frollot ;</li>
  <li>utiliser la Plateforme à des fins frauduleuses.</li>
</ul>
<p>Cette liste est indicative et non exhaustive.</p>

<h3>4.8 Suspension, restriction et suppression par Frollot</h3>

<p>Frollot peut suspendre ou supprimer un Compte en cas de manquement aux CGU, de Contenu illicite, de fraude, de comportement abusif ou d'inactivité prolongée (vingt-quatre mois). Sauf urgence, Frollot notifie l'Utilisateur et lui accorde un délai de quinze (15) jours pour présenter ses observations. Voir la section 16 pour le détail de la procédure.</p>

<h3>4.9 Suppression du Compte à l'initiative de l'Utilisateur</h3>

<p>L'Utilisateur peut supprimer son Compte à tout moment, sans frais. La suppression entraîne l'effacement des Données personnelles dans un délai de six (6) mois, l'anonymisation des Contenus utilisateur publics sous la mention « [utilisateur supprimé] », et la désactivation de tous les Profils.</p>

<h3>4.10 Sort des Contenus après suppression</h3>

<p>Les Contenus publiés publiquement sont conservés sous forme anonymisée pour préserver l'intégrité des conversations. Les Manuscrits et fichiers privés sont traités selon la section 6. Les données comptables et fiscales sont conservées conformément aux obligations légales applicables.</p>
`
  },

  // ═══════════════════════════════════════════
  // SECTION 5 — Organisations
  // ═══════════════════════════════════════════
  {
    id: 'section-5',
    number: '5',
    title: 'Organisations',
    content: `
<h3>5.1 Création d'une Organisation</h3>

<p>Tout Utilisateur peut créer une ou plusieurs Organisations de type Maison d'édition, Librairie, Bibliothèque ou Imprimerie. Le créateur en devient le Propriétaire. L'Utilisateur déclare être habilité à représenter l'entité professionnelle correspondante. Frollot ne vérifie pas l'existence juridique des Organisations créées.</p>

<h3>5.2 Types d'Organisations</h3>

<ul>
  <li><strong>Maison d'édition</strong> : réception de Manuscrits, émission de DQE, gestion de Projets éditoriaux, vente de Livres.</li>
  <li><strong>Librairie</strong> : référencement de Livres, gestion des stocks et prix, traitement des Commandes.</li>
  <li><strong>Bibliothèque</strong> : gestion des collections, Adhésions, Prêts et Réservations.</li>
  <li><strong>Imprimerie</strong> : référencement, collaboration avec les Maisons d'édition.</li>
</ul>

<h3>5.3 Membres et Rôles</h3>

<p>Le Propriétaire peut inviter des Utilisateurs à rejoindre l'Organisation avec un Rôle défini (Administrateur, Éditeur, Commercial ou Membre). Chaque Membre agit depuis son propre Compte individuel. Un même Utilisateur peut être Membre de plusieurs Organisations simultanément ; dans ce cas, son espace vendeur agrège les commandes, offres et portefeuilles de toutes ses Organisations.</p>

<h3>5.4 Responsabilités du Propriétaire</h3>

<p>Le Propriétaire est responsable de la véracité des informations publiées, de la conformité de l'activité de l'Organisation avec les lois applicables, de la gestion des Membres, du traitement des Manuscrits reçus dans le respect de la confidentialité (section 6), et de l'exécution des Commandes. Frollot ne saurait être tenu responsable des actes d'une Organisation ou de ses Membres.</p>

<h3>5.5 Page publique de l'Organisation</h3>

<p>Chaque Organisation dispose d'une page publique. Les Utilisateurs peuvent publier des Avis. L'Organisation peut demander un badge de vérification auprès de Frollot, attestant d'une vérification sommaire de son identité sans garantie de qualité, de solvabilité ou de conformité.</p>

<h3>5.6 Transfert de propriété et dissolution</h3>

<p>Le Propriétaire peut transférer la propriété à un Administrateur ou dissoudre l'Organisation. La dissolution ne peut intervenir tant que des opérations sont en cours (Commandes, Services, retraits). Les données de transactions passées sont conservées conformément aux obligations légales.</p>

<h3>5.7 Suspension et suppression par Frollot</h3>

<p>Frollot peut suspendre ou supprimer une Organisation en cas de manquement grave ou répété, d'activité frauduleuse, de non-respect des obligations propres au type d'Organisation, ou de décision judiciaire. Sauf urgence, le Propriétaire est notifié avec un délai de quinze (15) jours pour présenter ses observations. La suspension d'une Organisation n'affecte pas les Comptes individuels de ses Membres.</p>
`
  },

  // ═══════════════════════════════════════════
  // SECTION 6 — Soumission de manuscrits et PI
  // ═══════════════════════════════════════════
  {
    id: 'section-6',
    number: '6',
    title: 'Soumission de manuscrits et propriété intellectuelle',
    content: `
<h3>6.1 Conditions de soumission</h3>

<p>La soumission d'un Manuscrit est réservée aux Utilisateurs disposant d'un Profil Auteur actif et âgés de dix-huit (18) ans minimum. L'Auteur fournit : le fichier (PDF, DOC ou DOCX, 10 Mo max), le titre, le genre, la langue, une description, le nombre de pages et un nom de plume. Les champs d'identité (nom, prénom, email) sont renseignés automatiquement depuis le Compte.</p>

<h3>6.2 Modes de soumission</h3>

<p><strong>Soumission ciblée</strong> : l'Auteur sélectionne une Maison d'édition spécifique. Le Manuscrit est transmis exclusivement à cette Maison d'édition.</p>

<p><strong>Marché ouvert</strong> : le Manuscrit est visible par toutes les Maisons d'édition dont les critères éditoriaux correspondent au genre de l'Œuvre. L'Auteur peut verrouiller son marché pour ouvrir une fenêtre de comparaison de quinze (15) jours, pendant laquelle aucun nouveau Devis ne peut être soumis. L'Auteur peut déverrouiller à tout moment.</p>

<h3>6.3 Propriété intellectuelle des Manuscrits soumis</h3>

<p><strong>L'Auteur conserve l'intégralité de ses droits de propriété intellectuelle sur son Manuscrit.</strong> La soumission n'emporte aucun transfert ni cession de droits au profit de Frollot.</p>

<p>L'Auteur déclare et garantit :</p>
<ul>
  <li>qu'il est le seul titulaire des droits ou qu'il dispose de toutes les autorisations nécessaires ;</li>
  <li>que le Manuscrit est une œuvre originale ne constituant pas une contrefaçon ;</li>
  <li>que le Manuscrit ne contient aucun élément illicite ou diffamatoire ;</li>
  <li>qu'il n'est pas lié par un contrat d'exclusivité lui interdisant cette soumission.</li>
</ul>

<p>En cas de violation de ces garanties, l'Auteur s'engage à indemniser Frollot et les Maisons d'édition concernées de tout préjudice résultant d'une réclamation d'un tiers.</p>

<h3>6.4 Licence limitée accordée à Frollot</h3>

<p>En soumettant un Manuscrit, l'Auteur accorde à Frollot une licence limitée à :</p>
<ul>
  <li><strong>Stockage et transmission technique</strong> : stocker le fichier et le transmettre aux Maisons d'édition concernées.</li>
  <li><strong>Affichage des métadonnées</strong> : afficher titre, genre, langue, description dans les interfaces autorisées.</li>
</ul>

<p>Cette licence est <strong>non exclusive</strong>, <strong>gratuite</strong>, <strong>limitée dans le temps</strong> (fin à la suppression du Manuscrit ou à l'expiration du délai de conservation) et <strong>limitée dans son objet</strong>.</p>

<p><strong>Frollot ne publie jamais d'extrait du contenu textuel d'un Manuscrit soumis sans l'accord écrit et préalable de l'Auteur.</strong> Frollot peut afficher des statistiques anonymisées sur l'activité de soumission.</p>

<h3>6.5 Confidentialité des Manuscrits</h3>

<p>Frollot traite les Manuscrits avec la plus grande confidentialité. Le fichier n'est jamais rendu accessible au public. Frollot n'utilise pas le contenu des Manuscrits à des fins de marketing, de publicité ou d'entraînement de modèles d'intelligence artificielle. Les Maisons d'édition s'engagent à ne pas reproduire, diffuser ou exploiter le Manuscrit en dehors du processus d'évaluation éditoriale.</p>

<p>Frollot met en œuvre les mesures techniques raisonnables pour protéger la confidentialité, mais ne peut garantir le comportement des Maisons d'édition. En cas de divulgation non autorisée, la responsabilité incombe à la Maison d'édition, sauf faute technique de la Plateforme. Frollot peut fournir les éléments techniques (horodatage des accès, historique des consultations) pour identifier l'origine d'une divulgation.</p>

<h3>6.6 Relations entre l'Auteur et la Maison d'édition</h3>

<p>Frollot facilite la mise en relation mais n'est pas partie aux contrats conclus entre Auteurs et Maisons d'édition. En cas de litige, Frollot reste neutre et peut fournir les éléments techniques à sa disposition, sans trancher les litiges de propriété intellectuelle.</p>

<h3>6.7 Conservation et suppression des Manuscrits</h3>

<p>Les fichiers sont conservés pendant deux (2) ans à compter de la dernière action significative. À l'issue de cette période, Frollot notifie l'Auteur trente (30) jours avant la suppression. Exceptions : conservation prolongée si un Projet éditorial est actif ou si un litige est en cours. L'Auteur peut demander la suppression anticipée à tout moment. Les métadonnées peuvent être conservées sous forme anonymisée à des fins statistiques.</p>

<h3>6.8 Propriété intellectuelle de la Plateforme</h3>

<p>Le code source, les interfaces, le design, les marques, les logos et tout autre élément de la Plateforme sont la propriété exclusive de la Société exploitante. L'Utilisateur bénéficie d'un droit d'utilisation strictement personnel, non exclusif et révocable. Toute reproduction non autorisée est interdite.</p>
`
  },

  // ═══════════════════════════════════════════
  // SECTION 7 — Devis éditoriaux et garde-fous
  // ═══════════════════════════════════════════
  {
    id: 'section-7',
    number: '7',
    title: 'Devis éditoriaux et garde-fous contre les pratiques abusives',
    content: `
<h3>7.1 Objet et principes du Devis éditorial</h3>

<p>Le Devis éditorial (DQE) est le document par lequel une Maison d'édition propose à un Auteur les conditions de publication de son Manuscrit. La Plateforme structure le DQE en lots de prestations, postes chiffrés, conditions de paiement, modèle de publication et délais, garantissant transparence et comparabilité.</p>

<p><strong>Frollot ne perçoit aucune Commission de plateforme sur les Devis éditoriaux.</strong> La mise en relation, la transmission des Manuscrits, l'émission et l'acceptation des DQE sont entièrement gratuites pour les deux parties. Cet engagement constitue un principe fondateur de Frollot et ne peut être modifié qu'avec un préavis de six (6) mois.</p>

<h3>7.2 Cycle de vie du Devis éditorial</h3>

<p>Un DQE passe par les étapes suivantes :</p>
<ul>
  <li><strong>Brouillon</strong> : en cours de rédaction, non visible par l'Auteur.</li>
  <li><strong>Envoyé</strong> : transmis à l'Auteur pour décision.</li>
  <li><strong>Accepté</strong> : un Projet éditorial est créé automatiquement.</li>
  <li><strong>Refusé</strong> : l'Auteur décline l'offre.</li>
  <li><strong>Révision demandée</strong> : l'Auteur demande des modifications.</li>
  <li><strong>Expiré</strong> : pas de réponse dans le délai de validité.</li>
  <li><strong>Annulé</strong> : un autre DQE a été accepté en Marché ouvert.</li>
</ul>

<p>L'acceptation d'un DQE constitue un accord de principe. Le contrat d'édition relève de la relation directe entre l'Auteur et la Maison d'édition (section 6.6).</p>

<h3>7.3 Modèles de publication</h3>

<p>La Plateforme affiche clairement le Modèle de publication dans chaque DQE. Frollot ne recommande ni ne privilégie aucun modèle. Le choix appartient exclusivement à l'Auteur et à la Maison d'édition.</p>

<h3>7.4 Garde-fous éthiques contre les pratiques éditoriales abusives</h3>

<p>Frollot intègre des règles éthiques que toute Maison d'édition accepte en utilisant le service de Devis éditoriaux :</p>

<p><strong>a) Interdiction de l'achat obligatoire d'exemplaires par l'Auteur.</strong> Un DQE ne peut pas conditionner la publication à l'achat d'exemplaires par l'Auteur.</p>

<p><strong>b) Droits d'auteur minimaux.</strong> En Compte d'éditeur et en Coédition, le DQE doit prévoir des droits d'auteur dont le taux ne peut être inférieur au seuil publié sur la page Tarifs.</p>

<p><strong>c) Transparence des coûts.</strong> Le DQE doit détailler l'ensemble des coûts poste par poste, sans frais cachés.</p>

<p><strong>d) Tirage minimum et prix de vente public.</strong> Pour les impressions physiques, le DQE doit mentionner le tirage prévu et le prix de vente public.</p>

<p><strong>e) Grille de royalties structurée.</strong> En Compte d'éditeur et en Coédition, la grille doit comporter au minimum deux tranches de droits d'auteur.</p>

<p><strong>f) Date de validité du DQE.</strong> Tout DQE envoyé doit comporter une date de validité.</p>

<p><strong>g) Interdiction des clauses léonines.</strong> Sont interdites les clauses manifestement déséquilibrées : cession globale et irrévocable des droits, interdiction de publier d'autres œuvres, pénalités disproportionnées.</p>

<p><strong>h) Liberté de refus.</strong> L'Auteur est toujours libre de refuser un DQE sans justification et sans pénalité.</p>

<h3>7.5 Contrôle et sanctions</h3>

<p>Frollot met en œuvre des validations automatiques lors de la création des DQE. En cas de signalement, Frollot peut demander la modification du DQE, suspendre la capacité de la Maison d'édition à émettre des DQE, ou suspendre l'Organisation en cas de manquements répétés.</p>

<h3>7.6 Projet éditorial</h3>

<p>L'acceptation d'un DQE crée automatiquement un Projet éditorial sur la Plateforme. Cet espace de suivi ne constitue pas un contrat. Frollot peut proposer des fonctionnalités enrichies dans le cadre des abonnements Frollot Pro.</p>

<h3>7.7 Absence de conseil éditorial</h3>

<p>Frollot n'est ni un agent littéraire, ni un conseiller éditorial, ni un avocat. L'Auteur est encouragé à consulter un professionnel qualifié avant d'accepter un DQE. Frollot ne saurait être tenu responsable des conséquences d'une décision prise sur la base des seules informations de la Plateforme.</p>
`
  },

  // ═══════════════════════════════════════════
  // SECTION 8 — Catalogue, ventes et achats
  // ═══════════════════════════════════════════
  {
    id: 'section-8',
    number: '8',
    title: 'Catalogue de livres, ventes et achats',
    content: `
<h3>8.1 Le Catalogue Frollot</h3>

<p>Le Catalogue regroupe l'ensemble des Livres référencés sur la Plateforme. Il est accessible sans inscription. Frollot ne produit, n'édite et ne vend pas de Livres en son nom propre. Les informations relatives aux Livres sont fournies par les Vendeurs sous leur seule responsabilité.</p>

<h3>8.2 Référencement et annonces</h3>

<p>Les Vendeurs créent des annonces précisant le Livre, le prix, l'état (neuf, occasion), le stock et les éventuelles promotions. Le Vendeur est seul responsable de l'exactitude de ses annonces. Frollot peut retirer une annonce non conforme.</p>

<h3>8.3 Prix et devises</h3>

<p>Les prix sont fixés librement par les Vendeurs, affichés en FCFA ou dans toute autre devise prise en charge. Les frais de livraison sont calculés séparément et affichés avant validation de la Commande. Frollot ne contrôle pas les prix pratiqués.</p>

<h3>8.4 Passation de Commande</h3>

<p>L'acheteur sélectionne des Livres, confirme son adresse de livraison, consulte le récapitulatif (incluant les frais de livraison et les éventuelles réductions), et valide sa Commande. La Commande est créée en statut « en attente de paiement ». L'acheteur peut, lors du processus de commande, choisir un livreur parmi ceux disponibles dans sa zone géographique.</p>

<h3>8.5 Commandes multi-vendeurs</h3>

<p>Lorsqu'une Commande contient des Livres provenant de Vendeurs différents (par exemple un livre d'une librairie et un livre d'une maison d'édition), elle est automatiquement découpée en sous-commandes indépendantes, chacune gérée par le Vendeur concerné. L'acheteur est informé de ce découpage dans le récapitulatif de commande. Chaque sous-commande suit son propre cycle de traitement et peut être livrée séparément.</p>

<h3>8.6 Cycle de vie d'une Commande</h3>

<p>Après paiement, chaque sous-commande suit les étapes suivantes :</p>

<ol>
  <li><strong>Confirmation par le Vendeur.</strong> Le Vendeur confirme la prise en charge de la commande. En l'absence de confirmation dans les quarante-huit (48) heures suivant le paiement, un rappel automatique est envoyé au Vendeur.</li>
  <li><strong>Préparation.</strong> Le Vendeur prépare le colis. L'acheteur est informé par email de l'avancement.</li>
  <li><strong>Prêt pour livraison.</strong> Le colis est emballé et attend la prise en charge par le livreur. Si aucun livreur n'est assigné dans les vingt-quatre (24) heures, une alerte est envoyée au Vendeur et à l'administrateur de la Plateforme.</li>
  <li><strong>Prise en charge et expédition.</strong> Le livreur récupère le colis chez le Vendeur et se met en route vers l'acheteur.</li>
  <li><strong>Remise au client.</strong> Le livreur confirme la remise du colis. L'acheteur et le Vendeur sont notifiés.</li>
</ol>

<p><strong>Tentatives de livraison.</strong> Si le livreur ne parvient pas à remettre le colis (client absent, adresse introuvable, refus de réception), il enregistre une tentative échouée avec le motif. L'acheteur est informé par email à chaque tentative et invité à se rendre disponible. Après trois (3) tentatives échouées, l'administrateur Frollot est alerté pour décider de la suite à donner (nouvelle tentative, retour au Vendeur, annulation avec remboursement).</p>

<p><strong>Annulation automatique.</strong> Toute Commande dont le paiement n'est pas finalisé dans les vingt-quatre (24) heures suivant sa création est automatiquement annulée. Le stock est restauré et l'acheteur en est informé par email. Si un coupon de réduction avait été utilisé, il est restitué.</p>

<h3>8.7 Obligations du Vendeur</h3>

<p>Le Vendeur (maison d'édition ou librairie) s'engage à :</p>

<ul>
  <li>Confirmer ou refuser toute nouvelle commande dans un délai de quarante-huit (48) heures suivant le paiement. Passé ce délai, un rappel automatique lui est envoyé.</li>
  <li>Préparer les Livres avec soin et dans les délais annoncés.</li>
  <li>Fournir des informations exactes sur la disponibilité et l'état des Livres proposés à la vente.</li>
  <li>Informer l'acheteur en cas d'impossibilité de traiter la commande (rupture de stock, erreur de référencement). Dans ce cas, la sous-commande est annulée et l'acheteur est remboursé.</li>
  <li>Respecter les prix affichés au moment de la validation de la Commande.</li>
</ul>

<p>Les montants issus des ventes sont crédités sur le portefeuille électronique du Vendeur au sein de la Plateforme, après déduction de la commission Frollot. Le Vendeur peut demander le retrait de ses fonds vers un compte Mobile Money selon les modalités décrites à la section 13.</p>

<p>La non-exécution répétée des obligations ci-dessus peut entraîner un avertissement, une suspension temporaire ou la fermeture définitive du compte vendeur de l'Organisation concernée.</p>

<h3>8.8 Livres numériques (ebooks)</h3>

<p>L'achat d'un Livre numérique confère un droit d'accès personnel, non exclusif, non cessible et non transférable. Le contenu est accessible immédiatement après paiement, via le lecteur intégré à la Plateforme. L'accès au contenu est conditionné à l'authentification de l'acheteur ; il n'est pas possible de télécharger le fichier en dehors de la Plateforme dans la version actuelle.</p>

<p>Les Commandes composées exclusivement de Livres numériques sont automatiquement marquées comme livrées dès la confirmation du paiement, sans intervention du Vendeur ni du livreur.</p>

<p>L'acheteur s'interdit de reproduire, redistribuer, revendre ou communiquer le contenu numérique à des tiers, par quelque moyen que ce soit.</p>

<h3>8.8 Droit de rétractation et retours</h3>

<p><strong>Livres physiques.</strong> L'acheteur dispose de quatorze (14) jours après réception pour exercer son droit de rétractation. Le Livre doit être retourné en état d'origine. Frais de retour à la charge de l'acheteur sauf erreur du Vendeur. Remboursement sous quatorze (14) jours après réception du retour.</p>

<p><strong>Livres numériques.</strong> Pas de rétractation une fois le téléchargement commencé, avec consentement explicite de l'acheteur à cette renonciation au moment de l'achat.</p>

<h3>8.9 Avis sur les Livres</h3>

<p>Les Avis doivent refléter une opinion sincère et personnelle. Sont interdits : les Avis rémunérés non déclarés, diffamatoires, hors sujet ou visant à nuire. Frollot peut supprimer les Avis non conformes (section 15).</p>

<h3>8.10 Coupons de réduction</h3>

<p>Frollot peut émettre des coupons soumis à des conditions spécifiques. Les coupons ne sont ni échangeables, ni remboursables, ni cumulables sauf mention contraire. En cas d'annulation d'une Commande ayant bénéficié d'un coupon, celui-ci est automatiquement restitué dans la limite de ses conditions de validité initiales.</p>

<h3>8.11 Livraison</h3>

<p><strong>Zones de livraison.</strong> La livraison est assurée par des livreurs indépendants partenaires de la Plateforme. Les zones couvertes dépendent de la disponibilité des livreurs dans la ville de destination. Lors de la commande, l'acheteur peut consulter les livreurs disponibles dans sa ville, leurs tarifs et leurs délais estimés.</p>

<p><strong>Frais de livraison.</strong> Les frais sont calculés au moment de la commande en fonction de la zone de livraison et du livreur sélectionné. Ils sont affichés séparément du prix des Livres et sont à la charge de l'acheteur, sauf promotion contraire. La livraison peut être offerte au-delà d'un certain montant de commande, selon la configuration de la Plateforme.</p>

<p><strong>Délais.</strong> Les délais de livraison sont donnés à titre indicatif et dépendent du temps de préparation par le Vendeur et de la disponibilité du livreur. Frollot ne saurait être tenu responsable des retards imputables aux Vendeurs, aux livreurs ou à des circonstances extérieures (intempéries, restrictions de circulation, jours fériés).</p>

<p><strong>Transfert des risques.</strong> Le transfert de propriété et des risques s'opère au moment de la remise effective du colis à l'acheteur ou à la personne désignée à l'adresse de livraison. En cas de perte ou de dommage du colis entre la prise en charge par le livreur et la remise au destinataire, l'acheteur est invité à contacter le support Frollot.</p>

<h3>8.12 Obligations des livreurs</h3>

<p>Les livreurs partenaires s'engagent à :</p>

<ul>
  <li>Prendre en charge les colis dans un délai raisonnable après que le Vendeur les a marqués comme prêts.</li>
  <li>Effectuer les livraisons avec diligence et soin, en respectant l'intégrité des colis.</li>
  <li>Enregistrer fidèlement le résultat de chaque tentative de livraison, en indiquant le motif en cas d'échec (client absent, adresse introuvable, refus de réception, téléphone injoignable).</li>
  <li>Ne pas conserver un colis plus de soixante-douze (72) heures sans effectuer de tentative de livraison. Passé ce délai, une alerte est envoyée au Vendeur et à l'administrateur Frollot.</li>
  <li>Communiquer de manière professionnelle avec les acheteurs et les Vendeurs.</li>
</ul>

<p>Les frais de livraison sont crédités sur le portefeuille électronique du livreur au sein de la Plateforme lors de la confirmation du paiement de la Commande. Le livreur peut demander le retrait de ses fonds vers un compte Mobile Money selon les modalités en vigueur.</p>

<p>Le non-respect répété des obligations ci-dessus peut entraîner la désactivation du profil livreur et la résiliation de l'accès aux services de livraison de la Plateforme.</p>

<h3>8.13 Suivi de commande et notifications</h3>

<p>L'acheteur est informé par email à chaque étape significative du traitement de sa commande : confirmation du paiement, confirmation par le vendeur, mise en préparation, colis prêt, prise en charge par le livreur, remise effective, ou annulation. Un historique complet des événements de la commande est accessible depuis l'espace « Mes commandes » de l'acheteur.</p>

<p>Le Vendeur est informé par email lors de la création d'une nouvelle commande, de la confirmation du paiement, et de la remise du colis au client. Un rappel automatique lui est adressé si une commande payée n'est pas traitée dans les quarante-huit (48) heures.</p>

<p>Le livreur est informé par email lorsqu'une livraison lui est assignée, avec les coordonnées du Vendeur (lieu de récupération) et de l'acheteur (lieu de livraison).</p>
`
  },

  // ═══════════════════════════════════════════
  // SECTION 9 — Marketplace de services
  // ═══════════════════════════════════════════
  {
    id: 'section-9',
    number: '9',
    title: 'Marketplace de services professionnels',
    content: `
<h3>9.1 Objet de la Marketplace</h3>

<p>Frollot met à disposition une Marketplace de Services professionnels liés au monde du livre : correction, illustration, traduction, conception de couverture, mise en page, relecture. Frollot agit en qualité d'intermédiaire technique et n'est pas partie au contrat de prestation.</p>

<h3>9.2 Inscription des Prestataires</h3>

<p>Le Prestataire (18 ans minimum) crée des fiches de service précisant le type, le tarif, le mode de tarification, les délais et un portfolio. Frollot ne vérifie pas les qualifications déclarées.</p>

<h3>9.3 Demandes de service</h3>

<p>Le client décrit le travail souhaité, le budget indicatif et les délais. La Demande n'engage ni le client ni le Prestataire.</p>

<h3>9.4 Devis de service et acceptation</h3>

<p>Le Prestataire soumet un devis détaillé. L'acceptation par le client crée une obligation contractuelle entre les parties.</p>

<h3>9.5 Exécution et livraison</h3>

<p>Le Prestataire s'engage à réaliser le travail conformément au devis, communiquer sur l'avancement et effectuer les révisions prévues. Le client s'engage à fournir les éléments nécessaires et à examiner le livrable dans un délai raisonnable.</p>

<h3>9.6 Propriété intellectuelle des livrables</h3>

<p>Sauf stipulation contraire, les droits de propriété intellectuelle sont transférés au client à compter du paiement intégral. Le Prestataire conserve le droit de mentionner la prestation dans son portfolio. Le Prestataire garantit l'originalité du livrable.</p>

<h3>9.7 Commission de plateforme</h3>

<p>Frollot perçoit une Commission sur les Services professionnels. Le taux figure dans la grille tarifaire (page Tarifs). La commission est déduite avant versement au Prestataire. Les abonnés Frollot Pro Premium bénéficient d'un taux réduit.</p>

<h3>9.8 Paiement des Prestataires</h3>

<p>Les sommes sont créditées sur le portefeuille du Prestataire après validation du client. Le retrait s'effectue vers un compte Mobile Money ou autre moyen pris en charge, sous réserve du seuil minimum de mille (1 000) FCFA. Frollot ne prélève aucun frais de retrait. Les frais de l'opérateur de paiement sont à la charge du bénéficiaire.</p>

<h3>9.9 Annulation et litiges</h3>

<p>Annulation possible sans frais avant le début du travail. En cours d'exécution, le Prestataire a droit à une rémunération proportionnelle. En cas de litige, les parties sont invitées à résoudre leur différend à l'amiable. Frollot peut formuler une recommandation non contraignante.</p>

<h3>9.10 Obligation de recourir à la Plateforme</h3>

<p>Toute prestation initiée via la Marketplace doit être finalisée et réglée via la Plateforme. Le contournement est interdit et peut entraîner la suspension du Compte et une indemnité compensatoire (montant précisé dans la grille tarifaire). Cette obligation ne s'applique qu'aux mises en relation effectuées via Frollot.</p>
`
  },

  // ═══════════════════════════════════════════
  // SECTION 10 — Bibliothèques
  // ═══════════════════════════════════════════
  {
    id: 'section-10',
    number: '10',
    title: 'Bibliothèques',
    content: `
<h3>10.1 Services proposés</h3>

<p>Frollot fournit aux Organisations de type Bibliothèque des outils de gestion : catalogue, Adhésions, Prêts, Réservations, suivi des retards. Frollot n'intervient pas dans les décisions de gestion de la Bibliothèque.</p>

<h3>10.2 Adhésions</h3>

<p>Les Utilisateurs peuvent souscrire une Adhésion auprès d'une ou plusieurs Bibliothèques. Conditions, tarifs et durée de validité sont fixés par la Bibliothèque. Un numéro d'adhérent unique est attribué automatiquement. Frollot ne perçoit pas de commission sur les Adhésions.</p>

<h3>10.3 Prêts</h3>

<p>Un Adhérent peut demander un Prêt physique ou numérique. Le cycle : Demandé → Approuvé → Actif → Retourné (ou En retard, ou Annulé). La durée par défaut est de vingt et un (21) jours. La Bibliothèque définit sa politique de retards.</p>

<h3>10.4 Extensions de Prêt</h3>

<p>L'Adhérent peut demander une extension, soumise à l'approbation de la Bibliothèque.</p>

<h3>10.5 Réservations</h3>

<p>Lorsqu'un ouvrage est indisponible, l'Adhérent est placé en file d'attente et notifié lorsqu'un exemplaire se libère. Il dispose d'un délai défini par la Bibliothèque pour confirmer.</p>

<h3>10.6 Prêts numériques</h3>

<p>L'accès est temporaire, personnel et non transférable. L'Adhérent s'interdit de copier ou distribuer le fichier. L'accès est automatiquement révoqué à l'expiration.</p>

<h3>10.7 Responsabilités de la Bibliothèque</h3>

<p>La Bibliothèque est seule responsable de son catalogue, de sa politique d'Adhésion et de Prêt, et de la conformité de ses activités avec les lois applicables. Frollot ne contrôle pas ces politiques.</p>

<h3>10.8 Responsabilités de l'Adhérent</h3>

<p>L'Adhérent s'engage à respecter les conditions de la Bibliothèque, restituer les ouvrages dans les délais et en bon état, et signaler toute perte ou détérioration.</p>

<h3>10.9 Rôle de Frollot</h3>

<p>Frollot fournit les outils techniques. Frollot n'est pas une Bibliothèque, ne détient pas de collections et ne prête pas d'ouvrages. En cas de litige, Frollot peut fournir les éléments techniques mais ne tranche pas.</p>
`
  },

  // ═══════════════════════════════════════════
  // SECTION 11 — Vie sociale et communautaire
  // ═══════════════════════════════════════════
  {
    id: 'section-11',
    number: '11',
    title: 'Vie sociale et communautaire',
    content: `
<h3>11.1 Fil d'actualité</h3>

<p>Chaque Utilisateur dispose d'un Fil d'actualité personnalisé, alimenté par les publications de ses Abonnements sociaux. Les publications sont des Contenus utilisateur soumis aux règles de modération (section 15).</p>

<h3>11.2 Clubs de lecture</h3>

<p>Tout Utilisateur peut créer ou rejoindre un Club de lecture. Le créateur en est l'administrateur et définit les paramètres (nom, catégories, règles, caractère public ou privé). Les échanges se font via une messagerie intégrée (texte, vocal, image, fichier).</p>

<p>Les membres s'engagent à respecter les règles du Club, s'exprimer avec courtoisie, ne pas diffuser de Contenu illicite, de spam ni de fichiers protégés par le droit d'auteur. L'administrateur peut exclure un membre. Frollot peut suspendre un Club contrevenant aux CGU.</p>

<h3>11.3 Abonnements sociaux</h3>

<p>L'Abonnement social est gratuit, unilatéral et révocable. Il ne confère aucun droit d'accès aux informations privées. Un Utilisateur peut bloquer un autre Utilisateur de manière immédiate et silencieuse.</p>

<h3>11.4 Listes de lecture et Listes de souhaits</h3>

<p>Les Listes de lecture peuvent être publiques ou privées. La Liste de souhaits est privée par défaut. Seul le créateur peut modifier ses listes.</p>

<h3>11.5 Avis et commentaires</h3>

<p>Tout Avis ou commentaire doit refléter une opinion sincère, s'exprimer dans un langage respectueux, ne contenir aucune attaque personnelle ni coordonnées personnelles d'un tiers. Frollot peut supprimer les contenus non conformes (section 15).</p>

<h3>11.6 Licence sur les Contenus utilisateur</h3>

<p>En publiant un Contenu utilisateur, l'Utilisateur accorde à Frollot une licence non exclusive, gratuite et mondiale, pour la durée de la présence du contenu, incluant les droits strictement nécessaires au fonctionnement technique (affichage, stockage, mise en cache). L'Utilisateur reste titulaire de ses droits.</p>

<h3>11.7 Comportements prohibés</h3>

<p>Sont spécifiquement prohibés dans les espaces sociaux : le harcèlement, les contenus discriminatoires, la divulgation d'informations personnelles d'un tiers (doxxing), les faux Profils visant à manipuler les évaluations, le démarchage commercial non sollicité. Tout Utilisateur peut signaler ces comportements (section 15).</p>
`
  },

  // ═══════════════════════════════════════════
  // SECTION 12 — Modèle économique et tarification
  // ═══════════════════════════════════════════
  {
    id: 'section-12',
    number: '12',
    title: 'Modèle économique et tarification',
    content: `
<h3>12.1 Gratuité de l'inscription et de l'utilisation de base</h3>

<p>L'inscription sur la Plateforme est gratuite. La soumission de Manuscrits, l'ensemble du processus de mise en relation entre Auteurs et Maisons d'édition, et l'émission et l'acceptation de Devis éditoriaux sont entièrement gratuits.</p>

<p><strong>Frollot ne perçoit aucune commission sur les Devis éditoriaux conclus entre Auteurs et Maisons d'édition via la Plateforme.</strong> La mise en relation et la facilitation des contrats d'édition sont gratuites pour les deux parties. Ce principe constitue un engagement fondateur de Frollot.</p>

<h3>12.2 Commissions sur les transactions</h3>

<p>Frollot perçoit une Commission de plateforme sur les ventes de Livres et les Services professionnels. Les taux sont précisés dans la grille tarifaire accessible depuis la page <strong>Tarifs</strong>. Frollot peut modifier ces taux avec un préavis de trente (30) jours. La commission est déduite automatiquement avant versement au Vendeur ou au Prestataire.</p>

<h3>12.3 Abonnements Frollot Pro et Frollot Pro Premium</h3>

<p>Frollot peut proposer des abonnements payants optionnels :</p>
<ul>
  <li><strong>Frollot Pro</strong> : outils de mise en avant, analytics, badge vérifié, support prioritaire.</li>
  <li><strong>Frollot Pro Premium</strong> : fonctionnalités Pro + Commission de plateforme réduite.</li>
</ul>

<p>Les tarifs et conditions sont décrits dans les conditions spécifiques Frollot Pro. L'abonnement est facultatif.</p>

<h3>12.4 Page Tarifs</h3>

<p>La page Tarifs est le document de référence pour tous les éléments tarifaires. En cas de contradiction avec les CGU sur un point tarifaire, la page Tarifs fait foi. Frollot maintient cette page à jour et notifie les Utilisateurs de toute modification.</p>
`
  },

  // ═══════════════════════════════════════════
  // SECTION 13 — Paiements, devises et fiscalité
  // ═══════════════════════════════════════════
  {
    id: 'section-13',
    number: '13',
    title: 'Paiements, devises et fiscalité',
    content: `
<h3>13.1 Moyens de paiement</h3>

<p>La Plateforme prend en charge :</p>
<ul>
  <li><strong>Mobile Money</strong> : Orange Money, MTN Mobile Money, Airtel Money et autres opérateurs intégrés ;</li>
  <li><strong>Carte bancaire</strong> : Visa, Mastercard et autres réseaux intégrés ;</li>
  <li><strong>Espèces à la livraison</strong>, dans les pays et pour les Commandes où cette option est disponible.</li>
</ul>

<p>Frollot ne stocke pas les données bancaires. Les transactions sont traitées par des prestataires de paiement tiers agréés.</p>

<h3>13.2 Devises</h3>

<p>La devise principale est le Franc CFA (FCFA). Les prix peuvent être affichés dans d'autres devises. Les frais de change sont à la charge de l'Utilisateur et ne dépendent pas de Frollot.</p>

<h3>13.3 Portefeuilles et retraits</h3>

<p>Les Vendeurs, Prestataires et Livreurs disposent d'un portefeuille crédité de leurs revenus nets. Le seuil minimum de retrait est de mille (1 000) FCFA. Frollot ne prélève aucun frais de retrait. Les frais de l'opérateur de paiement sont à la charge du bénéficiaire. Frollot peut suspendre un retrait en cas de suspicion de fraude.</p>

<h3>13.4 Factures</h3>

<p>Frollot émet des factures pour ses propres services (commissions, abonnements). Les Vendeurs sont responsables de l'émission de leurs factures aux acheteurs, conformément à leurs obligations fiscales.</p>

<h3>13.5 Obligations fiscales des Utilisateurs</h3>

<p>Chaque Utilisateur est seul responsable du respect de ses obligations fiscales. Frollot peut être tenu de transmettre des informations aux autorités fiscales conformément à la législation applicable.</p>
`
  },

  // ═══════════════════════════════════════════
  // SECTION 14 — Données personnelles
  // ═══════════════════════════════════════════
  {
    id: 'section-14',
    number: '14',
    title: 'Données personnelles',
    content: `
<h3>14.1 Principes généraux</h3>

<p>Frollot protège les Données personnelles conformément à la loi gabonaise n° 001/2011, au RGPD (pour les résidents européens), aux législations nationales des pays cibles et à la Convention de Malabo dans les pays l'ayant ratifiée. Le traitement est décrit dans la <a href="/privacy">Politique de confidentialité</a>.</p>

<h3>14.2 Données collectées</h3>

<p>Données d'identification, de profil professionnel, de navigation, transactionnelles, de contenu et de sécurité.</p>

<h3>14.3 Finalités du traitement</h3>

<p>Gestion des Comptes, fourniture des services, traitement des paiements, communication, personnalisation, sécurité, obligations légales et statistiques anonymisées.</p>

<h3>14.4 Bases légales</h3>

<p>Exécution du contrat, consentement, intérêt légitime et obligation légale, selon la nature du traitement.</p>

<h3>14.5 Droits des Utilisateurs</h3>

<p>Tout Utilisateur dispose des droits suivants sur ses Données personnelles :</p>
<ul>
  <li><strong>Droit d'accès</strong> : obtenir confirmation et copie des données traitées.</li>
  <li><strong>Droit de rectification</strong> : corriger des données inexactes.</li>
  <li><strong>Droit à l'effacement</strong> : demander la suppression, sous réserve des obligations légales.</li>
  <li><strong>Droit à la limitation</strong> : suspendre le traitement dans certaines circonstances.</li>
  <li><strong>Droit d'opposition</strong> : s'opposer au traitement pour des motifs légitimes.</li>
  <li><strong>Droit à la portabilité</strong> : recevoir ses données dans un format structuré et lisible.</li>
</ul>

<p>Ces droits s'exercent auprès du Délégué à la protection des données : <strong>dpo@frollot.com</strong>. Frollot répond dans un délai de trente (30) jours.</p>

<h3>14.6 Transferts internationaux</h3>

<p>Les données peuvent être stockées sur des serveurs situés en dehors du pays de résidence de l'Utilisateur. Pour les résidents européens, Frollot met en place les garanties appropriées (Clauses Contractuelles Types ou autre mécanisme conforme au RGPD).</p>

<h3>14.7 Conservation des données</h3>

<p>Les durées varient selon la catégorie de données. Principes : données du Compte conservées pendant sa durée puis six (6) mois après suppression ; données transactionnelles conservées selon les obligations comptables ; Manuscrits conservés selon la section 6.7.</p>

<h3>14.8 Sécurité</h3>

<p>Frollot met en œuvre des mesures techniques appropriées (chiffrement, 2FA, surveillance des accès). En cas de violation de données, Frollot notifie les autorités et les Utilisateurs concernés dans les délais légaux.</p>

<h3>14.9 Cookies</h3>

<p>La Plateforme utilise des cookies et technologies similaires pour assurer son fonctionnement, mémoriser les préférences des Utilisateurs et produire des statistiques de fréquentation. Pour plus de détails sur les types de cookies utilisés, leur finalité et les moyens de les gérer, l'Utilisateur est invité à consulter la <a href="/cookies">Politique relative aux cookies</a>.</p>
`
  },

  // ═══════════════════════════════════════════
  // SECTION 15 — Modération et signalement
  // ═══════════════════════════════════════════
  {
    id: 'section-15',
    number: '15',
    title: 'Modération, signalement et retrait des contenus illicites',
    content: `
<h3>15.1 Principes de modération</h3>

<p>Frollot applique une modération <strong>a posteriori</strong> : les Contenus sont publiés sans vérification préalable. Par exception, une modération a priori peut être appliquée aux premiers contenus d'un nouveau Compte (mesure anti-spam). Les Manuscrits ne font l'objet d'aucune modération par Frollot.</p>

<h3>15.2 Procédure de signalement</h3>

<p>Tout Utilisateur ou toute personne peut signaler un Contenu via le bouton de signalement, par email à <strong>moderation@frollot.com</strong> ou par courrier postal au siège social.</p>

<h3>15.3 Notification de contenu illicite</h3>

<p>Une Notification formelle doit contenir :</p>
<ul>
  <li>l'identité du notifiant ;</li>
  <li>la description et l'emplacement du contenu litigieux ;</li>
  <li>les motifs pour lesquels le contenu est considéré illicite ;</li>
  <li>la déclaration de bonne foi du notifiant.</li>
</ul>

<p>Les notifications manifestement abusives pourront engager la responsabilité de leur auteur.</p>

<h3>15.4 Traitement des signalements</h3>

<p>Frollot examine chaque signalement dans un délai de quarante-huit (48) heures ouvrées. Frollot peut maintenir le contenu, le masquer temporairement, le supprimer définitivement ou notifier l'auteur de la décision. En cas de contenu manifestement illicite (apologie du terrorisme, pédopornographie, incitation à la haine), le retrait est immédiat.</p>

<h3>15.5 Droit de réponse</h3>

<p>L'Utilisateur dont le contenu a été retiré est informé des motifs et dispose de quinze (15) jours pour contester. Frollot rend sa décision définitive dans un délai de quinze (15) jours supplémentaires.</p>

<h3>15.6 Conservation des données relatives aux signalements</h3>

<p>Les données sont conservées un (1) an à compter de la décision, ou plus longtemps en cas de procédure judiciaire. Elles peuvent être transmises aux autorités sur réquisition.</p>

<h3>15.7 Obligations de Frollot en qualité d'Hébergeur</h3>

<p>Frollot n'est pas soumis à une obligation générale de surveillance. Frollot n'est tenu de retirer un contenu que lorsqu'il en a connaissance effective, notamment par Notification conforme.</p>
`
  },

  // ═══════════════════════════════════════════
  // SECTION 16 — Suspension, résiliation, suppression
  // ═══════════════════════════════════════════
  {
    id: 'section-16',
    number: '16',
    title: 'Suspension, résiliation et suppression de compte',
    content: `
<h3>16.1 Suspension temporaire par Frollot</h3>

<p>Frollot peut suspendre temporairement un Compte, un Profil ou une Organisation en cas de suspicion de manquement, de signalement grave, d'activité inhabituelle ou de nécessité de protéger les Utilisateurs. La suspension prend effet immédiatement. L'Utilisateur est notifié par email. La suspension n'excède pas trente (30) jours sauf enquête en cours.</p>

<h3>16.2 Procédure contradictoire</h3>

<p>Sauf urgence, toute mesure de suspension ou suppression est précédée de :</p>
<ol>
  <li><strong>Notification</strong> détaillant les faits reprochés et la mesure envisagée.</li>
  <li><strong>Délai de réponse</strong> de quinze (15) jours pour présenter ses observations.</li>
  <li><strong>Examen</strong> diligent des observations par Frollot.</li>
  <li><strong>Décision motivée</strong> communiquée par email : levée, maintien, restriction ou suppression.</li>
</ol>

<h3>16.3 Suppression définitive par Frollot</h3>

<p>Motifs : manquement grave ou répété, fraude avérée, condamnation judiciaire, fausses informations d'identité, utilisation contraire à l'objet de la Plateforme. La suppression entraîne la désactivation irréversible du Compte, l'anonymisation des Contenus, la clôture des opérations en cours et la conservation des données légales.</p>

<h3>16.4 Conséquences financières</h3>

<p>En cas de fraude, les fonds peuvent être gelés. Dans les autres cas, Frollot verse les fonds disponibles nets dans un délai de trente (30) jours.</p>

<h3>16.5 Recours</h3>

<p>L'Utilisateur peut contester à <strong>support@frollot.com</strong> dans un délai de trente (30) jours. Frollot répond dans un délai de quinze (15) jours. Cette procédure ne prive pas du droit de saisir les juridictions compétentes (section 19).</p>
`
  },

  // ═══════════════════════════════════════════
  // SECTION 17 — Responsabilité de Frollot
  // ═══════════════════════════════════════════
  {
    id: 'section-17',
    number: '17',
    title: 'Responsabilité de Frollot',
    content: `
<h3>17.1 Qualité d'Hébergeur et d'intermédiaire technique</h3>

<p>Frollot fournit l'infrastructure permettant aux Utilisateurs d'interagir. Frollot ne sélectionne pas, n'approuve pas et ne contrôle pas a priori les Contenus utilisateur. Frollot ne participe pas aux transactions conclues entre Utilisateurs et n'est pas l'employeur des Prestataires, des Livreurs ni des Membres d'Organisation.</p>

<h3>17.2 Fourniture du service « en l'état »</h3>

<p>La Plateforme est fournie « en l'état » et « selon disponibilité ». Frollot ne garantit pas la disponibilité ininterrompue, l'absence de bogues, la compatibilité avec tous les équipements, ni l'exactitude des informations fournies par les Utilisateurs. Frollot s'engage à notifier les interruptions planifiées significatives.</p>

<h3>17.3 Exclusions de responsabilité</h3>

<p><strong>a) Contenus utilisateur.</strong> Frollot n'est pas responsable des Contenus publiés. Sa responsabilité ne peut être engagée qu'à compter du moment où Frollot a connaissance du caractère illicite d'un contenu et n'a pas agi promptement.</p>

<p><strong>b) Transactions entre Utilisateurs.</strong> Frollot n'est pas responsable des contrats d'édition, des ventes de Livres, des Services professionnels ni des Prêts de Bibliothèque.</p>

<p><strong>c) Informations fournies par les Utilisateurs.</strong> Frollot ne vérifie pas l'exactitude des informations des Profils, annonces ou fiches de service.</p>

<p><strong>d) Comportement des Organisations.</strong> Frollot ne contrôle pas les pratiques des Organisations. Le badge de vérification n'est pas une garantie de fiabilité.</p>

<p><strong>e) Prestataires de paiement et opérateurs tiers.</strong> Frollot n'est pas responsable des dysfonctionnements des prestataires de paiement ou opérateurs tiers.</p>

<p><strong>f) Force majeure.</strong> Frollot n'est pas responsable en cas de force majeure : catastrophes naturelles, pandémies, guerres, cyberattaques d'envergure, décisions gouvernementales, coupures de réseau généralisées.</p>

<h3>17.4 Limitation de responsabilité</h3>

<p>Le montant total des dommages et intérêts est limité au plus élevé des deux montants suivants : le total des commissions perçues auprès de l'Utilisateur au cours des douze (12) mois précédents, ou la somme de cinquante mille (50 000) FCFA.</p>

<p>Cette limitation ne s'applique pas en cas de faute intentionnelle ou de négligence grave de Frollot, ni en cas de préjudice corporel.</p>

<h3>17.5 Obligation de moyens</h3>

<p>Frollot est soumis à une obligation de moyens, et non de résultat, dans la fourniture de ses services.</p>

<h3>17.6 Indemnisation par l'Utilisateur</h3>

<p>L'Utilisateur s'engage à indemniser Frollot contre toute réclamation résultant de la violation des CGU, de la publication de Contenu illicite, de l'utilisation de la Plateforme en violation de la loi ou d'une fausse déclaration.</p>
`
  },

  // ═══════════════════════════════════════════
  // SECTION 18 — Modification des CGU
  // ═══════════════════════════════════════════
  {
    id: 'section-18',
    number: '18',
    title: 'Modification des CGU',
    content: `
<h3>18.1 Droit de modification</h3>

<p>Frollot se réserve le droit de modifier les présentes CGU afin de les adapter aux évolutions de la Plateforme, de la législation ou des pratiques du marché.</p>

<h3>18.2 Notification</h3>

<p>Toute modification est notifiée par <strong>email</strong> et par un <strong>bandeau informatif</strong> sur la Plateforme. La notification précise la date d'entrée en vigueur et met en évidence les modifications substantielles.</p>

<h3>18.3 Préavis</h3>

<p>Les modifications prennent effet après un préavis de <strong>trente (30) jours</strong>. Par exception, des modifications peuvent prendre effet immédiatement si imposées par la loi, nécessaires pour corriger une erreur matérielle, ou rendues nécessaires par une faille de sécurité urgente.</p>

<h3>18.4 Acceptation ou refus</h3>

<p>L'utilisation continue de la Plateforme après le préavis vaut acceptation. L'Utilisateur qui refuse peut supprimer son Compte sans pénalité avant l'entrée en vigueur.</p>

<h3>18.5 Archivage des versions</h3>

<p>Frollot conserve un historique des versions successives des CGU. L'Utilisateur peut demander à consulter une version antérieure à <strong>support@frollot.com</strong>.</p>
`
  },

  // ═══════════════════════════════════════════
  // SECTION 19 — Droit applicable et litiges
  // ═══════════════════════════════════════════
  {
    id: 'section-19',
    number: '19',
    title: 'Droit applicable et règlement des litiges',
    content: `
<h3>19.1 Droit applicable</h3>

<p>Les présentes CGU sont régies par le <strong>droit gabonais</strong>. Pour les résidents de l'Union européenne, les dispositions impératives de protection des consommateurs de leur pays de résidence s'appliquent si plus favorables. Pour les résidents de la zone OHADA, les dispositions pertinentes des Actes uniformes OHADA s'appliquent.</p>

<h3>19.2 Médiation préalable obligatoire</h3>

<p>En cas de litige, les parties s'engagent à rechercher une solution amiable. L'Utilisateur adresse une réclamation à <strong>support@frollot.com</strong>. Frollot répond sous quinze (15) jours. Si la réclamation n'aboutit pas, les parties disposent de <strong>trente (30) jours</strong> pour tenter une médiation amiable. La médiation est une condition de recevabilité de toute action judiciaire, sauf mesures d'urgence.</p>

<h3>19.3 Juridictions compétentes</h3>

<p><strong>Entre professionnels</strong> : tribunaux de Libreville, Gabon. <strong>Pour les consommateurs</strong> : tribunaux de Libreville ou tribunaux du lieu de résidence, au choix du consommateur. <strong>Pour les résidents de l'UE</strong> : tribunaux de l'État membre de résidence. Frollot informe les Utilisateurs européens de l'existence de la plateforme européenne de règlement en ligne des litiges (RLL) accessible à <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr</a>.</p>

<h3>19.4 Arbitrage</h3>

<p>Pour les litiges entre professionnels d'un montant supérieur à cinq millions (5 000 000) de FCFA, les parties peuvent recourir à l'arbitrage CCJA-OHADA. Le siège de l'arbitrage est Libreville, la langue est le français. L'arbitrage ne peut être imposé à un consommateur.</p>

<h3>19.5 Prescription</h3>

<p>Toute action judiciaire doit être engagée dans un délai de deux (2) ans à compter du fait générateur, sauf délai plus long imposé par la loi applicable.</p>
`
  },

  // ═══════════════════════════════════════════
  // SECTION 20 — Mentions légales
  // ═══════════════════════════════════════════
  {
    id: 'section-20',
    number: '20',
    title: 'Mentions légales',
    content: `
<h3>20.1 Société exploitante</h3>

<p><strong>Dénomination sociale</strong> : Frollot SARL<br>
<strong>Forme juridique</strong> : Société à Responsabilité Limitée de droit gabonais<br>
<strong>Siège social</strong> : Libreville, Gabon<br>
<strong>RCCM</strong> : [en cours d'immatriculation au Registre du Commerce et du Crédit Mobilier de Libreville]<br>
<strong>Directeur de la publication</strong> : [à compléter]</p>

<h3>20.2 Contact</h3>

<p><strong>Email général</strong> : contact@frollot.com<br>
<strong>Email support</strong> : support@frollot.com<br>
<strong>Email modération</strong> : moderation@frollot.com<br>
<strong>Email protection des données</strong> : dpo@frollot.com<br>
<strong>Téléphone</strong> : +241 65 34 88 87</p>

<h3>20.3 Hébergement</h3>

<p>La Plateforme est hébergée par : [nom de l'hébergeur, adresse, pays — à compléter au déploiement].</p>

<h3>20.4 Propriété intellectuelle</h3>

<p>La marque Frollot, le logo Frollot, les éléments graphiques et le nom de domaine frollot.com sont la propriété de la Société exploitante. Toute utilisation non autorisée constitue une contrefaçon.</p>

<h3>20.5 Date d'entrée en vigueur</h3>

<p>Les présentes Conditions Générales d'Utilisation sont entrées en vigueur le <strong>11 avril 2026</strong> et remplacent toute version antérieure.</p>
`
  },
];
