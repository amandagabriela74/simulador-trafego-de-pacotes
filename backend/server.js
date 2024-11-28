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
    !origem || !destino ||
    origem.x === undefined || origem.y === undefined ||
    destino.x === undefined || destino.y === undefined ||
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
    const rota = calcularRota(origem, destino, rede);
    const logPacotes = Array.from({ length: quantidade }, (_, i) => ({
      etapa: `Pacote ${i + 1}`,
      rota,
    }));

    res.json({
      mensagem: `Os ${quantidade} pacotes foram enviados com sucesso.`,
      log: logPacotes,
      rota,
    });
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

// Calcula a rota célula por célula entre origem e destino
function calcularRota(origem, destino, rede) {
  const { x: xOrigem, y: yOrigem } = origem;
  const { x: xDestino, y: yDestino } = destino;

  const rota = [{ x: xOrigem, y: yOrigem }];

  if (rede[xOrigem][yOrigem]?.mascara === rede[xDestino][yDestino]?.mascara) {
    // Rota direta célula por célula
    adicionarRotaLinear(rota, xOrigem, yOrigem, xDestino, yDestino);
  } else {
    // Busca os roteadores mais próximos
    const roteadorOrigem = encontrarRoteadorMaisProximo(xOrigem, yOrigem);
    const roteadorDestino = encontrarRoteadorMaisProximo(xDestino, yDestino);

    if (roteadorOrigem) {
      adicionarRotaLinear(rota, xOrigem, yOrigem, roteadorOrigem.x, roteadorOrigem.y);
    }
    if (roteadorDestino && roteadorDestino !== roteadorOrigem) {
      adicionarRotaLinear(rota, roteadorOrigem.x, roteadorOrigem.y, roteadorDestino.x, roteadorDestino.y);
    }
    adicionarRotaLinear(rota, roteadorDestino.x, roteadorDestino.y, xDestino, yDestino);
  }

  return rota;
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

// Encontra o roteador mais próximo
function encontrarRoteadorMaisProximo(x, y) {
  let menorDistancia = Infinity;
  let roteadorMaisProximo = null;

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      const dispositivo = rede[i]?.[j];
      if (dispositivo?.tipo === "roteador") {
        const distancia = Math.abs(x - i) + Math.abs(y - j);
        if (distancia < menorDistancia) {
          menorDistancia = distancia;
          roteadorMaisProximo = { x: i, y: j };
        }
      }
    }
  }

  return roteadorMaisProximo;
}

// =================== Inicialização do servidor =================== //
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
