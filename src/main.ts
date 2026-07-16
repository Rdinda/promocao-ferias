import './style.css';

// Número de WhatsApp para onde o botão "Aproveitar" redireciona
const WHATSAPP_NUMBER = '5511940362416';

function buildWhatsAppLink(couponCode: string): string {
  const message = `Olá! Quero aproveitar meu cupom ${couponCode} da promoção de Ferias.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// Configurações das promoções
interface PromoConfig {
  id: string;
  title: string;
  badge: string;
  videoSrc: string;
  thumbSrc: string;
  couponCode: string;
  themeClass: string;
  discountText: string;
  ctaLink: string;
}

const promos: Record<'5off' | '10off', PromoConfig> = {
  '5off': {
    id: '5off',
    title: 'Desconto de Outono',
    badge: '5% OFF',
    videoSrc: '/5%25OFF.mp4',
    thumbSrc: '/5%25OFF.png',
    couponCode: 'FERIAS5',
    themeClass: 'theme-5off',
    discountText: 'Desconto de 5% ativado para toda a loja. Aproveite!',
    ctaLink: buildWhatsAppLink('FERIAS5')
  },
  '10off': {
    id: '10off',
    title: 'Desconto Premium',
    badge: '10% OFF',
    videoSrc: '/10%25OFF.mp4',
    thumbSrc: '/10%25OFF.png',
    couponCode: 'FERIAS10',
    themeClass: 'theme-10off',
    discountText: 'Desconto premium de 10% ativado. Oferta exclusiva!',
    ctaLink: buildWhatsAppLink('FERIAS10')
  }
};

// Lista de códigos de entrada permitidos (gerada a partir de LISTA.MD).
// Links no formato https://promo.novaimperiodooleo.com/5OFF/<codigo>.
// Esses códigos não têm período de validade — a checagem é apenas de pertencimento à lista.
const ALLOWED_5OFF_CODES: ReadonlySet<string> = new Set(
  Array.from({ length: 120 }, (_, i) => String(66824673746 + i))
);

// TODO: quando houver uma lista oficial de códigos para a campanha 10OFF,
// adicionar aqui e aplicar a mesma checagem usada em isEntryAuthorized.

// Extrai todos os códigos numéricos (6+ dígitos) presentes na URL atual
// (pathname, query string e hash), para suportar diferentes formas de
// redirecionamento vindas do link de origem.
function extractUrlCodes(): string[] {
  const haystack = `${window.location.pathname} ${window.location.search} ${window.location.hash}`;
  const matches = haystack.match(/\d{6,}/g);
  return matches ?? [];
}

// Verifica se o acesso à rota promocional veio de um link permitido
function isEntryAuthorized(route: '5off' | '10off'): boolean {
  if (route === '10off') return true; // sem lista de códigos definida ainda

  const codes = extractUrlCodes();
  return codes.some(code => ALLOWED_5OFF_CODES.has(code));
}

// Pega o número que está no final da URL atual (o código de rastreio do link de origem)
function getTrailingUrlNumber(): string | null {
  const match = window.location.href.match(/(\d{6,})\/?$/);
  return match ? match[1] : null;
}

const PROMO_WEBHOOK_URL = 'https://n8n.novaimperiodooleo.com/webhook/promo_ferias';

// Notifica o webhook do n8n com o número do final da URL ao clicar em "Aproveitar"
function notifyPromoWebhook(promoId: string): void {
  const code = getTrailingUrlNumber();
  if (!code) return;

  const body = new URLSearchParams({ code, promo: promoId });

  try {
    fetch(PROMO_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      body
    }).catch(() => {
      // Falha silenciosa - não deve impedir o clique do usuário
    });
  } catch {
    // Falha silenciosa - não deve impedir o clique do usuário
  }
}

// Detecta a rota baseada na URL (path, hash ou query param)
function getActiveRoute(): '5off' | '10off' | null {
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const promoParam = (params.get('promo') || params.get('p') || params.get('v') || '').toLowerCase();

  // 1. Verificar query param
  if (promoParam.includes('5')) return '5off';
  if (promoParam.includes('10')) return '10off';

  // 2. Verificar hash
  if (hash.includes('5')) return '5off';
  if (hash.includes('10')) return '10off';

  // 3. Verificar pathname
  if (path.includes('5')) return '5off';
  if (path.includes('10')) return '10off';

  return null;
}

// Copiar o cupom de desconto
async function copyCoupon(code: string, buttonEl: HTMLButtonElement, containerEl: HTMLElement) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(code);
    } else {
      // Fallback para navegadores mobile mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    // Feedback visual de sucesso
    containerEl.classList.add('copied');
    const originalHtml = buttonEl.innerHTML;
    buttonEl.innerHTML = 'COPIADO! ✓';
    buttonEl.classList.add('copied');

    setTimeout(() => {
      containerEl.classList.remove('copied');
      buttonEl.innerHTML = originalHtml;
      buttonEl.classList.remove('copied');
    }, 2000);

  } catch (err) {
    console.error('Falha ao copiar cupom:', err);
  }
}

// Renderiza a tela de seleção inicial (Home)
function renderHomeScreen(appContainer: HTMLElement) {
  appContainer.innerHTML = `
    <div class="screen-home">
      <header class="home-header">
        <h1 class="home-logo">FERIAS</h1>
        <p class="home-subtitle">Selecione seu desconto exclusivo de inverno</p>
      </header>

      <main class="home-cards-container">
        <!-- Card 5% OFF -->
        <div class="promo-selection-card" style="--card-accent: var(--accent-5off)" data-route="5off">
          <div class="card-thumbnail-wrapper">
            <img src="${promos['5off'].thumbSrc}" alt="5% OFF" class="card-thumbnail">
            <span class="card-badge">5% OFF</span>
          </div>
          <div class="card-info">
            <h2 class="card-title">Cupom 5OFF</h2>
            <button class="card-action-btn">ATIVAR CUPOM</button>
          </div>
        </div>

        <!-- Card 10% OFF -->
        <div class="promo-selection-card" style="--card-accent: var(--accent-10off)" data-route="10off">
          <div class="card-thumbnail-wrapper">
            <img src="${promos['10off'].thumbSrc}" alt="10% OFF" class="card-thumbnail">
            <span class="card-badge">10% OFF</span>
          </div>
          <div class="card-info">
            <h2 class="card-title">Cupom 10OFF</h2>
            <button class="card-action-btn">ATIVAR CUPOM</button>
          </div>
        </div>
      </main>

      <footer class="home-footer">
        <p>© 2026 Ferias. Todos os direitos reservados.</p>
      </footer>
    </div>
  `;

  // Adiciona listeners para navegação
  const cards = appContainer.querySelectorAll('.promo-selection-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const route = card.getAttribute('data-route');
      if (route) {
        window.location.hash = `#/${route}`;
      }
    });
  });
}

