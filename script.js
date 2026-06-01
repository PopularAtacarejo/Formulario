// script.js
// ====== CONFIGURAÇÕES ======
const API_BASE = "https://candidatos.onrender.com";
const FILE_MAX_MB = 5;

// No GitHub Pages, usar caminhos relativos evita bloqueios e erros de URL
const VAGAS_URL = "./vagas.json";
const CANDIDATOS_URL = "./candidatos.json";

const DEFAULT_VAGAS = [
  { nome: "Auxiliar de Limpeza" }, { nome: "Vendedor" }, { nome: "Caixa" },
  { nome: "Estoquista" }, { nome: "Repositor" }, { nome: "Atendente" },
  { nome: "Gerente" }, { nome: "Supervisor" }, { nome: "Operador de Caixa" }
];
const EXPERIENCE_RADIO_NAME = "tem_experiencia";
const MAX_EXPERIENCE_ENTRIES = 10;
const WAKE_POLL_INTERVAL = 5000;
const WAKE_MAX_ATTEMPTS = 12;

// ====== ELEMENTOS DOM ======
const form = document.getElementById("formCurriculo");
const nome = document.getElementById("nome");
const cpf = document.getElementById("cpf");
const telefone = document.getElementById("telefone");
const email = document.getElementById("email");
const cep = document.getElementById("cep");
const cidade = document.getElementById("cidade");
const bairro = document.getElementById("bairro");
const rua = document.getElementById("rua");
const transporte = document.getElementById("transporte");
const vaga = document.getElementById("vaga");
const arquivo = document.getElementById("arquivo");
const temExperienciaRadios = document.querySelectorAll(`input[name="${EXPERIENCE_RADIO_NAME}"]`);
const experiencesSection = document.getElementById("experiencesSection");
const experiencesList = document.getElementById("experiencesList");
const addExperienceBtn = document.getElementById("addExperienceBtn");
const experienceTemplate = document.getElementById("experienceTemplate");

const submitBtn = document.getElementById("submitButton");
const btnText = submitBtn.querySelector(".btn-text");
const spinner = submitBtn.querySelector(".spinner");
const successMsg = document.getElementById("mensagemSucesso");
const errorMsg = document.getElementById("mensagemErro");

const step1Head = document.getElementById("step1Head");
const step2Head = document.getElementById("step2Head");
const step3Head = document.getElementById("step3Head");
const fs1 = document.getElementById("fs1");
const fs2 = document.getElementById("fs2");
const fs3 = document.getElementById("fs3");

// ====== SERVIDOR WAKE ======
let serverAwake = false;
let wakeInterval = null;
let currentWakePromise = null;

// ====== TEMA (TAILWIND) ======
const themeToggle = document.getElementById("themeToggle");
const htmlTag = document.documentElement;

themeToggle.addEventListener("click", () => {
  htmlTag.classList.toggle("dark");
  const isDark = htmlTag.classList.contains("dark");
  themeToggle.querySelector('.fa-moon').classList.toggle('hidden', isDark);
  themeToggle.querySelector('.fa-sun').classList.toggle('hidden', !isDark);
});

// ====== USUÁRIOS ONLINE ======
function simulateOnlineUsers() {
  const onlineEl = document.getElementById('onlineCount');
  let baseUsers = Math.floor(Math.random() * 5) + 8;
  onlineEl.innerText = baseUsers;
  setInterval(() => {
    baseUsers += (Math.floor(Math.random() * 3) - 1);
    if (baseUsers < 2) baseUsers = 2;
    if (baseUsers > 45) baseUsers = 45;
    onlineEl.innerText = baseUsers;
  }, 8000);
}
simulateOnlineUsers();

// ====== MÁSCARAS (IMASK) ======
const cpfMask = IMask(cpf, { mask: "000.000.000-00", lazy: false });
const cepMask = IMask(cep, { mask: "00000-000", lazy: false });
const telefoneMask = IMask(telefone, { mask: [{mask: "(00) 0000-0000"}, {mask: "(00) 00000-0000"}], lazy: false });

const inputCpfConsulta = document.getElementById('consultaCpf');
const inputTelConsulta = document.getElementById('consultaTelefone');
IMask(inputCpfConsulta, { mask: "000.000.000-00" });
IMask(inputTelConsulta, { mask: [{mask: "(00) 0000-0000"}, {mask: "(00) 00000-0000"}] });

