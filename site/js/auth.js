/* ============================================ */
/* Alliance REN - Auth (Login / Register)       */
/* Login par pseudo (pas d'email demande)       */
/* Email genere auto: pseudo.ren@example.com     */
/* ============================================ */
(function () {
    'use strict';

    /* === CONSTANTES === */
    function pseudoToEmail(pseudo) {
        var clean = pseudo.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        return clean + '.ren@example.com';
    }

    /* === SELECTEURS === */
    var loginForm = document.getElementById('login-form');
    var registerForm = document.getElementById('register-form');
    var loginMessage = document.getElementById('login-message');
    var registerMessage = document.getElementById('register-message');
    var toggleToRegister = document.getElementById('toggle-to-register');
    var toggleToLogin = document.getElementById('toggle-to-login');

    /* === TOGGLE FORMS === */
    if (toggleToRegister) {
        toggleToRegister.addEventListener('click', function (e) {
            e.preventDefault();
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            toggleToRegister.classList.add('hidden');
            toggleToLogin.classList.remove('hidden');
            clearMessages();
        });
    }

    if (toggleToLogin) {
        toggleToLogin.addEventListener('click', function (e) {
            e.preventDefault();
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            toggleToLogin.classList.add('hidden');
            toggleToRegister.classList.remove('hidden');
            clearMessages();
        });
    }

    function clearMessages() {
        if (loginMessage) { loginMessage.className = 'auth-message'; loginMessage.textContent = ''; }
        if (registerMessage) { registerMessage.className = 'auth-message'; registerMessage.textContent = ''; }
    }

    function showMessage(el, text, type) {
        if (!el) return;
        el.textContent = text;
        el.className = 'auth-message auth-message--' + type;
    }

    /* === LOGIN === */
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            if (!window.REN.supabase) {
                showMessage(loginMessage, 'Supabase non configure. Verifiez la configuration.', 'error');
                return;
            }

            var username = document.getElementById('login-username').value.trim();
            var password = document.getElementById('login-password').value;

            if (!username || !password) {
                showMessage(loginMessage, 'Veuillez remplir tous les champs.', 'error');
                return;
            }

            var email = pseudoToEmail(username);

            var submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Connexion...';

            try {
                var result = await window.REN.supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (result.error) {
                    showMessage(loginMessage, 'Pseudo ou mot de passe incorrect.', 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Connexion';
                    return;
                }

                window.location.href = 'index.html';
            } catch (err) {
                showMessage(loginMessage, 'Erreur inattendue. Reessayez.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Connexion';
            }
        });
    }

    /* === REGISTER === */
    if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            if (!window.REN.supabase) {
                showMessage(registerMessage, 'Supabase non configure. Verifiez la configuration.', 'error');
                return;
            }

            var username = document.getElementById('register-username').value.trim();
            var password = document.getElementById('register-password').value;
            var classe = document.getElementById('register-classe').value;
            var element = document.getElementById('register-element').value;

            if (!username) {
                showMessage(registerMessage, 'Veuillez entrer votre pseudo.', 'error');
                return;
            }

            if (username.length < 2) {
                showMessage(registerMessage, 'Le pseudo doit faire au moins 2 caracteres.', 'error');
                return;
            }

            if (!password || password.length < 6) {
                showMessage(registerMessage, 'Le mot de passe doit faire au moins 6 caracteres.', 'error');
                return;
            }

            var email = pseudoToEmail(username);

            var submitBtn = registerForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Inscription...';

            try {
                var result = await window.REN.supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            username: username,
                            classe: classe || null,
                            element: element || null
                        }
                    }
                });

                if (result.error) {
                    console.error('[REN] Erreur inscription Supabase:', result.error);
                    var msg = 'Erreur lors de l\'inscription.';
                    if (result.error.message && result.error.message.includes('already registered')) {
                        msg = 'Ce pseudo est deja utilise.';
                    } else if (result.error.message) {
                        msg = result.error.message;
                    }
                    showMessage(registerMessage, msg, 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'S\'inscrire';
                    return;
                }

                /* Verifier si l'utilisateur a bien ete cree (pas de session = email confirmation requise ?) */
                if (!result.data || !result.data.user) {
                    console.error('[REN] Inscription: pas de user retourne', result);
                    showMessage(registerMessage, 'Erreur: aucun utilisateur cree. Verifiez la configuration Supabase.', 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'S\'inscrire';
                    return;
                }

                console.log('[REN] Inscription reussie:', result.data.user.id, 'Session:', !!result.data.session);

                showMessage(registerMessage, 'Compte cree ! Un administrateur doit valider votre acces avant que vous puissiez utiliser le site.', 'success');
                submitBtn.disabled = false;
                submitBtn.textContent = 'S\'inscrire';

            } catch (err) {
                console.error('[REN] Exception inscription:', err);
                showMessage(registerMessage, 'Erreur inattendue: ' + err.message, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'S\'inscrire';
            }
        });
    }
})();
