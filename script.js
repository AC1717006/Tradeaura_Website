// YE URL REPLACE KARNA HEE PADEGA (DEPLOYMENT KE BAAD)
const APPS_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyR2fPaO8av5miH7DzgQTdWPKpqIYZEPKYv8klZDbUtO9JyaEz762ih3_i8wRm2xoWNMA/exec";

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const btn = document.getElementById('loginBtn');
    const btnText = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.loader');
    const messageBox = document.getElementById('messageBox');
    
    // UI Update - Loading State
    btnText.classList.add('hidden');
    loader.classList.remove('hidden');
    btn.disabled = true;
    messageBox.classList.add('hidden');
    messageBox.className = 'message-box hidden';
    
    try {
        if(APPS_SCRIPT_WEB_APP_URL === "YOUR_WEB_APP_URL_HERE") {
            throw new Error("Action Required: script.js open karein aur 'APPS_SCRIPT_WEB_APP_URL' mein apna Google Web App URL daalein.");
        }

        // 'no-cors' tab use karte hain jab Google Apps Script strict CORS policy lagata hai
        // Lekin 'doPost' ke case mein humein JSON response chahiye hota hai.
        // As a workaround, Google Apps Script mein properly ContentService text output use karna zaroori hai.
        const response = await fetch(APPS_SCRIPT_WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ email: email, password: password }),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            }
        });
        
        const data = await response.json();
        
        if (data.status === "success") {
            // Antigravity Concierge / Gym Growth Strategist Success Protocol
            showMessage(`Welcome to Tradeaura, ${data.owner}! Initializing ${data.gym} workspace...`, 'success');
            // Yahan se dashboard par redirect kar sakte hain, e.g.
            // window.location.href = "/dashboard.html";
        } else {
            // Security Guardian Protocol
            showMessage("Authentication failed. Invalid email or password.", 'error');
        }
    } catch (error) {
        console.error("Login Error:", error);
        showMessage("Connection error: " + error.message, 'error');
    } finally {
        // UI Update - Reset
        btnText.classList.remove('hidden');
        loader.classList.add('hidden');
        btn.disabled = false;
    }
});

function showMessage(msg, type) {
    const messageBox = document.getElementById('messageBox');
    messageBox.textContent = msg;
    messageBox.className = `message-box ${type}`;
}
