// Adicione junto às outras variáveis globais no topo do script
const logoBrancaPdf = new Image();
logoBrancaPdf.src = "coco-and-luna-logo-branco.png";

let anexosData = [];
let configGlobal = {
  mercados: [],
  narradores: [],
  formatos: [],
  temas: [],
  ganchos: [],
};
let expandedCategories = {
  mercados: false,
  narradores: false,
  formatos: false,
  temas: false,
  ganchos: false,
};
let todosRoteirosCache = [];
let edicaoAtual = null;

let cenasLocais = [];

const sidebar = document.getElementById("sidebar");
const resizer = document.getElementById("sidebarResizer");
let isResizing = false;
let lastSidebarWidth = 340;

resizer.addEventListener("mousedown", (e) => {
  isResizing = true;
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  resizer.classList.add("active");
});

document.addEventListener("mousemove", (e) => {
  if (!isResizing) return;
  if (sidebar.classList.contains("collapsed")) return;
  let newWidth = e.clientX;
  if (newWidth < 220) newWidth = 220;
  if (newWidth > 600) newWidth = 600;
  sidebar.style.width = newWidth + "px";
  lastSidebarWidth = newWidth;
});

document.addEventListener("mouseup", () => {
  if (isResizing) {
    isResizing = false;
    document.body.style.cursor = "default";
    document.body.style.userSelect = "auto";
    resizer.classList.remove("active");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  carregarConfiguracoes();
  carregarHistorico();
  inicializarCenasPadrao();

  document
    .getElementById("anexoInput")
    .addEventListener("change", async function (e) {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      let warningShown = false;
      for (let file of files) {
        if (file.size > 10 * 1024 * 1024 && !warningShown) {
          Swal.fire(
            "Aviso",
            "Um ou mais ficheiros excedem 10MB. Isto pode causar lentidão na resposta.",
            "warning",
          );
          warningShown = true;
        }
        const base64 = await lerArquivoBase64(file);
        anexosData.push({
          nome: file.name,
          tipo: file.type,
          base64: base64,
        });
      }
      renderAnexosPreview();
      this.value = "";
    });
});

function toggleDarkModeGlobal() {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  document.getElementById("txtModo").innerText = isDark
    ? "Modo Claro"
    : "Modo Escuro";
}

function toggleLargura() {
  const container = document.getElementById("mainContainer");
  container.classList.toggle("expanded");
  const isExpanded = container.classList.contains("expanded");
  document.getElementById("txtLargura").innerText = isExpanded
    ? "Contrair tela"
    : "Expandir tela";
}

function lerArquivoBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

function renderAnexosPreview() {
  const preview = document.getElementById("anexoPreview");
  preview.innerHTML = "";
  if (anexosData.length === 0) {
    preview.classList.add("d-none");
    return;
  }
  preview.classList.remove("d-none");

  anexosData.forEach((anexo, index) => {
    const div = document.createElement("div");
    div.className =
      "p-3 bg-white border rounded d-flex justify-content-between align-items-center shadow-sm";
    div.innerHTML = `
              <div class="text-truncate" style="max-width: 80%;">
                  <strong class="text-brand-blue">📄 Anexo:</strong> 
                  <span class="text-dark">${anexo.nome}</span>
              </div> 
              <button type="button" class="btn btn-sm btn-panel py-1 px-3 text-danger bg-transparent" onclick="removerAnexo(${index})">Remover</button>
          `;
    preview.appendChild(div);
  });
}

function removerAnexo(index) {
  anexosData.splice(index, 1);
  renderAnexosPreview();
}

function toggleMenuMobile() {
  document.getElementById("sidebar").classList.toggle("active");
  document.getElementById("overlay").classList.toggle("active");
}

function toggleSidebarCollapse() {
  sidebar.classList.toggle("collapsed");
  if (sidebar.classList.contains("collapsed")) {
    sidebar.style.width = "80px";
  } else {
    sidebar.style.width = lastSidebarWidth + "px";
  }
}

async function carregarConfiguracoes() {
  try {
    const res = await fetch("/api/configuracoes");
    configGlobal = await res.json();
    preencherSelectMisturado("mercado", configGlobal.mercados);
    preencherSelectMisturado("narrador", configGlobal.narradores);
    preencherSelectMisturado("formato", configGlobal.formatos);
    preencherSelectMisturado("tema", configGlobal.temas);
    preencherSelectMisturado("gancho", configGlobal.ganchos);
    renderizarListasDeEdicao();
  } catch (err) {}
}

function renderizarListasDeEdicao() {
  ["mercados", "narradores", "formatos", "temas", "ganchos"].forEach(
    (cat) => atualizarDOMLista(cat),
  );
}

function atualizarDOMLista(categoria) {
  const array = configGlobal[categoria] || [];
  const container = document.getElementById(
    `lista${categoria.charAt(0).toUpperCase() + categoria.slice(1)}`,
  );
  const isExpanded = expandedCategories[categoria];
  const limit = 3;
  let html = "";

  if (array.length === 0) {
    container.innerHTML =
      '<div class="p-3 mt-2 text-muted small text-center bg-light border rounded">Nenhum registo encontrado.</div>';
    return;
  }

  if (isExpanded) {
    html += `<div class="mb-2 mt-2"><input type="text" class="form-control form-control-sm" placeholder="Buscar em ${categoria}..." onkeyup="filtrarListaDOM(this, 'items-${categoria}')"></div>`;
  }

  html += `<div class="${isExpanded ? "rounded border p-1 bg-light mt-2" : "mt-2"}" style="${isExpanded ? "max-height: 250px; overflow-y: auto;" : ""}">`;

  array.forEach((item, index) => {
    const partes = item.split(" — ");
    const titulo = partes[0];
    const explicacao = partes[1]
      ? `<span class="d-block text-muted mt-1" style="font-size: 0.8rem;">${partes[1]}</span>`
      : "";
    const hideClass = !isExpanded && index >= limit ? "d-none" : "";

    html += `
              <div class="p-3 bg-white mb-2 rounded border items-${categoria} ${hideClass}" data-search="${item.toLowerCase()}">
                  <div class="text-truncate w-100 mb-2">
                      <strong class="text-brand-blue" style="font-size: 0.95rem;">${titulo}</strong>
                      ${explicacao}
                  </div>
                  <div class="d-flex gap-2 justify-content-end">
                      <button class="btn btn-sm btn-panel py-1 px-3 bg-transparent" onclick="prepararEdicao('${categoria}', ${index})" title="Editar">Editar</button>
                      <button class="btn btn-sm btn-danger py-1 px-3 fw-bold text-nowrap" onclick="removerItemPersonalizado('${categoria}', ${index})" title="Excluir">Excluir</button>
                  </div>
              </div>
          `;
  });
  html += `</div>`;

  if (array.length > limit) {
    if (!isExpanded) {
      html += `<button class="btn btn-sm btn-panel w-100 mt-2 bg-transparent" onclick="toggleExpandir('${categoria}', true)">Exibir todos (${array.length})</button>`;
    } else {
      html += `<button class="btn btn-sm btn-panel w-100 mt-2 bg-transparent" onclick="toggleExpandir('${categoria}', false)">Ocultar lista</button>`;
    }
  }
  container.innerHTML = html;
}

function prepararEdicao(categoria, index) {
  const item = configGlobal[categoria][index];
  const partes = item.split(" — ");

  document.getElementById("novoTipo").value = categoria;
  document.getElementById("novoTitulo").value = partes[0];
  document.getElementById("novaExplicacao").value = partes[1] || "";

  edicaoAtual = { categoria, index };

  document.getElementById("tituloFormOpcao").innerHTML =
    "Editar Variável";
  const btnInserir = document.getElementById("btnInserirOpcao");
  btnInserir.textContent = "Atualizar";
  document
    .getElementById("areaFormNovaOpcao")
    .scrollIntoView({ behavior: "smooth" });
}

function toggleExpandir(categoria, state) {
  expandedCategories[categoria] = state;
  atualizarDOMLista(categoria);
}

function filtrarListaDOM(input, itemClass) {
  const termo = input.value.toLowerCase();
  const items = document.querySelectorAll(`.${itemClass}`);
  items.forEach((el) => {
    if (el.getAttribute("data-search").includes(termo)) {
      el.classList.remove("d-none");
      el.classList.add("d-block");
    } else {
      el.classList.remove("d-block");
      el.classList.add("d-none");
    }
  });
}

function preencherSelectMisturado(id, array) {
  const select = document.getElementById(id);
  if (!select) return;
  let optgroup = select.querySelector("optgroup.novas-opcoes");

  if (!optgroup) {
    optgroup = document.createElement("optgroup");
    optgroup.label = "Banco de Dados";
    optgroup.className = "novas-opcoes text-brand-blue";
    select.appendChild(optgroup);
  }
  optgroup.innerHTML = "";
  array.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item.split(" — ")[0];
    optgroup.appendChild(opt);
  });
}

