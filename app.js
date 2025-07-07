// Application state
let map;
let markersLayer;
let businessData = [];
let filteredData = [];
let activeFilters = new Set();
let currentView = 'map';

// Category color mapping
const categoryColors = {
  'Fruit & Vegetable Processing': '#dc2626',
  'Commercial Bakeries': '#2563eb',
  'Retail Bakeries': '#16a34a',
  'Breweries': '#ea580c',
  'Fruit & Vegetable Wholesalers': '#9333ea'
};

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await loadData();
        initializeMap();
        initializeFilters();
        initializeLegend();
        initializeEventListeners();
        initializeTable();
        updateStatistics();
    } catch (error) {
        console.error('Error initializing application:', error);
    }
});

// Load business data
async function loadData() {
    try {
        // First try to load from CSV asset
        const response = await fetch('https://ppl-ai-code-interpreter-files.s3.amazonaws.com/web/direct-files/3116932148c4533080f2f9f8db64a742/7fb9c42b-4234-4061-af17-4fd9eacceffc/8c487160.csv');
        
        if (response.ok) {
            const csvText = await response.text();
            businessData = parseCSV(csvText);
        } else {
            // Fallback to the provided JSON data
            businessData = [
                {
                    "business_id": 1,
                    "name": "Premier Fruit Co.",
                    "naics_code": "311420",
                    "category": "Fruit & Vegetable Processing",
                    "address": "5192 Boulevard René-Lévesque",
                    "borough": "Ville-Marie",
                    "latitude": 45.518617,
                    "longitude": -73.495136,
                    "employees": 40,
                    "waste_level": "High",
                    "annual_waste_tonnes": 152,
                    "seasonal_q1_percent": 15,
                    "seasonal_q2_percent": 25,
                    "seasonal_q3_percent": 45,
                    "seasonal_q4_percent": 15,
                    "peak_season": "Q3"
                },
                {
                    "business_id": 2,
                    "name": "Green Valley Processing",
                    "naics_code": "311420",
                    "category": "Fruit & Vegetable Processing",
                    "address": "5579 Boulevard Saint-Laurent",
                    "borough": "Verdun",
                    "latitude": 45.539291,
                    "longitude": -73.929013,
                    "employees": 107,
                    "waste_level": "High",
                    "annual_waste_tonnes": 422,
                    "seasonal_q1_percent": 15,
                    "seasonal_q2_percent": 25,
                    "seasonal_q3_percent": 45,
                    "seasonal_q4_percent": 15,
                    "peak_season": "Q3"
                },
                {
                    "business_id": 3,
                    "name": "Harvest Processing Ltd.",
                    "naics_code": "311420",
                    "category": "Fruit & Vegetable Processing",
                    "address": "1686 Avenue du Mont-Royal",
                    "borough": "Baie-D'Urfé",
                    "latitude": 45.584323,
                    "longitude": -73.618883,
                    "employees": 72,
                    "waste_level": "High",
                    "annual_waste_tonnes": 307,
                    "seasonal_q1_percent": 15,
                    "seasonal_q2_percent": 25,
                    "seasonal_q3_percent": 45,
                    "seasonal_q4_percent": 15,
                    "peak_season": "Q3"
                },
                {
                    "business_id": 4,
                    "name": "Montreal Vegetable Co.",
                    "naics_code": "311420",
                    "category": "Fruit & Vegetable Processing",
                    "address": "2434 Rue Wellington",
                    "borough": "Rosemont–La Petite-Patrie",
                    "latitude": 45.619380,
                    "longitude": -73.501338,
                    "employees": 40,
                    "waste_level": "High",
                    "annual_waste_tonnes": 210,
                    "seasonal_q1_percent": 15,
                    "seasonal_q2_percent": 25,
                    "seasonal_q3_percent": 45,
                    "seasonal_q4_percent": 15,
                    "peak_season": "Q3"
                },
                {
                    "business_id": 5,
                    "name": "Montreal Food Processing",
                    "naics_code": "311420",
                    "category": "Fruit & Vegetable Processing",
                    "address": "8667 Rue Notre-Dame",
                    "borough": "Le Plateau-Mont-Royal",
                    "latitude": 45.498230,
                    "longitude": -73.712374,
                    "employees": 78,
                    "waste_level": "High",
                    "annual_waste_tonnes": 219,
                    "seasonal_q1_percent": 15,
                    "seasonal_q2_percent": 25,
                    "seasonal_q3_percent": 45,
                    "seasonal_q4_percent": 15,
                    "peak_season": "Q3"
                }
            ];
        }
        
        filteredData = [...businessData];
        
        // Initialize all categories as active
        const categories = [...new Set(businessData.map(b => b.category))];
        activeFilters = new Set(categories);
        
    } catch (error) {
        console.error('Error loading data:', error);
        businessData = [];
        filteredData = [];
    }
}

