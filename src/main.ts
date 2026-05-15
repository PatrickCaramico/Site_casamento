import './style.css'

const normalizeEnvUrl = (value: unknown) => {
  const raw = String(value ?? '').trim();
  return raw.replace(/^['\"]|['\"]$/g, '').trim();
};

const GOOGLE_SCRIPT_URL = normalizeEnvUrl(import.meta.env.VITE_GOOGLE_SCRIPT_URL);
const GOOGLE_SCRIPT_GIFTS_URL = normalizeEnvUrl(import.meta.env.VITE_GOOGLE_SCRIPT_GIFTS_URL || import.meta.env.VITE_GOOGLE_SCRIPT_URL);

// --- Contagem Regressiva ---
const weddingDate = new Date('June 6, 2026 16:00:00').getTime();

const updateTimer = () => {
  const now = new Date().getTime();
  const distance = weddingDate - now;

  if (distance < 0) {
    const timerElement = document.getElementById('timer');
    if (timerElement) timerElement.innerHTML = "O GRANDE DIA CHEGOU!";
    return;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');

  if (daysEl) daysEl.innerText = days.toString().padStart(2, '0');
  if (hoursEl) hoursEl.innerText = hours.toString().padStart(2, '0');
  if (minutesEl) minutesEl.innerText = minutes.toString().padStart(2, '0');
  if (secondsEl) secondsEl.innerText = seconds.toString().padStart(2, '0');
};

setInterval(updateTimer, 1000);
updateTimer();

// --- RSVP Form Handling ---
const rsvpForm = document.getElementById('rsvp-form') as HTMLFormElement;
const formFeedback = document.getElementById('form-feedback');
const submitBtn = rsvpForm?.querySelector('.btn-primary-premium') as HTMLButtonElement | null;
const newResponseBtn = document.getElementById('new-response') as HTMLButtonElement | null;
const formStatus = document.getElementById('form-status') as HTMLParagraphElement | null;
const feedbackMessage = document.getElementById('feedback-message') as HTMLParagraphElement | null;
const adultsCountSelect = document.getElementById('adultsCount') as HTMLSelectElement | null;
const childrenCountSelect = document.getElementById('childrenCount') as HTMLSelectElement | null;
const adultCompanionsContainer = document.getElementById('adult-companions-container') as HTMLDivElement | null;
const childrenNamesContainer = document.getElementById('children-names-container') as HTMLDivElement | null;

type AttendanceOption = 'sim' | 'talvez' | 'nao';

type RsvpPayload = {
  name: string;
  ceremonyAttendance: AttendanceOption;
  restaurantAttendance: AttendanceOption;
  adultsCount: number;
  companionNames: string[];
  childrenCount: number;
  childrenNames: string[];
  message: string;
  timestamp: string;
};

const parseBoundedCount = (value: string, min: number, max: number, fallback: number) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const renderDynamicNameInputs = (
  container: HTMLDivElement | null,
  count: number,
  inputName: string,
  placeholder: string,
  idPrefix: string,
) => {
  if (!container) return;

  container.innerHTML = '';

  if (count <= 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');

  for (let i = 1; i <= count; i += 1) {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `${idPrefix}-${i}`;
    input.name = inputName;
    input.placeholder = placeholder;
    input.required = true;
    input.className = 'dynamic-name-input';
    container.appendChild(input);
  }
};

const syncGuestNameFields = () => {
  const adultsCount = parseBoundedCount(adultsCountSelect?.value ?? '1', 1, 10, 1);
  const childrenCount = parseBoundedCount(childrenCountSelect?.value ?? '0', 0, 10, 0);

  renderDynamicNameInputs(
    adultCompanionsContainer,
    Math.max(0, adultsCount - 1),
    'adultCompanionNames',
    'Nome completo do acompanhante',
    'adult-companion-name',
  );

  renderDynamicNameInputs(
    childrenNamesContainer,
    childrenCount,
    'childNames',
    'Nome completo da criança',
    'child-name',
  );
};

adultsCountSelect?.addEventListener('change', syncGuestNameFields);
childrenCountSelect?.addEventListener('change', syncGuestNameFields);
syncGuestNameFields();

const updateFormStatus = (message: string, type: 'pending' | 'error') => {
  if (!formStatus) return;

  formStatus.classList.remove('hidden', 'pending', 'error');
  formStatus.classList.add(type);
  formStatus.innerText = message;
};

const clearFormStatus = () => {
  if (!formStatus) return;

  formStatus.classList.add('hidden');
  formStatus.classList.remove('pending', 'error');
  formStatus.innerText = '';
};

const sendToGoogleSheets = async (payload: RsvpPayload) => {
  if (!GOOGLE_SCRIPT_URL) {
    throw new Error('URL do Google Sheets não configurada.');
  }

  const params = new URLSearchParams({
    name: payload.name,
    ceremonyAttendance: payload.ceremonyAttendance,
    restaurantAttendance: payload.restaurantAttendance,
    adultsCount: String(payload.adultsCount),
    companionNames: payload.companionNames.join(' | '),
    childrenCount: String(payload.childrenCount),
    childrenNames: payload.childrenNames.join(' | '),
    message: payload.message,
    timestamp: payload.timestamp,
    source: 'site-casamento',
  });

  const requestUrl = `${GOOGLE_SCRIPT_URL}?${params.toString()}`;
  const body = JSON.stringify({
    ...payload,
    source: 'site-casamento',
  });

  // Envia dados em dois formatos para compatibilidade com diferentes versões do Apps Script.
  await fetch(requestUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
    },
    body,
  });
};

const resetFormState = () => {
  if (!rsvpForm) return;

  rsvpForm.reset();
  syncGuestNameFields();
  rsvpForm.classList.remove('hidden');
  clearFormStatus();

  if (formFeedback) {
    formFeedback.classList.add('hidden');
  }

  if (feedbackMessage) {
    feedbackMessage.innerText = 'Obrigado! Sua confirmação foi enviada com sucesso.';
  }

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerText = 'Confirmar Presença';
  }
};

if (rsvpForm) {
  rsvpForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(rsvpForm);

    const name = String(formData.get('name') ?? '').trim();
    const ceremonyAttendance = String(formData.get('ceremonyAttendance') ?? '').trim() as AttendanceOption;
    const restaurantAttendance = String(formData.get('restaurantAttendance') ?? '').trim() as AttendanceOption;
    const adultsCount = parseBoundedCount(String(formData.get('adultsCount') ?? '1'), 1, 10, 1);
    const childrenCount = parseBoundedCount(String(formData.get('childrenCount') ?? '0'), 0, 10, 0);
    const companionNames = formData
      .getAll('adultCompanionNames')
      .map((value) => String(value).trim())
      .filter(Boolean);
    const childrenNames = formData
      .getAll('childNames')
      .map((value) => String(value).trim())
      .filter(Boolean);
    const message = String(formData.get('message') ?? '').trim();

    const validAttendanceOptions = ['sim', 'talvez', 'nao'];
    const expectedCompanionNames = Math.max(0, adultsCount - 1);

    if (
      !name ||
      !validAttendanceOptions.includes(ceremonyAttendance) ||
      !validAttendanceOptions.includes(restaurantAttendance)
    ) {
      updateFormStatus('Preencha seu nome e selecione a presença na cerimônia e no restaurante.', 'error');
      return;
    }

    if (companionNames.length !== expectedCompanionNames) {
      updateFormStatus('Preencha o nome de todos os acompanhantes adultos informados.', 'error');
      return;
    }

    if (childrenNames.length !== childrenCount) {
      updateFormStatus('Preencha o nome de todas as crianças informadas.', 'error');
      return;
    }

    const data = {
      name,
      ceremonyAttendance,
      restaurantAttendance,
      adultsCount,
      companionNames,
      childrenCount,
      childrenNames,
      message,
      timestamp: new Date().toISOString(),
    };

    console.log('Dados do RSVP recebidos:', data);

    clearFormStatus();
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = 'Enviando...';
    }

    updateFormStatus('Enviando confirmação...', 'pending');

    try {
      await sendToGoogleSheets(data);

      if (feedbackMessage) {
        const ceremonyText = ceremonyAttendance === 'sim' ? 'cerimônia confirmada' : 'cerimônia não confirmada';
        const restaurantText = restaurantAttendance === 'sim' ? 'restaurante confirmado' : 'restaurante não confirmado';
        const guestsText = adultsCount + childrenCount;

        feedbackMessage.innerText = `Perfeito! Recebemos sua resposta com ${ceremonyText}, ${restaurantText} e ${guestsText} convidados.`;
      }

      rsvpForm.classList.add('hidden');
      if (formFeedback) {
        formFeedback.classList.remove('hidden');
      }

      clearFormStatus();
    } catch (error) {
      console.error('Falha ao enviar para Google Sheets:', error);
      const isMissingUrl = !GOOGLE_SCRIPT_URL;
      const errorMessage = isMissingUrl
        ? 'Integração não configurada no deploy. Defina VITE_GOOGLE_SCRIPT_URL no Netlify e publique novamente.'
        : 'Não conseguimos enviar para a planilha. Verifique o deploy do Apps Script e se a URL está sem aspas.';

      updateFormStatus(errorMessage, 'error');

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Confirmar Presença';
      }
    }
  });

  rsvpForm.addEventListener('reset', () => {
    window.setTimeout(() => {
      syncGuestNameFields();
      clearFormStatus();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Confirmar Presença';
      }
    }, 0);
  });
}

