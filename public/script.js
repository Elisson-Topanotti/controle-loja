document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();

  // Botão novo cliente
  const btnNovoCliente = document.getElementById("novoCliente");
  if (btnNovoCliente) {
    btnNovoCliente.addEventListener("click", () => {
      window.location.href = "/novo-cliente.html";
    });
  }

  // Botão gráfico
  const btnGrafico = document.getElementById("verGrafico");
  if (btnGrafico) {
    btnGrafico.addEventListener("click", () => {
      window.location.href = "/grafico";
    });
  }
});

// Função para abrir modal
function abrirModal(titulo, conteudoHTML, onConfirm) {
  document.getElementById("modal-title").textContent = titulo;
  document.getElementById("modal-body").innerHTML = conteudoHTML;
  document.getElementById("modal").style.display = "block";

  const confirmBtn = document.getElementById("modal-confirm");
  confirmBtn.onclick = () => {
    onConfirm();
    document.getElementById("modal").style.display = "none";
  };

  document.getElementById("modal-close").onclick = () => {
    document.getElementById("modal").style.display = "none";
  };
}

// Função para mostrar toast
function mostrarToast(mensagem, tipo="success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${tipo}`;
  toast.textContent = mensagem;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Função para carregar clientes
function carregarClientes() {
  fetch("/clientes")
    .then(res => res.json())
    .then(clientes => {
      const container = document.getElementById("clientesContainer");
      container.innerHTML = "";

      clientes.forEach(cliente => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <h3>${cliente.nome}</h3>
          <p>CPF: ${cliente.cpf}</p>
          <p>Telefone: ${cliente.telefone}</p>
          <p>Total devido: R$ ${cliente.total_devido.toFixed(2)}</p>
          <p>Pago no mês: R$ ${cliente.pago_mes.toFixed(2)}</p>
          <button class="btn-pagamento">Registrar pagamento</button>
          <button class="btn-alterar">Alterar pagamento</button>
          <button class="btn-excluir">Excluir cliente</button>
          <div class="compras-container">
            <h4>Compras:</h4>
            <table class="tabela-compras">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Valor</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody id="compras-${cliente.id}">
                <tr>
                  <td><input type="text" id="produto-${cliente.id}" placeholder="Produto"></td>
                  <td><input type="number" id="valor-${cliente.id}" placeholder="Valor"></td>
                  <td><input type="date" id="data-${cliente.id}"></td>
                  <td><button class="btn-compra">Salvar</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        `;

        // Excluir cliente
        card.querySelector(".btn-excluir").addEventListener("click", () => {
          abrirModal("Excluir Cliente", `
            <p>Tem certeza que deseja excluir <b>${cliente.nome}</b>?</p>
          `, () => {
            fetch(`/clientes/${cliente.id}`, { method: "DELETE" })
              .then(res => {
                if (!res.ok) throw new Error();
                return res.json();
              })
              .then(() => {
                carregarClientes();
                mostrarToast("Cliente excluído com sucesso!", "success");
              })
              .catch(() => mostrarToast("Erro ao excluir cliente", "error"));
          });
        });

        // Registrar pagamento
        card.querySelector(".btn-pagamento").addEventListener("click", () => {
          abrirModal("Registrar Pagamento", `
            <input type="number" id="valorPagamento" placeholder="Valor" />
          `, () => {
            const valor = parseFloat(document.getElementById("valorPagamento").value);
            if (!isNaN(valor) && valor > 0) {
              fetch(`/clientes/${cliente.id}/pagamento`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ valor })
              })
              .then(() => {
                carregarClientes();
                mostrarToast("Pagamento registrado com sucesso!", "success");
              })
              .catch(() => mostrarToast("Erro ao registrar pagamento", "error"));
            }
          });
        });

        // Alterar pagamento
        card.querySelector(".btn-alterar").addEventListener("click", () => {
          abrirModal("Alterar Pagamento", `
            <input type="number" id="novoValor" placeholder="Novo valor" />
          `, () => {
            const novoValor = parseFloat(document.getElementById("novoValor").value);
            if (!isNaN(novoValor)) {
              fetch(`/clientes/${cliente.id}/pagamento`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ novoValor })
              })
              .then(() => {
                carregarClientes();
                mostrarToast("Pagamento alterado com sucesso!", "success");
              })
              .catch(() => mostrarToast("Erro ao alterar pagamento", "error"));
            }
          });
        });

        // Adicionar compra
        card.querySelector(".btn-compra").addEventListener("click", () => {
          const produto = document.getElementById(`produto-${cliente.id}`).value;
          const valor = parseFloat(document.getElementById(`valor-${cliente.id}`).value);
          const data = document.getElementById(`data-${cliente.id}`).value;

          if (produto && !isNaN(valor) && valor > 0 && data) {
            fetch(`/clientes/${cliente.id}/compras`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ produto, valor, data })
            })
            .then(() => {
              carregarClientes();
              mostrarToast("Compra adicionada com sucesso!", "success");
            })
            .catch(() => mostrarToast("Erro ao adicionar compra", "error"));
          }
        });

        container.appendChild(card);

        // Carregar compras
        fetch(`/clientes/${cliente.id}/compras`)
          .then(res => res.json())
          .then(compras => {
            const tbody = document.getElementById(`compras-${cliente.id}`);
            compras.forEach(compra => {
              const tr = document.createElement("tr");
              tr.innerHTML = `
                <td>${compra.produto}</td>
                <td>R$ ${compra.valor.toFixed(2)}</td>
                <td>${compra.data}</td>
                <td><button class="btn-excluir">Excluir</button></td>
              `;
              tr.querySelector(".btn-excluir").addEventListener("click", () => {
                abrirModal("Excluir Compra", `
                  <p>Deseja excluir a compra de <b>${compra.produto}</b>?</p>
                `, () => {
                  fetch(`/compras/${compra.id}`, { method: "DELETE" })
                    .then(() => {
                      carregarClientes();
                      mostrarToast("Compra excluída com sucesso!", "success");
                    })
                    .catch(() => mostrarToast("Erro ao excluir compra", "error"));
                });
              });
              tbody.appendChild(tr);
            });
          });
      });
    });
}
