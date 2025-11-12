const form = document.getElementById('login-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      const response = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (result.success) {
        // store user in localStorage for client-side session
        if (result.user) {
          localStorage.setItem('user', JSON.stringify(result.user));
        }
        window.location.href = "index.html";
      } else {
        alert("Usuário ou senha incorretos");
      }
});