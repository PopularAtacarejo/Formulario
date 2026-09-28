// script.js
// ====== CONFIGURAÇÕES ======
let API_BASE = "";
const FILE_MAX_MB = 5;
const API_CONFIG_URL = "https://raw.githubusercontent.com/PopularAtacarejo/Formulario/main/api-config.json";

async function resolveApiBase() {
  const response = await fetch(`${API_CONFIG_URL}?t=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("API temporariamente indisponivel. Tente novamente em instantes.");
  const config = await response.json();
  const url = new URL(config.api_base);
  if (url.protocol !== "https:") throw new Error("Endereco da API invalido.");
  API_BASE = url.href.replace(/\/$/, "");
  return API_BASE;
}

function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = String(value || "");
  return span.innerHTML;
}

const EXPERIENCE_RADIO_NAME = "tem_experiencia";
const MAX_EXPERIENCE_ENTRIES = 10;

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

// ====== LÓGICA DO MODAL (Buscando do GitHub + 90 Dias) ======
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
    await resolveApiBase();
    const response = await fetch(`${API_BASE}/api/consultar`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf: inputCpfConsulta.value, telefone: inputTelConsulta.value }),
      signal: AbortSignal.timeout(15000)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || "Nao foi possivel consultar sua candidatura.");
    const candidaturasUsuario = result.candidaturas || [];

    listaCandidaturas.innerHTML = '';
    
    if (candidaturasUsuario.length > 0) {
      
      // Ordenar da candidatura mais recente para a mais antiga
      candidaturasUsuario.sort((a, b) => new Date(b.enviado_em) - new Date(a.enviado_em));

      candidaturasUsuario.forEach(item => {
        const li = document.createElement('li');
        li.className = "p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex flex-col";
        
        // Pega as chaves reais do seu JSON
        const status = item.status || "Novo";
        const vagaNome = item.vaga || "Vaga não especificada";
        
        // Tratamento da Data e Regra de 90 Dias
        let dataInscricaoFormatada = "Data não informada";
        let diasRestantes = 0;
        let habilitadoNovaInscricao = true;

        if (item.enviado_em) {
          const dataEnvio = new Date(item.enviado_em);
          if (!isNaN(dataEnvio)) {
            // Formata para DD/MM/AAAA
            dataInscricaoFormatada = dataEnvio.toLocaleDateString('pt-BR');
            
            // Zerar as horas para contar os dias exatos
            const hoje = new Date();
            hoje.setHours(0,0,0,0);
            dataEnvio.setHours(0,0,0,0);
            
            // Diferença em milissegundos convertida para dias
            const diferencaTempo = hoje.getTime() - dataEnvio.getTime();
            const diasPassados = Math.floor(diferencaTempo / (1000 * 60 * 60 * 24));
            
            diasRestantes = 90 - diasPassados;
            if (diasRestantes > 0) {
              habilitadoNovaInscricao = false;
            }
          }
        }
        
        // Estilo dinâmico das Badges
        let badgeColor = "bg-gray-100 text-gray-800 border-gray-200"; 
        const statusLower = status.toLowerCase();

        if (statusLower === "novo" || statusLower === "não aprovado") {
          badgeColor = "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50";
        } else if (statusLower === "em análise") {
          badgeColor = "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/50";
        } else if (statusLower === "aprovado" || statusLower === "contratado") {
          badgeColor = "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50";
        }

        // Aviso de 90 dias
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
              <p class="font-bold text-gray-800 dark:text-white text-[15px] uppercase">${escapeHtml(vagaNome)}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium"><i class="far fa-calendar-alt mr-1"></i> Aplicado em: ${dataInscricaoFormatada}</p>
            </div>
            <span class="text-[11px] font-bold px-2.5 py-1 rounded-full border ${badgeColor}">${escapeHtml(status)}</span>
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

// ====== VALIDAÇÃO DE CPF (API SCPA) ======
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
        cpfValidationIndicator.className = 'cpf-validation-indicator absolute right-3 top-1/2 -translate-y-1/2 opacity-0';
        cpf.classList.remove('input-valid', 'input-invalid');
        lastValidatedCpfDigits = ''; lastCpfValidationResult = null;
        resolve(true); // Deixa passar se a API falhar
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
async function loadVagasFromAPI() {
  vaga.innerHTML = '<option value="" disabled selected>Carregando...</option>';
  vaga.disabled = true;
  try {
    await resolveApiBase();
    const response = await fetch(`${API_BASE}/api/vagas`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Nao foi possivel carregar as vagas.");
    const vagasData = await response.json();
    vaga.innerHTML = '<option value="" disabled selected>Selecione a vaga...</option>';
    vagasData.forEach(item => {
      const option = document.createElement('option');
      option.value = item.nome;
      option.textContent = item.nome;
      vaga.appendChild(option);
    });
    vaga.disabled = !vagasData.length;
    if (!vagasData.length) vaga.innerHTML = '<option value="">Nenhuma vaga disponivel no momento</option>';
  } catch (error) {
    vaga.innerHTML = '<option value="">Vagas indisponiveis. Atualize a pagina para tentar novamente.</option>';
    errorMsg.textContent = error.message;
    errorMsg.classList.remove('hidden');
  }
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
  currentWakePromise = (async () => {
    serverAwake = false;
    await resolveApiBase();
    const response = await fetch(`${API_BASE}/health`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Servidor temporariamente indisponivel. Tente novamente em instantes.');
    serverAwake = true;
  })().finally(() => { currentWakePromise = null; });
  return currentWakePromise;
}

// ====== MELHORIAS: MENSAGENS E PERFORMANCE ======

// Formatar data para mensagem amigável
function formatDateFriendly(dateStr) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// Calcular quando pode reenviar (90 dias após última candidatura)
function calculateResubmitDate(lastSubmitDate) {
  try {
    const date = new Date(lastSubmitDate);
    date.setDate(date.getDate() + 90);
    return date;
  } catch {
    return null;
  }
}

// Melhorar mensagem de erro com detalhes
function showEnhancedError(errorMessage, statusCode = null) {
  let displayMessage = errorMessage;
  
  // Erro 409: Candidatura duplicada
  if (statusCode === 409 || errorMessage.includes('90 dias') || errorMessage.includes('candidatura')) {
    // Tentar extrair informações do backend
    const hasWaitMessage = errorMessage.includes('Aguarde 90 dias') || errorMessage.includes('90 dias');
    
    if (hasWaitMessage) {
      // Calcular data aproximada de reenvio (90 dias a partir de hoje - aproximação)
      const today = new Date();
      const resubmitDate = new Date(today);
      resubmitDate.setDate(today.getDate() + 90);
      const formattedDate = resubmitDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      
      displayMessage = `
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <i class="fas fa-info-circle text-yellow-600 text-xl flex-shrink-0 mt-1"></i>
            <div>
              <p class="font-bold text-lg mb-2">Você já enviou seu currículo para esta vaga!</p>
              <p class="text-sm leading-relaxed">Para evitar duplicidade, só é possível reenviar sua candidatura para a mesma vaga após <strong>90 dias</strong> da última submissão.</p>
            </div>
          </div>
          
          <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p class="text-sm text-yellow-800 dark:text-yellow-300">
              <i class="fas fa-calendar-alt mr-2"></i>
              <strong>Você poderá reenviar aproximadamente em:</strong><br>
              <span class="text-lg font-bold">${formattedDate}</span>
            </p>
          </div>
          
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p class="text-sm text-blue-800 dark:text-blue-300">
              <i class="fas fa-lightbulb mr-2"></i>
              <strong>Dica:</strong> Você pode se candidatar para outras vagas disponíveis! Role a página para ver mais oportunidades.
            </p>
          </div>
          
          <button 
            onclick="document.getElementById('vaga').focus(); document.getElementById('vaga').scrollIntoView({behavior: 'smooth', block: 'center'});"
            class="w-full bg-primary hover:bg-primaryDark text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2">
            <i class="fas fa-briefcase"></i>
            Ver Outras Vagas Disponíveis
          </button>
        </div>
      `;
    } else {
      displayMessage = `
        <div class="flex items-start gap-3">
          <i class="fas fa-exclamation-triangle text-yellow-600 text-xl flex-shrink-0 mt-1"></i>
          <div>
            <p class="font-bold mb-2">Candidatura já registrada</p>
            <p class="text-sm">${escapeHtml(errorMessage)}</p>
          </div>
        </div>
      `;
    }
  }
  // Erro de arquivo
  else if (errorMessage.includes('Arquivo') || errorMessage.includes('arquivo')) {
    displayMessage = `
      <div class="flex items-start gap-3">
        <i class="fas fa-file-excel text-red-600 text-xl flex-shrink-0 mt-1"></i>
        <div>
          <p class="font-bold mb-2">Problema com o arquivo</p>
          <p class="text-sm">${escapeHtml(errorMessage)}</p>
          <p class="text-xs mt-2 text-gray-600 dark:text-gray-400">
            <strong>Formatos aceitos:</strong> PDF, DOC, DOCX (máximo 5 MB)
          </p>
        </div>
      </div>
    `;
  }
  // Erro de conexão
  else if (errorMessage.includes('conexão') || errorMessage.includes('offline') || errorMessage.includes('timeout')) {
    displayMessage = `
      <div class="flex items-start gap-3">
        <i class="fas fa-wifi text-red-600 text-xl flex-shrink-0 mt-1"></i>
        <div>
          <p class="font-bold mb-2">Problema de conexão</p>
          <p class="text-sm">${escapeHtml(errorMessage)}</p>
          <button 
            onclick="form.dispatchEvent(new Event('submit'))"
            class="mt-3 bg-primary hover:bg-primaryDark text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all flex items-center gap-2">
            <i class="fas fa-redo"></i>
            Tentar Novamente
          </button>
        </div>
      </div>
    `;
  }
  // Erro genérico
  else {
    displayMessage = `
      <div class="flex items-start gap-3">
        <i class="fas fa-exclamation-circle text-red-600 text-xl flex-shrink-0 mt-1"></i>
        <div>
          <p class="font-bold mb-2">Erro ao enviar candidatura</p>
          <p class="text-sm">${escapeHtml(errorMessage)}</p>
        </div>
      </div>
    `;
  }
  
  errorMsg.innerHTML = displayMessage;
  errorMsg.classList.remove("hidden");
  errorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ====== OTIMIZAÇÃO: WAKE SERVER EM PARALELO ======
let serverWakeStarted = false;

// Iniciar wake do servidor assim que usuário começar a preencher
['input', 'change', 'focus'].forEach(eventType => {
  form.addEventListener(eventType, () => {
    if (!serverWakeStarted && !serverAwake) {
      serverWakeStarted = true;
      console.log('⏰ Preparando servidor em segundo plano...');
      wakeServer().catch(() => {}); // Silencioso, não precisa alertar ainda
    }
  }, { once: true, capture: true });
});

// ====== ENVIO OTIMIZADO ======
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  successMsg.classList.add("hidden"); 
  errorMsg.classList.add("hidden");
  errorMsg.innerHTML = ""; // Limpar HTML anterior
  
  const file = arquivo.files?.[0];
  if (!file || file.size > FILE_MAX_MB * 1024 * 1024 || !['pdf','doc','docx'].includes(file.name.toLowerCase().split('.').pop())) {
    showEnhancedError("Arquivo inválido. Envie um arquivo PDF, DOC ou DOCX com no máximo 5 MB.");
    return;
  }

  // Mostrar feedback imediato
  btnText.classList.add("hidden"); 
  spinner.classList.remove("hidden"); 
  submitBtn.disabled = true;
  
  // Mostrar mensagem de progresso
  const progressMsg = document.createElement('div');
  progressMsg.id = 'progress-msg';
  progressMsg.className = 'mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-3';
  progressMsg.innerHTML = `
    <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
    <span class="text-sm text-blue-800 dark:text-blue-300">Enviando sua candidatura...</span>
  `;
  submitBtn.parentElement.appendChild(progressMsg);

  try {
    // Garantir que servidor está acordado (rápido se já foi despertado antes)
    if (!serverAwake) {
      progressMsg.querySelector('span').textContent = 'Conectando ao servidor...';
      await wakeServer();
    }
    
    progressMsg.querySelector('span').textContent = 'Preparando seus dados...';
    
    const formData = new FormData();
    formData.append("nome", nome.value.trim()); 
    formData.append("cpf", cpf.value); 
    formData.append("telefone", telefone.value);
    formData.append("email", email.value.trim().toLowerCase()); 
    formData.append("cep", cep.value); 
    formData.append("cidade", cidade.value);
    formData.append("bairro", bairro.value); 
    formData.append("rua", rua.value); 
    formData.append("transporte", transporte.value);
    formData.append("vaga", vaga.value); 
    formData.append("arquivo", file);
    
    const exp = getSelectedExperienceOption()?.value || "";
    formData.append("tem_experiencia", exp);
    if (exp === "Sim") {
      const experiencias = [];
      experiencesList.querySelectorAll(".experience-card").forEach(c => {
        experiencias.push({
          empresa: c.querySelector('[name="experiencia_empresa[]"]').value, 
          funcao: c.querySelector('[name="experiencia_cargo[]"]').value,
          data_admissao: c.querySelector('[name="experiencia_admissao[]"]').value, 
          data_demissao: c.querySelector('[name="experiencia_demissao[]"]').value
        });
      });
      formData.append("experiencias", JSON.stringify(experiencias));
    }

    progressMsg.querySelector('span').textContent = 'Enviando para o servidor...';
    
    // Timeout otimizado (30s ao invés de 60s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(`${API_BASE}/api/enviar`, { 
      method: "POST", 
      body: formData, 
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    
    let data;
    try {
      data = await response.json();
    } catch {
      data = { detail: 'Resposta inválida do servidor' };
    }
    
    if (response.ok) {
      // Sucesso!
      progressMsg.remove();
      
      successMsg.innerHTML = `
        <div class="flex items-start gap-3">
          <i class="fas fa-check-circle text-green-600 text-2xl flex-shrink-0 mt-1"></i>
          <div>
            <p class="font-bold text-lg mb-2">Candidatura enviada com sucesso!</p>
            <p class="text-sm">${escapeHtml(data?.message || 'Recebemos seu currículo e entraremos em contato em breve.')}</p>
            <p class="text-xs mt-3 text-gray-600 dark:text-gray-400">
              <i class="fas fa-info-circle mr-1"></i>
              Guarde seu CPF e telefone para consultar o status da candidatura.
            </p>
          </div>
        </div>
      `;
      successMsg.classList.remove("hidden");
      
      form.reset(); 
      setAddressFieldsEditable(true);
      
      // Limpeza das máscaras
      if (cpfMask) cpfMask.value = ""; 
      if (cepMask) cepMask.value = ""; 
      if (telefoneMask) telefoneMask.value = "";
      
      document.querySelectorAll('.input-valid, .input-invalid').forEach(el => 
        el.classList.remove('input-valid', 'input-invalid')
      );
      temExperienciaRadios.forEach(r => r.checked = false); 
      updateExperienceVisibility(); 
      updateSteps();
      
      successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Limpar preview de arquivo se existir
      const filePreview = document.getElementById('filePreview');
      if (filePreview) filePreview.classList.add('hidden');
      
    } else {
      // Erro do servidor
      progressMsg.remove();
      showEnhancedError(data?.detail || "Erro ao processar sua candidatura.", response.status);
    }
    
  } catch (err) {
    // Erro de rede ou timeout
    const progressMsgEl = document.getElementById('progress-msg');
    if (progressMsgEl) progressMsgEl.remove();
    
    if (err.name === 'AbortError') {
      showEnhancedError("O envio demorou muito e foi cancelado. Verifique sua conexão e tente novamente.");
    } else {
      showEnhancedError(err.message || "Erro de conexão. Verifique sua internet e tente novamente.");
    }
  } finally {
    btnText.classList.remove("hidden"); 
    spinner.classList.add("hidden"); 
    updateSteps();
  }
});

// ====== INIT ======
document.addEventListener('DOMContentLoaded', () => {
  setAddressFieldsEditable(true); loadVagasFromAPI(); updateExperienceVisibility(); updateSteps(); nome.focus();
});


// ========================================
// MELHORIAS - LGPD, ACESSIBILIDADE, UX
// ========================================

// ========================================
// 1. MENSAGENS DE ERRO ESPECÍFICAS
// ========================================

const ERROR_MESSAGES = {
  nome: {
    required: 'Por favor, informe seu nome completo',
    minLength: 'Nome deve ter pelo menos 3 caracteres',
    pattern: 'Nome deve conter apenas letras e espaços'
  },
  cpf: {
    required: 'CPF é obrigatório',
    invalid: 'CPF inválido. Verifique os 11 dígitos digitados',
    duplicate: 'Este CPF já possui uma candidatura ativa para esta vaga'
  },
  telefone: {
    required: 'Telefone é obrigatório',
    invalid: 'Telefone inválido. Use o formato (00) 00000-0000',
    minLength: 'Telefone deve ter 10 ou 11 dígitos'
  },
  email: {
    required: 'E-mail é obrigatório',
    invalid: 'E-mail inválido. Exemplo: seuemail@exemplo.com',
    pattern: 'Digite um e-mail válido'
  },
  cep: {
    required: 'CEP é obrigatório',
    invalid: 'CEP inválido. Use o formato 00000-000',
    notFound: 'CEP não encontrado. Verifique o número'
  },
  cidade: { required: 'Informe a cidade' },
  bairro: { required: 'Informe o bairro' },
  rua: { required: 'Informe a rua' },
  transporte: { required: 'Selecione uma opção de transporte' },
  vaga: { required: 'Selecione a vaga desejada' },
  arquivo: {
    required: 'Anexe seu currículo em PDF, DOC ou DOCX',
    size: 'Arquivo muito grande. Tamanho máximo: 5 MB',
    type: 'Formato inválido. Use apenas PDF, DOC ou DOCX'
  },
  consentimentoLGPD: {
    required: 'Você precisa concordar com a Política de Privacidade para continuar'
  }
};

function showFieldError(field, errorType) {
  const fieldId = field.id || field.name;
  const errorSpan = document.getElementById(`${fieldId}-error`) || createErrorSpan(field, fieldId);
  const message = ERROR_MESSAGES[fieldId]?.[errorType] || 'Campo inválido';
  
  field.classList.add('input-invalid', 'shake-error');
  field.classList.remove('input-valid');
  field.setAttribute('aria-invalid', 'true');
  
  if (errorSpan) {
    errorSpan.textContent = message;
    errorSpan.classList.remove('hidden');
    field.setAttribute('aria-describedby', `${fieldId}-error`);
  }
  
  // Remove shake animation after it completes
  setTimeout(() => field.classList.remove('shake-error'), 500);
  
  // Anunciar erro para leitores de tela
  announceToScreenReader(message);
}

function clearFieldError(field) {
  const fieldId = field.id || field.name;
  const errorSpan = document.getElementById(`${fieldId}-error`);
  
  field.classList.remove('input-invalid', 'shake-error');
  field.classList.add('input-valid', 'success-bounce');
  field.setAttribute('aria-invalid', 'false');
  
  if (errorSpan) {
    errorSpan.textContent = '';
    errorSpan.classList.add('hidden');
  }
  
  setTimeout(() => field.classList.remove('success-bounce'), 300);
}

function createErrorSpan(field, fieldId) {
  const errorSpan = document.createElement('span');
  errorSpan.id = `${fieldId}-error`;
  errorSpan.className = 'field-error hidden';
  errorSpan.setAttribute('role', 'alert');
  field.parentElement.appendChild(errorSpan);
  return errorSpan;
}

function announceToScreenReader(message) {
  const announcer = document.getElementById('a11y-announcer');
  if (announcer) {
    announcer.textContent = '';
    setTimeout(() => {
      announcer.textContent = message;
    }, 100);
    setTimeout(() => {
      announcer.textContent = '';
    }, 3000);
  }
}

// ========================================
// 2. PREVIEW DE ARQUIVO
// ========================================

const filePreview = document.getElementById('filePreview');
const fileNameSpan = document.getElementById('fileName');
const fileSizeSpan = document.getElementById('fileSize');
const fileIconElement = document.getElementById('fileIcon');
const removeFileBtn = document.getElementById('removeFile');

if (arquivo) {
  arquivo.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      // Atualizar preview
      filePreview.classList.remove('hidden');
      fileNameSpan.textContent = file.name;
      fileSizeSpan.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
      
      // Ícone baseado no tipo
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'pdf') {
        fileIconElement.className = 'fas fa-file-pdf text-4xl text-red-600 dark:text-red-400';
      } else if (ext === 'doc' || ext === 'docx') {
        fileIconElement.className = 'fas fa-file-word text-4xl text-blue-600 dark:text-blue-400';
      } else {
        fileIconElement.className = 'fas fa-file text-4xl text-gray-600 dark:text-gray-400';
      }
      
      // Validar tamanho
      if (file.size > FILE_MAX_MB * 1024 * 1024) {
        showFieldError(arquivo, 'size');
      } else {
        clearFieldError(arquivo);
      }
    } else {
      filePreview.classList.add('hidden');
    }
  });
}

if (removeFileBtn) {
  removeFileBtn.addEventListener('click', () => {
    arquivo.value = '';
    filePreview.classList.add('hidden');
    clearFieldError(arquivo);
  });
}

// ========================================
// 3. AUTO-SAVE NO LOCALSTORAGE
// ========================================

const AUTOSAVE_KEY = 'candidatura_rascunho';
const AUTOSAVE_DELAY = 2000; // 2 segundos
let autoSaveTimeout;

function autoSaveForm() {
  const formData = {
    nome: nome?.value || '',
    cpf: cpf?.value || '',
    telefone: telefone?.value || '',
    email: email?.value || '',
    cep: cep?.value || '',
    cidade: cidade?.value || '',
    bairro: bairro?.value || '',
    rua: rua?.value || '',
    transporte: transporte?.value || '',
    vaga: vaga?.value || '',
    savedAt: new Date().toISOString()
  };
  
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(formData));
    console.log('✅ Progresso salvo automaticamente');
  } catch (error) {
    console.warn('Não foi possível salvar o progresso:', error);
  }
}

function restoreFormData() {
  try {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (!saved) return;
    
    const data = JSON.parse(saved);
    const savedDate = new Date(data.savedAt);
    const hoursSince = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60);
    
    // Só restaura se salvo nas últimas 24h
    if (hoursSince < 24) {
      const message = `Encontramos um rascunho salvo em ${savedDate.toLocaleString('pt-BR')}. Deseja continuar de onde parou?`;
      
      if (confirm(message)) {
        nome.value = data.nome || '';
        cpf.value = data.cpf || '';
        telefone.value = data.telefone || '';
        email.value = data.email || '';
        cep.value = data.cep || '';
        cidade.value = data.cidade || '';
        bairro.value = data.bairro || '';
        rua.value = data.rua || '';
        transporte.value = data.transporte || '';
        
        // Aguardar vagas carregarem
        if (data.vaga) {
          const checkVagas = setInterval(() => {
            if (vaga.options.length > 1) {
              vaga.value = data.vaga;
              clearInterval(checkVagas);
            }
          }, 100);
        }
        
        announceToScreenReader('Rascunho restaurado com sucesso');
      } else {
        localStorage.removeItem(AUTOSAVE_KEY);
      }
    } else {
      // Rascunho muito antigo, remover
      localStorage.removeItem(AUTOSAVE_KEY);
    }
  } catch (error) {
    console.warn('Erro ao restaurar rascunho:', error);
  }
}

// Debounce para auto-save
if (form) {
  form.addEventListener('input', () => {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(autoSaveForm, AUTOSAVE_DELAY);
  });
}

// Limpar após envio bem-sucedido
function clearAutoSave() {
  localStorage.removeItem(AUTOSAVE_KEY);
  console.log('✅ Rascunho limpo após envio bem-sucedido');
}

// ========================================
// 4. MODAL DE CONFIRMAÇÃO
// ========================================

const confirmModal = document.getElementById('confirmModal');
const confirmContent = document.getElementById('confirmContent');
const btnCancelConfirm = document.getElementById('btnCancelConfirm');
const btnConfirmSubmit = document.getElementById('btnConfirmSubmit');
let pendingSubmitData = null;

function showConfirmationModal() {
  const data = collectFormData();
  pendingSubmitData = data; // Armazenar para o envio real
  
  let experienciasHTML = '';
  if (data.experiencias && data.experiencias.length > 0) {
    experienciasHTML = `
      <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
        <h4 class="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <i class="fas fa-history text-blue-600"></i> Experiências Profissionais
        </h4>
        <div class="space-y-3">
          ${data.experiencias.map((exp, i) => `
            <div class="bg-white dark:bg-gray-800 p-3 rounded-lg">
              <p class="font-semibold text-gray-900 dark:text-white text-sm">${i + 1}. ${escapeHtml(exp.funcao)} - ${escapeHtml(exp.empresa)}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ${exp.data_admissao} ${exp.data_demissao ? `até ${exp.data_demissao}` : '(atual)'}
              </p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  confirmContent.innerHTML = `
    <div class="space-y-4">
      <div class="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
        <h4 class="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <i class="fas fa-user text-primary"></i> Dados Pessoais
        </h4>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt class="text-gray-500 dark:text-gray-400">Nome:</dt>
          <dd class="text-gray-900 dark:text-white font-medium">${escapeHtml(data.nome)}</dd>
          
          <dt class="text-gray-500 dark:text-gray-400">CPF:</dt>
          <dd class="text-gray-900 dark:text-white font-medium">${escapeHtml(data.cpf)}</dd>
          
          <dt class="text-gray-500 dark:text-gray-400">Telefone:</dt>
          <dd class="text-gray-900 dark:text-white font-medium">${escapeHtml(data.telefone)}</dd>
          
          <dt class="text-gray-500 dark:text-gray-400">E-mail:</dt>
          <dd class="text-gray-900 dark:text-white font-medium">${escapeHtml(data.email)}</dd>
        </dl>
      </div>
      
      <div class="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
        <h4 class="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <i class="fas fa-home text-primary"></i> Endereço
        </h4>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt class="text-gray-500 dark:text-gray-400">CEP:</dt>
          <dd class="text-gray-900 dark:text-white font-medium">${escapeHtml(data.cep)}</dd>
          
          <dt class="text-gray-500 dark:text-gray-400">Cidade:</dt>
          <dd class="text-gray-900 dark:text-white font-medium">${escapeHtml(data.cidade)}</dd>
          
          <dt class="text-gray-500 dark:text-gray-400">Bairro:</dt>
          <dd class="text-gray-900 dark:text-white font-medium">${escapeHtml(data.bairro)}</dd>
          
          <dt class="text-gray-500 dark:text-gray-400">Rua:</dt>
          <dd class="text-gray-900 dark:text-white font-medium col-span-2">${escapeHtml(data.rua)}</dd>
        </dl>
      </div>
      
      <div class="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
        <h4 class="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <i class="fas fa-briefcase text-primary"></i> Candidatura
        </h4>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt class="text-gray-500 dark:text-gray-400">Vaga:</dt>
          <dd class="text-gray-900 dark:text-white font-medium">${escapeHtml(data.vaga)}</dd>
          
          <dt class="text-gray-500 dark:text-gray-400">Transporte:</dt>
          <dd class="text-gray-900 dark:text-white font-medium">${escapeHtml(data.transporte)}</dd>
          
          <dt class="text-gray-500 dark:text-gray-400">Experiência:</dt>
          <dd class="text-gray-900 dark:text-white font-medium">${escapeHtml(data.tem_experiencia)}</dd>
          
          <dt class="text-gray-500 dark:text-gray-400">Currículo:</dt>
          <dd class="text-gray-900 dark:text-white font-medium">${escapeHtml(arquivo.files[0]?.name || 'N/A')}</dd>
        </dl>
      </div>
      
      ${experienciasHTML}
      
      <div class="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
        <p class="text-sm text-yellow-800 dark:text-yellow-300 flex items-start gap-2">
          <i class="fas fa-exclamation-triangle mt-0.5 flex-shrink-0"></i>
          <span>Confira atentamente seus dados. Após o envio, não será possível fazer alterações.</span>
        </p>
      </div>
    </div>
  `;
  
  confirmModal.classList.remove('hidden');
  confirmModal.classList.add('flex');
  setTimeout(() => {
    confirmModal.style.opacity = '1';
  }, 10);
  
  // Focar no botão de confirmar
  btnConfirmSubmit.focus();
}

function closeConfirmationModal() {
  confirmModal.style.opacity = '0';
  setTimeout(() => {
    confirmModal.classList.add('hidden');
    confirmModal.classList.remove('flex');
  }, 300);
}

if (btnCancelConfirm) {
  btnCancelConfirm.addEventListener('click', closeConfirmationModal);
}

// Envio real quando confirmar no modal
if (btnConfirmSubmit) {
  btnConfirmSubmit.addEventListener('click', async () => {
    closeConfirmationModal();
    
    if (!pendingSubmitData) {
      console.error('Dados do formulário não encontrados');
      return;
    }
    
    // Usar a função de envio existente
    await realizarEnvioReal(pendingSubmitData);
  });
}

// ========================================
// 5. MELHORAR ACESSIBILIDADE
// ========================================

// Adicionar aria-labels e restaurar rascunho
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.setAttribute('aria-label', 'Alternar tema claro/escuro');
    themeToggle.setAttribute('aria-pressed', document.documentElement.classList.contains('dark'));
  }
  
  const btnConsulta = document.getElementById('btnConsultaCandidatura');
  if (btnConsulta) {
    btnConsulta.setAttribute('aria-label', 'Consultar minhas candidaturas');
  }
  
  // Restaurar rascunho
  restoreFormData();
  
  // Loading skeleton (ocultar após carregar)
  setTimeout(() => {
    const skeleton = document.getElementById('loadingSkeleton');
    const mainElement = document.querySelector('main');
    if (skeleton) {
      skeleton.classList.add('hidden');
    }
    if (mainElement && mainElement.classList.contains('hidden')) {
      mainElement.classList.remove('hidden');
    }
  }, 500);
});

// Melhorar navegação por teclado
document.addEventListener('keydown', (e) => {
  // Esc para fechar modais
  if (e.key === 'Escape') {
    closeConfirmationModal();
    const modalConsulta = document.getElementById('modalConsulta');
    if (modalConsulta && !modalConsulta.classList.contains('hidden')) {
      document.getElementById('btnCloseModal')?.click();
    }
  }
  
  // Ctrl/Cmd + Enter para enviar (se válido)
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    const lgpdCheckbox = document.getElementById('consentimentoLGPD');
    if (form.checkValidity() && lgpdCheckbox?.checked) {
      e.preventDefault();
      showConfirmationModal();
    }
  }
});

// ========================================
// 6. VALIDAÇÃO DO CONSENTIMENTO LGPD
// ========================================

const lgpdCheckbox = document.getElementById('consentimentoLGPD');
if (lgpdCheckbox) {
  lgpdCheckbox.addEventListener('change', () => {
    if (lgpdCheckbox.checked) {
      clearFieldError(lgpdCheckbox);
    }
  });
}

// ========================================
// 7. MODIFICAR SUBMIT PARA INCLUIR MODAL
// ========================================

// Interceptar o submit original para adicionar validação LGPD e modal
const originalSubmit = form.onsubmit;
form.onsubmit = null;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Validar LGPD
  if (!lgpdCheckbox?.checked) {
    showFieldError(lgpdCheckbox, 'required');
    announceToScreenReader('Por favor, aceite a Política de Privacidade');
    lgpdCheckbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  
  // Mostrar modal de confirmação
  showConfirmationModal();
});

// Função de envio real (separada para ser chamada pelo modal)
async function realizarEnvioReal(data) {
  const submitBtn = document.getElementById('submitButton');
  const btnText = submitBtn.querySelector('.btn-text');
  const spinner = submitBtn.querySelector('.spinner');
  
  submitBtn.disabled = true;
  btnText.classList.add('hidden');
  spinner.classList.remove('hidden');
  
  try {
    const formDataToSend = new FormData();
    
    // Adicionar campos básicos
    Object.keys(data).forEach(key => {
      if (key !== 'experiencias' && key !== 'arquivo') {
        formDataToSend.append(key, data[key] || '');
      }
    });
    
    // Adicionar experiências
    if (data.experiencias) {
      formDataToSend.append('experiencias', JSON.stringify(data.experiencias));
    }
    
    // Adicionar arquivo
    if (arquivo.files[0]) {
      formDataToSend.append('arquivo', arquivo.files[0]);
    }
    
    const response = await fetch(`${API_URL}/submit`, {
      method: 'POST',
      body: formDataToSend
    });
    
    const result = await response.json();
    
    if (response.ok) {
      mensagemSucesso.textContent = result.message || 'Candidatura enviada com sucesso!';
      mensagemSucesso.classList.remove('hidden');
      mensagemErro.classList.add('hidden');
      form.reset();
      clearAutoSave();
      announceToScreenReader('Candidatura enviada com sucesso!');
      
      // Resetar UI
      filePreview.classList.add('hidden');
      fs2.setAttribute('aria-disabled', 'true');
      fs2.disabled = true;
      fs3.setAttribute('aria-disabled', 'true');
      fs3.disabled = true;
      currentStep = 1;
      updateStepIndicator();
    } else {
      throw new Error(result.message || 'Erro ao enviar candidatura');
    }
    
  } catch (error) {
    console.error('Erro no envio:', error);
    showEnhancedError(error.message, error.statusCode || 500);
    announceToScreenReader('Erro ao enviar candidatura');
  } finally {
    submitBtn.disabled = false;
    btnText.classList.remove('hidden');
    spinner.classList.add('hidden');
  }
}

console.log('✅ Melhorias de UX, LGPD e Acessibilidade carregadas!');