// ====== LÓGICA DO MODAL (Buscando e ignorando Cache do GitHub) ======
const btnOpenModal = document.getElementById('btnConsultaCandidatura');
const btnCloseModal = document.getElementById('btnCloseModal');
const modalConsulta = document.getElementById('modalConsulta');
const modalContent = document.getElementById('modalContent');
const formConsulta = document.getElementById('formConsulta');

function toggleModal(show) {
  if (show) {
    modalConsulta.classList.remove('hidden');
    setTimeout(() => {
      modalConsulta.classList.remove('opacity-0');
      modalContent.classList.remove('scale-95');
    }, 10);
  } else {
    modalConsulta.classList.add('opacity-0');
    modalContent.classList.add('scale-95');
    setTimeout(() => {
      modalConsulta.classList.add('hidden');
      formConsulta.reset();
      document.getElementById('resultadoConsulta').classList.add('hidden');
    }, 300);
  }
}

btnOpenModal.addEventListener('click', () => toggleModal(true));
btnCloseModal.addEventListener('click', () => toggleModal(false));
modalConsulta.addEventListener('click', (e) => { if (e.target === modalConsulta) toggleModal(false); });

formConsulta.addEventListener('submit', async (e) => {
  e.preventDefault();
  const txtBtn = document.getElementById('txtBtnConsulta');
  const loadBtn = document.getElementById('loadBtnConsulta');
  const listaCandidaturas = document.getElementById('listaCandidaturas');
  const resultadoArea = document.getElementById('resultadoConsulta');
  
  txtBtn.textContent = "Buscando...";
  loadBtn.classList.remove('hidden');

  try {
    // Parâmetro de quebra de cache para o GitHub Pages sempre trazer a versão atual
    const urlBusca = `${CANDIDATOS_URL}?t=${new Date().getTime()}`;
    const response = await fetch(urlBusca, { cache: "no-store" });
    
    if (!response.ok) throw new Error("Erro ao acessar a base de dados.");
    const todosCandidatos = await response.json();

    const cpfBusca = inputCpfConsulta.value.replace(/\D/g, '');
    const telBusca = inputTelConsulta.value.replace(/\D/g, '');

    const candidaturasUsuario = todosCandidatos.filter(c => {
      const cCpf = (c.cpf || "").replace(/\D/g, '');
      const cTel = (c.telefone || "").replace(/\D/g, '');
      return cCpf === cpfBusca && cTel === telBusca;
    });

    listaCandidaturas.innerHTML = '';
    
    if (candidaturasUsuario.length > 0) {
      candidaturasUsuario.sort((a, b) => new Date(b.enviado_em) - new Date(a.enviado_em));

      candidaturasUsuario.forEach(item => {
        const li = document.createElement('li');
        li.className = "p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex flex-col";
        
        const status = item.status || "Novo";
        const vagaNome = item.vaga || "Vaga não especificada";
        
        let dataInscricaoFormatada = "Data não informada";
        let diasRestantes = 0;
        let habilitadoNovaInscricao = true;

        if (item.enviado_em) {
          const dataEnvio = new Date(item.enviado_em);
          if (!isNaN(dataEnvio)) {
            dataInscricaoFormatada = dataEnvio.toLocaleDateString('pt-BR');
            const hoje = new Date();
            hoje.setHours(0,0,0,0);
            dataEnvio.setHours(0,0,0,0);
            const diferencaTempo = hoje.getTime() - dataEnvio.getTime();
            const diasPassados = Math.floor(diferencaTempo / (1000 * 60 * 60 * 24));
            
            diasRestantes = 90 - diasPassados;
            if (diasRestantes > 0) {
              habilitadoNovaInscricao = false;
            }
          }
        }
        
        let badgeColor = "bg-gray-100 text-gray-800 border-gray-200"; 
        const statusLower = status.toLowerCase();

        if (statusLower === "novo" || statusLower === "não aprovado") {
          badgeColor = "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50";
        } else if (statusLower === "em análise") {
          badgeColor = "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/50";
        } else if (statusLower === "aprovado" || statusLower === "contratado") {
          badgeColor = "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50";
        }

        let avisoDias = '';
        if (!habilitadoNovaInscricao) {
          avisoDias = `
            <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400">
               <i class="fas fa-clock animate-pulse"></i> Nova candidatura liberada em: ${diasRestantes} dias
            </div>`;
        } else {
          avisoDias = `
            <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 text-xs font-semibold text-green-600 dark:text-green-400">
               <i class="fas fa-check-circle"></i> Disponível para nova candidatura
            </div>`;
        }

        li.innerHTML = `
          <div class="flex justify-between items-start w-full">
            <div>
              <p class="font-bold text-gray-800 dark:text-white text-[15px] uppercase">${vagaNome}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium"><i class="far fa-calendar-alt mr-1"></i> Aplicado em: ${dataInscricaoFormatada}</p>
            </div>
            <span class="text-[11px] font-bold px-2.5 py-1 rounded-full border ${badgeColor}">${status}</span>
          </div>
          ${avisoDias}
        `;
        listaCandidaturas.appendChild(li);
      });
    } else {
      listaCandidaturas.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">Nenhuma candidatura encontrada para os dados informados.</p>`;
    }
    resultadoArea.classList.remove('hidden');
  } catch (error) {
    alert("Erro ao consultar candidaturas. Verifique sua conexão ou tente mais tarde.");
    console.error(error);
  } finally {
    txtBtn.textContent = "Buscar";
    loadBtn.classList.add('hidden');
  }
});

