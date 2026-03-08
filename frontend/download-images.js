import fs from 'fs';
import fsPromises from 'fs/promises';
import https from 'https';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const images = {
  'hero-books.jpg': 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
  'book-placeholder.jpg': 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80'
};

const imagesDir = join(__dirname, 'public', 'images');

async function downloadImage(url, filename) {
  const filePath = join(imagesDir, filename);
  
  try {
    // Vérifier si le fichier existe déjà
    try {
      await fsPromises.access(filePath);
      console.log(`✅ ${filename} existe déjà`);
      return true;
    } catch {
      // Le fichier n'existe pas, on continue
    }

    console.log(`⬇️  Téléchargement de ${filename}...`);

    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        // Gérer les redirections
        if (response.statusCode === 301 || response.statusCode === 302) {
          console.log(`↪️  Redirection vers ${response.headers.location}`);
          https.get(response.headers.location, (redirectResponse) => {
            if (redirectResponse.statusCode !== 200) {
              reject(new Error(`Échec du téléchargement après redirection (${redirectResponse.statusCode})`));
              return;
            }
            
            const fileStream = fs.createWriteStream(filePath);
            redirectResponse.pipe(fileStream);
            
            fileStream.on('finish', () => {
              fileStream.close();
              console.log(`✅ ${filename} téléchargé avec succès`);
              resolve(true);
            });
            
            fileStream.on('error', (err) => {
              console.error(`❌ Erreur d'écriture pour ${filename}:`, err.message);
              fs.unlink(filePath, () => {});
              reject(err);
            });
          }).on('error', (err) => {
            console.error(`❌ Erreur de connexion pour ${filename}:`, err.message);
            reject(err);
          });
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Échec du téléchargement (${response.statusCode})`));
          return;
        }

        const fileStream = fs.createWriteStream(filePath);
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`✅ ${filename} téléchargé avec succès`);
          resolve(true);
        });

        fileStream.on('error', (err) => {
          console.error(`❌ Erreur d'écriture pour ${filename}:`, err.message);
          fs.unlink(filePath, () => {});
          reject(err);
        });
      }).on('error', (err) => {
        console.error(`❌ Erreur de connexion pour ${filename}:`, err.message);
        reject(err);
      });
    });
  } catch (error) {
    console.error(`❌ Erreur pour ${filename}:`, error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 Démarrage du téléchargement des images...\n');
    
    // Créer le dossier images s'il n'existe pas
    try {
      await fsPromises.access(imagesDir);
      console.log(`📁 Dossier existe : ${imagesDir}\n`);
    } catch {
      await fsPromises.mkdir(imagesDir, { recursive: true });
      console.log(`📁 Dossier créé : ${imagesDir}\n`);
    }

    // Télécharger toutes les images séquentiellement pour mieux voir les erreurs
    let successCount = 0;
    let failCount = 0;

    for (const [filename, url] of Object.entries(images)) {
      try {
        const success = await downloadImage(url, filename);
        if (success) successCount++;
        else failCount++;
      } catch (error) {
        console.error(`❌ Échec pour ${filename}:`, error.message);
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Succès : ${successCount}`);
    console.log(`❌ Échecs : ${failCount}`);
    console.log('='.repeat(50));
    
    if (successCount > 0) {
      console.log('\n🎉 Images téléchargées avec succès !');
    } else {
      console.log('\n⚠️  Aucune image n\'a pu être téléchargée.');
      console.log('💡 Astuce : Vous pouvez télécharger les images manuellement depuis Unsplash');
    }
    
  } catch (error) {
    console.error('❌ Erreur générale :', error.message);
    console.error('Stack:', error.stack);
  }
}

// Exécuter le script
main();