// Renderiza a tela do vídeo promocional
function renderVideoScreen(appContainer: HTMLElement, config: PromoConfig) {
  appContainer.innerHTML = `
    <div class="screen-video ${config.themeClass}">
      <!-- Botão Mudo/Som -->
      <button class="btn-audio-toggle muted" id="btn-audio" aria-label="Ativar som">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sound-icon"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
      </button>

      <!-- Player de Vídeo em Tela Cheia -->
      <div class="video-container">
        <video 
          id="promo-video" 
          class="video-player" 
          src="${config.videoSrc}" 
          autoplay 
          muted 
          playsinline 
          loop
        ></video>
      </div>

      <!-- Overlay de Gradiente -->
      <div class="video-overlay-gradient"></div>

      <!-- Card de Cupom e CTA -->
      <div class="discount-card-overlay">
        <div class="glass-card">
          <div class="discount-header">
            <div class="discount-title-area">
              <span class="discount-label">Oferta Ativada</span>
              <h2 class="discount-main-title">${config.badge} de Desconto</h2>
            </div>
          </div>

          <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.4;">
            ${config.discountText} Utilize o cupom abaixo.
          </p>

          <!-- Caixa do Cupom -->
          <div class="coupon-box" id="coupon-container">
            <span class="coupon-code">${config.couponCode}</span>
            <button class="btn-copy" id="btn-copy">COPIAR</button>
          </div>
        </div>

        <!-- Botão CTA -->
        <a href="${config.ctaLink}" target="_blank" class="btn-cta" id="btn-cta">
          APROVEITAR AGORA
        </a>
      </div>
    </div>
  `;

  const video = document.getElementById('promo-video') as HTMLVideoElement;
  const audioBtn = document.getElementById('btn-audio') as HTMLButtonElement;
  const copyBtn = document.getElementById('btn-copy') as HTMLButtonElement;
  const couponContainer = document.getElementById('coupon-container') as HTMLElement;
  const ctaBtn = document.getElementById('btn-cta') as HTMLAnchorElement;

  // Lógica de Mudo / Som
  const toggleMute = (forceSound = false) => {
    if (!video) return;

    if (forceSound) {
      video.muted = false;
      audioBtn.classList.remove('muted');
    } else {
      video.muted = !video.muted;
      if (video.muted) {
        audioBtn.classList.add('muted');
      } else {
        audioBtn.classList.remove('muted');
      }
    }
  };

  // Clique no botão de áudio flutuante
  if (audioBtn) {
    audioBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Evita ativar outros cliques
      toggleMute();
      // Tentativa de dar play caso o autoplay tenha sido bloqueado
      video.play().catch(err => console.log('Erro de reprodução:', err));
    });
  }

  // Botão Copiar Cupom
  if (copyBtn && couponContainer) {
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyCoupon(config.couponCode, copyBtn, couponContainer);
    });
  }

  // Botão "Aproveitar Agora": notifica o webhook antes de seguir para o WhatsApp
  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => {
      notifyPromoWebhook(config.id);
    });
  }
}

// Roteador Central
function routeApp() {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  // Limpar classes de tema anteriores do body/app
  appContainer.className = '';
  document.body.className = '';

  const activePromo = getActiveRoute();

  if (activePromo && promos[activePromo] && isEntryAuthorized(activePromo)) {
    renderVideoScreen(appContainer, promos[activePromo]);
  } else {
    renderHomeScreen(appContainer);
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  routeApp();

  // Escutar mudanças de hash
  window.addEventListener('hashchange', routeApp);

  // Escutar mudanças no histórico (ex: botão voltar do navegador)
  window.addEventListener('popstate', routeApp);
});

// Executar imediatamente se o DOM já estiver pronto
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  routeApp();
  window.addEventListener('hashchange', routeApp);
  window.addEventListener('popstate', routeApp);
}
