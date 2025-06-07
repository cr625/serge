// Uber Surge Tracker JavaScript

// Application data
const APP_DATA = {
    uberServices: [
        {
            name: "UberX",
            description: "Affordable rides for up to 4 people",
            basePrice: 12.50,
            icon: "🚗"
        },
        {
            name: "UberPool",
            description: "Share your ride, split the cost",
            basePrice: 8.75,
            icon: "👥"
        },
        {
            name: "UberXL",
            description: "Extra room for up to 6 people",
            basePrice: 18.25,
            icon: "🚙"
        },
        {
            name: "UberBlack",
            description: "Premium rides with professional drivers",
            basePrice: 28.50,
            icon: "🚐"
        },
        {
            name: "UberSelect",
            description: "Newer cars with top-rated drivers",
            basePrice: 22.75,
            icon: "✨"
        }
    ],
    surgeFactors: {
        normal: 1.0,
        light: 1.2,
        moderate: 1.8,
        high: 2.5,
        extreme: 4.2
    },
    peakHours: [
        "7:00-9:00 AM",
        "5:00-7:00 PM",
        "11:00 PM-2:00 AM (Weekends)"
    ],
    location: {
        defaultLat: 39.7392,
        defaultLng: -74.2236,
        city: "Manahawkin, NJ"
    }
};

// Application state
let appState = {
    userLocation: null,
    currentSurgeData: [],
    surgeHistory: [],
    autoRefreshInterval: null,
    isLocationAllowed: false,
    locationRequested: false
};

// DOM elements
const elements = {
    locationStatus: document.getElementById('locationStatus'),
    locationText: document.getElementById('locationText'),
    coordinates: document.getElementById('coordinates'),
    statusIndicator: document.getElementById('statusIndicator'),
    refreshBtn: document.getElementById('refreshBtn'),
    lastUpdated: document.getElementById('lastUpdated'),
    servicesGrid: document.getElementById('servicesGrid'),
    surgeHistory: document.getElementById('surgeHistory'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    errorModal: document.getElementById('errorModal'),
    mapContainer: document.getElementById('mapContainer'),
    surgeZones: document.getElementById('surgeZones')
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('Uber Surge Tracker initialized');
    initializeApp();
});

function initializeApp() {
    // Set initial state with default location
    appState.userLocation = {
        lat: APP_DATA.location.defaultLat,
        lng: APP_DATA.location.defaultLng
    };
    
    // Update UI with default location
    elements.coordinates.textContent = 
        `${appState.userLocation.lat.toFixed(4)}, ${appState.userLocation.lng.toFixed(4)}`;
    
    // Request location permission
    requestLocation();
    
    // Set up event listeners
    elements.refreshBtn.addEventListener('click', handleManualRefresh);
    
    // Generate initial surge data
    generateSurgeData();
    updateServicesDisplay();
    updateSurgeHistory();
    updateMapDisplay();
    
    // Start auto-refresh
    startAutoRefresh();
}

function requestLocation() {
    if (!navigator.geolocation) {
        handleLocationNotSupported();
        return;
    }

    if (appState.locationRequested) {
        return; // Prevent multiple requests
    }
    
    appState.locationRequested = true;
    elements.locationText.textContent = 'Requesting location access...';
    elements.statusIndicator.textContent = '🔍';

    navigator.geolocation.getCurrentPosition(
        handleLocationSuccess,
        handleLocationError,
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
        }
    );
}

function handleLocationSuccess(position) {
    console.log('Location access granted:', position);
    
    appState.userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
    };
    appState.isLocationAllowed = true;

    elements.locationText.textContent = 'Your current location';
    elements.statusIndicator.textContent = '📍';
    elements.coordinates.textContent = 
        `${appState.userLocation.lat.toFixed(4)}, ${appState.userLocation.lng.toFixed(4)}`;

    // Generate new surge data based on actual location
    generateSurgeData();
    updateServicesDisplay();
    updateMapDisplay();
    
    // Close error modal if it was open
    closeErrorModal();
}

