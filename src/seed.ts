/**
 * Seed: creates authors, categories and 100 sample books with cover images.
 *
 * Usage (from the project root):
 *   npx ts-node src/seed.ts               -> books + categories + covers (Open Library)
 *   npx ts-node src/seed.ts --no-covers   -> skip the cover download
 *
 * Safe to re-run: existing books are never duplicated. Their category and cover are
 * filled in only when empty, and the old French sample descriptions / category names
 * are converted to English.
 */
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { Author } from './author/author.entity';
import { Book } from './book/book.entity';
import { Category } from './category/category.entity';
import { User } from './user/user.entity';
import { UserRole } from './user/user-role.enum';

type Row = [titre: string, prenom: string, nom: string, annee: number, editeur: string, genre: string];

const BOOKS: Row[] = [
  ['Le Petit Prince', 'Antoine', 'de Saint-Exupéry', 1943, 'Gallimard', 'conte'],
  ["L'Étranger", 'Albert', 'Camus', 1942, 'Gallimard', 'roman'],
  ['La Peste', 'Albert', 'Camus', 1947, 'Gallimard', 'roman'],
  ['La Chute', 'Albert', 'Camus', 1956, 'Gallimard', 'roman'],
  ['Les Misérables', 'Victor', 'Hugo', 1862, 'Hetzel', 'roman'],
  ['Notre-Dame de Paris', 'Victor', 'Hugo', 1831, 'Gosselin', 'roman'],
  ['Le Rouge et le Noir', 'Henri', 'Stendhal', 1830, 'Levavasseur', 'roman'],
  ['La Chartreuse de Parme', 'Henri', 'Stendhal', 1839, 'Ambroise Dupont', 'roman'],
  ['Madame Bovary', 'Gustave', 'Flaubert', 1857, 'Michel Lévy', 'roman'],
  ["L'Éducation sentimentale", 'Gustave', 'Flaubert', 1869, 'Michel Lévy', 'roman'],
  ['Germinal', 'Émile', 'Zola', 1885, 'Charpentier', 'roman'],
  ["L'Assommoir", 'Émile', 'Zola', 1877, 'Charpentier', 'roman'],
  ['Nana', 'Émile', 'Zola', 1880, 'Charpentier', 'roman'],
  ['Thérèse Raquin', 'Émile', 'Zola', 1867, 'Lacroix', 'roman'],
  ['La Bête humaine', 'Émile', 'Zola', 1890, 'Charpentier', 'roman'],
  ['Le Père Goriot', 'Honoré', 'de Balzac', 1835, 'Werdet', 'roman'],
  ['Eugénie Grandet', 'Honoré', 'de Balzac', 1833, 'Charpentier', 'roman'],
  ['Illusions perdues', 'Honoré', 'de Balzac', 1843, 'Furne', 'roman'],
  ['Les Fleurs du mal', 'Charles', 'Baudelaire', 1857, 'Poulet-Malassis', 'recueil de poèmes'],
  ['Candide', 'François-Marie', 'Voltaire', 1759, 'Cramer', 'conte philosophique'],
  ['Le Comte de Monte-Cristo', 'Alexandre', 'Dumas', 1844, 'Pétion', 'roman'],
  ['Les Trois Mousquetaires', 'Alexandre', 'Dumas', 1844, 'Baudry', 'roman'],
  ['20 000 lieues sous les mers', 'Jules', 'Verne', 1870, 'Hetzel', 'roman'],
  ['Le Tour du monde en 80 jours', 'Jules', 'Verne', 1872, 'Hetzel', 'roman'],
  ['Voyage au centre de la Terre', 'Jules', 'Verne', 1864, 'Hetzel', 'roman'],
  ['Cyrano de Bergerac', 'Edmond', 'Rostand', 1897, 'Fasquelle', 'pièce de théâtre'],
  ['Le Malade imaginaire', 'Jean-Baptiste', 'Molière', 1673, 'Thierry', 'pièce de théâtre'],
  ['Tartuffe', 'Jean-Baptiste', 'Molière', 1669, 'Jean Ribou', 'pièce de théâtre'],
  ['Du côté de chez Swann', 'Marcel', 'Proust', 1913, 'Grasset', 'roman'],
  ['Voyage au bout de la nuit', 'Louis-Ferdinand', 'Céline', 1932, 'Denoël', 'roman'],
  ['La Nausée', 'Jean-Paul', 'Sartre', 1938, 'Gallimard', 'roman'],
  ['Huis clos', 'Jean-Paul', 'Sartre', 1944, 'Gallimard', 'pièce de théâtre'],
  ['Le Deuxième Sexe', 'Simone', 'de Beauvoir', 1949, 'Gallimard', 'essai'],
  ['Bonjour tristesse', 'Françoise', 'Sagan', 1954, 'Julliard', 'roman'],
  ["L'Écume des jours", 'Boris', 'Vian', 1947, 'Gallimard', 'roman'],
  ['Le Grand Meaulnes', 'Henri', 'Alain-Fournier', 1913, 'Émile-Paul', 'roman'],
  ['Les Liaisons dangereuses', 'Pierre', 'Choderlos de Laclos', 1782, 'Durand', 'roman épistolaire'],
  ['La Princesse de Clèves', 'Madame', 'de La Fayette', 1678, 'Barbin', 'roman'],
  ['Les Essais', 'Michel', 'de Montaigne', 1580, "Simon Millanges", 'essai'],
  ['Pensées', 'Blaise', 'Pascal', 1670, 'Desprez', 'essai'],
  ['Gargantua', 'François', 'Rabelais', 1534, 'François Juste', 'roman'],
  ['Fables', 'Jean', 'de La Fontaine', 1668, 'Barbin', 'recueil de fables'],
  ['Contes', 'Charles', 'Perrault', 1697, 'Barbin', 'recueil de contes'],
  ['Le Horla', 'Guy', 'de Maupassant', 1887, 'Ollendorff', 'nouvelle'],
  ['Bel-Ami', 'Guy', 'de Maupassant', 1885, 'Havard', 'roman'],
  ['Une vie', 'Guy', 'de Maupassant', 1883, 'Havard', 'roman'],
  ['1984', 'George', 'Orwell', 1949, 'Secker & Warburg', 'roman dystopique'],
  ['La Ferme des animaux', 'George', 'Orwell', 1945, 'Secker & Warburg', 'fable politique'],
  ['Le Meilleur des mondes', 'Aldous', 'Huxley', 1932, 'Chatto & Windus', 'roman dystopique'],
  ['Orgueil et Préjugés', 'Jane', 'Austen', 1813, 'Thomas Egerton', 'roman'],
  ['Les Hauts de Hurlevent', 'Emily', 'Brontë', 1847, 'Thomas Newby', 'roman'],
  ['Jane Eyre', 'Charlotte', 'Brontë', 1847, 'Smith, Elder & Co.', 'roman'],
  ['De grandes espérances', 'Charles', 'Dickens', 1861, 'Chapman & Hall', 'roman'],
  ['Oliver Twist', 'Charles', 'Dickens', 1838, 'Richard Bentley', 'roman'],
  ['Frankenstein', 'Mary', 'Shelley', 1818, 'Lackington', 'roman gothique'],
  ['Dracula', 'Bram', 'Stoker', 1897, 'Archibald Constable', 'roman gothique'],
  ['Le Portrait de Dorian Gray', 'Oscar', 'Wilde', 1890, "Lippincott's", 'roman'],
  ["L'Île au trésor", 'Robert Louis', 'Stevenson', 1883, 'Cassell', "roman d'aventures"],
  ['Dr Jekyll et Mr Hyde', 'Robert Louis', 'Stevenson', 1886, 'Longmans', 'nouvelle'],
  ['Moby Dick', 'Herman', 'Melville', 1851, 'Harper & Brothers', 'roman'],
  ['Gatsby le Magnifique', 'F. Scott', 'Fitzgerald', 1925, 'Scribner', 'roman'],
  ['Des souris et des hommes', 'John', 'Steinbeck', 1937, 'Covici Friede', 'roman'],
  ['Les Raisins de la colère', 'John', 'Steinbeck', 1939, 'Viking Press', 'roman'],
  ['Le Vieil Homme et la mer', 'Ernest', 'Hemingway', 1952, 'Scribner', 'roman'],
  ["L'Attrape-cœurs", 'J. D.', 'Salinger', 1951, 'Little, Brown', 'roman'],
  ['Fahrenheit 451', 'Ray', 'Bradbury', 1953, 'Ballantine', 'science-fiction'],
  ['Les Aventures de Tom Sawyer', 'Mark', 'Twain', 1876, 'American Publishing', "roman d'aventures"],
  ['Alice au pays des merveilles', 'Lewis', 'Carroll', 1865, 'Macmillan', 'conte'],
  ['Peter Pan', 'J. M.', 'Barrie', 1911, 'Hodder & Stoughton', 'roman'],
  ['Le Hobbit', 'J. R. R.', 'Tolkien', 1937, 'Allen & Unwin', 'fantasy'],
  ['Le Seigneur des anneaux', 'J. R. R.', 'Tolkien', 1954, 'Allen & Unwin', 'fantasy'],
  ['Harry Potter, tome 1', 'J. K.', 'Rowling', 1997, 'Bloomsbury', 'fantasy'],
  ['Le Monde de Narnia', 'C. S.', 'Lewis', 1950, 'Geoffrey Bles', 'fantasy'],
  ['Dune', 'Frank', 'Herbert', 1965, 'Chilton Books', 'science-fiction'],
  ['Fondation', 'Isaac', 'Asimov', 1951, 'Gnome Press', 'science-fiction'],
  ['Les Robots', 'Isaac', 'Asimov', 1950, 'Gnome Press', 'science-fiction'],
  ['Neuromancien', 'William', 'Gibson', 1984, 'Ace Books', 'science-fiction'],
  ['La Guerre des mondes', 'H. G.', 'Wells', 1898, 'Heinemann', 'science-fiction'],
  ['Le Maître et Marguerite', 'Mikhaïl', 'Boulgakov', 1967, 'YMCA Press', 'roman'],
  ['Crime et Châtiment', 'Fiodor', 'Dostoïevski', 1866, 'Le Messager russe', 'roman'],
  ['Les Frères Karamazov', 'Fiodor', 'Dostoïevski', 1880, 'Le Messager russe', 'roman'],
  ['Anna Karénine', 'Léon', 'Tolstoï', 1877, 'Le Messager russe', 'roman'],
  ['Guerre et Paix', 'Léon', 'Tolstoï', 1869, 'Le Messager russe', 'roman'],
  ["Le Joueur d'échecs", 'Stefan', 'Zweig', 1942, 'Bermann-Fischer', 'nouvelle'],
  ['Le Procès', 'Franz', 'Kafka', 1925, 'Die Schmiede', 'roman'],
  ['La Métamorphose', 'Franz', 'Kafka', 1915, 'Kurt Wolff', 'nouvelle'],
  ['Le Parfum', 'Patrick', 'Süskind', 1985, 'Diogenes', 'roman'],
  ['Don Quichotte', 'Miguel', 'de Cervantes', 1605, 'Francisco de Robles', 'roman'],
  ['Cent ans de solitude', 'Gabriel', 'García Márquez', 1967, 'Sudamericana', 'roman'],
  ["L'Amour aux temps du choléra", 'Gabriel', 'García Márquez', 1985, 'Oveja Negra', 'roman'],
  ['Le Nom de la rose', 'Umberto', 'Eco', 1980, 'Bompiani', 'roman policier'],
  ['Le Petit Nicolas', 'René', 'Goscinny', 1960, 'Denoël', 'roman jeunesse'],
  ["L'Alchimiste", 'Paulo', 'Coelho', 1988, 'Rocco', 'roman'],
  ['Le Meurtre de Roger Ackroyd', 'Agatha', 'Christie', 1926, 'Collins', 'roman policier'],
  ["Le Crime de l'Orient-Express", 'Agatha', 'Christie', 1934, 'Collins', 'roman policier'],
  ['Mort sur le Nil', 'Agatha', 'Christie', 1937, 'Collins', 'roman policier'],
  ['Le Chien des Baskerville', 'Arthur', 'Conan Doyle', 1902, 'George Newnes', 'roman policier'],
  ["L'Aiguille creuse", 'Maurice', 'Leblanc', 1909, 'Pierre Lafitte', 'roman policier'],
  ["Le Fantôme de l'Opéra", 'Gaston', 'Leroux', 1910, 'Pierre Lafitte', 'roman'],
  ['Les Fourmis', 'Bernard', 'Werber', 1991, 'Albin Michel', 'roman'],
];

