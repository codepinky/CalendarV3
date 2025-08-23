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
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const checkAgendar = url.searchParams.get('checkAgendar');
    
    if (checkAgendar === 'true' && startDate && endDate) {
      return await handleAgendarAvailability(startDate, endDate, context);
    } else if (startDate && endDate) {
      return await handleWeeklyAvailability(startDate, endDate, context);
    } else if (date) {
      return await handleDailyAvailability(date, context);
    } else {
      return json({ 
        success: false, 
        reason: 'Parâmetros inválidos. Use date=YYYY-MM-DD OU startDate=YYYY-MM-DD&endDate=YYYY-MM-DD OU checkAgendar=true&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD' 
      }, 400, context);
    }

    async function handleDailyAvailability(date, context) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return json({ 
          success: false, 
          reason: 'Formato de data inválido. Use YYYY-MM-DD.' 
        }, 400, context);
      }

      const makeUrl = 'https://hook.us2.make.com/d22auss6t11cvqr3oy3aqm5giuy5ca6j';
      
      try {
        const availabilityResponse = await fetch(makeUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (availabilityResponse.ok) {
          const calendarData = await availabilityResponse.json().catch(() => ({}));
          const processedData = processMakeData(calendarData, date);
          
          return json({
            success: true,
            date: date,
            ...processedData,
            timezone: processedData.timezone || 'America/Sao_Paulo',
            lastUpdated: new Date().toISOString(),
            source: 'Make Integration'
          }, 200, context);
        }
      } catch (error) {
        console.error('Erro ao consultar Make:', error);
      }

      // Fallback: horários padrão
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

    async function handleWeeklyAvailability(startDate, endDate, context) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return json({ 
          success: false, 
          reason: 'Formato de data inválido. Use YYYY-MM-DD.' 
        }, 400, context);
      }
      
      const makeUrl = `https://hook.us2.make.com/wvkq5vbyp9g80pv3n89rm2lvc7hgggce?startDate=${startDate}&endDate=${endDate}`;
      
      try {
        const availabilityResponse = await fetch(makeUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (availabilityResponse.ok) {
          const makeData = await availabilityResponse.json().catch(() => ({}));
          const weeklyAvailability = processWeeklyMakeData(makeData, startDate, endDate);
          
          return json({
            success: true,
            startDate: startDate,
            endDate: endDate,
            weeklyAvailability: weeklyAvailability,
            timezone: 'America/Sao_Paulo',
            lastUpdated: new Date().toISOString(),
            source: 'Make.com Integration'
          }, 200, context);
        } else {
          return json({
            success: false,
            reason: `Erro ao consultar Make.com: ${availabilityResponse.status}`,
            startDate: startDate,
            endDate: endDate
          }, 500, context);
        }
      } catch (error) {
        console.error('Erro ao consultar Make.com:', error);
        
        return json({
          success: false,
          reason: `Erro de conexão com Make.com: ${error.message}`,
          startDate: startDate,
          endDate: endDate
        }, 500, context);
      }
    }

    async function handleAgendarAvailability(startDate, endDate, context) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return json({ 
          success: false, 
          reason: 'Formato de data inválido. Use YYYY-MM-DD.' 
        }, 400, context);
      }
      
      // URL específica para verificar eventos "Atender"
      const makeUrl = `https://hook.us2.make.com/wvkq5vbyp9g80pv3n89rm2lvc7hgggce?startDate=${startDate}&endDate=${endDate}&eventName=Atender`;
      
      try {
        const availabilityResponse = await fetch(makeUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (availabilityResponse.ok) {
          const makeData = await availabilityResponse.json().catch(() => ({}));
          const agendarAvailability = processAgendarMakeData(makeData, startDate, endDate);
          
          return json({
            success: true,
            startDate: startDate,
            endDate: endDate,
            agendarAvailability: agendarAvailability,
            timezone: 'America/Sao_Paulo',
            lastUpdated: new Date().toISOString(),
                      source: 'Make.com - Eventos Atender',
          description: 'Dias com eventos "Atender" ativos para agendamento'
          }, 200, context);
        } else {
          return json({
            success: false,
            reason: `Erro ao consultar Make.com: ${availabilityResponse.status}`,
            startDate: startDate,
            endDate: endDate
          }, 500, context);
        }
      } catch (error) {
        console.error('Erro ao consultar Make.com para eventos Atender:', error);
        
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

function processWeeklyMakeData(makeData, startDate, endDate) {
  try {
    if (makeData && makeData.weeklyAvailability) {
      return makeData.weeklyAvailability;
    }
    
    if (makeData && makeData.events && Array.isArray(makeData.events)) {
      const weeklyAvailability = {};
      
      // Processar eventos
      makeData.events.forEach((event) => {
        if (event.start) {
          try {
            const eventDate = new Date(event.start);
            const dateKey = eventDate.toISOString().split('T')[0];
            
            const cleanEventName = typeof event.name === 'string' ? event.name.replace(/^"+|"+$/g, '') : event.name;
            const cleanEventStatus = typeof event.status === 'string' ? event.status.replace(/^"+|"+$/g, '') : event.status;
            
            const isAvailable = cleanEventStatus === 'confirmed' || cleanEventStatus === 'Atender';
            
            weeklyAvailability[dateKey] = {
              date: dateKey,
              hasAvailability: isAvailable,
              eventName: cleanEventName || 'Evento',
              eventStatus: cleanEventStatus || 'Agendado',
              availableSlots: isAvailable ? generateDynamicTimeSlots(dateKey) : [],
              bookedSlots: [],
              message: isAvailable ? 'Dia disponível para agendamento' : 'Dia não disponível'
            };
          } catch (error) {
            console.warn('Erro ao processar evento:', event, error);
          }
        }
      });
      
      // Processar todos os dias da semana
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
            message: 'Sem eventos para agendamento'
          };
        }
      }
      
      return weeklyAvailability;
    }
    
    // Fallback para dados não reconhecidos
    return generateEmptyWeeklyAvailability(startDate, endDate);
    
  } catch (error) {
    console.error('Erro ao processar dados semanais:', error);
    return generateEmptyWeeklyAvailability(startDate, endDate);
  }
}

