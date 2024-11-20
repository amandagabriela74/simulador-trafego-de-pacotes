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

// Carrega a rede salva (se existir)
let rede = inicializarRede();
const arquivoRede = "rede.json";

if (fs.existsSync(arquivoRede)) {
  rede = JSON.parse(fs.readFileSync(arquivoRede, "utf8"));
}

// Salva a rede no arquivo
function salvarRede() {
  fs.writeFileSync(arquivoRede, JSON.stringify(rede, null, 2));
}

// Endpoint para obter a rede atual
app.get("/rede", (req, res) => {
  res.json(rede);
});

// Endpoint para adicionar um dispositivo à rede
app.post("/rede/dispositivo", (req, res) => {
  const { tipo, ip, x, y } = req.body;

  if (!tipo || !ip || x === undefined || y === undefined) {
    return res.status(400).json({ erro: "Dados inválidos" });
  }

  if (!rede[x]) rede[x] = [];
  rede[x][y] = { tipo, ip };
  salvarRede();
  res.json({ mensagem: "Dispositivo adicionado com sucesso" });
});

// Endpoint para enviar pacotes
app.post("/rede/pacote", (req, res) => {
  const { origem, destino } = req.body;

  if (
    !origem ||
    !destino ||
    origem.x === undefined ||
    origem.y === undefined ||
    destino.x === undefined ||
    destino.y === undefined
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

  // Obter os IPs
  const ipOrigem = dispositivoOrigem.ip;
  const ipDestino = dispositivoDestino.ip;

  // Verificar se estão na mesma sub-rede (comparam os 3 primeiros octetos)
  const subredeOrigem = ipOrigem.split(".").slice(0, 3).join(".");
  const subredeDestino = ipDestino.split(".").slice(0, 3).join(".");

  if (subredeOrigem === subredeDestino) {
    return res.json({
      mensagem: "Pacote enviado com sucesso diretamente. Mesma sub-rede.",
    });
  }

  // Caso não estejam na mesma sub-rede
  res.status(400).json({
    erro: "Os dispositivos não estão na mesma sub-rede. Comunicação direta não é possível.",
  });
});

// Endpoint para limpar a rede
app.delete("/rede", (req, res) => {
  rede = [];
  salvarRede();
  res.json({ mensagem: "Rede limpa com sucesso" });
});

app.listen(PORT, () => {
  console.log(`Servidor disponível em http://localhost:${PORT}`);
});
