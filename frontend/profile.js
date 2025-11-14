(function(){
  const api = 'http://localhost:3000';
  function getUser(){ try{return JSON.parse(localStorage.getItem('user'));}catch(e){return null} }
  const user = getUser();
  if (!user) { alert('Faça login primeiro'); window.location.href='login.html'; }

  async function load(){
    try {
      const res = await fetch(api + '/users/' + user.id);
      if (!res.ok) return alert('Erro ao carregar perfil');
      const data = await res.json();
      document.getElementById('name').value = data.name || '';
      document.getElementById('email').value = data.email || '';
      
      // Load profile picture if exists
      if (data.profile_picture_url) {
        const preview = document.getElementById('profile-picture-preview');
        preview.innerHTML = '';
        const img = document.createElement('img');
        img.src = api + "/uploads/" + data.profile_picture_url;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        preview.appendChild(img);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Handle profile picture selection
  document.getElementById('profile-picture').addEventListener('change', function(e){
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const preview = document.getElementById('profile-picture-preview');
      preview.innerHTML = '';
      const img = document.createElement('img');
      img.src = evt.target.result;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('profile-form').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!name || !email) return alert('Nome e email são obrigatórios');
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    if (password) formData.append('password', password);
    
    const pictureInput = document.getElementById('profile-picture');
    if (pictureInput.files.length > 0) {
      formData.append('profile_picture', pictureInput.files[0]);
    }
    
    try {
      const res = await fetch(api + '/users/' + user.id, { 
        method:'PUT', 
        body: formData 
      });
      const r = await res.json();
      if (r.success) {
        // fetch fresh user info (to get picture_url) and update localStorage
        try {
          const fres = await fetch(api + '/users/' + user.id);
          if (fres.ok) {
            const fresh = await fres.json();
            const updated = Object.assign({}, user, { name: fresh.name || name, email: fresh.email || email, picture_url: fresh.picture_url });
            localStorage.setItem('user', JSON.stringify(updated));
          } else {
            const updated = Object.assign({}, user, { name, email });
            localStorage.setItem('user', JSON.stringify(updated));
          }
        } catch (e) {
          const updated = Object.assign({}, user, { name, email });
          localStorage.setItem('user', JSON.stringify(updated));
        }
        alert('Perfil atualizado');
        window.location.href='index.html';
      } else {
        alert('Falha ao atualizar: ' + (r.message || 'erro desconhecido'));
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao atualizar');
    }
  });

  load();
})();
