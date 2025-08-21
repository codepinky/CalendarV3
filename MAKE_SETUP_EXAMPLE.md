# Configuração do Make para Gerenciar Disponibilidade

Este arquivo mostra como configurar o Make (Integromat) para que o sistema funcione corretamente com horários indisponíveis.

## 🔄 Cenário 1: Verificação de Disponibilidade

### Estrutura do Cenário
```
Webhook → Google Calendar → Router → Response
```

### 1. Webhook de Entrada
- **Método**: POST
- **URL**: Sua URL do Make
- **Payload esperado**:
```json
{
  "action": "check_availability",
  "date": "2024-01-15",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Google Calendar - Listar Eventos
- **Ação**: List Events
- **Calendar ID**: Seu calendário
- **Time Min**: `{{date}}T00:00:00Z`
- **Time Max**: `{{date}}T23:59:59Z`
- **Single Events**: true

### 3. Router para Processar
- **Condição**: `action = "check_availability"`

### 4. Processar Eventos
- **Mapear horários agendados**:
```javascript
// Para cada evento encontrado
const startTime = event.start.dateTime;
const hour = new Date(startTime).getHours();
const minute = new Date(startTime).getMinutes();
const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
```

### 5. Gerar Horários Disponíveis
```javascript
// Horários base do sistema
const baseSlots = ["13:30", "15:30", "17:30", "19:30"];

// Filtrar horários não agendados
const availableSlots = baseSlots.filter(slot => 
  !bookedSlots.includes(slot)
);

// Resposta final
{
  "success": true,
  "date": "{{date}}",
  "availableSlots": availableSlots,
  "bookedSlots": bookedSlots,
  "lastUpdated": "{{now}}"
}
```

## 📅 Cenário 2: Criação de Agendamento

### Estrutura do Cenário
```
Webhook → Google Calendar → Email/WhatsApp → Response
```

### 1. Webhook de Entrada
- **Payload esperado**:
```json
{
  "date": "2024-01-15",
  "time": "14:30",
  "datetime": "2024-01-15T14:30:00",
  "name": "Nome do Cliente",
  "email": "cliente@email.com",
  "phone": "(11) 99999-9999",
  "reason": "Observações",
  "duration": 60
}
```

### 2. Google Calendar - Criar Evento
- **Ação**: Create Event
- **Summary**: `{{name}} - Encontro`
- **Start Date**: `{{date}}T{{time}}:00`
- **End Date**: `{{date}}T{{time}}:00` + 1 hora
- **Description**: Dados do cliente e observações

### 3. Enviar Confirmação
- **Email** ou **WhatsApp** para o cliente
- **Resposta de sucesso**:
```json
{
  "success": true,
  "message": "Agendamento criado com sucesso!",
  "eventId": "{{event.id}}"
}
```

## ⚙️ Configurações Importantes

### 1. Horários de Trabalho
Configure no Make para corresponder ao `config.js`:
- **Início**: 13:30 (13.5)
- **Fim**: 21:30 (21.5)
- **Intervalo**: 2 horas
- **Duração**: 1 hora

### 2. Formato de Data/Hora
- **Data**: YYYY-MM-DD
- **Hora**: HH:MM (24h)
- **Timezone**: UTC ou seu timezone local

### 3. Tratamento de Erros
- **Validação**: Verificar se horário está disponível antes de criar
- **Duplicação**: Evitar agendamentos duplicados
- **Fallback**: Resposta de erro em caso de falha

## 🔧 Exemplo de Código Make

### Verificar Disponibilidade
```javascript
// No módulo Code do Make
const date = data.date;
const baseSlots = ["13:30", "15:30", "17:30", "19:30"];

// Buscar eventos do Google Calendar
const events = await googleCalendar.listEvents({
  calendarId: 'primary',
  timeMin: `${date}T00:00:00Z`,
  timeMax: `${date}T23:59:59Z`
});

// Extrair horários agendados
const bookedSlots = events.items.map(event => {
  const start = new Date(event.start.dateTime);
  return `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
});

// Filtrar horários disponíveis
const availableSlots = baseSlots.filter(slot => !bookedSlots.includes(slot));

// Retornar resposta
return {
  success: true,
  date: date,
  availableSlots: availableSlots,
  bookedSlots: bookedSlots,
  lastUpdated: new Date().toISOString()
};
```

## 🚀 Testando a Configuração

### 1. Teste de Disponibilidade
- Acesse: `GET /api/availability?date=2024-01-15`
- Verifique se retorna horários corretos

### 2. Teste de Agendamento
- Faça um agendamento via formulário
- Verifique se aparece no Google Calendar
- Verifique se horário fica indisponível

### 3. Teste de Sincronização
- Agende em outro dispositivo/navegador
- Verifique se horários indisponíveis não aparecem

## 📝 Notas Importantes

- **Cache**: O sistema usa cache local para performance
- **Refresh**: Atualização automática a cada 30 segundos
- **Fallback**: Em caso de erro, mostra todos os horários como disponíveis
- **Segurança**: Validação de dados em ambas as APIs

---

**Configuração necessária para o sistema funcionar com horários indisponíveis**
