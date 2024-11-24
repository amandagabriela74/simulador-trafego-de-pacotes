const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(bodyParser.json());
app.use(cors());

const PORT = 3000;

// Inicializa a rede com nulls, criando uma matriz 10x10
function inicializarRede() {
  const tamanho = 10;
  let rede = [];

  for (let i = 0; i < tamanho; i++) {
    rede[i] = [];
    for (let j = 0; j < tamanho; j++) {
      rede[i][j] = null; // Inicializa cada célula com null
    }
  }

  return rede;
}

const arquivoRede = "rede.json";
const arquivoRedesSalvas = "redesSalvas.json"; // Redes salvas

// Carrega a rede salva (se existir)
let rede = inicializarRede();
if (fs.existsSync(arquivoRede)) {
  rede = JSON.parse(fs.readFileSync(arquivoRede, "utf8"));
}

// Carrega redes salvas ou inicializa
let redesSalvas = [];
if (fs.existsSync(arquivoRedesSalvas)) {
  redesSalvas = JSON.parse(fs.readFileSync(arquivoRedesSalvas, "utf8"));
}

// Salva a rede no arquivo
function salvarRede() {
  fs.writeFileSync(arquivoRede, JSON.stringify(rede, null, 2));
}

// Salva as redes salvas no arquivo
function salvarRedesSalvas() {
  fs.writeFileSync(arquivoRedesSalvas, JSON.stringify(redesSalvas, null, 2));
}

// =================== Endpoints =================== //

// Endpoint para obter a rede atual
app.get("/rede", (req, res) => {
  res.json(rede);
});

// Endpoint para adicionar um dispositivo à rede
app.post("/rede/dispositivo", (req, res) => {
  const { tipo, ip, mascara, x, y } = req.body;

  if (!tipo || !ip || !mascara || x === undefined || y === undefined) {
    return res.status(400).json({ erro: "Dados inválidos" });
  }

  if (!rede[x]) rede[x] = [];
  rede[x][y] = { tipo, ip, mascara };
  salvarRede();
  res.json({ mensagem: "Dispositivo adicionado com sucesso" });
});

// Endpoint para limpar a rede
app.delete("/rede", (req, res) => {
  rede = [];
  salvarRede();
  res.json({ mensagem: "Rede limpa com sucesso" });
});

// Endpoint para enviar pacotes
app.post("/rede/pacote", (req, res) => {
  const { origem, destino, quantidade } = req.body;

  // Validar entrada
  if (
    !origem ||
    !destino ||
    origem.x === undefined ||
    origem.y === undefined ||
    destino.x === undefined ||
    destino.y === undefined ||
    !quantidade
  ) {
    return res.status(400).json({ erro: "Dados inválidos" });
  }

  const dispositivoOrigem = rede[origem.x]?.[origem.y];
  const dispositivoDestino = rede[destino.x]?.[destino.y];

  if (!dispositivoOrigem || !dispositivoDestino) {
    return res
      .status(400)
      .json({ erro: "Dispositivo não encontrado na origem ou no destino." });
  }

  // Obter IPs e máscaras dos dispositivos
  const ipOrigem = dispositivoOrigem.ip;
  const ipDestino = dispositivoDestino.ip;
  const mascaraOrigem = dispositivoOrigem.mascara || 24; // Assumir máscara padrão se não for especificada
  const mascaraDestino = dispositivoDestino.mascara || 24;

  // Calcular as redes de origem e destino
  const redeOrigem = calcularRede(ipOrigem, mascaraOrigem);
  const redeDestino = calcularRede(ipDestino, mascaraDestino);

  const logPacotes = [];
  // Verificar se estão na mesma sub-rede
  if (redeOrigem === redeDestino) {
    // Comunicação direta
    for (let i = 1; i <= quantidade; i++) {
      logPacotes.push({
        etapa: `Pacote ${i}`,
        rota: [
          { tipo: "origem", x: origem.x, y: origem.y, ip: ipOrigem },
          { tipo: "destino", x: destino.x, y: destino.y, ip: ipDestino },
        ],
      });
    }
    return res.json({
      mensagem: `Todos os ${quantidade} pacotes foram enviados diretamente. Mesma sub-rede.`,
      log: logPacotes,
    });
  } else {
    // Comunicação via roteador
    // Caso os dispositivos não estejam na mesma sub-rede, identificar roteadores
    const roteadorOrigem = encontrarRoteadorMaisProximo(origem.x, origem.y);
    const roteadorDestino = encontrarRoteadorMaisProximo(destino.x, destino.y);

    if (!roteadorOrigem || !roteadorDestino) {
      return res.status(400).json({
        erro: "Não foi possível encontrar roteadores para realizar o envio.",
      });
    }

    // Simular a passagem dos pacotes pelo roteador
    for (let i = 1; i <= quantidade; i++) {
      logPacotes.push({
        etapa: `Pacote ${i}`,
        rota: [
          { tipo: "origem", x: origem.x, y: origem.y, ip: ipOrigem },
          {
            tipo: "roteador",
            x: roteadorOrigem.x,
            y: roteadorOrigem.y,
            ip: roteadorOrigem.ip,
          },
          {
            tipo: "roteador",
            x: roteadorDestino.x,
            y: roteadorDestino.y,
            ip: roteadorDestino.ip,
          },
          { tipo: "destino", x: destino.x, y: destino.y, ip: ipDestino },
        ],
      });
    }

    return res.json({
      mensagem: `Os ${quantidade} pacotes foram enviados via roteadores.`,
      log: logPacotes,
    });
  }

  // Caso não estejam na mesma sub-rede
  /*   res.status(400).json({
    erro: "Os dispositivos não estão na mesma sub-rede. Comunicação direta não é possível. Necessário Roteador!",
  }); */
});

