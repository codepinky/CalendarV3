// JavaScript para a página de agendamento

// Usar configurações do arquivo config.js
const WORKING_HOURS = CONFIG.WORKING_HOURS;

// Cache para disponibilidade de horários
let availabilityCache = new Map();
let lastAvailabilityCheck = 0;

// Função para verificar disponibilidade de horários para uma data específica
async function checkAvailabilityForDate(date) {
  try {
    // Verificar se já temos dados em cache e se não estão muito antigos
    const cacheKey = date;
    const now = Date.now();
    
    if (availabilityCache.has(cacheKey) && 
        (now - lastAvailabilityCheck) < CONFIG.UI.refreshInterval) {
      console.log('Usando dados de disponibilidade em cache para:', date);
      return availabilityCache.get(cacheKey);
    }

    console.log('Verificando disponibilidade para:', date);
    
    const response = await fetch(`/api/availability?date=${date}`);
    const data = await response.json();
    
    if (data.success) {
      // Processar eventos do Google Calendar para calcular disponibilidade
      const processedData = processCalendarEvents(data.events, date);
      
      // Atualizar cache
      availabilityCache.set(cacheKey, processedData);
      lastAvailabilityCheck = now;
      
      console.log('Disponibilidade processada:', processedData);
      return processedData;
    } else {
      console.error('Erro ao verificar disponibilidade:', data.reason);
      return null;
    }
  } catch (error) {
    console.error('Erro na verificação de disponibilidade:', error);
    return null;
  }
}

// Função para processar eventos do Google Calendar e calcular disponibilidade
function processCalendarEvents(events, date) {
  // Horários base do sistema (deve corresponder ao config.js)
  const baseSlots = ["13:30", "15:30", "17:30", "19:30"];
  const bookedSlots = [];
  
  // Processar eventos do Google Calendar
  if (events && events.length > 0) {
    events.forEach(event => {
      if (event.start && event.start.dateTime) {
        try {
          // Converter para data local
          const startTime = new Date(event.start.dateTime);
          const hour = startTime.getHours();
          const minute = startTime.getMinutes();
          const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          
          // Só incluir se for um dos horários base do sistema
          if (baseSlots.includes(timeSlot)) {
            bookedSlots.push(timeSlot);
          }
        } catch (error) {
          console.warn('Erro ao processar evento:', event, error);
        }
      }
    });
  }
  
  // Filtrar horários disponíveis
  const availableSlots = baseSlots.filter(slot => !bookedSlots.includes(slot));
  
  console.log('Horários base:', baseSlots);
  console.log('Horários agendados:', bookedSlots);
  console.log('Horários disponíveis:', availableSlots);
  
  return {
    success: true,
    date: date,
    availableSlots: availableSlots,
    bookedSlots: bookedSlots,
    lastUpdated: new Date().toISOString(),
    totalEvents: events ? events.length : 0
  };
}

// Função para gerar as próximas datas disponíveis (8 dias)
function generateAvailableDates() {
  const dateSelector = document.querySelector('.date-selector');
  const today = new Date();
  const availableDates = [];
  
  // Gerar as próximas datas disponíveis
  for (let i = 0; i < CONFIG.UI.maxDates; i++) {
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
      document.getElementById('meeting-date').value = date;
      console.log('Data selecionada:', date);
      console.log('Campo date após atualização:', document.getElementById('meeting-date').value);
      // Gerar horários para esta data
      generateTimeSlots();
    });
    
    dateSlotsContainer.appendChild(dateSlot);
    
    // Selecionar a primeira data por padrão
    if (index === 0) {
      dateSlot.classList.add('selected');
      document.getElementById('meeting-date').value = date;
      console.log('Data padrão selecionada:', date);
    }
  });
}

