const API_BASE_URL = (window.GROWFY_API_BASE_URL || '/api').replace(/\/+$/, '');

const courseCatalog = {
    'guia-financeiro': {
        title: 'Guia Financeiro 2025',
        description: 'Como organizar sua vida financeira e começar a investir com pouco.'
    },
    'investimentos-iniciantes': {
        title: 'Investimentos para Iniciantes',
        description: 'Aprenda os fundamentos para começar a investir com segurança.'
    },
    'economia-inteligente': {
        title: 'Economia Inteligente',
        description: 'Descubra como economizar sem sacrificar sua qualidade de vida.'
    },
    'financas-imobiliarias': {
        title: 'Finanças Imobiliárias',
        description: 'Aprenda a investir no mercado imobiliário mesmo com pouco capital.'
    },
    'mindset-financeiro': {
        title: 'Mindset Financeiro',
        description: 'Transforme sua mentalidade para tomar decisões financeiras conscientes.'
    },
    'investimentos-internacionais': {
        title: 'Investimentos Internacionais',
        description: 'Conheça conceitos para diversificar investimentos além do Brasil.'
    }
};

class AlunoArea {
    constructor() {
        this.userData = null;
        this.userCourses = [];
        this.message = document.getElementById('alunoMessage');
        this.init();
    }

    async init() {
        this.setupNavigation();
        this.setupLogout();
        try {
            const sessionResponse = await fetch(`${API_BASE_URL}/auth/session`, {
                credentials: 'same-origin'
            });
            if (sessionResponse.status === 401) {
                window.location.replace('login.html?next=aluno.html');
                return;
            }
            if (!sessionResponse.ok) throw new Error('Não foi possível validar sua sessão.');

            const { user } = await sessionResponse.json();
            this.userData = user;
            const coursesResponse = await fetch(`${API_BASE_URL}/user/courses`, {
                credentials: 'same-origin'
            });
            if (!coursesResponse.ok) throw new Error('Não foi possível carregar seus cursos.');
            const courses = await coursesResponse.json();
            this.userCourses = courses.courses;

            this.displayUserData();
            this.displayUserCourses();
            this.updateStats();
            this.showSection('dashboard');
        } catch (error) {
            this.showError(error.message || 'Não foi possível carregar sua área do aluno.');
        }
    }

    displayUserData() {
        if (!this.userData) return;
        const userName = document.getElementById('userName');
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const profileSince = document.getElementById('profileSince');
        if (userName) userName.textContent = this.userData.name;
        if (profileName) profileName.textContent = this.userData.name;
        if (profileEmail) profileEmail.textContent = this.userData.email;
        if (profileSince && this.userData.created_at) {
            profileSince.textContent = new Date(this.userData.created_at).toLocaleDateString('pt-BR');
        }
    }

    displayUserCourses() {
        const coursesList = document.getElementById('cursosList');
        if (!coursesList) return;
        coursesList.replaceChildren();
        if (this.userCourses.length === 0) {
            const emptyState = document.createElement('p');
            emptyState.className = 'no-courses';
            emptyState.textContent = 'Você ainda não possui cursos.';
            const link = document.createElement('a');
            link.href = 'index.html#courses';
            link.textContent = 'Explore nossos cursos';
            emptyState.append(' ', link);
            coursesList.appendChild(emptyState);
            return;
        }

        this.userCourses.forEach((course) => {
            const courseInfo = courseCatalog[course.course_id];
            if (!courseInfo) return;
            const card = document.createElement('article');
            card.className = 'curso-card';
            const title = document.createElement('h3');
            title.textContent = courseInfo.title;
            const description = document.createElement('p');
            description.textContent = courseInfo.description;
            const purchaseDate = document.createElement('p');
            const date = new Date(course.purchase_date);
            purchaseDate.textContent = `Acesso concedido em: ${date.toLocaleDateString('pt-BR')}`;
            card.append(title, description, purchaseDate);
            coursesList.appendChild(card);
        });
    }

    updateStats() {
        const total = document.getElementById('totalCursos');
        const completed = document.getElementById('cursosConcluidos');
        const inProgress = document.getElementById('cursosAndamento');
        if (total) total.textContent = `${this.userCourses.length} cursos`;
        if (completed) completed.textContent = '0 cursos';
        if (inProgress) inProgress.textContent = `${this.userCourses.length} cursos`;
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.aluno-nav .nav-link');
        navLinks.forEach((link) => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const sectionId = new URL(link.href).hash.slice(1);
                navLinks.forEach((item) => item.classList.remove('active'));
                link.classList.add('active');
                this.showSection(sectionId);
            });
        });
    }

    showSection(sectionId) {
        document.querySelectorAll('.aluno-main > .container > section').forEach((section) => {
            section.hidden = section.id !== sectionId;
        });
    }

    setupLogout() {
        const logoutButton = document.getElementById('logoutBtn');
        if (!logoutButton) return;
        logoutButton.addEventListener('click', async () => {
            logoutButton.disabled = true;
            try {
                const response = await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: '{}'
                });
                if (!response.ok) throw new Error('Não foi possível encerrar a sessão.');
                window.location.replace('index.html');
            } catch (error) {
                this.showError(error.message || 'Não foi possível encerrar a sessão.');
            } finally {
                logoutButton.disabled = false;
            }
        });
    }

    showError(message) {
        if (this.message) this.message.textContent = message;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AlunoArea();
});
