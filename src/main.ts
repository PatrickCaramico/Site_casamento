import './style.css'

const normalizeEnvUrl = (value: unknown) => {
    const raw = String(value ?? '').trim();
    return raw.replace(/^['\"]|['\"]$/g, '').trim();
};

const GOOGLE_SCRIPT_URL = normalizeEnvUrl(import.meta.env.VITE_GOOGLE_SCRIPT_URL);

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
