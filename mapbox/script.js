// Inicializando o mapa com um centro padrão (caso a localização não seja permitida)
var map = L.map('map').setView([51.505, -0.09], 13);
var markers = []; // Array para armazenar marcadores
var currentRoutes = []; // Array para armazenar rotas
var currentPolygon = null; // Variável para armazenar o polígono atual
var userCircle; // Variável para armazenar o círculo da localização do usuário
var userMarker; // Variável para armazenar o marcador de localização do usuário

// Adicionando o tile layer do OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Função para obter a localização do usuário com alta precisão
function getUserLocation() {
    if (navigator.geolocation) {
        var options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            function (position) {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                map.setView([lat, lon], 13);

                if (!userMarker) {
                    // Adiciona um marcador de localização do usuário se ainda não existir
                    userMarker = addMarker(lat, lon, `<b>You are here</b>`);
                }

                // Adicionando um círculo de 20 km ao redor da localização do usuário
                if (userCircle) {
                    map.removeLayer(userCircle); // Remove o círculo anterior, se existir
                }
                userCircle = L.circle([lat, lon], {
                    color: 'red',
                    radius: 20000 // 20 km
                }).addTo(map);
            },
            function (error) {
                console.error('Geolocation error: ', error);
                alert('Unable to retrieve your location: ' + error.message);
            },
            options
        );
    } else {
        alert('Geolocation is not supported by your browser.');
    }
}

// Função para adicionar marcadores ao mapa
function addMarker(lat, lon, popupContent) {
    var marker = L.marker([lat, lon]).addTo(map).bindPopup(popupContent);
    markers.push(marker); // Adiciona o marcador ao array
    return marker;
}

// Função para limpar os marcadores (exceto o do usuário)
function clearMarkers() {
    markers.forEach(marker => {
        if (marker !== userMarker) {
            map.removeLayer(marker);
        }
    });
    markers = userMarker ? [userMarker] : []; // Mantém o marcador do usuário no array
}

// Função para importar coordenadas de arquivos CSV ou XLSX
document.getElementById('import-button').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const fileContent = e.target.result;

        // Detecta o tipo de arquivo
        if (file.name.endsWith('.csv')) {
            Papa.parse(fileContent, {
                header: true,
                skipEmptyLines: true,
                complete: function (results) {
                    clearMarkers(); // Limpa marcadores antes de importar novos
                    results.data.forEach(row => {
                        const lat = parseFloat(row.latitude);
                        const lon = parseFloat(row.longitude);
                        console.log(`Importing: ${lat}, ${lon}`); // Log para depuração
                        if (!isNaN(lat) && !isNaN(lon)) {
                            addMarker(lat, lon, `<b>${row.name || 'No Name'}</b>`);
                        }
                    });
                }
            });
        } else if (file.name.endsWith('.xlsx')) {
            const workbook = XLSX.read(fileContent, { type: 'binary' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);
            clearMarkers(); // Limpa marcadores antes de importar novos
            json.forEach(row => {
                const lat = parseFloat(row.latitude);
                const lon = parseFloat(row.longitude);
                console.log(`Importing: ${lat}, ${lon}`); // Log para depuração
                if (!isNaN(lat) && !isNaN(lon)) {
                    addMarker(lat, lon, `<b>${row.name || 'No Name'}</b>`);
                }
            });
        }
    };

    if (file.name.endsWith('.csv')) {
        reader.readAsText(file); // Lê CSV como texto
    } else if (file.name.endsWith('.xlsx')) {
        reader.readAsBinaryString(file); // Lê XLSX como string binária
    }
});

