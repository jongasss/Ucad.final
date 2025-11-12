// Feed with image uploads, post detail links, and comments
(function(){
  const api = 'http://localhost:3000';

  function getUser(){
    try { return JSON.parse(localStorage.getItem('user')); } catch(e){return null}
  }

  function setHeader(){
    const hdr = document.getElementById('header-links');
    const user = getUser();
    hdr.innerHTML = '';
    if (user) {
      // Try to fetch fresh user info to get picture_url
      fetch(api + '/users/' + user.id).then(r => r.ok ? r.json() : null).then(data => {
        const profileAnchor = document.createElement('a');
        profileAnchor.href = 'profile.html';
        profileAnchor.style.display = 'flex';
        profileAnchor.style.alignItems = 'center';
        profileAnchor.style.gap = '8px';
        profileAnchor.style.textDecoration = 'none';

        const avatarWrap = document.createElement('div');
        avatarWrap.style.width = '40px';
        avatarWrap.style.height = '40px';
        avatarWrap.style.borderRadius = '50%';
        avatarWrap.style.overflow = 'hidden';
        avatarWrap.style.background = '#2b2b3a';
        avatarWrap.style.display = 'flex';
        avatarWrap.style.alignItems = 'center';
        avatarWrap.style.justifyContent = 'center';

        if (data && data.picture_url) {
          const img = document.createElement('img');
          img.src = data.picture_url;
          img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'cover';
          avatarWrap.appendChild(img);
        } else {
          const initials = document.createElement('div');
          initials.textContent = (data && data.name ? data.name.split(' ').map(x=>x[0]).slice(0,2).join('') : (user.name||'U').slice(0,2)).toUpperCase();
          initials.style.color = '#e9e7ff';
          initials.style.fontWeight = '700';
          avatarWrap.appendChild(initials);
        }

        avatarWrap.addEventListener('click', (e) => { e.stopPropagation(); window.location.href = 'profile.html'; });

        const nameSpan = document.createElement('span');
        nameSpan.textContent = data && data.name ? data.name : user.name || 'Perfil';
        nameSpan.style.color = '#e9e7ff';
        nameSpan.style.fontWeight = '600';

        const logout = document.createElement('button');
        logout.textContent = 'Logout';
        logout.style.marginLeft = '12px';
        logout.addEventListener('click', (ev) => { ev.stopPropagation(); localStorage.removeItem('user'); window.location.reload(); });

        profileAnchor.appendChild(avatarWrap);
        profileAnchor.appendChild(nameSpan);
        hdr.appendChild(profileAnchor);
        hdr.appendChild(logout);
      }).catch(() => {
        // fallback if fetch fails
        const profileLink = document.createElement('a');
        profileLink.href = 'profile.html';
        profileLink.textContent = user.name || 'Perfil';
        profileLink.style.marginRight = '8px';
        const logout = document.createElement('button');
        logout.textContent = 'Logout';
        logout.addEventListener('click', () => { localStorage.removeItem('user'); window.location.reload(); });
        hdr.appendChild(profileLink);
        hdr.appendChild(logout);
      });
    } else {
      const login = document.createElement('a'); login.href='login.html'; login.textContent='Login'; login.style.marginRight='8px';
      const cadastro = document.createElement('a'); cadastro.href='cadastro.html'; cadastro.textContent='Cadastro';
      hdr.appendChild(login); hdr.appendChild(cadastro);
    }
  }

  async function loadPosts(){
    const res = await fetch(api + '/posts');
    const posts = await res.json();
    const feed = document.getElementById('feed');
    feed.innerHTML = '';
    for (const p of posts) {
      const el = document.createElement('div');
      el.className = 'post';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.gap = '12px';
      el.style.padding = '12px';
      el.style.alignItems = 'flex-start';

      // fetch author to show avatar
      let authorData = null;
      try {
        const ar = await fetch(api + '/users/' + p.user_id);
        if (ar.ok) authorData = await ar.json();
      } catch (e) { /* ignore */ }

      const avatarWrap = document.createElement('div');
      avatarWrap.style.width = '48px'; avatarWrap.style.height = '48px'; avatarWrap.style.borderRadius = '50%'; avatarWrap.style.overflow = 'hidden'; avatarWrap.style.flex = '0 0 48px'; avatarWrap.style.background = '#2b2b3a'; avatarWrap.style.display = 'flex'; avatarWrap.style.alignItems = 'center'; avatarWrap.style.justifyContent = 'center';
      if (authorData && authorData.picture_url) {
        const img = document.createElement('img'); img.src = authorData.picture_url; img.style.width='100%'; img.style.height='100%'; img.style.objectFit='cover'; avatarWrap.appendChild(img);
      } else {
        const initials = document.createElement('div'); initials.textContent = (authorData && authorData.name ? authorData.name.split(' ').map(x=>x[0]).slice(0,2).join('') : (p.author||'U').slice(0,2)).toUpperCase(); initials.style.color='#e9e7ff'; initials.style.fontWeight='700'; avatarWrap.appendChild(initials);
      }
      avatarWrap.addEventListener('click', (ev) => { ev.stopPropagation(); window.location.href = 'profile.html'; });

      const contentWrap = document.createElement('div'); contentWrap.style.flex = '1';

      let imageHtml = '';
      if (p.has_image) {
        imageHtml = '<div style="background: #0f0f23; padding: 8px; border-radius: 6px; text-align: center; color: #a78bfa; font-size: 20px; margin: 10px 0;">📸 Clique para ver imagem</div>';
      }

      contentWrap.innerHTML = `<div style="display:flex; align-items:center; gap:8px;"><strong style=\"color:#c084fc\">${escapeHtml(p.author)}</strong> <small style=\"color:#9ca3af\">${new Date(p.created_at).toLocaleString()}</small></div>
        <p style=\"color:#e0e0e0; margin:10px 0;\">${escapeHtml(p.content.substring(0, 150))}${p.content.length > 150 ? '...' : ''}</p>
        ${imageHtml}
        <div style=\"color: #7c3aed; font-size: 13px; margin-top: 8px; font-weight: 600;\">Ver post completo →</div>`;

      el.appendChild(avatarWrap);
      el.appendChild(contentWrap);

      el.addEventListener('click', () => { window.location.href = 'post-detail.html?id=' + p.id; });

      feed.appendChild(el);
    }
  }

  function escapeHtml(s){ if(!s) return ''; return s.replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c];}); }

  function setupCreate(){
    const user = getUser();
    const postForm = document.getElementById('post-form');
    const please = document.getElementById('please-login');
    if (user) {
      postForm.style.display='block';
      please.style.display='none';
      
      // Image selection handler
      document.getElementById('post-image').addEventListener('change', function(e){
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (evt) => {
          const preview = document.getElementById('image-preview');
          preview.innerHTML = '';
          const img = document.createElement('img');
          img.src = evt.target.result;
          img.style.maxWidth = '100%';
          img.style.maxHeight = '250px';
          img.style.borderRadius = '8px';
          img.style.marginTop = '10px';
          preview.appendChild(img);
        };
        reader.readAsDataURL(file);
      });
      
      document.getElementById('post-submit').addEventListener('click', async ()=>{
        const content = document.getElementById('post-content').value.trim();
        if (!content) return alert('Escreva algo');
        
        const formData = new FormData();
        formData.append('user_id', user.id);
        formData.append('content', content);
        
        const imageInput = document.getElementById('post-image');
        if (imageInput.files.length > 0) {
          formData.append('image', imageInput.files[0]);
        }
        
        try {
          const res = await fetch(api + '/posts', { 
            method:'POST',
            body: formData 
          });
          const r = await res.json();
          if (r.success) {
            document.getElementById('post-content').value='';
            document.getElementById('post-image').value='';
            document.getElementById('image-preview').innerHTML='';
            loadPosts();
          } else {
            alert('Erro ao criar post');
          }
        } catch (e) {
          console.error(e);
          alert('Erro ao criar post');
        }
      });
    } else {
      postForm.style.display='none';
      please.innerHTML = 'Faça <a href="login.html">login</a> para criar publicações.';
    }
  }

  // Initialize
  setHeader();
  setupCreate();
  loadPosts();
  // reload header if login state changes in another tab
  window.addEventListener('storage', () => { setHeader(); setupCreate(); loadPosts(); });
})();