// Função para calcular o horário de fim (1 hora depois)
function getEndTime(startTime) {
  const [hour, minute] = startTime.split(':').map(Number);
  const endHour = hour + 1;
  return `${endHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

// Função para gerar os horários disponíveis
async function generateTimeSlots() {
  const timeSlotsContainer = document.querySelector('.time-slots');
  const selectedDate = document.getElementById('meeting-date').value;
  
  console.log('generateTimeSlots - Data selecionada:', selectedDate);
  
  if (!selectedDate) return;
  
  // Mostrar loading
  timeSlotsContainer.innerHTML = '<div class="loading-slots">Carregando horários disponíveis...</div>';
  
  try {
    // Verificar disponibilidade para esta data
    const availability = await checkAvailabilityForDate(selectedDate);
    
    if (!availability) {
      timeSlotsContainer.innerHTML = '<div class="error-slots">Erro ao carregar horários. Tente novamente.</div>';
      return;
    }
    
    // Limpar loading
    timeSlotsContainer.innerHTML = '';
    
    // Gerar todos os horários possíveis
    const allSlots = [];
    let currentTime = WORKING_HOURS.start;
    
    while (currentTime < WORKING_HOURS.end) {
      const startHour = Math.floor(currentTime);
      const startMinute = (currentTime % 1) * 60;
      const endTime = currentTime + WORKING_HOURS.duration;
      const endHour = Math.floor(endTime);
      const endMinute = (endTime % 1) * 60;
      
      const startTimeStr = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
      const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      
      allSlots.push({
        start: startTimeStr,
        end: endTimeStr,
        value: startTimeStr
      });
      
      currentTime += WORKING_HOURS.interval;
    }
    
    // Filtrar horários disponíveis vs. agendados
    const availableSlots = allSlots.filter(slot => 
      availability.availableSlots.includes(slot.start)
    );
    
    const bookedSlots = allSlots.filter(slot => 
      availability.bookedSlots.includes(slot.start)
    );
    
    console.log('Horários disponíveis:', availableSlots.map(s => s.start));
    console.log('Horários agendados:', bookedSlots.map(s => s.start));
    
    // Criar elementos HTML para horários disponíveis
    availableSlots.forEach(slot => {
      const timeSlot = document.createElement('div');
      timeSlot.className = 'time-slot available';
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
        // Atualizar campo hidden com apenas o horário de início
        document.getElementById('meeting-time').value = slot.start;
        console.log('Horário selecionado:', slot.start);
      });
      
      timeSlotsContainer.appendChild(timeSlot);
    });
    
    // Criar elementos HTML para horários agendados (se configurado para mostrar)
    if (CONFIG.SYNC.showBookedSlots) {
      bookedSlots.forEach(slot => {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot booked';
        timeSlot.dataset.time = slot.value;
        
        timeSlot.innerHTML = `
          <span class="time-start">${slot.start} - ${slot.end}</span>
          <span class="time-duration">1 hora de atendimento</span>
          <span class="time-booked">Horário Agendado</span>
        `;
        
        // Não adicionar evento de clique para horários agendados
        timeSlot.style.cursor = 'not-allowed';
        timeSlot.style.opacity = '0.6';
        
        timeSlotsContainer.appendChild(timeSlot);
      });
    }
    
    // Se não há horários disponíveis
    if (availableSlots.length === 0) {
      timeSlotsContainer.innerHTML = '<div class="no-slots">Nenhum horário disponível para esta data. Tente outra data.</div>';
    }
    
  } catch (error) {
    console.error('Erro ao gerar horários:', error);
    timeSlotsContainer.innerHTML = '<div class="error-slots">Erro ao carregar horários. Tente novamente.</div>';
  }
}

// Função para lidar com refresh manual dos horários
async function handleManualRefresh() {
  const refreshBtn = document.getElementById('refresh-times');
  const selectedDate = document.getElementById('meeting-date').value;
  
  if (!selectedDate) {
    showResult('info', 'Selecione uma data primeiro para atualizar os horários.');
    return;
  }
  
  try {
    // Adicionar estado de loading ao botão
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;
    
    // Limpar cache para forçar nova verificação
    availabilityCache.delete(selectedDate);
    
    // Atualizar horários
    await generateTimeSlots();
    
    // Mostrar mensagem de sucesso
    showResult('success', 'Horários atualizados com sucesso!');
    
  } catch (error) {
    console.error('Erro no refresh manual:', error);
    showResult('error', 'Erro ao atualizar horários. Tente novamente.');
  } finally {
    // Remover estado de loading
    refreshBtn.classList.remove('loading');
    refreshBtn.disabled = false;
  }
}

// Função para lidar com o envio do formulário
async function handleSubmit(event) {
  event.preventDefault();
  
  const submitBtn = document.getElementById('submit-btn');
  const originalText = submitBtn.textContent;
  
  try {
    // Desabilitar botão e mostrar loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    
    // Debug: verificar campos hidden antes do FormData
    console.log('Campo date antes do FormData:', document.getElementById('meeting-date').value);
    console.log('Campo time antes do FormData:', document.getElementById('meeting-time').value);
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    
    // Debug: ver o que está sendo capturado
    console.log('Dados capturados do formulário:', data);
    console.log('Data selecionada:', data['meeting-date']);
    console.log('Horário selecionado:', data['meeting-time']);
    console.log('Nome:', data.name);
    console.log('Email:', data.email);
    console.log('Telefone:', data.phone);
    
    // Validações básicas
    if (!data['meeting-date'] || !data['meeting-time'] || !data.name || !data.email || !data.phone) {
      console.log('Campos faltando:');
      if (!data['meeting-date']) console.log('- Data não selecionada');
      if (!data['meeting-time']) console.log('- Horário não selecionado');
      if (!data.name) console.log('- Nome não preenchido');
      if (!data.email) console.log('- Email não preenchido');
      if (!data.phone) console.log('- Telefone não preenchido');
      throw new Error('Por favor, preencha todos os campos obrigatórios.');
    }
    
    // Formatar dados para o Make (formato que a API espera)
    const makeData = {
      date: data['meeting-date'],
      time: data['meeting-time'],
      datetime: `${data['meeting-date']}T${data['meeting-time']}:00`,
      name: data.name,
      email: data.email,
      phone: data.phone,
      age: data.age || '',
      city: data.city || '',
      state: data.state || '',
      reason: data.reason || 'Agendamento via site',
      duration: 60,
      timestamp: new Date().toISOString(),
      source: 'Agenda Online'
    };
    
    // Enviar para a API local que gerencia o Make
    const response = await fetch('/api/booking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(makeData)
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.reason || 'Erro ao enviar agendamento. Tente novamente.');
    }
    
    // Sucesso!
    showResult('success', result.message || 'Agendamento enviado com sucesso! Entraremos em contato para confirmar.');
    
    // Limpar formulário
    event.target.reset();
    
    // Resetar seleções visuais
    document.querySelectorAll('.date-slot.selected, .time-slot.selected').forEach(el => {
      el.classList.remove('selected');
    });
    
    // Marcar horário como indisponível no cache local
    const bookedDate = data['meeting-date'];
    const bookedTime = data['meeting-time'];
    
    if (availabilityCache.has(bookedDate)) {
      const availability = availabilityCache.get(bookedDate);
      // Remover horário dos disponíveis
      availability.availableSlots = availability.availableSlots.filter(time => time !== bookedTime);
      // Adicionar horário aos agendados
      if (!availability.bookedSlots.includes(bookedTime)) {
        availability.bookedSlots.push(bookedTime);
      }
      // Atualizar cache
      availabilityCache.set(bookedDate, availability);
      console.log('Cache atualizado após agendamento:', availability);
    }
    
    // Selecionar primeira data novamente
    const firstDateSlot = document.querySelector('.date-slot');
    if (firstDateSlot) {
      firstDateSlot.classList.add('selected');
      document.getElementById('meeting-date').value = firstDateSlot.dataset.date;
      generateTimeSlots();
    }
    
  } catch (error) {
    console.error('Erro no agendamento:', error);
    showResult('error', error.message);
  } finally {
    // Restaurar botão
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// Função para mostrar resultados
function showResult(type, message) {
  // Remover resultado anterior
  const existingResult = document.querySelector('.result');
  if (existingResult) {
    existingResult.remove();
  }
  
  // Criar novo resultado
  const resultDiv = document.createElement('div');
  resultDiv.className = `result ${type}`;
  resultDiv.textContent = message;
  
  // Inserir após o botão
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.parentNode.insertBefore(resultDiv, submitBtn.nextSibling);
  
  // Auto-remover após o tempo configurado
  setTimeout(() => {
    if (resultDiv.parentNode) {
      resultDiv.remove();
    }
  }, CONFIG.UI.resultTimeout);
}

// Inicialização quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
  // Gerar datas disponíveis
  generateAvailableDates();
  
  // Adicionar evento para mudança de data
  document.getElementById('meeting-date').addEventListener('change', generateTimeSlots);
  
  // Adicionar evento para envio do formulário
  document.getElementById('booking-form').addEventListener('submit', handleSubmit);
  
  // Adicionar evento para refresh manual dos horários
  document.getElementById('refresh-times').addEventListener('click', handleManualRefresh);
  
  // Inicializar sistema de atualização automática
  if (CONFIG.SYNC.autoRefresh) {
    initializeAutoRefresh();
  }
  
  // Header/Footer Intelligent Logic
  const infoBadges = document.querySelectorAll('.info-badge');
  const footerToggle = document.getElementById('footer-toggle');
  const footerContent = document.getElementById('footer-content');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const navInfo = document.getElementById('nav-info');
  
  // Botão Voltar ao Topo
  const backToTopBtn = document.getElementById('back-to-top');
  
  const sections = ['regras', 'como-funciona', 'precos', 'pos-agendar'];
  let currentSectionIndex = 0;
  
  // Função para inicializar atualização automática
  function initializeAutoRefresh() {
    // Atualizar disponibilidade a cada intervalo configurado
    setInterval(() => {
      const selectedDate = document.getElementById('meeting-date').value;
      if (selectedDate) {
        console.log('Atualização automática de disponibilidade para:', selectedDate);
        // Limpar cache para forçar nova verificação
        availabilityCache.delete(selectedDate);
        generateTimeSlots();
      }
    }, CONFIG.UI.refreshInterval);
    
    console.log('Sistema de atualização automática inicializado - intervalo:', CONFIG.UI.refreshInterval / 1000, 'segundos');
  }
  
  // Função para mostrar/ocultar botão voltar ao topo
  function toggleBackToTop() {
    if (window.pageYOffset > 300) {
      backToTopBtn.classList.add('visible');
    } else {
      backToTopBtn.classList.remove('visible');
    }
  }
  
  // Função para voltar ao topo
  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
  
  // Event listeners para o botão voltar ao topo
  window.addEventListener('scroll', toggleBackToTop);
  backToTopBtn.addEventListener('click', scrollToTop);
  
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

// Função para scroll suave até o footer
function scrollToFooter() {
  const footer = document.querySelector('.smart-footer');
  if (footer) {
    // Primeiro expandir o footer se estiver fechado
    const footerContent = document.getElementById('footer-content');
    const footerToggle = document.getElementById('footer-toggle');
    
    if (!footerContent.classList.contains('active')) {
      footerToggle.click(); // Simula o clique para expandir
    }
    
    // Scroll suave até o footer
    setTimeout(() => {
      footer.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
    }, 300);
  }
}