// ====== VALIDAÇÃO DE CPF ======
let cpfValidationTimeout = null;
let lastValidatedCpfDigits = '';
let lastCpfValidationResult = null;
const cpfValidationIndicator = document.getElementById('cpfValidationIndicator');

async function validateCPF(cpfValue) {
  const cpfDigits = cpfValue.replace(/\D/g, '');
  if (cpfDigits.length !== 11) { cpf.classList.add('input-invalid'); return false; }
  if (cpfDigits === lastValidatedCpfDigits && lastCpfValidationResult !== null) return lastCpfValidationResult;
  if (cpfValidationTimeout) clearTimeout(cpfValidationTimeout);
  
  cpfValidationIndicator.className = 'cpf-validation-indicator loading absolute right-3 top-1/2 -translate-y-1/2';
  cpf.classList.remove('input-valid', 'input-invalid');

  return new Promise((resolve) => {
    cpfValidationTimeout = setTimeout(async () => {
      try {
        const response = await fetch(`https://scpa-backend.saude.gov.br/public/scpa-usuario/validacao-cpf/${cpfDigits}`, { method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (data === true) {
            cpfValidationIndicator.className = 'cpf-validation-indicator valid absolute right-3 top-1/2 -translate-y-1/2';
            cpf.classList.add('input-valid');
            lastValidatedCpfDigits = cpfDigits; lastCpfValidationResult = true;
            resolve(true);
          } else { throw new Error("CPF Inválido"); }
        } else { throw new Error("Erro na API"); }
      } catch (error) {
        // Se der erro de CORS na validação (comum no Github Pages), deixa a pessoa seguir em frente
        cpfValidationIndicator.className = 'cpf-validation-indicator absolute right-3 top-1/2 -translate-y-1/2 opacity-0';
        cpf.classList.remove('input-valid', 'input-invalid');
        lastValidatedCpfDigits = ''; lastCpfValidationResult = null;
        resolve(true);
      }
    }, 800);
  });
}
cpf.addEventListener('blur', async () => { if(cpf.value.trim() !== '') { await validateCPF(cpf.value); updateSteps(); } });

// ====== VIACEP ======
let cepTimeout;
cep.addEventListener("input", () => {
  clearTimeout(cepTimeout);
  const cepValue = cep.value.replace(/\D/g, "");
  if (cepValue.length < 8) { setAddressFieldsEditable(true); return; }
  
  cepTimeout = setTimeout(async () => {
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepValue}/json/`, { cache: "no-store" });
      const data = await response.json();
      if (!data.erro) {
        cidade.value = data.localidade || ""; bairro.value = data.bairro || ""; rua.value = data.logradouro || "";
        setAddressFieldsEditable(false);
        cidade.classList.add("input-valid"); bairro.classList.add("input-valid"); rua.classList.add("input-valid");
        updateSteps();
      } else { setAddressFieldsEditable(true); }
    } catch (e) { setAddressFieldsEditable(true); }
  }, 800);
});

function setAddressFieldsEditable(editable) {
  [cidade, bairro, rua].forEach(field => { field.readOnly = !editable; });
  if (editable) { cidade.classList.remove("input-valid"); bairro.classList.remove("input-valid"); rua.classList.remove("input-valid"); }
  updateSteps();
}

// ====== CARREGAR VAGAS ======
async function loadVagasFromGitHub() {
  vaga.innerHTML = '<option value="" disabled selected>Carregando...</option>';
  vaga.disabled = true;
  let vagasData = [];
  try {
    const urlBusca = `${VAGAS_URL}?t=${new Date().getTime()}`;
    const response = await fetch(urlBusca, { cache: "no-store" });
    if (response.ok) vagasData = await response.json();
  } catch (e) { console.error(e); }

  const finalVagas = (vagasData || []).length > 0 ? vagasData : DEFAULT_VAGAS;
  vaga.innerHTML = '<option value="" disabled selected>Selecione a vaga...</option>';
  vaga.disabled = false;
  finalVagas.forEach(v => {
    const opt = document.createElement('option');
    opt.value = typeof v === 'string' ? v : v.nome;
    opt.textContent = typeof v === 'string' ? v : v.nome;
    vaga.appendChild(opt);
  });
  updateSteps();
}

// ====== EXPERIÊNCIAS ======
function getSelectedExperienceOption() { return document.querySelector(`input[name="${EXPERIENCE_RADIO_NAME}"]:checked`); }

function areExperiencesValid() {
  const selected = getSelectedExperienceOption();
  if (!selected || selected.value === "Não") return true;
  const cards = experiencesList.querySelectorAll(".experience-card");
  if (!cards.length) return false;
  return Array.from(cards).every(c => Array.from(c.querySelectorAll("input")).every(i => i.value.trim().length > 0));
}

function addExperienceCard() {
  if (experiencesList.children.length >= MAX_EXPERIENCE_ENTRIES) return;
  const clone = experienceTemplate.content.cloneNode(true);
  const card = clone.querySelector(".experience-card");
  card.querySelector(".remove-experience-btn").addEventListener("click", () => {
    card.remove(); updateExperienceVisibility(); updateSteps();
  });
  experiencesList.appendChild(card);
  card.querySelectorAll("input").forEach(i => { i.value = ""; setupFieldValidation(i); });
  updateExperienceVisibility(); updateSteps();
}

function updateExperienceVisibility() {
  const hasExp = getSelectedExperienceOption()?.value === "Sim";
  if (hasExp) {
    experiencesSection.classList.remove("hidden");
    if (experiencesList.children.length === 0) addExperienceCard();
  } else {
    experiencesSection.classList.add("hidden");
    experiencesList.innerHTML = "";
  }
  addExperienceBtn.disabled = !hasExp || experiencesList.children.length >= MAX_EXPERIENCE_ENTRIES;
  
  const cards = experiencesList.querySelectorAll(".experience-card");
  cards.forEach((card, idx) => {
    card.querySelector(".experience-number").textContent = `Experiência ${idx + 1}`;
    card.querySelector(".remove-experience-btn").style.visibility = cards.length === 1 ? "hidden" : "visible";
  });
}
temExperienciaRadios.forEach(r => r.addEventListener('change', () => { updateExperienceVisibility(); updateSteps(); }));
addExperienceBtn.addEventListener('click', addExperienceCard);

// ====== VALIDAÇÃO DO FORMULÁRIO ======
const step1Fields = [nome, cpf, telefone, email];
const step2Fields = [cep, cidade, bairro, rua];
const step3Fields = [transporte, vaga, arquivo];

function isFieldValid(f) {
  if (f.id === 'cpf') return f.value.length === 14 && !f.classList.contains('input-invalid');
  if (f.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim());
  if (f.tagName === 'SELECT') return !!f.value;
  if (f.type === 'file') return !!f.files?.length;
  return f.value.trim().length > 0;
}

function setFieldsetState(fs, enabled) {
  if (enabled) { fs.removeAttribute('disabled'); fs.setAttribute('aria-disabled', 'false'); fs.classList.remove('opacity-50', 'pointer-events-none', 'grayscale'); } 
  else { fs.setAttribute('disabled', ''); fs.setAttribute('aria-disabled', 'true'); fs.classList.add('opacity-50', 'pointer-events-none', 'grayscale'); }
}

function updateSteps() {
  const s1 = step1Fields.every(isFieldValid);
  const s2 = s1 && step2Fields.every(isFieldValid);
  const s3 = s2 && step3Fields.every(isFieldValid) && !!getSelectedExperienceOption() && areExperiencesValid();
  
  setFieldsetState(fs2, s1); setFieldsetState(fs3, s2);
  
  step1Head.className = `step flex-1 text-center relative z-10 mb-4 md:mb-0 ${s1 ? 'done' : 'active'}`;
  step2Head.className = `step flex-1 text-center relative z-10 mb-4 md:mb-0 ${s2 ? 'done' : (s1 ? 'active' : '')}`;
  step3Head.className = `step flex-1 text-center relative z-10 mb-4 md:mb-0 ${s3 ? 'done' : (s2 ? 'active' : '')}`;
  
  submitBtn.disabled = !s3;
}

function setupFieldValidation(f) {
  f.addEventListener(f.type === 'file' ? 'change' : 'input', function() {
    if (this.value.trim() === '') this.classList.remove('input-valid', 'input-invalid');
    else if (isFieldValid(this)) { this.classList.add('input-valid'); this.classList.remove('input-invalid'); }
    else { this.classList.add('input-invalid'); this.classList.remove('input-valid'); }
    updateSteps();
  });
}
[...step1Fields, ...step2Fields, transporte, arquivo, vaga].forEach(setupFieldValidation);

// ====== ENVIO DO FORM ======
function wakeServer() {
  if (currentWakePromise) return currentWakePromise;
  if (serverAwake) return Promise.resolve();
  let attempts = 0;
  currentWakePromise = new Promise((resolve, reject) => {
    const attemptWake = () => {
      attempts++;
      fetch(API_BASE + '/', { method: 'GET', cache: 'no-store' })
        .then(res => { if (res.ok) { serverAwake = true; clearInterval(wakeInterval); resolve(); } else throw new Error('Status não ok'); })
        .catch(() => { if (attempts >= WAKE_MAX_ATTEMPTS) { clearInterval(wakeInterval); serverAwake = false; reject(new Error('Servidor offline')); } });
    };
    attemptWake();
    wakeInterval = setInterval(attemptWake, WAKE_POLL_INTERVAL);
  });
  return currentWakePromise;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  successMsg.classList.add("hidden"); errorMsg.classList.add("hidden");
  
  const file = arquivo.files?.[0];
  if (!file || file.size > FILE_MAX_MB * 1024 * 1024 || !['pdf','doc','docx'].includes(file.name.toLowerCase().split('.').pop())) {
    errorMsg.textContent = "Arquivo inválido (Máx. 5MB, .pdf, .doc, .docx)."; errorMsg.classList.remove("hidden"); return;
  }

  if (!serverAwake) {
    try { await wakeServer(); } catch (err) { errorMsg.textContent = "Servidor offline. Verifique o backend no Render."; errorMsg.classList.remove("hidden"); return; }
  }

  btnText.classList.add("hidden"); spinner.classList.remove("hidden"); submitBtn.disabled = true;

  const formData = new FormData();
  formData.append("nome", nome.value.trim()); formData.append("cpf", cpf.value); formData.append("telefone", telefone.value);
  formData.append("email", email.value.trim().toLowerCase()); formData.append("cep", cep.value); formData.append("cidade", cidade.value);
  formData.append("bairro", bairro.value); formData.append("rua", rua.value); formData.append("transporte", transporte.value);
  formData.append("vaga", vaga.value); formData.append("arquivo", file);
  
  const exp = getSelectedExperienceOption()?.value || "";
  formData.append("tem_experiencia", exp);
  if (exp === "Sim") {
    const experiencias = [];
    experiencesList.querySelectorAll(".experience-card").forEach(c => {
      experiencias.push({
        empresa: c.querySelector('[name="experiencia_empresa[]"]').value, funcao: c.querySelector('[name="experiencia_cargo[]"]').value,
        data_admissao: c.querySelector('[name="experiencia_admissao[]"]').value, data_demissao: c.querySelector('[name="experiencia_demissao[]"]').value
      });
    });
    formData.append("experiencias", JSON.stringify(experiencias));
  }

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 60000);
    const response = await fetch(`${API_BASE}/api/enviar`, { method: "POST", body: formData, signal: controller.signal });
    clearTimeout(id);
    const data = await response.json();
    
    if (response.ok) {
      successMsg.textContent = data?.message || "Enviado com sucesso!"; successMsg.classList.remove("hidden");
      
      form.reset(); 
      setAddressFieldsEditable(true);
      
      cpfMask.value = ""; 
      cepMask.value = ""; 
      telefoneMask.value = "";
      
      document.querySelectorAll('.input-valid, .input-invalid').forEach(el => el.classList.remove('input-valid', 'input-invalid'));
      temExperienciaRadios.forEach(r => r.checked = false); updateExperienceVisibility(); updateSteps();
      successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else { throw new Error(data?.detail || "Erro no envio."); }
  } catch (err) {
    errorMsg.textContent = err.message || "Erro de conexão. A API backend recusou a conexão (Possível erro de CORS)."; errorMsg.classList.remove("hidden");
  } finally {
    btnText.classList.remove("hidden"); spinner.classList.add("hidden"); updateSteps();
  }
});

// ====== INIT ======
document.addEventListener('DOMContentLoaded', () => {
  setAddressFieldsEditable(true); loadVagasFromGitHub(); updateExperienceVisibility(); updateSteps(); nome.focus();
});
