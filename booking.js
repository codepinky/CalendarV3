// JavaScript para a página de agendamento

// Usar configurações do arquivo config.js
const WORKING_HOURS = CONFIG.WORKING_HOURS;

// OBSERVAÇÃO: Funções de semanas removidas - agora trabalhamos diretamente com dados do Make/availability



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

// Função para consultar disponibilidade semanal
async function checkWeeklyAvailability(startDate, endDate) {
  try {
    console.log('🔄 Consultando disponibilidade da semana:', startDate, 'a', endDate);
    
    // NOVA: Usar a funcionalidade de eventos "Atender"
    const response = await fetch(`/api/availability?checkAgendar=true&startDate=${startDate}&endDate=${endDate}`);
    const data = await response.json();
    
    if (data.success && data.agendarAvailability) {
      console.log('✅ Disponibilidade de eventos "Atender" recebida:', data);
      
      // Converter formato para compatibilidade com código existente
      const weeklyAvailability = {};
      Object.keys(data.agendarAvailability).forEach(date => {
        const dayData = data.agendarAvailability[date];
        weeklyAvailability[date] = {
          available: dayData.hasAvailability,
          slots: dayData.availableSlots || [],
          message: dayData.message,
          eventName: dayData.eventName
        };
      });
      
      console.log('🔄 Dados convertidos para formato compatível:', weeklyAvailability);
      
      return {
        success: true,
        weeklyAvailability: weeklyAvailability,
        source: data.source,
        lastUpdated: data.lastUpdated
      };
    } else {
      console.error('❌ Erro ao verificar disponibilidade de eventos Atender:', data.reason);
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
  
  // O Make agora retorna dados já processados com horários corretos
  if (availabilityData && availabilityData.availableSlots) {
    console.log('✅ Dados processados recebidos do Make:', availabilityData);
    
    const originalSlots = availabilityData.availableSlots || [];
    
    // Apenas filtrar horários que já passaram (para o dia atual)
    const currentDate = new Date();
    const [selectedYear, selectedMonth, selectedDay] = date.split('-').map(Number);
    const selectedDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
    
    const isToday = currentDate.toDateString() === selectedDate.toDateString();
    
    console.log(`📅 Data atual: ${currentDate.toLocaleDateString()}`);
    console.log(`📅 Data selecionada: ${selectedDate.toLocaleDateString()}`);
    console.log(`📅 É hoje? ${isToday}`);
    
    const filteredSlots = originalSlots.filter(slot => {
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
      
      console.log(`🕐 DEBUG TIMEZONE - Slot ${slot}:`);
      console.log(`   - Horário atual: ${now.toLocaleString('pt-BR')}`);
      console.log(`   - Horário do slot: ${slotTime.toLocaleString('pt-BR')}`);
      console.log(`   - Timezone offset: ${now.getTimezoneOffset()} minutos`);
      console.log(`   - Já passou? ${hasPassed}`);
      
      if (hasPassed) {
        console.log(`⏰ Horário ${slot} já passou (atual: ${now.toLocaleTimeString()})`);
        return false; // Horário já passou
      }
      
      console.log(`✅ Horário ${slot} ainda disponível`);
      return true; // Horário ainda não chegou
    });
    
    console.log('📅 Horários originais da API:', originalSlots);
    console.log('⏰ Horários finais (após filtro de tempo):', filteredSlots);
    
    return {
      success: true,
      date: date,
      availableSlots: filteredSlots,
      bookedSlots: availabilityData.bookedSlots || [],
      lastUpdated: new Date().toISOString(),
      totalEvents: availabilityData.totalEvents || 0,
      source: 'Make Integration (API + Time Filter)'
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

// Função para gerar horários padrão de trabalho (alternados)
function generateDefaultTimeSlots(date) {
  // CORREÇÃO: Horários alternados conforme solicitado
  return ['13:30', '15:30', '17:30', '19:30', '21:30'];
}

// Função para gerar mensagens amigáveis quando não há horários disponíveis
function generateFriendlyNoSlotsMessage(availability, selectedDate) {
  const today = new Date();
  const [selectedYear, selectedMonth, selectedDay] = selectedDate.split('-').map(Number);
  const selectedDateObj = new Date(selectedYear, selectedMonth - 1, selectedDay);
  const isToday = today.toDateString() === selectedDateObj.toDateString();
  const dayOfWeek = selectedDateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
  const formattedDate = selectedDateObj.toLocaleDateString('pt-BR');
  
  // Diferentes cenários e mensagens contextuais
  let message = '';
  let iconClass = 'no-slots';
  
  if (availability.source === 'Fallback Mode') {
    // Erro de integração com Make.com
    message = `
      <div class="${iconClass} fallback-error">
        <div class="message-icon">🔧</div>
        <div class="message-title">Sistema em Manutenção</div>
        <div class="message-content">
          Estamos verificando a disponibilidade de horários.<br>
          Por favor, tente novamente em alguns minutos.
        </div>
      </div>
    `;
  } else if (availability.bookedSlots && availability.bookedSlots.length > 0) {
    // Todos os horários estão ocupados
    const occupiedSlots = availability.bookedSlots.length;
    
    if (isToday) {
      message = `
        <div class="${iconClass} fully-booked-today">
          <div class="message-icon">😊</div>
          <div class="message-title">Hoje está bem movimentado!</div>
          <div class="message-content">
            Todos os ${occupiedSlots} horários de hoje (${formattedDate}) já foram agendados.<br>
            Que tal escolher outro dia?
          </div>
        </div>
      `;
    } else {
      message = `
        <div class="${iconClass} fully-booked">
          <div class="message-icon">📅</div>
          <div class="message-title">Este ${dayOfWeek} está lotado!</div>
          <div class="message-content">
            Todos os horários de ${formattedDate} já foram reservados.<br>
            Escolha outra data disponível para seu agendamento.
          </div>
        </div>
      `;
    }
  } else if (isToday) {
    // Para hoje, mas horários já passaram
    const currentHour = today.getHours();
    if (currentHour >= 22) {
      message = `
        <div class="${iconClass} too-late-today">
          <div class="message-icon">🌙</div>
          <div class="message-title">Ops! Já está tarde hoje</div>
          <div class="message-content">
            Os atendimentos de hoje já encerraram.<br>
            Que tal agendar para amanhã ou outro dia?
          </div>
        </div>
      `;
    } else {
      message = `
        <div class="${iconClass} no-more-today">
          <div class="message-icon">⏰</div>
          <div class="message-title">Horários de hoje não disponíveis</div>
          <div class="message-content">
            Os horários restantes de hoje já passaram ou estão ocupados.<br>
            Escolha outro dia para seu agendamento.
          </div>
        </div>
      `;
    }
  } else {
    // Data no futuro sem disponibilidade
    message = `
      <div class="${iconClass} no-availability">
        <div class="message-icon">📋</div>
        <div class="message-title">Sem horários disponíveis</div>
        <div class="message-content">
          Não há atendimentos disponíveis para ${dayOfWeek}, ${formattedDate}.<br>
          Escolha outra data que esteja disponível.
        </div>
      </div>
    `;
  }
  
  return message;
}





// Função para gerar os dias disponíveis baseado no availability do Make
async function generateAvailableDates() {
  const dateSelector = document.querySelector('.date-selector');
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  // Limpar conteúdo existente
  dateSelector.innerHTML = `
    <label for="date">Data do Encontro</label>
    <div class="loading-message">Carregando dias disponíveis...</div>
    <div class="date-slots" id="date-slots">
      <!-- Datas disponíveis serão geradas aqui -->
      </div>
    <input type="hidden" id="date" name="date" required>
  `;
  
  try {
    // Buscar dados de availability para o mês inteiro
    const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
    
    console.log('📅 DEBUG - Consultando API para período:', startOfMonth, 'a', endOfMonth);
    console.log('📅 DEBUG - Ano/Mês da consulta:', currentYear, '/', currentMonth + 1);
    
    const response = await fetch(`/api/availability?checkAgendar=true&startDate=${startOfMonth}&endDate=${endOfMonth}`);
    const data = await response.json();
    
    // Remover mensagem de loading
    const loadingMessage = document.querySelector('.loading-message');
    if (loadingMessage) loadingMessage.remove();
    
    if (data.success && data.agendarAvailability) {
      console.log('✅ Dados de availability recebidos:', data.agendarAvailability);
      generateDateSlotsFromAvailability(data.agendarAvailability);
    } else {
      console.error('❌ Erro ao buscar availability:', data.reason);
      showAvailabilityError('Erro ao carregar datas disponíveis. Tente novamente.');
    }
    
  } catch (error) {
    console.error('💥 Erro na busca de availability:', error);
    const loadingMessage = document.querySelector('.loading-message');
    if (loadingMessage) loadingMessage.remove();
    showAvailabilityError('Erro de conexão. Verifique sua internet e tente novamente.');
  }
}



// Função para gerar slots de datas baseado nos dados de availability do Make
function generateDateSlotsFromAvailability(availabilityData) {
  const dateSlotsContainer = document.querySelector('.date-slots');
  dateSlotsContainer.innerHTML = ''; // Limpar slots anteriores
  
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  console.log('📅 DEBUG - Data atual:', today.toISOString().split('T')[0]);
  console.log('📅 DEBUG - Mês atual:', currentMonth, '(0=Janeiro, 7=Agosto, 11=Dezembro)');
  console.log('📅 DEBUG - Ano atual:', currentYear);
  console.log('📅 Gerando slots baseado em availability:', availabilityData);
  
  // DEBUG: Verificar todas as chaves recebidas da API
  console.log('🔍 DEBUG - Todas as chaves recebidas da API:', Object.keys(availabilityData));
  console.log('🔍 DEBUG - Chaves com hasAvailability=true:', Object.keys(availabilityData).filter(key => availabilityData[key].hasAvailability === true));
  
  // Converter object para array e ordenar por data CRONOLOGICAMENTE
  const availableDays = Object.keys(availabilityData)
    .filter(dateKey => {
      const dayData = availabilityData[dateKey];
      // CORREÇÃO: Usar UTC para evitar problemas de timezone
      const [year, month, day] = dateKey.split('-').map(Number);
      const date = new Date(year, month - 1, day); // month-1 porque Date usa 0-11
      const dayOfWeek = date.getDay(); // 0=Domingo, 1=Segunda, ..., 6=Sábado
      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      
      // Debug detalhado
      console.log(`🔍 DEBUG - Analisando ${dateKey}:`);
      console.log(`  - Dia da semana: ${dayNames[dayOfWeek]} (${dayOfWeek})`);
      console.log(`  - Mês: ${date.getMonth()} (atual: ${currentMonth})`);
      console.log(`  - Ano: ${date.getFullYear()} (atual: ${currentYear})`);
      console.log(`  - hasAvailability: ${dayData.hasAvailability}`);
      console.log(`  - eventName: ${dayData.eventName}`);
      console.log(`  - eventStatus: ${dayData.eventStatus}`);
      
      // Debug específico para dia 25
      if (dateKey.includes('25')) {
        console.log(`🎯 ATENÇÃO - DIA 25 DETECTADO: ${dateKey}`);
        console.log(`  - Data completa: ${date.toString()}`);
        console.log(`  - getDay(): ${date.getDay()} (0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab)`);
        console.log(`  - MOTIVO: hasAvailability=${dayData.hasAvailability} - Se false, não aparece!`);
      }
      
      // CORREÇÃO: Remover filtro de dias úteis para mostrar TODOS os dias disponíveis
      // const isDayOfWeekValid = dayOfWeek >= 1 && dayOfWeek <= 6; // Segunda a sábado
      const isCurrentMonth = date.getMonth() === currentMonth;
      const isCurrentYear = date.getFullYear() === currentYear;
      const hasAvailability = dayData.hasAvailability === true;
      
      // CORREÇÃO: Mostrar todos os dias com availability, independente do dia da semana
      const passesFilter = isCurrentMonth && isCurrentYear && hasAvailability;
      
      console.log(`  - Passou no filtro: ${passesFilter}`);
      console.log(`    - Dia útil válido: ${true}`); // Sempre true agora
      console.log(`    - Mês atual: ${isCurrentMonth}`);
      console.log(`    - Ano atual: ${isCurrentYear}`);
      console.log(`    - Tem availability: ${hasAvailability}`);
      console.log('---');
      
      return passesFilter;
    })
    .sort((a, b) => {
      // CORREÇÃO: Ordenar cronologicamente por data
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA - dateB;
    });
  
  console.log('📅 Dias disponíveis filtrados e ordenados:', availableDays);
  console.log('📅 Total de dias disponíveis após filtro:', availableDays.length);
  
  if (availableDays.length === 0) {
    showAvailabilityError('Nenhum dia disponível encontrado para este mês.');
    return;
  }
  
  // Gerar um slot para cada dia disponível
  availableDays.forEach((dateKey, index) => {
    const dayData = availabilityData[dateKey];
    // CORREÇÃO: Usar a mesma lógica de criação de data
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.toLocaleDateString('pt-BR', { weekday: 'short' });
    const dayNum = date.getDate();
    const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
    
    console.log(`✅ Criando slot ${index + 1}/${availableDays.length} para: ${dateKey} (${dayData.eventName})`);
    
    const dateSlot = document.createElement('div');
    dateSlot.className = 'date-slot available';
    dateSlot.dataset.date = dateKey;
    dateSlot.title = dayData.message || 'Dia disponível para agendamento';
    
    dateSlot.innerHTML = `
      <span class="date-day">${dayNum}</span>
      <span class="date-month">${monthName}</span>
      <span class="date-weekday">${dayOfWeek}</span>
      <span class="availability-indicator">Disponível</span>
    `;
    
    // Adicionar evento de clique
    dateSlot.addEventListener('click', () => {
      // Remover seleção anterior
      document.querySelectorAll('.date-slot').forEach(s => s.classList.remove('selected'));
      // Selecionar esta data
      dateSlot.classList.add('selected');
      // Atualizar campo hidden
      document.getElementById('date').value = dateKey;
      console.log('🎯 Data selecionada:', dateKey);
      // Gerar horários para esta data específica
      generateTimeSlots();
    });
    
    dateSlotsContainer.appendChild(dateSlot);
  });
  
  console.log(`📅 Total de slots de datas criados: ${dateSlotsContainer.children.length}`);
}

// Função para mostrar erro de availability
function showAvailabilityError(message) {
  const dateSlotsContainer = document.querySelector('.date-slots');
  dateSlotsContainer.innerHTML = `
    <div class="availability-error">
      <span class="error-icon">⚠️</span>
      <span class="error-message">${message}</span>
      <button onclick="generateAvailableDates()" class="retry-btn">Tentar Novamente</button>
    </div>
  `;
}

// OBSERVAÇÃO: Funções de semanas removidas - availability agora vem diretamente do Make

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
      const friendlyMessage = generateFriendlyNoSlotsMessage(availability, selectedDate);
      timeSlotsContainer.innerHTML = friendlyMessage;
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
    
    // Se não há horários disponíveis (verificação duplicada para garantir)
    if (availability.availableSlots.length === 0) {
      const friendlyMessage = generateFriendlyNoSlotsMessage(availability, selectedDate);
      timeSlotsContainer.innerHTML = friendlyMessage;
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
      rg: document.getElementById('rg').value,
      cpf: document.getElementById('cpf').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      duration: document.getElementById('duration').value,
      fetiche: document.getElementById('fetiche').value,
      conheceu: document.getElementById('conheceu').value,
      reason: document.getElementById('reason').value
    };
    
    console.log('🎯 SOLUÇÃO - Dados capturados manualmente:', data);
    
    // Validações básicas
    if (!data['date'] || !data['meeting-time'] || !data.name || !data.rg || !data.cpf || !data.email || !data.phone || !data.fetiche || !data.conheceu) {
      console.log('Campos faltando:');
      if (!data['date']) console.log('- Data não selecionada');
      if (!data['meeting-time']) console.log('- Horário não selecionado');
      if (!data.name) console.log('- Nome não preenchido');
      if (!data.rg) console.log('- RG não preenchido');
      if (!data.cpf) console.log('- CPF não preenchido');
      if (!data.email) console.log('- Email não preenchido');
      if (!data.phone) console.log('- Telefone não preenchido');
      if (!data.fetiche) console.log('- Fetiche não preenchido');
      if (!data.conheceu) console.log('- Como conheceu não selecionado');
      throw new Error('Por favor, preencha todos os campos obrigatórios.');
    }
    
    // Formatar dados para o Make (formato que a API espera)
    const makeData = {
      date: data['date'],
      time: data['meeting-time'],
      datetime: `${data['date']}T${data['meeting-time']}:00`,
      
      // Nome do evento para o calendário
      eventName: `Agendamento Presencial (${data.name})`,
      
      // Informações organizadas para o calendário
      eventDescription: `INFORMAÇÕES DO CLIENTE:

Nome: ${data.name}
Telefone: ${data.phone}
Email: ${data.email}
CPF: ${data.cpf}
RG: ${data.rg}
Fetiche: ${data.fetiche}
Como conheceu: ${data.conheceu}
Motivo: ${data.reason || 'Agendamento via site'}`,
      
      // Dados individuais para processamento
      name: data.name,
      rg: data.rg,
      cpf: data.cpf,
      email: data.email,
      phone: data.phone,
      fetiche: data.fetiche,
      conheceu: data.conheceu,
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
