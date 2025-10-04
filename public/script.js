class MediaCenter {
    constructor() {
        this.audioPlayer = document.getElementById('audioPlayer');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.currentTrackDisplay = document.getElementById('currentTrackDisplay');
        this.playlistProgress = document.getElementById('playlistProgress');
        this.playlistIndicator = document.getElementById('playlistIndicator');
        this.musicGrid = document.getElementById('musicGrid');
        this.folderList = document.getElementById('folderList');
        this.nextBtn = document.getElementById('nextBtn');
        
        this.currentMusic = null;
        this.musicList = [];
        this.folders = [];
        this.currentFolder = '';
        this.isGifVisible = false;
        this.availableGifs = [];
        
        // Nouvelles propriétés pour la v2
        this.currentPlaylist = [];
        this.currentTrackIndex = 0;
        this.isPlaylistMode = false;
        this.allFolders = [];
        this.currentFolderIndex = 0;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadMusicList();
        this.setupAudioPlayer();
    }

    async checkBluetoothPermission() {
        if ('bluetooth' in navigator) {
            // Web Bluetooth API is supported
            console.log('Web Bluetooth is supported!');
        } else {
            // Web Bluetooth API is not supported
            console.log('Web Bluetooth is not supported!');
        }

    }
    
    setupEventListeners() {
        // Contrôles de lecture
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.nextBtn.addEventListener('click', () => this.playNextTrack());
        
        // Contrôle du volume
        this.volumeSlider.addEventListener('input', (e) => {
            this.audioPlayer.volume = e.target.value / 100;
        });
        
        // Gestion des événements tactiles
        this.setupTouchEvents();
    }
    
    setupTouchEvents() {
        // Prévenir le zoom sur double tap
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (event) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // Améliorer la réactivité tactile
        document.addEventListener('touchstart', () => {}, {passive: true});
        
        // Optimiser le scroll tactile dans la grille de musiques
        this.setupTouchScroll();
    }
    
    setupTouchScroll() {
        const musicGrid = this.musicGrid;
        let startY = 0;
        let startScrollTop = 0;
        let isScrolling = false;
        
        // Détecter le début du scroll
        musicGrid.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            startScrollTop = musicGrid.scrollTop;
            isScrolling = false;
        }, { passive: true });
        
        // Détecter le mouvement de scroll
        musicGrid.addEventListener('touchmove', (e) => {
            const deltaY = e.touches[0].clientY - startY;
            
            // Si le mouvement vertical est significatif, c'est un scroll
            if (Math.abs(deltaY) > 5) {
                isScrolling = true;
            }
        }, { passive: true });
        
        // Réinitialiser l'état de scroll
        musicGrid.addEventListener('touchend', () => {
            setTimeout(() => {
                isScrolling = false;
            }, 100);
        }, { passive: true });
        
        // Exposer l'état de scroll pour les autres fonctions
        this.isScrolling = () => isScrolling;
    }
    
    setupAudioPlayer() {
        // Événements audio
        this.audioPlayer.addEventListener('loadedmetadata', () => {
            // Optionnel: ajouter des actions quand les métadonnées sont chargées
        });
        
        this.audioPlayer.addEventListener('timeupdate', () => {
            // Optionnel: ajouter des actions pendant la lecture
        });
        
        this.audioPlayer.addEventListener('ended', () => {
            this.handleTrackEnd();
        });
        
        this.audioPlayer.addEventListener('play', () => {
            this.updatePlayPauseButton(true);
        });
        
        this.audioPlayer.addEventListener('pause', () => {
            this.updatePlayPauseButton(false);
        });
        
        // Initialiser le volume
        this.audioPlayer.volume = this.volumeSlider.value / 100;
    }
    
    async loadMusicList(folder = '') {
        try {
            const url = folder ? `/api/music?folder=${encodeURIComponent(folder)}` : '/api/music';
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Erreur lors du chargement des musiques');
            }
            
            const data = await response.json();
            this.currentFolder = data.currentFolder || '';
            this.musicList = data.music || [];
            
            // Charger la liste des dossiers seulement au premier appel
            if (!this.folders.length) {
                this.folders = data.folders || [];
                this.allFolders = [{ name: 'Dossier principal', path: '' }, ...this.folders];
                this.renderFolderList();
                this.buildCompletePlaylist();
            } else {
                // Mettre à jour seulement l'état actif
                this.updateFolderListActiveState();
            }
            
            this.renderMusicGrid();
        } catch (error) {
            console.error('Erreur:', error);
            this.showError('Erreur lors du chargement des musiques');
        }
    }
    
    async buildCompletePlaylist() {
        this.currentPlaylist = [];
        this.currentTrackIndex = 0;
        
        for (let i = 0; i < this.allFolders.length; i++) {
            const folder = this.allFolders[i];
            try {
                const url = folder.path ? `/api/music?folder=${encodeURIComponent(folder.path)}` : '/api/music';
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    const musicFiles = data.music || [];
                    
                    // Ajouter chaque musique avec son dossier d'origine
                    musicFiles.forEach(music => {
                        this.currentPlaylist.push({
                            ...music,
                            folderName: folder.name,
                            folderPath: folder.path
                        });
                    });
                }
            } catch (error) {
                console.error(`Erreur lors du chargement du dossier ${folder.name}:`, error);
            }
        }
        
        console.log(`Playlist complète créée: ${this.currentPlaylist.length} musiques`);
    }
    
    renderMusicGrid() {
        if (this.musicList.length === 0) {
            this.musicGrid.innerHTML = `
                <div class="loading">
                    <i class="fas fa-folder-open"></i>
                    <p>Ce dossier ne contient que des sous-dossiers</p>
                </div>
            `;
            return;
        }
        
        this.musicGrid.innerHTML = this.musicList.map(music => `
            <div class="music-item" data-filename="${music.filename}">
                <div class="music-icon">
                    <i class="fas fa-music"></i>
                </div>
                <div class="music-name">${this.formatMusicName(music.name)}</div>
                <div class="music-size">${music.sizeMB} MB</div>
            </div>
        `).join('');
        
        // Ajouter les événements de clic tactiles
        this.musicGrid.querySelectorAll('.music-item').forEach(item => {
            let touchStartTime = 0;
            let touchStartY = 0;
            
            // Gestion des événements tactiles
            item.addEventListener('touchstart', (e) => {
                touchStartTime = Date.now();
                touchStartY = e.touches[0].clientY;
            }, { passive: true });
            
            item.addEventListener('touchend', (e) => {
                const touchEndTime = Date.now();
                const touchDuration = touchEndTime - touchStartTime;
                const touchEndY = e.changedTouches[0].clientY;
                const touchDistance = Math.abs(touchEndY - touchStartY);
                
                // Si c'est un tap court et peu de mouvement, c'est un clic
                if (touchDuration < 300 && touchDistance < 10 && !this.isScrolling()) {
                    e.preventDefault();
                    const filename = item.dataset.filename;
                    this.playMusic(filename);
                }
            }, { passive: false });
            
            // Fallback pour les clics souris
            item.addEventListener('click', (e) => {
                // Éviter les clics accidentels sur mobile
                if (e.pointerType !== 'touch') {
                    const filename = item.dataset.filename;
                    this.playMusic(filename);
                }
            });
        });
    }
    
    renderFolderList() {
        let folderItems = '';
        
        // Ajouter le dossier racine (music)
        folderItems += `
            <div class="folder-item ${!this.currentFolder ? 'active' : ''}" data-folder="">
                <span>Dossier principal</span>
            </div>
        `;
        
        // Toujours afficher tous les dossiers disponibles
        if (this.folders.length > 0) {
            folderItems += this.folders.map(folder => `
                <div class="folder-item ${this.currentFolder === folder.path ? 'active' : ''}" data-folder="${folder.path}">
                    <span>${folder.name}</span>
                </div>
            `).join('');
        }
        
        this.folderList.innerHTML = folderItems;
        
        // Ajouter les événements de clic pour les dossiers
        this.folderList.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', () => {
                const folderPath = item.dataset.folder;
                this.navigateToFolder(folderPath);
            });
        });
    }
    
    updateFolderListActiveState() {
        // Mettre à jour l'état actif de tous les éléments de la liste
        this.folderList.querySelectorAll('.folder-item').forEach(item => {
            const folderPath = item.dataset.folder;
            if (folderPath === this.currentFolder) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    navigateToFolder(folderPath) {
        // Naviguer vers le dossier sélectionné
        this.loadMusicList(folderPath);
    }
    
    formatMusicName(name) {
        // Nettoyer le nom de la musique pour l'affichage
        return name
            .replace(/\([^)]*\)/g, '') // Enlever les parenthèses et leur contenu
            .replace(/\[[^\]]*\]/g, '') // Enlever les crochets et leur contenu
            .replace(/Ultra Slowed|Super Slowed|Slowed|TikTok Version/gi, '') // Enlever les suffixes
            .replace(/\s+/g, ' ') // Remplacer les espaces multiples
            .trim()
            .substring(0, 25) + (name.length > 25 ? '...' : '');
    }
    
    async playMusic(filename) {
        try {
            // Trouver la musique dans la playlist complète
            const musicIndex = this.currentPlaylist.findIndex(m => m.filename === filename);
            if (musicIndex === -1) {
                throw new Error('Musique non trouvée dans la playlist');
            }
            
            // Activer le mode playlist et définir l'index actuel
            this.isPlaylistMode = true;
            this.currentTrackIndex = musicIndex;
            this.currentMusic = this.currentPlaylist[musicIndex];
            
            this.audioPlayer.src = `/music/${filename}`;
            
            // Mettre à jour l'affichage
            this.updateNowPlaying();
            this.updateMusicGridSelection(filename);
            
            // Charger et jouer
            await this.audioPlayer.load();
            await this.audioPlayer.play();
            
        } catch (error) {
            console.error('Erreur lors de la lecture:', error);
            this.showError('Erreur lors de la lecture de la musique');
        }
    }
    
    
    togglePlayPause() {
        if (this.audioPlayer.paused) {
            this.audioPlayer.play();
        } else {
            this.audioPlayer.pause();
        }
    }
    
    stop() {
        this.audioPlayer.pause();
        this.audioPlayer.currentTime = 0;
        this.updatePlayPauseButton(false);
        this.isPlaylistMode = false;
    }
    
    updatePlayPauseButton(isPlaying) {
        const icon = this.playPauseBtn.querySelector('i');
        if (isPlaying) {
            icon.className = 'fas fa-pause';
            this.playPauseBtn.classList.add('playing');
        } else {
            icon.className = 'fas fa-play';
            this.playPauseBtn.classList.remove('playing');
        }
        
        this.playPauseBtn.disabled = !this.currentMusic;
        this.stopBtn.disabled = !this.currentMusic;
    }
    
    updateNowPlaying() {
        if (!this.currentMusic) {
            this.currentTrackDisplay.textContent = 'Aucune musique';
            this.updatePlaylistProgress();
            return;
        }
        
        this.currentTrackDisplay.textContent = this.formatMusicName(this.currentMusic.name);
        this.updatePlaylistProgress();
    }
    
    updatePlaylistProgress() {
        if (this.isPlaylistMode && this.currentPlaylist.length > 0) {
            const currentIndex = this.currentTrackIndex + 1;
            const totalTracks = this.currentPlaylist.length;
            this.playlistProgress.textContent = `${currentIndex} / ${totalTracks}`;
            this.playlistIndicator.style.display = 'inline';
        } else {
            this.playlistProgress.textContent = '0 / 0';
            this.playlistIndicator.style.display = 'none';
        }
    }
    
    updateMusicGridSelection(filename) {
        // Retirer la sélection précédente
        this.musicGrid.querySelectorAll('.music-item').forEach(item => {
            item.classList.remove('playing');
        });
        
        // Ajouter la sélection actuelle
        const currentItem = this.musicGrid.querySelector(`[data-filename="${filename}"]`);
        if (currentItem) {
            currentItem.classList.add('playing');
            currentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    handleTrackEnd() {
        this.updatePlayPauseButton(false);
        
        // Si on est en mode playlist, passer à la suivante
        if (this.isPlaylistMode) {
            this.playNextTrack();
        }
    }
    
    async playNextTrack() {
        if (this.currentTrackIndex < this.currentPlaylist.length - 1) {
            // Passer à la musique suivante
            this.currentTrackIndex++;
            const nextMusic = this.currentPlaylist[this.currentTrackIndex];
            
            try {
                this.currentMusic = nextMusic;
                this.audioPlayer.src = `/music/${nextMusic.filename}`;
                
                // Mettre à jour l'affichage
                this.updateNowPlaying();
                this.updateMusicGridSelection(nextMusic.filename);
                
                // Charger et jouer
                await this.audioPlayer.load();
                await this.audioPlayer.play();
                
                console.log(`Passage à la musique suivante: ${nextMusic.name}`);
            } catch (error) {
                console.error('Erreur lors du passage à la musique suivante:', error);
                // Essayer la suivante
                this.playNextTrack();
            }
        } else {
            // Fin de la playlist, passer au dossier suivant
            this.moveToNextFolder();
        }
    }
    
    async moveToNextFolder() {
        if (this.currentFolderIndex < this.allFolders.length - 1) {
            this.currentFolderIndex++;
            const nextFolder = this.allFolders[this.currentFolderIndex];
            
            console.log(`Passage au dossier suivant: ${nextFolder.name}`);
            
            // Charger le nouveau dossier
            await this.loadMusicList(nextFolder.path);
            
            // Reconstruire la playlist à partir du nouveau dossier
            await this.buildCompletePlaylist();
            
            // Jouer la première musique du nouveau dossier
            if (this.currentPlaylist.length > 0) {
                this.currentTrackIndex = 0;
                const firstMusic = this.currentPlaylist[0];
                
                try {
                    this.currentMusic = firstMusic;
                    this.audioPlayer.src = `/music/${firstMusic.filename}`;
                    
                    // Mettre à jour l'affichage
                    this.updateNowPlaying();
                    this.updateMusicGridSelection(firstMusic.filename);
                    
                // Charger et jouer
                await this.audioPlayer.load();
                await this.audioPlayer.play();
                    
                    console.log(`Première musique du nouveau dossier: ${firstMusic.name}`);
                } catch (error) {
                    console.error('Erreur lors de la lecture de la première musique:', error);
                }
            }
        } else {
            // Fin de tous les dossiers, revenir au début
            console.log('Fin de tous les dossiers, retour au début');
            this.currentFolderIndex = 0;
            this.currentTrackIndex = 0;
            
            // Charger le premier dossier
            await this.loadMusicList('');
            
            // Reconstruire la playlist complète
            await this.buildCompletePlaylist();
            
            // Jouer la première musique
            if (this.currentPlaylist.length > 0) {
                const firstMusic = this.currentPlaylist[0];
                
                try {
                    this.currentMusic = firstMusic;
                    this.audioPlayer.src = `/music/${firstMusic.filename}`;
                    
                    // Mettre à jour l'affichage
                    this.updateNowPlaying();
                    this.updateMusicGridSelection(firstMusic.filename);
                    
                // Charger et jouer
                await this.audioPlayer.load();
                await this.audioPlayer.play();
                    
                    console.log(`Retour au début: ${firstMusic.name}`);
                } catch (error) {
                    console.error('Erreur lors du retour au début:', error);
                }
            }
        }
    }
    
    showError(message) {
        this.musicGrid.innerHTML = `
            <div class="loading">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
    }
}

// Initialiser le média center quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    new MediaCenter();
});

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
    console.error('Erreur JavaScript:', event.error);
});

// Prévenir les actions par défaut sur les éléments tactiles
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Améliorer les performances sur mobile
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
    });
}
