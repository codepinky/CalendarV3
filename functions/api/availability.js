// functions/api/availability.js
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(context)
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    
    // NOVO: Aceitar tanto date (antigo) quanto startDate/endDate (novo)
    const date = url.searchParams.get('date');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    
    console.log('🔍 Parâmetros recebidos:');
    console.log('🔍 date:', date);
    console.log('🔍 startDate:', startDate);
    console.log('🔍 endDate:', endDate);
    
    // Verificar se é consulta semanal (startDate + endDate) ou diária (date)
    if (startDate && endDate) {
      console.log('🔄 Modo semanal detectado - consultando disponibilidade da semana');
      return await handleWeeklyAvailability(startDate, endDate, context);
    } else if (date) {
      console.log('📅 Modo diário detectado - consultando disponibilidade de um dia');
      return await handleDailyAvailability(date, context);
    } else {
      return json({ 
        success: false, 
        reason: 'Parâmetros inválidos. Use date=YYYY-MM-DD OU startDate=YYYY-MM-DD&endDate=YYYY-MM-DD' 
      }, 400, context);
    }

    // Função para consulta diária (antiga funcionalidade)
    async function handleDailyAvailability(date, context) {
      // Validar formato da data
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return json({ 
          success: false, 
          reason: 'Formato de data inválido. Use YYYY-MM-DD.' 
        }, 400, context);
      }

      // Consultar Make diretamente (URL que funcionou no teste)
      const makeUrl = 'https://hook.us2.make.com/d22auss6t11cvqr3oy3aqm5giuy5ca6j';
      console.log('🔍 Consultando Make para data:', date);
      console.log('🔗 URL do Make:', makeUrl);
      console.log('🔍 Data enviada para Make (formato):', date);
      console.log('🔍 Data enviada para Make (objeto):', new Date(date));
      console.log('🔍 Data enviada para Make (ISO):', new Date(date).toISOString());
      
      try {
        // Fazer requisição direta para o Make
        const availabilityResponse = await fetch(makeUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('📡 Resposta do Make - Status:', availabilityResponse.status);
        console.log('📡 Resposta do Make - OK:', availabilityResponse.ok);

        if (availabilityResponse.ok) {
          const calendarData = await availabilityResponse.json().catch(() => ({}));
          console.log('📅 Dados recebidos do Make:', calendarData);
          console.log('📅 Estrutura dos dados:', Object.keys(calendarData));
          
          if (calendarData.occupied && calendarData.occupied.busy) {
            console.log('📅 Total de slots ocupados recebidos:', calendarData.occupied.busy.length);
            calendarData.occupied.busy.forEach((slot, index) => {
              console.log(`📅 Slot ${index + 1}:`, slot);
            });
          }
          
          // Processar dados do Make para extrair horários disponíveis
          const processedData = processMakeData(calendarData, date);
          
          console.log('📅 Dados processados finais:', processedData);
          console.log('📅 Total de horários disponíveis:', processedData.availableSlots?.length || 0);
          console.log('📅 Total de horários ocupados:', processedData.bookedSlots?.length || 0);
          
          return json({
            success: true,
            date: date,
            ...processedData,
            timezone: processedData.timezone || 'America/Sao_Paulo',
            lastUpdated: new Date().toISOString(),
            source: 'Make Integration'
          }, 200, context);
        } else {
          console.log('❌ Erro na resposta do Make:', availabilityResponse.status);
          const errorText = await availabilityResponse.text().catch(() => 'Erro desconhecido');
          console.log('❌ Detalhes do erro:', errorText);
        }
      } catch (error) {
        console.error('💥 Erro ao consultar Make:', error);
      }

      // Fallback: retornar horários padrão de trabalho (para desenvolvimento)
      console.log('⚠️ Usando fallback - horários padrão de trabalho');
      const fallbackSlots = generateDefaultTimeSlots(date);
      
      return json({
        success: true,
        date: date,
        availableSlots: fallbackSlots,
        bookedSlots: [],
        timezone: 'America/Sao_Paulo',
        lastUpdated: new Date().toISOString(),
        note: 'Modo fallback - horários padrão de trabalho',
        source: 'Fallback Mode'
      }, 200, context);
    }

    // Função para consulta semanal (nova funcionalidade)
    async function handleWeeklyAvailability(startDate, endDate, context) {
      // Validar formato das datas
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return json({ 
          success: false, 
          reason: 'Formato de data inválido. Use YYYY-MM-DD.' 
        }, 400, context);
      }

      console.log('🔄 Iniciando consulta semanal para:', startDate, 'a', endDate);
      
      // Consultar Make.com para disponibilidade semanal real
      const makeUrl = `https://hook.us2.make.com/wvkq5vbyp9g80pv3n89rm2lvc7hgggce?startDate=${startDate}&endDate=${endDate}`;
      console.log('🔍 Consultando Make.com para semana:', startDate, 'a', endDate);
      console.log('🔗 URL do Make.com:', makeUrl);
      
      try {
        // Fazer requisição para o Make.com
        const availabilityResponse = await fetch(makeUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('📡 Resposta do Make.com - Status:', availabilityResponse.status);
        console.log('📡 Resposta do Make.com - OK:', availabilityResponse.ok);

        if (availabilityResponse.ok) {
          const makeData = await availabilityResponse.json().catch(() => ({}));
          
          // 🆕 LOGS DETALHADOS PARA DEBUG
          console.log('🔍 ===== DADOS RECEBIDOS DO MAKE.COM =====');
          console.log('📅 Dados brutos do Make.com:', JSON.stringify(makeData, null, 2));
          console.log('📅 Tipo dos dados:', typeof makeData);
          console.log('📅 Chaves disponíveis:', Object.keys(makeData));
          console.log('🔍 makeData.events existe?', !!makeData.events);
          console.log('🔍 makeData.events é array?', Array.isArray(makeData.events));
          console.log('🔍 makeData.events.length:', makeData.events?.length || 'N/A');
          
          if (makeData.events && Array.isArray(makeData.events)) {
            console.log('📅 Total de eventos recebidos:', makeData.events.length);
            makeData.events.forEach((event, index) => {
              console.log(`📅 Evento ${index + 1}:`, {
                name: event.name,
                status: event.status,
                start: event.start,
                end: event.end,
                raw: event
              });
            });
          }
          
          if (makeData.weeklyAvailability) {
            console.log('📅 Dados estruturados recebidos:', JSON.stringify(makeData.weeklyAvailability, null, 2));
          }
          
          console.log('🔍 ===== FIM DOS DADOS DO MAKE.COM =====');
          
          // Processar dados do Make.com para disponibilidade semanal
          const weeklyAvailability = processWeeklyMakeData(makeData, startDate, endDate);
          
          console.log('📊 Disponibilidade semanal processada:', weeklyAvailability);
          
          // 🆕 LOGS DETALHADOS PARA DEBUG - RESPOSTA PARA O FRONTEND
          console.log('🔍 ===== RESPOSTA ENVIADA PARA O FRONTEND =====');
          console.log('📊 Disponibilidade semanal processada:', JSON.stringify(weeklyAvailability, null, 2));
          console.log('📊 Total de dias processados:', Object.keys(weeklyAvailability).length);
          
          Object.keys(weeklyAvailability).forEach(date => {
            const day = weeklyAvailability[date];
            console.log(`📅 ${date}:`, {
              hasAvailability: day.hasAvailability,
              eventName: day.eventName,
              eventStatus: day.eventStatus,
              availableSlots: day.availableSlots,
              message: day.message
            });
          });
          
          console.log('🔍 ===== FIM DA RESPOSTA PARA O FRONTEND =====');
          
          return json({
            success: true,
            startDate: startDate,
            endDate: endDate,
            weeklyAvailability: weeklyAvailability,
            timezone: 'America/Sao_Paulo',
            lastUpdated: new Date().toISOString(),
            source: 'Make.com Integration',
            note: 'Dados reais do Google Calendar via Make.com'
          }, 200, context);
        } else {
          console.log('❌ Erro na resposta do Make.com:', availabilityResponse.status);
          const errorText = await availabilityResponse.text().catch(() => 'Erro desconhecido');
          console.log('❌ Detalhes do erro:', errorText);
          
          // Fallback: retornar erro
          return json({
            success: false,
            reason: `Erro ao consultar Make.com: ${availabilityResponse.status}`,
            startDate: startDate,
            endDate: endDate
          }, 500, context);
        }
      } catch (error) {
        console.error('💥 Erro ao consultar Make.com:', error);
        
        // Fallback: retornar erro
        return json({
          success: false,
          reason: `Erro de conexão com Make.com: ${error.message}`,
          startDate: startDate,
          endDate: endDate
        }, 500, context);
      }
    }

  } catch (e) {
    console.error('Erro ao verificar disponibilidade:', e);
    return json({ 
      success: false, 
      reason: 'Erro interno do servidor.' 
    }, 500, context);
  }
}

