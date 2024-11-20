const API_URL = "http://localhost:3000";

// Atualiza a grade com base na rede
async function atualizarGrid() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  const resposta = await fetch(`${API_URL}/rede`);
  const rede = await resposta.json();

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      const cell = document.createElement("div");
      cell.className = "cell vazio";

      if (rede[i] && rede[i][j]) {
        const dispositivo = rede[i][j];
        cell.className = dispositivo.tipo; // Correção: não usar interpolação aqui
        cell.innerText = dispositivo.tipo;
      }

      grid.appendChild(cell);
    }
  }
}

// Adiciona um dispositivo na rede
async function adicionarDispositivo() {
  const ip = document.getElementById("ip").value;
  const tipo = document.getElementById("tipo").value;
  const x = parseInt(document.getElementById("x").value, 10);
  const y = parseInt(document.getElementById("y").value, 10);

  if (!ip || !tipo || isNaN(x) || isNaN(y)) {
    alert("Preencha todos os campos corretamente.");
    return;
  }

  await fetch(`${API_URL}/rede/dispositivo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip, tipo, x, y }),
  });

  atualizarGrid();
}

async function enviarPacote() {
  const origemX = parseInt(document.getElementById("origemX").value, 10);
  const origemY = parseInt(document.getElementById("origemY").value, 10);
  const destinoX = parseInt(document.getElementById("destinoX").value, 10);
  const destinoY = parseInt(document.getElementById("destinoY").value, 10);

  if (isNaN(origemX) || isNaN(origemY) || isNaN(destinoX) || isNaN(destinoY)) {
    alert("Preencha todas as coordenadas corretamente.");
    return;
  }

  const resposta = await fetch(`${API_URL}/rede/pacote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      origem: { x: origemX, y: origemY },
      destino: { x: destinoX, y: destinoY },
    }),
  });

  const resultado = await resposta.json();
  if (resposta.ok) {
    alert(resultado.mensagem);
  } else {
    alert(`Erro: ${resultado.erro}`);
  }
}

// Limpa a rede
async function limparRede() {
  await fetch(`${API_URL}/rede`, { method: "DELETE" });
  atualizarGrid();
}

// Inicializa a interface
atualizarGrid();