if (newResponseBtn) {
  newResponseBtn.addEventListener('click', () => {
    resetFormState();
    rsvpForm?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

// --- Mobile Menu Toggle ---
const menuToggle = document.getElementById('menu-toggle');
const navList = document.getElementById('nav-list');
const navLinks = document.querySelectorAll('.nav-list a');

if (menuToggle && navList) {
  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    navList.classList.toggle('active');
  });

  // Fecha o menu ao clicar em um link
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      menuToggle.classList.remove('active');
      navList.classList.remove('active');
    });
  });
}

// --- Smooth Scroll and Navbar Style ---
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }
});

// --- Gifts Logic ---
const giftsGrid = document.getElementById('gifts-grid');
const sortSelect = document.getElementById('sort-gifts') as HTMLSelectElement | null;
const cartStatus = document.getElementById('gifts-cart-status');

const giftModal = document.getElementById('gift-modal');
const closeModalBtn = document.getElementById('close-modal');
const giftForm = document.getElementById('gift-form') as HTMLFormElement | null;
const modalGiftName = document.getElementById('modal-gift-name');
const modalGiftId = document.getElementById('modal-gift-id') as HTMLInputElement | null;
const giftFormStatus = document.getElementById('gift-form-status') as HTMLParagraphElement | null;
const submitGiftBtn = document.getElementById('submit-gift-btn') as HTMLButtonElement | null;

