const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(bodyParser.json());
app.use(cors());

const PORT = 3000;

// Carrega a rede salva (se existir)
let rede = [];
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

// Endpoint para limpar a rede
app.delete("/rede", (req, res) => {
  rede = [];
  salvarRede();
  res.json({ mensagem: "Rede limpa com sucesso" });
});

app.listen(PORT, () => {
    console.log(`Servidor disponível em http://localhost:${PORT}`);
});
