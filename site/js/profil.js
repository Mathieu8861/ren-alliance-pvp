/* ============================================ */
/* Alliance REN - Profil                       */
/* Edition profil, stats perso, mot de passe   */
/* ============================================ */
(function () {
    'use strict';

    var selectedAvatarFile = null;

    document.addEventListener('ren:ready', init);

    async function init() {
        if (!window.REN.supabase || !window.REN.currentProfile) return;
        populateForm();
        populateInfos();
        populateMules();
        setupAvatarUpload();
        setupProfileForm();
        setupMulesForm();
        setupPasswordForm();
        await loadStats();
    }

    /* === PRE-REMPLIR LE FORMULAIRE === */
    function populateForm() {
        var profile = window.REN.currentProfile;

        /* Classe */
        var classeSelect = document.getElementById('profil-classe');
        if (classeSelect && profile.classe) {
            classeSelect.value = profile.classe;
        }

        /* Element */
        var elementSelect = document.getElementById('profil-element');
        if (elementSelect && profile.element) {
            elementSelect.value = profile.element;
        }

        /* Dofusbook */
        var dofusbookInput = document.getElementById('profil-dofusbook');
        if (dofusbookInput && profile.dofusbook_url) {
            dofusbookInput.value = profile.dofusbook_url;
        }
    }

    /* === INFOS JOUEUR (colonne droite) === */
    function populateInfos() {
        var container = document.getElementById('profil-infos');
        if (!container) return;

        var profile = window.REN.currentProfile;
        var html = '';

        html += buildInfoItem('Pseudo', profile.username || '--');
        html += buildInfoItem('Classe', profile.classe || 'Non definie');
        html += buildInfoItem('Element', profile.element || 'Non defini');
        html += buildInfoItem('Statut', profile.is_validated ? '<span style="color:var(--color-success)">Valide</span>' : '<span style="color:var(--color-danger)">En attente</span>');
        html += buildInfoItem('Role', profile.is_admin ? '<span style="color:var(--color-accent-light)">Admin</span>' : 'Membre');
        html += buildInfoItem('Inscription', window.REN.formatDate(profile.created_at));

        if (profile.dofusbook_url) {
            html += buildInfoItem('Dofusbook', '<a href="' + profile.dofusbook_url + '" target="_blank" style="color:var(--color-accent-light)">Voir le build</a>');
        }

        /* Mules */
        var mules = profile.mules || [];
        if (mules.length > 0) {
            html += buildInfoItem('Mules', '<span style="color:var(--color-text-secondary)">' + mules.join(', ') + '</span>');
        } else {
            html += buildInfoItem('Mules', '<span style="color:var(--color-text-muted)">Aucune</span>');
        }

        container.innerHTML = html;
    }

    function buildInfoItem(label, value) {
        return '<div class="profil-info-item">' +
            '<span class="profil-info-item__label">' + label + '</span>' +
            '<span class="profil-info-item__value">' + value + '</span>' +
            '</div>';
    }

    /* === MULES === */
    function populateMules() {
        var container = document.getElementById('profil-mules-list');
        if (!container) return;

        var mules = window.REN.currentProfile.mules || [];

        if (!mules.length) {
            container.innerHTML = '<p class="text-muted" style="font-size:0.8125rem; padding: var(--spacing-sm) 0;">Aucune mule ajoutee.</p>';
            return;
        }

        var html = '';
        mules.forEach(function (mule, index) {
            html += '<div class="profil-mule-item">';
            html += '<span class="profil-mule-item__name">' + mule + '</span>';
            html += '<button type="button" class="profil-mule-item__remove" data-index="' + index + '" title="Supprimer">&times;</button>';
            html += '</div>';
        });

        container.innerHTML = html;
    }

    function setupMulesForm() {
        var input = document.getElementById('profil-mule-input');
        var addBtn = document.getElementById('profil-mule-add-btn');
        var listEl = document.getElementById('profil-mules-list');
        if (!input || !addBtn || !listEl) return;

        /* Ajouter une mule */
        addBtn.addEventListener('click', function () {
            addMule();
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addMule();
            }
        });

        /* Supprimer une mule (delegation) */
        listEl.addEventListener('click', function (e) {
            var removeBtn = e.target.closest('.profil-mule-item__remove');
            if (!removeBtn) return;
            var index = parseInt(removeBtn.getAttribute('data-index'));
            removeMule(index);
        });
    }

    async function addMule() {
        var input = document.getElementById('profil-mule-input');
        var name = input.value.trim();
        if (!name) {
            window.REN.toast('Entrez un nom de mule.', 'error');
            return;
        }

        var mules = window.REN.currentProfile.mules || [];

        /* Verifier doublon */
        var exists = mules.some(function (m) { return m.toLowerCase() === name.toLowerCase(); });
        if (exists) {
            window.REN.toast('Cette mule existe deja.', 'error');
            return;
        }

        mules.push(name);

        try {
            var { error } = await window.REN.supabase
                .from('profiles')
                .update({ mules: mules })
                .eq('id', window.REN.currentUser.id);

            if (error) throw error;

            window.REN.currentProfile.mules = mules;
            input.value = '';
            populateMules();
            populateInfos();
            window.REN.toast('Mule "' + name + '" ajoutee !', 'success');
        } catch (err) {
            console.error('[REN] Erreur ajout mule:', err);
            mules.pop();
            window.REN.toast('Erreur lors de l\'ajout.', 'error');
        }
    }

    async function removeMule(index) {
        var mules = (window.REN.currentProfile.mules || []).slice();
        var removed = mules.splice(index, 1)[0];

        try {
            var { error } = await window.REN.supabase
                .from('profiles')
                .update({ mules: mules })
                .eq('id', window.REN.currentUser.id);

            if (error) throw error;

            window.REN.currentProfile.mules = mules;
            populateMules();
            populateInfos();
            window.REN.toast('Mule "' + removed + '" supprimee.', 'success');
        } catch (err) {
            console.error('[REN] Erreur suppression mule:', err);
            window.REN.toast('Erreur lors de la suppression.', 'error');
        }
    }

    /* === AVATAR UPLOAD === */
    function setupAvatarUpload() {
        var avatarInput = document.getElementById('profil-avatar-input');
        if (!avatarInput) return;

        avatarInput.addEventListener('change', function () {
            var file = avatarInput.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                window.REN.toast('Veuillez choisir une image (PNG, JPG, WEBP...)', 'error');
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                window.REN.toast('L\'image ne doit pas depasser 2 Mo.', 'error');
                return;
            }

            selectedAvatarFile = file;

            /* Preview dans le cadre */
            var frameImg = document.querySelector('#profil-stats .avatar-frame__img');
            if (frameImg) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    frameImg.innerHTML = '<img src="' + e.target.result + '" alt="Avatar">';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    /* === SAUVEGARDE PROFIL === */
    function setupProfileForm() {
        var form = document.getElementById('profil-form');
        if (!form) return;

        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            var btn = document.getElementById('profil-save-btn');
            btn.disabled = true;
            btn.textContent = 'Sauvegarde...';

            try {
                var userId = window.REN.currentUser.id;

                /* Upload avatar si change */
                if (selectedAvatarFile) {
                    await uploadAvatar(userId, selectedAvatarFile);
                    selectedAvatarFile = null;
                }

                /* Update champs profil */
                var updates = {
                    classe: document.getElementById('profil-classe').value || null,
                    element: document.getElementById('profil-element').value || null,
                    dofusbook_url: document.getElementById('profil-dofusbook').value.trim() || null
                };

                var { error } = await window.REN.supabase
                    .from('profiles')
                    .update(updates)
                    .eq('id', userId);

                if (error) throw error;

                /* Mettre a jour en memoire */
                Object.assign(window.REN.currentProfile, updates);

                window.REN.toast('Profil mis a jour !', 'success');
            } catch (err) {
                console.error('[REN] Erreur sauvegarde profil:', err);
                window.REN.toast('Erreur lors de la sauvegarde.', 'error');
            }

            btn.disabled = false;
            btn.textContent = 'Sauvegarder';
        });
    }

    /* === UPLOAD AVATAR === */
    async function uploadAvatar(userId, file) {
        var ext = file.name.split('.').pop().toLowerCase();
        var filePath = userId + '.' + ext;

        var { error: uploadError } = await window.REN.supabase.storage
            .from('avatars')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) {
            console.error('[REN] Erreur upload avatar:', uploadError);
            return;
        }

        var { data: urlData } = window.REN.supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        if (urlData && urlData.publicUrl) {
            var publicUrl = urlData.publicUrl + '?t=' + Date.now();
            await window.REN.supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', userId);

            window.REN.currentProfile.avatar_url = publicUrl;
        }
    }

    /* === CHANGEMENT MOT DE PASSE === */
    function setupPasswordForm() {
        var form = document.getElementById('password-form');
        if (!form) return;

        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            var newPassword = document.getElementById('profil-new-password').value;
            var confirmPassword = document.getElementById('profil-confirm-password').value;
            var msgEl = document.getElementById('password-message');

            if (msgEl) { msgEl.className = 'auth-message'; msgEl.textContent = ''; }

            if (!newPassword || newPassword.length < 6) {
                showMsg(msgEl, 'Le mot de passe doit faire au moins 6 caracteres.', 'error');
                return;
            }
            if (newPassword !== confirmPassword) {
                showMsg(msgEl, 'Les mots de passe ne correspondent pas.', 'error');
                return;
            }

            var btn = document.getElementById('password-save-btn');
            btn.disabled = true;
            btn.textContent = 'Modification...';

            try {
                var { error } = await window.REN.supabase.auth.updateUser({
                    password: newPassword
                });

                if (error) throw error;

                window.REN.toast('Mot de passe modifie !', 'success');
                form.reset();
                if (msgEl) { msgEl.className = 'auth-message'; msgEl.textContent = ''; }
            } catch (err) {
                console.error('[REN] Erreur changement mdp:', err);
                showMsg(msgEl, err.message || 'Impossible de modifier le mot de passe.', 'error');
            }

            btn.disabled = false;
            btn.textContent = 'Modifier le mot de passe';
        });
    }

    function showMsg(el, text, type) {
        if (!el) return;
        el.textContent = text;
        el.className = 'auth-message auth-message--' + type;
    }

    /* === STATISTIQUES PERSO === */
    async function loadStats() {
        var container = document.getElementById('profil-stats');
        if (!container) return;

        try {
            var { data, error } = await window.REN.supabase.rpc('get_member_stats');
            if (error) throw error;

            var userId = window.REN.currentUser.id;
            var myStats = null;
            (data || []).forEach(function (m) {
                if (m.user_id === userId) myStats = m;
            });

            if (!myStats) {
                container.innerHTML = '<p class="text-muted">Aucune statistique disponible.</p>';
                return;
            }

            var totalAtk = myStats.total_attaques || 0;
            var winAtk = myStats.victoires_attaque || 0;
            var totalDef = myStats.total_defenses || 0;
            var winDef = myStats.victoires_defense || 0;
            var totalCombats = totalAtk + totalDef;
            var totalVictoires = winAtk + winDef;
            var totalDefaites = totalCombats - totalVictoires;
            var winrateGlobal = totalCombats > 0 ? Math.round(totalVictoires / totalCombats * 100) : 0;
            var winrateAtk = totalAtk > 0 ? Math.round(winAtk / totalAtk * 100) : 0;
            var winrateDef = totalDef > 0 ? Math.round(winDef / totalDef * 100) : 0;

            var totalPts = myStats.total_points || 0;
            var tier = window.REN.getTierFromPoints(totalPts);
            var avatarUrl = window.REN.currentProfile.avatar_url || '';

            /* === BLOC 1 : Rang + Progression (dans #profil-rank) === */
            var rankContainer = document.getElementById('profil-rank');
            if (rankContainer) {
                var rankHtml = '';
                rankHtml += '<div class="profil-avatar-section">';
                rankHtml += '<div class="profil-avatar-section__frame" id="profil-avatar-clickable">';
                rankHtml += window.REN.buildAvatarFrame(avatarUrl, totalPts);
                rankHtml += '<div class="profil-avatar-section__overlay"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>';
                rankHtml += '</div>';
                rankHtml += '<span class="tier-badge tier-badge--' + tier.key + '">' + tier.name + '</span>';
                rankHtml += '<span style="font-weight: 600; font-size: 0.85rem; color: var(--color-text-primary);">' + tier.title + '</span>';
                rankHtml += '<span class="text-muted" style="font-size: 0.75rem;">' + totalPts + ' points PVP</span>';
                rankHtml += '</div>';
                rankHtml += buildProgressionSection(totalPts, tier);
                rankContainer.innerHTML = rankHtml;
            }

            /* === BLOC 2 : Stats combats (dans #profil-stats) === */
            var html = '';

            html += '<div class="profil-stats-section">';
            html += '<h3 class="profil-stats-section__title">Combats</h3>';
            html += '<div class="profil-stats-row">';
            html += buildStatItem('Total', totalCombats);
            html += buildStatItem('Victoires', totalVictoires, 'success');
            html += buildStatItem('Defaites', totalDefaites, 'danger');
            html += buildStatItem('Winrate', winrateGlobal + '%', winrateGlobal >= 50 ? 'success' : 'danger');
            html += '</div>';
            html += '</div>';

            html += '<div class="profil-stats-section">';
            html += '<h3 class="profil-stats-section__title">Attaque</h3>';
            html += '<div class="profil-stats-row">';
            html += buildStatItem('Combats', totalAtk);
            html += buildStatItem('Victoires', winAtk, 'success');
            html += buildStatItem('Defaites', totalAtk - winAtk, 'danger');
            html += buildStatItem('Winrate', winrateAtk + '%', winrateAtk >= 50 ? 'success' : 'danger');
            html += '</div>';
            html += '</div>';

            html += '<div class="profil-stats-section">';
            html += '<h3 class="profil-stats-section__title">Defense</h3>';
            html += '<div class="profil-stats-row">';
            html += buildStatItem('Combats', totalDef);
            html += buildStatItem('Victoires', winDef, 'success');
            html += buildStatItem('Defaites', totalDef - winDef, 'danger');
            html += buildStatItem('Winrate', winrateDef + '%', winrateDef >= 50 ? 'success' : 'danger');
            html += '</div>';
            html += '</div>';

            html += '<div class="profil-stats-section">';
            html += '<h3 class="profil-stats-section__title">Recompenses</h3>';
            html += '<div class="profil-stats-row">';
            html += buildStatItem('Points', myStats.total_points || 0, 'accent');
            html += buildStatItem('Kamas', window.REN.formatKamas(myStats.total_kamas || 0), 'warning');
            html += buildStatItem('Jetons', myStats.jetons || 0);
            html += '</div>';
            html += '</div>';

            container.innerHTML = html;

            /* Rendre le cadre avatar cliquable */
            var avatarClickable = document.getElementById('profil-avatar-clickable');
            var avatarInput = document.getElementById('profil-avatar-input');
            if (avatarClickable && avatarInput) {
                avatarClickable.addEventListener('click', function () {
                    avatarInput.click();
                });
            }

            /* Claim automatique des recompenses de palier */
            var rewardResult = await window.REN.claimTierRewards(totalPts);
            if (rewardResult) {
                showTierRewardPopup(rewardResult);
            }

        } catch (err) {
            console.error('[REN] Erreur stats profil:', err);
            container.innerHTML = '<p class="text-muted">Erreur de chargement des statistiques.</p>';
        }
    }

    function buildStatItem(label, value, color) {
        var valueClass = 'profil-stat-item__value';
        if (color) valueClass += ' profil-stat-item__value--' + color;
        var html = '<div class="profil-stat-item">';
        html += '<span class="profil-stat-item__label">' + label + '</span>';
        html += '<span class="' + valueClass + '">' + value + '</span>';
        html += '</div>';
        return html;
    }

    /* === SECTION PROGRESSION TIERS === */
    function buildProgressionSection(totalPts, currentTier) {
        var TIERS = window.REN.TIERS_ASC;

        var currentIndex = -1;
        for (var i = 0; i < TIERS.length; i++) {
            if (TIERS[i].key === currentTier.key) { currentIndex = i; break; }
        }

        var nextTier = (currentIndex < TIERS.length - 1) ? TIERS[currentIndex + 1] : null;

        var html = '<div class="profil-progression">';
        html += '<h3 class="profil-stats-section__title">Progression</h3>';

        if (nextTier) {
            var ptsInTier = totalPts - TIERS[currentIndex].min;
            var ptsNeeded = nextTier.min - TIERS[currentIndex].min;
            var pct = Math.min(100, Math.round(ptsInTier / ptsNeeded * 100));
            var ptsRestants = nextTier.min - totalPts;

            /* Bloc compact : mini cadre + infos + barre */
            html += '<div class="profil-progression__compact">';
            html += '<div class="profil-progression__compact-frame">';
            html += window.REN.buildAvatarFrame(null, nextTier.min, 40);
            html += '</div>';
            html += '<div class="profil-progression__compact-body">';
            html += '<div class="profil-progression__compact-header">';
            html += '<span class="tier-badge tier-badge--' + nextTier.key + '">' + nextTier.name + '</span>';
            html += '<span class="profil-progression__compact-title">' + nextTier.title + '</span>';
            if (nextTier.reward > 0) {
                html += '<span class="profil-progression__reward-hint">&#127942; +' + nextTier.reward + ' jetons bonus</span>';
            }
            html += '</div>';
            html += '<div class="profil-progression__bar">';
            html += '<div class="profil-progression__bar-fill profil-progression__bar-fill--' + nextTier.key + '" style="width:' + pct + '%;"></div>';
            html += '</div>';
            html += '<div class="profil-progression__compact-footer">';
            html += '<span>' + totalPts + ' / ' + nextTier.min + ' pts</span>';
            html += '<span>' + ptsRestants + ' restants</span>';
            html += '</div>';
            html += '</div>';
            html += '</div>';

            /* Teaser paliers restants */
            var remaining = TIERS.length - 1 - (currentIndex + 1);
            if (remaining > 0) {
                html += '<div class="profil-progression__mystery">';
                html += '<span>&#128274; ' + remaining + ' palier' + (remaining > 1 ? 's' : '') + ' superieur' + (remaining > 1 ? 's' : '') + ' a debloquer</span>';
                html += '</div>';
            }
        } else {
            html += '<div class="profil-progression__max">&#11088; Palier maximum atteint !</div>';
        }

        html += '</div>';
        return html;
    }

    /* === POPUP RECOMPENSE PALIER === */
    function showTierRewardPopup(result) {
        var TIERS = window.REN.TIERS_ASC;
        var lastKey = result.newClaims[result.newClaims.length - 1];
        var lastTier = null;
        for (var i = 0; i < TIERS.length; i++) {
            if (TIERS[i].key === lastKey) { lastTier = TIERS[i]; break; }
        }
        if (!lastTier) return;

        var overlay = document.createElement('div');
        overlay.className = 'tier-reward-overlay';

        var popup = document.createElement('div');
        popup.className = 'tier-reward-popup';

        popup.innerHTML =
            '<div class="tier-reward-popup__icon">&#127942;</div>' +
            '<h3 class="tier-reward-popup__title">Nouveau palier !</h3>' +
            '<div class="tier-reward-popup__frame">' +
                window.REN.buildAvatarFrame(window.REN.currentProfile.avatar_url || '', lastTier.min, 80) +
            '</div>' +
            '<span class="tier-badge tier-badge--' + lastTier.key + '">' + lastTier.name + '</span>' +
            '<p class="tier-reward-popup__subtitle">' + lastTier.title + '</p>' +
            '<div class="tier-reward-popup__reward">+' + result.totalBonus + ' jetons</div>' +
            '<button class="btn btn--primary tier-reward-popup__btn">Merci !</button>';

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        /* Animation entree */
        requestAnimationFrame(function () {
            overlay.classList.add('tier-reward-overlay--visible');
        });

        /* Fermeture */
        overlay.querySelector('.tier-reward-popup__btn').addEventListener('click', function () {
            overlay.classList.remove('tier-reward-overlay--visible');
            setTimeout(function () { overlay.remove(); }, 300);
        });
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                overlay.classList.remove('tier-reward-overlay--visible');
                setTimeout(function () { overlay.remove(); }, 300);
            }
        });
    }

})();
