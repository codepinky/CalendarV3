// JavaScript para a página de agendamento

// Configurações dos horários de trabalho
const WORKING_HOURS = {
  start: 13.5, // 13:30
  end: 21.5,   // 21:30
  interval: 2, // 2 horas entre encontros (1h encontro + 1h intervalo)
  duration: 1  // 1 hora de duração
};

// Função para gerar as próximas datas disponíveis (8 dias)
function generateAvailableDates() {
  const dateSelector = document.querySelector('.date-selector');
  const today = new Date();
  const availableDates = [];
  
  // Gerar os próximos 8 dias
  for (let i = 0; i < 8; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    // Formatar a data para o formato YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    availableDates.push(formattedDate);
  }
  
  // Limpar conteúdo existente
  dateSelector.innerHTML = `
    <label for="date">Data do Encontro</label>
    <div class="date-slots">
      <!-- As datas serão geradas aqui -->
    </div>
    <input type="hidden" id="date" name="date" required>
  `;
  
  const dateSlotsContainer = dateSelector.querySelector('.date-slots');
  
  // Adicionar as datas disponíveis como slots visuais
  availableDates.forEach((date, index) => {
    const dateSlot = document.createElement('div');
    dateSlot.className = 'date-slot';
    dateSlot.dataset.date = date;
    
    // Formatar a data para exibição
    const displayDate = new Date(date);
    const dayOfWeek = displayDate.toLocaleDateString('pt-BR', { weekday: 'short' });
    const day = displayDate.getDate();
    const month = displayDate.toLocaleDateString('pt-BR', { month: 'short' });
    
    dateSlot.innerHTML = `
      <span class="date-day">${day}</span>
      <span class="date-month">${month}</span>
      <span class="date-weekday">${dayOfWeek}</span>
    `;
    
    // Adicionar evento de clique
    dateSlot.addEventListener('click', () => {
      // Remover seleção anterior
      document.querySelectorAll('.date-slot').forEach(s => s.classList.remove('selected'));
      // Selecionar esta data
      dateSlot.classList.add('selected');
      // Atualizar campo hidden
      document.getElementById('date').value = date;
      // Gerar horários para esta data
      generateTimeSlots();
    });
    
    dateSlotsContainer.appendChild(dateSlot);
    
    // Selecionar a primeira data por padrão
    if (index === 0) {
      dateSlot.classList.add('selected');
      document.getElementById('date').value = date;
    }
  });
}

// Função para gerar os horários disponíveis
function generateTimeSlots() {
  const timeSlotsContainer = document.querySelector('.time-slots');
  const selectedDate = document.getElementById('date').value;
  
  if (!selectedDate) return;
  
  // Limpar horários existentes
  timeSlotsContainer.innerHTML = '';
  
  // Gerar horários disponíveis
  const slots = [];
  let currentTime = WORKING_HOURS.start;
  
  while (currentTime < WORKING_HOURS.end) {
    const startHour = Math.floor(currentTime);
    const startMinute = (currentTime % 1) * 60;
    const endTime = currentTime + WORKING_HOURS.duration;
    const endHour = Math.floor(endTime);
    const endMinute = (endTime % 1) * 60;
    
    const startTimeStr = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
    const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
    
    slots.push({
      start: startTimeStr,
      end: endTimeStr,
      value: startTimeStr
    });
    
    currentTime += WORKING_HOURS.interval;
  }
  
  // Criar elementos HTML para cada horário
  slots.forEach(slot => {
    const timeSlot = document.createElement('div');
    timeSlot.className = 'time-slot';
    timeSlot.dataset.time = slot.value;
    
    timeSlot.innerHTML = `
      <span class="time-start">${slot.start} - ${slot.end}</span>
      <span class="time-duration">1 hora de atendimento</span>
      <span class="time-available">Horário Disponível</span>
    `;
    
    // Adicionar evento de clique
    timeSlot.addEventListener('click', () => {
      // Remover seleção anterior
      document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
      // Selecionar este horário
      timeSlot.classList.add('selected');
      // Atualizar campo hidden
      document.getElementById('time').value = slot.value;
    });
    
    timeSlotsContainer.appendChild(timeSlot);
  });
}

// Função para lidar com o envio do formulário
function handleSubmit(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData);
  
  // Validações básicas
  if (!data.date || !data.time || !data.name || !data.email || !data.phone) {
    alert('Por favor, preencha todos os campos obrigatórios.');
    return;
  }
  
  // Aqui você pode adicionar a lógica para enviar os dados
  console.log('Dados do agendamento:', data);
  
  // Exemplo de sucesso
  alert('Agendamento realizado com sucesso! Entraremos em contato para confirmar.');
}