// =================== Redes Salvas =================== //

// Endpoint para salvar a rede atual com um nome
app.post("/rede/salvar", (req, res) => {
  const { nome } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: "Nome da rede é obrigatório." });
  }

  // Verificar se já existe uma rede com o mesmo nome
  const redeExistente = redesSalvas.find((r) => r.nome === nome);
  if (redeExistente) {
    return res.status(400).json({ erro: "Já existe uma rede com este nome." });
  }

  // Adicionar a rede atual à lista de redes salvas
  redesSalvas.push({ nome, rede });
  salvarRedesSalvas();
  res.json({ mensagem: "Rede salva com sucesso." });
});

// Endpoint para carregar uma rede salva
app.get("/rede/carregar", (req, res) => {
  const { nome } = req.query;

  if (!nome) {
    return res.status(400).json({ erro: "Nome da rede é obrigatório." });
  }

  // Encontrar a rede salva pelo nome
  const redeSalva = redesSalvas.find((r) => r.nome === nome);
  if (!redeSalva) {
    return res.status(404).json({ erro: "Rede não encontrada." });
  }

  // Atualizar a rede atual com a rede salva
  rede = redeSalva.rede;
  salvarRede();
  res.json({ mensagem: "Rede carregada com sucesso.", rede });
});

// Endpoint para listar todas as redes salvas
app.get("/rede/listar", (req, res) => {
  const nomesDasRedes = redesSalvas.map((r) => r.nome);
  res.json(nomesDasRedes); // Retorna apenas os nomes das redes salvas
});

// Endpoint para excluir uma rede salva
app.delete("/rede/excluir", (req, res) => {
  const { nome } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: "Nome da rede é obrigatório." });
  }

  const indice = redesSalvas.findIndex((r) => r.nome === nome);
  if (indice === -1) {
    return res.status(404).json({ erro: "Rede não encontrada." });
  }

  // Remover a rede salva
  redesSalvas.splice(indice, 1);
  salvarRedesSalvas();
  res.json({ mensagem: "Rede excluída com sucesso." });
});

// =================== Funções auxiliares =================== //

// Função para calcular a rede a partir do IP e da máscara
function calcularRede(ip, mascara) {
  const ipBinario = ip
    .split(".")
    .map((octeto) => parseInt(octeto, 10).toString(2).padStart(8, "0"))
    .join(""); // Converte o IP para binário

  const mascaraBinaria = "1".repeat(mascara) + "0".repeat(32 - mascara); // Máscara em binário

  // Aplica operação AND bit a bit para calcular a rede
  const redeBinaria = ipBinario
    .split("")
    .map((bit, index) =>
      bit === "1" && mascaraBinaria[index] === "1" ? "1" : "0"
    )
    .join("");

  // Converte a rede calculada para formato decimal (ex.: "192.168.1.0")
  return Array.from({ length: 4 }, (_, i) =>
    parseInt(redeBinaria.slice(i * 8, i * 8 + 8), 2)
  ).join(".");
}

// Função para encontrar o roteador mais próximo
function encontrarRoteadorMaisProximo(x, y) {
  let roteadorMaisProximo = null;
  let menorDistancia = Infinity;

  for (let i = 0; i < rede.length; i++) {
    for (let j = 0; j < (rede[i]?.length || 0); j++) {
      const dispositivo = rede[i]?.[j];
      if (dispositivo?.tipo === "roteador") {
        // Calcula a distância euclidiana
        const distancia = Math.sqrt(Math.pow(x - i, 2) + Math.pow(y - j, 2));
        if (distancia < menorDistancia) {
          menorDistancia = distancia;
          roteadorMaisProximo = dispositivo;
        }
      }
    }
  }

  return roteadorMaisProximo;
}

// =================== Iniciar Servidor =================== //

app.listen(PORT, () => {
  console.log(`Servidor disponível em http://localhost:${PORT}`);
});
