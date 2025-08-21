// Configurações da aplicação
const CONFIG = {
  // Nota: As URLs do Make estão configuradas no Cloudflare Pages Functions
  // /api/booking - Para envio de agendamentos
  // /api/verify - Para verificação de emails
  // /api/availability - Para verificar disponibilidade de horários
  
  // Configurações dos horários de trabalho
  WORKING_HOURS: {
    // Horários agora são gerenciados pelo Make
    // start: 13.5, // 13:30 - REMOVIDO
    // end: 21.5,   // 21:30 - REMOVIDO
    // interval: 2, // 2 horas entre encontros - REMOVIDO
    duration: 1  // 1 hora de duração (mantido para cálculos)
  },
  
  // Configurações da interface
  UI: {
    maxDates: 8, // Máximo de datas para mostrar
    resultTimeout: 5000, // Tempo para auto-remover mensagens (ms)
    animationDuration: 300, // Duração das animações (ms)
    refreshInterval: 30000 // Intervalo para atualizar disponibilidade (30 segundos)
  },
  
  // Configurações de validação
  VALIDATION: {
    minAge: 18,
    maxAge: 100,
    phoneRegex: /^\(\d{2}\)\s\d{4,5}-\d{4}$/, // Formato: (11) 99999-9999
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  
  // Configurações de sincronização
  SYNC: {
    checkAvailabilityOnLoad: true, // Verificar disponibilidade ao carregar
    autoRefresh: true, // Atualizar automaticamente
    showBookedSlots: false // Se deve mostrar slots agendados como indisponíveis
  }
};

// Exportar para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