// Parse CSV data
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        
        headers.forEach((header, index) => {
            const value = values[index] || '';
            // Convert numeric fields
            if (['business_id', 'employees', 'annual_waste_tonnes', 'latitude', 'longitude', 'seasonal_q1_percent', 'seasonal_q2_percent', 'seasonal_q3_percent', 'seasonal_q4_percent'].includes(header)) {
                row[header] = parseFloat(value) || 0;
            } else {
                row[header] = value.replace(/^"/, '').replace(/"$/, ''); // Remove quotes
            }
        });
        
        data.push(row);
    }
    
    return data;
}

// Initialize the map
function initializeMap() {
    map = L.map('map').setView([45.5017, -73.5673], 11);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Initialize marker cluster group
    markersLayer = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50
    });
    
    updateMapMarkers();
}

// Update map markers based on filtered data
function updateMapMarkers() {
    markersLayer.clearLayers();
    
    filteredData.forEach(business => {
        const marker = createMarker(business);
        if (marker) {
            markersLayer.addLayer(marker);
        }
    });
    
    map.addLayer(markersLayer);
}

// Create marker for a business
function createMarker(business) {
    if (!business.latitude || !business.longitude) return null;
    
    const color = categoryColors[business.category] || '#666666';
    const size = business.waste_level === 'High' ? 12 : 8;
    
    const marker = L.circleMarker([business.latitude, business.longitude], {
        radius: size,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    });
    
    const popupContent = `
        <div class="popup-content">
            <h4>${business.name}</h4>
            <p><strong>Category:</strong> ${business.category}</p>
            <p><strong>Address:</strong> ${business.address}</p>
            <p><strong>Borough:</strong> ${business.borough}</p>
            <p><strong>Employees:</strong> ${business.employees}</p>
            <p><strong>Waste Level:</strong> <span class="status status-${business.waste_level.toLowerCase()}">${business.waste_level}</span></p>
            <p><strong>Annual Waste:</strong> ${business.annual_waste_tonnes} tonnes</p>
            <p><strong>Peak Season:</strong> ${business.peak_season}</p>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    
    return marker;
}

// Initialize category filters
function initializeFilters() {
    const filterContainer = document.getElementById('categoryFilters');
    const categories = [...new Set(businessData.map(b => b.category))];
    
    categories.forEach(category => {
        const filterItem = document.createElement('div');
        filterItem.className = 'filter-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `filter-${category.replace(/\s+/g, '-').toLowerCase()}`;
        checkbox.checked = true;
        checkbox.addEventListener('change', () => toggleCategoryFilter(category));
        
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = category;
        
        const colorDot = document.createElement('div');
        colorDot.className = 'legend-marker';
        colorDot.style.backgroundColor = categoryColors[category];
        
        label.insertBefore(colorDot, label.firstChild);
        
        filterItem.appendChild(checkbox);
        filterItem.appendChild(label);
        filterContainer.appendChild(filterItem);
    });
}

// Toggle category filter
function toggleCategoryFilter(category) {
    if (activeFilters.has(category)) {
        activeFilters.delete(category);
    } else {
        activeFilters.add(category);
    }
    
    applyFilters();
}

// Apply filters
function applyFilters() {
    filteredData = businessData.filter(business => 
        activeFilters.has(business.category)
    );
    
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filteredData = filteredData.filter(business =>
            business.name.toLowerCase().includes(searchTerm) ||
            business.address.toLowerCase().includes(searchTerm) ||
            business.borough.toLowerCase().includes(searchTerm)
        );
    }
    
    updateMapMarkers();
    updateStatistics();
    if (currentView === 'table') {
        updateTable();
    }
}

// Initialize legend
function initializeLegend() {
    const legendContainer = document.getElementById('mapLegend');
    
    Object.entries(categoryColors).forEach(([category, color]) => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        
        const marker = document.createElement('div');
        marker.className = 'legend-marker';
        marker.style.backgroundColor = color;
        
        const label = document.createElement('span');
        label.className = 'legend-label';
        label.textContent = category;
        
        legendItem.appendChild(marker);
        legendItem.appendChild(label);
        legendContainer.appendChild(legendItem);
    });
}

// Initialize event listeners
function initializeEventListeners() {
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    
    // View toggle
    document.getElementById('mapViewBtn').addEventListener('click', () => switchView('map'));
    document.getElementById('tableViewBtn').addEventListener('click', () => switchView('table'));
    
    // Export functionality
    document.getElementById('exportBtn').addEventListener('click', exportData);
}

// Switch between map and table views
function switchView(view) {
    currentView = view;
    
    const mapContainer = document.getElementById('mapContainer');
    const tableContainer = document.getElementById('tableContainer');
    const mapBtn = document.getElementById('mapViewBtn');
    const tableBtn = document.getElementById('tableViewBtn');
    
    if (view === 'map') {
        mapContainer.classList.remove('hidden');
        tableContainer.classList.add('hidden');
        mapBtn.className = 'btn btn--primary';
        tableBtn.className = 'btn btn--secondary';
        
        // Refresh map
        setTimeout(() => {
            if (map) {
                map.invalidateSize();
            }
        }, 100);
    } else {
        mapContainer.classList.add('hidden');
        tableContainer.classList.remove('hidden');
        mapBtn.className = 'btn btn--secondary';
        tableBtn.className = 'btn btn--primary';
        
        updateTable();
    }
}

// Initialize table
function initializeTable() {
    const tableHead = document.querySelector('#businessTable thead tr');
    const sortButtons = tableHead.querySelectorAll('th[data-sort]');
    
    sortButtons.forEach(button => {
        button.addEventListener('click', () => {
            const sortKey = button.getAttribute('data-sort');
            sortTable(sortKey);
        });
    });
}

// Update table with filtered data
function updateTable() {
    const tableBody = document.getElementById('businessTableBody');
    tableBody.innerHTML = '';
    
    filteredData.forEach(business => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${business.name}</td>
            <td>${business.category}</td>
            <td>${business.borough}</td>
            <td>${business.employees}</td>
            <td><span class="status status-${business.waste_level.toLowerCase()}">${business.waste_level}</span></td>
            <td>${business.annual_waste_tonnes}</td>
            <td>${business.peak_season}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Sort table
function sortTable(sortKey) {
    filteredData.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return bVal - aVal;
        }
        
        return String(aVal).localeCompare(String(bVal));
    });
    
    updateTable();
}

// Update statistics
function updateStatistics() {
    const totalBusinesses = businessData.length;
    const visibleBusinesses = filteredData.length;
    const totalWaste = filteredData.reduce((sum, business) => sum + (business.annual_waste_tonnes || 0), 0);
    
    document.getElementById('totalBusinesses').textContent = totalBusinesses;
    document.getElementById('visibleBusinesses').textContent = visibleBusinesses;
    document.getElementById('totalWaste').textContent = totalWaste.toLocaleString();
}

// Export data
function exportData() {
    const csv = convertToCSV(filteredData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'montreal-agrifood-businesses.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// Convert data to CSV
function convertToCSV(data) {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const value = row[header] || '';
                return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            }).join(',')
        )
    ].join('\n');
    
    return csvContent;
}