function handleLocationError(error) {
    console.log('Location error:', error);
    
    // Keep using default location
    appState.isLocationAllowed = false;

    switch(error.code) {
        case error.PERMISSION_DENIED:
            elements.locationText.textContent = `Using default location (${APP_DATA.location.city})`;
            elements.statusIndicator.textContent = '⚠️';
            setTimeout(() => {
                showErrorModal();
            }, 1000);
            break;
        case error.POSITION_UNAVAILABLE:
            elements.locationText.textContent = `Location unavailable - using ${APP_DATA.location.city}`;
            elements.statusIndicator.textContent = '⚠️';
            break;
        case error.TIMEOUT:
            elements.locationText.textContent = `Location timeout - using ${APP_DATA.location.city}`;
            elements.statusIndicator.textContent = '⚠️';
            break;
        default:
            elements.locationText.textContent = `Location error - using ${APP_DATA.location.city}`;
            elements.statusIndicator.textContent = '⚠️';
            break;
    }

    // Generate surge data with default location
    generateSurgeData();
    updateServicesDisplay();
    updateMapDisplay();
}

function handleLocationNotSupported() {
    elements.locationText.textContent = `Geolocation not supported - using ${APP_DATA.location.city}`;
    elements.statusIndicator.textContent = '❌';
    
    // Generate surge data with default location
    generateSurgeData();
    updateServicesDisplay();
    updateMapDisplay();
}

function generateSurgeData() {
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = currentDay === 0 || currentDay === 6;
    
    // Determine base surge level based on time and day
    let baseSurgeLevel = 'normal';
    
    if ((currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19)) {
        baseSurgeLevel = Math.random() > 0.5 ? 'moderate' : 'high';
    } else if (isWeekend && (currentHour >= 23 || currentHour <= 2)) {
        baseSurgeLevel = Math.random() > 0.3 ? 'high' : 'extreme';
    } else if (currentHour >= 22 || currentHour <= 6) {
        baseSurgeLevel = Math.random() > 0.7 ? 'light' : 'normal';
    }

    appState.currentSurgeData = APP_DATA.uberServices.map(service => {
        // Add some randomization to make it more realistic
        const randomFactor = Math.random();
        let surgeLevel = baseSurgeLevel;
        
        // Adjust surge based on service type
        if (service.name === 'UberPool') {
            // Pool usually has lower surge
            surgeLevel = randomFactor > 0.8 ? 'light' : 'normal';
        } else if (service.name === 'UberBlack' || service.name === 'UberSelect') {
            // Premium services might have different surge patterns
            if (randomFactor > 0.6) {
                surgeLevel = surgeLevel === 'extreme' ? 'high' : surgeLevel;
            }
        }

        // Get surge multiplier with some randomness
        const surgeLevels = Object.keys(APP_DATA.surgeFactors);
        const randomSurgeLevel = surgeLevels[Math.floor(Math.random() * surgeLevels.length)];
        const finalSurgeLevel = Math.random() > 0.7 ? randomSurgeLevel : surgeLevel;
        
        const surgeMultiplier = APP_DATA.surgeFactors[finalSurgeLevel];
        
        return {
            ...service,
            surgeLevel: finalSurgeLevel,
            surgeMultiplier: surgeMultiplier,
            surgePrice: (service.basePrice * surgeMultiplier).toFixed(2)
        };
    });
}

function updateServicesDisplay() {
    if (!elements.servicesGrid) return;

    elements.servicesGrid.innerHTML = '';
    
    appState.currentSurgeData.forEach(service => {
        const serviceCard = createServiceCard(service);
        elements.servicesGrid.appendChild(serviceCard);
    });
    
    elements.lastUpdated.textContent = new Date().toLocaleTimeString();
}

function createServiceCard(service) {
    const card = document.createElement('div');
    card.className = 'service-card';
    
    card.innerHTML = `
        <div class="service-header">
            <div class="service-info">
                <h3>${service.name}</h3>
                <p>${service.description}</p>
            </div>
            <div class="service-icon">${service.icon}</div>
        </div>
        <div class="surge-multiplier surge-${service.surgeLevel}">
            ${service.surgeMultiplier}x
        </div>
        <div class="price-details">
            <span class="base-price">$${service.basePrice.toFixed(2)}</span>
            <span class="surge-price">$${service.surgePrice}</span>
        </div>
    `;
    
    return card;
}

