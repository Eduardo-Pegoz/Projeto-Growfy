// main.js - JavaScript atualizado com segurança e funcionalidades

// 🔒 FUNÇÕES DE SEGURANÇA
function sanitizeHTML(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function validateCourseId(courseId) {
    const validCourses = ['guia-financeiro', 'investimentos-iniciantes', 'economia-inteligente', 'financas-imobiliarias', 'mindset-financeiro', 'investimentos-internacionais'];
    return validCourses.includes(courseId);
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 🔒 FUNÇÕES PARA FORMULÁRIO DE CONTATO
function openContactModal() {
    const modal = document.getElementById('contactModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeContactModal() {
    const modal = document.getElementById('contactModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        const form = document.getElementById('contactForm');
        if (form) form.reset();
    }
}

function validateContactForm(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Validação adicional no frontend
    const name = formData.get('name');
    const email = formData.get('email');
    const message = formData.get('message');
    
    if (!validateEmail(email)) {
        alert('Por favor, insira um email válido.');
        return false;
    }
    
    if (name.length < 2 || name.length > 50) {
        alert('Nome deve ter entre 2 e 50 caracteres.');
        return false;
    }
    
    if (message.length < 10 || message.length > 500) {
        alert('Mensagem deve ter entre 10 e 500 caracteres.');
        return false;
    }
    
    // Simular envio (em produção, enviar para backend)
    console.log('Dados do formulário:', { name, email, message });
    alert('Mensagem enviada com sucesso! Entraremos em contato em breve.');
    closeContactModal();
    return false;
}

// Course data structure with expanded content
const courseData = {
    'guia-financeiro': {
        title: 'Guia Financeiro 2025',
        icon: 'fas fa-wallet',
        price: '47,90',
        oldPrice: '72,90',
        description: 'Como organizar sua vida financeira e começar a investir com pouco. Um guia completo para transformar sua relação com o dinheiro e alcançar a liberdade financeira.',
        features: [
            'Mais de 30 páginas de conteúdo',
            'Planilhas exclusivas',
            'Acesso imediato',
            'Atualizações gratuitas',
            'Suporte especializado',
            'Certificado de conclusão'
        ],
        details: [
            {
                icon: 'fas fa-chart-line',
                title: 'Controle Financeiro',
                description: 'Aprenda a organizar suas finanças, controlar gastos e criar um orçamento que realmente funciona.'
            },
            {
                icon: 'fas fa-seedling',
                title: 'Investimentos Iniciais',
                description: 'Comece a investir mesmo com pouco capital e entenda os primeiros passos no mercado financeiro.'
            },
            {
                icon: 'fas fa-shield-alt',
                title: 'Proteção Financeira',
                description: 'Aprenda a criar uma reserva de emergência e proteger seu patrimônio.'
            }
        ],
        modules: [
            {
                title: 'Módulo 1: Fundamentos Financeiros',
                lessons: [
                    'Introdução ao Guia Financeiro 2025',
                    'Por que educação financeira é essencial',
                    'A psicologia por trás do consumo'
                ]
            },
            {
                title: 'Módulo 2: Controle de Gastos',
                lessons: [
                    'Métodos de controle financeiro',
                    'Criando um orçamento mensal eficaz',
                    'Identificando gastos desnecessários',
                    'Técnicas para reduzir contas básicas',
                    'Como negociar dívidas e parcelamentos',
                    'Ferramentas digitais para controle'
                ]
            },
            {
                title: 'Módulo 3: Estratégias de Economia',
                lessons: [
                    'Mentalidade de economia inteligente',
                    'Técnicas para reduzir contas básicas',
                    'Como economizar no dia a dia',
                    'Economia colaborativa e compartilhada',
                    'Aproveitando promoções inteligentes',
                    'Criando um fundo de emergência'
                ]
            },
            {
                title: 'Módulo 4: Primeiros Investimentos',
                lessons: [
                    'Conceitos básicos de investimento',
                    'Onde investir com pouco dinheiro',
                    'Como escolher sua primeira aplicação',
                    'Diferença entre renda fixa e variável',
                    'Entendendo risco e retorno',
                    'Montando sua primeira carteira'
                ]
            },
            {
                title: 'Módulo 5: Planejamento de Longo Prazo',
                lessons: [
                    'Como planejar sua aposentadoria',
                    'Investimentos para objetivos específicos',
                    'Proteção patrimonial e seguros',
                    'Estratégias de acumulação de capital',
                    'Revisão e ajuste do planejamento',
                    'Mantendo a disciplina financeira'
                ]
            }
        ],
        testimonials: [
            {
                text: "O Guia Financeiro mudou completamente minha relação com o dinheiro. Em 3 meses já consegui criar minha reserva de emergência!",
                author: 'Mariana Silva',
                avatar: 'M'
            },
            {
                text: "Finalmente entendi como organizar minhas finanças. As planilhas e o passo a passo foram essenciais!",
                author: 'Ricardo Oliveira',
                avatar: 'R'
            },
            {
                text: "Consegui economizar 20% do meu salário sem sentir falta. A metodologia é fantástica!",
                author: 'Carolina Santos',
                avatar: 'C'
            }
        ],
        faq: [
            {
                question: 'Por quanto tempo terei acesso ao curso?',
                answer: 'Você terá acesso <strong>vitalício</strong> ao curso, incluindo todas as atualizações futuras.'
            },
            {
                question: 'Preciso ter conhecimento prévio em finanças?',
                answer: '<strong>Não, absolutamente!</strong> O curso foi desenvolvido especificamente para iniciantes.'
            },
            {
                question: 'Quanto tempo leva para ver resultados?',
                answer: 'Os primeiros resultados podem ser percebidos em <strong>poucas semanas</strong>.'
            },
            {
                question: 'O curso oferece certificado?',
                answer: 'Sim! Ao concluir todos os módulos, você receberá um <strong>certificado digital de conclusão</strong>.'
            },
            {
                question: 'Posso acessar pelo celular?',
                answer: '<strong>Completamente responsivo!</strong> O curso funciona perfeitamente em qualquer dispositivo.'
            }
        ],
        purchaseLink: '/processar-pagamento?curso=guia-financeiro'
    },
    'investimentos-iniciantes': {
        title: 'Investimentos para Iniciantes',
        icon: 'fas fa-chart-pie',
        price: '67,00',
        oldPrice: '127,00',
        description: 'Aprenda os fundamentos para começar a investir com segurança e construir seu patrimônio de forma consistente.',
        features: [
            '8 módulos completos',
            'Estratégias comprovadas',
            'Suporte especializado',
            'Certificado de conclusão',
            'Comunidade exclusiva',
            'Material complementar'
        ],
        details: [
            {
                icon: 'fas fa-shield-alt',
                title: 'Segurança',
                description: 'Aprenda a investir com reduzido risco e máxima proteção do seu capital.'
            },
            {
                icon: 'fas fa-rocket',
                title: 'Crescimento',
                description: 'Estratégias para fazer seu dinheiro trabalhar para você de forma inteligente.'
            },
            {
                icon: 'fas fa-graduation-cap',
                title: 'Aprendizado Progressivo',
                description: 'Do básico ao avançado em uma jornada estruturada e sem complicações.'
            }
        ],
        modules: [
            {
                title: 'Módulo 1: Fundamentos dos Investimentos',
                lessons: [
                    'O que são investimentos e como funcionam',
                    'Renda Fixa vs Renda Variável',
                    'Como funciona a bolsa de valores',
                    'Conceito de juros compostos',
                    'Entendendo a inflação'
                ]
            },
            {
                title: 'Módulo 2: Renda Fixa - O Investimento Seguro',
                lessons: [
                    'Tesouro Direto: completo e detalhado',
                    'CDB: Certificado de Depósito Bancário',
                    'LCI e LCA: Isentos de Imposto de Renda',
                    'Debêntures e CRIs',
                    'Como analisar o risco da renda fixa',
                    'Estratégias de alocação em renda fixa'
                ]
            },
            {
                title: 'Módulo 3: Renda Variável - Potencial de Alto Retorno',
                lessons: [
                    'Ações: como funcionam e como escolher',
                    'Fundos Imobiliários: renda passiva mensal',
                    'ETFs: Fundos de Índice',
                    'Análise fundamentalista básica',
                    'Análise técnica introdutória',
                    'Como diversificar na renda variável'
                ]
            },
            {
                title: 'Módulo 4: Fundos de Investimento',
                lessons: [
                    'Como funcionam os fundos de investimento',
                    'Tipos de fundos: RF, RV, multimercado',
                    'Taxas de administração e performance',
                    'Como escolher um bom fundo',
                    'Vantagens e desvantagens',
                    'Comparativo entre diferentes fundos'
                ]
            },
            {
                title: 'Módulo 5: Estratégias Práticas',
                lessons: [
                    'Como montar sua primeira carteira',
                    'Estratégia Buy and Hold',
                    'Diversificação inteligente',
                    'Quando comprar e quando vender',
                    'Controle emocional nos investimentos',
                    'Revisão e rebalanceamento da carteira'
                ]
            }
        ],
        testimonials: [
            {
                text: "Finalmente perdi o medo de investir! O curso explica tudo de forma simples e prática.",
                author: 'João Pedro',
                avatar: 'J'
            },
            {
                text: "Em 6 meses já consegui um retorno de 18% aplicando as estratégias do curso. Recomendo!",
                author: 'Ana Claudia',
                avatar: 'A'
            },
            {
                text: "O suporte é excelente e as estratégias realmente funcionam. Já recomendei para amigos!",
                author: 'Carlos Eduardo',
                avatar: 'C'
            }
        ],
        faq: [
            {
                question: 'Preciso de muito dinheiro para começar?',
                answer: '<strong>Não!</strong> Você pode começar com valores a partir de <strong>R$ 50,00</strong>.'
            },
            {
                question: 'O curso é atualizado com as mudanças do mercado?',
                answer: 'Sim, mantemos o conteúdo <strong>sempre atualizado</strong> com as últimas mudanças.'
            },
            {
                question: 'Vou aprender a analisar ações?',
                answer: 'Sim! Ensinamos tanto <strong>análise fundamentalista</strong> quanto <strong>análise técnica</strong>.'
            }
        ],
        purchaseLink: '/processar-pagamento?curso=investimentos-iniciantes'
    },
    'economia-inteligente': {
        title: 'Economia Inteligente',
        icon: 'fas fa-piggy-bank',
        price: '37,00',
        oldPrice: '77,00',
        description: 'Descubra como economizar sem sacrificar sua qualidade de vida e maximize seu poder de compra.',
        features: [
            'Técnicas práticas',
            'Planilhas de controle',
            'Bônus exclusivos',
            'Comunidade de apoio',
            'Desafios semanais',
            'Consultoria em grupo'
        ],
        details: [
            {
                icon: 'fas fa-lightbulb',
                title: 'Economia Consciente',
                description: 'Aprenda a identificar e eliminar gastos desnecessários sem abrir mão do que é importante.'
            },
            {
                icon: 'fas fa-chart-bar',
                title: 'Otimização',
                description: 'Técnicas para maximizar cada real do seu orçamento e aumentar seu poder de compra.'
            },
            {
                icon: 'fas fa-hands-helping',
                title: 'Sustentabilidade Financeira',
                description: 'Hábitos que garantem economia a longo prazo e estabilidade financeira.'
            }
        ],
        modules: [
            {
                title: 'Módulo 1: Mentalidade de Economia Inteligente',
                lessons: [
                    'Por que economizar é importante para sua liberdade',
                    'A psicologia por trás do consumo impulsivo',
                    'Como criar hábitos financeiros saudáveis',
                    'A diferença entre ser mão-de-vaca e econômico inteligente'
                ]
            },
            {
                title: 'Módulo 2: Redução de Custos Fixos',
                lessons: [
                    'Como negociar suas contas básicas (luz, água, gás)',
                    'Redução de custos com telefonia e internet',
                    'Estratégias para economizar no supermercado',
                    'Plano de saúde: como pagar menos',
                    'Transporte: alternativas econômicas',
                    'Educação: cursos gratuitos de qualidade'
                ]
            },
            {
                title: 'Módulo 3: Economia no Dia a Dia',
                lessons: [
                    'Técnicas de compra no supermercado',
                    'Como aproveitar promoções inteligentes',
                    'Compras coletivas e cooperativas',
                    'Economia doméstica: dicas práticas',
                    'Alimentação econômica e saudável',
                    'Lazer gratuito ou de baixo custo'
                ]
            },
            {
                title: 'Módulo 4: Economia Digital',
                lessons: [
                    'Como reduzir assinaturas desnecessárias',
                    'Aplicativos que ajudam a economizar',
                    'Cashback e programas de fidelidade',
                    'Compras online com melhor custo-benefício',
                    'Economia compartilhada: Uber, Airbnb, etc',
                    'Educação financeira através de apps'
                ]
            },
            {
                title: 'Módulo 5: Sustentabilidade Financeira',
                lessons: [
                    'Como manter a economia a longo prazo',
                    'Revisão periódica dos gastos',
                    'Ajustando o orçamento conforme mudanças de vida',
                    'Envolvendo a família no processo de economia',
                    'Comemorando conquistas financeiras',
                    'Plano de ação para os próximos 12 meses'
                ]
            }
        ],
        testimonials: [
            {
                text: "Consegui economizar R$ 300 por mês sem abrir mão do que gosto! As técnicas são fantásticas.",
                author: 'Carla Mendes',
                avatar: 'C'
            },
            {
                text: "Antes vivia no vermelho. Agora sobra dinheiro no final do mês! Método transformador.",
                author: 'Roberto Almeida',
                avatar: 'R'
            },
            {
                text: "As planilhas de controle mudaram minha vida financeira. Super recomendo!",
                author: 'Fernanda Lima',
                avatar: 'F'
            }
        ],
        faq: [
            {
                question: 'Preciso ter uma renda alta para economizar?',
                answer: '<strong>Não!</strong> As técnicas funcionam para <strong>qualquer nível de renda</strong>.'
            },
            {
                question: 'Vou precisar abrir mão do meu lazer?',
                answer: '<strong>Não!</strong> Ensinamos a economizar de forma inteligente, mantendo sua qualidade de vida.'
            },
            {
                question: 'Quanto posso esperar economizar?',
                answer: 'A maioria dos alunos economiza entre <strong>15% e 30%</strong> de seus gastos mensais.'
            }
        ],
        purchaseLink: '/processar-pagamento?curso=economia-inteligente'
    },
    'financas-imobiliarias': {
        title: 'Finanças Imobiliárias',
        icon: 'fas fa-home',
        price: '87,00',
        oldPrice: '147,00',
        description: 'Aprenda a investir no mercado imobiliário mesmo com pouco capital e construa patrimônio com imóveis.',
        features: [
            'Análise de mercado',
            'Estratégias de investimento',
            'Case studies reais',
            'Planilhas de cálculo',
            'Mentoria em grupo',
            'Network com investidores'
        ],
        details: [
            {
                icon: 'fas fa-building',
                title: 'Mercado Imobiliário',
                description: 'Entenda as dinâmicas do mercado e identifique as melhores oportunidades.'
            },
            {
                icon: 'fas fa-calculator',
                title: 'Análise de Investimentos',
                description: 'Aprenda a calcular ROI, fluxo de caixa e valorização de imóveis.'
            },
            {
                icon: 'fas fa-hand-holding-usd',
                title: 'Estratégias de Entrada',
                description: 'Como começar no mercado imobiliário mesmo com pouco capital inicial.'
            }
        ],
        modules: [
            {
                title: 'Módulo 1: Fundamentos do Mercado Imobiliário',
                lessons: [
                    'Como funciona o mercado imobiliário brasileiro',
                    'Ciclos do mercado: expansão e retração',
                    'Fatores que influenciam a valorização',
                    'Entendendo zonas de expansão urbana',
                    'Demografia e tendências do mercado',
                    'Legislação imobiliária básica'
                ]
            },
            {
                title: 'Módulo 2: Análise de Investimentos',
                lessons: [
                    'Cálculo de ROI (Retorno sobre Investimento)',
                    'Fluxo de caixa e projeções',
                    'Taxa de capitalização (Cap Rate)',
                    'Valorização histórica e potencial',
                    'Análise de due diligence',
                    'Simulações de cenários'
                ]
            },
            {
                title: 'Módulo 3: Estratégias de Investimento',
                lessons: [
                    'Compra para aluguel: análise detalhada',
                    'Compra para revenda (flipping)',
                    'Loteamento e incorporação',
                    'Fundos Imobiliários (FIIs)',
                    'Consórcio imobiliário',
                    'Parcerias e joint ventures'
                ]
            },
            {
                title: 'Módulo 4: Financiamento e Negociação',
                lessons: [
                    'Tipos de financiamento habitacional',
                    'Como negociar com bancos',
                    'Substituição de financiamento',
                    'Portabilidade de crédito',
                    'Negociação com proprietários',
                    'Estratégias de leilão'
                ]
            },
            {
                title: 'Módulo 5: Gestão de Patrimônio',
                lessons: [
                    'Administração de imóveis',
                    'Relacionamento com inquilinos',
                    'Manutenção e conservação',
                    'Tributação imobiliária',
                    'Sucessão familiar',
                    'Diversificação da carteira'
                ]
            }
        ],
        testimonials: [
            {
                text: "Comprei meu primeiro imóvel para investimento e já estou com ROI positivo em 6 meses!",
                author: 'Fernando Costa',
                avatar: 'F'
            },
            {
                text: "As estratégias de análise me salvaram de fazer um mau negócio. Curso essencial!",
                author: 'Patricia Santos',
                avatar: 'P'
            },
            {
                text: "A comunidade de investidores que o curso proporciona é invaluable.",
                author: 'Ricardo Mendes',
                avatar: 'R'
            }
        ],
        faq: [
            {
                question: 'Preciso de muito dinheiro para começar?',
                answer: '<strong>Não!</strong> Ensinamos estratégias para começar com pouco capital.'
            },
            {
                question: 'É seguro investir em imóveis?',
                answer: 'O investimento imobiliário é considerado um dos <strong>mais seguros</strong> a longo prazo.'
            }
        ],
        purchaseLink: '/processar-pagamento?curso=financas-imobiliarias'
    },
    'mindset-financeiro': {
        title: 'Mindset Financeiro',
        icon: 'fas fa-brain',
        price: '57,00',
        oldPrice: '97,00',
        description: 'Transforme sua mentalidade para atrair prosperidade e abundância através de técnicas comprovadas.',
        features: [
            'Técnicas de reprogramação',
            'Exercícios práticos',
            'Meditações guiadas',
            'Roteiros de mentalização',
            'Acompanhamento em grupo',
            'Material de apoio exclusivo'
        ],
        details: [
            {
                icon: 'fas fa-seedling',
                title: 'Mentalidade de Abundância',
                description: 'Aprenda a substituir crenças limitantes por uma mentalidade de prosperidade.'
            },
            {
                icon: 'fas fa-balance-scale',
                title: 'Equilíbrio Financeiro',
                description: 'Técnicas para alinhar seus pensamentos, sentimentos e ações com a prosperidade.'
            },
            {
                icon: 'fas fa-rocket',
                title: 'Metas e Objetivos',
                description: 'Como definir e alcançar metas financeiras através da mentalidade correta.'
            }
        ],
        modules: [
            {
                title: 'Módulo 1: Fundamentos do Mindset Financeiro',
                lessons: [
                    'O que é mindset e como ele influencia seus resultados',
                    'Identificando crenças limitantes sobre dinheiro',
                    'Como sua infância moldou sua relação com o dinheiro',
                    'Os arquétipos financeiros e seus comportamentos',
                    'Crenças de escassez vs. crenças de abundância',
                    'Exercício: Mapeamento das crenças financeiras'
                ]
            },
            {
                title: 'Módulo 2: Reprogramação Mental',
                lessons: [
                    'Técnicas de PNL aplicadas às finanças',
                    'Afirmações positivas para prosperidade',
                    'Visualização criativa de objetivos financeiros',
                    'Ancoragem de estados de abundância',
                    'Reprogramação do subconsciente financeiro',
                    'Exercício: Roteiro de reprogramação diária'
                ]
            },
            {
                title: 'Módulo 3: Superando Bloqueios',
                lessons: [
                    'Identificando e superando o medo do sucesso',
                    'Trabalhando a síndrome do impostor',
                    'Como lidar com a autossabotagem financeira',
                    'Crenças limitantes sobre merecimento',
                    'Padrões familiares e financeiros',
                    'Exercício: Quebra de padrões limitantes'
                ]
            },
            {
                title: 'Módulo 4: Hábitos dos Prósperos',
                lessons: [
                    'Rotinas matinais para prosperidade',
                    'Hábitos financeiros dos milionários',
                    'Mentalidade de crescimento financeiro',
                    'Gratidão e prosperidade',
                    'Generosidade como ferramenta de abundância',
                    'Exercício: Implementação de novos hábitos'
                ]
            },
            {
                title: 'Módulo 5: Manutenção do Mindset',
                lessons: [
                    'Como manter a mentalidade em tempos difíceis',
                    'Ferramentas para resiliência financeira',
                    'Comunidade e apoio mútuo',
                    'Revisão e ajuste das crenças',
                    'Plano de desenvolvimento contínuo',
                    'Exercício: Plano de manutenção anual'
                ]
            }
        ],
        testimonials: [
            {
                text: "Mudei minha mentalidade e em 3 meses consegui um aumento de 40% na minha renda!",
                author: 'Patricia Lima',
                avatar: 'P'
            },
            {
                text: "Finalmente entendi por que repetia padrões financeiros. Agora estou no controle!",
                author: 'Marcos Oliveira',
                avatar: 'M'
            },
            {
                text: "As meditações guiadas transformaram minha relação com o dinheiro.",
                author: 'Ana Beatriz',
                avatar: 'A'
            }
        ],
        faq: [
            {
                question: 'Isso realmente funciona?',
                answer: '<strong>Sim!</strong> A mentalidade é o fator mais importante para o sucesso financeiro.'
            },
            {
                question: 'Quanto tempo leva para ver resultados?',
                answer: 'Alguns alunos relatam mudanças perceptíveis em <strong>2 a 4 semanas</strong>.'
            }
        ],
        purchaseLink: '/processar-pagamento?curso=mindset-financeiro'
    },
    'investimentos-internacionais': {
        title: 'Investimentos Internacionais',
        icon: 'fas fa-globe',
        price: '77,00',
        oldPrice: '137,00',
        description: 'Diversifique seus investimentos além das fronteiras do Brasil e proteja seu patrimônio.',
        features: [
            'Mercado global',
            'Estratégias de proteção',
            'Guia passo a passo',
            'Análise de corretoras',
            'Aspectos legais e tributários',
            'Carteiras recomendadas'
        ],
        details: [
            {
                icon: 'fas fa-globe-americas',
                title: 'Diversificação Global',
                description: 'Aprenda a diversificar seus investimentos em diferentes países e moedas.'
            },
            {
                icon: 'fas fa-shield-alt',
                title: 'Proteção Cambial',
                description: 'Estratégias para proteger seu patrimônio da variação do câmbio e da inflação.'
            },
            {
                icon: 'fas fa-chart-network',
                title: 'Mercados Globais',
                description: 'Conheça as principais bolsas e oportunidades de investimento internacional.'
            }
        ],
        modules: [
            {
                title: 'Módulo 1: Fundamentos dos Investimentos Internacionais',
                lessons: [
                    'Por que investir internacionalmente?',
                    'Vantagens e riscos da diversificação global',
                    'Entendendo o câmbio e suas flutuações',
                    'Correlação entre mercados internacionais',
                    'Risco país e análise geopolítica',
                    'Case: Crises econômicas e proteção internacional'
                ]
            },
            {
                title: 'Módulo 2: Estratégias e Plataformas',
                lessons: [
                    'Melhores corretoras internacionais',
                    'Como abrir conta no exterior',
                    'Transferências internacionais: como fazer',
                    'ETFs globais: guia completo',
                    'Ações internacionais diretamente',
                    'Fundos de investimento offshore'
                ]
            },
            {
                title: 'Módulo 3: Aspectos Legais e Tributários',
                lessons: [
                    'Declaração de capitais no exterior',
                    'Imposto de Renda sobre investimentos internacionais',
                    'Acordos para evitar bitributação',
                    'Legalidade e conformidade',
                    'Planejamento sucessório internacional',
                    'Jurisdições favoráveis'
                ]
            },
            {
                title: 'Módulo 4: Mercados Específicos',
                lessons: [
                    'Estados Unidos: NYSE e NASDAQ',
                    'Europa: principais bolsas europeias',
                    'Ásia: oportunidades emergentes',
                    'Mercados emergentes vs. desenvolvidos',
                    'Setores em diferentes regiões',
                    'Análise de empresas globais'
                ]
            },
            {
                title: 'Módulo 5: Estratégias Avançadas',
                lessons: [
                    'Hedge cambial: protegendo seu patrimônio',
                    'Alocação internacional ideal',
                    'Rebalanceamento de carteira global',
                    'Oportunidades em crises internacionais',
                    'Tendências globais de investimento',
                    'Monitoramento de mercados internacionais'
                ]
            }
        ],
        testimonials: [
            {
                text: "Diversifiquei 30% do meu patrimônio para o exterior e reduzi muito meu risco. Curso essencial!",
                author: 'Marcos Andrade',
                avatar: 'M'
            },
            {
                text: "As orientações sobre aspectos legais foram fundamentais para eu investir com segurança.",
                author: 'Julia Fernandes',
                avatar: 'J'
            },
            {
                text: "Finalmente entendi como funcionam os ETFs globais. Ótimo curso!",
                author: 'Roberto Silva',
                avatar: 'R'
            }
        ],
        faq: [
            {
                question: 'É seguro investir no exterior?',
                answer: 'Sim, quando feito corretamente. Ensinamos as <strong>melhores práticas e cuidados necessários</strong>.'
            },
            {
                question: 'Qual valor mínimo para começar?',
                answer: 'É possível começar com valores a partir de <strong>US$ 100</strong> através de ETFs.'
            }
        ],
        purchaseLink: '/processar-pagamento?curso=investimentos-internacionais'
    }
};

// Enhanced mobile menu functionality
function initializeMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('show');
            this.classList.toggle('active');
        });
    }
}

