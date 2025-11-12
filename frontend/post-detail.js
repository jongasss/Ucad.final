// Post detail view with edit and comments
(function(){
  const api = 'http://localhost:3000';
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');

  function getUser(){
    try { return JSON.parse(localStorage.getItem('user')); } catch(e){return null}
  }

  function setHeader(){
    const hdr = document.getElementById('header-links');
    const user = getUser();
    hdr.innerHTML = '';
    if (user) {
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
          const img = document.createElement('img'); img.src = data.picture_url; img.style.width='100%'; img.style.height='100%'; img.style.objectFit='cover'; avatarWrap.appendChild(img);
        } else {
          const initials = document.createElement('div'); initials.textContent = (data && data.name ? data.name.split(' ').map(x=>x[0]).slice(0,2).join('') : (user.name||'U').slice(0,2)).toUpperCase(); initials.style.color='#e9e7ff'; initials.style.fontWeight='700'; avatarWrap.appendChild(initials);
        }
        avatarWrap.addEventListener('click', (ev) => { ev.stopPropagation(); window.location.href = 'profile.html'; });

        const nameSpan = document.createElement('span'); nameSpan.textContent = data && data.name ? data.name : user.name || 'Perfil'; nameSpan.style.color='#e9e7ff'; nameSpan.style.fontWeight='600';
        const logout = document.createElement('button'); logout.textContent = 'Logout'; logout.style.marginLeft = '12px'; logout.addEventListener('click', (ev) => { ev.stopPropagation(); localStorage.removeItem('user'); window.location.href = 'index.html'; });

        profileAnchor.appendChild(avatarWrap);
        profileAnchor.appendChild(nameSpan);
        hdr.appendChild(profileAnchor);
        hdr.appendChild(logout);
      }).catch(() => {
        const profileLink = document.createElement('a'); profileLink.href='profile.html'; profileLink.textContent = user.name || 'Perfil'; profileLink.style.marginRight='8px'; const logout = document.createElement('button'); logout.textContent='Logout'; logout.addEventListener('click', () => { localStorage.removeItem('user'); window.location.href = 'index.html'; }); hdr.appendChild(profileLink); hdr.appendChild(logout);
      });
    } else {
      const login = document.createElement('a'); login.href='login.html'; login.textContent='Login'; login.style.marginRight='8px';
      const cadastro = document.createElement('a'); cadastro.href='cadastro.html'; cadastro.textContent='Cadastro';
      hdr.appendChild(login); hdr.appendChild(cadastro);
    }
  }

  function escapeHtml(s){ if(!s) return ''; return s.replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c];}); }

  let currentPost = null;

  async function loadPost(){
    if (!postId) {
      document.getElementById('post-detail').innerHTML = '<p style="color: #c084fc;">Post não encontrado.</p>';
      document.getElementById('post-detail').style.display = 'block';
      return;
    }

    try {
      const res = await fetch(api + '/posts/' + postId);
      if (!res.ok) {
        document.getElementById('post-detail').innerHTML = '<p style="color: #c084fc;">Post não encontrado.</p>';
        document.getElementById('post-detail').style.display = 'block';
        return;
      }

      currentPost = await res.json();
      // fetch author picture if available
      try {
        const ares = await fetch(api + '/users/' + currentPost.user_id);
        if (ares.ok) {
          const authorData = await ares.json();
          currentPost.author_picture_url = authorData.picture_url;
          currentPost.author = authorData.name || currentPost.author;
        }
      } catch (e) { /* ignore */ }

      renderPost();
      loadComments();
    } catch (e) {
      console.error(e);
      document.getElementById('post-detail').innerHTML = '<p style="color: #c084fc;">Erro ao carregar post.</p>';
      document.getElementById('post-detail').style.display = 'block';
    }
  }

  function renderPost(){
    const user = getUser();
    const el = document.getElementById('post-detail');
    el.innerHTML = '';

    const postEl = document.createElement('div');
    postEl.className = 'post';
    postEl.style.marginBottom = '30px';

    let imageHtml = '';
    if (currentPost.image_url) {
      imageHtml = `<img src="${currentPost.image_url}" style="width: 100%; max-height: 400px; object-fit: cover; border-radius: 8px; margin: 15px 0;">`;
    }

    let actionButtons = '';
    if (user && user.id === currentPost.author_id) {
      actionButtons = `
        <div style="margin-top: 15px; display: flex; gap: 10px;">
          <button id="edit-btn" style="padding: 8px 15px; background: #7c3aed; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Editar</button>
          <button id="delete-btn" style="padding: 8px 15px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Deletar</button>
        </div>
      `;
    }

    // Build header with avatar + author
    const headerHtml = (() => {
      const avatarHtml = currentPost.author_picture_url ? `<div style="width:48px;height:48px;border-radius:50%;overflow:hidden;margin-right:12px;"><img src='${currentPost.author_picture_url}' style='width:100%;height:100%;object-fit:cover;'/></div>` : `<div style="width:48px;height:48px;border-radius:50%;background:#2b2b3a;color:#e9e7ff;display:flex;align-items:center;justify-content:center;margin-right:12px;font-weight:700">${(currentPost.author||'U').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase()}</div>`;
      return `<div style="display:flex;align-items:center;margin-bottom:12px;">${avatarHtml}<div><strong style='color:#c084fc;font-size:16px'>${escapeHtml(currentPost.author)}</strong><br/><small style='color:#9ca3af;font-size:12px'>${new Date(currentPost.created_at).toLocaleString()}</small>${currentPost.updated_at !== currentPost.created_at ? `<small style="color: #7c3aed; font-size: 11px; margin-left: 10px;">(editado)</small>` : ''}</div></div>`;
    })();

    postEl.innerHTML = `${headerHtml}
      <p style="color: #e0e0e0; margin: 15px 0; line-height: 1.6; font-size: 15px; white-space: pre-wrap;">${escapeHtml(currentPost.content)}</p>
      ${imageHtml}
      ${actionButtons}`;

    el.appendChild(postEl);
    el.style.display = 'block';

    // Attach event listeners
    const editBtn = document.getElementById('edit-btn');
    const deleteBtn = document.getElementById('delete-btn');

    if (editBtn) {
      editBtn.addEventListener('click', showEditMode);
    }
    if (deleteBtn) {
      deleteBtn.addEventListener('click', deletePost);
    }
  }

  function showEditMode(){
    const user = getUser();
    if (!user || user.id !== currentPost.author_id) return;

    document.getElementById('post-detail').style.display = 'none';
    const editSection = document.getElementById('edit-section');
    editSection.style.display = 'block';

    document.getElementById('edit-content').value = currentPost.content;

    const preview = document.getElementById('edit-image-preview');
    preview.innerHTML = '';
    if (currentPost.image_url) {
      const img = document.createElement('img');
      img.src = currentPost.image_url;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '250px';
      img.style.borderRadius = '8px';
      img.style.marginTop = '10px';
      preview.appendChild(img);
    }

    document.getElementById('edit-image').value = '';
    document.getElementById('edit-image').addEventListener('change', onEditImageSelected);
    document.getElementById('edit-submit').addEventListener('click', submitEdit);
    document.getElementById('cancel-edit').addEventListener('click', cancelEdit);
  }

  function onEditImageSelected(e){
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = document.createElement('img');
      img.src = evt.target.result;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '250px';
      img.style.borderRadius = '8px';
      img.style.marginTop = '10px';

      const preview = document.getElementById('edit-image-preview');
      preview.innerHTML = '';
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  }

  async function submitEdit(){
    const user = getUser();
    if (!user || user.id !== currentPost.author_id) return alert('Você não pode editar este post');

    const content = document.getElementById('edit-content').value.trim();
    if (!content) return alert('Escreva algo');

    const formData = new FormData();
    formData.append('user_id', user.id);
    formData.append('content', content);

    const imageInput = document.getElementById('edit-image');
    if (imageInput.files.length > 0) {
      formData.append('image', imageInput.files[0]);
    }

    try {
      const res = await fetch(api + '/posts/' + postId, {
        method: 'PUT',
        body: formData
      });
      const r = await res.json();
      if (r.success) {
        alert('Post atualizado');
        location.reload();
      } else {
        alert('Falha ao atualizar');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao atualizar');
    }
  }

  function cancelEdit(){
    document.getElementById('edit-section').style.display = 'none';
    document.getElementById('post-detail').style.display = 'block';
  }

  async function deletePost(){
    if (!confirm('Tem certeza que deseja deletar este post?')) return;

    const user = getUser();
    if (!user || user.id !== currentPost.author_id) return alert('Você não pode deletar este post');

    try {
      const res = await fetch(api + '/posts/' + postId, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id })
      });
      const r = await res.json();
      if (r.success) {
        alert('Post deletado');
        window.location.href = 'index.html';
      } else {
        alert('Falha ao deletar');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao deletar');
    }
  }

  async function loadComments(){
    try {
      const res = await fetch(api + '/posts/' + postId + '/comments');
      const comments = await res.json();
      renderComments(comments);
    } catch (e) {
      console.error(e);
    }
  }

  function renderComments(comments){
    const user = getUser();
    const container = document.getElementById('comments-section');
    container.innerHTML = '';

    const commentsDiv = document.createElement('div');
    commentsDiv.style.marginTop = '30px';
    commentsDiv.innerHTML = `<h3 style="color: #c084fc; margin-bottom: 20px;">Comentários (${comments.length})</h3>`;

    if (user) {
      const form = document.createElement('div');
      form.style.marginBottom = '25px';
      form.innerHTML = `
        <textarea id="comment-text" placeholder="Escreva um comentário" style="width: 100%; height: 80px; padding: 12px; background: #0f0f23; color: #e0e0e0; border: 2px solid #7c3aed; border-radius: 8px; font-family: inherit; font-size: 14px; resize: vertical;"></textarea>
        <button id="comment-submit" style="margin-top: 10px; padding: 10px 20px; background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">Comentar</button>
      `;
      commentsDiv.appendChild(form);

      // Attach listener to the button inside the newly created form element
      const submitBtn = form.querySelector('#comment-submit');
      const textarea = form.querySelector('#comment-text');
      if (submitBtn && textarea) {
        submitBtn.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          const txt = textarea.value.trim();
          if (!txt) return alert('Comentário vazio');

          try {
            const res = await fetch(api + '/posts/' + postId + '/comments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: user.id, content: txt })
            });
            const r = await res.json();
            if (r.success) {
              textarea.value = '';
              loadComments();
            } else {
              alert('Erro ao comentar');
            }
          } catch (e) {
            console.error(e);
            alert('Erro ao comentar');
          }
        });
      }
    } else {
      const loginMsg = document.createElement('div');
      loginMsg.innerHTML = '<p style="color: #a78bfa;">Faça <a href="login.html" style="color: #c084fc; text-decoration: none; font-weight: 700;">login</a> para comentar.</p>';
      commentsDiv.appendChild(loginMsg);
    }

    for (const c of comments) {
      const d = document.createElement('div');
      d.className = 'comment';
      d.innerHTML = `
        <strong style="color: #a78bfa;">${escapeHtml(c.author)}</strong>
        <small style="color: #9ca3af; font-size: 11px; margin-left: 10px;">${new Date(c.created_at).toLocaleString()}</small>
        <div style="color: #d1d5db; margin-top: 6px; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(c.content)}</div>
      `;
      commentsDiv.appendChild(d);
    }

    container.appendChild(commentsDiv);
  }

  // Initialize
  setHeader();
  loadPost();
})();
