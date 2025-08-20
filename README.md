# Agenda da Franjinha ❤

Sistema de agendamento online com interface moderna e automação via Make (Integromat).

## ✨ Funcionalidades

- **Interface Moderna**: Design responsivo com fonte Poppins e gradientes coloridos
- **Seleção Inteligente**: Datas e horários disponíveis com visual atrativo
- **Formulário Completo**: Coleta todas as informações necessárias do cliente
- **Automação Make**: Integração automática com Google Calendar via Make
- **Responsividade**: Funciona perfeitamente em todos os dispositivos

## 🚀 Configuração

### 1. Configurar o Make (Integromat)

1. Acesse [make.com](https://make.com)
2. Crie um novo cenário
3. Adicione um módulo **Webhook**
4. Configure o webhook para receber dados POST
5. Copie a URL do webhook

### 2. Configurar a Aplicação

1. Abra o arquivo `config.js`
2. Substitua `SEU_WEBHOOK_URL_AQUI` pela URL real do seu webhook:

```javascript
MAKE_WEBHOOK_URL: 'https://hook.eu1.make.com/SEU_WEBHOOK_ID_AQUI'
```

### 3. Configurar o Google Calendar no Make

No seu cenário do Make, adicione:

1. **Módulo Google Calendar** → **Create an Event**
2. Configure a conexão com sua conta Google
3. Mapeie os campos:
   - **Summary**: `{{clientName}} - Encontro`
   - **Start Date**: `{{date}} {{time}}`
   - **End Date**: `{{date}} {{time}}` + 1 hora
   - **Description**: Dados do cliente e observações

## 📱 Como Usar

1. Cliente acessa a página
2. Seleciona data e horário disponível
3. Preenche formulário com dados pessoais
4. Sistema envia dados para o Make
5. Make cria evento no Google Calendar
6. Cliente recebe confirmação

## 🎨 Personalização

### Cores e Estilos
- Edite `booking.css` para personalizar cores e estilos
- O título principal usa gradiente animado com 5 cores

### Horários de Trabalho
- Configure em `config.js`:
  - `start`: Hora de início (13.5 = 13:30)
  - `end`: Hora de fim (21.5 = 21:30)
  - `interval`: Intervalo entre encontros
  - `duration`: Duração de cada encontro

### Validações
- Idade mínima: 18 anos
- Formato de telefone: (11) 99999-9999
- Email válido obrigatório

## 🔧 Estrutura dos Dados

O sistema envia para o Make:

```json
{
  "date": "2024-01-15",
  "time": "14:30 - 15:30",
  "clientName": "Nome do Cliente",
  "clientEmail": "cliente@email.com",
  "clientPhone": "(11) 99999-9999",
  "clientAge": "25",
  "clientCity": "São Paulo",
  "clientState": "SP",
  "clientNotes": "Observações do cliente",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "source": "Agenda Online"
}
```

## 📁 Arquivos

- `booking.html` - Estrutura da página
- `booking.css` - Estilos e responsividade
- `booking.js` - Lógica de agendamento
- `config.js` - Configurações da aplicação
- `main.js` - Funcionalidades gerais

## 🌐 Deploy

1. Faça upload dos arquivos para seu servidor
2. Configure o webhook no Make
3. Teste o agendamento
4. Verifique se o evento foi criado no Google Calendar

## 🆘 Suporte

Para dúvidas ou problemas:
- Verifique o console do navegador para erros
- Confirme se a URL do webhook está correta
- Teste a conexão do Make com Google Calendar

---

**Desenvolvido com ❤ para a Agenda da Franjinha**