function adicionarNovoItem() {
  const categoria = document.getElementById("novoTipo").value;
  const titulo = document.getElementById("novoTitulo").value.trim();
  const explicacao = document
    .getElementById("novaExplicacao")
    .value.trim();

  if (!titulo) {
    Swal.fire("Atenção", "O Título é obrigatório.", "warning");
    return;
  }

  const itemFinal = explicacao ? `${titulo} — ${explicacao}` : titulo;

  if (edicaoAtual) {
    if (edicaoAtual.categoria !== categoria) {
      configGlobal[edicaoAtual.categoria].splice(edicaoAtual.index, 1);
      configGlobal[categoria].push(itemFinal);
    } else {
      configGlobal[categoria][edicaoAtual.index] = itemFinal;
    }

    edicaoAtual = null;
    document.getElementById("tituloFormOpcao").innerHTML =
      "Adicionar Nova Variável";
    document.getElementById("btnInserirOpcao").textContent = "Inserir";
    salvarConfiguracoes(true, "Registo Atualizado");
  } else {
    configGlobal[categoria].push(itemFinal);
    salvarConfiguracoes(true, "Registo Adicionado");
  }

  document.getElementById("novoTitulo").value = "";
  document.getElementById("novaExplicacao").value = "";
}

async function removerItemPersonalizado(categoria, index) {
  const valor = configGlobal[categoria][index];
  await fetch("/api/lixeira", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categoria, valor }),
  });

  configGlobal[categoria].splice(index, 1);
  await salvarConfiguracoes(false);
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "info",
    title: "Enviado para a lixeira",
    showConfirmButton: false,
    timer: 2000,
  });
}

