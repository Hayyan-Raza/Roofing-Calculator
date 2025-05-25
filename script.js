// Initialize map with Google Satellite tiles
const map = L.map('map').setView([48.8584, 2.2945], 13);

L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
  maxZoom: 20,
  subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
  attribution: 'Map data © Google'
}).addTo(map);

// Draggable marker with custom icon
let marker = L.marker([48.8584, 2.2945], {
  draggable: true,
  icon: L.icon({
    iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  })
}).addTo(map);

// DOM Elements
const searchInput = document.getElementById("search");
const resultBox = document.getElementById("autocomplete-list");
const overlayStep1 = document.getElementById("overlayStep1");
const overlayStep2 = document.getElementById("overlayStep2");
const overlayStep3 = document.getElementById("overlayStep3"); // Ownership
const overlayStep4 = document.getElementById("overlayStep4"); // Roof Type
const overlayStep5 = document.getElementById("overlayStep5"); // Roofing Material
const overlayStep6 = document.getElementById("overlayStep6"); // Step 6 overlay
const selectedAddressText = document.getElementById("selected-address-text");
const nextBtnStep1 = document.getElementById("nextBtnStep1");

overlayStep5.style.display = "none";

// Step 6 specific elements
const staticLeafletMapDiv = document.getElementById("staticLeafletMap");
const roofAreaDisplay = document.getElementById("roofAreaDisplay");
const backBtnStep6 = document.getElementById("backBtnStep6");
const calculateCostBtn = document.getElementById("calculateCostBtn");

let timeout = null;
let selectedLocation = null;
let staticLeafletMap = null;
let staticMarker = null;

window.addEventListener('load', () => {
  overlayStep1.classList.remove('overlay-hidden');
  overlayStep2.classList.add('overlay-hidden');
  overlayStep3.classList.add('overlay-hidden');
  overlayStep4.classList.add('overlay-hidden');
  overlayStep5.classList.add('overlay-hidden');
  overlayStep6.classList.add('overlay-hidden');

  console.log('Step 6 overlay classes:', overlayStep6.className);
});

function clearResults() {
  resultBox.innerHTML = "";
}

function selectSuggestion(text, lat, lon) {
  selectedLocation = { text, lat, lon };
  searchInput.value = text;
  nextBtnStep1.disabled = false;
  clearResults();
  map.setView([lat, lon], 19);
  marker.setLatLng([lat, lon]);
}

