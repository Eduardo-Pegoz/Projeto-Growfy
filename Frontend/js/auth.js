(() => {
    const apiBaseUrl = (window.GROWFY_API_BASE_URL || '/api').replace(/\/+$/, '');

    async function request(path, options = {}) {
        const response = await fetch(`${apiBaseUrl}${path}`, {
            ...options,
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', ...options.headers }
        });
        const data = response.status === 204 ? {} : await response.json();
        return { response, data };
    }

    function safeNextPath() {
        const next = new URLSearchParams(window.location.search).get('next');
        if (next === 'aluno.html') return next;
        if (next && /^curso\.html\?course=(guia-financeiro|investimentos-iniciantes|economia-inteligente|financas-imobiliarias|mindset-financeiro|investimentos-internacionais)$/.test(next)) {
            return next;
        }
        return 'aluno.html';
    }

    function bindForm(formId, endpoint, fields) {
        const form = document.getElementById(formId);
        if (!form) return;
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const message = document.getElementById('formMessage');
            const submit = form.querySelector('button[type="submit"]');
            message.textContent = '';
            submit.disabled = true;
            try {
                const formData = new FormData(form);
                const payload = Object.fromEntries(fields.map((field) => [field, formData.get(field)]));
                const { response, data } = await request(endpoint, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a solicitação.');
                window.location.assign(safeNextPath());
            } catch (error) {
                message.textContent = error.message || 'Não foi possível conectar ao serviço. Tente novamente.';
            } finally {
                submit.disabled = false;
            }
        });
    }

    function bindPasswordReset() {
        const toggle = document.getElementById('showPasswordReset');
        const form = document.getElementById('passwordResetRequestForm');
        if (!toggle || !form) return;
        toggle.addEventListener('click', () => {
            form.classList.toggle('hidden');
            if (!form.classList.contains('hidden')) document.getElementById('resetEmail').focus();
        });
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const message = document.getElementById('resetMessage');
            const submit = form.querySelector('button[type="submit"]');
            message.textContent = '';
            submit.disabled = true;
            try {
                const email = new FormData(form).get('email');
                const { response, data } = await request('/auth/password-reset/request', {
                    method: 'POST',
                    body: JSON.stringify({ email })
                });
                if (!response.ok) throw new Error(data.error || 'Não foi possível solicitar a redefinição.');
                message.textContent = data.message;
            } catch (error) {
                message.textContent = error.message || 'Não foi possível conectar ao serviço. Tente novamente.';
            } finally {
                submit.disabled = false;
            }
        });
    }

    function bindPasswordResetCompletion() {
        const form = document.getElementById('passwordResetCompleteForm');
        if (!form) return;
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const message = document.getElementById('formMessage');
            const submit = form.querySelector('button[type="submit"]');
            message.textContent = '';
            submit.disabled = true;
            try {
                const password = new FormData(form).get('password');
                const token = new URLSearchParams(window.location.search).get('token') || '';
                const { response, data } = await request('/auth/password-reset/complete', {
                    method: 'POST',
                    body: JSON.stringify({ token, password })
                });
                if (!response.ok) throw new Error(data.error || 'Não foi possível redefinir a senha.');
                message.textContent = data.message;
                form.reset();
            } catch (error) {
                message.textContent = error.message || 'Não foi possível conectar ao serviço. Tente novamente.';
            } finally {
                submit.disabled = false;
            }
        });
    }

    function bindStudentAndCheckoutLinks() {
        document.querySelectorAll('.student-area-btn').forEach((link) => {
            link.addEventListener('click', async (event) => {
                event.preventDefault();
                try {
                    const { response } = await request('/auth/session');
                    window.location.assign(response.ok ? 'aluno.html' : 'login.html');
                } catch {
                    window.location.assign('login.html');
                }
            });
        });

        const purchaseLink = document.getElementById('purchaseLink');
        if (!purchaseLink) return;
        const courseId = new URLSearchParams(window.location.search).get('course');
        const idempotencyStorageKey = `growfy_checkout_key:${courseId}`;
        if (new URLSearchParams(window.location.search).get('checkout') === 'cancelled') {
            sessionStorage.removeItem(idempotencyStorageKey);
        }
        purchaseLink.addEventListener('click', async (event) => {
            event.preventDefault();
            const message = document.getElementById('checkoutMessage');
            message.textContent = '';
            purchaseLink.setAttribute('aria-disabled', 'true');
            try {
                let idempotencyKey = sessionStorage.getItem(idempotencyStorageKey);
                if (!idempotencyKey) {
                    idempotencyKey = crypto.randomUUID();
                    sessionStorage.setItem(idempotencyStorageKey, idempotencyKey);
                }
                const { response, data } = await request('/checkout', {
                    method: 'POST',
                    headers: { 'Idempotency-Key': idempotencyKey },
                    body: JSON.stringify({ courseId })
                });
                if (response.status === 401) {
                    const next = `curso.html?course=${encodeURIComponent(courseId || '')}`;
                    window.location.assign(`login.html?next=${encodeURIComponent(next)}`);
                    return;
                }
                if (!response.ok) throw new Error(data.error || 'Não foi possível iniciar a compra.');
                if (!/^https:\/\/checkout\.stripe\.com\//.test(data.checkoutUrl)) {
                    throw new Error('O servidor retornou um endereço de pagamento inválido.');
                }
                window.location.assign(data.checkoutUrl);
            } catch (error) {
                message.textContent = error.message || 'Não foi possível conectar ao serviço. Tente novamente.';
            } finally {
                purchaseLink.removeAttribute('aria-disabled');
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        bindForm('loginForm', '/auth/login', ['email', 'password']);
        bindForm('registerForm', '/auth/register', ['name', 'email', 'password']);
        bindPasswordReset();
        bindPasswordResetCompletion();
        bindStudentAndCheckoutLinks();
    });
})();