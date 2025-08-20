// JavaScript para a página de agendamento

// Elementos do DOM
const dateInput = document.getElementById('date');
const timeSlots = document.getElementById('time-slots');
const bookingForm = document.getElementById('booking-form');
const result = document.getElementById('result');
const submitBtn = document.getElementById('submit-btn');

// Configurações de horários
const WORKING_HOURS = {
  start: 9, // 9h
  end: 18,  // 18h
  interval: 60 // 1 hora por slot
};

// Horários já agendados (simulado - depois virá do Google Calendar)
const BOOKED_SLOTS = [
  '2025-01-20T10:00:00',
  '2025-01-20T14:00:00',
  '2025-01-21T11:00:00'
];

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
  // Definir data mínima (hoje)
  const today = new Date().toISOString().split('T')[0];
  dateInput.min = today;
  dateInput.value = today;
  
  // Gerar horários para hoje
  generateTimeSlots(today);
  
  // Atualizar ano no footer
  document.getElementById('year').textContent = new Date().getFullYear();
});

// Gerar horários disponíveis
function generateTimeSlots(date) {
  timeSlots.innerHTML = '';
  
  for (let hour = WORKING_HOURS.start; hour < WORKING_HOURS.end; hour++) {
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    const slotDateTime = `${date}T${hour.toString().padStart(2, '0')}:00:00`;
    
    // Verificar se o horário já está agendado
    const isBooked = BOOKED_SLOTS.includes(slotDateTime);
    
    const slot = document.createElement('div');
    slot.className = `time-slot ${isBooked ? 'disabled' : ''}`;
    slot.textContent = timeString;
    slot.dataset.time = hour;
    slot.dataset.datetime = slotDateTime;
    
    if (!isBooked) {
      slot.addEventListener('click', () => selectTimeSlot(slot));
    }
    
    timeSlots.appendChild(slot);
  }
}

// Selecionar horário
function selectTimeSlot(selectedSlot) {
  // Remover seleção anterior
  document.querySelectorAll('.time-slot').forEach(slot => {
    slot.classList.remove('selected');
  });
  
  // Selecionar novo horário
  selectedSlot.classList.add('selected');
  
  // Atualizar formulário
  updateFormWithSelectedTime();
}

// Atualizar formulário com horário selecionado
function updateFormWithSelectedTime() {
  const selectedSlot = document.querySelector('.time-slot.selected');
  if (selectedSlot) {
    const selectedTime = selectedSlot.dataset.time;
    const selectedDate = dateInput.value;
    
    // Aqui você pode adicionar campos hidden ou atualizar a interface
    console.log(`Horário selecionado: ${selectedDate} às ${selectedTime}:00`);
  }
}

// Mudança de data
dateInput.addEventListener('change', function() {
  generateTimeSlots(this.value);
});

// Submissão do formulário
bookingForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  // Verificar se um horário foi selecionado
  const selectedSlot = document.querySelector('.time-slot.selected');
  if (!selectedSlot) {
    showResult('Por favor, selecione um horário disponível.', 'error');
    return;
  }
  
  // Coletar dados do formulário
  const formData = new FormData(bookingForm);
  const bookingData = {
    date: dateInput.value,
    time: selectedSlot.dataset.time,
    datetime: selectedSlot.dataset.datetime,
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    duration: formData.get('duration'),
    reason: formData.get('reason')
  };
  
  // Log detalhado para debug
  console.log('=== DEBUG AGENDAMENTO ===');
  console.log('Data selecionada:', dateInput.value);
  console.log('Horário selecionado:', selectedSlot.dataset.time);
  console.log('DateTime completo:', selectedSlot.dataset.datetime);
  console.log('Dados completos:', bookingData);
  console.log('========================');
  
  // Validar dados
  if (!validateBookingData(bookingData)) {
    return;
  }
  
  // Enviar agendamento
  await submitBooking(bookingData);
});

// Validar dados do agendamento
function validateBookingData(data) {
  if (!data.name.trim()) {
    showResult('Por favor, preencha seu nome completo.', 'error');
    return false;
  }
  
  if (!data.email.trim()) {
    showResult('Por favor, preencha seu e-mail.', 'error');
    return false;
  }
  
  if (!data.phone.trim()) {
    showResult('Por favor, preencha seu telefone.', 'error');
    return false;
  }
  
  if (!data.reason.trim()) {
    showResult('Por favor, descreva o motivo da consulta.', 'error');
    return false;
  }
  
  return true;
}

// Enviar agendamento
async function submitBooking(bookingData) {
  try {
    submitBtn.disabled = true;
    showResult('Verificando disponibilidade e criando agendamento...', 'info');
    
    // Enviar dados para o endpoint de agendamento
    const response = await fetch('/api/booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      showResult('✅ Agendamento criado com sucesso! Você receberá uma confirmação por e-mail.', 'success');
      
      // Limpar formulário
      bookingForm.reset();
      document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
      });
      
      // Adicionar horário agendado à lista de slots ocupados
      BOOKED_SLOTS.push(bookingData.datetime);
      
      // Regenerar horários para mostrar o slot como ocupado
      generateTimeSlots(dateInput.value);
      
    } else {
      showResult(`Erro: ${result.reason || 'Não foi possível criar o agendamento'}`, 'error');
    }
    
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    showResult('Erro de conexão. Tente novamente.', 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

// Simular criação de agendamento (temporário)
async function simulateBookingCreation(bookingData) {
  // Simular delay de processamento
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Aqui você integrará com Make.com para criar o evento no Google Calendar
  console.log('Dados do agendamento:', bookingData);
  
  // Exemplo de dados que serão enviados para o Make.com:
  const calendarEvent = {
    summary: `Consulta - ${bookingData.name}`,
    description: `Cliente: ${bookingData.name}\nE-mail: ${bookingData.email}\nTelefone: ${bookingData.phone}\nMotivo: ${bookingData.reason}`,
    start: {
      dateTime: `${bookingData.datetime}:00`,
      timeZone: 'America/Sao_Paulo'
    },
    end: {
      dateTime: `${new Date(bookingData.datetime).getTime() + (parseInt(bookingData.duration) * 60000)}`,
      timeZone: 'America/Sao_Paulo'
    }
  };
  
  console.log('Evento do calendário:', calendarEvent);
}

// Mostrar resultado
function showResult(message, type = 'info') {
  result.textContent = message;
  result.className = `result ${type}`;
  
  // Limpar mensagem após 5 segundos (exceto para sucesso)
  if (type !== 'success') {
    setTimeout(() => {
      result.textContent = '';
      result.className = 'result';
    }, 5000);
  }
}
