/*my google maps , 28/02/2026 Jemila Abdulai
Run in any code editor with all accompanying files
Acknowledgements (references, links, inspirations, etc) :
Becky Aston, LocalStorageGarden https://editor.p5js.org/beckyaston/sketches/o5AGUTdHn ,
Open Street Map https://www.openstreetmap.org/#map=6/54.91/-3.43 , 
Leaflet API  https://leafletjs.com/ 
Using JS to create interactive street maps https://jsfiddle.net/ircama/0oend7he/, https://ircama.github.io/osm-carto-tutorials/map-client/ ,
ChatGPT for handling photo input https://chatgpt.com/c/69a32f07-b500-8330-907b-5a1e7ff02cc6 
 */

/* my google maps - IndexedDB version
   Jemila Abdulai
   Upgraded: uses IndexedDB + Blob images (no base64)
*/

// -----------------------------
// 1. Create map (same as before)
// -----------------------------
let map = L.map('map').setView([0, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let markers = [];

// -----------------------------
// 2. Setup IndexedDB
// -----------------------------
let db;

let request = indexedDB.open("MapDB", 1);

request.onupgradeneeded = function (e) {
  db = e.target.result;

  db.createObjectStore("places", {
    keyPath: "id",
    autoIncrement: true
  });
};

request.onsuccess = function (e) {
  db = e.target.result;
  loadPlaces(); // load saved data when DB is ready
};

request.onerror = function () {
  console.error("Database failed to open");
};

// -----------------------------
// 3. Load saved places
// -----------------------------
function loadPlaces() {
  let tx = db.transaction("places", "readonly");
  let store = tx.objectStore("places");

  let request = store.getAll();

  request.onsuccess = function () {
    let places = request.result;

    places.forEach(place => addMarker(place));

    if (places.length > 0) {
      let group = new L.featureGroup(markers);
      map.fitBounds(group.getBounds());
    }
  };
}

// -----------------------------
// 4. Handle photo input
// -----------------------------
document.getElementById("photoInput")
  .addEventListener("change", function (event) {

  let file = event.target.files[0];
  if (!file) return;

  let img = new Image();
  img.src = URL.createObjectURL(file);

  img.onload = function () {

    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");

    let maxWidth = 800;
    let scale = maxWidth / img.width;
    if (scale > 1) scale = 1;

    canvas.width = img.width * scale;
    canvas.height = img.height * scale;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // ✅ Convert to Blob instead of base64
    canvas.toBlob(function (blob) {
      savePlace(blob);
    }, "image/jpeg", 0.6);
  };
});

// -----------------------------
// 5. Save place to IndexedDB
// -----------------------------
function savePlace(imageBlob) {

  navigator.geolocation.getCurrentPosition(
    function (position) {

      let newPlace = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        image: imageBlob,
        timestamp: new Date().toLocaleString()
      };

      let tx = db.transaction("places", "readwrite");
      let store = tx.objectStore("places");

      store.add(newPlace);

      tx.oncomplete = function () {
        addMarker(newPlace);
        map.setView([newPlace.lat, newPlace.lon], 13);
      };
    },
    function () {
      alert("Location access denied.");
    }
  );
}

// -----------------------------
// 6. Add marker to map
// -----------------------------
function addMarker(place) {

  let marker = L.marker([place.lat, place.lon]).addTo(map);

  // ✅ Convert Blob → usable image URL
  let imageUrl = URL.createObjectURL(place.image);

  marker.bindPopup(`
    <img src="${imageUrl}" width="200"><br>
    <strong>${place.timestamp}</strong>
  `);

  markers.push(marker);
}

// -----------------------------
// 7. Clear all data
// -----------------------------
document.getElementById("clearBtn")
  .addEventListener("click", function () {

  if (confirm("Delete all saved locations?")) {

    let tx = db.transaction("places", "readwrite");
    let store = tx.objectStore("places");

    let request = store.clear();

    request.onsuccess = function () {
      location.reload();
    };
  }
});
