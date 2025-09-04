class MediaCenter {
    constructor() {
        this.audioPlayer = document.getElementById('audioPlayer');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.currentTrackDisplay = document.getElementById('currentTrackDisplay');
        this.musicGrid = document.getElementById('musicGrid');
        this.folderList = document.getElementById('folderList');
        this.gifToggleBtn = document.getElementById('gifToggleBtn');
        this.gifOverlay = document.getElementById('gifOverlay');
        this.gifImage = document.getElementById('gifImage');
        
        this.currentMusic = null;
        this.musicList = [];
        this.folders = [];
        this.currentFolder = '';
        this.isGifVisible = false;
        this.giphyApiKey = 'm4RN7hKHt1rs93ozepEXWHVFpM6WtMQ4';
        
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
        
        // Contrôle du volume
        this.volumeSlider.addEventListener('input', (e) => {
            this.audioPlayer.volume = e.target.value / 100;
        });
        
        // Contrôle de l'overlay GIF
        this.gifToggleBtn.addEventListener('click', () => this.toggleGifOverlay());
        this.gifOverlay.addEventListener('click', () => this.hideGifOverlay());
        
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
                this.renderFolderList();
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
            const music = this.musicList.find(m => m.filename === filename);
            if (!music) {
                throw new Error('Musique non trouvée');
            }
            
            this.currentMusic = music;
            this.audioPlayer.src = `/music/${filename}`;
            
            // Mettre à jour l'affichage
            this.updateNowPlaying();
            this.updateMusicGridSelection(filename);
            
            // Charger et jouer
            await this.audioPlayer.load();
            await this.audioPlayer.play();
            
            // Afficher l'overlay GIF
            this.showGifOverlay();
            
        } catch (error) {
            console.error('Erreur lors de la lecture:', error);
            this.showError('Erreur lors de la lecture de la musique');
        }
    }
    
    async showGifOverlay() {
        try {
            const gifUrl = await this.getRandomFortniteGif();
            this.gifImage.src = gifUrl;
            this.gifOverlay.style.display = 'flex';
            this.isGifVisible = true;
            
            // Mettre à jour le bouton toggle
            this.gifToggleBtn.classList.add('playing');
        } catch (error) {
            console.error('Erreur lors du chargement du GIF:', error);
        }
    }
    
    hideGifOverlay() {
        this.gifOverlay.style.display = 'none';
        this.isGifVisible = false;
        this.gifToggleBtn.classList.remove('playing');
    }
    
    toggleGifOverlay() {
        if (this.isGifVisible) {
            this.hideGifOverlay();
        } else if (this.currentMusic && !this.audioPlayer.paused) {
            this.showGifOverlay();
        }
    }
    
    async getRandomFortniteGif() {
        try {
            const offset = Math.floor(Math.random() * 50); // GIPHY a une limite de 4999
            const recherches = [
                'fortnite%20dance',
                'fonky%20dance',
                'sigma',
                'monkey',
                'trollface',
                'fail'
            ]
            const response = await fetch(
                `https://api.giphy.com/v1/gifs/search?api_key=${this.giphyApiKey}&q=${recherches[Math.floor(Math.random() * recherches.length)]}&limit=1&offset=${offset}&rating=g&lang=en`
            );
            
            if (!response.ok) {
                throw new Error('Erreur lors de la récupération du GIF');
            }
            
            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                // Utiliser l'URL fixed_height pour une taille optimale
                return data.data[0].images.fixed_height.url;
            } else {
                throw new Error('Aucun GIF trouvé');
            }
        } catch (error) {
            console.error('Erreur GIPHY:', error);
            // Retourner un GIF par défaut en cas d'erreur
            return 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif';
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
        this.hideGifOverlay();
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
            return;
        }
        
        this.currentTrackDisplay.textContent = this.formatMusicName(this.currentMusic.name);
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
        // Masquer l'overlay GIF quand la musique se termine
        this.hideGifOverlay();
        this.updatePlayPauseButton(false);
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
