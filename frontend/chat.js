document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000';
    let socket;
    let currentUser = null;
    let currentRecipient = null;

    const userList = document.getElementById('user-list');
    const welcomeMessage = document.getElementById('welcome-message');
    const chatWindow = document.getElementById('chat-window');
    const chattingWith = document.getElementById('chatting-with');
    const messages = document.getElementById('messages');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');

    const connectToChat = () => {
        socket = io(API_URL);

        socket.on('connect', () => {
            const user = localStorage.getItem('user');
            socket.emit('authenticate', user);
        });

        socket.on('update-user-list', (users) => {
            userList.innerHTML = '';
            users.forEach(user => {
                console.log(user)
                if (user === (JSON.parse(localStorage.getItem("user"))).name) return; 
                const li = document.createElement('li');
                li.textContent = user;
                li.dataset.username = user;
                li.addEventListener('click', () => startPrivateChat(user));
                userList.appendChild(li);
            });
        });

        socket.on('private-message', ({ sender, message, createdAt }) => {
            if (sender === currentRecipient || sender === currentUser) {
                displayMessage(sender, message);
            }
        });

        socket.on('history', (history) => {
            messages.innerHTML = '';
            history.forEach(msg => displayMessage(msg.sender, msg.message));
        });
    };

    const startPrivateChat = (recipient) => {
        currentRecipient = recipient;
        
        document.querySelectorAll('#user-list li').forEach(li => li.classList.remove('active'));
        document.querySelector(`#user-list li[data-username='${recipient}']`).classList.add('active');

        welcomeMessage.classList.add('hidden');
        chatWindow.classList.remove('hidden');
        chattingWith.textContent = recipient;
        messages.innerHTML = '';

        socket.emit('load-history', recipient);
    };

    const displayMessage = (sender, message) => {
        const li = document.createElement('li');
        li.textContent = message;
        li.classList.add(sender === (JSON.parse(localStorage.getItem("user"))).id ? 'sent' : 'received');
        messages.appendChild(li);
        messages.scrollTop = messages.scrollHeight;
    };

    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = messageInput.value;
        if (message && currentRecipient) {
            socket.emit('private-message', { recipient: currentRecipient, message });
            messageInput.value = '';
            displayMessage((JSON.parse(localStorage.getItem("user"))).id, message)
        }
    });

    const user = localStorage.getItem('user');
    if (user) {
        currentUser = JSON.parse(user).username;
        connectToChat();
    }
});