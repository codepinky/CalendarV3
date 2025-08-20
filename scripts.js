const form = document.getElementById('verify-form');
const emailInput = document.getElementById('email');
const result = document.getElementById('result');
const btn = document.getElementById('submit-btn');

document.getElementById('year').textContent = new Date().getFullYear();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = (emailInput.value || '').trim();
  if (!email) return;

  result.textContent = 'Verificando…';
  result.className = 'result';
  btn.disabled = true;

  try {
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.allowed) {
      result.textContent = 'Acesso liberado. ✅';
      result.classList.add('ok');
    } else {
      const reason = data?.reason || 'Acesso negado.';
      result.textContent = `${reason} ❌`;
      result.classList.add('err');
    }
  } catch (err) {
    result.textContent = 'Erro de rede. Tente novamente.';
    result.classList.add('err');
  } finally {
    btn.disabled = false;
  }
});
