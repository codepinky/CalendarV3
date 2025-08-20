# Verificação de Acesso - Cloudflare Pages

Uma aplicação simples para verificação de acesso baseada em e-mail, construída com HTML, CSS, JavaScript e Cloudflare Pages Functions.

## 🚀 Funcionalidades

- **Interface moderna e responsiva** com design dark mode
- **Validação de e-mail** em tempo real
- **API endpoint** `/api/verify` para verificação
- **Integração opcional** com Make.com para validação via Google Sheets
- **Fallback mock** para testes iniciais
- **CORS habilitado** para desenvolvimento local

## 📁 Estrutura do Projeto

```
repo/
├─ index.html          # Página principal
├─ styles.css          # Estilos CSS
├─ scripts.js          # Lógica JavaScript
├─ functions/          # Cloudflare Pages Functions
│  └─ api/
│     └─ verify.js     # Endpoint de verificação
└─ README.md           # Este arquivo
```

## 🛠️ Configuração

### 1. Variáveis de Ambiente (Cloudflare Pages)

No painel do Cloudflare Pages, vá em **Settings → Environment Variables** e configure:

- `MAKE_VALIDATE_URL` (opcional) - URL do webhook do Make.com
- `MAKE_API_KEY` (opcional) - Chave API para autenticação

> **Nota**: Se `MAKE_VALIDATE_URL` não estiver configurado, o endpoint retornará `allowed: true` (mock) para facilitar testes.

### 2. Deploy no Cloudflare Pages

1. **Conecte o repositório**:
   - Build command: (deixe vazio)
   - Build output directory: (raiz do repo)
   - Habilite **Pages Functions** (detecta automaticamente `/functions`)

2. **Configure o domínio**:
   - Use o domínio `.pages.dev` fornecido ou configure um domínio customizado

## 🔧 Desenvolvimento Local

### Testando a API

```bash
# Teste o endpoint de verificação
curl -X POST http://localhost:8788/api/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com"}'
```

### Estrutura da Resposta da API

```json
{
  "allowed": true,
  "reason": "Acesso liberado"
}
```

**Códigos de Status:**
- `200` - Acesso permitido
- `400` - E-mail inválido
- `403` - Acesso negado
- `502` - Erro no upstream (Make.com)

## 🔗 Integração com Make.com

### Cenário de Uso

1. **Trigger**: Custom Webhook recebe `{ email }`
2. **Validação**: Busca no Google Sheets (aba `allowlist`)
3. **Resposta**: Retorna `{ allowed: boolean, reason?: string }`

### Exemplo de Fluxo no Make

```
Webhook → Parse JSON → Google Sheets Search → Router → Webhook Response
```

## 🎨 Personalização

### Cores e Estilo

Edite as variáveis CSS em `styles.css`:

```css
:root {
  --primary: #8b5cf6;    /* Cor principal */
  --bg: #0f0f13;        /* Fundo */
  --card: #16161d;       /* Card */
  --text: #e8e8f0;      /* Texto */
}
```

### Mensagens

Personalize as mensagens em `scripts.js` e `functions/api/verify.js`.

## 📱 Responsividade

A interface é totalmente responsiva e funciona em:
- Desktop (≥768px)
- Tablet (≥480px)
- Mobile (<480px)

## 🚀 Deploy Rápido

```bash
# 1. Inicializar repositório
git init
git add .
git commit -m "feat: verificação de acesso com Cloudflare Pages"

# 2. Conectar ao GitHub
git branch -M main
git remote add origin https://github.com/<usuario>/<repo>.git
git push -u origin main

# 3. Deploy no Cloudflare Pages
# - Conecte o repositório
# - Habilite Pages Functions
# - Configure variáveis de ambiente (opcional)
```

## 🔒 Segurança

- Validação de entrada no servidor
- Headers CORS configurados
- Rate limiting automático do Cloudflare
- Sanitização de dados

## 📊 Monitoramento

- **Cloudflare Analytics** integrado
- **Logs** disponíveis no painel do Cloudflare
- **Métricas** de performance automáticas

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

**Desenvolvido com ❤️ para Cloudflare Pages**