// Função de pesquisa de localização
function searchLocation(query) {
    // Limpar rotas e polígonos anteriores antes de buscar nova localização
    clearRoutes();
    clearPolygon();

    // Verifica se a entrada é um par de coordenadas (latitude, longitude)
    const coords = query.split(',').map(coord => coord.trim());
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        const lat = parseFloat(coords[0]);
        const lon = parseFloat(coords[1]);

        // Adiciona um marcador diretamente para as coordenadas
        addMarker(lat, lon, `<b>Coordinates: ${lat}, ${lon}</b>`);
        map.setView([lat, lon], 13);
        return;
    }

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=10`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                clearMarkers(); // Limpar marcadores anteriores (exceto o do usuário)

                data.forEach(location => {
                    const { lat, lon, display_name } = location;
                    // Ajustar a visualização do mapa e adicionar um marcador
                    addMarker(lat, lon, `
                        <b>${display_name}</b><br>
                        <button onclick="markRoute(${lat}, ${lon})">Marcar Rota</button>
                        <button onclick="markArea(${lat}, ${lon})">Marcar Área</button>
                    `);
                });
                // Ajustar o zoom do mapa para incluir todos os marcadores encontrados
                map.fitBounds(markers.map(marker => marker.getLatLng()));
            } else {
                alert('Location not found');
            }
        })
        .catch(error => {
            console.error('Error fetching location:', error);
            alert('Error fetching location');
        });
}

// Função para marcar a rota (estilo Google Maps)
function markRoute(lat, lon) {
    if (userMarker) {
        const userLat = userMarker.getLatLng().lat;
        const userLon = userMarker.getLatLng().lng;

        // Usando o serviço de rota da OpenStreetMap para traçar o caminho
        const routingUrl = `https://router.project-osrm.org/route/v1/driving/${userLon},${userLat};${lon},${lat}?overview=full&geometries=geojson`;

        fetch(routingUrl)
            .then(response => response.json())
            .then(data => {
                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0];
                    const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // Inverter as coordenadas

                    // Adiciona a nova rota no mapa
                    const newRoute = L.polyline(coordinates, { color: 'blue' }).addTo(map);
                    currentRoutes.push(newRoute); // Adiciona a rota ao array
                    map.fitBounds(newRoute.getBounds()); // Ajusta o zoom para caber a rota
                    alert('Route marked successfully.');
                } else {
                    alert('No route found.');
                }
            })
            .catch(error => {
                console.error('Error fetching route:', error);
                alert('Error marking route');
            });
    } else {
        alert('Your location is not available. Please enable location services.');
    }
}

// Função para marcar a área (polígono)
function markArea(lat, lon) {
    clearPolygon(); // Limpa o polígono anterior, se existir

    const areaCoordinates = [
        [lat + 0.01, lon + 0.01],
        [lat + 0.01, lon - 0.01],
        [lat - 0.01, lon - 0.01],
        [lat - 0.01, lon + 0.01],
        [lat + 0.01, lon + 0.01]
    ];

    currentPolygon = L.polygon(areaCoordinates, { color: 'green', fillOpacity: 0.5 }).addTo(map);
    alert('Area marked around the selected location.');
}

// Função para limpar rotas
function clearRoutes() {
    currentRoutes.forEach(route => {
        map.removeLayer(route);
    });
    currentRoutes = [];
}

// Função para limpar o polígono
function clearPolygon() {
    if (currentPolygon) {
        map.removeLayer(currentPolygon);
        currentPolygon = null;
    }
}

// Adiciona evento ao botão de pesquisa
document.getElementById('search-button').addEventListener('click', () => {
    const query = document.getElementById('search-input').value;
    if (query) {
        searchLocation(query);
    }
});

// Inicializa o mapa e a localização do usuário ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    getUserLocation();
    document.getElementById('search-input').addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            const query = event.target.value;
            if (query) {
                searchLocation(query);
            }
        }
    });
});

// Obtém elementos do DOM
const hamburgerMenu = document.getElementById('hamburger-menu');
const menu = document.getElementById('menu');
const closeMenuButton = document.getElementById('close-menu');
const mapElement = document.getElementById('map');

// Função para abrir o menu
const openMenu = () => {
    menu.classList.remove('d-none'); // Remove a classe 'd-none' para mostrar o menu
    menu.style.left = '0'; // Move o menu para a posição visível
};

// Função para fechar o menu
const closeMenu = () => {
    menu.style.left = '-250px'; // Move o menu para fora da tela
    setTimeout(() => {
        menu.classList.add('d-none'); // Adiciona 'd-none' após a animação
    }, 300); // O tempo deve ser o mesmo da transição do CSS
};

// Adiciona evento de clique ao menu hamburger
hamburgerMenu.addEventListener('click', openMenu);

// Adiciona evento de clique ao botão de fechar
closeMenuButton.addEventListener('click', closeMenu);

// Fecha o menu ao clicar fora dele
mapElement.addEventListener('click', closeMenu);