/* ---------- categories ---------- */
const FRENCH = new Set([
  'de Saint-Exupéry', 'Camus', 'Hugo', 'Stendhal', 'Flaubert', 'Zola', 'de Balzac', 'Baudelaire',
  'Voltaire', 'Dumas', 'Verne', 'Rostand', 'Molière', 'Proust', 'Céline', 'Sartre', 'de Beauvoir',
  'Sagan', 'Vian', 'Alain-Fournier', 'Choderlos de Laclos', 'de La Fayette', 'de Montaigne',
  'Pascal', 'Rabelais', 'de La Fontaine', 'Perrault', 'de Maupassant', 'Goscinny', 'Leblanc',
  'Leroux', 'Werber',
]);
const ENGLISH = new Set([
  'Orwell', 'Huxley', 'Austen', 'Brontë', 'Dickens', 'Shelley', 'Stoker', 'Wilde', 'Stevenson',
  'Melville', 'Fitzgerald', 'Steinbeck', 'Hemingway', 'Salinger', 'Twain', 'Carroll', 'Barrie',
  'Rowling', 'Lewis', 'Tolkien', 'Bradbury', 'Herbert', 'Asimov', 'Gibson', 'Wells', 'Christie',
  'Conan Doyle',
]);
const ADVENTURE = new Set(['Verne', 'Dumas', 'Twain', 'Stevenson', 'Barrie']);

