# 🔧 Configuração da Integração Make.com + Google Calendar

## Visão Geral
Este guia explica como configurar o Make.com para consultar eventos "Agendar" no Google Calendar e retornar a disponibilidade semanal.

## Pré-requisitos
- Conta no Make.com (anteriormente Integromat)
- Conta no Google Workspace ou Google Calendar
- Acesso ao Google Calendar API

## Passo a Passo

### 1. Configuração do Google Calendar

#### 1.1 Criar Eventos "Agendar"
- Acesse seu Google Calendar
- Crie eventos com o nome exato "Agendar"
- Configure o horário de início e fim
- Defina o status como "Confirmado"
- Adicione uma descrição se necessário

#### 1.2 Configurar Permissões
- Verifique se o calendário está público ou compartilhado
- Configure permissões de leitura para a integração

### 2. Configuração no Make.com

#### 2.1 Criar Novo Cenário
1. Acesse [Make.com](https://www.make.com)
2. Clique em "Create a new scenario"
3. Nomeie como "Google Calendar - Eventos Agendar"

#### 2.2 Configurar Trigger (Google Calendar)
1. Clique no primeiro módulo
2. Procure por "Google Calendar"
3. Selecione "Watch Events"
4. Configure a conexão:
   - **Calendar ID**: Seu calendário principal ou ID específico
   - **Event Name**: Deixe em branco (vamos filtrar depois)
   - **Time Range**: Configure conforme necessário

#### 2.3 Configurar Filtro de Eventos
1. Adicione um módulo "Set up a filter"
2. Configure o filtro:
   - **Condition**: `Event Name` equals `Agendar`
   - **Status**: `Event Status` equals `confirmed`

#### 2.4 Configurar Webhook de Resposta
1. Adicione um módulo "Webhook"
2. Configure:
   - **URL**: `https://hook.us2.make.com/wvkq5vbyp9g80pv3n89rm2lvc7hgggce`
   - **Method**: GET
   - **Query Parameters**:
     - `startDate`: `{{startDate}}`
     - `endDate`: `{{endDate}}`
     - `eventName`: `Agendar`

#### 2.5 Configurar Mapeamento de Dados
1. No módulo Webhook, configure o corpo da resposta:
```json
{
  "events": [
    {
      "name": "{{event.name}}",
      "start": "{{event.start.dateTime}}",
      "end": "{{event.end.dateTime}}",
      "status": "{{event.status}}",
      "description": "{{event.description}}"
    }
  ]
}
```

### 3. Configuração Alternativa (Consulta Manual)

#### 3.1 Usar HTTP Request
1. Adicione módulo "HTTP"
2. Configure:
   - **URL**: `https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events`
   - **Method**: GET
   - **Headers**:
     - `Authorization`: `Bearer {{access_token}}`
   - **Query Parameters**:
     - `timeMin`: `{{startDate}}T00:00:00Z`
     - `timeMax`: `{{endDate}}T23:59:59Z`
     - `q`: `Agendar`
     - `singleEvents`: `true`
     - `orderBy`: `startTime`

#### 3.2 Processar Resposta
1. Adicione módulo "Set up a filter"
2. Filtre eventos com nome "Agendar"
3. Mapeie para o formato esperado pela API

### 4. Configuração de Autenticação

#### 4.1 Google OAuth
1. No módulo Google Calendar, clique em "Add"
2. Configure OAuth 2.0:
   - **Client ID**: Seu Google Cloud Client ID
   - **Client Secret**: Seu Google Cloud Client Secret
   - **Scopes**: `https://www.googleapis.com/auth/calendar.readonly`

#### 4.2 Criar Credenciais Google Cloud
1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um novo projeto ou selecione existente
3. Ative Google Calendar API
4. Crie credenciais OAuth 2.0
5. Configure URIs de redirecionamento autorizados

### 5. Teste da Integração

#### 5.1 Teste Manual
1. Execute o cenário manualmente
2. Verifique os logs de execução
3. Confirme se os dados estão sendo retornados corretamente

#### 5.2 Teste via API
```bash
curl "https://seu-dominio.com/api/availability?checkAgendar=true&startDate=2024-01-15&endDate=2024-01-21"
```

### 6. Configuração de Agendamento

#### 6.1 Execução Automática
1. Configure o cenário para executar:
   - A cada hora
   - Diariamente às 00:00
   - Quando solicitado via webhook

#### 6.2 Webhook de Ativação
1. Adicione módulo "Webhook" como trigger
2. Configure para receber requisições GET
3. Mapeie parâmetros `startDate` e `endDate`

## Estrutura de Dados Esperada

### Entrada (Parâmetros)
```json
{
  "startDate": "2024-01-15",
  "endDate": "2024-01-21",
  "eventName": "Agendar"
}
```

### Saída (Resposta)
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

## Solução de Problemas

### Erro de Autenticação
- Verifique se as credenciais OAuth estão válidas
- Confirme se os escopos estão configurados corretamente
- Teste a conexão no módulo Google Calendar

### Eventos Não Aparecem
- Verifique se o nome do evento é exatamente "Agendar"
- Confirme se o status está como "confirmed"
- Verifique as permissões do calendário

### Erro de Timezone
- Configure o timezone no Google Calendar
- Use UTC para timestamps
- A API converte automaticamente para America/Sao_Paulo

## Monitoramento

### Logs de Execução
- Verifique os logs no Make.com
- Monitore erros de execução
- Configure alertas para falhas

### Métricas
- Número de eventos encontrados
- Tempo de resposta da API
- Taxa de sucesso das consultas

## Manutenção

### Atualizações
- Mantenha as credenciais OAuth atualizadas
- Verifique periodicamente as permissões do calendário
- Monitore mudanças na API do Google Calendar

### Backup
- Configure cenários de fallback
- Mantenha backup das configurações
- Documente mudanças importantes

## Suporte

### Recursos Úteis
- [Google Calendar API Documentation](https://developers.google.com/calendar)
- [Make.com Help Center](https://www.make.com/en/help)
- [Google Cloud Console](https://console.cloud.google.com)

### Contato
- Para problemas técnicos: Verifique logs do Make.com
- Para problemas de API: Consulte documentação do Google
- Para problemas de integração: Verifique configurações do cenário
