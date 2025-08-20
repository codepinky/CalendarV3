const form = document.getElementById('verify-form');
const emailInput = document.getElementById('email');
const result = document.getElementById('result');
const btn = document.getElementById('submit-btn');

// Elementos do header inteligente
const infoBadges = document.querySelectorAll('.info-badge');
const footerToggle = document.getElementById('footer-toggle');
const footerContent = document.getElementById('footer-content');

// Elementos de navegação
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const navInfo = document.getElementById('nav-info');

// Controle de seções
const sections = ['regras', 'como-funciona', 'precos', 'pos-agendar'];
let currentSectionIndex = 0;

document.getElementById('year').textContent = new Date().getFullYear();

// Funcionalidade dos badges informativos
infoBadges.forEach(badge => {
  badge.addEventListener('click', () => {
    const section = badge.dataset.section;
    
    // Remove classe active de todos os badges
    infoBadges.forEach(b => b.classList.remove('active'));
    
    // Adiciona classe active ao badge clicado
    badge.classList.add('active');
    
    // Expande o footer se não estiver expandido
    if (!footerContent.classList.contains('active')) {
      footerContent.classList.add('active');
      footerToggle.textContent = '📚 Ocultar Informações';
      footerToggle.classList.add('active');
    }
    
    // Navega para a seção correspondente
    navigateToSection(section);
  });
});

// Navegação entre seções
function navigateToSection(sectionName) {
  // Esconde todas as seções
  document.querySelectorAll('.footer-section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Mostra a seção selecionada
  const targetSection = document.getElementById(sectionName);
  if (targetSection) {
    targetSection.classList.add('active');
    
    // Atualiza o índice atual
    currentSectionIndex = sections.indexOf(sectionName);
    
    // Atualiza navegação
    updateNavigation();
    
    // Destaque visual da seção
    targetSection.style.background = 'rgba(159, 122, 234, 0.05)';
    targetSection.style.borderRadius = '8px';
    targetSection.style.padding = '20px';
    targetSection.style.margin = '16px -8px';
    
    // Remove o destaque após 3 segundos
    setTimeout(() => {
      targetSection.style.background = '';
      targetSection.style.borderRadius = '';
      targetSection.style.padding = '';
      targetSection.style.margin = '';
    }, 3000);
  }
}

function updateNavigation() {
  // Atualiza botões
  prevBtn.disabled = currentSectionIndex === 0;
  nextBtn.disabled = currentSectionIndex === sections.length - 1;
  
  // Atualiza informação
  navInfo.textContent = `${currentSectionIndex + 1} de ${sections.length}`;
  
  // Atualiza badges
  infoBadges.forEach((badge, index) => {
    if (index === currentSectionIndex) {
      badge.classList.add('active');
    } else {
      badge.classList.remove('active');
    }
  });
}

// Event listeners para navegação
prevBtn.addEventListener('click', () => {
  if (currentSectionIndex > 0) {
    currentSectionIndex--;
    navigateToSection(sections[currentSectionIndex]);
  }
});

nextBtn.addEventListener('click', () => {
  if (currentSectionIndex < sections.length - 1) {
    currentSectionIndex++;
    navigateToSection(sections[currentSectionIndex]);
  }
});

// Funcionalidade do footer expandido
footerToggle.addEventListener('click', () => {
  const isExpanded = footerContent.classList.contains('active');
  
  if (isExpanded) {
    // Contrai o footer
    footerContent.classList.remove('active');
    footerToggle.textContent = '📚 Ver Informações Adicionais';
    footerToggle.classList.remove('active');
    
    // Remove classe active de todos os badges
    infoBadges.forEach(b => b.classList.remove('active'));
    
    // Reseta para primeira seção
    currentSectionIndex = 0;
    navigateToSection(sections[0]);
  } else {
    // Expande o footer
    footerContent.classList.add('active');
    footerToggle.textContent = '📚 Ocultar Informações';
    footerToggle.classList.add('active');
    
    // Mostra primeira seção por padrão
    navigateToSection(sections[0]);
  }
});

// Fecha tooltips quando clicar fora
document.addEventListener('click', (e) => {
  if (!e.target.closest('.info-badge')) {
    infoBadges.forEach(b => b.classList.remove('active'));
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = (emailInput.value || '').trim();
  if (!email) return;

  result.textContent = 'Verificando…';
  result.className = 'result';
  btn.disabled = true;

  try {
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.allowed) {
      result.textContent = 'Acesso liberado. Redirecionando para o Google Calendar... ✅';
      result.classList.add('success');
      
      // Criar e mostrar barra de progresso
      const progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';
      progressBar.innerHTML = '<div class="progress-fill"></div>';
      result.appendChild(progressBar);
      
      // Redirecionar para o Google Calendar específico após 3 segundos
      setTimeout(() => {
        window.location.href = 'https://calendar.app.google/J1oNY2yKwf7aNVGD6';
      }, 3000);
    } else {
      const reason = data?.reason || 'Acesso negado.';
      result.textContent = `${reason} ❌`;
      result.classList.add('error');
    }
  } catch (err) {
    result.textContent = 'Erro de rede. Tente novamente.';
    result.classList.add('error');
  } finally {
    btn.disabled = false;
  }
});
