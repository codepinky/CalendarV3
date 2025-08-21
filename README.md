# Agenda da Franjinha ❤

Sistema de agendamento online com interface moderna e automação via Make (Integromat).

## ✨ Funcionalidades

- **Interface Moderna**: Design responsivo com fonte Poppins e gradientes coloridos
- **Seleção Inteligente**: Datas e horários disponíveis com visual atrativo
- **Formulário Completo**: Coleta todas as informações necessárias do cliente
- **Automação Make**: Integração automática com Google Calendar via Make
- **Responsividade**: Funciona perfeitamente em todos os dispositivos
- **Gerenciamento de Disponibilidade**: Horários agendados ficam indisponíveis automaticamente
- **Sincronização em Tempo Real**: Atualização automática da disponibilidade
- **Cache Inteligente**: Sistema de cache para melhor performance

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

### 4. Configurar Verificação de Disponibilidade

Para que o sistema funcione corretamente com horários indisponíveis, configure no Make:

1. **Webhook para verificar disponibilidade** (`/api/availability`)
2. **Estrutura esperada**:
   - **Entrada**: `{ "action": "check_availability", "date": "2024-01-15" }`
   - **Saída**: `{ "events": [...] }` (eventos brutos do Google Calendar)

3. **Configuração no Make**:
   - **Módulo**: Google Calendar → Search Events
   - **Calendar ID**: Sua conta principal
   - **Start Date**: `{{1.date}}T00:00:00`
   - **End Date**: `{{1.date}}T23:59:59`
   - **Single Events**: Yes

4. **Processamento**: O sistema processa os eventos no frontend para calcular disponibilidade

## 📱 Como Usar

1. Cliente acessa a página
2. Seleciona data e horário disponível
3. Preenche formulário com dados pessoais
4. Sistema envia dados para o Make
5. Make cria evento no Google Calendar
6. **Horário fica automaticamente indisponível** para outros usuários
7. Cliente recebe confirmação

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

### Sincronização
- `checkAvailabilityOnLoad`: Verificar disponibilidade ao carregar
- `autoRefresh`: Atualizar automaticamente (padrão: 30 segundos)
- `showBookedSlots`: Mostrar horários agendados como indisponíveis

### Validações
- Idade mínima: 18 anos
- Formato de telefone: (11) 99999-9999
- Email válido obrigatório

## 🔧 Estrutura dos Dados

### Envio de Agendamento
O sistema envia para o Make:

```json
{
  "date": "2024-01-15",
  "time": "14:30",
  "datetime": "2024-01-15T14:30:00",
  "name": "Nome do Cliente",
  "email": "cliente@email.com",
  "phone": "(11) 99999-9999",
  "reason": "Observações do cliente",
  "duration": 60,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "source": "Agenda Online"
}
```

### Verificação de Disponibilidade
O sistema consulta via `/api/availability?date=2024-01-15`:

```json
{
  "success": true,
  "date": "2024-01-15",
  "availableSlots": ["13:30", "15:30", "17:30"],
  "bookedSlots": ["19:30"],
  "lastUpdated": "2024-01-15T10:30:00.000Z"
}
```

## 📁 Arquivos

- `booking.html` - Estrutura da página
- `booking.css` - Estilos e responsividade
- `booking.js` - Lógica de agendamento e disponibilidade
- `config.js` - Configurações da aplicação
- `functions/api/booking.js` - API para agendamentos
- `functions/api/verify.js` - API para verificação de emails
- `functions/api/availability.js` - API para verificar disponibilidade

## 🌐 Deploy

1. Faça upload dos arquivos para seu servidor
2. Configure o webhook no Make
3. Configure a verificação de disponibilidade no Make
4. Teste o agendamento
5. Verifique se o evento foi criado no Google Calendar
6. **Teste se o horário fica indisponível** para novos agendamentos

## 🆘 Suporte

Para dúvidas ou problemas:
- Verifique o console do navegador para erros
- Confirme se a URL do webhook está correta
- Teste a conexão do Make com Google Calendar
- Verifique se a API de disponibilidade está funcionando

---

**Desenvolvido com ❤ para a Agenda da Franjinha**
