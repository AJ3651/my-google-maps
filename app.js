// Create map
let map = L.map('map').setView([0, 0], 2);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Load saved places from localStorage
let places = JSON.parse(localStorage.getItem("places")) || [];

// Keep track of markers
let markers = [];

// Load existing markers
places.forEach(place => {
  addMarker(place);
});

// When user selects a photo
document.getElementById("photoInput")
  .addEventListener("change", function (event) {

  let file = event.target.files[0];
  if (!file) return;

  let reader = new FileReader();

  reader.onload = function (e) {
    let imageData = e.target.result;

    // Get GPS location
    navigator.geolocation.getCurrentPosition(
      function (position) {

        let newPlace = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          image: imageData,
          timestamp: new Date().toLocaleString()
        };

        // Save
        places.push(newPlace);
        localStorage.setItem("places", JSON.stringify(places));

        // Add to map
        addMarker(newPlace);

        // Zoom to new marker
        map.setView([newPlace.lat, newPlace.lon], 13);
      },
      function (error) {
        alert("Location access denied.");
      }
    );
  };

  reader.readAsDataURL(file);
});

function addMarker(place) {
  let marker = L.marker([place.lat, place.lon]).addTo(map);

  marker.bindPopup(`
    <img src="${place.image}" width="200"><br>
    <strong>${place.timestamp}</strong>
  `);

  markers.push(marker);
}

// Clear all saved data
document.getElementById("clearBtn")
  .addEventListener("click", function () {

  if (confirm("Delete all saved locations?")) {
    localStorage.removeItem("places");
    location.reload();
  }
});