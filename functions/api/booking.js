// functions/api/booking.js
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(context)
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const bookingData = await request.json();
    
    // Validar dados obrigatórios
    if (!isValidBookingData(bookingData)) {
      return json({ success: false, reason: 'Dados de agendamento inválidos.' }, 400, context);
    }

    // Primeiro, verificar se o e-mail está na blacklist
    if (env.MAKE_VALIDATE_URL || true) {
      const blacklistCheck = await fetch('https://hook.us2.make.com/bphuo6eve20eyffpa8b5d6nb9gs5khtg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(env.MAKE_API_KEY ? { 'X-Api-Key': env.MAKE_API_KEY } : {})
        },
        body: JSON.stringify({ email: bookingData.email })
      });

      const blacklistData = await blacklistCheck.json().catch(() => ({}));

      if (!blacklistCheck.ok || !blacklistData.allowed) {
        return json({ 
          success: false, 
          reason: blacklistData?.reason || 'E-mail não autorizado para agendamentos.' 
        }, 403, context);
      }
    }

    // Se o e-mail está liberado, criar agendamento
    if (env.MAKE_BOOKING_URL || true) {
      const bookingResponse = await fetch('https://hook.us2.make.com/4mq2128czj5a958ywgfzirjlf4sr00r7', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(env.MAKE_API_KEY ? { 'X-Api-Key': env.MAKE_API_KEY } : {})
        },
        body: JSON.stringify(bookingData)
      });

      const bookingResult = await bookingResponse.json().catch(() => ({}));

      if (!bookingResponse.ok) {
        return json({ 
          success: false, 
          reason: 'Falha ao criar agendamento no calendário.' 
        }, 502, context);
      }

      return json({ 
        success: true, 
        message: 'Agendamento criado com sucesso!',
        eventId: bookingResult.eventId 
      }, 200, context);
    }

    // Fallback mock (para testes)
    return json({ 
      success: true, 
      message: 'Agendamento criado (modo teste)' 
    }, 200, context);

  } catch (e) {
    console.error('Erro no agendamento:', e);
    return json({ success: false, reason: 'Erro interno do servidor.' }, 500, context);
  }
}

function isValidBookingData(data) {
  const required = ['date', 'time', 'datetime', 'name', 'rg', 'cpf', 'email', 'phone', 'fetiche', 'conheceu', 'duration', 'reason'];
  
  for (const field of required) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      return false;
    }
  }

  // Validar formato de e-mail
  const emailRegex = /.+@.+\..+/;
  if (!emailRegex.test(data.email)) {
    return false;
  }

  // Validar data (não pode ser no passado)
  const bookingDate = new Date(data.datetime);
  const now = new Date();
  if (bookingDate <= now) {
    return false;
  }

  return true;
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With'
  };
}
