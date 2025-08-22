// JavaScript para a página de agendamento

// Usar configurações do arquivo config.js
const WORKING_HOURS = CONFIG.WORKING_HOURS;

// Função para calcular semanas do mês (sempre começando no domingo)
function getWeeksOfMonth(year, month) {
  const weeks = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Encontrar o primeiro domingo do mês (ou domingo anterior)
  let startDate = new Date(firstDay);
  const dayOfWeek = firstDay.getDay(); // 0 = Domingo
  startDate.setDate(firstDay.getDate() - dayOfWeek);
  
  // Gerar semanas até cobrir todo o mês (mínimo 5 semanas)
  while (startDate <= lastDay || weeks.length < 5) {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // +6 para chegar no sábado
    
    weeks.push({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      weekNumber: weeks.length + 1,
      label: `Semana ${weeks.length + 1}`
    });
    
    startDate.setDate(startDate.getDate() + 7); // Próxima semana
  }
  
  return weeks;
}

// Função para obter a semana atual (baseada no dia atual)
function getCurrentWeek() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  const weeks = getWeeksOfMonth(year, month);
  
  // Encontrar a semana que contém o dia atual
  for (const week of weeks) {
    const weekStart = new Date(week.startDate);
    const weekEnd = new Date(week.endDate);
    
    if (today >= weekStart && today <= weekEnd) {
      return week;
    }
  }
  
  // Fallback: primeira semana do mês
  return weeks[0];
}

