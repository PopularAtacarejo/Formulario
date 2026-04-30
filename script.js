// script.js
// ====== CONFIGURAÇÕES ======
const API_BASE = "https://candidatos.onrender.com";
const FILE_MAX_MB = 5;
const VAGAS_GITHUB_URL = "https://raw.githubusercontent.com/PopularAtacarejo/Candidatos/main/vagas.json";
const DEFAULT_VAGAS = [
  { nome: "Auxiliar de Limpeza" }, { nome: "Vendedor" }, { nome: "Caixa" },
  { nome: "Estoquista" }, { nome: "Repositor" }, { nome: "Atendente" },
  { nome: "Gerente" }, { nome: "Supervisor" }, { nome: "Operador de Caixa" }
];
const EXPERIENCE_RADIO_NAME = "tem_experiencia";
const MAX_EXPERIENCE_ENTRIES = 10;
const WAKE_POLL_INTERVAL = 5000; // 5 segundos
const WAKE_MAX_ATTEMPTS = 12;    // até 1 minuto

// ====== ELEMENTOS DOM ======
const form = document.getElementById("formCurriculo");
const themeToggle = document.getElementById("themeToggle");
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

// Servidor (estado interno, sem UI)
let serverAwake = false;
let wakeInterval = null;
let wakeAttempts = 0;
let currentWakePromise = null;

// ====== TEMA ======
themeToggle.addEventListener("click", () => {
  const currentTheme = document.body.getAttribute("data-theme");
  const newTheme = currentTheme === "light" ? "dark" : "light";
  document.body.setAttribute("data-theme", newTheme);
  const icon = themeToggle.querySelector("i");
  icon.className = newTheme === "dark" ? "fas fa-sun" : "fas fa-moon";
});

// ====== MÁSCARAS ======
const cpfMask = IMask(cpf, { mask: "000.000.000-00", lazy: false });
const cepMask = IMask(cep, { mask: "00000-000", lazy: false });
const telefoneMask = IMask(telefone, { mask: [{mask: "(00) 0000-0000"}, {mask: "(00) 00000-0000"}], lazy: false });

// ====== VALIDAÇÃO DE CPF ======
let cpfValidationTimeout = null;
let lastValidatedCpfDigits = '';
let lastCpfValidationResult = null;
const cpfValidationIndicator = document.getElementById('cpfValidationIndicator');

async function validateCPF(cpfValue) {
  const cpfDigits = cpfValue.replace(/\D/g, '');
  if (cpfDigits.length !== 11) {
    cpf.classList.add('input-invalid');
    return false;
  }
  if (cpfDigits === lastValidatedCpfDigits && lastCpfValidationResult !== null) return lastCpfValidationResult;
  if (cpfValidationTimeout) clearTimeout(cpfValidationTimeout);
  
  cpfValidationIndicator.className = 'cpf-validation-indicator loading';
  cpf.classList.remove('input-valid', 'input-invalid');

  return new Promise((resolve) => {
    cpfValidationTimeout = setTimeout(async () => {
      try {
        const response = await fetch(`https://scpa-backend.saude.gov.br/public/scpa-usuario/validacao-cpf/${cpfDigits}`, {
          method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store'
        });
        if (response.ok) {
          const data = await response.json();
          if (data === true) {
            cpfValidationIndicator.className = 'cpf-validation-indicator valid';
            cpf.classList.add('input-valid');
            document.getElementById('cpf-help').textContent = 'CPF Válido';
            document.getElementById('cpf-help').className = 'help-text success';
            lastValidatedCpfDigits = cpfDigits; lastCpfValidationResult = true;
            resolve(true);
          } else {
            throw new Error("CPF Inválido");
          }
        } else {
          throw new Error("Erro na API");
        }
      } catch (error) {
        cpfValidationIndicator.className = 'cpf-validation-indicator';
        cpf.classList.remove('input-valid', 'input-invalid');
        lastValidatedCpfDigits = ''; lastCpfValidationResult = null;
        document.getElementById('cpf-help').textContent = 'Validação indisponível, você pode continuar.';
        document.getElementById('cpf-help').className = 'help-text';
        resolve(true);
      }
    }, 800);
  });
}

cpf.addEventListener('blur', async () => { if(cpf.value.trim() !== '') { await validateCPF(cpf.value); updateSteps(); } });

