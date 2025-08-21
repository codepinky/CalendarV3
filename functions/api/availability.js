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
    const date = url.searchParams.get('date');
    
    if (!date) {
      return json({ 
        success: false, 
        reason: 'Data não fornecida.' 
      }, 400, context);
    }

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
          
          // Processar dados do Make para extrair horários disponíveis
          const processedData = processMakeData(calendarData, date);
          
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

  } catch (e) {
    console.error('Erro ao verificar disponibilidade:', e);
    return json({ 
      success: false, 
      reason: 'Erro interno do servidor.' 
    }, 500, context);
  }
}

// Função para processar dados do Make
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
            
            // Converter para timezone local (America/Sao_Paulo)
            const localStartTime = new Date(startTime.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
            
            const hour = localStartTime.getHours();
            const minute = localStartTime.getMinutes();
            // Formatar para o padrão HH:30
            const timeSlot = `${hour.toString().padStart(2, '0')}:30`;
            bookedSlots.push(timeSlot);
          } catch (error) {
            console.warn('⚠️ Erro ao processar slot ocupado:', slot, error);
          }
        }
      });
      
      // Gerar horários disponíveis (excluindo os ocupados e seus consecutivos)
      const allSlots = generateDefaultTimeSlots(date);
      availableSlots = allSlots.filter(slot => {
        // Verificar se este horário está ocupado
        if (bookedSlots.includes(slot)) {
          return false; // Está ocupado
        }
        
        // Verificar se o horário anterior está ocupado (para evitar sobreposição)
        const [hour, minute] = slot.split(':').map(Number);
        const previousHour = hour - 1;
        const previousSlot = `${previousHour.toString().padStart(2, '0')}:30`;
        
        // Se o horário anterior está ocupado, este também não está disponível
        if (bookedSlots.includes(previousSlot)) {
          return false;
        }
        
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
            
            // Converter para timezone local (America/Sao_Paulo)
            const localStartTime = new Date(startTime.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
            
            const hour = localStartTime.getHours();
            const minute = localStartTime.getMinutes();
            // Formatar para o padrão HH:30
            const timeSlot = `${hour.toString().padStart(2, '0')}:30`;
            bookedSlots.push(timeSlot);
          } catch (error) {
            console.warn('⚠️ Erro ao processar evento:', event, error);
          }
        }
      });
      
      // Gerar horários disponíveis (excluindo os agendados e seus consecutivos)
      const allSlots = generateDefaultTimeSlots(date);
      availableSlots = allSlots.filter(slot => {
        // Verificar se este horário está ocupado
        if (bookedSlots.includes(slot)) {
          return false; // Está ocupado
        }
        
        // Verificar se o horário anterior está ocupado (para evitar sobreposição)
        const [hour, minute] = slot.split(':').map(Number);
        const previousHour = hour - 1;
        const previousSlot = `${previousHour.toString().padStart(2, '0')}:30`;
        
        // Se o horário anterior está ocupado, este também não está disponível
        if (bookedSlots.includes(previousSlot)) {
          return false;
        }
        
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