const CAT = {
  frClassic: 'French Classics',
  frModern: 'Modern French Literature',
  english: 'English-Language Literature',
  scifi: 'Science Fiction & Fantasy',
  crime: 'Crime & Mystery',
  stage: 'Theatre & Poetry',
  world: 'World Literature',
  essay: 'Essays & Philosophy',
  youth: 'Youth & Adventure',
};

// Category names created by the previous (French) version of this script.
const RENAMES: Record<string, string> = {
  'Classiques français': CAT.frClassic,
  'Littérature française moderne': CAT.frModern,
  'Littérature anglophone': CAT.english,
  'Science-fiction & Fantasy': CAT.scifi,
  'Policier & Mystère': CAT.crime,
  'Théâtre & Poésie': CAT.stage,
  'Littérature mondiale': CAT.world,
  'Essais & Philosophie': CAT.essay,
  'Jeunesse & Aventure': CAT.youth,
};

const GENRE_EN: Record<string, string> = {
  'roman': 'Novel',
  'science-fiction': 'Science-fiction novel',
  'roman policier': 'Detective novel',
  'pièce de théâtre': 'Play',
  'nouvelle': 'Short story',
  'fantasy': 'Fantasy novel',
  'essai': 'Essay',
  'roman gothique': 'Gothic novel',
  'roman dystopique': 'Dystopian novel',
  'conte': 'Tale',
  "roman d'aventures": 'Adventure novel',
  'roman épistolaire': 'Epistolary novel',
  'roman jeunesse': "Children's novel",
  'recueil de poèmes': 'Poetry collection',
  'recueil de fables': 'Collection of fables',
  'recueil de contes': 'Collection of tales',
  'fable politique': 'Political fable',
  'conte philosophique': 'Philosophical tale',
};

