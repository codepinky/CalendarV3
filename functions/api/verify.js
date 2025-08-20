// functions/api/verify.js
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(context)
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { email } = await request.json();
    if (!isValidEmail(email)) {
      return json({ allowed: false, reason: 'E-mail inválido.' }, 400, context);
    }

    // If Make Webhook is configured, forward the request
    if (env.MAKE_VALIDATE_URL) {
      const res = await fetch(env.MAKE_VALIDATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(env.MAKE_API_KEY ? { 'X-Api-Key': env.MAKE_API_KEY } : {})
        },
        body: JSON.stringify({ email })
      });

      // Expect Make to respond with { allowed: boolean, reason?: string }
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return json({ allowed: false, reason: 'Falha na verificação (upstream).' }, 502, context);
      }

      if (data && data.allowed) {
        return json({ allowed: true }, 200, context);
      } else {
        return json({ allowed: false, reason: data?.reason || 'Não autorizado.' }, 403, context);
      }
    }

    // Fallback mock (for early testing)
    return json({ allowed: true }, 200, context);
  } catch (e) {
    return json({ allowed: false, reason: 'Payload inválido.' }, 400, context);
  }
}

function isValidEmail(email) {
  return typeof email === 'string' && /.+@.+\..+/.test(email);
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
  // For same-origin (Pages) this is often unnecessary,
  // but these headers help when previewing locally.
  const origin = context.request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With'
  };
}
