import { Link } from 'react-router-dom';
import '../styles/About.css';

const About = () => {
  return (
    <div className="about-page">

      {/* ══════════ HERO ══════════ */}
      <section className="about-hero">
        <div className="about-hero__orb about-hero__orb--1" />
        <div className="about-hero__orb about-hero__orb--2" />
        <div className="about-hero__grid-bg" />
        <div className="about-hero__inner">
          <span className="about-hero__pill">Maison d&apos;edition litteraire africaine</span>
          <div className="about-hero__line" />
          <h1 className="about-hero__title">
            Terre Noire <span className="about-hero__title-accent">Editions</span>
          </h1>
          <p className="about-hero__tagline">&laquo; Demain s&apos;ecrit aujourd&apos;hui. &raquo;</p>
          <p className="about-hero__sub">
            Nee en 2025 au coeur de Port-Gentil, capitale economique du Gabon,
            Terre Noire Editions est bien plus qu&apos;une maison d&apos;edition.
            C&apos;est un espace de creation, de transmission et de valorisation
            de la pensee africaine, dans toute sa richesse et sa diversite.
          </p>
        </div>
      </section>

      <div className="about-hero-fade" />

      {/* ══════════ MOT DE BIENVENUE ══════════ */}
      <div className="about-content">

        <div className="abt-card abt-card--welcome">
          <div className="abt-section-header">
            <span className="abt-section-num">01</span>
            <h2>Mot de bienvenue</h2>
          </div>
          <p>
            Nous croyons profondement que les histoires africaines meritent d&apos;etre racontees,
            publiees et lues. C&apos;est pourquoi nous avons bati un ecosysteme complet — de la plume
            a la page, de l&apos;imprimerie a la librairie — pour accompagner chaque auteur dans
            son aventure litteraire, avec rigueur et bienveillance.
          </p>
          <p>
            A travers nos collections, nos collaborations et notre engagement quotidien,
            nous donnons une voix et ouvrons une voie aux primo-auteurs comme aux plumes
            confirmees. Parce que la litterature africaine n&apos;est pas un genre parmi d&apos;autres,
            c&apos;est un continent entier a explorer.
          </p>
          <blockquote className="abt-quote">
            <i className="fas fa-quote-left" />
            L&apos;Afrique a tant a dire. Nous sommes la pour l&apos;ecrire.
          </blockquote>
        </div>

        {/* ══════════ NOS ACTIVITES ══════════ */}
        <div className="abt-card">
          <div className="abt-section-header">
            <span className="abt-section-num">02</span>
            <h2>Nos activites</h2>
          </div>
          <p>
            Terre Noire Editions s&apos;est construite autour d&apos;un modele unique et integre :
            trois poles complementaires qui couvrent l&apos;ensemble du cycle de vie d&apos;un ouvrage,
            du manuscrit jusqu&apos;au lecteur final.
          </p>
          <div className="abt-activities">
            {[
              ['fa-book', 'La Maison d\'edition',
                'Au coeur de notre identite, la maison d\'edition est le lieu ou les manuscrits deviennent des livres. Nous accompagnons nos auteurs tout au long du processus editorial : lecture et selection des textes, travail de correction et d\'amelioration, conception graphique des couvertures, mise en page professionnelle et suivi jusqu\'a la publication finale. Notre catalogue reflete la diversite de la litterature africaine : romans, poesies, nouvelles, essais, ouvrages de spiritualite et livres pour la jeunesse.'],
              ['fa-print', 'L\'Imprimerie',
                'Notre imprimerie interne est un atout strategique qui nous distingue. En maitrisant la production physique de nos ouvrages, nous garantissons des delais reduits, une qualite d\'impression constante et des couts maitrises. Nous ouvrons nos presses aux maisons d\'edition partenaires, aux auteurs autoedites et a toute structure ayant besoin d\'une impression professionnelle de qualite. Chaque livre qui sort de nos ateliers porte notre exigence et notre fierte.'],
              ['fa-store', 'La Librairie',
                'Parce qu\'un livre doit trouver son lecteur, Terre Noire Editions dispose de sa propre librairie a Port-Gentil. Espace de vente, mais aussi lieu de rencontres et d\'echanges, notre librairie est un point d\'ancrage culturel dans la ville. Nos ouvrages sont egalement distribues chez nos partenaires librairies a travers le Gabon.'],
            ].map(([icon, title, desc], i) => (
              <div key={i} className="abt-activity">
                <div className="abt-activity__icon"><i className={`fas ${icon}`} /></div>
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════ NOS COLLECTIONS ══════════ */}
        <div className="abt-card">
          <div className="abt-section-header">
            <span className="abt-section-num">03</span>
            <h2>Nos collections</h2>
          </div>
          <p>
            Chaque collection est un univers a part entiere. Construites autour d&apos;une thematique forte,
            d&apos;une identite visuelle propre et d&apos;une ligne editoriale claire, elles offrent a chaque
            lecteur un espace qui lui ressemble. Nos collections ne sont pas figees — de nouvelles
            pourront etre creees a tout moment.
          </p>
          <div className="abt-collections">
            {[
              ['Moughetou', 'Mot Bapunu — langue du Gabon', 'Roman · Nouvelles · Essai', '#C0392B',
                'Consacree a l\'emancipation de la femme africaine, a la defense et a la valorisation de ses droits. Un espace de parole libre porte par des voix feminines courageuses. Elle interroge les silences imposes, les tabous sociaux et les injustices vecues, tout en celebrant la force, la dignite et la resilience des femmes du continent.'],
              ['Marabout', null, 'Poesie · Recit · Essai culturel', '#C8956C',
                'Dediee aux luttes africaines, a la protection et a la transmission des valeurs, traditions, coutumes, cultures et civilisations du continent. Veritable acte de memoire et de resistance culturelle, cette collection puise dans les racines profondes de l\'Afrique pour en celebrer la beaute, la complexite et la richesse.'],
              ['Une Vie d\'Onction', null, 'Foi chretienne · Spiritualite · Dev. personnel', '#D4A017',
                'Un espace de recueillement, de croissance et de transformation interieure. Ancree dans la foi chretienne, cette collection rassemble des ouvrages qui guident, elevent et fortifient le lecteur dans sa vie spirituelle et dans sa relation a Dieu.'],
              ['Mwanna', 'Mot Omyene — langue du Gabon', 'Litterature jeunesse · Aventure · Eveil', '#27AE60',
                'Destinee aux enfants et adolescents de 3 a 16 ans, cette collection enchante et eveille les jeunes lecteurs africains a travers des recits adaptes a leur monde. Elle nourrit l\'imaginaire, developpe le gout de la lecture des le plus jeune age et transmet des valeurs essentielles.'],
            ].map(([name, origin, genres, color, desc], i) => (
              <div key={i} className="abt-collection" style={{ borderLeftColor: color }}>
                <div className="abt-collection__header">
                  <h3 style={{ color }}>{name}</h3>
                  {origin && <span className="abt-collection__origin">{origin}</span>}
                  <span className="abt-collection__genres">{genres}</span>
                </div>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════ MISSION & VISION ══════════ */}
        <div className="abt-card">
          <div className="abt-section-header">
            <span className="abt-section-num">04</span>
            <h2>Mission &amp; Vision</h2>
          </div>
          <div className="abt-two-cols">
            <div>
              <h3><i className="fas fa-compass" /> Notre mission</h3>
              <p>
                Promouvoir la litterature africaine dans toute sa diversite, sa profondeur et sa vitalite.
                Nous croyons que les mots ont le pouvoir de changer les regards, de transformer les esprits
                et de tisser des ponts entre les generations, les cultures et les peuples.
              </p>
              <p>
                Notre engagement premier est de donner une voix et d&apos;ouvrir une voie aux primo-auteurs,
                ces ecrivains en devenir qui portent des histoires puissantes mais n&apos;ont pas encore eu
                acces aux circuits traditionnels de l&apos;edition.
              </p>
            </div>
            <div>
              <h3><i className="fas fa-eye" /> Notre vision</h3>
              <p>
                Etre reconnue, a l&apos;horizon de la prochaine decennie, comme l&apos;une des plus grandes et
                des plus influentes maisons d&apos;edition litteraires du continent africain. Non pas par la
                taille seule, mais par la qualite, l&apos;impact et la singularite de notre catalogue.
              </p>
              <p>
                Nous imaginons une Terre Noire Editions dont les livres se lisent a Libreville comme
                a Dakar, a Abidjan comme a Nairobi, a Paris comme a Montreal. Une maison dont le nom
                evoque l&apos;excellence editoriale africaine.
              </p>
            </div>
          </div>
        </div>

        {/* ══════════ NOS VALEURS ══════════ */}
        <div className="abt-card">
          <div className="abt-section-header">
            <span className="abt-section-num">05</span>
            <h2>Nos valeurs</h2>
          </div>
          <p>
            Trois valeurs fondamentales guident chacune de nos decisions, de nos publications
            et de nos relations.
          </p>
          <div className="abt-values">
            {[
              ['fa-fingerprint', 'Authenticite', '#E8601C',
                'Nous valorisons les recits sinceres, les identites assumees et les experiences vecues. Chaque manuscrit que nous selectionnons doit avoir cette qualite rare : la verite. La verite d\'un auteur qui a quelque chose a dire, qui le dit avec ses propres mots. C\'est ce qui fait qu\'un livre africain ne ressemble qu\'a lui-meme.'],
              ['fa-gem', 'Rigueur', '#C8956C',
                'De la premiere lecture d\'un manuscrit a la livraison du livre imprime, nous appliquons des standards eleves et non negociables. Un travail de correction attentif, une mise en page soignee, une impression de qualite. Nous croyons qu\'un livre bien fait est un acte de respect envers celui qui l\'ecrit et celui qui le lit.'],
              ['fa-globe-africa', 'Africanite', '#27AE60',
                'Les cultures, les langues, les traditions et les civilisations africaines ont une valeur intrinseque qui merite d\'etre preservee, celebree et transmise. L\'Afrique est notre source, notre territoire et notre ambition. Tout ce que nous publions porte cette empreinte.'],
            ].map(([icon, title, color, desc], i) => (
              <div key={i} className="abt-value">
                <div className="abt-value__icon" style={{ background: `${color}12`, color }}><i className={`fas ${icon}`} /></div>
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════ NOS PARTENAIRES ══════════ */}
        <div className="abt-card">
          <div className="abt-section-header">
            <span className="abt-section-num">06</span>
            <h2>Nos partenaires</h2>
          </div>
          <p>
            Nous cultivons des partenariats fondes sur la confiance, le respect mutuel et un objectif
            commun : developper et democratiser l&apos;acces a la litterature africaine.
          </p>
          <div className="abt-partners">
            <div className="abt-partners__col">
              <h3><i className="fas fa-building" /> Maisons d&apos;edition</h3>
              <ul>
                <li>Origin Edition</li>
                <li>AfroBook Romance</li>
                <li>ArgentLivre</li>
              </ul>
            </div>
            <div className="abt-partners__col">
              <h3><i className="fas fa-store" /> Librairies</h3>
              <ul>
                <li>Librairie du Mapane</li>
                <li>Livre+</li>
                <li>Librairie Cle d&apos;Impact</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ══════════ CTA ══════════ */}
        <div className="abt-card abt-card--cta">
          <div className="abt-cta-content">
            <h2>Passez a l&apos;action</h2>
            <p className="abt-cta-sub">Votre histoire merite d&apos;etre publiee.</p>
            <p>
              Que vous soyez un auteur avec un manuscrit pret, un projet en cours, ou simplement
              une idee qui cherche sa forme, contactez-nous. Et si vous etes lecteur, decouvrez
              notre catalogue et commandez des aujourd&apos;hui.
            </p>
            <div className="abt-cta-btns">
              <Link to="/submit-manuscript" className="abt-btn abt-btn--primary">
                <i className="fas fa-feather" /> Soumettre un manuscrit
              </Link>
              <Link to="/catalog" className="abt-btn abt-btn--outline">
                <i className="fas fa-book-open" /> Explorer le catalogue
              </Link>
              <Link to="/contact" className="abt-btn abt-btn--outline">
                <i className="fas fa-envelope" /> Nous contacter
              </Link>
            </div>
          </div>
        </div>

      </div>
      <div className="about-footer-fade" />
    </div>
  );
};

export default About;
