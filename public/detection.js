class FaceDetectionSystem {
    constructor() {
        this.videoElement = document.getElementById('videoElement');
        this.canvasElement = document.getElementById('canvasElement');
        this.faceBox = document.getElementById('faceBox');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.permissionRequest = document.getElementById('permissionRequest');
        this.enableCameraBtn = document.getElementById('enableCameraBtn');
        this.currentTimeElement = document.getElementById('currentTime');
        this.scanIndicator = document.getElementById('scanIndicator');
        this.accessIndicator = document.getElementById('accessIndicator');
        
        this.stream = null;
        this.isScanning = false;
        this.faceDetected = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateTime();
        this.startTimeUpdate();
        this.checkCameraPermission();
    }
    
    setupEventListeners() {
        this.enableCameraBtn.addEventListener('click', () => {
            this.requestCameraAccess();
        });
        
        // Gestion des événements tactiles
        document.addEventListener('touchstart', () => {}, {passive: true});
        
        // Prévenir le zoom sur double tap
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (event) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }
    
    async checkCameraPermission() {
        try {
            // Simuler un délai de chargement
            await this.simulateLoading();
            
            const permission = await navigator.permissions.query({ name: 'camera' });
            
            if (permission.state === 'granted') {
                this.startCamera();
            } else if (permission.state === 'denied') {
                this.showPermissionRequest();
            } else {
                this.showPermissionRequest();
            }
        } catch (error) {
            console.error('Erreur lors de la vérification des permissions:', error);
            this.showPermissionRequest();
        }
    }
    
    async simulateLoading() {
        return new Promise(resolve => {
            setTimeout(resolve, 1000);
        });
    }
    
    showPermissionRequest() {
        this.loadingScreen.style.display = 'none';
        this.permissionRequest.style.display = 'flex';
    }
    
    async requestCameraAccess() {
        try {
            this.permissionRequest.style.display = 'none';
            this.loadingScreen.style.display = 'flex';
            
            await this.startCamera();
        } catch (error) {
            console.error('Erreur lors de l\'accès à la caméra:', error);
            this.showPermissionRequest();
        }
    }
    
    async startCamera() {
        try {
            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = this.stream;
            
            // Attendre que la vidéo soit chargée
            this.videoElement.addEventListener('loadedmetadata', () => {
                this.loadingScreen.style.display = 'none';
                this.startScanning();
            });
            
        } catch (error) {
            console.error('Erreur lors du démarrage de la caméra:', error);
            this.showPermissionRequest();
        }
    }
    
    startScanning() {
        this.isScanning = true;
        this.updateScanIndicator();
        this.simulateFaceDetection();
    }
    
    updateScanIndicator() {
        if (this.isScanning) {
            this.scanIndicator.innerHTML = `
                <i class="fas fa-search"></i>
                <span>SCAN EN COURS...</span>
            `;
            this.scanIndicator.style.borderColor = 'var(--neon-yellow)';
            this.scanIndicator.style.color = 'var(--neon-yellow)';
        } else {
            this.scanIndicator.innerHTML = `
                <i class="fas fa-pause"></i>
                <span>SCAN EN PAUSE</span>
            `;
            this.scanIndicator.style.borderColor = 'var(--neon-red)';
            this.scanIndicator.style.color = 'var(--neon-red)';
        }
    }
    
    simulateFaceDetection() {
        // Simulation de détection faciale
        setInterval(() => {
            if (this.isScanning && !this.faceDetected) {
                // Simuler une détection aléatoire
                if (Math.random() < 0.1) { // 10% de chance par seconde
                    this.detectFace();
                }
            }
        }, 1000);
    }
    
    detectFace() {
        this.faceDetected = true;
        this.isScanning = false;
        
        // Afficher la boîte de détection
        this.showFaceDetectionBox();
        
        // Mettre à jour les indicateurs
        this.updateScanIndicator();
        this.updateAccessIndicator();
        
        // Simuler une analyse
        setTimeout(() => {
            this.analyzeFace();
        }, 1000);
    }
    
    showFaceDetectionBox() {
        // Positionner la boîte de détection au centre
        const videoRect = this.videoElement.getBoundingClientRect();
        const boxSize = 150;
        
        this.faceBox.style.display = 'block';
        this.faceBox.style.left = `${(videoRect.width - boxSize) / 2}px`;
        this.faceBox.style.top = `${(videoRect.height - boxSize) / 2}px`;
        this.faceBox.style.width = `${boxSize}px`;
        this.faceBox.style.height = `${boxSize}px`;
    }
    
    updateAccessIndicator() {
        this.accessIndicator.innerHTML = `
            <i class="fas fa-user-check"></i>
            <span>FACE DÉTECTÉE</span>
        `;
        this.accessIndicator.style.borderColor = 'var(--neon-green)';
        this.accessIndicator.style.color = 'var(--neon-green)';
    }
    
    analyzeFace() {
        // Simuler une analyse faciale
        this.accessIndicator.innerHTML = `
            <i class="fas fa-cog fa-spin"></i>
            <span>ANALYSE EN COURS...</span>
        `;
        
        setTimeout(() => {
            // Simuler une reconnaissance réussie
            this.accessIndicator.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>ACCÈS AUTORISÉ</span>
            `;
            this.accessIndicator.style.borderColor = 'var(--neon-green)';
            this.accessIndicator.style.color = 'var(--neon-green)';
            
            // Rediriger vers le média center après un délai
            setTimeout(() => {
                window.location.href = '/library';
            }, 1000);
            
        }, 1000);
    }
    
    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        this.currentTimeElement.textContent = timeString;
    }
    
    startTimeUpdate() {
        setInterval(() => {
            this.updateTime();
        }, 1000);
    }
    
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
    }
}

// Initialiser le système quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    new FaceDetectionSystem();
});

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
    console.error('Erreur JavaScript:', event.error);
});

// Nettoyer lors de la fermeture
window.addEventListener('beforeunload', () => {
    // Arrêter la caméra si elle est active
    if (window.faceDetectionSystem) {
        window.faceDetectionSystem.stopCamera();
    }
});
