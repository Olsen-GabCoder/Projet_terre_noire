/**
 * Banque de contenu éditorial pour les sidebars Frollot.
 * Organisée par thème. Chaque thème contient des histoires longues et des citations.
 * La fonction pickContent() sélectionne aléatoirement un mix pour chaque visite.
 */

// ═══════════════════════════════════════════════
// CITATIONS (pool global, 30+)
// ═══════════════════════════════════════════════

export const quotes = [
  { text: "La lecture est une amitié. Mais au moins c'est une amitié qui ne comporte pas de malentendu. On y est sincère, à défaut d'être vrai. Et les livres ne nous trahissent jamais.", author: "Marcel Proust", source: "Sur la lecture, 1906" },
  { text: "Tant que les lions n'auront pas leurs propres historiens, les histoires de chasse glorifieront toujours le chasseur.", author: "Chinua Achebe", source: "Things Fall Apart, 1958" },
  { text: "L'écriture est la peinture de la voix.", author: "Voltaire" },
  { text: "Publier un livre, c'est parler à tous les peuples de tous les temps. C'est un acte d'une ambition folle et d'une humilité absolue.", author: "Victor Hugo" },
  { text: "La perfection est atteinte, non pas lorsqu'il n'y a plus rien à ajouter, mais lorsqu'il n'y a plus rien à retirer.", author: "Antoine de Saint-Exupéry", source: "Terre des hommes, 1939" },
  { text: "J'ai toujours imaginé le Paradis comme une sorte de bibliothèque.", author: "Jorge Luis Borges" },
  { text: "Le plus difficile n'est pas d'écrire, c'est de réécrire. Et le plus difficile de la réécriture, c'est d'accepter que la première version n'était qu'un brouillon.", author: "Ernest Hemingway" },
  { text: "Dis-moi ce que tu lis, je te dirai qui tu es. Et si tu ne lis rien, je ne te dirai rien — car tu n'as rien à dire.", author: "Adaptation d'un proverbe français" },
  { text: "Un livre qu'on n'a pas encore lu est un rendez-vous avec un inconnu qui pourrait changer votre vie.", author: "Anonyme" },
  { text: "Acheter un livre, c'est voter pour un monde où les mots comptent plus que le bruit.", author: "Sagesse de lecteur" },
  { text: "Celui qui pose une question est un sot pendant cinq minutes. Celui qui n'en pose pas le reste toute sa vie.", author: "Proverbe chinois" },
  { text: "Un peuple qui lit est un peuple qui gagne. La lecture est la clé de tout apprentissage, de toute émancipation, de toute liberté.", author: "Léopold Sédar Senghor" },
  { text: "Écrire, c'est une façon de parler sans être interrompu.", author: "Jules Renard" },
  { text: "Il n'y a pas de meilleur frégate qu'un livre pour nous emporter vers des pays lointains.", author: "Emily Dickinson" },
  { text: "La culture ne s'hérite pas, elle se conquiert.", author: "André Malraux" },
  { text: "Lire, c'est boire et manger. L'esprit qui ne lit pas maigrit comme le corps qui ne mange pas.", author: "Victor Hugo" },
  { text: "L'Afrique a besoin de ses propres récits, racontés par ses propres enfants, dans ses propres langues.", author: "Ngugi wa Thiong'o", source: "Décoloniser l'esprit, 1986" },
  { text: "Le vrai tombeau des morts, c'est le cœur des vivants. Écrire, c'est refuser que les morts meurent une seconde fois.", author: "Jean Cocteau" },
  { text: "Quand je pense à tous les livres qu'il me reste à lire, j'ai la certitude d'être encore heureux.", author: "Jules Renard" },
  { text: "Un livre doit être la hache qui brise la mer gelée en nous.", author: "Franz Kafka" },
  { text: "Derrière chaque grand livre, il y a une dizaine de mains invisibles : le correcteur qui traque la virgule errante, l'illustrateur qui donne un visage au rêve, le maquettiste qui transforme un fichier en objet.", author: "Sagesse éditoriale" },
  { text: "L'encre la plus pâle vaut mieux que la meilleure mémoire.", author: "Proverbe chinois" },
  { text: "Ce ne sont pas les livres qui sont dangereux, mais ceux qui ne les lisent pas.", author: "Adaptation de Voltaire" },
  { text: "En Afrique, quand un vieillard meurt, c'est une bibliothèque qui brûle.", author: "Amadou Hampâté Bâ" },
  { text: "La littérature est la preuve que la vie ne suffit pas.", author: "Fernando Pessoa" },
  { text: "Un enfant qui lit sera un adulte qui pense.", author: "Proverbe africain" },
  { text: "Le monde est un livre et ceux qui ne voyagent pas n'en lisent qu'une page.", author: "Saint Augustin" },
  { text: "Je lis pour vivre. Je vis pour lire. Ce n'est pas une métaphore — c'est un programme.", author: "Gustave Flaubert" },
  { text: "L'écrivain est un explorateur. Chaque roman est un continent inconnu dont il dessine la carte au fur et à mesure qu'il avance.", author: "Alain Mabanckou" },
  { text: "La lecture est le voyage de ceux qui ne peuvent pas prendre le train.", author: "Francis de Croisset" },
];

