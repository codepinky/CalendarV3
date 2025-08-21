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

    // Se o Make estiver configurado, consultar eventos do Google Calendar
    if (env.MAKE_AVAILABILITY_URL || true) {
      // URL do webhook de disponibilidade (substitua pela sua URL real)
      const availabilityWebhookUrl = env.MAKE_AVAILABILITY_URL || 'https://hook.us2.make.com/SEU_WEBHOOK_DE_DISPONIBILIDADE_AQUI';
      
      const availabilityResponse = await fetch(availabilityWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(env.MAKE_API_KEY ? { 'X-Api-Key': env.MAKE_API_KEY } : {})
        },
        body: JSON.stringify({ 
          action: 'check_availability',
          date: date,
          timestamp: new Date().toISOString()
        })
      });

      if (availabilityResponse.ok) {
        const calendarData = await availabilityResponse.json().catch(() => ({}));
        
        // Retornar dados brutos do Google Calendar para o frontend processar
        return json({
          success: true,
          date: date,
          events: calendarData.events || [],
          lastUpdated: new Date().toISOString()
        }, 200, context);
      }
    }

    // Fallback: retornar array vazio de eventos (para desenvolvimento)
    return json({
      success: true,
      date: date,
      events: [], // Nenhum evento por padrão
      lastUpdated: new Date().toISOString(),
      note: 'Modo desenvolvimento - nenhum evento encontrado'
    }, 200, context);

  } catch (e) {
    console.error('Erro ao verificar disponibilidade:', e);
    return json({ 
      success: false, 
      reason: 'Erro interno do servidor.' 
    }, 500, context);
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
