import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/FAQ.css';

const FAQ_CATEGORIES = [
  {
    id: 'commandes', icon: 'fa-bag-shopping', label: 'Commandes & Paiement',
    items: [
      { q: 'Comment passer une commande ?', a: 'Parcourez notre catalogue, ajoutez les livres souhaites a votre panier, puis cliquez sur « Proceder au paiement ». Renseignez vos coordonnees et votre adresse de livraison, choisissez votre moyen de paiement et validez. Vous recevrez une confirmation par email avec le detail de votre commande.' },
      { q: 'Quels moyens de paiement acceptez-vous ?', a: 'Nous acceptons Mobicash (Moov Money), Airtel Money, les cartes Visa et le paiement en especes (uniquement pour les livraisons a Port-Gentil). Toutes les transactions electroniques sont securisees.' },
      { q: 'Comment utiliser un code promo ?', a: 'Dans votre panier, saisissez votre code promo dans le champ prevu et cliquez sur « Appliquer ». La reduction est immediatement calculee et affichee avant validation. Un code promo ne peut etre utilise qu\'une seule fois et ne peut pas etre combine avec un autre code.' },
      { q: 'Comment suivre ma commande ?', a: 'Une fois votre commande expediee, vous recevez un email avec les informations de suivi. Vous pouvez aussi consulter l\'etat de vos commandes dans votre espace client (Mon compte > Mes commandes) apres connexion.' },
      { q: 'Puis-je annuler ma commande ?', a: 'Oui, tant que votre commande est au statut « En attente » (avant paiement confirme). Rendez-vous dans Mes commandes et cliquez sur « Annuler ». Une fois le paiement confirme ou la commande expediee, l\'annulation n\'est plus possible — vous pouvez alors exercer votre droit de retractation.' },
      { q: 'Comment telecharger ma facture ?', a: 'Rendez-vous dans votre espace client > Mes commandes, cliquez sur la commande concernee puis sur « Telecharger la facture ». La facture est au format PDF.' },
    ],
  },
  {
    id: 'livraison', icon: 'fa-truck', label: 'Livraison',
    items: [
      { q: 'Quels sont les delais de livraison ?', a: 'Les commandes sont expediees sous 5 a 10 jours ouvres au Gabon. Pour Port-Gentil et environs : 5 a 7 jours. Pour les autres villes (Libreville, Lambarene, Franceville, Mouila, Oyem) : 7 a 10 jours. Vous recevez un email de suivi des l\'expedition.' },
      { q: 'Quels sont les frais de livraison ?', a: 'Les frais de livraison dependent du montant de votre commande. Un seuil de gratuite peut s\'appliquer. Les frais sont calcules automatiquement lors du passage en caisse et affiches avant validation. Les ebooks ne sont pas soumis a des frais de livraison.' },
      { q: 'Livrez-vous en dehors du Gabon ?', a: 'Pour l\'instant, nos livraisons sont limitees au Gabon. Nous travaillons a etendre notre service a d\'autres pays de la sous-region. Inscrivez-vous a notre newsletter pour etre informe des evolutions.' },
      { q: 'Que faire si mon colis arrive endommage ?', a: 'Emettez des reserves aupres du transporteur a la reception, puis contactez-nous dans un delai de 48 heures par email ou via le formulaire de contact, en joignant des photos du colis et du livre endommage. Nous procederons au remplacement ou au remboursement a nos frais.' },
    ],
  },
  {
    id: 'retours', icon: 'fa-rotate-left', label: 'Retours & Remboursement',
    items: [
      { q: 'Puis-je retourner un livre ?', a: 'Oui. Conformement a la loi gabonaise (Loi n° 025/2021), vous disposez de 14 jours calendaires a compter de la reception pour exercer votre droit de retractation, sans avoir a justifier de motif.' },
      { q: 'Quelles sont les conditions de retour ?', a: 'Le livre doit etre en parfait etat : non lu, non annote, non corne, non tache, avec son emballage d\'origine. Les retours pour defaut d\'impression, livre endommage a la livraison ou erreur de notre part sont a notre charge.' },
      { q: 'Comment effectuer un retour ?', a: 'Contactez-nous par email a terrenoireeditions@gmail.com ou via le formulaire de contact en precisant votre numero de commande et le motif du retour. Nous vous indiquerons la marche a suivre.' },
      { q: 'Quel est le delai de remboursement ?', a: 'Le remboursement est effectue dans un delai maximum de 30 jours suivant la reception et la verification du retour, par le meme moyen de paiement que celui utilise lors de la commande.' },
      { q: 'Puis-je retourner un ebook ?', a: 'Non. Le droit de retractation ne s\'applique pas aux contenus numeriques dont le telechargement a commence. En cas de fichier defectueux ou inaccessible, nous renvoyons un lien fonctionnel dans les meilleurs delais.' },
    ],
  },
  {
    id: 'ebooks', icon: 'fa-tablet-screen-button', label: 'Ebooks',
    items: [
      { q: 'Comment acheter et acceder a un ebook ?', a: 'Achetez l\'ebook comme un livre papier. Apres confirmation du paiement, il est immediatement accessible depuis votre espace client via la liseuse integree au site. Aucun telechargement de logiciel n\'est necessaire.' },
      { q: 'Quel format pour les ebooks ?', a: 'Nos ebooks sont au format PDF, lisible sur tous les appareils (ordinateur, tablette, smartphone, liseuse compatible PDF).' },
      { q: 'Puis-je partager ou revendre un ebook ?', a: 'Non. L\'achat d\'un ebook confere une licence d\'utilisation personnelle, non exclusive et non transferable. Toute copie, redistribution, revente ou mise a disposition publique est strictement interdite.' },
      { q: 'Pendant combien de temps ai-je acces a mon ebook ?', a: 'Votre ebook reste accessible depuis votre espace client tant que votre compte est actif. Il n\'y a pas de limite de temps.' },
    ],
  },
  {
    id: 'compte', icon: 'fa-user', label: 'Compte & Profil',
    items: [
      { q: 'Comment creer un compte ?', a: 'Cliquez sur « S\'inscrire » dans le menu, renseignez votre nom, prenom, adresse email et un mot de passe. Vous recevrez un email de bienvenue. L\'inscription est gratuite.' },
      { q: 'Que faire si j\'oublie mon mot de passe ?', a: 'Cliquez sur « Mot de passe oublie » sur la page de connexion, entrez votre adresse email, et vous recevrez un lien de reinitialisation. Ce lien est valable pour une duree limitee.' },
      { q: 'Comment modifier mon profil ?', a: 'Connectez-vous, puis accedez a « Mon profil ». Vous pouvez modifier votre nom, prenom, adresse, numero de telephone, ville et photo de profil a tout moment.' },
      { q: 'Comment supprimer mon compte ?', a: 'Contactez-nous par email a terrenoireeditions@gmail.com pour demander la suppression de votre compte. La suppression est effective sous 30 jours. Les donnees de facturation sont conservees conformement aux obligations legales.' },
    ],
  },
  {
    id: 'manuscrits', icon: 'fa-feather', label: 'Soumission de manuscrits',
    items: [
      { q: 'Comment soumettre un manuscrit ?', a: 'Rendez-vous sur la page « Soumettre un manuscrit » et remplissez le formulaire en joignant votre fichier (PDF ou DOCX). Aucune inscription n\'est necessaire pour soumettre.' },
      { q: 'Quels genres acceptez-vous ?', a: 'Nous acceptons les manuscrits dans tous les genres : Roman, Nouvelle, Poesie, Essai, Theatre, Litterature jeunesse, Bande dessinee et Autre. Les manuscrits peuvent etre en francais, anglais, arabe, portugais ou espagnol.' },
      { q: 'Quel est le delai de reponse ?', a: 'Notre comite de lecture examine chaque proposition et vous contacte par email sous 2 a 4 semaines (delai indicatif). La decision du comite est souveraine et definitive.' },
      { q: 'Puis-je retirer mon manuscrit ?', a: 'Oui, vous pouvez demander le retrait de votre manuscrit a tout moment par email. Les manuscrits non retenus sont conserves 12 mois puis definitivement supprimes.' },
    ],
  },
  {
    id: 'newsletter', icon: 'fa-envelope', label: 'Newsletter',
    items: [
      { q: 'Comment s\'abonner a la newsletter ?', a: 'Saisissez votre adresse email dans le formulaire en bas de page et cliquez sur « S\'abonner ». Vous recevrez un email de confirmation — cliquez sur le lien pour activer votre abonnement (double opt-in).' },
      { q: 'Comment se desinscrire ?', a: 'Cliquez sur le lien « Se desinscrire » present en bas de chaque email de newsletter. La desinscription est immediate et sans frais. Vous pouvez aussi nous contacter par email.' },
      { q: 'Quelle est la frequence d\'envoi ?', a: 'Nous envoyons une newsletter lors de chaque nouvelle parution ou promotion. Pas de spam — nous respectons votre boite de reception.' },
    ],
  },
  {
    id: 'wishlist', icon: 'fa-heart', label: 'Liste d\'envie',
    items: [
      { q: 'Comment fonctionne la liste d\'envie ?', a: 'Cliquez sur le coeur sur la couverture d\'un livre pour l\'ajouter a votre liste d\'envie. Vous pouvez la consulter a tout moment depuis le menu « Favoris ».' },
      { q: 'Faut-il etre connecte ?', a: 'Non. Votre liste est sauvegardee localement sur votre appareil. Si vous vous connectez, elle est automatiquement synchronisee avec votre compte et accessible depuis tout appareil.' },
      { q: 'L\'ajout en favoris reserve-t-il le livre ?', a: 'Non. L\'ajout a la liste d\'envie ne constitue ni une reservation ni une garantie de disponibilite.' },
    ],
  },
  {
    id: 'avis', icon: 'fa-star', label: 'Avis & Notes',
    items: [
      { q: 'Comment laisser un avis sur un livre ?', a: 'Connectez-vous, allez sur la fiche du livre, puis descendez dans l\'onglet « Avis ». Attribuez une note de 1 a 5 etoiles et redigez votre commentaire. Un seul avis par livre et par utilisateur.' },
      { q: 'Puis-je modifier ou supprimer mon avis ?', a: 'Oui. Depuis la fiche du livre, cliquez sur le menu (trois points) a cote de votre avis pour le modifier ou le supprimer.' },
      { q: 'Puis-je repondre aux avis des autres ?', a: 'Oui. Sous chaque avis, un bouton « Repondre » permet d\'engager la discussion avec les autres lecteurs.' },
    ],
  },
  {
    id: 'collections', icon: 'fa-book-open', label: 'Nos collections',
    items: [
      { q: 'Qu\'est-ce que la collection Moughetou ?', a: 'Mot Bapunu (langue du Gabon). Consacree a l\'emancipation de la femme africaine, a la defense et a la valorisation de ses droits. Genres : Roman, Nouvelles, Essai.' },
      { q: 'Qu\'est-ce que la collection Marabout ?', a: 'Dediee aux luttes africaines, a la protection et a la transmission des valeurs, traditions, coutumes, cultures et civilisations du continent. Genres : Poesie, Recit, Essai culturel.' },
      { q: 'Qu\'est-ce que la collection Une Vie d\'Onction ?', a: 'Un espace de recueillement, de croissance et de transformation interieure, ancre dans la foi chretienne. Genres : Spiritualite, Developpement personnel.' },
      { q: 'Qu\'est-ce que la collection Mwanna ?', a: 'Mot Omyene (langue du Gabon). Destinee aux enfants et adolescents de 3 a 16 ans. Genres : Litterature jeunesse, Aventure, Eveil.' },
    ],
  },
  {
    id: 'contact', icon: 'fa-headset', label: 'Contact & Support',
    items: [
      { q: 'Comment vous contacter ?', a: 'Par email : terrenoireeditions@gmail.com. Par telephone : +241 65 34 88 87 ou +241 07 65 93 535. Via WhatsApp : +241 65 34 88 87. Ou via le formulaire de contact sur notre site.' },
      { q: 'Quel est le delai de reponse ?', a: 'Nous repondons generalement sous 24 heures (jours ouvres).' },
      { q: 'Ou etes-vous situes ?', a: 'A Port-Gentil, Gabon. Nos ouvrages sont egalement disponibles chez nos librairies partenaires : Librairie du Mapane, Livre+ et Librairie Cle d\'Impact.' },
    ],
  },
];

