const API_URL = "http://localhost:4000";

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
      cell.dataset.x = i; // Adiciona a coordenada x
      cell.dataset.y = j; // Adiciona a coordenada y

      if (rede[i] && rede[i][j]) {
        const dispositivo = rede[i][j];
        cell.className = dispositivo.tipo;
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

// Salvar a configuração atual da rede com um nome
async function salvarRede() {
  const nome = prompt("Digite um nome para salvar a rede:");

  if (!nome) {
    alert("Você precisa fornecer um nome para salvar a rede.");
    return;
  }

  const resposta = await fetch(`${API_URL}/rede/salvar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  });

  if (resposta.ok) {
    alert("Rede salva com sucesso!");
  } else {
    const erro = await resposta.json();
    alert(`Erro ao salvar a rede: ${erro.erro}`);
  }
}

// Listar redes salvas disponíveis
async function listarRedesSalvas() {
  const resposta = await fetch(`${API_URL}/rede/listar`);
  const redes = await resposta.json();

  const listaRedes = document.getElementById("listaRedes");
  listaRedes.innerHTML = ""; // Limpa a lista antes de exibir

  redes.forEach((nome) => {
    const item = document.createElement("li");
    item.textContent = nome;
    item.onclick = () => carregarRede(nome); // Define evento para carregar a rede ao clicar
    listaRedes.appendChild(item);
  });
}

// Carregar uma rede salva pelo nome
async function carregarRede(nome) {
  const resposta = await fetch(
    `${API_URL}/rede/carregar?nome=${encodeURIComponent(nome)}`
  );
  if (resposta.ok) {
    const dados = await resposta.json();
    alert("Rede carregada com sucesso!");
    atualizarGrid(); // Atualiza a grade com a rede carregada
  } else {
    const erro = await resposta.json();
    alert(`Erro ao carregar a rede: ${erro.erro}`);
  }
}

// Limpa a rede atual
async function limparRede() {
  await fetch(`${API_URL}/rede`, { method: "DELETE" });
  atualizarGrid();
}

// Inicializa a grade ao carregar a página
criarGrade();

// Função para criar a grade 10x10
function criarGrade() {
  const grid = document.getElementById("grid");

  // Garante que a grade seja limpa antes de adicionar novas células
  grid.innerHTML = "";

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.x = i; // Definindo a coordenada x
      cell.dataset.y = j; // Definindo a coordenada y

      // Adiciona a célula na grid
      grid.appendChild(cell);
    }
  }

  // Após criar a grade, chama a função de atualizar a grade com dados da API
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
      // Pega as coordenadas x e y da célula clicada
      const x = parseInt(cell.dataset.x, 10); // Pega a coordenada x
      const y = parseInt(cell.dataset.y, 10); // Pega a coordenada y

      console.log("Coordenadas clicadas:", { x, y });

      if (!origemSelecionada) {
        // Se origem ainda não foi selecionada, seleciona a origem
        origemSelecionada = { x, y };
        cell.classList.add("origem"); // Marca a célula como origem
      } else {
        // Se origem já foi selecionada, marca como destino e envia o pacote
        const destino = { x, y };
        cell.classList.add("destino"); // Marca a célula como destino

        // Enviar o pacote entre origem e destino
        enviarPacote(origemSelecionada, destino);

        // Resetar origemSelecionada após o envio do pacote
        origemSelecionada = null;

        // Limpar seleção visual após um tempo
        setTimeout(() => {
          limparSelecaoVisual();
        }, 2000); // Tempo para limpar as seleções visuais
      }
    });
  }
}

// Função para limpar a seleção visual
function limparSelecaoVisual() {
  const cells = document.querySelectorAll(".cell");
  cells.forEach((cell) => {
    cell.classList.remove("origem");
    cell.classList.remove("destino");
  });
}

async function enviarPacote(origem, destino) {
  if (!origem || !destino) {
    alert("Selecione tanto a origem quanto o destino.");
    return;
  }

  // Verifique se estão na mesma rede
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
      body: JSON.stringify({ origem, destino, quantidade: 10 }), // Quantidade de pacotes (ajustar conforme sua lógica)
    });

    if (response.ok) {
      const data = await response.json();
      animarTrajetoPacote(data.rota);
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
    const { x, y } = passo;

    const index = x * 10 + y;
    const cell = grid.children[index];

    if (cell) {
      cell.classList.add("pacote"); // Adiciona a classe de animação
      await new Promise((resolve) => setTimeout(resolve, 500)); // Aguardar 500ms para cada passo
      cell.classList.remove("pacote"); // Remove a classe após o passo
    }
  }
}