// Autocomplete search with OpenStreetMap Nominatim
searchInput.addEventListener('input', () => {
  clearTimeout(timeout);
  const query = searchInput.value.trim();
  nextBtnStep1.disabled = true;

  if (query.length < 3) {
    clearResults();
    return;
  }

  timeout = setTimeout(() => {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`)
      .then(response => response.json())
      .then(data => {
        clearResults();
        data.forEach(item => {
          const div = document.createElement('div');
          div.className = 'autocomplete-item';
          div.textContent = item.display_name;
          div.addEventListener('click', () => {
            selectSuggestion(item.display_name, parseFloat(item.lat), parseFloat(item.lon));
          });
          resultBox.appendChild(div);
        });
      });
  }, 400);
});

// Step 1 -> Step 2
nextBtnStep1.addEventListener('click', () => {
  if (!selectedLocation) {
    alert("Please select an address.");
    return;
  }
  overlayStep1.classList.add("overlay-hidden");
  overlayStep2.classList.remove("overlay-hidden");
  selectedAddressText.textContent = selectedLocation.text;
  map.invalidateSize();
});

// Step 2 back button
document.getElementById("backBtnStep2").addEventListener('click', () => {
  overlayStep2.classList.add("overlay-hidden");
  overlayStep1.classList.remove("overlay-hidden");
});

// Step 2 next button
document.getElementById("nextBtnStep2").addEventListener('click', () => {
  const pos = marker.getLatLng();
  selectedLocation.lat = pos.lat;
  selectedLocation.lon = pos.lng;

  overlayStep2.classList.add("overlay-hidden");
  overlayStep3.classList.remove("overlay-hidden");  // Ownership
});

// Step 3 back button (Ownership)
document.getElementById("backBtnStep3").addEventListener('click', () => {
  overlayStep3.classList.add("overlay-hidden");
  overlayStep2.classList.remove("overlay-hidden");
});

// Step 3 next button (Ownership)
document.getElementById("nextBtnStep3").addEventListener("click", () => {
  const selectedOwnership = document.querySelector('input[name="ownership"]:checked');
  if (!selectedOwnership) {
    alert("Please select ownership status.");
    return;
  }
  overlayStep3.classList.add("overlay-hidden");
  overlayStep4.classList.remove("overlay-hidden"); // Roof Type
});

// Step 4 back button (Roof Type)
document.getElementById("backBtnStep4").addEventListener("click", () => {
  overlayStep4.classList.add("overlay-hidden");
  overlayStep3.classList.remove("overlay-hidden");
});

// Step 4 next button (Roof Type) -> go to Step 5 (Roofing Material)
document.getElementById("nextBtnStep4").addEventListener("click", () => {
  const selectedRoof = document.querySelector('input[name="roofType"]:checked');
  if (!selectedRoof) {
    alert("Please select a roof type.");
    return;
  }

  overlayStep4.classList.add("overlay-hidden");
  overlayStep5.classList.remove("overlay-hidden");
  overlayStep5.style.display = "flex";
});

// Step 5 back button (Roofing Material)
document.getElementById("backBtnStep5").addEventListener("click", () => {
  overlayStep5.classList.add("overlay-hidden");
  overlayStep4.classList.remove("overlay-hidden");
});

// Step 5 next button -> Show Step 6
document.getElementById("nextBtnStep5").addEventListener("click", () => {
  const selectedMaterial = document.querySelector('input[name="roofMaterial"]:checked');
  if (!selectedMaterial) {
    alert("Please select roofing material.");
    return;
  }
  overlayStep5.classList.add("overlay-hidden");
  overlayStep6.classList.remove("overlay-hidden");

  // Initialize or update static map for Step 6
  initStaticMap(selectedLocation.lat, selectedLocation.lon);
});

// Step 6 back button
backBtnStep6.addEventListener('click', () => {
  overlayStep6.classList.add("overlay-hidden");
  overlayStep5.classList.remove("overlay-hidden");
  roofAreaDisplay.textContent = "";
});


// Initialize static Leaflet map in Step 6 overlay
function initStaticMap(lat, lon) {
  // Clear old map if any
  if (staticLeafletMap) {
    staticLeafletMap.remove();
  }
  staticLeafletMap = L.map('staticLeafletMap', {
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    tap: false,
    touchZoom: false
  }).setView([lat, lon], 19);

  L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: 'Map data © Google'
  }).addTo(staticLeafletMap);

  staticMarker = L.marker([lat, lon], {
    icon: L.icon({
      iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    })
  }).addTo(staticLeafletMap);
}

// 📌 Include these scripts in your HTML <head> or before </body>:
// <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
// <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
// <script src="https://unpkg.com/@turf/turf@6.5.0/turf.min.js"></script>

// 📌 HTML must contain:
// <div id="staticLeafletMap" style="height: 400px;"></div>
// <div id="roofAreaDisplay"></div>
// <div>
//   <label><input type="radio" name="roofMaterial" value="asphalt"> Asphalt</label>
//   <label><input type="radio" name="roofMaterial" value="metal"> Metal</label>
//   <label><input type="radio" name="roofMaterial" value="tile"> Tile</label>
// </div>
// <button id="calculateCostBtn">Calculate Cost</button>

function fetchBuildingFootprint(lat, lon) {
  const overpassUrl = 'https://overpass-api.de/api/interpreter';
  const query = `
    [out:json];
    (
      way["building"](around:50,${lat},${lon});
    );
    out geom;
  `;

  return fetch(overpassUrl, {
    method: 'POST',
    body: query
  })
    .then(response => response.json())
    .then(data => {
      if (!data.elements || data.elements.length === 0) {
        throw new Error('No buildings found.');
      }

      const point = turf.point([lon, lat]);

      // Try to find the building that contains the point
      for (const element of data.elements) {
        const polygon = convertToGeoJSONPolygon(element);
        if (polygon && turf.booleanPointInPolygon(point, polygon)) {
          return element; // Found the correct building
        }
      }

      // If none contain the point, fallback to the closest one (optional)
      return data.elements[0];
    });
}

function convertToGeoJSONPolygon(element) {
  if (!element || !element.geometry || element.geometry.length === 0) {
    return null;
  }

  const coordinates = element.geometry.map(coord => [coord.lon, coord.lat]);

  // Ensure polygon is closed
  if (coordinates.length > 0 && 
      (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
       coordinates[0][1] !== coordinates[coordinates.length - 1][1])) {
    coordinates.push(coordinates[0]);
  }

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coordinates]
    }
  };
}


function initStaticMap(lat, lon) {
  if (staticLeafletMap) {
    staticLeafletMap.remove();
  }

  staticLeafletMap = L.map('staticLeafletMap', {
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    tap: false,
    touchZoom: false
  }).setView([lat, lon], 19);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: 'Map data © OpenStreetMap contributors'
  }).addTo(staticLeafletMap);

  staticMarker = L.marker([lat, lon], {
    icon: L.icon({
      iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    })
  }).addTo(staticLeafletMap);

  fetchBuildingFootprint(lat, lon)
    .then(building => {
      const geojsonPolygon = convertToGeoJSONPolygon(building);
      const areaSqMeters = turf.area(geojsonPolygon);
      const areaSqFeet = areaSqMeters * 10.7639;

      staticLeafletMap._roofAreaSqFeet = areaSqFeet;

      const latlngs = building.geometry.map(coord => [coord.lat, coord.lon]);
      L.polygon(latlngs, { color: 'blue' }).addTo(staticLeafletMap);

      roofAreaDisplay.textContent = `Estimated Roof Area: ${areaSqFeet.toFixed(2)} sq ft`;
    })
    .catch(error => {
      console.error(error);
      roofAreaDisplay.textContent = 'Unable to detect building footprint. Please try a different location.';
    });
}

calculateCostBtn.addEventListener('click', () => {
  const areaSqFeet = staticLeafletMap._roofAreaSqFeet;
  if (!areaSqFeet) {
    alert('Roof area not available. Try another location.');
    return;
  }

  const selectedMaterial = document.querySelector('input[name="roofMaterial"]:checked');
  if (!selectedMaterial) {
    alert("Please select roofing material.");
    return;
  }

  let costPerSqFt;
  switch (selectedMaterial.value) {
    case 'asphalt': costPerSqFt = 3.5; break;
    case 'metal': costPerSqFt = 7.0; break;
    case 'tile': costPerSqFt = 10.0; break;
    default: costPerSqFt = 5.0; break;
  }

  const totalCost = costPerSqFt * areaSqFeet;
  alert(`Estimated Roofing Cost: $${totalCost.toFixed(2)}`);
});

// 📌 Example call (you can call this with user-selected coordinates):
// initStaticMap(33.7084, -117.8214);

// Step 6 - Calculate Cost button
calculateCostBtn.addEventListener('click', () => {
  if (!selectedLocation) {
    alert("Location not selected.");
    return;
  }

  fetchBuildingFootprint(selectedLocation.lat, selectedLocation.lon)
    .then(element => {
      const polygon = convertToGeoJSONPolygon(element);
      if (polygon) {
        const areaSqMeters = turf.area(polygon);
        const areaSqFeet = areaSqMeters * 10.7639;
        roofAreaDisplay.textContent = `Estimated Roof Area: ${areaSqFeet.toFixed(2)} ft²`;
      } else {
        roofAreaDisplay.textContent = "Could not determine roof area.";
      }
    })
    .catch(err => {
      console.error(err);
      roofAreaDisplay.textContent = "Error calculating area.";
    });
});
