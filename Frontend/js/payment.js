(() => {
    const statusElement = document.getElementById('paymentStatus');
    const sessionId = new URLSearchParams(window.location.search).get('session_id') || '';

    async function checkStatus() {
        if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
            statusElement.textContent = 'Não foi possível validar a referência do pagamento. Consulte a área do aluno ou fale com o suporte.';
            return;
        }

        const deadline = Date.now() + 60000;
        while (Date.now() < deadline) {
            try {
                const response = await fetch(
                    `${window.GROWFY_API_BASE_URL || '/api'}/payments/session/${encodeURIComponent(sessionId)}`,
                    { credentials: 'same-origin' }
                );
                if (response.status === 401) {
                    statusElement.textContent = 'Entre na sua conta para consultar o estado do pagamento.';
                    return;
                }
                if (!response.ok) throw new Error('Não foi possível consultar o pagamento.');
                const { status } = await response.json();
                if (status === 'paid') {
                    statusElement.textContent = 'Pagamento confirmado. Seu acesso ao curso já está disponível na área do aluno.';
                    return;
                }
                if (status === 'refunded') {
                    statusElement.textContent = 'Este pedido foi estornado. O acesso ao curso foi revogado.';
                    return;
                }
                if (status === 'partially_refunded') {
                    statusElement.textContent = 'Seu pagamento teve um estorno parcial. Consulte o suporte se precisar de ajuda.';
                    return;
                }
                if (status === 'failed' || status === 'cancelled') {
                    statusElement.textContent = 'O pagamento não foi concluído. Você pode tentar novamente pela página do curso.';
                    return;
                }
            } catch {
                statusElement.textContent = 'Ainda não foi possível confirmar o pagamento. Estamos verificando; atualize a página em instantes.';
            }
            await new Promise((resolve) => window.setTimeout(resolve, 2500));
        }
        statusElement.textContent = 'A confirmação pode levar alguns instantes. Consulte a área do aluno antes de tentar comprar novamente.';
    }

    document.addEventListener('DOMContentLoaded', checkStatus);
})();
