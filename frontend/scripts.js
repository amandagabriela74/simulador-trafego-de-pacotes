const API_URL = "http://localhost:4000";

// =========================== Funções de Inicialização =========================== //

// Função principal para criar e inicializar a grade 10 X 10
function criarGrade() {
  const grid = document.getElementById("grid");

  grid.innerHTML = "";

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.x = i;
      cell.dataset.y = j;

      // Adiciona a célula na grid
      grid.appendChild(cell);
    }
  }

  // Após criar a grade, chama a função de atualizar a grade com dados da API
  atualizarGrid();
}

criarGrade();

// =========================== Consumo de Endpoints =========================== //

// Atualiza a grade com os dispositivos recebidos da API
async function atualizarGrid() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  const resposta = await fetch(`${API_URL}/rede`);
  const rede = await resposta.json();

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      const cell = document.createElement("div");
      cell.className = "cell vazio";
      cell.dataset.x = i;
      cell.dataset.y = j;

      if (rede[i] && rede[i][j]) {
        const dispositivo = rede[i][j];

        cell.className = dispositivo.tipo;

        // Cria um elemento <img> para exibir a imagem correspondente ao tipo
        const img = document.createElement("img");
        img.alt = dispositivo.tipo;
        img.className = "icon";
        img.src = `./assets/img/${dispositivo.tipo}.png`;

        // Adiciona a imagem à célula
        cell.appendChild(img);

        // Adiciona o IP como um atributo data-ip
        cell.dataset.ip = dispositivo.ip;
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
    alertWarning("Preencha todos os campos corretamente.");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/rede/dispositivo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip, tipo, mascara, x, y }),
    });

    if (response.ok) {
      const data = await response.json();
      alertSucess(data.mensagem);
      toggleFormulario();
    } else {
      const errorData = await response.json();
      alertWarning(errorData.erro || "Erro desconhecido");
    }
  } catch (error) {
    alertError("Erro ao criar dispositivo: " + error.message);
  }

  atualizarGrid();
}

// Salvar a configuração atual da rede com um nome
async function salvarRede() {
  const nome = prompt("Digite um nome para salvar a rede:");

  if (!nome) {
    alertWarning("Você precisa fornecer um nome para salvar a rede.");
    return;
  }

  try {
    const resposta = await fetch(`${API_URL}/rede/salvar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });

    if (resposta.ok) {
      alertSucess("Rede salva com sucesso!");
    } else {
      const erro = await resposta.json();
      alertWarning(`Erro ao salvar a rede: ${erro.erro}`);
    }
  } catch (error) {
    alertError("Erro ao salvar rede: " + error.message);
  }
}

// Listar redes salvas disponíveis
async function listarRedesSalvas() {
  try {
    const resposta = await fetch(`${API_URL}/rede/listar`);
    if (resposta.ok) {
      const redes = await resposta.json();
      const listaRedes = document.getElementById("listaRedes");
      listaRedes.innerHTML = "";

      redes.forEach((nome) => {
        const item = document.createElement("button");
        item.textContent = nome;
        item.onclick = () => carregarRede(nome);
        listaRedes.appendChild(item);
      });

      alertSucess("Rede carregada com sucesso!");
    } else {
      const errorData = await response.json();
      alertWarning(errorData.erro || "Erro desconhecido");
    }
  } catch (error) {
    alertError("Erro ao listar redes salvas: " + error.message);
  }
}

// Executa automaticamente ao carregar a página
document.addEventListener("DOMContentLoaded", listarRedesSalvas);

// Carregar uma rede salva pelo nome
async function carregarRede(nome) {
  const resposta = await fetch(
    `${API_URL}/rede/carregar?nome=${encodeURIComponent(nome)}`
  );
  if (resposta.ok) {
    const dados = await resposta.json();
    alertSucess("Rede carregada com sucesso!");
    atualizarGrid();
  } else {
    const erro = await resposta.json();
    alertWarning(`Erro ao carregar a rede: ${erro.erro}`);
  }
}

// Limpa a rede atual
async function limparRede() {
  await fetch(`${API_URL}/rede`, { method: "DELETE" });
  atualizarGrid();
}

// =========================== Controle do Grid =========================== //

let origemSelecionada = null;

// Configura os cliques na grade
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
      }
    });
  }
}

// Função para limpar a seleção visual
function limparSelecaoVisual() {
  const origem = document.querySelector(".origem");
  const destino = document.querySelector(".destino");

  if (origem) origem.classList.remove("origem");
  if (destino) destino.classList.remove("destino");
}

// =========================== Envio de Pacotes =========================== //

// Obtém o IP com base nas coordenadas
function getIpPorCoordenada(x, y) {
  const grid = document.getElementById("grid");
  const index = x * 10 + y; // Calcula o índice com base nas coordenadas
  const cell = grid.children[index];

  if (cell && cell.dataset.ip) {
    return cell.dataset.ip; // Retorna o valor do atributo data-ip
  }
  return null;
}

// Envia o pacote entre origem e destino
async function enviarPacote(origem, destino) {
  var quantidade = ''

  if (!origem || !destino) {
    alertWarning("Selecione tanto a origem quanto o destino.");
    return;
  }

  // Verifique se estão na mesma rede
  const origemIp = getIpPorCoordenada(origem.x, origem.y);
  const destinoIp = getIpPorCoordenada(destino.x, destino.y);

  if (!origemIp || !destinoIp) {
    alertWarning("Endereço IP não encontrado.");
    limparSelecaoVisual();
    return;
  }

  if (origem && destino) {
    quantidade = prompt("Digite a quantidade de pacotes que você deseja enviar:");
  }


  try {
    const response = await fetch(`${API_URL}/rede/pacote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origem, destino, quantidade }),
    });

    if (response.ok) {
      const data = await response.json();
      animarTrajetoPacote(data.rota);
      alertSucess(data.mensagem + ` - ` + data.tipoDeEnvio);
    } else {
      const errorData = await response.json();
      alertWarning(errorData.erro || "Erro desconhecido");
    }
  } catch (error) {
    alertError("Erro ao enviar o pacote: " + error.message);
  }
}

// Anima o trajeto do pacote na grade
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

  // Limpar seleções visuais (origem e destino) após a animação
  limparSelecaoVisual();
}

function toggleFormulario() {
  const formulario = document.getElementById('formulario');
  formulario.style.display = formulario.style.display === 'none' ? 'flex' : 'none';
}


// =========================== Alertas =========================== //

function alertSucess(mensagem) {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });
  Toast.fire({
    icon: "success",
    title: mensagem,
  });
}

function alertWarning(mensagem) {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });
  Toast.fire({
    icon: "warning",
    title: mensagem,
  });
}

function alertError(mensagem) {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });
  Toast.fire({
    icon: "error",
    title: mensagem,
  });
}