type Gift = {
  id: string;
  name: string;
  price: number;
  image: string;
};

type ReservedGift = {
  id: string;
  name: string;
  reserved_by: string;
};

const giftsData: Gift[] = [
  { id: 'g1', name: 'Kit potes de mantimentos', price: 120.0, image: 'https://images.unsplash.com/photo-1590502593747-42a996111153?q=80&w=600&auto=format&fit=crop' },
  { id: 'g2', name: 'Edredom casal', price: 350.0, image: 'https://images.unsplash.com/photo-1522771731478-44bf10511851?q=80&w=600&auto=format&fit=crop' },
  { id: 'g4', name: 'Jogo de lençóis de casal', price: 180.0, image: 'https://images.unsplash.com/photo-1618220179428-22790b46a0eb?q=80&w=600&auto=format&fit=crop' },
  { id: 'g5', name: 'Jogo de Copos de vidro', price: 90.0, image: 'https://images.unsplash.com/photo-1610444391696-6b2df15cb726?q=80&w=600&auto=format&fit=crop' },
  { id: 'g6', name: 'Jogo de pratos de vidro', price: 140.0, image: 'https://images.unsplash.com/photo-1603199506016-b9a594b59cb6?q=80&w=600&auto=format&fit=crop' },
  { id: 'g7', name: 'Faqueiro ou jogo de talheres', price: 250.0, image: 'https://images.unsplash.com/photo-1594248881335-b28ce3a00f2e?q=80&w=600&auto=format&fit=crop' },
  { id: 'g8', name: 'Chaleira elétrica', price: 160.0, image: 'https://images.unsplash.com/photo-1594488582236-419b4b0eec82?q=80&w=600&auto=format&fit=crop' },
  { id: 'g9', name: 'Aspirador de pó', price: 400.0, image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?q=80&w=600&auto=format&fit=crop' },
  { id: 'g10', name: 'Sanduicheira', price: 110.0, image: 'https://images.unsplash.com/photo-1536411964265-21d37e6f8510?q=80&w=600&auto=format&fit=crop' },
  { id: 'g11', name: 'Mixer ou processador', price: 220.0, image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?q=80&w=600&auto=format&fit=crop' },
  { id: 'g12', name: 'Travessas de Vidro/Cerâmica', price: 130.0, image: 'https://images.unsplash.com/photo-1581622558667-3419a8dc5f83?q=80&w=600&auto=format&fit=crop' },
];

let reservedGifts: ReservedGift[] = [];

const renderGifts = () => {
  if (!giftsGrid) return;

  giftsGrid.innerHTML = '';

  const sortValue = sortSelect?.value || 'az';
  const sortedGifts = [...giftsData].sort((a, b) => {
    if (sortValue === 'az') return a.name.localeCompare(b.name);
    if (sortValue === 'za') return b.name.localeCompare(a.name);
    if (sortValue === 'price-asc') return a.price - b.price;
    if (sortValue === 'price-desc') return b.price - a.price;
    return 0;
  });

  sortedGifts.forEach((gift) => {
    // Verifica se o presente está reservado procurando pelo ID
    const reservedItem = reservedGifts.find(r => r.id === gift.id);
    const isReserved = !!reservedItem;

    const card = document.createElement('div');
    card.className = `gift-list-item ${isReserved ? 'unavailable' : ''}`;

    // Se o presente está reservado, mostra quem reservou
    const reservedByText = isReserved && reservedItem?.reserved_by
      ? ` • Reservado por: ${reservedItem.reserved_by}`
      : '';

    card.innerHTML = `
      <span class="gift-list-name">${gift.name}${reservedByText}</span>
      <button class="btn-gift-list ${isReserved ? 'unavailable' : ''}" 
        data-id="${gift.id}" 
        data-name="${gift.name}"
        ${isReserved ? 'disabled' : ''}>
        ${isReserved ? 'Indisponível' : 'Presentear'}
      </button>
    `;

    giftsGrid.appendChild(card);
  });

  const giftButtons = giftsGrid.querySelectorAll('.btn-gift-list:not(:disabled)');
  giftButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLButtonElement;
      const giftId = target.getAttribute('data-id');
      const giftName = target.getAttribute('data-name');
      openGiftModal(giftId, giftName);
    });
  });
};

