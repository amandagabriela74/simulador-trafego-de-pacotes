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
  const { tipo, ip, mascara, x, y } = req.body;

  if (!tipo || !ip || !mascara || x === undefined || y === undefined) {
    return res.status(400).json({ erro: "Dados inválidos" });
  }

  if (!rede[x]) rede[x] = [];
  rede[x][y] = { tipo, ip, mascara };
  salvarRede();
  res.json({ mensagem: "Dispositivo adicionado com sucesso" });
});

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

// Endpoint para limpar a rede
app.delete("/rede", (req, res) => {
  rede = [];
  salvarRede();
  res.json({ mensagem: "Rede limpa com sucesso" });
});

app.listen(PORT, () => {
  console.log(`Servidor disponível em http://localhost:${PORT}`);
});
