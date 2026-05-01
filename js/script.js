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
async function handleRegistration(event) {
    event.preventDefault();
    
    const form = document.getElementById('registrationForm');
    const submitBtn = document.getElementById('submitBtn');
    const submitSpinner = document.getElementById('submitSpinner');
    const successMsg = document.getElementById('successMessage');
    
    // Disable button and show spinner
    submitBtn.disabled = true;
    submitSpinner.classList.remove('hidden');
    
    // REPLACE THIS URL WITH YOUR GOOGLE APPS SCRIPT WEB APP URL
    const SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
    
    try {
        const formData = new FormData(form);
        
        // Handle multiple checkboxes (Pain Points)
        const painPoints = formData.getAll('painPoints');
        formData.delete('painPoints');
        formData.append('painPoints', painPoints.join(', '));
        
        // Optional: If you haven't deployed the Google Script yet, this will just simulate success
        if (SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
            await new Promise(r => setTimeout(r, 1000)); // Simulate network request
        } else {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: formData
            });
            // With no-cors, we can't read the response, so we assume success if no network error thrown
        }

        // Hide form, show success message
        form.classList.add('hidden');
        successMsg.classList.remove('hidden');
        successMsg.classList.add('animate-fade-in');
        
    } catch (error) {
        console.error('Error submitting form!', error);
        alert('There was an error submitting your registration. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitSpinner.classList.add('hidden');
    }
}

function resetForm() {
    const form = document.getElementById('registrationForm');
    const successMsg = document.getElementById('successMessage');
    
    form.reset();
    successMsg.classList.add('hidden');
    form.classList.remove('hidden');
}