async function salvarConfiguracoes(
  mostrarAviso = false,
  mensagem = "Concluído",
) {
  try {
    await fetch("/api/configuracoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(configGlobal),
    });
    await carregarConfiguracoes();
    if (mostrarAviso)
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: mensagem,
        showConfirmButton: false,
        timer: 2000,
      });
  } catch (err) {}
}

function abrirConfiguracoes() {
  document.getElementById("painelCriacao").classList.add("d-none");
  document.getElementById("painelLixeira").classList.add("d-none");
  document.getElementById("resultadoContainer").classList.add("d-none");
  document.getElementById("painelRevisao").classList.add("d-none");
  document.getElementById("painelEstruturador").classList.add("d-none");
  document
    .getElementById("painelConfiguracoes")
    .classList.remove("d-none");
  if (window.innerWidth <= 768) toggleMenuMobile();
}

async function abrirLixeira() {
  document.getElementById("painelConfiguracoes").classList.add("d-none");
  document.getElementById("painelLixeira").classList.remove("d-none");
  await carregarLixeira();
}

async function carregarLixeira() {
  const res = await fetch("/api/lixeira");
  const itens = await res.json();
  const container = document.getElementById("listaLixeira");
  container.innerHTML = "";

  if (itens.length === 0) {
    container.innerHTML =
      '<div class="p-5 text-center text-muted border rounded bg-light">A sua lixeira está vazia.</div>';
    return;
  }

  itens.forEach((item) => {
    const diffTempos = new Date() - new Date(item.dataExclusao);
    const diasPassados = Math.floor(diffTempos / (1000 * 60 * 60 * 24));
    const diasRestantes = 10 - diasPassados;

    container.innerHTML += `
              <div class="list-group-item d-flex justify-content-between align-items-center bg-white mb-3 border rounded p-4">
                  <div>
                      <span class="badge bg-dark mb-2 px-2 py-1">${item.categoria.toUpperCase()}</span>
                      <strong class="d-block text-dark fs-6">${item.valor.split(" — ")[0]}</strong>
                      <span class="text-danger fw-bold d-block mt-1" style="font-size: 0.8rem;">Autolimpeza em ${diasRestantes} dias</span>
                  </div>
                  <div class="d-flex gap-2">
                      <button class="btn btn-sm btn-panel px-3 py-2 bg-transparent" onclick="restaurarItemLixeira('${item._id}')">Restaurar</button>
                      <button class="btn btn-sm btn-danger fw-bold px-3 py-2" onclick="excluirPermanente('${item._id}')">Apagar</button>
                  </div>
              </div>
          `;
  });
}

