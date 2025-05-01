// Initialize the map
let zoomLevel = window.innerWidth <= 768 ? 5 : 6; // 5 for mobile, 6 for desktop
var mymap = L.map('mapid').setView([12, 121.5], zoomLevel);


// Add base map layer
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 20
  
}).addTo(mymap);

mymap.zoomControl.remove();

let geojsonData;
let currentLayer;

// Load GeoJSON data
fetch('Data/Simplified_ADM/adm1.geojson')
  .then(response => response.json())
  .then(data => {
    geojsonData = data;
    renderDefaultMap();
  })
  .catch(error => console.error('Error loading GeoJSON:', error));

// Render default map with no fill
function renderDefaultMap() {
  if (currentLayer) mymap.removeLayer(currentLayer);

  currentLayer = L.geoJSON(geojsonData, {
    style: {
      color: '#cccccc',
      weight: 0.5,
      fillOpacity: 0
    },
    onEachFeature: (feature, layer) => {
      const name = feature.properties.ADM1_EN || 'Unnamed';
      layer.bindPopup(`<strong>${name}</strong>`);
    }
  }).addTo(mymap);

  document.getElementById('detailsContent').innerHTML = '<p>Select a category to display data.</p>';
}

// Utility function to get color based on value
let colorScheme = 'marriages'; // default

function getColor(value, min, max) {
  const ratio = (value - min) / (max - min);

  if (colorScheme === 'birth') {
    const ratio = (value - min) / (max - min);
    const red = Math.floor(200 * (1 - ratio) + 55);   // 255 → 55
    const green = Math.floor(200 * (1 - ratio) + 55); // 255 → 55
    const blue = Math.floor(255 - 30 * ratio);        // 255 → 225 (lighter)
    return `rgb(${red}, ${green}, ${blue})`;
  }

  if (colorScheme === 'death') {
    const red = Math.floor(255 * (1 - ratio) + 128 * ratio);
    const green = Math.floor(255 * (1 - ratio));
    const blue = Math.floor(255 * (1 - ratio) + 128 * ratio);
    return `rgb(${red}, ${green}, ${blue})`;
  }

  // Default to marriages
  const red = 255;
  const green = Math.floor(255 * (1 - ratio));
  const blue = Math.floor(255 * (1 - ratio));
  return `rgb(${red}, ${green}, ${blue})`;
}


// Render legend dynamically
  function renderLegend(min, max, label, unit) {
  const steps = 10;
  const stepSize = (max - min) / steps;
  let legendHTML = `<strong>Legend: ${label}</strong><ul style="list-style:none; padding:0;">`;

  for (let i = 0; i < steps; i++) {
    const from = min + stepSize * i;
    const to = from + stepSize;
    const color = getColor(from, min, max);
    legendHTML += `<li><span style="display:inline-block;width:20px;height:10px;background:${color};margin-right:10px;"></span>${from.toFixed(0)} - ${to.toFixed(0)} ${unit}</li>`;
  }

  legendHTML += `</ul>`;

  const html = `
    <div id="dataTable"></div>
    <canvas id="dataChart" width="250" height="200" style="margin-top:20px;"></canvas>
    <div id="dataLegend" style="margin-top:20px;">${legendHTML}</div>
  `;

  document.getElementById('detailsContent').innerHTML = html;
}

// Render chart dynamically
function renderChart(dataArray, label, unit) {
  const sorted = dataArray.sort((a, b) => b.value - a.value).slice(0, 5);
  const ctx = document.getElementById('dataChart').getContext('2d');

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(f => f.name),
      datasets: [{
        label: `${label} (${unit})`,
        data: sorted.map(f => f.value),
        backgroundColor: 'rgba(82, 197, 72, 0.7)'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// Render table dynamically
function renderTable(dataArray, label, unit) {
  const sorted = dataArray.sort((a, b) => b.value - a.value);

  // Calculate total
  const total = sorted.reduce((sum, row) => sum + row.value, 0);

  let html = `<h4 style="margin-bottom:8px;">All Regions by ${label}</h4>`;
  html += `<table style="width:100%; border-collapse:collapse; font-size: 14px;">
            <thead>
              <tr style="background:#ddd;">
                <th style="text-align:left; padding:5px; border:1px solid #ccc;">Region</th>
                <th style="text-align:right; padding:5px; border:1px solid #ccc;">${label} (${unit})</th>
              </tr>
            </thead>
            <tbody>`;

  sorted.forEach(row => {
    html += `<tr>
              <td style="padding:5px; border:1px solid #ccc;">${row.name}</td>
              <td style="text-align:right; padding:5px; border:1px solid #ccc;">${row.value.toLocaleString()}</td>
            </tr>`;
  });

  // Add total row
  html += `<tr style="font-weight:bold; background:#f5f5f5;">
             <td style="padding:5px; border:1px solid #ccc;">Total</td>
             <td style="text-align:right; padding:5px; border:1px solid #ccc;">${total.toLocaleString()}</td>
           </tr>`;

  html += `</tbody></table>`;
  document.getElementById('dataTable').innerHTML = html;
}

// General function to render map based on selected property
function renderMap(property, label, unit) {
  if (!geojsonData) return;

  const values = geojsonData.features.map(f => parseFloat(f.properties[property] || 0));
  const max = Math.max(...values);
  const min = Math.min(...values);

  if (currentLayer) mymap.removeLayer(currentLayer);

  currentLayer = L.geoJSON(geojsonData, {
    style: feature => {
      const value = parseFloat(feature.properties[property] || 0);
      return {
        color: '#333',
        weight: 0.5,
        fillOpacity: 1,
        fillColor: getColor(value, min, max)
      };
    },
    onEachFeature: (feature, layer) => {
      const name = feature.properties.ADM1_EN || 'Unnamed';
      const value = feature.properties[property] || 'No data';
      layer.bindPopup(`<strong>${name}</strong><br>${label}: ${value} ${unit}`);
    }
  }).addTo(mymap);

  const dataArray = geojsonData.features.map(f => ({
    name: f.properties.ADM1_EN,
    value: parseFloat(f.properties[property] || 0)
  }));

  renderLegend(min, max, label, unit);
  renderChart(dataArray, label, unit);
  renderTable(dataArray, label, unit);
}

// Event listeners for buttons

document.getElementById('Population_Button').addEventListener('click', () => {
  colorScheme = 'marriages';
  renderMap('POPULATION', 'Population', '');
});

document.getElementById('BIRTH_B_Button').addEventListener('click', () => {
  colorScheme = 'birth';
  renderMap('BIRTH_B', 'Total births', '');
});

document.getElementById('DEATH_B_Button').addEventListener('click', () => {
  colorScheme = 'death';
  renderMap('DEATH_B', 'Total deaths', '');
});

document.getElementById('MarriagesButton').addEventListener('click', () => {
  colorScheme = 'marriages';
  renderMap('MARRIAGES', 'Marriages', '');
});

function toggleDisclaimer(event) {
  event.preventDefault(); 
  const disclaimer = document.getElementById('disclaimer-container');
  if (disclaimer.style.display === 'none' || disclaimer.style.display === '') {
      disclaimer.style.display = 'block';
  } else {
      disclaimer.style.display = 'none';
  }
}

