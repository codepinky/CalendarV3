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

    // Se o Make estiver configurado, consultar dados do Google Calendar
    if (env.MAKE_AVAILABILITY_URL) {
      console.log('🔍 Consultando Make para data:', date);
      console.log('🔗 URL do Make:', env.MAKE_AVAILABILITY_URL);
      
      try {
        // O Make deve retornar dados via GET ou POST
        const availabilityResponse = await fetch(env.MAKE_AVAILABILITY_URL, {
          method: 'GET', // Alterado para GET
          headers: {
            'Content-Type': 'application/json',
            ...(env.MAKE_API_KEY ? { 'Authorization': `Bearer ${env.MAKE_API_KEY}` } : {})
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
    // NOVO FORMATO: Aceitar dados no formato especificado
    if (makeData && makeData.available && Array.isArray(makeData.available)) {
      console.log('✅ Dados recebidos no novo formato:', makeData);
      
      // Converter horários ISO para slots de hora
      const availableSlots = [];
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
            const timeSlot = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
            
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
      const availableSlots = [];
      
      // Processar eventos para extrair horários agendados
      makeData.events.forEach(event => {
        if (event.start && event.start.dateTime) {
          try {
            const startTime = new Date(event.start.dateTime);
            
            // Converter para timezone local (America/Sao_Paulo)
            const localStartTime = new Date(startTime.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
            
            const hour = localStartTime.getHours();
            const minute = localStartTime.getMinutes();
            const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            bookedSlots.push(timeSlot);
          } catch (error) {
            console.warn('⚠️ Erro ao processar evento:', event, error);
          }
        }
      });
      
      // Gerar horários disponíveis (excluindo os agendados)
      const allSlots = generateDefaultTimeSlots(date);
      availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
      
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
  const startHour = 13; // 13:00
  const endHour = 21;   // 21:00
  const interval = 1;   // 1 hora
  
  for (let hour = startHour; hour < endHour; hour += interval) {
    const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
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
