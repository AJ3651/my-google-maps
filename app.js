/*
Credits 
Becky Aston, LocalStorageGarden https://editor.p5js.org/beckyaston/sketches/o5AGUTdHn ,
Open Street Map https://www.openstreetmap.org/#map=6/54.91/-3.43 , 
Leaflet API  https://leafletjs.com/ 
Using JS to create interactive street maps https://jsfiddle.net/ircama/0oend7he/, https://ircama.github.io/osm-carto-tutorials/map-client/ ,
ChatGPT for handling photo input https://chatgpt.com/c/69a32f07-b500-8330-907b-5a1e7ff02cc6 
 */

// Creating a Leaflet map to create markers
let map = L.map('map').setView([0, 0], 2);

// Add OpenStreetMap tiles to show the geographical area
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Check for and load any saved places from browser
let places = JSON.parse(localStorage.getItem("places")) || [];

let markers = [];

// Load existing markers onto my map
places.forEach(place => {
  addMarker(place);
});

if (places.length > 0) {
  let group = new L.featureGroup(markers);
  map.fitBounds(group.getBounds());
}

// Handle photo input
document.getElementById("photoInput")
  .addEventListener("change", function (event) {

  let file = event.target.files[0];
  if (!file) return;

  let reader = new FileReader();

  reader.onload = function (e) {

    let img = new Image();
    img.src = e.target.result;

    img.onload = function() {

      // Create canvas for resizing
      let canvas = document.createElement("canvas");
      let ctx = canvas.getContext("2d");

      let maxWidth = 800; 
      let scale = maxWidth / img.width;

      if (scale > 1) scale = 1; 

      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Compress image
      let compressedImage = canvas.toDataURL("image/jpeg", 0.6);

      savePlace(compressedImage);
    };
  };

  // change into base64 string
  reader.readAsDataURL(file);
});


function savePlace(imageData) {

  //  check for current location
  navigator.geolocation.getCurrentPosition(
    function (position) {

      let newPlace = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        image: imageData,
        timestamp: new Date().toLocaleString()
        //might add some extra data later like journal entry to  give more detail
      };

      // add the new palce into the places array and save in local storage
      places.push(newPlace);
      localStorage.setItem("places", JSON.stringify(places));

      addMarker(newPlace);
      map.setView([newPlace.lat, newPlace.lon], 13);
    },
    function () {
      alert("Location access denied.");
    }
  );
}

// Add a new marker to my map
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