// Função para processar dados semanais do Make.com
function processWeeklyMakeData(makeData, startDate, endDate) {
  try {
    console.log('🔄 Processando dados semanais do Make.com:', makeData);
    
    // Se o Make.com retornar dados estruturados
    if (makeData && makeData.weeklyAvailability) {
      console.log('✅ Dados estruturados recebidos do Make.com');
      return makeData.weeklyAvailability;
    }
    
                // NOVO: Se o Make.com retornar eventos simples (nome, status, start, end)
      console.log('🔍 Verificando se makeData.events existe e é array...');
      console.log('🔍 makeData:', !!makeData);
      console.log('🔍 makeData.events:', !!makeData.events);
      console.log('🔍 Array.isArray(makeData.events):', Array.isArray(makeData.events));
      
      // 🆕 TRATAMENTO PARA FORMATO COMPACTO: {"value":"Atender,confirmed,2025-08-25T13:30:00.000Z"}
      if (makeData && makeData.events && makeData.events.value && typeof makeData.events.value === 'string') {
        console.log('✅ Formato compacto detectado:', makeData.events.value);
        const compactResult = processCompactMakeData(makeData, startDate, endDate);
        if (compactResult) {
          console.log('✅ Dados compactos processados com sucesso');
          return compactResult;
        }
      }

      // 🆕 TRATAMENTO PARA QUALQUER FORMATO MALFORMADO DO MAKE.COM
      if (makeData && makeData.events) {
        console.log('⚠️ Formato não reconhecido, tentando processar como fallback...');
        const fallbackResult = processFallbackMakeData(makeData, startDate, endDate);
        if (fallbackResult) {
          console.log('✅ Dados fallback processados com sucesso');
          return fallbackResult;
        }
      }
      
      if (makeData && makeData.events && Array.isArray(makeData.events)) {
        console.log('✅ Eventos simples recebidos do Make.com:', makeData.events.length);
        
        const weeklyAvailability = {};
        
        // 🆕 LOG DETALHADO ANTES DO PROCESSAMENTO
        console.log('🔍 ===== ANTES DO PROCESSAMENTO =====');
        console.log('📅 weeklyAvailability inicial:', weeklyAvailability);
        
        // Processar cada evento para determinar disponibilidade
        makeData.events.forEach((event, index) => {
          console.log(`🔍 Processando evento ${index + 1}:`, event);
          
          // Limpar possíveis aspas extras no nome e status
          const cleanEventName = typeof event.name === 'string' ? event.name.replace(/^"+|"+$/g, '') : event.name;
          const cleanEventStatus = typeof event.status === 'string' ? event.status.replace(/^"+|"+$/g, '') : event.status;
          
          console.log(`🔍 Evento ${index + 1} - Nome limpo: "${cleanEventName}"`);
          console.log(`🔍 Evento ${index + 1} - Status limpo: "${cleanEventStatus}"`);
          
          if (event.start && cleanEventName && cleanEventStatus) {
            try {
              const eventDate = new Date(event.start);
              const dateKey = eventDate.toISOString().split('T')[0];
              
              console.log(`🔍 Evento ${index + 1} - Data processada: ${dateKey}`);
              console.log(`🔍 Evento ${index + 1} - Nome: "${event.name}"`);
              console.log(`🔍 Evento ${index + 1} - Status: "${event.status}"`);
              
              // LÓGICA: Só mostra horários se for "Atender" + "confirmed"
              console.log(`🔍 Evento ${index + 1} - Comparando: "${cleanEventName}" === "Atender" = ${cleanEventName === "Atender"}`);
              console.log(`🔍 Evento ${index + 1} - Comparando: "${cleanEventStatus}" === "confirmed" = ${cleanEventStatus === "confirmed"}`);
              const isAvailable = cleanEventName === "Atender" && cleanEventStatus === "confirmed";
              
              console.log(`🔍 Evento ${index + 1} - isAvailable: ${isAvailable}`);
              
              if (!weeklyAvailability[dateKey]) {
                weeklyAvailability[dateKey] = {
                  date: dateKey,
                  hasAvailability: isAvailable,
                  eventName: cleanEventName,
                  eventStatus: cleanEventStatus,
                  availableSlots: isAvailable ? ['13:30', '15:30', '17:30', '19:30', '21:30'] : [],
                  bookedSlots: [],
                  message: isAvailable ? 'Dia disponível para agendamento' : 'Dia não disponível'
                };
                console.log(`✅ Dia ${dateKey} CRIADO com disponibilidade: ${isAvailable}`);
              } else {
                // Se já existe o dia, atualizar baseado no evento
                weeklyAvailability[dateKey].hasAvailability = isAvailable;
                weeklyAvailability[dateKey].eventName = cleanEventName;
                weeklyAvailability[dateKey].eventStatus = cleanEventStatus;
                weeklyAvailability[dateKey].availableSlots = isAvailable ? ['13:30', '15:30', '17:30', '19:30', '21:30'] : [];
                weeklyAvailability[dateKey].message = isAvailable ? 'Dia disponível para agendamento' : 'Dia não disponível';
                console.log(`🔄 Dia ${dateKey} ATUALIZADO com disponibilidade: ${isAvailable}`);
              }
              
              console.log(`📅 Dia ${dateKey}: Evento "${cleanEventName}" (${cleanEventStatus}) -> Disponibilidade: ${isAvailable}`);
              
            } catch (error) {
              console.warn('⚠️ Erro ao processar evento:', event, error);
            }
          } else {
            console.warn(`⚠️ Evento ${index + 1} inválido:`, event);
          }
        });
        
        // 🆕 LOG DETALHADO DEPOIS DO PROCESSAMENTO DOS EVENTOS
        console.log('🔍 ===== DEPOIS DO PROCESSAMENTO DOS EVENTOS =====');
        console.log('📅 weeklyAvailability após eventos:', JSON.stringify(weeklyAvailability, null, 2));
        
        // Processar todos os dias da semana (incluindo dias sem eventos)
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        
        // ✅ CORRIGIDO: Só processar dias que NÃO foram processados pelos eventos
        if (!weeklyAvailability[dateStr]) {
          weeklyAvailability[dateStr] = {
            date: dateStr,
            hasAvailability: false,
            eventName: null,
            eventStatus: null,
            availableSlots: [],
            bookedSlots: [],
            message: 'Dados do Make.com processados - Sem eventos'
          };
          console.log(`📅 Dia ${dateStr}: Sem evento -> Sem disponibilidade`);
        } else {
          // ✅ NOVO: Log dos dias que JÁ foram processados pelos eventos
          const day = weeklyAvailability[dateStr];
          console.log(`📅 Dia ${dateStr}: JÁ processado -> ${day.eventName} (${day.eventStatus}) - Disponibilidade: ${day.hasAvailability}`);
        }
      }
      
      console.log('📊 Disponibilidade semanal processada:', weeklyAvailability);
      return weeklyAvailability;
    }
    
    // Se o Make.com retornar dados em formato diferente
    console.log('🔍 Nenhum evento encontrado, verificando formato alternativo...');
    if (makeData && typeof makeData === 'object') {
      console.log('⚠️ Formato de dados não reconhecido, retornando dados básicos');
      
      const weeklyAvailability = {};
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        weeklyAvailability[dateStr] = {
          date: dateStr,
          hasAvailability: false,  // ✅ CORRIGIDO: Sempre false para dias sem eventos
          eventName: null,
          eventStatus: null,
          bookedSlots: [],
          availableSlots: [],  // ✅ CORRIGIDO: Sem horários disponíveis
          message: 'Dados do Make.com processados - Sem eventos'
        };
      }
      
      return weeklyAvailability;
    }
    
         // Fallback: dados padrão
     console.log('⚠️ Nenhum dado válido recebido, usando fallback');
     const weeklyAvailability = {};
     const start = new Date(startDate);
     const end = new Date(endDate);
     
     for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
       const dateStr = d.toISOString().split('T')[0];
       weeklyAvailability[dateStr] = {
         date: dateStr,
         hasAvailability: false,  // ✅ CORRIGIDO: Sempre false para dias sem eventos
         eventName: null,
         eventStatus: null,
         bookedSlots: [],
         availableSlots: [],  // ✅ CORRIGIDO: Sem horários disponíveis
         message: 'Fallback - Sem eventos para agendamento'
       };
     }
     
     return weeklyAvailability;
    
  } catch (error) {
    console.error('💥 Erro ao processar dados semanais:', error);
    
         // Fallback em caso de erro
     const weeklyAvailability = {};
     const start = new Date(startDate);
     const end = new Date(endDate);
     
     for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
       const dateStr = d.toISOString().split('T')[0];
       weeklyAvailability[dateStr] = {
         date: dateStr,
         hasAvailability: false,  // ✅ CORRIGIDO: Sempre false para dias sem eventos
         eventName: null,
         eventStatus: null,
         bookedSlots: [],
         availableSlots: [],  // ✅ CORRIGIDO: Sem horários disponíveis
         message: 'Erro no processamento - Sem eventos para agendamento'
       };
     }
     
     return weeklyAvailability;
  }
}