async function restaurarItemLixeira(id) {
  await fetch(`/api/lixeira/restaurar/${id}`, { method: "POST" });
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title: "Restaurado com sucesso",
    showConfirmButton: false,
    timer: 1500,
  });
  await carregarConfiguracoes();
  await carregarLixeira();
}

async function excluirPermanente(id) {
  await fetch(`/api/lixeira/${id}`, { method: "DELETE" });
  await carregarLixeira();
}

function gerarAleatorio() {
  const selects = ["narrador", "formato", "tema", "gancho"];
  selects.forEach((id) => {
    const el = document.getElementById(id);
    const options = Array.from(el.options).filter(
      (o) => !o.disabled && o.value !== "",
    );
    if (options.length > 0)
      el.value =
        options[Math.floor(Math.random() * options.length)].value;
  });
  if (
    !document.getElementById("painelRevisao").classList.contains("d-none")
  )
    revisarPedido();
}

function getSelectedText(id) {
  const sel = document.getElementById(id);
  if (!sel || sel.selectedIndex === -1) return "";
  return sel.options[sel.selectedIndex].text;
}

function revisarPedido() {
  let anexosHtml = "";
  if (anexosData.length > 0) {
    anexosHtml =
      '<div class="mt-4 pt-3 border-top"><strong class="text-brand-blue d-block mb-2">Ficheiros Anexados:</strong>';
    anexosData.forEach((a) => {
      anexosHtml += `<div class="text-dark small mb-1">• ${a.nome}</div>`;
    });
    anexosHtml += "</div>";
  }

  const resumo = `
          <div class="mb-3"><strong class="text-muted text-uppercase small">Mercado</strong><br><span class="text-dark fw-bold">${getSelectedText("mercado")}</span></div>
          <div class="mb-3"><strong class="text-muted text-uppercase small">Narrador</strong><br><span class="text-dark fw-bold">${getSelectedText("narrador")}</span></div>
          <div class="mb-3"><strong class="text-muted text-uppercase small">Formato</strong><br><span class="text-dark fw-bold">${getSelectedText("formato")}</span></div>
          <div class="mb-3"><strong class="text-muted text-uppercase small">Tema Principal</strong><br><span class="text-brand-blue fw-bold">${getSelectedText("tema")}</span></div>
          <div class="mb-3"><strong class="text-muted text-uppercase small">Gancho</strong><br><span class="text-dark fw-bold">${getSelectedText("gancho")}</span></div>
          ${anexosHtml}
      `;
  document.getElementById("resumoCombinacao").innerHTML = resumo;
  document.getElementById("painelCriacao").classList.add("d-none");
  document.getElementById("painelRevisao").classList.remove("d-none");
}

function voltarEdicao() {
  document.getElementById("painelRevisao").classList.add("d-none");
  document.getElementById("painelCriacao").classList.remove("d-none");
}

