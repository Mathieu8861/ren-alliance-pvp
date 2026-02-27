/* ============================================ */
/* Boutique - Achat ressources & jetons         */
/* ============================================ */
(function () {
    'use strict';

    var items = [];
    var tauxKamas = 5000;
    var userId = null;

    document.addEventListener('ren:ready', init);

    async function init() {
        if (!window.REN.supabase || !window.REN.currentProfile) return;
        userId = window.REN.currentProfile.id;

        updateSolde();
        await Promise.all([loadConfig(), loadItems(), loadMesAchats(), loadMesDemandes()]);
        setupKamasForm();
    }

    /* === SOLDE DISPLAY === */
    function updateSolde() {
        var el = document.getElementById('boutique-jetons');
        if (el) el.textContent = window.REN.currentProfile.jetons || 0;
    }

    /* === LOAD CONFIG (taux kamas) === */
    async function loadConfig() {
        try {
            var { data } = await window.REN.supabase
                .from('boutique_config')
                .select('taux_kamas_par_jeton')
                .single();
            if (data) tauxKamas = data.taux_kamas_par_jeton;
            var tauxEl = document.getElementById('kamas-taux');
            if (tauxEl) tauxEl.textContent = 'Taux : 1 jeton = ' + window.REN.formatKamas(tauxKamas) + ' kamas';
        } catch (err) {
            console.error('[REN-BOUTIQUE] Erreur config:', err);
        }
    }

    /* === LOAD ITEMS === */
    async function loadItems() {
        var container = document.getElementById('boutique-grid');
        if (!container) return;

        try {
            var { data, error } = await window.REN.supabase
                .from('boutique_items')
                .select('*')
                .eq('actif', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            items = data || [];
            renderItems();
        } catch (err) {
            console.error('[REN-BOUTIQUE] Erreur items:', err);
            container.innerHTML = '<p class="text-muted">Erreur de chargement.</p>';
        }
    }

    function renderItems() {
        var container = document.getElementById('boutique-grid');
        if (!container) return;

        if (!items.length) {
            container.innerHTML = '<p class="text-muted">Aucun article en vente pour le moment.</p>';
            return;
        }

        var html = '';
        items.forEach(function (item) {
            var stockText = '';
            if (item.stock > 0) {
                stockText = '<span class="boutique-card__stock">' + item.stock + ' en stock</span>';
            } else if (item.stock === 0) {
                stockText = '<span class="boutique-card__stock" style="color:var(--color-danger);">Rupture</span>';
            }

            var imageHtml = '';
            if (item.image_url) {
                imageHtml = '<img class="boutique-card__image" src="' + item.image_url + '" alt="' + item.nom + '" loading="lazy">';
            } else {
                imageHtml = '<div class="boutique-card__image--placeholder">?</div>';
            }

            var canBuy = item.stock !== 0;
            var jetons = window.REN.currentProfile.jetons || 0;

            html += '<div class="boutique-card">';
            html += imageHtml;
            html += '<div class="boutique-card__body">';
            html += '<div class="boutique-card__nom">' + item.nom + '</div>';
            if (item.description) html += '<div class="boutique-card__desc">' + item.description + '</div>';
            html += stockText;
            html += '</div>';
            html += '<div class="boutique-card__footer">';
            html += '<span class="boutique-card__prix">' + item.prix_jetons + ' <img class="icon-inline" src="assets/images/jeton.png" alt="jetons"></span>';
            html += '<button class="boutique-card__btn btn-acheter" data-id="' + item.id + '" data-nom="' + item.nom + '" data-prix="' + item.prix_jetons + '"' + (!canBuy ? ' disabled' : '') + '>';
            html += canBuy ? 'Acheter' : 'Indisponible';
            html += '</button>';
            html += '</div>';
            html += '</div>';
        });

        container.innerHTML = html;

        /* Event listeners acheter (anti double-clic) */
        container.querySelectorAll('.btn-acheter').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (btn.disabled) return;
                var id = parseInt(btn.dataset.id);
                var nom = btn.dataset.nom;
                var prix = parseInt(btn.dataset.prix);
                acheterItem(id, nom, prix);
            });
        });
    }

    /* === MODALE CONFIRMATION ACHAT === */
    function showModalAchat(itemId, itemNom, prix, imageUrl) {
        var overlay = document.getElementById('modal-achat');
        var imgDiv = document.getElementById('modal-achat-image');
        var nomEl = document.getElementById('modal-achat-nom');
        var prixEl = document.getElementById('modal-achat-prix');
        var soldeEl = document.getElementById('modal-achat-solde');
        var btnConfirm = document.getElementById('modal-achat-confirm');
        var btnCancel = document.getElementById('modal-achat-cancel');

        if (!overlay) return;

        var jetons = window.REN.currentProfile.jetons || 0;

        /* Remplir la modale */
        imgDiv.innerHTML = imageUrl ? '<img src="' + imageUrl + '" alt="' + itemNom + '">' : '<span style="font-size:2rem;color:var(--color-text-muted);">?</span>';
        nomEl.textContent = itemNom;
        prixEl.innerHTML = prix + ' <img class="icon-inline" src="assets/images/jeton.png" alt="jetons">';
        soldeEl.textContent = 'Solde apr\u00e8s achat : ' + (jetons - prix) + ' jetons';

        overlay.classList.add('active');

        /* Cleanup anciens listeners */
        var newConfirm = btnConfirm.cloneNode(true);
        var newCancel = btnCancel.cloneNode(true);
        btnConfirm.replaceWith(newConfirm);
        btnCancel.replaceWith(newCancel);

        newCancel.addEventListener('click', function () {
            overlay.classList.remove('active');
        });

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) overlay.classList.remove('active');
        });

        newConfirm.addEventListener('click', async function () {
            newConfirm.disabled = true;
            newConfirm.textContent = 'Achat en cours...';
            try {
                await processAchat(itemId, itemNom, prix);
                overlay.classList.remove('active');
            } catch (err) {
                newConfirm.disabled = false;
                newConfirm.textContent = 'Confirmer l\'achat';
            }
        });
    }

    /* === ACHETER UN ARTICLE === */
    function acheterItem(itemId, itemNom, prix) {
        var jetons = window.REN.currentProfile.jetons || 0;
        if (jetons < prix) {
            window.REN.toast('Pas assez de jetons ! (' + jetons + '/' + prix + ')', 'error');
            return;
        }

        /* Trouver l'image de l'item */
        var item = items.find(function (i) { return i.id === itemId; });
        var imageUrl = item ? item.image_url : '';

        showModalAchat(itemId, itemNom, prix, imageUrl);
    }

    async function processAchat(itemId, itemNom, prix) {
        try {
            /* Appel RPC transactionnel : tout en une seule opération */
            var { data: newJetons, error } = await window.REN.supabase
                .rpc('acheter_boutique', {
                    p_user_id: userId,
                    p_item_id: itemId
                });
            if (error) throw error;

            /* Mettre à jour le solde local */
            window.REN.currentProfile.jetons = newJetons;
            updateSolde();

            window.REN.toast('Achat effectu\u00e9 ! Un admin vous distribuera la ressource.', 'success');
            await Promise.all([loadItems(), loadMesAchats()]);

        } catch (err) {
            console.error('[REN-BOUTIQUE] Erreur achat:', err);
            window.REN.toast('Erreur : ' + err.message, 'error');
            throw err;
        }
    }

    /* === ACHETER DES JETONS (KAMAS) === */
    function setupKamasForm() {
        var input = document.getElementById('kamas-input');
        var result = document.getElementById('kamas-result');
        var btn = document.getElementById('btn-demande-kamas');

        if (!input || !result || !btn) return;

        /* Calcul live */
        input.addEventListener('input', function () {
            var kamas = parseInt(input.value) || 0;
            var jetons = Math.floor(kamas / tauxKamas);
            result.textContent = jetons + ' jeton' + (jetons > 1 ? 's' : '');
        });

        /* Envoi demande (anti double-clic) */
        btn.addEventListener('click', async function () {
            if (btn.disabled) return;
            var kamas = parseInt(input.value) || 0;
            var jetons = Math.floor(kamas / tauxKamas);

            if (kamas <= 0) {
                window.REN.toast('Entre un montant de kamas valide.', 'error');
                return;
            }

            if (jetons < 1) {
                window.REN.toast('Le montant doit \u00eatre d\'au moins ' + window.REN.formatKamas(tauxKamas) + ' kamas (= 1 jeton).', 'error');
                return;
            }

            if (!confirm('Envoyer une demande pour ' + window.REN.formatKamas(kamas) + ' kamas (' + jetons + ' jetons) ?\n\nUn admin devra valider apr\u00e8s avoir re\u00e7u vos kamas en jeu.')) return;

            btn.disabled = true;
            try {
                var { error } = await window.REN.supabase
                    .from('boutique_demandes_kamas')
                    .insert({
                        user_id: userId,
                        montant_kamas: kamas,
                        jetons_demandes: jetons
                    });
                if (error) throw error;

                input.value = '';
                result.textContent = '0 jetons';
                window.REN.toast('Demande envoy\u00e9e ! Un admin validera apr\u00e8s l\'\u00e9change en jeu.', 'success');
                await loadMesDemandes();

            } catch (err) {
                console.error('[REN-BOUTIQUE] Erreur demande kamas:', err);
                window.REN.toast('Erreur : ' + err.message, 'error');
            } finally {
                btn.disabled = false;
            }
        });
    }

    /* === MES ACHATS === */
    async function loadMesAchats() {
        var container = document.getElementById('boutique-mes-achats');
        if (!container) return;

        try {
            var { data, error } = await window.REN.supabase
                .from('boutique_achats')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            if (!data || !data.length) {
                container.innerHTML = '<p class="text-muted">Aucun achat.</p>';
                return;
            }

            var html = '<table class="table"><thead><tr>';
            html += '<th>Article</th><th>Prix</th><th>Date</th><th>Statut</th>';
            html += '</tr></thead><tbody>';

            data.forEach(function (a) {
                var date = window.REN.formatDate ? window.REN.formatDate(a.created_at) : new Date(a.created_at).toLocaleDateString('fr-FR');
                var badgeClass = 'badge-statut badge-statut--' + a.statut;
                var statutText = a.statut === 'en_attente' ? 'En attente' : 'Distribu\u00e9';

                html += '<tr>';
                html += '<td>' + a.item_nom + '</td>';
                html += '<td>' + a.prix_paye + ' jetons</td>';
                html += '<td>' + date + '</td>';
                html += '<td><span class="' + badgeClass + '">' + statutText + '</span></td>';
                html += '</tr>';
            });

            html += '</tbody></table>';
            container.innerHTML = html;

        } catch (err) {
            console.error('[REN-BOUTIQUE] Erreur mes achats:', err);
            container.innerHTML = '<p class="text-muted">Erreur de chargement.</p>';
        }
    }

    /* === MES DEMANDES KAMAS === */
    async function loadMesDemandes() {
        var container = document.getElementById('boutique-mes-demandes');
        if (!container) return;

        try {
            var { data, error } = await window.REN.supabase
                .from('boutique_demandes_kamas')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            if (!data || !data.length) {
                container.innerHTML = '<p class="text-muted">Aucune demande.</p>';
                return;
            }

            var html = '<table class="table"><thead><tr>';
            html += '<th>Kamas</th><th>Jetons</th><th>Date</th><th>Statut</th>';
            html += '</tr></thead><tbody>';

            data.forEach(function (d) {
                var date = window.REN.formatDate ? window.REN.formatDate(d.created_at) : new Date(d.created_at).toLocaleDateString('fr-FR');
                var badgeClass = 'badge-statut badge-statut--' + d.statut;
                var statutText = d.statut === 'en_attente' ? 'En attente' : d.statut === 'valide' ? 'Valid\u00e9' : 'Refus\u00e9';

                html += '<tr>';
                html += '<td>' + window.REN.formatKamas(d.montant_kamas) + '</td>';
                html += '<td>' + d.jetons_demandes + ' jetons</td>';
                html += '<td>' + date + '</td>';
                html += '<td><span class="' + badgeClass + '">' + statutText + '</span></td>';
                html += '</tr>';
            });

            html += '</tbody></table>';
            container.innerHTML = html;

        } catch (err) {
            console.error('[REN-BOUTIQUE] Erreur mes demandes:', err);
            container.innerHTML = '<p class="text-muted">Erreur de chargement.</p>';
        }
    }

})();