const fetchReservedGifts = async () => {
  if (!GOOGLE_SCRIPT_GIFTS_URL) {
    if (cartStatus) cartStatus.innerText = "Modo demonstração";
    const localReserved = localStorage.getItem('demo_reserved_gifts');
    if (localReserved) {
      reservedGifts = JSON.parse(localReserved);
    }
    renderGifts();
    return;
  }

  try {
    const urlWithCacheBuster = `${GOOGLE_SCRIPT_GIFTS_URL}?t=${new Date().getTime()}`;
    const response = await fetch(urlWithCacheBuster, { cache: 'no-store' });
    const data = await response.json();
    if (data && data.reserved) {
      // A API agora retorna um array de objetos: {id, name, reserved_by}
      reservedGifts = data.reserved;
    }
    if (cartStatus) {
      cartStatus.innerText = reservedGifts.length > 0
        ? `${reservedGifts.length} ${reservedGifts.length === 1 ? 'presente reservado' : 'presentes reservados'}`
        : "Nenhum presente reservado ainda";
    }
  } catch (err) {
    console.error("Erro ao buscar presentes:", err);
    if (cartStatus) cartStatus.innerText = "Pronto para receber reservas";
  } finally {
    renderGifts();
  }
};

const openGiftModal = (id: string | null, name: string | null) => {
  if (!id || !name || !giftModal || !modalGiftName || !modalGiftId) return;

  modalGiftId.value = id;
  modalGiftName.innerText = name;
  giftModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  if (giftFormStatus) {
    giftFormStatus.classList.add('hidden');
    giftFormStatus.innerText = '';
  }
};