// ═══════════════════════════════════════════════
// HISTOIRES PAR THÈME (8-15 lignes chacune)
// ═══════════════════════════════════════════════

export const stories = {

  // ── CATALOGUE & DÉCOUVERTE ──
  catalog: [
    {
      title: "Quand l'Afrique réinvente l'édition",
      icon: "fas fa-globe-africa",
      text: "Pendant des décennies, publier un livre en Afrique subsaharienne signifiait passer par Paris ou Londres. Les manuscrits traversaient l'océan, les auteurs perdaient le contrôle de leur œuvre, et les droits d'auteur s'évaporaient dans des contrats opaques. Aujourd'hui, une révolution silencieuse est en marche. De Libreville à Dakar, de Douala à Kigali, des maisons d'édition indépendantes naissent chaque année. Elles publient en langues locales, fixent des prix accessibles et distribuent directement sur le continent. Le numérique accélère ce mouvement : en 2024, le marché du livre numérique en Afrique a crû de 35%. Des plateformes comme Frollot suppriment les intermédiaires entre l'auteur et son lecteur. L'enjeu est immense : il ne s'agit pas seulement de vendre des livres, mais de permettre à un continent de 1,4 milliard d'habitants de raconter ses propres histoires, dans ses propres mots, à ses propres conditions.",
    },
    {
      title: "Le roman politique africain : une tradition de résistance",
      icon: "fas fa-fist-raised",
      text: "En 1954, Camara Laye publie « L'Enfant noir », premier grand roman autobiographique d'Afrique de l'Ouest. Mais c'est Mongo Beti qui, la même année, lance le roman politique africain avec « Ville cruelle » — un brûlot contre le colonialisme publié sous pseudonyme par peur des représailles. Cette tradition ne s'est jamais éteinte. Ahmadou Kourouma a dénoncé les dictatures post-coloniales dans « Les Soleils des indépendances » (1968), un texte si subversif qu'aucun éditeur français n'en voulut — il fut d'abord publié au Québec. Sony Labou Tansi, avec « La Vie et demie » (1979), inventa un réalisme magique africain où la politique devient cauchemar. Les années 2000 ont vu émerger une nouvelle génération : Alain Mabanckou déconstruit les clichés dans « Mémoires de porc-épic » (Renaudot 2006), Léonora Miano explore les mémoires de l'esclavage dans « Contours du jour qui vient », et Mohamed Mbougar Sarr remporte le Goncourt 2021 avec « La Plus Secrète Mémoire des hommes » — un hommage bouleversant à la littérature africaine oubliée. Le roman politique africain n'est pas un genre : c'est une nécessité vitale.",
    },
    {
      title: "Les bibliothèques itinérantes du Sahel",
      icon: "fas fa-truck",
      text: "Au Mali, au Burkina Faso et au Niger, là où les routes sont rares et les bibliothèques inexistantes, des passionnés ont inventé les bibliothèques itinérantes. Des ânes chargés de livres parcourent les villages, des pirogues-bibliothèques remontent le fleuve Niger, des motos transformées en librairies mobiles sillonnent la brousse. L'initiative la plus célèbre est celle de la Bibliothèque mobile de Bamako, qui dessert plus de 40 villages sur un rayon de 200 kilomètres. Chaque passage est un événement communautaire : les enfants accourent dès qu'ils aperçoivent le véhicule, les adultes empruntent des manuels d'agriculture et de santé, les anciens viennent feuilleter des ouvrages d'histoire locale. En Éthiopie, le programme « Donkey Mobile Libraries » a touché plus de 100 000 enfants ruraux. Au Kenya, une start-up a lancé des bibliothèques sur chameau dans les zones arides du nord. Ces initiatives prouvent que la soif de lecture ne connaît ni frontière, ni infrastructure, ni condition économique. Elle existe partout où il y a des yeux pour lire et des oreilles pour écouter.",
    },
    {
      title: "La naissance des librairies africaines modernes",
      icon: "fas fa-store",
      text: "La première librairie d'Afrique subsaharienne francophone est née à Dakar en 1943 : la Librairie Clairafrique, fondée par un couple sénégalo-français. Elle existe toujours. À Libreville, la librairie Sogalivre a été pendant des décennies le seul point de vente de livres de toute la capitale gabonaise — un espace minuscule où se croisaient étudiants, diplomates et passionnés. Mais le paysage change. Une nouvelle génération de libraires repense le métier. À Abidjan, « Librairie de France Groupe » a ouvert un espace de 500 m² avec café littéraire et espace enfants. À Douala, « Koh Book Bar » mélange livres, cocktails et concerts. À Kigali, « Ikirezi Bookshop » est devenue un lieu de rencontre incontournable de l'intelligentsia rwandaise. Ces librairies ne vendent pas seulement des livres — elles créent des lieux de vie culturelle. Elles organisent des dédicaces, des ateliers d'écriture, des clubs de lecture. Elles prouvent qu'en Afrique comme ailleurs, une librairie n'est pas un commerce : c'est un projet de société.",
    },
    {
      title: "Le livre numérique en Afrique : révolution ou mirage ?",
      icon: "fas fa-tablet-alt",
      text: "Quand Amazon a lancé le Kindle en 2007, les observateurs prédisaient la mort du livre papier en une décennie. En Occident, le numérique a plafonné à 25% du marché. Mais en Afrique, l'équation est différente. Sur un continent où la distribution physique reste le maillon faible — un livre publié à Libreville peut mettre des mois à atteindre Franceville —, le numérique offre une solution immédiate. Pas besoin de camions, pas besoin d'entrepôts, pas besoin de réseau de librairies. Un smartphone suffit. Et les smartphones, l'Afrique en a : le taux de pénétration mobile dépasse 80% dans la plupart des pays francophones. Des plateformes comme Frollot permettent à un lecteur de Port-Gentil d'acheter un ebook publié à Dakar et de le lire dans la minute. Le prix aussi change tout : un ebook coûte en moyenne 40% de moins que sa version papier. Mais le livre physique ne disparaîtra pas. En Afrique, l'objet-livre a une valeur symbolique forte — c'est un signe de réussite, un cadeau prestigieux, un objet de fierté dans un salon. L'avenir est hybride : du numérique pour l'accès immédiat, du papier pour le plaisir et la permanence.",
    },
    {
      title: "Les prix littéraires qui ont changé l'Afrique",
      icon: "fas fa-trophy",
      text: "En 1986, Wole Soyinka devient le premier Africain à recevoir le prix Nobel de littérature. Le monde découvre que l'Afrique ne produit pas seulement de la musique et de l'art visuel — elle produit aussi une littérature de classe mondiale. Ce Nobel a ouvert une brèche. Naguib Mahfouz (Égypte, 1988), Nadine Gordimer (Afrique du Sud, 1991), J.M. Coetzee (2003) et Abdulrazak Gurnah (Tanzanie, 2021) ont suivi. Mais les prix francophones ont eu un impact plus direct sur l'édition du continent. Le Grand Prix littéraire d'Afrique noire, créé en 1961, a révélé des voix comme Ahmadou Kourouma, Calixthe Beyala et Tierno Monénembo. Le prix des Cinq Continents de la Francophonie récompense des auteurs du monde entier écrivant en français. Et quand Mohamed Mbougar Sarr reçoit le Goncourt 2021, c'est un séisme : pour la première fois, un Africain subsaharien remporte le plus prestigieux prix littéraire français. Les ventes de littérature africaine en France bondissent de 300% dans les semaines suivantes. La preuve que la reconnaissance change tout — elle ouvre les portes des librairies, des bibliothèques et des esprits.",
    },
    {
      title: "Comment naît un best-seller africain",
      icon: "fas fa-chart-line",
      text: "En 2013, Chimamanda Ngozi Adichie donne une conférence TED intitulée « Le danger d'une histoire unique ». La vidéo est vue 30 millions de fois. Son roman « Americanah », publié la même année, se vend à 2 millions d'exemplaires dans le monde. Mais cette success story cache une réalité plus complexe. Le « best-seller africain » suit rarement le même chemin qu'un best-seller occidental. Pas de couverture dans les journaux télévisés, pas de tournée promotionnelle de 30 villes, pas de budget marketing de 500 000 euros. Le best-seller africain naît du bouche-à-oreille — littéralement. Une professeure recommande un livre à ses étudiants. Un club de lecture le choisit pour sa prochaine session. Un blogueur littéraire en parle sur les réseaux sociaux. Les ventes grimpent lentement mais sûrement, mois après mois, année après année. « Les Soleils des indépendances » de Kourouma s'est vendu régulièrement pendant 50 ans. « L'Enfant noir » de Camara Laye est au programme scolaire de 15 pays. Le best-seller africain n'est pas un feu d'artifice — c'est une flamme qui ne s'éteint pas.",
    },
  ],

  // ── AUTEURS & ÉCRITURE ──
  authors: [
    {
      title: "Les griots : premiers auteurs d'Afrique",
      icon: "fas fa-scroll",
      text: "Bien avant l'écriture, l'Afrique avait ses auteurs : les griots. Généalogistes, historiens, musiciens et conteurs, ils portaient dans leur mémoire l'histoire entière de leur peuple. Un griot mandingue pouvait réciter la généalogie de 40 générations sans une seule erreur. L'épopée de Soundjata Keïta — la fondation de l'Empire du Mali au XIIIe siècle — fut transmise oralement pendant 700 ans avant d'être transcrite pour la première fois par Djibril Tamsir Niane en 1960. Les griots n'étaient pas de simples récitants : ils étaient des artistes de la parole vivante. Ils adaptaient leurs récits à l'auditoire, improvisaient des passages, ajoutaient des commentaires sur l'actualité. Chaque performance était unique — comme une édition différente du même texte. Aujourd'hui, les écrivains africains revendiquent cet héritage. Ahmadou Kourouma écrivait en « français malinké », transposant les rythmes de l'oralité dans la prose écrite. Boubacar Boris Diop a publié un roman en wolof après avoir écrit en français pendant 30 ans. La littérature africaine n'est pas née avec l'imprimerie — elle est née avec la voix humaine, et cette voix résonne encore dans chaque livre publié sur ce continent.",
    },
    {
      title: "Femmes de lettres africaines : la révolution silencieuse",
      icon: "fas fa-venus",
      text: "En 1979, Mariama Bâ publie « Une si longue lettre » — un roman épistolaire qui dénonce la polygamie et la condition féminine au Sénégal. Le livre remporte le premier prix Noma d'édition en Afrique. Mariama Bâ meurt en 1981, à 52 ans, avant de voir l'impact mondial de son œuvre : traduite en 17 langues, étudiée dans les universités du monde entier, elle a ouvert la voie à des générations d'écrivaines africaines. Calixthe Beyala (Cameroun) a publié 15 romans explorant la vie des femmes africaines en France — « Les Honneurs perdus » a reçu le Grand Prix du roman de l'Académie française en 1996. Chimamanda Ngozi Adichie (Nigeria) est devenue l'icône mondiale du féminisme littéraire avec « Nous devrions tous être féministes ». Au Gabon, Bessora a dynamité les clichés sur l'immigration dans « 53 cm » (1999). Djailі Amadou Amal (Cameroun) a remporté le Goncourt des lycéens 2020 avec « Les Impatientes », un cri contre les mariages forcés. Scholastique Mukasonga (Rwanda) a transformé le traumatisme du génocide en œuvre littéraire universelle. Ces femmes n'écrivent pas pour témoigner — elles écrivent pour transformer. Chaque livre est un acte politique, une revendication de liberté, une preuve que la littérature peut changer le monde.",
    },
    {
      title: "André Raponda-Walker : le savant gabonais",
      icon: "fas fa-microscope",
      text: "Né en 1871 à Libreville, André Raponda-Walker est considéré comme le père de l'ethnographie gabonaise. Prêtre, linguiste, botaniste et historien, il a consacré sa vie entière à documenter les langues, les plantes médicinales et les traditions du Gabon — un travail titanesque dans un pays qui comptait alors très peu d'archives écrites. Son ouvrage « Plantes utiles du Gabon » (1961) recense plus de 8 000 espèces végétales et leurs usages traditionnels — un savoir millénaire qui risquait de disparaître avec les derniers anciens. Ses dictionnaires des langues mpongwè, fang et nkomi restent des références irremplaçables pour les linguistes du monde entier. Mais Raponda-Walker était aussi un homme de terrain. Il a parcouru le Gabon à pied pendant des décennies, dormant dans les villages, partageant les repas des familles, gagnant la confiance des dépositaires du savoir traditionnel. Il notait tout dans des cahiers qu'il remplissait d'une écriture serrée — des dizaines de milliers de pages qui constituent aujourd'hui le plus important fonds documentaire sur la culture gabonaise pré-coloniale. Raponda-Walker incarne l'idée qu'écrire, c'est sauver : chaque mot couché sur le papier est un fragment de mémoire arraché à l'oubli.",
    },
    {
      title: "L'art de la soumission : ce que les éditeurs cherchent vraiment",
      icon: "fas fa-eye",
      text: "Chaque année, une maison d'édition moyenne reçoit entre 2 000 et 5 000 manuscrits. Elle en publie 10 à 20. Ce ratio effrayant cache une réalité plus nuancée : 80% des manuscrits rejetés le sont dès les premières pages — non pas parce que l'histoire est mauvaise, mais parce que la présentation est bâclée. Un manuscrit sans pagination, sans numérotation des chapitres, avec des fautes dans les premières lignes — l'éditeur ne va pas plus loin. Mais que cherchent-ils vraiment chez les 20% restants ? D'abord, une voix. Pas une intrigue parfaite, pas un style flamboyant, mais une voix authentique — quelque chose qu'ils n'ont jamais lu ailleurs. Ensuite, la maîtrise de l'ouverture : les 3 premières pages sont décisives. Elles doivent poser une promesse narrative — pas tout révéler, mais donner envie de tourner la page. L'éditeur cherche aussi la cohérence : le manuscrit tient-il ses promesses ? Le début correspond-il au genre annoncé ? Enfin, et c'est souvent négligé, l'éditeur évalue le potentiel commercial — pas au sens cynique du terme, mais au sens noble : ce texte trouvera-t-il ses lecteurs ? Un chef-d'œuvre qui ne s'adresse à personne est un échec éditorial.",
    },
    {
      title: "Les refus célèbres : quand le génie est invisible",
      icon: "fas fa-times-circle",
      text: "« Le Petit Prince » de Saint-Exupéry fut refusé par plusieurs éditeurs américains avant de devenir le livre le plus traduit au monde après la Bible — plus de 300 millions d'exemplaires vendus. « Harry Potter à l'école des sorciers » fut rejeté par 12 maisons d'édition britanniques. L'une d'elles conseilla à J.K. Rowling de « prendre un cours d'écriture créative ». La série s'est depuis vendue à 500 millions d'exemplaires. Marcel Proust a dû publier « Du côté de chez Swann » à compte d'auteur en 1913 après le refus cinglant de Gallimard — qui publia ensuite les 6 volumes suivants. En Afrique, Ahmadou Kourouma envoya « Les Soleils des indépendances » à tous les éditeurs parisiens : tous refusèrent. Le livre fut finalement publié au Québec en 1968, puis devint un classique mondial traduit en 20 langues. Mongo Beti dut publier « Ville cruelle » sous pseudonyme pour éviter la censure coloniale. Ces histoires ne sont pas des exceptions — elles sont la norme. La majorité des grands livres de l'histoire ont d'abord été refusés. La leçon est simple mais difficile à accepter : le refus n'est pas un verdict sur votre talent. C'est le verdict d'une personne, à un moment donné, dans un contexte donné. Continuez d'écrire. Continuez de soumettre. L'histoire est de votre côté.",
    },
  ],

  // ── SOCIAL & COMMUNAUTÉ ──
  social: [
    {
      title: "Les salons littéraires : de Paris à Libreville",
      icon: "fas fa-couch",
      text: "Au XVIIe siècle, Madame de Rambouillet ouvre son salon parisien aux écrivains, philosophes et aristocrates. Pendant deux siècles, ces salons seront le cœur battant de la vie intellectuelle française — c'est là que Molière lit ses premières pièces, que Voltaire affûte ses arguments, que les Encyclopédistes conspirent contre l'obscurantisme. Le principe est simple : un lieu, des esprits, une conversation. L'Afrique a inventé son propre équivalent bien avant. Les « palabres » — ces assemblées sous l'arbre à palabres — étaient des espaces de débat, de réconciliation et de transmission du savoir. Elles fonctionnaient sur le même principe que les salons parisiens : la parole circule, chacun écoute, chacun apprend. Aujourd'hui, cette tradition renaît sous des formes modernes. À Libreville, le « Café Littéraire du Boulevard » organise des lectures publiques chaque mois. À Dakar, le festival « Partcours » transforme la ville entière en salon littéraire. À Abidjan, les « Mardis littéraires » du Goethe-Institut attirent des centaines de passionnés. Les clubs de lecture en ligne prolongent cette tradition dans l'espace numérique. Quand vous rejoignez un club de lecture sur Frollot, vous ne faites pas que lire ensemble — vous perpétuez une tradition millénaire de partage du savoir.",
    },
    {
      title: "Quand les dictateurs brûlent les livres",
      icon: "fas fa-fire",
      text: "En 213 avant J.-C., l'empereur chinois Qin Shi Huang ordonne la destruction de tous les livres qui ne traitent pas d'agriculture, de médecine ou de divination. Les lettrés qui résistent sont enterrés vivants. En 1933, les nazis brûlent 25 000 livres à Berlin — des œuvres de Freud, Einstein, Mann, Kafka. Le poète Heinrich Heine avait prophétisé un siècle plus tôt : « Là où l'on brûle des livres, on finit par brûler des hommes. » En Afrique, la censure a pris des formes plus insidieuses. Pendant l'apartheid, 15 000 titres étaient interdits en Afrique du Sud. Au Cameroun, Mongo Beti a été censuré pendant 30 ans. En Guinée équatoriale sous Macías Nguema, la possession de livres était considérée comme suspecte. Mais les livres sont résistants. Ils se cachent sous les matelas, se recopient à la main, se transmettent de bouche à oreille quand l'écrit est interdit. Chaque livre que vous lisez, chaque avis que vous partagez, chaque liste de lecture que vous créez sur Frollot est un acte de résistance contre l'oubli et le silence.",
    },
    {
      title: "Le pouvoir transformateur des clubs de lecture",
      icon: "fas fa-users",
      text: "En 1996, Oprah Winfrey lance son club de lecture à la télévision américaine. Chaque livre sélectionné se vend immédiatement à plus d'un million d'exemplaires. Le phénomène révèle quelque chose de profond : les gens ne veulent pas seulement lire — ils veulent lire ensemble, discuter, débattre, partager. Les clubs de lecture existent pourtant depuis bien plus longtemps. Au XVIIIe siècle, Benjamin Franklin fonde le Junto Club à Philadelphie — 12 hommes qui se réunissent chaque vendredi pour discuter de morale, politique et philosophie à travers les livres. En Afrique, les clubs de lecture ont une histoire particulière. Pendant la colonisation, les « cercles de lecture » étaient des espaces de formation politique déguisés. On y lisait Frantz Fanon, Kwame Nkrumah, Marcus Garvey. Lire ensemble était un acte de résistance. Aujourd'hui, les clubs de lecture africains connaissent un essor sans précédent. Le « Writivism Festival » en Ouganda, le « Book Bunk » au Kenya, le « Lagos Book Club » au Nigeria rassemblent des centaines de lecteurs passionnés. Sur Frollot, chaque club de lecture que vous créez prolonge cette tradition. Vous ne faites pas que partager des opinions sur un livre — vous créez un espace de pensée collective, un lieu où les idées circulent librement.",
    },
  ],

  // ── COMMERCE & ACHAT ──
  shop: [
    {
      title: "Le Mobile Money : révolution financière africaine",
      icon: "fas fa-mobile-alt",
      text: "En 2007, Safaricom lance M-Pesa au Kenya. L'idée est simple : transformer chaque téléphone portable en portefeuille. En cinq ans, M-Pesa traite plus de transactions que Western Union dans le monde entier. Aujourd'hui, l'Afrique subsaharienne compte plus de 600 millions de comptes Mobile Money — plus que le reste du monde combiné. Cette révolution a des conséquences directes sur le marché du livre. Avant le Mobile Money, acheter un livre en ligne en Afrique francophone était presque impossible : les cartes bancaires sont rares, les systèmes de paiement en ligne peu développés. Le Mobile Money a changé la donne. Un étudiant à Franceville peut acheter un ebook avec son téléphone en 30 secondes. Un libraire à Lambaréné peut encaisser un paiement sans terminal carte. Sur Frollot, le Mobile Money est au cœur du système de paiement — parce que l'accès à la culture ne devrait pas dépendre de la possession d'une carte Visa.",
    },
    {
      title: "L'économie du livre en Afrique francophone",
      icon: "fas fa-coins",
      text: "Le prix moyen d'un livre en Afrique francophone est de 5 000 à 15 000 FCFA — soit entre 1 et 3 jours de salaire minimum dans certains pays. Cette réalité économique explique pourquoi le marché du livre reste fragile sur le continent. Un étudiant gabonais qui gagne 100 000 FCFA par mois doit choisir entre un livre et trois repas. Pourtant, la demande est immense : les salons du livre de Conakry, Bamako et Libreville attirent des milliers de visiteurs chaque année. Le problème n'est pas le manque de lecteurs — c'est le prix. Les coûts d'impression sont élevés (la plupart des imprimeries de qualité sont en Europe), la distribution est coûteuse (les routes africaines ne facilitent pas le transport), et les libraires ont des marges minuscules. Le numérique peut briser ce cercle vicieux : un ebook ne coûte rien à distribuer. Frollot permet aux éditeurs de proposer des prix adaptés au pouvoir d'achat local, avec des ebooks dès 1 500 FCFA. Chaque livre que vous achetez ici a un impact direct : 70% du prix revient à l'auteur et à l'éditeur, contre 10 à 15% sur les plateformes internationales.",
    },
    {
      title: "Et maintenant ? L'art de bien commencer un livre",
      icon: "fas fa-book-open",
      text: "Vous venez d'acheter un livre. Félicitations. Mais comment le commencer ? Les grands lecteurs ont leurs rituels. Haruki Murakami lit toujours les 30 premières pages debout, pour « rester alerte ». Umberto Eco commençait toujours par la dernière page — « pour savoir si le voyage en vaut la peine ». Jorge Luis Borges relisait la première phrase dix fois avant de continuer — « la première phrase est le contrat entre l'auteur et le lecteur ». En Afrique, la tradition orale offre un autre enseignement : le conteur ne commence jamais son récit sans s'assurer que l'auditoire est prêt. Il pose une question, fait un silence, attend un signe. Transposé à la lecture, cela donne un conseil précieux : ne commencez pas un livre par obligation ou par hâte. Attendez le bon moment — ce moment où votre esprit est ouvert, disponible, curieux. Et si les premières pages ne vous accrochent pas, ne culpabilisez pas. Donnez-lui 50 pages. Si au bout de 50 pages il ne se passe toujours rien entre vous et le texte, passez au suivant. La vie est trop courte et les livres trop nombreux pour les mauvais rendez-vous.",
    },
  ],

  // ── ÉDITION & PROFESSIONNELS ──
  connect: [
    {
      title: "L'histoire tumultueuse de l'édition en Afrique",
      icon: "fas fa-landmark",
      text: "L'édition en Afrique est née dans la douleur. Pendant la colonisation, les puissances européennes contrôlaient ce qui pouvait être imprimé sur le continent. Les premiers textes publiés en Afrique subsaharienne étaient des catéchismes et des manuels administratifs — pas de la littérature. Il fallut attendre les années 1950 pour que des maisons d'édition africaines voient le jour. Présence Africaine, fondée à Paris en 1947 par Alioune Diop, fut la première à publier massivement des auteurs noirs — Aimé Césaire, Léopold Sédar Senghor, Frantz Fanon. Au Sénégal, les Nouvelles Éditions Africaines (NEA) ont publié les premiers manuels scolaires écrits par des Africains pour des Africains. Au Gabon, les éditions Raponda-Walker ont contribué à préserver le patrimoine culturel du pays. Aujourd'hui, le continent compte plus de 1 500 maisons d'édition actives, mais la bataille n'est pas terminée : la distribution reste le maillon faible, la plupart des livres africains ne franchissent pas les frontières de leur pays de publication, et les droits d'auteur sont souvent mal protégés. C'est précisément ce que Frollot veut changer — en créant un espace où un éditeur gabonais peut vendre au Sénégal, où un auteur camerounais peut trouver un correcteur ivoirien, où les frontières s'effacent devant la littérature.",
    },
    {
      title: "Les métiers invisibles du livre",
      icon: "fas fa-eye-slash",
      text: "Un roman de 300 pages passe en moyenne par 8 à 12 professionnels avant d'arriver en librairie. Le correcteur repère entre 200 et 500 erreurs par manuscrit — fautes d'orthographe, incohérences temporelles, noms de personnages qui changent en cours de route, anachronismes géographiques. Le directeur littéraire dialogue avec l'auteur pendant des mois pour affiner la structure narrative — il pose des questions cruelles mais nécessaires : « Ce chapitre apporte-t-il quelque chose ? », « Ce personnage est-il crédible ? ». L'illustrateur de couverture dispose de 2 à 5 secondes pour convaincre un lecteur de retourner le livre — c'est le temps moyen qu'un client passe devant un étal en librairie. La couverture n'est pas une décoration : c'est le premier acte de communication entre le livre et son futur lecteur. Le maquettiste choisit la typographie, l'interlignage, les marges — des décisions apparemment techniques qui déterminent le confort de lecture et donc le plaisir du lecteur. Un mauvais interlignage peut rendre un chef-d'œuvre illisible. Un bon choix typographique peut sublimer un texte moyen. Tous ces métiers sont représentés sur Frollot. Quand vous engagez un correcteur ici, vous ne payez pas un service — vous investissez dans la qualité de votre œuvre.",
    },
    {
      title: "Pourquoi la correction change tout",
      icon: "fas fa-spell-check",
      text: "En 1992, un roman américain faillit ne jamais paraître. Le manuscrit de « Les Corrections » de Jonathan Franzen était un chaos de 900 pages sans direction claire. Son éditeur, Jonathan Galassi chez Farrar, Straus & Giroux, passa 18 mois à le retravailler avec l'auteur — coupant des chapitres entiers, restructurant la chronologie, rééquilibrant les voix narratives. Le résultat fut un chef-d'œuvre qui lança la carrière internationale de Franzen et se vendit à 3 millions d'exemplaires. Cette histoire se répète à toutes les échelles, dans tous les pays. Un manuscrit « terminé » n'est jamais qu'une matière première. La correction littéraire n'est pas une vérification d'orthographe automatisée — c'est un dialogue entre deux intelligences qui pousse le texte vers sa meilleure version possible. Le correcteur voit ce que l'auteur ne peut plus voir, emporté qu'il est par sa propre création. Il repère les tics de langage, les répétitions inconscientes, les facilités narratives. Les correcteurs sur Frollot connaissent les subtilités du français africain, les tournures locales, les rythmes de la narration orale transposée à l'écrit. Ils ne cherchent pas à « corriger » votre voix — ils cherchent à la rendre plus claire, plus puissante, plus elle-même.",
    },
  ],

  // ── AUTHENTIFICATION & ACCUEIL ──
  auth: [
    {
      title: "Pourquoi une plateforme africaine du livre ?",
      icon: "fas fa-globe-africa",
      text: "98% des plateformes de vente de livres en ligne sont basées en Amérique du Nord ou en Europe. Leurs algorithmes recommandent des best-sellers anglo-saxons, leurs systèmes de paiement requièrent des cartes Visa, leurs frais de livraison vers l'Afrique dépassent souvent le prix du livre lui-même. Résultat : un auteur gabonais qui publie son roman est invisible pour les lecteurs de son propre pays sur ces plateformes. Frollot inverse cette logique. Conçue en Afrique, pour l'Afrique, notre plateforme met en avant les auteurs du continent, accepte le Mobile Money, et propose des prix adaptés au pouvoir d'achat local. Mais Frollot n'est pas une plateforme fermée — elle est ouverte au monde entier. Un lecteur parisien peut y découvrir un auteur camerounais, une éditrice sénégalaise peut y trouver un illustrateur gabonais. Nous ne construisons pas un mur — nous construisons un pont. Un pont entre les lecteurs et les auteurs, entre les talents et les opportunités, entre l'Afrique et le monde.",
    },
    {
      title: "La communauté Frollot en chiffres",
      icon: "fas fa-chart-bar",
      text: "Derrière chaque chiffre, il y a une histoire. Chaque livre publié sur Frollot est le fruit de mois, parfois d'années de travail — un auteur qui s'est levé à 5 heures du matin pour écrire avant d'aller travailler, un éditeur qui a cru en un texte que tout le monde refusait, un correcteur qui a passé des nuits à traquer la moindre incohérence. Chaque lecteur inscrit est quelqu'un qui a décidé que la lecture mérite un espace dédié dans sa vie — pas juste un passe-temps, mais une pratique essentielle. Chaque organisation présente sur la plateforme — maison d'édition, librairie, bibliothèque, imprimerie — est un maillon de la chaîne qui relie l'imagination d'un auteur aux mains d'un lecteur. Quand vous rejoignez Frollot, vous ne créez pas simplement un compte. Vous rejoignez un écosystème vivant où chaque acteur contribue à faire vivre la littérature africaine et internationale.",
    },
  ],

  // ── JURIDIQUE & CULTURE ──
  legal: [
    {
      title: "Port-Gentil : la ville qui lit",
      icon: "fas fa-city",
      text: "Port-Gentil, capitale économique du Gabon, est aussi sa capitale littéraire secrète. Dans cette ville pétrolière de 150 000 habitants, coincée entre l'océan et la forêt équatoriale, la culture du livre est étonnamment vivace. Le « Prix littéraire de Port-Gentil », créé en 2008, récompense chaque année un auteur gabonais. Les clubs de lecture de la ville comptent parmi les plus actifs du pays. Le centre culturel français organise des résidences d'écriture qui attirent des auteurs de toute l'Afrique francophone. Cette tradition n'est pas un hasard. Port-Gentil a été historiquement un carrefour : les travailleurs pétroliers venus du monde entier y ont apporté leurs livres, leurs langues, leurs histoires. Les bibliothèques d'entreprise — Total, Shell, Schlumberger — ont constitué des fonds de milliers d'ouvrages accessibles à tous. La ville est la preuve vivante qu'il suffit d'un accès aux livres pour créer une culture de la lecture. Frollot veut reproduire ce miracle à l'échelle du continent.",
    },
    {
      title: "Le droit d'auteur en Afrique : un combat inachevé",
      icon: "fas fa-gavel",
      text: "En France, le droit d'auteur protège une œuvre pendant 70 ans après la mort de son créateur. Au Gabon, la loi de 1987 accorde la même protection — en théorie. En pratique, la situation est très différente. Les organismes de gestion collective des droits (comme le BUGADA au Gabon) manquent cruellement de moyens. Le piratage — photocopies illégales de manuels scolaires, scans de romans circulant sur WhatsApp — est endémique. Un auteur gabonais qui vend 2 000 exemplaires de son livre est considéré comme un succès ; il en circule probablement 5 000 copies pirates en parallèle. Mais le paysage change. L'Organisation Africaine de la Propriété Intellectuelle (OAPI), basée à Yaoundé, harmonise progressivement les législations. Le numérique offre des outils de traçabilité (DRM, watermarking) qui rendent le piratage plus difficile. Et les plateformes comme Frollot permettent aux auteurs de suivre leurs ventes en temps réel — une transparence impossible avec la distribution physique traditionnelle. Le combat pour le droit d'auteur en Afrique n'est pas seulement juridique — il est culturel. Il s'agit de faire comprendre qu'un auteur qui écrit mérite d'être rémunéré, tout comme un médecin qui soigne ou un ingénieur qui construit.",
    },
    {
      title: "La liberté d'expression et le livre en Afrique",
      icon: "fas fa-bullhorn",
      text: "En 2020, Reporters sans frontières classait 17 pays africains dans la zone « rouge » de la liberté de la presse. Mais la liberté d'écrire des livres n'obéit pas aux mêmes règles que la liberté de la presse. Le roman, par sa nature fictionnelle, offre un espace de liberté unique : on peut tout dire à travers un personnage, tout dénoncer à travers une métaphore. Sony Labou Tansi (Congo) a décrit des régimes totalitaires avec une précision chirurgicale dans ses romans — sans jamais nommer un pays réel. Bessora (Gabon/Suisse) a dénoncé les absurdités de la bureaucratie et du racisme dans « 53 cm » — sous le couvert de l'humour. Alain Mabanckou a fait de Brazzaville un théâtre tragi-comique dans « Verre Cassé » — sans qu'aucun censeur ne puisse dire avec certitude qui était visé. La littérature est peut-être le dernier espace de liberté absolue. Un espace où l'imaginaire est souverain, où les mots échappent aux censeurs parce qu'ils disent la vérité en racontant des mensonges. Publier un livre en Afrique, c'est exercer cette liberté. Le lire, c'est la défendre.",
    },
  ],
};

// ═══════════════════════════════════════════════
// SÉLECTEUR ALÉATOIRE
// ═══════════════════════════════════════════════

/**
 * Sélectionne un mix aléatoire de contenu pour une sidebar.
 * @param {string} theme - Clé du thème (catalog, authors, social, shop, connect, auth, legal)
 * @param {number} storyCount - Nombre d'histoires à sélectionner (défaut 3)
 * @param {number} quoteCount - Nombre de citations à sélectionner (défaut 3)
 * @returns {{ stories: Array, quotes: Array }}
 */
export function pickContent(theme, storyCount = 3, quoteCount = 3) {
  const themeStories = stories[theme] || stories.catalog;

  // Shuffle Fisher-Yates
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  return {
    stories: shuffle(themeStories).slice(0, storyCount),
    quotes: shuffle(quotes).slice(0, quoteCount),
  };
}