// Inicialização quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
  // Gerar datas disponíveis
  generateAvailableDates();
  
  // Adicionar evento para mudança de data
  document.getElementById('date').addEventListener('change', generateTimeSlots);
  
  // Adicionar evento para envio do formulário
  document.getElementById('booking-form').addEventListener('submit', handleSubmit);
  
  // Header/Footer Intelligent Logic
  const infoBadges = document.querySelectorAll('.info-badge');
  const footerToggle = document.getElementById('footer-toggle');
  const footerContent = document.getElementById('footer-content');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const navInfo = document.getElementById('nav-info');
  
  const sections = ['regras', 'como-funciona', 'precos', 'pos-agendar'];
  let currentSectionIndex = 0;
  
  // Inicializar primeira seção
  navigateToSection(sections[0]);
  
  // Ativar primeiro badge por padrão
  if (infoBadges.length > 0) {
    infoBadges[0].classList.add('active');
  }
  
  // Event listeners para badges
  infoBadges.forEach(badge => {
    badge.addEventListener('click', () => {
      const section = badge.dataset.section;
      
      // Remover active de todos os badges
      infoBadges.forEach(b => b.classList.remove('active'));
      // Adicionar active ao badge clicado
      badge.classList.add('active');
      
      // Expandir footer se não estiver ativo
      if (!footerContent.classList.contains('active')) {
        footerToggle.click();
      }
      
      // Navegar para a seção
      navigateToSection(section);
      
      // Scroll suave para a seção
      setTimeout(() => {
        const targetSection = document.getElementById(section);
        if (targetSection) {
          targetSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 100); // Pequeno delay para garantir que a seção esteja visível
    });
  });
  
  function navigateToSection(sectionName) {
    // Esconder todas as seções
    document.querySelectorAll('.footer-section').forEach(section => {
      section.classList.remove('active');
    });
    
    // Mostrar a seção selecionada
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
      targetSection.classList.add('active');
      currentSectionIndex = sections.indexOf(sectionName);
      updateNavigation();
      
      // Aplicar highlight temporário
      targetSection.style.animation = 'none';
      targetSection.offsetHeight; // Trigger reflow
      targetSection.style.animation = 'fadeIn 0.3s ease';
    }
  }
  
  function updateNavigation() {
    // Atualizar botões de navegação
    prevBtn.disabled = currentSectionIndex === 0;
    nextBtn.disabled = currentSectionIndex === sections.length - 1;
    
    // Atualizar informação de navegação
    navInfo.textContent = `${currentSectionIndex + 1} de ${sections.length}`;
    
    // Sincronizar badge ativo
    infoBadges.forEach((badge, index) => {
      badge.classList.toggle('active', index === currentSectionIndex);
    });
  }
  
  // Event listeners para navegação
  prevBtn.addEventListener('click', () => {
    if (currentSectionIndex > 0) {
      currentSectionIndex--;
      const sectionName = sections[currentSectionIndex];
      navigateToSection(sectionName);
      
      // Scroll suave para a seção
      setTimeout(() => {
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
          targetSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 100);
    }
  });
  
  nextBtn.addEventListener('click', () => {
    if (currentSectionIndex < sections.length - 1) {
      currentSectionIndex++;
      const sectionName = sections[currentSectionIndex];
      navigateToSection(sectionName);
      
      // Scroll suave para a seção
      setTimeout(() => {
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
          targetSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 100);
    }
  });
  
  // Event listener para toggle do footer
  footerToggle.addEventListener('click', () => {
    footerContent.classList.toggle('active');
    footerToggle.classList.toggle('active');
    
    if (footerContent.classList.contains('active')) {
      footerToggle.textContent = 'Ocultar Informações';
      // Reset para primeira seção
      currentSectionIndex = 0;
      navigateToSection(sections[0]);
      
      // Scroll suave para o footer quando expandir
      setTimeout(() => {
        footerContent.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }, 200); // Delay maior para garantir que a animação termine
    } else {
      footerToggle.textContent = 'Ver Informações';
    }
  });
  
  // Fechar tooltips ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.info-badge')) {
      document.querySelectorAll('.tooltip').forEach(tooltip => {
        tooltip.style.display = 'none';
      });
    }
  });
});
