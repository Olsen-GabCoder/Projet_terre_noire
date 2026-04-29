/**
 * DailyQuote — Citation littéraire du jour (auteurs africains & francophones).
 * Change chaque jour. Aucune API externe — collection locale.
 */
import { useMemo } from 'react';

const QUOTES = [
  { text: "Les vrais voyages sont ceux de l'imagination. Quand on lit un livre, on traverse des continents sans jamais quitter sa chaise.", author: "Amadou Hampate Ba", country: "Mali" },
  { text: "L'Afrique est un continent qui a beaucoup de choses a dire. Il suffit juste d'ecouter ses auteurs.", author: "Chimamanda Ngozi Adichie", country: "Nigeria" },
  { text: "Ecrire, c'est aussi ne pas parler. C'est se taire. C'est hurler sans bruit.", author: "Marguerite Duras", country: "France" },
  { text: "Le monde est un livre, et ceux qui ne voyagent pas n'en lisent qu'une page.", author: "Saint Augustin", country: "Algerie" },
  { text: "La lecture est une amitie.", author: "Marcel Proust", country: "France" },
  { text: "Un livre est un jardin que l'on porte dans sa poche.", author: "Proverbe arabe", country: "" },
  { text: "On ne nait pas femme, on le devient. De meme, on ne nait pas lecteur, on le devient par la grace d'un livre qui nous transforme.", author: "Fatou Diome", country: "Senegal" },
  { text: "L'ecrivain est un explorateur. Chaque roman est une expedition en terre inconnue.", author: "Alain Mabanckou", country: "Congo" },
  { text: "Quand on parle d'une seule histoire, on vole la dignite des peuples.", author: "Chimamanda Ngozi Adichie", country: "Nigeria" },
  { text: "Lire, c'est boire et manger. L'esprit qui ne lit pas maigrit comme le corps qui ne mange pas.", author: "Victor Hugo", country: "France" },
  { text: "L'arbre qui tombe fait plus de bruit que la foret qui pousse. Lisons les forets.", author: "Proverbe africain", country: "" },
  { text: "La culture est ce qui reste quand on a tout oublie.", author: "Edouard Herriot", country: "France" },
  { text: "Tant qu'on n'aura pas appris aux gens a lire, on ne pourra pas les empecher de souffrir.", author: "Mongo Beti", country: "Cameroun" },
  { text: "Je lis pour vivre. La lecture est un acte de resistance contre la mediocrite.", author: "Leonora Miano", country: "Cameroun" },
  { text: "Le livre est la nourriture de l'esprit. Celui qui ne lit pas est comme un affame qui refuse de manger.", author: "Cheikh Anta Diop", country: "Senegal" },
  { text: "Chaque langue est un monde. Chaque livre est une porte.", author: "Gaston-Paul Effa", country: "Cameroun" },
  { text: "Un peuple sans culture est un peuple sans ame.", author: "Aime Cesaire", country: "Martinique" },
  { text: "La poesie est le chant de l'ame, le roman est son miroir.", author: "Leopold Sedar Senghor", country: "Senegal" },
  { text: "Les livres sont des miroirs : on n'y voit que ce qu'on a en soi.", author: "Carlos Ruiz Zafon", country: "Espagne" },
  { text: "La litterature africaine est un fleuve immense dont on ne connait encore que quelques affluents.", author: "Yambo Ouologuem", country: "Mali" },
  { text: "Ecrire, c'est tenter de savoir ce qu'on ecrirait si on ecrivait.", author: "Marguerite Duras", country: "France" },
  { text: "Le pouvoir du livre, c'est qu'il nous fait voyager sans passeport.", author: "Mariama Ba", country: "Senegal" },
  { text: "La lecture est a l'esprit ce que l'exercice est au corps.", author: "Joseph Addison", country: "" },
  { text: "Quand tu ne sais pas ou tu vas, regarde d'ou tu viens. Les livres sont la memoire de nos peuples.", author: "Proverbe africain", country: "" },
  { text: "Le vrai tombeau des morts, c'est le coeur des vivants. Les livres gardent vivants ceux qui nous ont precedes.", author: "Jean Cocteau", country: "France" },
  { text: "Celui qui ouvre une porte d'ecole, ferme une prison.", author: "Victor Hugo", country: "France" },
  { text: "L'education est l'arme la plus puissante pour changer le monde. Et le livre est la premiere balle.", author: "Nelson Mandela", country: "Afrique du Sud" },
  { text: "Il n'y a pas de developpement sans culture, et il n'y a pas de culture sans livres.", author: "Joseph Ki-Zerbo", country: "Burkina Faso" },
  { text: "Le plus beau voyage est celui qu'on fait dans un livre, car on en revient transforme.", author: "Calixthe Beyala", country: "Cameroun" },
  { text: "En Afrique, quand un vieillard meurt, c'est une bibliotheque qui brule.", author: "Amadou Hampate Ba", country: "Mali" },
];

const DailyQuote = () => {
  const quote = useMemo(() => {
    // Sélection basée sur le jour de l'année
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    return QUOTES[dayOfYear % QUOTES.length];
  }, []);

  return (
    <section className="home-quote">
      <blockquote className="home-quote__block">
        <p className="home-quote__text">&laquo; {quote.text} &raquo;</p>
        <footer className="home-quote__author">
          — {quote.author}{quote.country ? `, ${quote.country}` : ''}
        </footer>
      </blockquote>
    </section>
  );
};

export default DailyQuote;