// Enhanced statistics counter animation
function initializeStatistics() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const stats = document.querySelectorAll('.stat-number');
                if (stats.length > 0) {
                    animateValue(stats[0], 0, 1800, 2000);
                    animateValue(stats[1], 0, 98.8, 1500);
                    animateValue(stats[2], 0, 6, 1800);
                    observer.unobserve(entry.target);
                }
            }
        });
    }, { threshold: 0.5 });

    const aboutSection = document.querySelector('.about-testimonials');
    if (aboutSection) {
        observer.observe(aboutSection);
    }
}

// Enhanced counter animation function
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        if (end === 98.8) {
            element.innerHTML = (progress * (end - start) + start).toFixed(1) + '%';
        } else {
            element.innerHTML = Math.floor(progress * (end - start) + start);
        }
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Enhanced accordion functionality for modules and FAQ
function initializeAccordions() {
    // Module accordions with enhanced animation
    const moduleHeaders = document.querySelectorAll('.module-header');
    moduleHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const module = header.parentElement;
            const lessons = module.querySelector('.module-lessons');

            // Close all other modules
            document.querySelectorAll('.module').forEach(otherModule => {
                if (otherModule !== module) {
                    otherModule.classList.remove('active');
                    otherModule.querySelector('.module-lessons').style.maxHeight = '0';
                }
            });

            module.classList.toggle('active');
            // Smooth height transition
            if (module.classList.contains('active')) {
                lessons.style.maxHeight = lessons.scrollHeight + 'px';
            } else {
                lessons.style.maxHeight = '0';
            }
        });
    });

    // FAQ accordions with enhanced animation
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const faqItem = question.parentElement;
            const answer = faqItem.querySelector('.faq-answer');

            // Close all other FAQ items
            document.querySelectorAll('.faq-item').forEach(otherItem => {
                if (otherItem !== faqItem) {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('.faq-answer').style.maxHeight = '0';
                }
            });

            faqItem.classList.toggle('active');
            // Smooth height transition
            if (faqItem.classList.contains('active')) {
                answer.style.maxHeight = answer.scrollHeight + 'px';
            } else {
                answer.style.maxHeight = '0';
            }
        });
    });
}