// Função para verificar disponibilidade de horários para uma data específica
async function checkAvailabilityForDate(date) {
  try {
    console.log('Verificando disponibilidade para:', date);
    
    const response = await fetch(`/api/availability?date=${date}`);
    const data = await response.json();
    
    if (data.success) {
      // Processar dados do Make para calcular disponibilidade
      const processedData = processCalendarEvents(data, date);
      
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

// NOVA FUNÇÃO: Verificar disponibilidade para uma semana inteira
async function checkWeeklyAvailability(startDate, endDate) {
  try {
    console.log('🔄 Verificando disponibilidade semanal:', startDate, 'a', endDate);
    
    const response = await fetch(`/api/availability?startDate=${startDate}&endDate=${endDate}`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Disponibilidade semanal recebida:', data);
      return data;
    } else {
      console.error('❌ Erro ao verificar disponibilidade semanal:', data.reason);
      return null;
    }
  } catch (error) {
    console.error('💥 Erro na verificação de disponibilidade semanal:', error);
    return null;
  }
}

// Função para processar dados de disponibilidade do Make
function processCalendarEvents(availabilityData, date) {
  // Verificar se os dados são válidos
  if (!availabilityData) {
    console.log('⚠️ Dados do Make são undefined, usando fallback padrão');
    return {
      success: true,
      date: date,
      availableSlots: generateDefaultTimeSlots(date),
      bookedSlots: [],
      lastUpdated: new Date().toISOString(),
      totalEvents: 0,
      source: 'Fallback - Dados Make undefined'
    };
  }

  // NOVO FORMATO: Se vier do Make com wrapper busy
  if (availabilityData && availabilityData.occupied && availabilityData.occupied.busy) {
    console.log('✅ Dados recebidos do Make com wrapper busy:', availabilityData);
    
    // CORREÇÃO: Usar diretamente os dados processados pelo backend
    // NÃO reprocessar - o backend já fez todo o trabalho!
    return {
      success: true,
      date: date,
      availableSlots: availabilityData.availableSlots || [],
      bookedSlots: availabilityData.bookedSlots || [],
      lastUpdated: new Date().toISOString(),
      totalEvents: availabilityData.occupied.busy.length,
      timezone: availabilityData.timezone || 'America/Sao_Paulo',
      source: 'Make Integration (Backend Processed)'
    };
  }
  
  // O Make agora retorna dados já processados
  if (availabilityData && availabilityData.availableSlots) {
    console.log('✅ Dados processados recebidos do Make:', availabilityData);
    
    // CORREÇÃO: Aplicar lógica de exclusão de horários consecutivos
    const originalSlots = availabilityData.availableSlots || [];
    
    // 1. Filtrar horários alternados
    const alternateSlots = originalSlots.filter((slot, index) => {
      // Manter apenas horários alternados (índices pares: 0, 2, 4, 6, 8)
      // Isso garante: 13:30, 15:30, 17:30, 19:30, 21:30
      return index % 2 === 0;
    });
    
    // 2. Filtrar horários que já passaram (para o dia atual)
    const currentDate = new Date();
    const selectedDate = new Date(date);
    
    // CORREÇÃO: Comparação mais robusta de datas
    const currentDay = currentDate.getDate();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const selectedDay = selectedDate.getDate();
    const selectedMonth = selectedDate.getMonth();
    const selectedYear = selectedDate.getFullYear();
    
    const isToday = (currentDay === selectedDay) && 
                   (currentMonth === selectedMonth) && 
                   (currentYear === selectedYear);
    
    console.log(`📅 Data atual: ${currentDate.toLocaleDateString()}`);
    console.log(`📅 Data selecionada: ${selectedDate.toLocaleDateString()}`);
    console.log(`📅 É hoje? ${isToday}`);
    
    const filteredSlots = alternateSlots.filter(slot => {
      if (!isToday) {
        console.log(`✅ Data ${date} não é hoje - todos os horários disponíveis`);
        return true; // Se não é hoje, todos os horários estão disponíveis
      }
      
      // Para hoje, verificar se o horário já passou
      const [hour, minute] = slot.split(':').map(Number);
      const slotTime = new Date();
      slotTime.setHours(hour, minute, 0, 0);
      
      const now = new Date();
      const hasPassed = slotTime < now;
      
      if (hasPassed) {
        console.log(`⏰ Horário ${slot} já passou (${now.toLocaleTimeString()})`);
        return false; // Horário já passou
      }
      
      console.log(`✅ Horário ${slot} ainda não chegou`);
      return true; // Horário ainda não chegou
    });
    
    console.log('📅 Horários originais recebidos:', originalSlots);
    console.log('⏰ Horários filtrados (alternados):', filteredSlots);
    
    return {
      success: true,
      date: date,
      availableSlots: filteredSlots,
      bookedSlots: availabilityData.bookedSlots || [],
      lastUpdated: new Date().toISOString(),
      totalEvents: availabilityData.totalEvents || 0,
      source: 'Make Integration (Frontend Filtered)'
    };
  }
  
  // Fallback para dados antigos (se ainda houver)
  const bookedSlots = [];
  
  if (availabilityData && availabilityData.events) {
    availabilityData.events.forEach(event => {
      if (event.start && event.start.dateTime) {
        try {
          const startTime = new Date(event.start.dateTime);
          
          // Converter para timezone local (America/Sao_Paulo)
          const localStartTime = new Date(startTime.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
          
          const hour = localStartTime.getHours();
          const minute = localStartTime.getMinutes();
          // Formatar para o padrão HH:30 (mesmo padrão do backend)
          const timeSlot = `${hour.toString().padStart(2, '0')}:30`;
          bookedSlots.push(timeSlot);
        } catch (error) {
          console.warn('⚠️ Erro ao processar evento:', event, error);
        }
      }
    });
  }
  
  console.log('📅 Dados recebidos do Make:', availabilityData);
  console.log('⏰ Horários agendados encontrados:', bookedSlots);
  
  return {
    success: true,
    date: date,
    availableSlots: availabilityData.availableSlots || generateDefaultTimeSlots(date),
    bookedSlots: bookedSlots,
    lastUpdated: new Date().toISOString(),
    totalEvents: availabilityData.totalEvents || 0,
    source: 'Make Integration'
  };
}

// Função para gerar horários padrão de trabalho
function generateDefaultTimeSlots(date) {
  const slots = [];
  const startHour = 13; // 13:30
  const endHour = 22;   // 22:30
  const interval = 1;   // 1 hora
  
  for (let hour = startHour; hour < endHour; hour += interval) {
    const timeSlot = `${hour.toString().padStart(2, '0')}:30`;
    slots.push(timeSlot);
  }
  
  return slots;
}

// Função para gerar as próximas datas disponíveis (8 dias)
function generateAvailableDates() {
  const dateSelector = document.querySelector('.date-selector');
  const today = new Date();
  const availableDates = [];
  
  // CORREÇÃO: Gerar datas de forma mais robusta para evitar problemas de timezone
  for (let i = 0; i < CONFIG.UI.maxDates; i++) {
    // Usar UTC para evitar problemas de timezone
    const utcDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + i));
    
    // Formatar a data para o formato YYYY-MM-DD
    const year = utcDate.getUTCFullYear();
    const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(utcDate.getUTCDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    console.log(`🔍 DEBUG - Data ${i}: ${formattedDate} (UTC: ${utcDate.toISOString()})`);
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
      console.log('🎯 CLIQUE NA DATA - Data selecionada:', date);
      console.log('🎯 CLIQUE NA DATA - Campo date após atualização:', document.getElementById('date').value);
      console.log('🎯 CLIQUE NA DATA - Elemento date existe?', !!document.getElementById('date'));
      console.log('🎯 CLIQUE NA DATA - Elemento date ID:', document.getElementById('date')?.id);
      console.log('🎯 CLIQUE NA DATA - Elemento date name:', document.getElementById('date')?.name);
      // Gerar horários para esta data
      generateTimeSlots();
    });
    
    dateSlotsContainer.appendChild(dateSlot);
    
    // Selecionar a primeira data por padrão
    if (index === 0) {
      dateSlot.classList.add('selected');
      document.getElementById('date').value = date;
      console.log('🎯 DATA PADRÃO - Data selecionada:', date);
      console.log('🎯 DATA PADRÃO - Campo date após atualização:', document.getElementById('date').value);
      console.log('🎯 DATA PADRÃO - Elemento date existe?', !!document.getElementById('date'));
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
  const selectedDate = document.getElementById('date').value;
  
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
    
    console.log('📅 Dados de disponibilidade recebidos:', availability);
    
    // Verificar se temos horários disponíveis
    if (!availability.availableSlots || availability.availableSlots.length === 0) {
      if (availability.source === 'Fallback Mode') {
        timeSlotsContainer.innerHTML = '<div class="no-slots">⚠️ Usando horários padrão. Verifique a integração com o Make.</div>';
      } else {
        timeSlotsContainer.innerHTML = '<div class="no-slots">⚠️ Não foi possível verificar disponibilidade. Tente novamente ou entre em contato.</div>';
      }
      return;
    }
    
    // Criar elementos HTML para horários disponíveis (vindos do Make)
    availability.availableSlots.forEach(slot => {
      const timeSlot = document.createElement('div');
      timeSlot.className = 'time-slot available';
      timeSlot.dataset.time = slot;
      
      // Formatar horário para exibição
      const [startHour, startMinute] = slot.split(':');
      const endHour = parseInt(startHour) + 1;
      const endMinute = startMinute;
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      
      timeSlot.innerHTML = `
        <span class="time-start">${slot} - ${endTime}</span>
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
        document.getElementById('meeting-time').value = slot;
        console.log('Horário selecionado:', slot);
      });
      
      timeSlotsContainer.appendChild(timeSlot);
    });
    
    // Criar elementos HTML para horários agendados (se configurado para mostrar)
    if (CONFIG.SYNC.showBookedSlots && availability.bookedSlots && availability.bookedSlots.length > 0) {
      availability.bookedSlots.forEach(slot => {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot booked';
        timeSlot.dataset.time = slot;
        
        // Formatar horário para exibição
        const [startHour, startMinute] = slot.split(':');
        const endHour = parseInt(startHour) + 1;
        const endMinute = startMinute;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        
        timeSlot.innerHTML = `
          <span class="time-start">${slot} - ${endTime}</span>
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
    if (availability.availableSlots.length === 0) {
      if (availability.source === 'Fallback Mode') {
        timeSlotsContainer.innerHTML = '<div class="no-slots">⚠️ Não foi possível verificar disponibilidade. Tente novamente ou entre em contato.</div>';
      } else {
        timeSlotsContainer.innerHTML = '<div class="no-slots">Nenhum horário disponível para esta data. Tente outra data.</div>';
      }
    }
    
  } catch (error) {
    console.error('Erro ao gerar horários:', error);
    timeSlotsContainer.innerHTML = '<div class="error-slots">Erro ao carregar horários. Tente novamente.</div>';
  }
}

// Função para lidar com refresh manual dos horários
async function handleManualRefresh() {
  const refreshBtn = document.getElementById('refresh-times');
  const selectedDate = document.getElementById('date').value;
  
  if (!selectedDate) {
    showResult('info', 'Selecione uma data primeiro para atualizar os horários.');
    return;
  }
  
  try {
    // Adicionar estado de loading ao botão
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;
    
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
    console.log('🔍 DEBUG - Campo date antes do FormData:', document.getElementById('date').value);
    console.log('🔍 DEBUG - Campo time antes do FormData:', document.getElementById('meeting-time').value);
    console.log('🔍 DEBUG - Elemento date existe?', !!document.getElementById('date'));
    console.log('🔍 DEBUG - Elemento date ID:', document.getElementById('date')?.id);
    console.log('🔍 DEBUG - Elemento date name:', document.getElementById('date')?.name);
    
    // SOLUÇÃO DEFINITIVA: Usar o mesmo valor que funciona na verificação de disponibilidade
    const selectedDateSlot = document.querySelector('.date-slot.selected');
    if (!selectedDateSlot) {
      throw new Error('Nenhuma data selecionada. Por favor, selecione uma data.');
    }
    
    const selectedDate = selectedDateSlot.dataset.date;
    console.log('🎯 SOLUÇÃO - Data selecionada visualmente:', selectedDate);
    
    // Criar dados manualmente em vez de usar FormData
    const data = {
      date: selectedDate,
      'meeting-time': document.getElementById('meeting-time').value,
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      duration: document.getElementById('duration').value,
      reason: document.getElementById('reason').value
    };
    
    console.log('🎯 SOLUÇÃO - Dados capturados manualmente:', data);
    
    // Validações básicas
    if (!data['date'] || !data['meeting-time'] || !data.name || !data.email || !data.phone) {
      console.log('Campos faltando:');
      if (!data['date']) console.log('- Data não selecionada');
      if (!data['meeting-time']) console.log('- Horário não selecionado');
      if (!data.name) console.log('- Nome não preenchido');
      if (!data.email) console.log('- Email não preenchido');
      if (!data.phone) console.log('- Telefone não preenchido');
      throw new Error('Por favor, preencha todos os campos obrigatórios.');
    }
    
    // Formatar dados para o Make (formato que a API espera)
    const makeData = {
              date: data['date'],
      time: data['meeting-time'],
              datetime: `${data['date']}T${data['meeting-time']}:00`,
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
    
    // Debug: verificar campo date antes do reset
    console.log('🔍 ANTES DO RESET - Campo date:', document.getElementById('date').value);
    
    // Limpar formulário
    event.target.reset();
    
    // Debug: verificar campo date após o reset
    console.log('🔍 APÓS DO RESET - Campo date:', document.getElementById('date').value);
    
    // Resetar seleções visuais
    document.querySelectorAll('.date-slot.selected, .time-slot.selected').forEach(el => {
      el.classList.remove('selected');
    });
    
    // Marcar horário como indisponível no cache local
    const bookedDate = data['date'];
    const bookedTime = data['meeting-time'];
    
    // A lógica de atualização do cache foi removida, pois não há mais variáveis de cache
    // A geração de horários agora é feita diretamente com a chamada da API
    
    // Selecionar primeira data novamente
    const firstDateSlot = document.querySelector('.date-slot');
    if (firstDateSlot) {
      firstDateSlot.classList.add('selected');
      // NÃO sobrescrever o campo date aqui - deixar como está
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
      document.getElementById('date').addEventListener('change', generateTimeSlots);
  
  // Adicionar evento para envio do formulário
  document.getElementById('booking-form').addEventListener('submit', handleSubmit);
  
  // Adicionar evento para refresh manual dos horários
  document.getElementById('refresh-times').addEventListener('click', handleManualRefresh);
  
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
