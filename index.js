const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware pour servir les fichiers statiques
app.use(express.static('public'));

// Middleware pour parser le JSON
app.use(express.json());

// Fonction pour scanner récursivement les dossiers
function scanMusicDirectory(dirPath, relativePath = '') {
    const items = [];
    const folders = [];
    
    try {
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            const stats = fs.statSync(fullPath);
            
            if (stats.isDirectory()) {
                // Vérifier si le dossier contient des fichiers MP3
                const subFiles = fs.readdirSync(fullPath);
                const hasMusic = subFiles.some(subFile => 
                    subFile.toLowerCase().endsWith('.mp3')
                );
                
                if (hasMusic) {
                    folders.push({
                        name: file,
                        path: relativePath ? path.join(relativePath, file) : file
                    });
                }
            } else if (file.toLowerCase().endsWith('.mp3')) {
                items.push({
                    name: file.replace('.mp3', ''),
                    filename: relativePath ? path.join(relativePath, file) : file,
                    size: stats.size,
                    sizeMB: (stats.size / (1024 * 1024)).toFixed(1)
                });
            }
        }
    } catch (error) {
        console.error('Erreur lors du scan du dossier:', error);
    }
    
    return { items, folders };
}

// API pour lister les musiques et dossiers
app.get('/api/music', (req, res) => {
    const folder = req.query.folder || '';
    const musicDir = path.join(__dirname, 'music');
    const targetDir = folder ? path.join(musicDir, folder) : musicDir;
    
    // Vérification de sécurité pour éviter la traversée de répertoire
    if (folder && path.relative(musicDir, targetDir).startsWith('..')) {
        return res.status(403).json({ error: 'Accès interdit' });
    }
    
    try {
        const { items: musicFiles, folders } = scanMusicDirectory(targetDir, folder);
        
        res.json({
            music: musicFiles,
            folders: folders,
            currentFolder: folder
        });
    } catch (error) {
        console.error('Erreur lors de la lecture du dossier music:', error);
        res.status(500).json({ error: 'Erreur lors de la lecture des musiques' });
    }
});

// Route pour servir les fichiers audio
app.get('/music/:filename(*)', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'music', filename);
    
    // Vérification de sécurité pour éviter la traversée de répertoire
    if (path.relative(path.join(__dirname, 'music'), filePath).startsWith('..')) {
        return res.status(403).json({ error: 'Accès interdit' });
    }
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'Fichier non trouvé' });
    }
});

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🎵 Média center démarré sur http://localhost:${PORT}`);
    console.log(`📁 Dossier music: ${path.join(__dirname, 'music')}`);
});
