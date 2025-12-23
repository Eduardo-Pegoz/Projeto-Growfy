// aluno.js - Área do aluno

const API_BASE_URL = 'http://localhost:3000/api';

class AlunoArea {
    constructor() {
        this.userData = null;
        this.userCourses = [];
        this.init();
    }

    async init() {
        // Verificar autenticação
        if (!this.checkAuth()) {
            window.location.href = 'login.html';
            return;
        }

        // Carregar dados do usuário
        await this.loadUserData();
        await this.loadUserCourses();
        
        // Configurar navegação
        this.setupNavigation();
        this.setupLogout();
        
        // Mostrar dashboard por padrão
        this.showSection('dashboard');
    }

    checkAuth() {
        const token = localStorage.getItem('growfy_token');
        const user = localStorage.getItem('growfy_user');
        
        if (!token || !user) {
            return false;
        }

        try {
            // Verificar se o token é válido
            const payload = JSON.parse(atob(token.split('.')[1]));
            const isExpired = payload.exp * 1000 < Date.now();
            
            if (isExpired) {
                this.logout();
                return false;
            }
            
            return true;
        } catch (error) {
            this.logout();
            return false;
        }
    }

    async loadUserData() {
        try {
            const token = localStorage.getItem('growfy_token');
            const response = await fetch(`${API_BASE_URL}/user/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.userData = data.user;
                this.displayUserData();
            } else {
                throw new Error('Falha ao carregar dados do usuário');
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.showError('Erro ao carregar dados do usuário');
        }
    }

    async loadUserCourses() {
        try {
            const token = localStorage.getItem('growfy_token');
            const response = await fetch(`${API_BASE_URL}/user/courses`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.userCourses = data.courses;
                this.displayUserCourses();
                this.updateStats();
            } else {
                throw new Error('Falha ao carregar cursos');
            }
        } catch (error) {
            console.error('Erro ao carregar cursos:', error);
            this.showError('Erro ao carregar seus cursos');
        }
    }

    displayUserData() {
        if (this.userData) {
            // Atualizar elementos da página
            const userNameElement = document.getElementById('userName');
            const profileNameElement = document.getElementById('profileName');
            const profileEmailElement = document.getElementById('profileEmail');
            const profileSinceElement = document.getElementById('profileSince');

            if (userNameElement) userNameElement.textContent = this.userData.name;
            if (profileNameElement) profileNameElement.textContent = this.userData.name;
            if (profileEmailElement) profileEmailElement.textContent = this.userData.email;
            
            if (profileSinceElement && this.userData.created_at) {
                const date = new Date(this.userData.created_at);
                profileSinceElement.textContent = date.toLocaleDateString('pt-BR');
            }
        }
    }

    displayUserCourses() {
        const cursosList = document.getElementById('cursosList');
        if (!cursosList) return;

        if (this.userCourses.length === 0) {
            cursosList.innerHTML = `
                <div class="no-courses">
                    <p>Você ainda não possui cursos. <a href="index.html#courses">Explore nossos cursos</a></p>
                </div>
            `;
            return;
        }

        cursosList.innerHTML = this.userCourses.map(course => {
            const courseInfo = courseData[course.course_id];
            if (!courseInfo) return '';

            return `
                <div class="curso-card">
                    <h3>${courseInfo.title}</h3>
                    <p>${courseInfo.description}</p>
                    <div class="curso-meta">
                        <span class="curso-status status-active">Em Andamento</span>
                        <span class="curso-date">Comprado em: ${new Date(course.purchase_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <a href="curso.html?course=${course.course_id}" class="continue-btn">Continuar Curso</a>
                </div>
            `;
        }).join('');
    }

    updateStats() {
        const totalCursos = document.getElementById('totalCursos');
        const cursosConcluidos = document.getElementById('cursosConcluidos');
        const cursosAndamento = document.getElementById('cursosAndamento');

        if (totalCursos) totalCursos.textContent = `${this.userCourses.length} cursos`;
        if (cursosConcluidos) cursosConcluidos.textContent = '0 cursos'; // Implementar lógica de conclusão
        if (cursosAndamento) cursosAndamento.textContent = `${this.userCourses.length} cursos`;
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.getAttribute('href').substring(1);
                
                // Atualizar navegação ativa
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // Mostrar seção
                this.showSection(target);
            });
        });
    }

    showSection(sectionId) {
        // Esconder todas as seções
        const sections = document.querySelectorAll('.aluno-main > .container > section');
        sections.forEach(section => {
            section.style.display = 'none';
        });

        // Mostrar seção selecionada
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
        }
    }

    setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    }

    logout() {
        localStorage.removeItem('growfy_token');
        localStorage.removeItem('growfy_user');
        window.location.href = 'index.html';
    }

    showError(message) {
        // Implementar sistema de notificações
        alert(message); // Temporário - substituir por sistema de notificações bonito
    }
}

// Inicializar área do aluno quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new AlunoArea();
});