// Função para processar dados compactos do Make.com
function processCompactMakeData(makeData, startDate, endDate) {
  try {
    console.log('🔍 Processando dados compactos do Make.com:', makeData);
    
    // 🆕 TRATAMENTO PARA FORMATO SEPARADO: [{"value":"Atender"},{"value":"confirmed"},{"value":"data"}]
    if (makeData && makeData.events && Array.isArray(makeData.events)) {
      console.log('✅ Array de valores separados detectado:', makeData.events);
      
      const weeklyAvailability = {};
      let currentEvent = {};
      let eventIndex = 0;
      
      // Processar cada valor do array
      makeData.events.forEach((item, index) => {
        if (item && item.value) {
          const value = item.value;
          console.log(`🔍 Item ${index}: ${value}`);
          
          // Cada 3 itens forma um evento completo
          if (index % 3 === 0) {
            // Novo evento
            currentEvent = { name: value };
            eventIndex = Math.floor(index / 3);
            console.log(`🆕 Iniciando evento ${eventIndex + 1}: ${value}`);
          } else if (index % 3 === 1) {
            // Status do evento
            currentEvent.status = value;
            console.log(`📝 Evento ${eventIndex + 1} - Status: ${value}`);
          } else if (index % 3 === 2) {
            // Data do evento
            currentEvent.start = value;
            console.log(`📅 Evento ${eventIndex + 1} - Data: ${value}`);
            
            // Processar evento completo
            if (currentEvent.name === "Atender" && currentEvent.status === "confirmed" && currentEvent.start) {
              try {
                const parsedDate = new Date(currentEvent.start);
                const dateKey = parsedDate.toISOString().split('T')[0];
                
                console.log(`✅ Evento ${eventIndex + 1} processado - Dia: ${dateKey}`);
                
                weeklyAvailability[dateKey] = {
                  date: dateKey,
                  hasAvailability: true,
                  eventName: currentEvent.name,
                  eventStatus: currentEvent.status,
                  availableSlots: ['13:30', '15:30', '17:30', '19:30', '21:30'],
                  bookedSlots: [],
                  message: 'Dia disponível para agendamento (formato separado processado)'
                };
                
              } catch (error) {
                console.warn(`⚠️ Erro ao processar data do evento ${eventIndex + 1}:`, currentEvent.start, error);
              }
            } else {
              console.log(`⚠️ Evento ${eventIndex + 1} inválido:`, currentEvent);
            }
          }
        }
      });
      
      // Processar todos os dias da semana (incluindo dias sem eventos)
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        
        if (!weeklyAvailability[dateStr]) {
          weeklyAvailability[dateStr] = {
            date: dateStr,
            hasAvailability: false,
            eventName: null,
            eventStatus: null,
            availableSlots: [],
            bookedSlots: [],
            message: 'Dados do Make.com processados - Sem eventos'
          };
        }
      }
      
      console.log('📊 Disponibilidade semanal processada a partir de dados separados:', weeklyAvailability);
      return weeklyAvailability;
    }
    
    // TRATAMENTO ORIGINAL PARA FORMATO COMPACTO: {"value":"Atender,confirmed,data"}
    if (makeData && makeData.events && makeData.events.value) {
      const compactString = makeData.events.value;
      console.log('🔍 String compacta recebida:', compactString);
      
      // Separar por vírgulas: "Atender,confirmed,2025-08-25T13:30:00.000Z"
      const parts = compactString.split(',');
      console.log('🔍 Partes separadas:', parts);
      
      if (parts.length >= 3) {
        const eventName = parts[0].trim();
        const eventStatus = parts[1].trim();
        const eventDate = parts[2].trim();
        
        console.log('🔍 Evento extraído:', { eventName, eventStatus, eventDate });
        
        // Verificar se é um evento válido
        if (eventName === "Atender" && eventStatus === "confirmed" && eventDate) {
          try {
            const parsedDate = new Date(eventDate);
            const dateKey = parsedDate.toISOString().split('T')[0];
            
            console.log('✅ Data válida extraída:', dateKey);
            
            const weeklyAvailability = {};
            
            // Marcar o dia como disponível
            weeklyAvailability[dateKey] = {
              date: dateKey,
              hasAvailability: true,
              eventName: eventName,
              eventStatus: eventStatus,
              availableSlots: ['13:30', '15:30', '17:30', '19:30', '21:30'],
              bookedSlots: [],
              message: 'Dia disponível para agendamento (formato compacto)'
            };
            
            // Processar todos os dias da semana (incluindo dias sem eventos)
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              const dateStr = d.toISOString().split('T')[0];
              
              if (!weeklyAvailability[dateStr]) {
                weeklyAvailability[dateStr] = {
                  date: dateStr,
                  hasAvailability: false,
                  eventName: null,
                  eventStatus: null,
                  availableSlots: [],
                  bookedSlots: [],
                  message: 'Dados do Make.com processados - Sem eventos'
                };
              }
            }
            
            console.log('📊 Disponibilidade semanal processada a partir de dados compactos:', weeklyAvailability);
            return weeklyAvailability;
            
          } catch (error) {
            console.warn('⚠️ Erro ao processar data compacta:', eventDate, error);
          }
        } else {
          console.log('⚠️ Evento não é "Atender" + "confirmed":', { eventName, eventStatus });
        }
      } else {
        console.log('⚠️ Formato compacto inválido - precisa de pelo menos 3 partes');
      }
    }
    
    return null;
  } catch (error) {
    console.error('💥 Erro ao processar dados compactos:', error);
    return null;
  }
}

