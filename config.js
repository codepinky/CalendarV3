// Configurações da aplicação
const CONFIG = {
  // Nota: As URLs do Make estão configuradas no Cloudflare Pages Functions
  // /api/booking - Para envio de agendamentos
  // /api/verify - Para verificação de emails
  
  // Configurações dos horários de trabalho
  WORKING_HOURS: {
    start: 13.5, // 13:30
    end: 21.5,   // 21:30
    interval: 2, // 2 horas entre encontros (1h encontro + 1h intervalo)
    duration: 1  // 1 hora de duração
  },
  
  // Configurações da interface
  UI: {
    maxDates: 8, // Máximo de datas para mostrar
    resultTimeout: 5000, // Tempo para auto-remover mensagens (ms)
    animationDuration: 300 // Duração das animações (ms)
  },
  
  // Configurações de validação
  VALIDATION: {
    minAge: 18,
    maxAge: 100,
    phoneRegex: /^\(\d{2}\)\s\d{4,5}-\d{4}$/, // Formato: (11) 99999-9999
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  }
};

// Exportar para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
