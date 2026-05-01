document.addEventListener('DOMContentLoaded', () => {
    // Initialize AOS (Animate On Scroll)
    AOS.init({
        duration: 800,
        easing: 'ease-out-cubic',
        once: true,
        offset: 50,
    });

    // Navbar Scroll Effect
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('nav-scrolled');
            navbar.classList.remove('py-4');
        } else {
            navbar.classList.remove('nav-scrolled');
            navbar.classList.add('py-4');
        }
    });

    // Smooth Scroll for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Form Submission Handler
function handleRegistration(event) {
    event.preventDefault();
    
    // Hide form, show success message
    const form = document.getElementById('registrationForm');
    const successMsg = document.getElementById('successMessage');
    
    // Add simple fade-out/fade-in using CSS classes
    form.classList.add('hidden');
    successMsg.classList.remove('hidden');
    successMsg.classList.add('animate-fade-in'); // Tailwind utility if configured, or just displays
}

function resetForm() {
    const form = document.getElementById('registrationForm');
    const successMsg = document.getElementById('successMessage');
    
    form.reset();
    successMsg.classList.add('hidden');
    form.classList.remove('hidden');
}