const FAQ = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [openKey, setOpenKey] = useState(null);
  const [search, setSearch] = useState('');

  const filteredCategories = FAQ_CATEGORIES
    .map(cat => ({
      ...cat,
      items: cat.items.filter(item => {
        if (search.trim()) {
          const q = search.toLowerCase();
          return item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
        }
        return true;
      }),
    }))
    .filter(cat => cat.items.length > 0)
    .filter(cat => activeCategory === 'all' || cat.id === activeCategory);

  const totalQuestions = FAQ_CATEGORIES.reduce((s, c) => s + c.items.length, 0);

  return (
    <div className="faq-page">
      <section className="faq-hero">
        <div className="faq-hero__orb faq-hero__orb--1" />
        <div className="faq-hero__orb faq-hero__orb--2" />
        <div className="faq-hero__grid-bg" />
        <div className="faq-hero__inner">
          <span className="faq-hero__pill"><i className="fas fa-circle-question" /> {totalQuestions} questions</span>
          <div className="faq-hero__line" />
          <h1 className="faq-hero__title">Questions <span className="faq-hero__title-accent">frequentes</span></h1>
          <p className="faq-hero__sub">Retrouvez les reponses a toutes vos questions sur nos livres, commandes et services.</p>
          <div className="faq-search">
            <i className="fas fa-search" />
            <input type="text" placeholder="Rechercher une question..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')} aria-label="Effacer"><i className="fas fa-times" /></button>}
          </div>
        </div>
      </section>

      <div className="faq-hero-fade" />

      <div className="faq-content">
        {/* Category pills */}
        <div className="faq-cats">
          <button className={`faq-cat ${activeCategory === 'all' ? 'faq-cat--active' : ''}`} onClick={() => setActiveCategory('all')}>
            <i className="fas fa-grid-2" /> Toutes
          </button>
          {FAQ_CATEGORIES.map(cat => (
            <button key={cat.id} className={`faq-cat ${activeCategory === cat.id ? 'faq-cat--active' : ''}`} onClick={() => setActiveCategory(cat.id)}>
              <i className={`fas ${cat.icon}`} /> {cat.label}
            </button>
          ))}
        </div>

        {/* Questions par categorie */}
        {filteredCategories.length === 0 && (
          <div className="faq-empty">
            <i className="fas fa-search" />
            <h3>Aucun resultat</h3>
            <p>Essayez avec d&apos;autres termes ou <Link to="/contact">contactez-nous</Link>.</p>
          </div>
        )}

        {filteredCategories.map(cat => (
          <div key={cat.id} className="faq-section">
            <div className="faq-section__header">
              <div className="faq-section__icon"><i className={`fas ${cat.icon}`} /></div>
              <h2>{cat.label}</h2>
              <span className="faq-section__count">{cat.items.length}</span>
            </div>
            <div className="faq-section__items">
              {cat.items.map((item, i) => {
                const key = `${cat.id}-${i}`;
                const isOpen = openKey === key;
                return (
                  <div key={key} className={`faq-item ${isOpen ? 'faq-item--open' : ''}`}>
                    <button type="button" className="faq-item__header" aria-expanded={isOpen} aria-controls={`faq-content-${key}`} onClick={() => setOpenKey(isOpen ? null : key)}>
                      <h3 className="faq-item__q">{item.q}</h3>
                      <span className="faq-item__icon"><i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`} /></span>
                    </button>
                    <div id={`faq-content-${key}`} className="faq-item__body" hidden={!isOpen}><p>{item.a}</p></div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="faq-cta-card">
          <div>
            <h2>Vous n&apos;avez pas trouve votre reponse ?</h2>
            <p>Notre equipe est disponible pour vous aider.</p>
          </div>
          <div className="faq-cta-btns">
            <Link to="/contact" className="faq-btn faq-btn--primary"><i className="fas fa-envelope" /> Nous contacter</Link>
            <Link to="/delivery" className="faq-btn faq-btn--outline"><i className="fas fa-truck" /> Livraison & Retours</Link>
          </div>
        </div>
      </div>
      <div className="faq-footer-fade" />
    </div>
  );
};

export default FAQ;