// ====== VIACEP + edição manual ======
let cepTimeout;
cep.addEventListener("input", () => {
  clearTimeout(cepTimeout);
  const cepValue = cep.value.replace(/\D/g, "");
  if (cepValue.length < 8) {
    setAddressFieldsEditable(true);
    return;
  }
  
  cepTimeout = setTimeout(async () => {
    if (cepValue.length !== 8) {
      setAddressFieldsEditable(true);
      return;
    }
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepValue}/json/`, { cache: "no-store" });
      if (!response.ok) throw new Error("Erro");
      const data = await response.json();
      if (data.erro) {
        setAddressFieldsEditable(true);
        cidade.value = ""; bairro.value = ""; rua.value = "";
      } else {
        cidade.value = data.localidade || "";
        bairro.value = data.bairro || "";
        rua.value = data.logradouro || "";
        setAddressFieldsEditable(false);
        cidade.classList.add("input-valid");
        bairro.classList.add("input-valid");
        rua.classList.add("input-valid");
        updateSteps();
      }
    } catch (e) {
      setAddressFieldsEditable(true);
    }
  }, 800);
});

function setAddressFieldsEditable(editable) {
  [cidade, bairro, rua].forEach(field => {
    field.readOnly = !editable;
    const help = document.getElementById(field.id + '-help');
    if (help) {
      help.textContent = editable ? 'Preencha manualmente' : 'Preenchido automaticamente';
    }
  });
  if (editable) {
    cidade.classList.remove("input-valid"); bairro.classList.remove("input-valid"); rua.classList.remove("input-valid");
  }
  updateSteps();
}

// ====== CARREGAR VAGAS ======
async function loadVagasFromGitHub() {
  const selectVaga = document.getElementById('vaga');
  selectVaga.innerHTML = '<option value="" disabled selected>Carregando...</option>';
  selectVaga.disabled = true;
  
  let vagasData = [];
  try {
    const response = await fetch(VAGAS_GITHUB_URL, { cache: "no-store" });
    if (response.ok) vagasData = await response.json();
  } catch (e) { console.error(e); }

  const finalVagas = (vagasData || []).length > 0 ? vagasData : DEFAULT_VAGAS;
  selectVaga.innerHTML = '<option value="" disabled selected>Selecione a vaga...</option>';
  selectVaga.disabled = false;

  finalVagas.forEach(v => {
    const opt = document.createElement('option');
    opt.value = typeof v === 'string' ? v : v.nome;
    opt.textContent = typeof v === 'string' ? v : v.nome;
    selectVaga.appendChild(opt);
  });
  updateSteps();
}

// ====== UTILITÁRIOS ======
function showMessage(el, msg) { el.textContent = msg; el.classList.remove("hidden"); el.style.display = "block"; }
function hideMessages() { [successMsg, errorMsg].forEach(m => { m.classList.add("hidden"); m.style.display = "none"; }); }
function showError(msg) { showMessage(errorMsg, msg); }
function showSuccess(msg) {
  showMessage(successMsg, msg);
  successMsg.classList.add('success-animation');
  successMsg.addEventListener('animationend', () => successMsg.classList.remove('success-animation'), { once: true });
}
function setLoading(isLoading) {
  if (isLoading) {
    btnText.classList.add("hidden"); spinner.classList.remove("hidden"); submitBtn.disabled = true;
  } else {
    btnText.classList.remove("hidden"); spinner.classList.add("hidden");
    submitBtn.disabled = !isFormValid();
  }
}
function validateFile() {
  const f = arquivo.files?.[0];
  if (!f) return false;
  const ext = f.name.toLowerCase().split('.').pop();
  return f.size <= FILE_MAX_MB * 1024 * 1024 && ['pdf','doc','docx'].includes(ext);
}
function createFormData() {
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
  formData.append("arquivo", arquivo.files[0]);
  
  const selectedExp = document.querySelector(`input[name="${EXPERIENCE_RADIO_NAME}"]:checked`)?.value || "";
  formData.append("tem_experiencia", selectedExp);

  if (selectedExp === "Sim" && experiencesList) {
    const experiences = [];
    experiencesList.querySelectorAll(".experience-card").forEach((card) => {
      const c = card.querySelector('input[name="experiencia_empresa[]"]');
      const r = card.querySelector('input[name="experiencia_cargo[]"]');
      const a = card.querySelector('input[name="experiencia_admissao[]"]');
      const d = card.querySelector('input[name="experiencia_demissao[]"]');
      if (c && r && a && d && c.value.trim() && r.value.trim()) {
        experiences.push({ empresa: c.value.trim(), funcao: r.value.trim(), data_admissao: a.value, data_demissao: d.value });
      }
    });
    if (experiences.length > 0) formData.append("experiencias", JSON.stringify(experiences));
  }
  return formData;
}
async function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try { return await fetch(url, { ...options, signal: controller.signal, cache: "no-store" }); } finally { clearTimeout(id); }
}

// ====== VALIDAÇÃO POR ETAPA ======
const step1Fields = [nome, cpf, telefone, email];
const step2Fields = [cep, cidade, bairro, rua];
const step3Fields = [transporte, vaga, arquivo];

function getSelectedExperienceOption() { return document.querySelector(`input[name="${EXPERIENCE_RADIO_NAME}"]:checked`); }
function areExperiencesValid() {
  const selected = getSelectedExperienceOption();
  if (!selected || selected.value === "Não") return true;
  if (!experiencesList) return false;
  const cards = experiencesList.querySelectorAll(".experience-card");
  if (!cards.length) return false;
  return Array.from(cards).every(c => Array.from(c.querySelectorAll("input")).every(i => i.value.trim().length > 0));
}
function updateExperienceHeader() {
  if (!experiencesList) return;
  const cards = experiencesList.querySelectorAll(".experience-card");
  cards.forEach((card, idx) => {
    const n = card.querySelector(".experience-number");
    if (n) n.textContent = `Experiência ${idx + 1}`;
    const b = card.querySelector(".remove-experience-btn");
    if (b) b.style.visibility = cards.length === 1 ? "hidden" : "visible";
  });
  if (addExperienceBtn) addExperienceBtn.disabled = (getSelectedExperienceOption()?.value !== "Sim") || cards.length >= MAX_EXPERIENCE_ENTRIES;
}
function addExperienceCard() {
  if (!experienceTemplate || !experiencesList || experiencesList.children.length >= MAX_EXPERIENCE_ENTRIES) return;
  const clone = experienceTemplate.content.cloneNode(true);
  const card = clone.querySelector(".experience-card");
  const removeBtn = card.querySelector(".remove-experience-btn");
  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      card.remove(); updateExperienceHeader(); updateSteps();
    });
  }
  experiencesList.appendChild(card);
  card.querySelectorAll("input").forEach(i => { i.value = ""; setupFieldValidation(i); });
  updateExperienceHeader(); updateSteps();
}
function updateExperienceVisibility() {
  if (!experiencesSection || !addExperienceBtn) return;
  const hasExp = getSelectedExperienceOption()?.value === "Sim";
  if (hasExp) {
    experiencesSection.classList.remove("hidden");
    if (experiencesList.children.length === 0) addExperienceCard();
  } else {
    experiencesSection.classList.add("hidden");
    experiencesList.innerHTML = "";
  }
  addExperienceBtn.disabled = !hasExp || experiencesList.children.length >= MAX_EXPERIENCE_ENTRIES;
  updateExperienceHeader();
}
function resetExperiencesSection() {
  temExperienciaRadios.forEach(r => r.checked = false);
  if (experiencesList) experiencesList.innerHTML = "";
  updateExperienceVisibility();
}
function isFieldValid(f) {
  if (f.id === 'cpf') {
    if (f.value.trim().length === 0) return false;
    if (f.classList.contains('input-invalid')) return false;
    return f.value.length === 14;
  }
  if (f.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim());
  if (f.tagName === 'SELECT') return !!f.value;
  if (f.type === 'file') return !!f.files?.length;
  return f.value.trim().length > 0;
}
function setFieldsetState(fs, enabled) {
  if (enabled) {
    fs.removeAttribute('disabled'); fs.setAttribute('aria-disabled', 'false'); fs.style.opacity = '1'; fs.style.pointerEvents = 'auto';
  } else {
    fs.setAttribute('disabled', ''); fs.setAttribute('aria-disabled', 'true'); fs.style.opacity = '0.5'; fs.style.pointerEvents = 'none';
  }
}
function isFormValid() {
  const s1 = step1Fields.every(isFieldValid);
  const s2 = s1 && step2Fields.every(isFieldValid);
  const s3 = s2 && step3Fields.every(isFieldValid) && !!getSelectedExperienceOption() && areExperiencesValid();
  return s3;
}
function updateSteps() {
  const s1 = step1Fields.every(isFieldValid);
  const s2 = s1 && step2Fields.every(isFieldValid);
  const s3 = isFormValid();
  
  setFieldsetState(fs2, s1);
  setFieldsetState(fs3, s2);
  
  step1Head.className = `step ${s1 ? 'done' : 'active'}`;
  step2Head.className = `step ${s2 ? 'done' : (s1 ? 'active' : '')}`;
  step3Head.className = `step ${s3 ? 'done' : (s2 ? 'active' : '')}`;
  
  submitBtn.disabled = !s3;
}
function setupFieldValidation(f) {
  const ev = f.type === 'file' ? 'change' : 'input';
  f.addEventListener(ev, function() {
    if (this.value.trim() === '') { this.classList.remove('input-valid', 'input-invalid'); }
    else if (isFieldValid(this)) { this.classList.add('input-valid'); this.classList.remove('input-invalid'); }
    else { this.classList.add('input-invalid'); this.classList.remove('input-valid'); }
    updateSteps();
  });
}

[...step1Fields, ...step2Fields, transporte, arquivo].forEach(setupFieldValidation);
vaga.addEventListener('change', () => { setupFieldValidation(vaga); updateSteps(); });
temExperienciaRadios.forEach(r => r.addEventListener('change', () => { updateExperienceVisibility(); updateSteps(); }));
if (addExperienceBtn) addExperienceBtn.addEventListener('click', () => addExperienceCard());

// ====== ACORDAR SERVIDOR (internamente, sem UI) ======
function wakeServer() {
  if (currentWakePromise) return currentWakePromise;
  if (serverAwake) return Promise.resolve();

  let attempts = 0;
  currentWakePromise = new Promise((resolve, reject) => {
    const attemptWake = () => {
      attempts++;
      fetch(API_BASE + '/', { method: 'GET', cache: 'no-store', mode: 'cors' })
        .then(response => {
          if (response.ok) {
            serverAwake = true;
            stopPollingAndClear();
            resolve();
          } else {
            throw new Error('Status não ok');
          }
        })
        .catch(() => {
          if (attempts >= WAKE_MAX_ATTEMPTS) {
            stopPollingAndClear();
            serverAwake = false;
            reject(new Error('Servidor não acordou'));
          }
        });
    };

    function stopPollingAndClear() {
      if (wakeInterval) {
        clearInterval(wakeInterval);
        wakeInterval = null;
      }
      currentWakePromise = null;
    }

    attemptWake();
    wakeInterval = setInterval(() => {
      if (attempts >= WAKE_MAX_ATTEMPTS) {
        stopPollingAndClear();
      } else {
        attemptWake();
      }
    }, WAKE_POLL_INTERVAL);
  });

  return currentWakePromise;
}

// ====== INICIALIZAÇÃO ======
document.addEventListener('DOMContentLoaded', () => {
  // Define campos de endereço como editáveis (padrão) – chamada agora segura
  setAddressFieldsEditable(true);
  loadVagasFromGitHub();
  updateExperienceVisibility();
  updateSteps();
  nome.focus();
});

// ====== ENVIO DO FORMULÁRIO ======
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessages();
  
  if (!validateFile()) {
    showError("Arquivo inválido. Verifique formato e tamanho (máx. 5MB).");
    return;
  }

  if (!serverAwake) {
    hideMessages();
    try {
      await wakeServer();
    } catch (err) {
      showError("Não foi possível conectar ao servidor. Tente novamente mais tarde.");
      return;
    }
  }

  setLoading(true);
  try {
    const response = await fetchWithTimeout(`${API_BASE}/api/enviar`, { method: "POST", body: createFormData() }, 60000);
    const data = await response.json();
    if (response.ok) {
      showSuccess(data?.message || "Candidatura enviada com sucesso!");
      form.reset();
      setAddressFieldsEditable(true);
      cpfMask.update(""); cepMask.update(""); telefoneMask.update("");
      [nome, cpf, telefone, email, cep, cidade, bairro, rua, transporte, vaga, arquivo].forEach(el => el.classList.remove('input-valid', 'input-invalid'));
      resetExperiencesSection();
      updateSteps();
      setTimeout(loadVagasFromGitHub, 2000);
      successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      showError(data?.detail || "Erro ao enviar.");
    }
  } catch (err) {
    showError("Erro de conexão.");
  } finally {
    setLoading(false);
  }
});