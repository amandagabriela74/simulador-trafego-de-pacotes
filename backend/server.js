const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(bodyParser.json());
app.use(cors());

const PORT = 4000;

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

// Retorna a rede atual
app.get("/rede", (req, res) => res.json(rede));

// Adiciona um dispositivo na rede
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

// Limpa toda a rede
app.delete("/rede", (req, res) => {
  rede = inicializarRede();
  salvarRede();
  res.json({ mensagem: "Rede limpa com sucesso" });
});

// Envia pacotes de origem para destino
app.post("/rede/pacote", (req, res) => {
  const { origem, destino, quantidade } = req.body;

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
    return res.status(400).json({ erro: "Origem ou destino inválido." });
  }

  try {
    const { rota, tipoDeEnvio } = calcularRota(origem, destino, dispositivoOrigem, dispositivoDestino);
    const logPacotes = Array.from({ length: quantidade }, (_, i) => ({
      etapa: `Pacote ${i + 1}`,
      rota,
    }));

    res.json({
      mensagem: `Os ${quantidade} pacotes foram enviados com sucesso.`,
      log: logPacotes,
      tipoDeEnvio,
      rota,
    });
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

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

app.get("/rede/listar", (req, res) => {
  const nomesDasRedes = redesSalvas.map((r) => r.nome);
  res.json(nomesDasRedes);
});

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

// Calcula a rota célula por célula entre origem e destino
// Calcula a rota célula por célula entre origem e destino
function calcularRota(origem, destino, dispositivoOrigem, dispositivoDestino) {
  const { x: xOrigem, y: yOrigem } = origem;
  const { x: xDestino, y: yDestino } = destino;

  const rota = [{ x: xOrigem, y: yOrigem }];
  let tipoDeEnvio;

  // Calcular as redes de origem e destino
  const redeOrigem = calcularRede(
    dispositivoOrigem.ip,
    dispositivoOrigem.mascara
  );
  const redeDestino = calcularRede(
    dispositivoDestino.ip,
    dispositivoDestino.mascara
  );

  if (redeOrigem === redeDestino) {
    // Rota direta célula por célula
    adicionarRotaLinear(rota, xOrigem, yOrigem, xDestino, yDestino);
    tipoDeEnvio = "mesma rede";
  } else {
    // Busca os roteadores mais próximos
    const roteadorOrigem = encontrarRoteadorMaisProximo(
      xOrigem,
      yOrigem,
      redeOrigem
    );
    const roteadorDestino = encontrarRoteadorMaisProximo(
      xDestino,
      yDestino,
      redeDestino
    );

    if (roteadorOrigem) {
      adicionarRotaLinear(
        rota,
        xOrigem,
        yOrigem,
        roteadorOrigem.x,
        roteadorOrigem.y
      );
    }
    if (roteadorDestino && roteadorDestino !== roteadorOrigem) {
      adicionarRotaLinear(
        rota,
        roteadorOrigem.x,
        roteadorOrigem.y,
        roteadorDestino.x,
        roteadorDestino.y
      );
    }
    adicionarRotaLinear(
      rota,
      roteadorDestino.x,
      roteadorDestino.y,
      xDestino,
      yDestino
    );

    tipoDeEnvio = "via roteador";
  }

  return { rota, tipoDeEnvio };
}

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

// Adiciona a rota célula por célula de forma linear (sem movimentos diagonais)
function adicionarRotaLinear(rota, xAtual, yAtual, xDestino, yDestino) {
  // Movendo na direção horizontal primeiro
  while (xAtual !== xDestino) {
    if (xAtual < xDestino) xAtual++;
    else if (xAtual > xDestino) xAtual--;

    rota.push({ x: xAtual, y: yAtual });
  }

  // Movendo na direção vertical depois
  while (yAtual !== yDestino) {
    if (yAtual < yDestino) yAtual++;
    else if (yAtual > yDestino) yAtual--;

    rota.push({ x: xAtual, y: yAtual });
  }
}

function encontrarRoteadorMaisProximo(x, y, redeDispositivo) {
  let menorDistancia = Infinity;
  let roteadorMaisProximo = null;

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      const dispositivo = rede[i]?.[j];
      if (dispositivo?.tipo === "roteador") {
        // Calcula a rede do roteador
        const redeRoteador = calcularRede(dispositivo.ip, dispositivo.mascara);

        // Verifica se o dispositivo e o roteador estão na mesma rede
        if (redeDispositivo === redeRoteador) {
          const distancia = Math.abs(x - i) + Math.abs(y - j);
          if (distancia < menorDistancia) {
            menorDistancia = distancia;
            roteadorMaisProximo = { x: i, y: j };
          }
        }
      }
    }
  }

  console.log("roteadorMaisProximo", roteadorMaisProximo);

  return roteadorMaisProximo;
}

// =================== Inicialização do servidor =================== //
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
