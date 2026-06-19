const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const db = new sqlite3.Database("./loja.db");

app.use(express.json());
app.use(express.static("public"));

// Criar tabelas
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT,
  sobrenome TEXT,
  cpf TEXT,
  telefone TEXT,
  total_devido REAL DEFAULT 0,
  pago_mes REAL DEFAULT 0
)`);

  db.run(`CREATE TABLE IF NOT EXISTS compras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER,
    produto TEXT,
    valor REAL,
    data TEXT,
    FOREIGN KEY(cliente_id) REFERENCES clientes(id)
  )`);
});

// Rotas clientes
app.get("/clientes", (req, res) => {
  db.all("SELECT * FROM clientes", [], (err, rows) => {
    if (err) return res.status(500).send(err);
    res.json(rows);
  });
});

app.post("/clientes", (req, res) => {
  const { nome, sobrenome, cpf, telefone } = req.body;

  if (!nome || !sobrenome || !cpf || !telefone) {
    return res.status(400).send("Todos os campos são obrigatórios");
  }

  db.run("INSERT INTO clientes (nome, sobrenome, cpf, telefone) VALUES (?, ?, ?, ?)",
    [nome, sobrenome, cpf, telefone],
    function(err) {
      if (err) return res.status(500).send(err);
      res.json({ id: this.lastID, nome, sobrenome, cpf, telefone });
    });
});

// Excluir cliente e suas compras
app.delete("/clientes/:id", (req, res) => {
  const clienteId = req.params.id;

  // Primeiro remove compras do cliente
  db.run("DELETE FROM compras WHERE cliente_id = ?", [clienteId], function(err) {
    if (err) return res.status(500).send(err);

    // Depois remove o cliente
    db.run("DELETE FROM clientes WHERE id = ?", [clienteId], function(err) {
      if (err) return res.status(500).send(err);
      res.json({ sucesso: true });
    });
  });
});

// Adicionar compra
app.post("/clientes/:id/compras", (req, res) => {
  const { produto, valor, data } = req.body;
  const clienteId = req.params.id;

  db.run("INSERT INTO compras (cliente_id, produto, valor, data) VALUES (?, ?, ?, ?)",
    [clienteId, produto, valor, data],
    function(err) {
      if (err) return res.status(500).send(err);

      db.run("UPDATE clientes SET total_devido = total_devido + ? WHERE id = ?", [valor, clienteId]);
      res.json({ sucesso: true });
    });
});

// Listar compras de um cliente
app.get("/clientes/:id/compras", (req, res) => {
  db.all("SELECT * FROM compras WHERE cliente_id = ?", [req.params.id], (err, rows) => {
    if (err) return res.status(500).send(err);
    res.json(rows);
  });
});

// Registrar pagamento
app.post("/clientes/:id/pagamento", (req, res) => {
  const { valor } = req.body;

  db.get("SELECT total_devido, pago_mes FROM clientes WHERE id = ?", [req.params.id], (err, cliente) => {
    if (err || !cliente) return res.status(404).send("Cliente não encontrado");

    // Corrige se já estiver negativo
    const totalAtual = cliente.total_devido < 0 ? 0 : cliente.total_devido;

    // Calcula novo total devido sem permitir negativo
    const novoTotal = Math.max(totalAtual - valor, 0);
    const novoPagoMes = cliente.pago_mes + valor;

    db.run("UPDATE clientes SET pago_mes = ?, total_devido = ? WHERE id = ?", 
      [novoPagoMes, novoTotal, req.params.id],
      function(err) {
        if (err) return res.status(500).send(err);
        res.json({ sucesso: true });
      }
    );
  });
});

// Alterar valor do pagamento
app.put("/clientes/:id/pagamento", (req, res) => {
  const { novoValor } = req.body;

  db.get("SELECT total_devido FROM clientes WHERE id = ?", [req.params.id], (err, cliente) => {
    if (err || !cliente) return res.status(404).send("Cliente não encontrado");

    // Corrige se já estiver negativo
    const totalAtual = cliente.total_devido < 0 ? 0 : cliente.total_devido;

    db.run("UPDATE clientes SET pago_mes = ?, total_devido = ? WHERE id = ?", 
      [novoValor, totalAtual, req.params.id],
      function(err) {
        if (err) return res.status(500).send(err);
        res.json({ sucesso: true });
      }
    );
  });
});

// Excluir compra
app.delete("/compras/:id", (req, res) => {
  const compraId = req.params.id;
  db.get("SELECT valor, cliente_id FROM compras WHERE id = ?", [compraId], (err, compra) => {
    if (err || !compra) return res.status(404).send("Compra não encontrada");

    db.run("DELETE FROM compras WHERE id = ?", [compraId]);
    db.run("UPDATE clientes SET total_devido = total_devido - ? WHERE id = ?", [compra.valor, compra.cliente_id]);
    res.json({ sucesso: true });
  });
});

// Página gráfico
app.get("/grafico", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "grafico.html"));
});

app.listen(3000, () => console.log("Servidor rodando em http://localhost:3000"));
