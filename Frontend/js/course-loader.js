// course-loader.js - Dynamic course content loader atualizado com segurança

function loadCourseContent() {
    // Get course ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('course');

    // ✅ VALIDAÇÃO DE SEGURANÇA
    if (!courseId || !validateCourseId(courseId)) {
        console.error('ID de curso inválido ou não especificado');
        showError('Curso não encontrado. Por favor, selecione um curso válido.');
        return;
    }

    // Get course data
    const course = courseData[courseId];
    if (!course) {
        console.error('Curso não encontrado:', courseId);
        showError('Curso não encontrado. Por favor, selecione um curso válido.');
        return;
    }

    // Update page content
    document.title = `${sanitizeHTML(course.title)} - Growfy`;
    document.getElementById('courseTitle').textContent = course.title;
    document.getElementById('courseDescription').textContent = course.description;
    document.getElementById('coursePrice').textContent = course.price;
    document.getElementById('courseOldPrice').textContent = course.oldPrice;

    // Update purchase section
    document.getElementById('purchasePrice').textContent = course.price;
    document.getElementById('purchaseOldPrice').textContent = course.oldPrice;
    document.getElementById('purchaseLink').href = course.purchaseLink;

    // Update course icon
    const courseIcon = document.getElementById('courseMainIcon');
    if (courseIcon) {
        courseIcon.innerHTML = `<i class="${sanitizeHTML(course.icon)}"></i>`;
    }

    // Populate course details - Limit to 3 elements
    const detailsContainer = document.getElementById('courseDetails');
    if (detailsContainer && course.details) {
        // Ensure we only show 3 details
        const limitedDetails = course.details.slice(0, 3);
        detailsContainer.textContent = ''; // Limpar container
        limitedDetails.forEach(detail => {
            const detailCard = document.createElement('div');
            detailCard.className = 'detail-card';
            
            const detailIcon = document.createElement('div');
            detailIcon.className = 'detail-icon';
            detailIcon.innerHTML = `<i class="${sanitizeHTML(detail.icon)}"></i>`;
            
            const title = document.createElement('h3');
            title.textContent = sanitizeHTML(detail.title);
            
            const description = document.createElement('p');
            description.textContent = sanitizeHTML(detail.description);
            
            detailCard.appendChild(detailIcon);
            detailCard.appendChild(title);
            detailCard.appendChild(description);
            detailsContainer.appendChild(detailCard);
        });
    }

    // Populate course modules - Expanded content WITHOUT durations
    const modulesContainer = document.getElementById('courseModules');
    if (modulesContainer && course.modules) {
        modulesContainer.textContent = ''; // Limpar container
        course.modules.forEach((module, index) => {
            const moduleElement = document.createElement('div');
            moduleElement.className = 'module';
            
            const moduleHeader = document.createElement('div');
            moduleHeader.className = 'module-header';
            
            const moduleTitle = document.createElement('div');
            moduleTitle.className = 'module-title';
            moduleTitle.textContent = sanitizeHTML(module.title);
            
            const moduleIcon = document.createElement('div');
            moduleIcon.className = 'module-icon';
            moduleIcon.innerHTML = '<i class="fas fa-chevron-down"></i>';
            
            moduleHeader.appendChild(moduleTitle);
            moduleHeader.appendChild(moduleIcon);
            
            const moduleLessons = document.createElement('div');
            moduleLessons.className = 'module-lessons';
            
            module.lessons.forEach(lesson => {
                const lessonElement = document.createElement('div');
                lessonElement.className = 'lesson';
                
                const lessonIcon = document.createElement('div');
                lessonIcon.className = 'lesson-icon';
                lessonIcon.innerHTML = '<i class="fas fa-play-circle"></i>';
                
                const lessonTitle = document.createElement('div');
                lessonTitle.className = 'lesson-title';
                lessonTitle.textContent = sanitizeHTML(lesson);
                
                lessonElement.appendChild(lessonIcon);
                lessonElement.appendChild(lessonTitle);
                moduleLessons.appendChild(lessonElement);
            });
            
            moduleElement.appendChild(moduleHeader);
            moduleElement.appendChild(moduleLessons);
            modulesContainer.appendChild(moduleElement);
        });
    }

    // Populate testimonials - Limit to 3 testimonials
    const testimonialsContainer = document.getElementById('courseTestimonials');
    if (testimonialsContainer && course.testimonials) {
        // Ensure we only show 3 testimonials
        const limitedTestimonials = course.testimonials.slice(0, 3);
        testimonialsContainer.textContent = ''; // Limpar container
        limitedTestimonials.forEach(testimonial => {
            const testimonialCard = document.createElement('div');
            testimonialCard.className = 'testimonial-card';
            
            const testimonialText = document.createElement('p');
            testimonialText.className = 'testimonial-text';
            testimonialText.textContent = testimonial.text;
            
            const testimonialAuthor = document.createElement('div');
            testimonialAuthor.className = 'testimonial-author';
            
            const authorAvatar = document.createElement('div');
            authorAvatar.className = 'author-avatar';
            authorAvatar.textContent = testimonial.avatar;
            
            const authorInfo = document.createElement('div');
            authorInfo.className = 'author-info';
            
            const authorName = document.createElement('h4');
            authorName.textContent = testimonial.author;
            
            const authorCourse = document.createElement('p');
            authorCourse.textContent = `Aluno do ${course.title}`;
            
            authorInfo.appendChild(authorName);
            authorInfo.appendChild(authorCourse);
            testimonialAuthor.appendChild(authorAvatar);
            testimonialAuthor.appendChild(authorInfo);
            testimonialCard.appendChild(testimonialText);
            testimonialCard.appendChild(testimonialAuthor);
            testimonialsContainer.appendChild(testimonialCard);
        });
    }

    // Populate FAQ with enhanced styling
    const faqContainer = document.getElementById('courseFaq');
    if (faqContainer && course.faq) {
        faqContainer.textContent = ''; // Limpar container
        course.faq.forEach(item => {
            const faqItem = document.createElement('div');
            faqItem.className = 'faq-item';
            
            const faqQuestion = document.createElement('div');
            faqQuestion.className = 'faq-question';
            
            const questionTitle = document.createElement('h3');
            questionTitle.textContent = item.question;
            
            const faqIcon = document.createElement('div');
            faqIcon.className = 'faq-icon';
            faqIcon.innerHTML = '<i class="fas fa-chevron-down"></i>';
            
            faqQuestion.appendChild(questionTitle);
            faqQuestion.appendChild(faqIcon);
            
            const faqAnswer = document.createElement('div');
            faqAnswer.className = 'faq-answer';
            
            const answerContent = document.createElement('div');
            answerContent.className = 'faq-answer-content';
            answerContent.innerHTML = item.answer; // ❗ Aqui usamos innerHTML porque a resposta pode ter HTML (como <strong>), mas já foi sanitizada no courseData?
            
            faqAnswer.appendChild(answerContent);
            faqItem.appendChild(faqQuestion);
            faqItem.appendChild(faqAnswer);
            faqContainer.appendChild(faqItem);
        });
    }

    // Re-initialize accordions for dynamically loaded content
    setTimeout(() => {
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

        // FAQ accordions with enhanced animations
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

        // Add scroll animations for dynamically loaded content
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

        // Observe dynamically loaded elements
        document.querySelectorAll('.detail-card, .testimonial-card').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    }, 100);
}

function showError(message) {
    const main = document.querySelector('main') || document.body;
    main.innerHTML = `
        <div class="error-container" style="padding: 50px 20px; text-align: center;">
            <h2>Erro ao carregar o curso</h2>
            <p>${sanitizeHTML(message)}</p>
            <a href="index.html" class="purchase-button">Voltar para a Página Inicial</a>
        </div>
    `;
}

// Load course content when page is ready
document.addEventListener('DOMContentLoaded', loadCourseContent);