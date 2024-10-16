// Exemplo de dados (incluindo nomes)
let coordinates = [
    { name: "Los Angeles", lat: 34.0522, lon: -118.2437 },
    { name: "New York", lat: 40.7128, lon: -74.0060 },
    { name: "San Francisco", lat: 37.7749, lon: -122.4194 },
    { name: "San Francisco 2", lat: 37.7749, lon: -122.4194 },
];

// Exemplo de dados de fluxo de pesquisa ao longo da semana
const searchFlowData = {
    labels: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    datasets: [{
        label: 'Fluxo de Pesquisas',
        data: [5, 10, 15, 7, 12, 20, 17], // Dados de exemplo
        fill: false,
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.1 // Tensão do gráfico para suavizar a linha
    }]
};

document.addEventListener("DOMContentLoaded", function() {
    // Atualizar total de locais pesquisados
    document.getElementById("total-locations").textContent = coordinates.length;

    // Criar gráfico de linha
    const ctx = document.getElementById("locationChart").getContext("2d");
    const locationChart = new Chart(ctx, {
        type: "line",
        data: searchFlowData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                },
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Dias da Semana'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Número de Pesquisas'
                    },
                    beginAtZero: true
                }
            }
        }
    });

    // Adicionar coordenadas à tabela
    renderTable();
});

// Função para renderizar a tabela com os dados de coordenadas
function renderTable() {
    const tableBody = document.querySelector("#coordinate-table tbody");
    tableBody.innerHTML = ""; // Limpar tabela antes de renderizar
    coordinates.forEach(coord => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${coord.name}</td> <!-- Exibir o nome -->
            <td>${coord.lat}</td>
            <td>${coord.lon}</td>
            <td class="actions">
                <i class="fas fa-edit" onclick="editLocation('${coord.name}', ${coord.lat}, ${coord.lon})"></i>
                <i class="fas fa-trash" onclick="deleteLocation('${coord.name}', ${coord.lat}, ${coord.lon})"></i>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Função para voltar à página anterior
function goBack() {
    window.history.back(); // Volta para a página anterior no histórico
}

// Funções para editar e deletar locais
let editedLocationIndex = null;

function editLocation(name, lat, lon) {
    // Encontrar o índice do local a ser editado
    editedLocationIndex = coordinates.findIndex(coord => coord.name === name && coord.lat === lat && coord.lon === lon);

    // Carregar o nome e coordenadas no modal de edição
    document.getElementById('editName').value = name;
    document.getElementById('editLat').value = lat;
    document.getElementById('editLon').value = lon;

    // Abrir modal de edição
    $('#editModal').modal('show');
}

function deleteLocation(name, lat, lon) {
    // Armazenar informações do local a ser deletado
    document.getElementById('deleteModal').setAttribute('data-name', name);
    document.getElementById('deleteModal').setAttribute('data-lat', lat);
    document.getElementById('deleteModal').setAttribute('data-lon', lon);

    // Abrir modal de exclusão
    $('#deleteModal').modal('show');
}

// Função para confirmar exclusão
function confirmDelete() {
    const name = document.getElementById('deleteModal').getAttribute('data-name');
    const lat = parseFloat(document.getElementById('deleteModal').getAttribute('data-lat'));
    const lon = parseFloat(document.getElementById('deleteModal').getAttribute('data-lon'));

    // Remover coordenada
    coordinates = coordinates.filter(coord => !(coord.name === name && coord.lat === lat && coord.lon === lon));

    // Atualizar a tabela
    renderTable();

    // Fechar modal
    $('#deleteModal').modal('hide');
}

// Função para cancelar exclusão
function cancelDelete() {
    $('#deleteModal').modal('hide');
}

// Função para salvar mudanças feitas no modal de edição
function saveChanges() {
    const name = document.getElementById('editName').value;
    const lat = parseFloat(document.getElementById('editLat').value);
    const lon = parseFloat(document.getElementById('editLon').value);

    // Atualizar as coordenadas no array
    if (editedLocationIndex !== null) {
        coordinates[editedLocationIndex] = { name, lat, lon };
    }

    // Atualizar a tabela
    renderTable();

    // Fechar modal
    $('#editModal').modal('hide');
}

// Função para cancelar edição
function cancelEdit() {
    $('#editModal').modal('hide');
}

// Função para exportar a tabela para CSV ou XLSX
document.getElementById('export-button').addEventListener('click', function() {
    const wb = XLSX.utils.book_new();
    const ws_data = [
        ["Nome", "Latitude", "Longitude"], // Cabeçalhos das colunas
        ...coordinates.map(coord => [coord.name, coord.lat, coord.lon]) // Dados das coordenadas
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, "Coordenadas");
    XLSX.writeFile(wb, "coordenadas.xlsx"); // Exportar como XLSX
});