function generateEmptyWeeklyAvailability(startDate, endDate) {
  const weeklyAvailability = {};
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    weeklyAvailability[dateStr] = {
      date: dateStr,
      hasAvailability: false,
      eventName: null,
      eventStatus: null,
      bookedSlots: [],
      availableSlots: [],
      message: 'Sem eventos para agendamento'
    };
  }
  
  return weeklyAvailability;
}

function processMakeData(makeData, date) {
  try {
    if (makeData && makeData.occupied && makeData.occupied.busy && Array.isArray(makeData.occupied.busy)) {
      const bookedSlots = [];
      
      makeData.occupied.busy.forEach(slot => {
        if (slot.start && slot.end) {
          try {
            const startTime = new Date(slot.start);
            const utcTime = new Date(startTime.getTime() + (startTime.getTimezoneOffset() * 60000));
            const brasiliaTime = new Date(utcTime.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
            
            const hour = brasiliaTime.getHours();
            const timeSlot = `${hour.toString().padStart(2, '0')}:30`;
            bookedSlots.push(timeSlot);
          } catch (error) {
            console.warn('Erro ao processar slot ocupado:', slot, error);
          }
        }
      });
      
      const allSlots = generateDefaultTimeSlots(date);
      const availableSlots = allSlots.filter(slot => {
        if (bookedSlots.includes(slot)) return false;
        
        const [hour] = slot.split(':').map(Number);
        const previousSlot = `${(hour - 1).toString().padStart(2, '0')}:30`;
        const nextSlot = `${(hour + 1).toString().padStart(2, '0')}:30`;
        
        if (bookedSlots.includes(previousSlot) || bookedSlots.includes(nextSlot)) return false;
        
        return true;
      });
      
      return {
        availableSlots,
        bookedSlots,
        totalEvents: makeData.occupied.busy.length,
        timezone: makeData.timezone || 'America/Sao_Paulo'
      };
    }
    
    if (makeData && makeData.available && Array.isArray(makeData.available)) {
      const availableSlots = [];
      
      makeData.available.forEach(slot => {
        if (slot.start && slot.end) {
          try {
            const startTime = new Date(slot.start);
            const localStartTime = new Date(startTime.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
            const startHour = localStartTime.getHours();
            const timeSlot = `${startHour.toString().padStart(2, '0')}:30`;
            availableSlots.push(timeSlot);
          } catch (error) {
            console.warn('Erro ao processar slot disponível:', slot, error);
          }
        }
      });
      
      return {
        availableSlots,
        bookedSlots: [],
        totalEvents: makeData.available.length,
        timezone: makeData.timezone || 'America/Sao_Paulo'
      };
    }
    
    if (makeData && makeData.events) {
      const bookedSlots = [];
      
      makeData.events.forEach(event => {
        if (event.start && event.start.dateTime) {
          try {
            const startTime = new Date(event.start.dateTime);
            const utcTime = new Date(startTime.getTime() + (startTime.getTimezoneOffset() * 60000));
            const brasiliaTime = new Date(utcTime.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
            
            const hour = brasiliaTime.getHours();
            const timeSlot = `${hour.toString().padStart(2, '0')}:30`;
            bookedSlots.push(timeSlot);
          } catch (error) {
            console.warn('Erro ao processar evento:', event, error);
          }
        }
      });
      
      const allSlots = generateDefaultTimeSlots(date);
      const availableSlots = allSlots.filter(slot => {
        if (bookedSlots.includes(slot)) return false;
        
        const [hour] = slot.split(':').map(Number);
        const previousSlot = `${(hour - 1).toString().padStart(2, '0')}:30`;
        const nextSlot = `${(hour + 1).toString().padStart(2, '0')}:30`;
        
        if (bookedSlots.includes(previousSlot) || bookedSlots.includes(nextSlot)) return false;
        
        return true;
      });
      
      return {
        availableSlots,
        bookedSlots,
        totalEvents: makeData.events.length,
        timezone: 'America/Sao_Paulo'
      };
    }
    
    return {
      availableSlots: [],
      bookedSlots: [],
      totalEvents: 0,
      timezone: 'America/Sao_Paulo'
    };
    
  } catch (error) {
    console.error('Erro ao processar dados do Make:', error);
    return {
      availableSlots: [],
      bookedSlots: [],
      totalEvents: 0,
      timezone: 'America/Sao_Paulo'
    };
  }
}

function processAgendarMakeData(makeData, startDate, endDate) {
  try {
    if (makeData && makeData.events && Array.isArray(makeData.events)) {
      const agendarAvailability = {};
      
      // Filtrar apenas eventos chamados "Atender"
      const agendarEvents = makeData.events.filter(event => {
        const eventName = typeof event.name === 'string' ? event.name.replace(/^"+|"+$/g, '') : event.name;
        return eventName === 'Atender';
      });
      
      agendarEvents.forEach(event => {
        if (event.start) {
          try {
            const eventDate = new Date(event.start);
            const dateKey = eventDate.toISOString().split('T')[0];
            
            const cleanEventName = typeof event.name === 'string' ? event.name.replace(/^"+|"+$/g, '') : event.name;
            const cleanEventStatus = typeof event.status === 'string' ? event.status.replace(/^"+|"+$/g, '') : event.status;
            
            // Verificar se o evento está ativo/confirmado
            const isAvailable = cleanEventStatus === 'confirmed' || 
                              cleanEventStatus === 'Atender' || 
                              cleanEventStatus === 'active' ||
                              cleanEventStatus === 'confirmed';
            
                         agendarAvailability[dateKey] = {
               date: dateKey,
               hasAvailability: isAvailable,
               eventName: cleanEventName || 'Atender',
               eventStatus: cleanEventStatus || 'Ativo',
               availableSlots: isAvailable ? generateDynamicTimeSlots(dateKey) : [],
               bookedSlots: [],
               message: isAvailable ? 'Dia com evento "Atender" ativo para agendamento' : 'Evento "Atender" não está ativo',
              eventDetails: {
                start: event.start,
                end: event.end,
                description: event.description || 'Disponível para agendamento'
              }
            };
          } catch (error) {
            console.warn('Erro ao processar evento Atender:', event, error);
          }
        }
      });
      
      // Processar todos os dias da semana para mostrar dias sem eventos
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        
                   if (!agendarAvailability[dateStr]) {
             agendarAvailability[dateStr] = {
               date: dateStr,
               hasAvailability: false,
               eventName: null,
               eventStatus: null,
               availableSlots: [],
               bookedSlots: [],
               message: 'Sem eventos "Atender" para este dia'
             };
           }
      }
      
      return agendarAvailability;
    }
    
    // Fallback para dados não reconhecidos
    return generateEmptyWeeklyAvailability(startDate, endDate);
    
  } catch (error) {
    console.error('Erro ao processar dados de eventos Atender:', error);
    return generateEmptyWeeklyAvailability(startDate, endDate);
  }
}

function generateDefaultTimeSlots(date) {
  const slots = [];
  const startHour = 13;
  const endHour = 22;
  const interval = 1;
  
  for (let hour = startHour; hour < endHour; hour += interval) {
    const timeSlot = `${hour.toString().padStart(2, '0')}:30`;
    slots.push(timeSlot);
  }
  
  return slots;
}

function generateDynamicTimeSlots(dateStr) {
  try {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    
    const timeConfig = {
      0: { start: 14, end: 20, interval: 1 },
      1: { start: 13, end: 22, interval: 1 },
      2: { start: 13, end: 22, interval: 1 },
      3: { start: 13, end: 22, interval: 1 },
      4: { start: 13, end: 22, interval: 1 },
      5: { start: 14, end: 21, interval: 1 },
      6: { start: 14, end: 20, interval: 1 }
    };
    
    const config = timeConfig[dayOfWeek] || timeConfig[1];
    const slots = [];
    
    for (let hour = config.start; hour < config.end; hour += config.interval) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:30`;
      slots.push(timeSlot);
    }
    
    return slots;
    
  } catch (error) {
    console.warn('Erro ao gerar horários dinâmicos, usando padrão:', error);
    return generateDefaultTimeSlots(dateStr);
  }
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