async function confirmarEnvio() {
  const dados = {
    mercado: document.getElementById("mercado").value,
    narrador: document.getElementById("narrador").value,
    formato: document.getElementById("formato").value,
    tema: document.getElementById("tema").value,
    gancho: document.getElementById("gancho").value,
    notas: document.getElementById("notas").value,
    anexos: anexosData,
  };

  document.getElementById("painelRevisao").classList.add("d-none");
  document.getElementById("loading").classList.remove("d-none");

  try {
    const response = await fetch("/api/gerar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    const data = await response.json();

    document.getElementById("resultado").innerHTML = marked.parse(
      data.roteiro,
    );
    document
      .getElementById("resultadoContainer")
      .classList.remove("d-none");

    document.getElementById("filtroDataHistorico").value = "";
    carregarHistorico();
  } catch (error) {
    Swal.fire(
      "Erro",
      "Ocorreu um erro de comunicação com o servidor.",
      "error",
    );
    novaSessao();
  } finally {
    document.getElementById("loading").classList.add("d-none");
  }
}

async function carregarHistorico() {
  try {
    const response = await fetch("/api/historico");
    todosRoteirosCache = await response.json();
    renderizarHistorico(todosRoteirosCache);
  } catch (e) {}
}

function renderizarHistorico(roteirosBrutos) {
  const dataFiltro = document.getElementById("filtroDataHistorico").value;
  let roteirosFiltrados = roteirosBrutos;

  if (dataFiltro) {
    roteirosFiltrados = roteirosBrutos.filter((rot) => {
      const dataRot = new Date(rot.dataCriacao);
      const dataRotString = new Date(
        dataRot.getTime() - dataRot.getTimezoneOffset() * 60000,
      )
        .toISOString()
        .split("T")[0];
      return dataRotString === dataFiltro;
    });
  }

  const lista = document.getElementById("listaHistorico");
  lista.innerHTML = "";

  if (roteirosFiltrados.length === 0) {
    lista.innerHTML =
      '<div class="p-4 text-center text-muted small">Nenhum registo encontrado.</div>';
    return;
  }

  roteirosFiltrados.forEach((rot) => {
    const div = document.createElement("div");
    div.className = "historico-item bg-white border shadow-sm";
    div.onclick = () => {
      exibirRoteiroSalvo(rot);
      if (window.innerWidth <= 768) toggleMenuMobile();
    };
    const tituloCurto = rot.tema.split(" — ")[0];
    div.innerHTML = `
              <div class="historico-titulo text-truncate" title="${tituloCurto}">${tituloCurto}</div>
              <div class="historico-data hide-on-collapse">${new Date(rot.dataCriacao).toLocaleString("pt-BR")} • ${rot.mercado.split(" — ")[0]}</div>
          `;
    lista.appendChild(div);
  });
}

function exibirRoteiroSalvo(rot) {
  document.getElementById("painelCriacao").classList.add("d-none");
  document.getElementById("painelRevisao").classList.add("d-none");
  document.getElementById("painelConfiguracoes").classList.add("d-none");
  document.getElementById("painelLixeira").classList.add("d-none");
  document.getElementById("painelEstruturador").classList.add("d-none");
  document
    .getElementById("resultadoContainer")
    .classList.remove("d-none");

  document.getElementById("resultado").innerHTML = marked.parse(
    rot.conteudo,
  );
  document.getElementById("resultadoTitulo").innerText =
    "Roteiro Guardado";
}

function novaSessao() {
  document.getElementById("resultadoContainer").classList.add("d-none");
  document.getElementById("painelRevisao").classList.add("d-none");
  document.getElementById("painelConfiguracoes").classList.add("d-none");
  document.getElementById("painelLixeira").classList.add("d-none");
  document.getElementById("painelEstruturador").classList.add("d-none");
  document.getElementById("painelCriacao").classList.remove("d-none");
  document.getElementById("formRoteiro").reset();

  anexosData = [];
  renderAnexosPreview();
  inicializarCenasPadrao();

  edicaoAtual = null;
  document.getElementById("resultadoTitulo").innerText =
    "Briefing Finalizado";
  if (
    window.innerWidth <= 768 &&
    document.getElementById("sidebar").classList.contains("active")
  )
    toggleMenuMobile();
}

function copiarTexto() {
  navigator.clipboard
    .writeText(document.getElementById("resultado").innerText)
    .then(() => {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Copiado para a área de transferência",
        showConfirmButton: false,
        timer: 1500,
      });
    });
}