// Função para processar QUALQUER formato malformado do Make.com
function processFallbackMakeData(makeData, startDate, endDate) {
  try {
    console.log('🔍 Processando dados fallback do Make.com:', makeData);
    
    // Tentar extrair informações de qualquer formato
    let eventsData = null;
    
    // Se events for uma string, tentar fazer parse
    if (makeData.events && typeof makeData.events === 'string') {
      try {
        // Tentar fazer parse da string como JSON
        eventsData = JSON.parse(makeData.events);
        console.log('✅ String parseada com sucesso:', eventsData);
      } catch (parseError) {
        console.log('⚠️ Falha ao fazer parse da string, tratando como texto puro');
        eventsData = makeData.events;
      }
    } else if (makeData.events) {
      eventsData = makeData.events;
    }
    
    if (!eventsData) {
      console.log('❌ Nenhum dado de eventos encontrado');
      return null;
    }
    
    console.log('🔍 Dados de eventos para processamento:', eventsData);
    
    const weeklyAvailability = {};
    let eventIndex = 0;
    
    // Se for um array, processar cada item
    if (Array.isArray(eventsData)) {
      console.log('✅ Array detectado, processando itens...');
      
      let currentEvent = {};
      
      eventsData.forEach((item, index) => {
        if (item && item.value) {
          const value = item.value;
          console.log(`🔍 Item ${index}: ${value}`);
          
          // Cada 3 itens forma um evento completo
          if (index % 3 === 0) {
            currentEvent = { name: value };
            eventIndex = Math.floor(index / 3);
            console.log(`🆕 Iniciando evento ${eventIndex + 1}: ${value}`);
          } else if (index % 3 === 1) {
            currentEvent.status = value;
            console.log(`📝 Evento ${eventIndex + 1} - Status: ${value}`);
          } else if (index % 3 === 2) {
            currentEvent.start = value;
            console.log(`📅 Evento ${eventIndex + 1} - Data: ${value}`);
            
            // Processar evento completo
            if (currentEvent.name === "Atender" && currentEvent.status === "confirmed" && currentEvent.start) {
              try {
                const parsedDate = new Date(currentEvent.start);
                const dateKey = parsedDate.toISOString().split('T')[0];
                
                console.log(`✅ Evento ${eventIndex + 1} processado - Dia: ${dateKey}`);
                
                weeklyAvailability[dateKey] = {
                  date: dateKey,
                  hasAvailability: true,
                  eventName: currentEvent.name,
                  eventStatus: currentEvent.status,
                  availableSlots: ['13:30', '15:30', '17:30', '19:30', '21:30'],
                  bookedSlots: [],
                  message: 'Dia disponível para agendamento (fallback processado)'
                };
                
              } catch (error) {
                console.warn(`⚠️ Erro ao processar data do evento ${eventIndex + 1}:`, currentEvent.start, error);
              }
            } else {
              console.log(`⚠️ Evento ${eventIndex + 1} inválido:`, currentEvent);
            }
          }
        }
      });
    } else if (typeof eventsData === 'string') {
      console.log('✅ String detectada, tentando extrair datas...');
      
      // Extrair datas usando regex
      const dateRegex = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/g;
      const dates = eventsData.match(dateRegex);
      
      if (dates && dates.length > 0) {
        console.log('✅ Datas extraídas:', dates);
        
        dates.forEach((dateStr, index) => {
          try {
            const eventDate = new Date(dateStr);
            const dateKey = eventDate.toISOString().split('T')[0];
            
            weeklyAvailability[dateKey] = {
              date: dateKey,
              hasAvailability: true,
              eventName: "Atender",
              eventStatus: "confirmed",
              availableSlots: ['13:30', '15:30', '17:30', '19:30', '21:30'],
              bookedSlots: [],
              message: 'Dia disponível para agendamento (datas extraídas por regex)'
            };
            
            console.log(`✅ Dia ${dateKey} marcado como disponível`);
          } catch (error) {
            console.warn(`⚠️ Erro ao processar data extraída:`, dateStr, error);
          }
        });
      }
    }
    
    // Processar todos os dias da semana (incluindo dias sem eventos)
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      if (!weeklyAvailability[dateStr]) {
        weeklyAvailability[dateStr] = {
          date: dateStr,
          hasAvailability: false,
          eventName: null,
          eventStatus: null,
          availableSlots: [],
          bookedSlots: [],
          message: 'Dados do Make.com processados - Sem eventos'
        };
      }
    }
    
    console.log('📊 Disponibilidade semanal processada com fallback:', weeklyAvailability);
    return weeklyAvailability;
    
  } catch (error) {
    console.error('💥 Erro ao processar dados fallback:', error);
    return null;
  }
}