// Details toggle functionality for "Ver mais cursos"
function initializeDetailsToggle() {
    const details = document.querySelector('.more-courses details');
    if (details) {
        details.addEventListener('toggle', function() {
            const icon = this.querySelector('summary i');
            if (this.open) {
                icon.style.transform = 'rotate(180deg)';
            } else {
                icon.style.transform = 'rotate(0deg)';
            }
        });
    }
}

// Barra de progresso de rolagem
function initializeScrollProgress() {
    const scrollProgress = document.createElement('div');
    scrollProgress.className = 'scroll-progress';
    document.body.appendChild(scrollProgress);

    window.addEventListener('scroll', () => {
        const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (window.scrollY / windowHeight) * 100;
        scrollProgress.style.width = scrolled + '%';
    });
}

// Smooth Scroll Navigation
function initializeSmoothScroll() {
    initializeScrollProgress();

    // Smooth scroll for navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // If it's a hash link, prevent default and scroll smoothly
            if (this.getAttribute('href') && this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    const headerHeight = document.querySelector('header').offsetHeight;
                    const targetPosition = targetElement.offsetTop - headerHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });

                    // Update URL without jumping
                    history.pushState(null, null, `#${targetId}`);
                }
            }

            // Close mobile menu if open
            const navMenu = document.getElementById('navMenu');
            const menuToggle = document.getElementById('menuToggle');
            if (navMenu && navMenu.classList.contains('show')) {
                navMenu.classList.remove('show');
                menuToggle.classList.remove('active');
            }
        });
    });

    // Add scroll animations for elements
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for scroll animations
    document.querySelectorAll('.course-card, .testimonial-card, .value-item, .stat').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Enhanced animations on page load
function initializePageAnimations() {
    // Add loading animation to course cards
    const courseCards = document.querySelectorAll('.course-card');
    courseCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeMobileMenu();
    initializeStatistics();
    initializeAccordions();
    initializeDetailsToggle();
    initializeSmoothScroll();
    initializePageAnimations();
    console.log('Growfy - Enhanced JavaScript inicializado com sucesso!');
});