// ==========================================
// EXPORTAÇÃO PDF ORIGINAL DA IA
// ==========================================
function exportarPDF() {
  const opt = {
    margin: [15, 15, 15, 15],
    filename: "Roteiro_CocoAndLuna_IA.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };
  html2pdf().set(opt).from(document.getElementById("resultado")).save();
}

// ==========================================
// ESTRUTURADOR DE CENAS TÉCNICAS E PDF jsPDF
// ==========================================
function abrirEstruturadorCompleto() {
  document.getElementById("painelCriacao").classList.add("d-none");
  document.getElementById("painelRevisao").classList.add("d-none");
  document.getElementById("resultadoContainer").classList.add("d-none");
  document.getElementById("painelConfiguracoes").classList.add("d-none");
  document.getElementById("painelLixeira").classList.add("d-none");
  document.getElementById("painelEstruturador").classList.remove("d-none");
  if (window.innerWidth <= 768) toggleMenuMobile();
}

function inicializarCenasPadrao() {
  cenasLocais = [];
  for (let i = 0; i < 6; i++) {
    cenasLocais.push({
      id: Date.now() + i,
      narracao: "",
      lettering: "",
      destaques: "",
      descricao: "",
      audio: "",
    });
  }
  renderizarCenasNoDOM();
}

function renderizarCenasNoDOM() {
  const container = document.getElementById("containerCenasEstruturadas");
  container.innerHTML = "";

  cenasLocais.forEach((cena, idx) => {
    const htmlBlock = `
              <div class="sc-box shadow-sm mb-3" id="cena_bloco_${cena.id}">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                      <div>
                          <span class="sc-number">${idx + 1}</span>
                          <strong class="text-uppercase tracking-wider small text-muted">Cena Técnica</strong>
                      </div>
                      <button type="button" class="btn btn-sm text-danger border-0 p-1 fw-bold bg-transparent" onclick="excluirCenaEspecifica(${cena.id})">✕ Remover</button>
                  </div>
                  <div class="row g-2">
                      <div class="col-md-4">
                          <label class="form-label small text-muted mb-1">Narração / Áudio de Voz</label>
                          <textarea class="form-control form-control-sm" rows="3" onchange="atualizarCampoCena(${cena.id}, 'narracao', this.value)" placeholder="O que é dito ou dublado...">${cena.narracao}</textarea>
                      </div>
                      <div class="col-md-2">
                          <label class="form-label small text-muted mb-1">Lettering / Texto em Tela</label>
                          <textarea class="form-control form-control-sm" rows="3" onchange="atualizarCampoCena(${cena.id}, 'lettering', this.value)" placeholder="Texto escrito...">${cena.lettering}</textarea>
                      </div>
                      <div class="col-md-2">
                          <label class="form-label small text-muted mb-1">Palavras Destaque</label>
                          <textarea class="form-control form-control-sm" rows="3" onchange="atualizarCampoCena(${cena.id}, 'destaques', this.value)" placeholder="Grifos, emojis...">${cena.destaques}</textarea>
                      </div>
                      <div class="col-md-2">
                          <label class="form-label small text-muted mb-1">Descrição Visual / Takes</label>
                          <textarea class="form-control form-control-sm" rows="3" onchange="atualizarCampoCena(${cena.id}, 'descricao', this.value)" placeholder="Ação da cena...">${cena.descricao}</textarea>
                      </div>
                      <div class="col-md-2">
                          <label class="form-label small text-muted mb-1">Trilha / Efeitos Sonoros</label>
                          <textarea class="form-control form-control-sm" rows="3" onchange="atualizarCampoCena(${cena.id}, 'audio', this.value)" placeholder="SFX, música de fundo...">${cena.audio}</textarea>
                      </div>
                  </div>
              </div>
          `;
    container.insertAdjacentHTML("beforeend", htmlBlock);
  });
}

function atualizarCampoCena(id, campo, valor) {
  const index = cenasLocais.findIndex((c) => c.id === id);
  if (index !== -1) cenasLocais[index][campo] = valor;
}

function adicionarCenaPainel() {
  cenasLocais.push({
    id: Date.now() + Math.random(),
    narracao: "",
    lettering: "",
    destaques: "",
    descricao: "",
    audio: "",
  });
  renderizarCenasNoDOM();
}

function removerUltimaCenaPainel() {
  if (cenasLocais.length <= 1) return;
  cenasLocais.pop();
  renderizarCenasNoDOM();
}

function excluirCenaEspecifica(id) {
  if (cenasLocais.length <= 1) return;
  cenasLocais = cenasLocais.filter((c) => c.id !== id);
  renderizarCenasNoDOM();
}

function calcularBadgePrazo() {
  const campoData = document.getElementById("est_prazo").value;
  const containerBadge = document.getElementById("est_badge_prazo");
  if (!campoData) {
    containerBadge.innerHTML = "";
    return;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataPrazo = new Date(campoData + "T00:00:00");
  const diffDias = Math.ceil((dataPrazo - hoje) / 86400000);

  let label = "";
  let color = "";
  if (diffDias < 0) {
    label = `VENCIDO (${Math.abs(diffDias)} dias)`;
    color = "#EF4444";
  } else if (diffDias === 0) {
    label = "HOJE";
    color = "#EF4444";
  } else if (diffDias <= 7) {
    label = `ESTA SEMANA (${diffDias} dias)`;
    color = "#D97706";
  } else {
    label = `LONGO PRAZO (${diffDias} dias)`;
    color = "#38BDF8";
  }

  containerBadge.innerHTML = `<span class="badge py-2 px-3 fw-bold" style="background-color: ${color}; color: #fff;">${label}</span>`;
}

// FUNÇÃO PARA CONVERTER IMAGEM DO DOM EM BASE64
function getBase64FromImg(imgElement) {
  const canvas = document.createElement("canvas");
  canvas.width = imgElement.naturalWidth;
  canvas.height = imgElement.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(imgElement, 0, 0);
  return canvas.toDataURL("image/png");
}

function exportarPDFEstruturado() {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = margin;

    const assegurarEspaco = (needed) => {
      if (y + needed > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    };

    doc.setFillColor(43, 95, 237);
    doc.rect(0, 0, pageW, 26, "F");
    doc.setTextColor(255, 255, 255);

    // Tratamento da Imagem da Logo no PDF via Canvas mantendo proporção
    const logoImg = logoBrancaPdf; // Agora utiliza a logo branca carregada globalmente
    let logoAdicionada = false;
    if (logoImg && logoImg.complete && logoImg.naturalHeight !== 0) {
      try {
        const logoBase64 = getBase64FromImg(logoImg);
        
        // Calcula a proporção exata da sua imagem para não achatar
        const proporcao = logoImg.naturalWidth / logoImg.naturalHeight;
        const alturaLogo = 10; // Altura em mm
        const larguraLogo = alturaLogo * proporcao; // Largura calculada automaticamente
        
        // Aqui inserimos a imagem com as dimensões dinâmicas
        doc.addImage(logoBase64, "PNG", margin, 5, larguraLogo, alturaLogo);
        logoAdicionada = true;
      } catch (e) {
        console.warn("Erro ao processar imagem para PDF", e);
      }
    }

    if (!logoAdicionada) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("COCO AND LUNA", margin, 12);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Roteiro de Vídeo", margin, 20);

    doc.setFontSize(8.5);
    doc.text(
      "Direção de Conteúdo e Produção Audiovisual",
      pageW - margin - 65,
      15,
    );
    y = 36;

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Roteiro de Vídeo", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Criado em: ${new Date().toLocaleDateString("pt-BR")}`,
      margin,
      y,
    );
    y += 10;

    const imprimirDuasColunas = (l1, v1, l2, v2) => {
      const colW = (contentW - 6) / 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(l1.toUpperCase(), margin, y);
      doc.text(l2.toUpperCase(), margin + colW + 6, y);
      y += 4.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      const l1Lines = doc.splitTextToSize(v1 || "—", colW);
      const l2Lines = doc.splitTextToSize(v2 || "—", colW);
      const maxH = Math.max(l1Lines.length, l2Lines.length) * 4.5;
      assegurarEspaco(maxH + 6);
      doc.text(l1Lines, margin, y);
      doc.text(l2Lines, margin + colW + 6, y);
      y += maxH + 4;
    };

    doc.setFillColor(235, 243, 254);
    doc.rect(margin, y, contentW, 7, "F");
    doc.setTextColor(43, 95, 237);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("1. METADADOS E ALVO DO PROJETO", margin + 3, y + 5);
    y += 12;
    
    // Formatação correta da data do prazo (DD/MM/YYYY)
    const rawPrazo = document.getElementById("est_prazo").value;
    const formatPrazo = rawPrazo ? rawPrazo.split('-').reverse().join('/') : "Não informado";

    imprimirDuasColunas(
      "Tema do Vídeo",
      document.getElementById("est_tema").value,
      "Objetivo Narrativo",
      document.getElementById("est_objetivo").value ||
        "Geral / Corporativo",
    );
    imprimirDuasColunas(
      "Estilo Audiovisual",
      document.getElementById("est_estilo").value,
      "Formato / Proporção",
      document.getElementById("est_formato").value,
    );
    imprimirDuasColunas(
      "Canais de Distribuição",
      document.getElementById("est_veiculacao").value,
      "Narrador Principal",
      document.getElementById("est_narrador").value,
    );
    imprimirDuasColunas(
      "Tempo Previsto",
      document.getElementById("est_tempo").value,
      "Data Limite (Prazo)",
      formatPrazo,
    );

    let txtPaises = [];
    if (document.getElementById("est_br").checked)
      txtPaises.push("Brasil");
    if (document.getElementById("est_eua").checked) txtPaises.push("EUA");
    imprimirDuasColunas(
      "Países de Veiculação",
      txtPaises.join(", "),
      "",
      "",
    );

    y += 4;
    assegurarEspaco(15);
    doc.setFillColor(235, 243, 254);
    doc.rect(margin, y, contentW, 7, "F");
    doc.setTextColor(43, 95, 237);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("2. CRONOGRAMA DE PRODUÇÃO POR CENAS", margin + 3, y + 5);
    y += 12;

    cenasLocais.forEach((cena, i) => {
      const campos = [
        ["Narração/Voz", cena.narracao],
        ["Lettering", cena.lettering],
        ["Grifos/Destaques", cena.destaques],
        ["Cena/Visual", cena.descricao],
        ["Trilha/Áudio", cena.audio],
      ];

      let alturaBloco = 8;
      campos.forEach(([, val]) => {
        const lines = doc.splitTextToSize(val || "—", contentW - 10);
        alturaBloco += 3.8 + lines.length * 4.2;
      });

      assegurarEspaco(alturaBloco + 6);

      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentW, 6, "F");
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`TOMADA / CENA ${i + 1}`, margin + 3, y + 4.5);
      y += 10;

      campos.forEach(([rotulo, valor]) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(rotulo.toUpperCase(), margin + 3, y);
        y += 3.5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        const wrapLines = doc.splitTextToSize(valor || "—", contentW - 8);
        doc.text(wrapLines, margin + 3, y);
        y += wrapLines.length * 4.2 + 2.5;
      });
      y += 2;
    });

    const obs = document.getElementById("est_observacao").value;
    if (obs) {
      assegurarEspaco(25);
      y += 4;
      doc.setFillColor(254, 242, 242);
      doc.rect(margin, y, contentW, 6, "F");
      doc.setTextColor(224, 41, 71);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("OBSERVAÇÕES ADICIONAIS", margin + 3, y + 4.2);
      y += 9;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const wrapObs = doc.splitTextToSize(obs, contentW - 6);
      doc.text(wrapObs, margin + 3, y);
      y += wrapObs.length * 4.5 + 4;
    }

    assegurarEspaco(20);
    imprimirDuasColunas(
      "Gatilho Textual Capa",
      document.getElementById("est_thumb_text").value,
      "Foco de Produção Arte",
      document.getElementById("est_thumb_type").value || "Padrão",
    );

    const totalPages = doc.internal.getNumberOfPages();
    for (let k = 1; k <= totalPages; k++) {
      doc.setPage(k);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Coco and Luna — Roteiro de vídeo |  Página ${k} de ${totalPages}`,
        pageW / 2,
        pageH - margin + 5,
        { align: "center" },
      );
    }

    doc.save(
      `briefing-tecnico-${(document.getElementById("est_tema").value || "producao").toLowerCase().replace(/[^a-z0-9]/gi, "-")}.pdf`,
    );
  } catch (err) {
    Swal.fire(
      "Erro",
      "Houve uma falha no processador jsPDF: " + err.message,
      "error",
    );
  }
}