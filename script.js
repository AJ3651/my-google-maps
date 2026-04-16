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
// MAP SETUP
// -----------------------------
let map = L.map('map').setView([0, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let markers = [];
let db;

// -----------------------------
// INDEXED DB
// -----------------------------
let request = indexedDB.open("MapDB", 1);

request.onupgradeneeded = function (e) {
  db = e.target.result;
  db.createObjectStore("places", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = function (e) {
  db = e.target.result;
  loadPlaces();
};

// -----------------------------
// LOAD DATA
// -----------------------------
function loadPlaces() {
  let tx = db.transaction("places", "readonly");
  let store = tx.objectStore("places");

  let request = store.getAll();

  request.onsuccess = function () {
    let places = request.result;

    places.forEach(addMarker);

    if (places.length > 0) {
      let group = new L.featureGroup(markers);
      map.fitBounds(group.getBounds());
    }
  };
}

// -----------------------------
// ADD PHOTO
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
    let scale = Math.min(1, maxWidth / img.width);

    canvas.width = img.width * scale;
    canvas.height = img.height * scale;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(function (blob) {
      savePlace(blob);
    }, "image/jpeg", 0.6);
  };
});

// -----------------------------
// SAVE PLACE
// -----------------------------
function savePlace(imageBlob) {

  navigator.geolocation.getCurrentPosition(position => {

    let newPlace = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      image: imageBlob,
      timestamp: new Date().toLocaleString()
    };

    let tx = db.transaction("places", "readwrite");
    let store = tx.objectStore("places");

    store.add(newPlace);

    tx.oncomplete = () => {
      addMarker(newPlace);
      map.setView([newPlace.lat, newPlace.lon], 13);
    };
  });
}

// -----------------------------
// ADD MARKER
// -----------------------------
function addMarker(place) {

  let marker = L.marker([place.lat, place.lon]).addTo(map);

  let url = URL.createObjectURL(place.image);

  marker.bindPopup(`
    <img src="${url}" width="200"><br>
    <strong>${place.timestamp}</strong>
  `);

  markers.push(marker);
}

// -----------------------------
// CLEAR DATA
// -----------------------------
document.getElementById("clearBtn")
.addEventListener("click", function () {

  if (confirm("Delete all saved locations?")) {

    let tx = db.transaction("places", "readwrite");
    tx.objectStore("places").clear();

    location.reload();
  }
});

// -----------------------------
// EXPORT DATA
// -----------------------------
document.getElementById("exportBtn")
.addEventListener("click", function () {

  let tx = db.transaction("places", "readonly");
  let store = tx.objectStore("places");

  let request = store.getAll();

  request.onsuccess = async function () {
    let places = request.result;

    // convert blobs → base64 for sharing
    let converted = await Promise.all(
      places.map(async (p) => {
        return {
          ...p,
          image: await blobToBase64(p.image)
        };
      })
    );

    let blob = new Blob([JSON.stringify(converted)], {
      type: "application/json"
    });

    let url = URL.createObjectURL(blob);

    let a = document.createElement("a");
    a.href = url;
    a.download = "map-data.json";
    a.click();
  };
});

// helper
function blobToBase64(blob) {
  return new Promise(resolve => {
    let reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

// -----------------------------
// IMPORT DATA
// -----------------------------
document.getElementById("importInput")
.addEventListener("change", function (event) {

  let file = event.target.files[0];
  if (!file) return;

  let reader = new FileReader();

  reader.onload = async function (e) {
    let data = JSON.parse(e.target.result);

    for (let place of data) {
      let blob = await fetch(place.image).then(r => r.blob());

      let tx = db.transaction("places", "readwrite");
      tx.objectStore("places").add({
        lat: place.lat,
        lon: place.lon,
        image: blob,
        timestamp: place.timestamp
      });
    }

    location.reload();
  };

  reader.readAsText(file);
});

// -----------------------------
// SERVICE WORKER REGISTER
// -----------------------------
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}