# Configuração do Make para Integração com Google Calendar

## Problema Identificado
Sua aplicação está tentando consultar o Make, mas o Make não está retornando dados para o frontend.

## Solução: Configuração Correta do Make

### 1. **Estrutura do Cenário no Make**

```
Google Calendar (Get free/busy) → Processamento → HTTP Response → Sua Aplicação
```

### 2. **Configuração do Módulo Google Calendar**
- **Módulo**: Google Calendar
- **Ação**: Get free/busy
- **Calendar ID**: Seu ID do calendário
- **Time Min**: `{{formatDate(now; "YYYY-MM-DDTHH:mm:ss")}}`
- **Time Max**: `{{formatDate(addDays(now; 1); "YYYY-MM-DDTHH:mm:ss")}}`

### 3. **Processamento dos Dados**
Após o Google Calendar, adicione um módulo **Set up a filter** ou **Code** para processar os dados:

```javascript
// Exemplo de processamento no Make
const events = data.events || [];
const availableSlots = [];
const bookedSlots = [];

// Horários de trabalho padrão (13:00 - 21:00)
for (let hour = 13; hour < 21; hour++) {
  const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
  
  // Verificar se este horário está ocupado
  const isBooked = events.some(event => {
    const eventStart = new Date(event.start.dateTime);
    const eventHour = eventStart.getHours();
    return eventHour === hour;
  });
  
  if (!isBooked) {
    availableSlots.push(timeSlot);
  } else {
    bookedSlots.push(timeSlot);
  }
}

// Retornar dados processados
{
  "availableSlots": availableSlots,
  "bookedSlots": bookedSlots,
  "totalEvents": events.length,
  "date": "{{formatDate(now; "YYYY-MM-DD")}}"
}
```

### 4. **Módulo HTTP Response**
- **Módulo**: HTTP Response
- **Status Code**: 200
- **Response Body**: Os dados processados acima
- **Headers**: 
  - `Content-Type: application/json`
  - `Access-Control-Allow-Origin: *`

### 5. **Configuração da Aplicação**

#### Variáveis de Ambiente (Cloudflare Pages)
```bash
MAKE_AVAILABILITY_URL=https://seu-cenario.make.com/webhook/abc123
MAKE_API_KEY=sua_chave_api_se_necessario
```

#### URL do Webhook
A URL deve ser a do seu cenário no Make, não um webhook genérico.

### 6. **Fluxo de Dados Correto**

```
Frontend → /api/availability → Make (Google Calendar) → Dados Processados → Frontend
```

### 7. **Teste da Integração**

1. **No Make**: Execute o cenário manualmente
2. **Verifique os logs**: Console do navegador e Cloudflare Functions
3. **Teste a URL**: Acesse diretamente a URL do Make para ver se retorna dados

### 8. **Exemplo de Resposta Esperada**

```json
{
  "success": true,
  "date": "2024-01-15",
  "availableSlots": ["13:00", "14:00", "16:00", "17:00", "19:00", "20:00"],
  "bookedSlots": ["15:00", "18:00"],
  "totalEvents": 2,
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "source": "Make Integration"
}
```

### 9. **Troubleshooting**

#### Se o Make não retornar dados:
- Verifique se o cenário está ativo
- Teste a execução manual
- Verifique os logs do Make
- Confirme se a URL está correta

#### Se a aplicação não receber dados:
- Verifique o console do navegador
- Verifique os logs do Cloudflare Functions
- Confirme se as variáveis de ambiente estão configuradas

### 10. **Configuração Alternativa (Webhook)**

Se preferir usar webhook, configure o Make para:
1. **Receber** requisições do seu frontend
2. **Processar** com Google Calendar
3. **Enviar** resposta via HTTP Response

A URL do webhook seria: `https://seu-cenario.make.com/webhook/abc123`