const closeGiftModal = () => {
  if (!giftModal) return;
  giftModal.classList.add('hidden');
  document.body.style.overflow = '';
  giftForm?.reset();
};

if (closeModalBtn) {
  closeModalBtn.addEventListener('click', closeGiftModal);
}

if (sortSelect) {
  sortSelect.addEventListener('change', renderGifts);
}

if (giftForm) {
  giftForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(giftForm);
    const guestName = String(formData.get('guestName') ?? '').trim();
    const giftId = String(formData.get('giftId') ?? '');
    const giftName = modalGiftName?.innerText || '';

    if (!guestName || !giftId) return;

    if (submitGiftBtn) {
      submitGiftBtn.disabled = true;
      submitGiftBtn.innerText = 'Reservando...';
    }

    if (giftFormStatus) {
      giftFormStatus.classList.remove('hidden', 'error');
      giftFormStatus.classList.add('pending');
      giftFormStatus.innerText = 'Enviando sua reserva...';
    }

    try {
      if (GOOGLE_SCRIPT_GIFTS_URL) {
        const params = new URLSearchParams({
          action: 'reserveGift',
          giftId,
          giftName,
          guestName
        });

        const requestUrl = `${GOOGLE_SCRIPT_GIFTS_URL}?${params.toString()}`;

        await fetch(requestUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=UTF-8',
          },
          body: JSON.stringify({ action: 'reserveGift', giftId, giftName, guestName })
        });

        // Aguarda um pouco para o Google Sheets processar a inserção
        await new Promise(r => setTimeout(r, 1500));

        // Recarrega os presentes reservados do Google Sheets
        await fetchReservedGifts();
      } else {
        // Modo demo: adiciona o presente com os dados completos
        const demoReserved: ReservedGift = {
          id: giftId,
          name: giftName,
          reserved_by: guestName
        };
        reservedGifts.push(demoReserved);
        localStorage.setItem('demo_reserved_gifts', JSON.stringify(reservedGifts));
        await new Promise(r => setTimeout(r, 800));
        renderGifts();
      }

      if (cartStatus && reservedGifts.length > 0) {
        cartStatus.innerText = `${reservedGifts.length} ${reservedGifts.length === 1 ? 'presente reservado' : 'presentes reservados'}`;
      }

      closeGiftModal();
      alert(`Muito obrigado, ${guestName}! O presente "${giftName}" foi reservado.`);

    } catch (err) {
      console.error('Falha ao reservar presente:', err);
      if (giftFormStatus) {
        giftFormStatus.classList.remove('pending');
        giftFormStatus.classList.add('error');
        giftFormStatus.innerText = 'Erro ao conectar. Tente novamente.';
      }
    } finally {
      if (submitGiftBtn) {
        submitGiftBtn.disabled = false;
        submitGiftBtn.innerText = 'Confirmar Presente';
      }
    }
  });
}

fetchReservedGifts();
