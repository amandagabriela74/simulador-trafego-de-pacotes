const API_URL = "http://localhost:4000";

// Atualiza a grade com base na rede
async function atualizarGrid() {
  const grid = document.getElementById("grid");
  grid.innerHTML = ""; // Limpa o grid para evitar duplicações

  const resposta = await fetch(`${API_URL}/rede`);
  const rede = await resposta.json();

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      const cell = document.createElement("div");
      cell.className = "cell vazio";
      cell.dataset.x = i; // Adiciona a coordenada x
      cell.dataset.y = j; // Adiciona a coordenada y

      if (rede[i] && rede[i][j]) {
        const dispositivo = rede[i][j];
        cell.className = `cell ${dispositivo.tipo}`;
        cell.innerText = dispositivo.tipo;
        cell.dataset.ip = dispositivo.ip; // Atributo data-ip para armazenar o IP
      }

      grid.appendChild(cell);
    }
  }

  // Após criar a grade, configura os cliques
  configurarGridParaClique();
}

// Adiciona um dispositivo na rede
async function adicionarDispositivo() {
  const ip = document.getElementById("ip").value;
  const tipo = document.getElementById("tipo").value;
  const mascara = document.getElementById("mascara").value;
  const x = parseInt(document.getElementById("x").value, 10);
  const y = parseInt(document.getElementById("y").value, 10);

  if (!ip || !tipo || !mascara || isNaN(x) || isNaN(y)) {
    alert("Preencha todos os campos corretamente.");
    return;
  }

  await fetch(`${API_URL}/rede/dispositivo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip, tipo, mascara, x, y }),
  });

  atualizarGrid();
}

// Variável para armazenar a origem selecionada
let origemSelecionada = null;

function getIpPorCoordenada(x, y) {
  const grid = document.getElementById("grid");
  const index = x * 10 + y; // Calcula o índice com base nas coordenadas
  const cell = grid.children[index];

  if (cell && cell.dataset.ip) {
    return cell.dataset.ip; // Retorna o valor do atributo data-ip
  }
  return null;
}

// Função para configurar os cliques na grid
function configurarGridParaClique() {
  const grid = document.getElementById("grid");
  const cells = grid.children; // Captura todas as células da grid

  for (let cell of cells) {
    cell.addEventListener("click", () => {
      const x = parseInt(cell.dataset.x, 10); // Coordenada x
      const y = parseInt(cell.dataset.y, 10); // Coordenada y

      if (!origemSelecionada) {
        origemSelecionada = { x, y };
        cell.classList.add("origem"); // Marca a célula como origem
      } else {
        const destino = { x, y };
        cell.classList.add("destino"); // Marca a célula como destino

        // Enviar o pacote entre origem e destino
        enviarPacote(origemSelecionada, destino);

        origemSelecionada = null;

        // Limpar seleção visual após um tempo
        setTimeout(() => {
          limparSelecaoVisual();
        }, 2000);
      }
    });
  }
}

// Função para limpar a seleção visual
function limparSelecaoVisual() {
  const cells = document.querySelectorAll(".cell");
  cells.forEach((cell) => {
    cell.classList.remove("origem", "destino", "pacote", "roteador");
  });
}

async function enviarPacote(origem, destino) {
  if (!origem || !destino) {
    alert("Selecione tanto a origem quanto o destino.");
    return;
  }

  const origemIp = getIpPorCoordenada(origem.x, origem.y);
  const destinoIp = getIpPorCoordenada(destino.x, destino.y);

  if (!origemIp || !destinoIp) {
    alert("Endereço IP não encontrado.");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/rede/pacote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origem, destino, quantidade: 10 }),
    });

    if (response.ok) {
      const data = await response.json();
      await animarTrajetoPacote(data.rota);
      alert(data.mensagem);
    } else {
      const errorData = await response.json();
      alert(errorData.erro || "Erro desconhecido");
    }
  } catch (error) {
    alert("Erro ao enviar o pacote: " + error.message);
  }
}

async function animarTrajetoPacote(rota) {
  const grid = document.getElementById("grid");

  for (const passo of rota) {
    const { x, y, tipo } = passo;

    const index = x * 10 + y;
    const cell = grid.children[index];

    if (cell) {
      // Adiciona classes para representar o pacote em movimento
      cell.classList.add(tipo === "roteador" ? "roteador" : "pacote");

      // Espera 500ms para simular o movimento
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Remove a classe após o passo, exceto se for o destino final
      if (!cell.classList.contains("destino")) {
        cell.classList.remove("pacote", "roteador");
      }
    }
  }
}

// Inicializa a grade ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
  criarGrade();
  atualizarGrid();
});

// Função para criar a grade 10x10
function criarGrade() {
  const grid = document.getElementById("grid");

  grid.innerHTML = ""; // Garante que a grade seja limpa

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.x = i; // Coordenada x
      cell.dataset.y = j; // Coordenada y

      grid.appendChild(cell);
    }
  }
}