// Função para processar dados do Make (mantida para compatibilidade)
function processMakeData(makeData, date) {
  try {
    // FORMATO ATUAL DO MAKE: Dados com occupied.busy
    if (makeData && makeData.occupied && makeData.occupied.busy && Array.isArray(makeData.occupied.busy)) {
      console.log('✅ Dados recebidos do Make com formato occupied.busy:', makeData);
      
      const bookedSlots = [];
      let availableSlots = [];
      
      // Processar horários ocupados
      makeData.occupied.busy.forEach(slot => {
        if (slot.start && slot.end) {
          try {
            const startTime = new Date(slot.start);
            
            // CORREÇÃO: Converter corretamente para timezone de Brasília
            // O Make pode estar enviando em UTC, então vamos converter adequadamente
            const utcTime = new Date(startTime.getTime() + (startTime.getTimezoneOffset() * 60000));
            const brasiliaTime = new Date(utcTime.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
            
            const hour = brasiliaTime.getHours();
            const minute = brasiliaTime.getMinutes();
            
            // Formatar para o padrão HH:30
            const timeSlot = `${hour.toString().padStart(2, '0')}:30`;
            bookedSlots.push(timeSlot);
            
            console.log(`🕐 Slot ocupado processado: ${slot.start} -> ${timeSlot} (Brasília)`);
          } catch (error) {
            console.warn('⚠️ Erro ao processar slot ocupado:', slot, error);
          }
        }
      });
      
      console.log('📅 Total de slots ocupados recebidos:', makeData.occupied.busy.length);
      console.log('📅 Slots ocupados processados:', bookedSlots);
      
             // Gerar horários disponíveis (excluindo os ocupados E seus consecutivos)
       const allSlots = generateDefaultTimeSlots(date);
       availableSlots = allSlots.filter(slot => {
         // Verificar se este horário está ocupado
         if (bookedSlots.includes(slot)) {
           console.log(`❌ Horário ${slot} está ocupado`);
           return false; // Está ocupado
         }
         
         // CORREÇÃO: Verificar se o horário ANTERIOR está ocupado (para evitar conflito)
         const [hour, minute] = slot.split(':').map(Number);
         const previousHour = hour - 1;
         const previousSlot = `${previousHour.toString().padStart(2, '0')}:30`;
         
         if (bookedSlots.includes(previousSlot)) {
           console.log(`❌ Horário ${slot} não disponível - anterior ${previousSlot} está ocupado`);
           return false; // Não disponível por conflito
         }
         
         // CORREÇÃO: Verificar se o horário POSTERIOR está ocupado (para evitar conflito)
         const nextHour = hour + 1;
         const nextSlot = `${nextHour.toString().padStart(2, '0')}:30`;
         
         if (bookedSlots.includes(nextSlot)) {
           console.log(`❌ Horário ${slot} não disponível - posterior ${nextSlot} está ocupado`);
           return false; // Não disponível por conflito
         }
         
         console.log(`✅ Horário ${slot} está disponível`);
         return true; // Está disponível
       });
      
      console.log('📅 Horários padrão gerados:', allSlots);
      console.log('📅 Horários ocupados:', bookedSlots);
      console.log('⏰ Horários disponíveis:', availableSlots);
      
      return {
        availableSlots,
        bookedSlots,
        totalEvents: makeData.occupied.busy.length,
        timezone: makeData.timezone || 'America/Sao_Paulo'
      };
    }
    
    // FORMATO ANTERIOR: Dados com available (para compatibilidade)
    if (makeData && makeData.available && Array.isArray(makeData.available)) {
      console.log('✅ Dados recebidos no formato available:', makeData);
      
      // Converter horários ISO para slots de hora
      let availableSlots = [];
      const bookedSlots = [];
      
      // Processar horários disponíveis
      makeData.available.forEach(slot => {
        if (slot.start && slot.end) {
          try {
            const startTime = new Date(slot.start);
            const endTime = new Date(slot.end);
            
            // Converter para timezone local (America/Sao_Paulo)
            const localStartTime = new Date(startTime.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
            const localEndTime = new Date(endTime.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
            
            const startHour = localStartTime.getHours();
            const startMinute = localStartTime.getMinutes();
            // Formatar para o padrão HH:30
            const timeSlot = `${startHour.toString().padStart(2, '0')}:30`;
            
            availableSlots.push(timeSlot);
          } catch (error) {
            console.warn('⚠️ Erro ao processar slot disponível:', slot, error);
          }
        }
      });
      
      return {
        availableSlots,
        bookedSlots,
        totalEvents: makeData.available.length,
        timezone: makeData.timezone || 'America/Sao_Paulo'
      };
    }
    
    // FORMATO ANTERIOR: O Make deve retornar dados no formato esperado
    if (makeData && makeData.availableSlots) {
      return {
        availableSlots: makeData.availableSlots,
        bookedSlots: makeData.bookedSlots || [],
        totalEvents: makeData.totalEvents || 0,
        timezone: makeData.timezone || 'America/Sao_Paulo'
      };
    }
    
    // Se o Make retornar eventos do Google Calendar, processar
    if (makeData && makeData.events) {
      const bookedSlots = [];
      let availableSlots = [];
      
      // Processar eventos para extrair horários agendados
      makeData.events.forEach(event => {
        if (event.start && event.start.dateTime) {
          try {
            const startTime = new Date(event.start.dateTime);
            
            // CORREÇÃO: Converter corretamente para timezone de Brasília
            const utcTime = new Date(startTime.getTime() + (startTime.getTimezoneOffset() * 60000));
            const brasiliaTime = new Date(utcTime.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
            
            const hour = brasiliaTime.getHours();
            const minute = brasiliaTime.getMinutes();
            // Formatar para o padrão HH:30
            const timeSlot = `${hour.toString().padStart(2, '0')}:30`;
            bookedSlots.push(timeSlot);
            
            console.log(`🕐 Evento processado: ${event.start.dateTime} -> ${timeSlot} (Brasília)`);
          } catch (error) {
            console.warn('⚠️ Erro ao processar evento:', event, error);
          }
        }
      });
      
      console.log('📅 Total de eventos recebidos:', makeData.events.length);
      console.log('📅 Slots ocupados processados:', bookedSlots);
      
             // Gerar horários disponíveis (excluindo os agendados E seus consecutivos)
       const allSlots = generateDefaultTimeSlots(date);
       availableSlots = allSlots.filter(slot => {
         // Verificar se este horário está ocupado
         if (bookedSlots.includes(slot)) {
           console.log(`❌ Horário ${slot} está ocupado`);
           return false; // Está ocupado
         }
         
         // CORREÇÃO: Verificar se o horário ANTERIOR está ocupado (para evitar conflito)
         const [hour, minute] = slot.split(':').map(Number);
         const previousHour = hour - 1;
         const previousSlot = `${previousHour.toString().padStart(2, '0')}:30`;
         
         if (bookedSlots.includes(previousSlot)) {
           console.log(`❌ Horário ${slot} não disponível - anterior ${previousSlot} está ocupado`);
           return false; // Não disponível por conflito
         }
         
         // CORREÇÃO: Verificar se o horário POSTERIOR está ocupado (para evitar conflito)
         const nextHour = hour + 1;
         const nextSlot = `${nextHour.toString().padStart(2, '0')}:30`;
         
         if (bookedSlots.includes(nextSlot)) {
           console.log(`❌ Horário ${slot} não disponível - posterior ${nextSlot} está ocupado`);
           return false; // Não disponível por conflito
         }
         
         console.log(`✅ Horário ${slot} está disponível`);
         return true; // Está disponível
       });
      
      return {
        availableSlots,
        bookedSlots,
        totalEvents: makeData.events.length,
        timezone: 'America/Sao_Paulo'
      };
    }
    
    // Dados inválidos do Make
    console.warn('⚠️ Dados inválidos recebidos do Make:', makeData);
    return {
      availableSlots: [],
      bookedSlots: [],
      totalEvents: 0,
      timezone: 'America/Sao_Paulo'
    };
    
  } catch (error) {
    console.error('💥 Erro ao processar dados do Make:', error);
    return {
      availableSlots: [],
      bookedSlots: [],
      totalEvents: 0,
      timezone: 'America/Sao_Paulo'
    };
  }
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

function json(payload, status = 200, context) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(context)
    }
  });
}

function corsHeaders(context) {
  const origin = context.request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With'
  };
}