function categoryOf([, , nom, annee, , genre]: Row): string {
  if (genre.includes('science-fiction') || genre.includes('fantasy')) return CAT.scifi;
  if (genre.includes('policier')) return CAT.crime;
  if (genre.includes('essai') || genre.includes('philosophique')) return CAT.essay;
  if (genre.includes('théâtre') || genre.includes('poème') || genre.includes('fables')) return CAT.stage;
  if (genre.includes('conte') || genre.includes('jeunesse') || genre.includes('aventures') || ADVENTURE.has(nom)) return CAT.youth;
  if (FRENCH.has(nom)) return annee < 1900 ? CAT.frClassic : CAT.frModern;
  if (ENGLISH.has(nom)) return CAT.english;
  return CAT.world;
}

const describe = ([, prenom, nom, annee, editeur, genre]: Row) =>
  `${GENRE_EN[genre] ?? 'Book'} by ${prenom} ${nom}, published in ${annee} by ${editeur}. ` +
  `Sample entry: you can edit it from the catalog.`;

/* ---------- covers (Open Library) ---------- */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchCover(titre: string, nom: string): Promise<string | null> {
  const enc = encodeURIComponent;
  const queries = [`title=${enc(titre)}&author=${enc(nom)}`, `title=${enc(titre)}`];
  for (const q of queries) {
    try {
      const res = await fetch(`https://openlibrary.org/search.json?${q}&limit=5&fields=cover_i`, {
        headers: { 'User-Agent': 'FolioLibrary/1.0 (educational project)' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const data: any = await res.json();
      const hit = data.docs?.find((d: any) => d.cover_i);
      if (hit) return `https://covers.openlibrary.org/b/id/${hit.cover_i}-L.jpg?default=false`;
    } catch {
      /* network error or timeout: try the next query */
    }
    await sleep(200);
  }
  return null;
}

async function seed() {
  const withCovers = !process.argv.includes('--no-covers');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const ds = app.get(DataSource);
  const authors = ds.getRepository(Author);
  const books = ds.getRepository(Book);
  const categories = ds.getRepository(Category);
  const admin = await ds.getRepository(User).findOneBy({ role: UserRole.ADMIN });

  // Convert category names created by the earlier French version.
  for (const [oldName, newName] of Object.entries(RENAMES)) {
    const old = await categories.findOneBy({ nom: oldName });
    if (old && !(await categories.findOneBy({ nom: newName }))) {
      old.nom = newName;
      await categories.save(old);
    }
  }

  const authorCache = new Map<string, Author>();
  const categoryCache = new Map<string, Category>();
  const stats = { created: 0, updated: 0, covers: 0, noCover: 0 };

  async function getCategory(nom: string) {
    let c = categoryCache.get(nom) ?? (await categories.findOneBy({ nom }));
    if (!c) c = await categories.save(categories.create({ nom }));
    categoryCache.set(nom, c);
    return c;
  }

  let i = 0;
  for (const row of BOOKS) {
    const [titre, prenom, nom, annee, editeur] = row;
    i++;

    const key = `${prenom}|${nom}`;
    let author = authorCache.get(key) ?? (await authors.findOneBy({ prenom, nom }));
    if (!author) author = await authors.save(authors.create({ prenom, nom }));
    authorCache.set(key, author);

    const categorie = await getCategory(categoryOf(row));

    const existing = await books.findOne({
      where: { titre, auteur: { id: author.id } },
      withDeleted: true,
      relations: { categorie: true },
    });

    let book: Book;
    let dirty = false;
    if (existing) {
      book = existing;
      if (!book.categorie) { book.categorie = categorie; dirty = true; }
      // only touch descriptions generated by the old French script
      if (book.description.includes("Fiche d'exemple")) { book.description = describe(row); dirty = true; }
    } else {
      book = books.create({
        titre, editeur, annee, image: null,
        description: describe(row),
        auteur: author,
        categorie,
        user: admin ? { id: admin.id } : null,
      });
      dirty = true;
      stats.created++;
    }

    if (!book.image && withCovers) {
      const cover = await fetchCover(titre, nom);
      if (cover) { book.image = cover; dirty = true; stats.covers++; }
      else stats.noCover++;
      await sleep(250);
    }

    if (dirty) {
      await books.save(book);
      if (existing) stats.updated++;
    }
    if (i % 10 === 0) console.log(`… ${i}/${BOOKS.length}`);
  }

  console.log(
    `Done: ${stats.created} book(s) created, ${stats.updated} updated, ` +
    `${stats.covers} cover(s) added, ${stats.noCover} without a cover found, ` +
    `${categoryCache.size} categories.`,
  );
  await app.close();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