function updateMapDisplay() {
    if (!elements.surgeZones) return;
    
    // Clear existing zones
    elements.surgeZones.innerHTML = '';
    
    // Create surge zones based on current data
    const surgeTypes = [...new Set(appState.currentSurgeData.map(s => s.surgeLevel))];
    
    surgeTypes.forEach((surgeLevel, index) => {
        const zone = document.createElement('div');
        zone.className = 'surge-zone';
        
        const colors = {
            normal: '#00C851',
            light: '#ffc107',
            moderate: '#ff9800',
            high: '#f44336',
            extreme: '#9c27b0'
        };
        
        const size = 60 + (index * 20);
        const top = 20 + (index * 15);
        const left = 20 + (index * 15);
        
        zone.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            border-color: ${colors[surgeLevel]};
            top: ${top}%;
            left: ${left}%;
        `;
        
        elements.surgeZones.appendChild(zone);
    });
}

function updateSurgeHistory() {
    const now = new Date();
    const historyEntry = {
        timestamp: now.toLocaleTimeString(),
        services: appState.currentSurgeData.map(s => ({
            name: s.name,
            multiplier: s.surgeMultiplier
        }))
    };
    
    appState.surgeHistory.unshift(historyEntry);
    
    // Keep only last 5 entries
    if (appState.surgeHistory.length > 5) {
        appState.surgeHistory = appState.surgeHistory.slice(0, 5);
    }
    
    // Update display
    if (elements.surgeHistory) {
        elements.surgeHistory.innerHTML = '';
        
        if (appState.surgeHistory.length === 0) {
            elements.surgeHistory.innerHTML = '<p style="text-align: center; color: #888;">No history available yet</p>';
            return;
        }
        
        appState.surgeHistory.forEach(entry => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const servicesHTML = entry.services.map(service => 
                `<span class="history-service">${service.name}: ${service.multiplier}x</span>`
            ).join('');
            
            historyItem.innerHTML = `
                <div class="history-time">${entry.timestamp}</div>
                <div class="history-services">${servicesHTML}</div>
            `;
            
            elements.surgeHistory.appendChild(historyItem);
        });
    }
}

function handleManualRefresh() {
    if (elements.refreshBtn.classList.contains('loading')) {
        return; // Prevent double clicks
    }
    
    showLoading();
    elements.refreshBtn.classList.add('loading');
    
    // Simulate realistic API call delay
    setTimeout(() => {
        generateSurgeData();
        updateServicesDisplay();
        updateSurgeHistory();
        updateMapDisplay();
        hideLoading();
        elements.refreshBtn.classList.remove('loading');
    }, 1500);
}

function startAutoRefresh() {
    // Clear existing interval
    if (appState.autoRefreshInterval) {
        clearInterval(appState.autoRefreshInterval);
    }
    
    // Set up new interval (30 seconds)
    appState.autoRefreshInterval = setInterval(() => {
        generateSurgeData();
        updateServicesDisplay();
        updateSurgeHistory();
        updateMapDisplay();
    }, 30000);
}

function showLoading() {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.classList.add('active');
    }
}

function hideLoading() {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.classList.remove('active');
    }
}

function showErrorModal() {
    if (elements.errorModal) {
        elements.errorModal.classList.add('active');
    }
}

function closeErrorModal() {
    if (elements.errorModal) {
        elements.errorModal.classList.remove('active');
    }
}

function showError(message) {
    console.error('App Error:', message);
    elements.locationText.textContent = message;
    elements.statusIndicator.textContent = '❌';
}

// Utility functions
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour12: true,
        hour: 'numeric',
        minute: '2-digit'
    });
}

function isCurrentlyPeakHour() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    const isWeekend = currentDay === 0 || currentDay === 6;
    
    // Morning rush: 7-9 AM
    if (currentHour >= 7 && currentHour <= 9) return true;
    
    // Evening rush: 5-7 PM
    if (currentHour >= 17 && currentHour <= 19) return true;
    
    // Weekend nightlife: 11 PM - 2 AM
    if (isWeekend && (currentHour >= 23 || currentHour <= 2)) return true;
    
    return false;
}

// Global function for error modal
window.closeErrorModal = closeErrorModal;

// Handle page visibility change to pause/resume auto-refresh
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        if (appState.autoRefreshInterval) {
            clearInterval(appState.autoRefreshInterval);
        }
    } else {
        startAutoRefresh();
    }
});

// Handle page unload
window.addEventListener('beforeunload', function() {
    if (appState.autoRefreshInterval) {
        clearInterval(appState.autoRefreshInterval);
    }
});