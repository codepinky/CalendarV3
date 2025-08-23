# Verificação de Disponibilidade - Eventos "Agendar"

## Descrição
Esta funcionalidade permite verificar quais dias da semana têm eventos chamados "Agendar" ativos no Google Calendar, através da integração com Make.com.

## Como Funciona

### 1. Configuração no Google Calendar
- Crie eventos manualmente no Google Calendar
- Nome do evento deve ser exatamente "Agendar"
- O Make.com irá consultar esses eventos para determinar disponibilidade

### 2. Endpoint da API
```
GET /api/availability?checkAgendar=true&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

### 3. Parâmetros
- `checkAgendar=true` - Ativa a verificação específica de eventos "Agendar"
- `startDate` - Data de início da semana (formato: YYYY-MM-DD)
- `endDate` - Data de fim da semana (formato: YYYY-MM-DD)

## Exemplo de Uso

### Frontend (JavaScript)
```javascript
// Verificar disponibilidade da semana atual
const today = new Date();
const startOfWeek = new Date(today);
startOfWeek.setDate(today.getDate() - today.getDay()); // Domingo

const endOfWeek = new Date(startOfWeek);
endOfWeek.setDate(startOfWeek.getDate() + 6); // Sábado

const startDate = startOfWeek.toISOString().split('T')[0];
const endDate = endOfWeek.toISOString().split('T')[0];

const response = await fetch(`/api/availability?checkAgendar=true&startDate=${startDate}&endDate=${endDate}`);
const data = await response.json();

if (data.success) {
  console.log('Dias disponíveis:', data.agendarAvailability);
  
  // Filtrar apenas dias com disponibilidade
  const availableDays = Object.values(data.agendarAvailability)
    .filter(day => day.hasAvailability);
    
  console.log('Dias com evento "Agendar" ativo:', availableDays);
}
```

### Exemplo de Resposta
```json
{
  "success": true,
  "startDate": "2024-01-15",
  "endDate": "2024-01-21",
  "agendarAvailability": {
    "2024-01-15": {
      "date": "2024-01-15",
      "hasAvailability": true,
      "eventName": "Agendar",
      "eventStatus": "confirmed",
      "availableSlots": ["13:30", "14:30", "15:30", "16:30", "17:30", "18:30", "19:30", "20:30", "21:30"],
      "bookedSlots": [],
      "message": "Dia com evento \"Agendar\" ativo para agendamento",
      "eventDetails": {
        "start": "2024-01-15T13:00:00Z",
        "end": "2024-01-15T22:00:00Z",
        "description": "Disponível para agendamento"
      }
    },
    "2024-01-16": {
      "date": "2024-01-16",
      "hasAvailability": false,
      "eventName": null,
      "eventStatus": null,
      "availableSlots": [],
      "bookedSlots": [],
      "message": "Sem eventos \"Agendar\" para este dia"
    }
  },
  "timezone": "America/Sao_Paulo",
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "source": "Make.com - Eventos Agendar",
  "description": "Dias com eventos \"Agendar\" ativos para agendamento"
}
```

## Integração com Make.com

### Webhook URL
```
https://hook.us2.make.com/wvkq5vbyp9g80pv3n89rm2lvc7hgggce
```

### Parâmetros Esperados
- `startDate` - Data de início
- `endDate` - Data de fim
- `eventName` - Nome do evento (opcional, para filtrar por "Agendar")

### Resposta Esperada do Make
```json
{
  "events": [
    {
      "name": "Agendar",
      "start": "2024-01-15T13:00:00Z",
      "end": "2024-01-15T22:00:00Z",
      "status": "confirmed",
      "description": "Disponível para agendamento"
    }
  ]
}
```

## Fluxo de Funcionamento

1. **Frontend** envia requisição com período desejado
2. **API** encaminha para Make.com com parâmetros
3. **Make.com** consulta Google Calendar para eventos "Agendar"
4. **Make.com** retorna lista de eventos encontrados
5. **API** processa dados e retorna disponibilidade formatada
6. **Frontend** exibe dias disponíveis para o usuário

## Vantagens

- ✅ Verificação automática de disponibilidade
- ✅ Integração direta com Google Calendar
- ✅ Filtragem específica por eventos "Agendar"
- ✅ Horários dinâmicos baseados no dia da semana
- ✅ Fallback para horários padrão
- ✅ Timezone configurado para Brasil (America/Sao_Paulo)

## Configuração no Make.com

1. Conectar com Google Calendar
2. Configurar trigger para eventos
3. Filtrar por nome do evento = "Agendar"
4. Configurar webhook de resposta
5. Testar integração

## Notas Importantes

- O nome do evento deve ser exatamente "Agendar" (case-sensitive)
- Apenas eventos confirmados/ativos são considerados disponíveis
- Horários são gerados automaticamente baseados no dia da semana
- Timezone é sempre America/Sao_Paulo para compatibilidade com Brasil
