/* ============================================ */
/* Alliance REN - Admin Panel                  */
/* Gestion complete de l'alliance              */
/* ============================================ */
(function () {
    'use strict';

    var currentTab = 'validation';

    document.addEventListener('ren:ready', init);

    function init() {
        if (!window.REN.supabase || !window.REN.currentProfile) return;
        if (!window.REN.currentProfile.is_admin) {
            window.location.href = 'index.html';
            return;
        }
        setupTabs();
        setupLogout();
        loadTab(currentTab);
    }

    function setupLogout() {
        var btn = document.getElementById('btn-logout');
        if (!btn) return;
        btn.addEventListener('click', async function () {
            await window.REN.supabase.auth.signOut();
            window.location.href = 'connexion.html';
        });
    }

    /* === TABS === */
    function setupTabs() {
        var container = document.getElementById('admin-tabs');
        if (!container) return;
        container.addEventListener('click', function (e) {
            var btn = e.target.closest('.admin-tabs__btn');
            if (!btn) return;
            container.querySelectorAll('.admin-tabs__btn').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            currentTab = btn.getAttribute('data-tab');
            loadTab(currentTab);
        });
    }

    async function loadTab(tab) {
        var content = document.getElementById('admin-content');
        if (!content) return;
        content.innerHTML = '<div class="loading"><div class="spinner"></div> Chargement...</div>';

        try {
            switch (tab) {
                case 'validation': await tabValidation(content); break;
                case 'utilisateurs': await tabUtilisateurs(content); break;
                case 'alliances': await tabAlliances(content); break;
                case 'bareme': await tabBareme(content); break;
                case 'builds': await tabBuilds(content); break;
                case 'jeu-config': await tabJeuConfig(content); break;
                case 'jeu-lots': await tabJeuLots(content); break;
                case 'jeu-historique': await tabJeuHistorique(content); break;
                default: content.innerHTML = '<p class="text-muted">Onglet inconnu.</p>';
            }
        } catch (err) {
            console.error('[REN] Erreur admin tab:', err);
            content.innerHTML = '<p class="text-muted" style="padding:1rem;">Erreur: ' + err.message + '</p>';
        }
    }

    /* === TAB: VALIDATION === */
    async function tabValidation(container) {
        var { data: pending } = await window.REN.supabase
            .from('profiles').select('*').eq('is_validated', false).order('created_at');

        var html = '<div class="admin-panel__title">Validations en attente</div>';

        if (!pending || !pending.length) {
            html += '<p class="text-muted text-center">Aucune inscription en attente.</p>';
            container.innerHTML = html;
            return;
        }

        html += '<div class="table-wrapper"><table class="table">';
        html += '<thead><tr><th>Pseudo</th><th>Classe</th><th>Element</th><th>Date</th><th>Actions</th></tr></thead><tbody>';

        pending.forEach(function (p) {
            html += '<tr>';
            html += '<td>' + p.username + '</td>';
            html += '<td>' + (p.classe || '-') + '</td>';
            html += '<td>' + (p.element || '-') + '</td>';
            html += '<td>' + window.REN.formatDateFull(p.created_at) + '</td>';
            html += '<td>';
            html += '<button class="btn btn--primary btn--small admin-validate" data-id="' + p.id + '">Valider</button> ';
            html += '<button class="btn btn--danger btn--small admin-reject" data-id="' + p.id + '">Refuser</button>';
            html += '</td>';
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;

        /* Event listeners */
        container.querySelectorAll('.admin-validate').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                await window.REN.supabase.from('profiles').update({ is_validated: true }).eq('id', btn.dataset.id);
                window.REN.toast('Utilisateur valide !', 'success');
                loadTab('validation');
            });
        });

        container.querySelectorAll('.admin-reject').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                if (!confirm('Supprimer cet utilisateur ?')) return;
                await window.REN.supabase.from('profiles').delete().eq('id', btn.dataset.id);
                window.REN.toast('Utilisateur supprime.', 'info');
                loadTab('validation');
            });
        });
    }

    /* === TAB: UTILISATEURS === */
    async function tabUtilisateurs(container) {
        var { data: users } = await window.REN.supabase
            .from('profiles').select('*').eq('is_validated', true).order('username');

        var html = '<div class="admin-panel__title">Gestion des Utilisateurs</div>';
        html += '<div class="table-wrapper"><table class="table">';
        html += '<thead><tr><th>Pseudo</th><th>Classe</th><th>Element</th><th>Jetons</th><th>Admin</th><th>Actions</th></tr></thead><tbody>';

        (users || []).forEach(function (u) {
            html += '<tr>';
            html += '<td>' + u.username + '</td>';
            html += '<td>' + (u.classe || '-') + '</td>';
            html += '<td>' + (u.element || '-') + '</td>';
            html += '<td>' + (u.jetons || 0) + '</td>';
            html += '<td>' + (u.is_admin ? '<span class="text-accent">OUI</span>' : 'Non') + '</td>';
            html += '<td>';
            html += '<button class="btn btn--secondary btn--small admin-toggle-admin" data-id="' + u.id + '" data-admin="' + u.is_admin + '">' + (u.is_admin ? 'Retirer admin' : 'Rendre admin') + '</button> ';
            html += '<input type="number" class="bareme-grid__input admin-jetons-input" data-id="' + u.id + '" value="' + (u.jetons || 0) + '" style="width:70px;"> ';
            html += '<button class="btn btn--primary btn--small admin-save-jetons" data-id="' + u.id + '">Sauver jetons</button>';
            html += '</td>';
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;

        /* Toggle admin */
        container.querySelectorAll('.admin-toggle-admin').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                var newAdmin = btn.dataset.admin === 'true' ? false : true;
                await window.REN.supabase.from('profiles').update({ is_admin: newAdmin }).eq('id', btn.dataset.id);
                window.REN.toast('Role admin mis a jour.', 'success');
                loadTab('utilisateurs');
            });
        });

        /* Save jetons */
        container.querySelectorAll('.admin-save-jetons').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                var input = container.querySelector('.admin-jetons-input[data-id="' + btn.dataset.id + '"]');
                if (!input) return;
                await window.REN.supabase.from('profiles').update({ jetons: parseInt(input.value) || 0 }).eq('id', btn.dataset.id);
                window.REN.toast('Jetons mis a jour.', 'success');
            });
        });
    }

    /* === TAB: ALLIANCES === */
    async function tabAlliances(container) {
        var { data: alliances } = await window.REN.supabase.from('alliances').select('*').order('nom');

        var html = '<div class="admin-panel__title">Gestion des Alliances</div>';

        /* Formulaire ajout */
        html += '<div style="display:flex;gap:var(--spacing-sm);margin-bottom:var(--spacing-lg);flex-wrap:wrap;">';
        html += '<input class="form-input" id="add-alliance-nom" placeholder="Nom de l\'alliance" style="flex:2;min-width:150px;">';
        html += '<input class="form-input" id="add-alliance-tag" placeholder="Tag" style="flex:1;min-width:80px;">';
        html += '<input class="form-input" id="add-alliance-mult" type="number" placeholder="Multiplicateur" value="1" min="1" style="flex:1;min-width:80px;">';
        html += '<button class="btn btn--primary btn--small" id="btn-add-alliance">Ajouter</button>';
        html += '</div>';

        /* Liste */
        html += '<div class="table-wrapper"><table class="table">';
        html += '<thead><tr><th>Nom</th><th>Tag</th><th>Mult.</th><th>Actions</th></tr></thead><tbody>';

        (alliances || []).forEach(function (a) {
            html += '<tr data-row-id="' + a.id + '">';
            /* Mode affichage */
            html += '<td class="cell-display" data-field="nom">' + a.nom + '</td>';
            html += '<td class="cell-display" data-field="tag">' + (a.tag || '-') + '</td>';
            html += '<td class="cell-display" data-field="mult">x' + a.multiplicateur + '</td>';
            /* Mode edition (masque par defaut) */
            html += '<td class="cell-edit" data-field="nom" style="display:none;"><input class="form-input edit-alliance-nom" value="' + a.nom + '" style="width:100%;"></td>';
            html += '<td class="cell-edit" data-field="tag" style="display:none;"><input class="form-input edit-alliance-tag" value="' + (a.tag || '') + '" style="width:100%;"></td>';
            html += '<td class="cell-edit" data-field="mult" style="display:none;"><input class="form-input edit-alliance-mult" type="number" value="' + a.multiplicateur + '" min="1" style="width:80px;"></td>';
            /* Boutons */
            html += '<td>';
            html += '<span class="actions-display">';
            html += '<button class="table__action admin-edit-alliance" data-id="' + a.id + '">Modifier</button> ';
            html += '<button class="table__action table__action--danger admin-delete-alliance" data-id="' + a.id + '">Supprimer</button>';
            html += '</span>';
            html += '<span class="actions-edit" style="display:none;">';
            html += '<button class="btn btn--primary btn--small admin-save-alliance" data-id="' + a.id + '">Sauver</button> ';
            html += '<button class="btn btn--secondary btn--small admin-cancel-alliance" data-id="' + a.id + '">Annuler</button>';
            html += '</span>';
            html += '</td>';
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;

        /* Ajouter */
        document.getElementById('btn-add-alliance').addEventListener('click', async function () {
            var nom = document.getElementById('add-alliance-nom').value.trim();
            var tag = document.getElementById('add-alliance-tag').value.trim();
            var mult = parseInt(document.getElementById('add-alliance-mult').value) || 1;
            if (!nom) { window.REN.toast('Entrez un nom.', 'error'); return; }
            await window.REN.supabase.from('alliances').insert({ nom: nom, tag: tag || null, multiplicateur: mult });
            window.REN.toast('Alliance ajoutee !', 'success');
            loadTab('alliances');
        });

        /* Modifier - passer en mode edition */
        container.querySelectorAll('.admin-edit-alliance').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var row = container.querySelector('tr[data-row-id="' + btn.dataset.id + '"]');
                if (!row) return;
                row.querySelectorAll('.cell-display').forEach(function (td) { td.style.display = 'none'; });
                row.querySelectorAll('.cell-edit').forEach(function (td) { td.style.display = ''; });
                row.querySelector('.actions-display').style.display = 'none';
                row.querySelector('.actions-edit').style.display = '';
            });
        });

        /* Annuler - revenir en mode affichage */
        container.querySelectorAll('.admin-cancel-alliance').forEach(function (btn) {
            btn.addEventListener('click', function () {
                loadTab('alliances');
            });
        });

        /* Sauver */
        container.querySelectorAll('.admin-save-alliance').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                var row = container.querySelector('tr[data-row-id="' + btn.dataset.id + '"]');
                if (!row) return;
                var nom = row.querySelector('.edit-alliance-nom').value.trim();
                var tag = row.querySelector('.edit-alliance-tag').value.trim();
                var mult = parseInt(row.querySelector('.edit-alliance-mult').value) || 1;
                if (!nom) { window.REN.toast('Le nom ne peut pas etre vide.', 'error'); return; }
                var { error } = await window.REN.supabase.from('alliances').update({ nom: nom, tag: tag || null, multiplicateur: mult }).eq('id', btn.dataset.id);
                if (error) { window.REN.toast('Erreur: ' + error.message, 'error'); return; }
                window.REN.toast('Alliance modifiee !', 'success');
                loadTab('alliances');
            });
        });

        /* Supprimer */
        container.querySelectorAll('.admin-delete-alliance').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                if (!confirm('Supprimer cette alliance ?')) return;
                await window.REN.supabase.from('alliances').delete().eq('id', btn.dataset.id);
                window.REN.toast('Alliance supprimee.', 'info');
                loadTab('alliances');
            });
        });
    }

    /* === TAB: BAREME === */
    var baremeMode = 'attaque'; /* attaque ou defense */

    async function tabBareme(container) {
        var { data: bareme } = await window.REN.supabase
            .from('bareme_points').select('*').order('nb_allies').order('nb_ennemis');

        var html = '<div class="admin-panel__title">Bareme de Points</div>';
        html += '<div class="admin-panel__desc">Configurez les points gagnes/perdus en fonction du nombre d\'allies et d\'ennemis.<br>Chaque cellule : <span style="color:var(--color-success);">victoire</span> / <span style="color:var(--color-danger);">defaite</span></div>';

        /* Sous-tabs attaque / defense */
        html += '<div style="display:flex;gap:var(--spacing-sm);margin-bottom:var(--spacing-lg);">';
        html += '<button class="btn btn--small bareme-type-btn' + (baremeMode === 'attaque' ? ' btn--primary' : ' btn--secondary') + '" data-bareme-type="attaque">Bareme Attaque</button>';
        html += '<button class="btn btn--small bareme-type-btn' + (baremeMode === 'defense' ? ' btn--primary' : ' btn--secondary') + '" data-bareme-type="defense">Bareme Defense</button>';
        html += '</div>';

        /* Filtrer par type */
        var filtered = (bareme || []).filter(function (b) { return b.type === baremeMode; });

        html += '<div class="bareme-grid"><table class="table">';

        /* Header */
        html += '<thead><tr><th>Allies \\ Ennemis</th>';
        for (var e = 1; e <= 5; e++) html += '<th>' + e + ' enn.</th>';
        html += '</tr></thead><tbody>';

        /* Lignes */
        for (var a = 1; a <= 5; a++) {
            html += '<tr><th>' + a + ' allie' + (a > 1 ? 's' : '') + '</th>';
            for (var ee = 1; ee <= 5; ee++) {
                var cell = filtered.find(function (b) { return b.nb_allies === a && b.nb_ennemis === ee; });
                var pv = cell ? cell.points_victoire : 0;
                var pd = cell ? cell.points_defaite : 0;
                html += '<td>';
                html += '<input class="bareme-grid__input bareme-grid__input--victoire bareme-input" data-allies="' + a + '" data-ennemis="' + ee + '" data-field="victoire" value="' + pv + '" title="Victoire">';
                html += ' / ';
                html += '<input class="bareme-grid__input bareme-grid__input--defaite bareme-input" data-allies="' + a + '" data-ennemis="' + ee + '" data-field="defaite" value="' + pd + '" title="Defaite">';
                html += '</td>';
            }
            html += '</tr>';
        }

        html += '</tbody></table></div>';
        html += '<div class="text-center mt-lg"><button class="btn btn--primary" id="btn-save-bareme">Sauvegarder le bareme ' + baremeMode + '</button></div>';
        container.innerHTML = html;

        /* Switch attaque / defense */
        container.querySelectorAll('.bareme-type-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                baremeMode = btn.dataset.baremeType;
                tabBareme(container);
            });
        });

        /* Save */
        document.getElementById('btn-save-bareme').addEventListener('click', async function () {
            var inputs = container.querySelectorAll('.bareme-input');
            var updates = {};

            inputs.forEach(function (input) {
                var key = input.dataset.allies + '-' + input.dataset.ennemis;
                if (!updates[key]) updates[key] = { nb_allies: parseInt(input.dataset.allies), nb_ennemis: parseInt(input.dataset.ennemis) };
                if (input.dataset.field === 'victoire') updates[key].points_victoire = parseInt(input.value) || 0;
                else updates[key].points_defaite = parseInt(input.value) || 0;
            });

            try {
                for (var key in updates) {
                    var u = updates[key];
                    await window.REN.supabase.from('bareme_points')
                        .update({ points_victoire: u.points_victoire, points_defaite: u.points_defaite })
                        .eq('nb_allies', u.nb_allies).eq('nb_ennemis', u.nb_ennemis).eq('type', baremeMode);
                }
                window.REN.toast('Bareme ' + baremeMode + ' sauvegarde !', 'success');
            } catch (err) {
                window.REN.toast('Erreur: ' + err.message, 'error');
            }
        });
    }

    /* === TAB: BUILDS === */
    async function tabBuilds(container) {
        var { data: builds } = await window.REN.supabase.from('builds').select('*').order('created_at', { ascending: false });

        var html = '<div class="admin-panel__title">Gestion des Builds</div>';

        /* Formulaire */
        html += '<div style="margin-bottom:var(--spacing-lg);">';
        html += '<div class="form-group"><input class="form-input" id="add-build-titre" placeholder="Titre du build"></div>';
        html += '<div class="form-group"><textarea class="form-input" id="add-build-desc" placeholder="Description..." rows="3" style="resize:vertical;"></textarea></div>';
        html += '<div class="form-group"><input class="form-input" id="add-build-lien" placeholder="Lien Dofusbook (optionnel)"></div>';
        html += '<button class="btn btn--primary btn--small" id="btn-add-build">Ajouter le build</button>';
        html += '</div>';

        /* Liste */
        if (builds && builds.length) {
            html += '<div class="table-wrapper"><table class="table">';
            html += '<thead><tr><th>Titre</th><th>Lien</th><th>Actions</th></tr></thead><tbody>';
            builds.forEach(function (b) {
                html += '<tr>';
                html += '<td>' + b.titre + '</td>';
                html += '<td>' + (b.lien_dofusbook ? '<a href="' + b.lien_dofusbook + '" target="_blank" class="text-accent">Lien</a>' : '-') + '</td>';
                html += '<td><button class="table__action table__action--danger admin-delete-build" data-id="' + b.id + '">Supprimer</button></td>';
                html += '</tr>';
            });
            html += '</tbody></table></div>';
        }

        container.innerHTML = html;

        document.getElementById('btn-add-build').addEventListener('click', async function () {
            var titre = document.getElementById('add-build-titre').value.trim();
            if (!titre) { window.REN.toast('Entrez un titre.', 'error'); return; }
            var desc = document.getElementById('add-build-desc').value.trim();
            var lien = document.getElementById('add-build-lien').value.trim();
            await window.REN.supabase.from('builds').insert({ titre: titre, description: desc, lien_dofusbook: lien || '' });
            window.REN.toast('Build ajoute !', 'success');
            loadTab('builds');
        });

        container.querySelectorAll('.admin-delete-build').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                if (!confirm('Supprimer ce build ?')) return;
                await window.REN.supabase.from('builds').delete().eq('id', btn.dataset.id);
                window.REN.toast('Build supprime.', 'info');
                loadTab('builds');
            });
        });
    }

    /* === TAB: JEU CONFIG === */
    async function tabJeuConfig(container) {
        var { data: config } = await window.REN.supabase.from('jeu_config').select('*').single();

        var html = '<div class="admin-panel__title">Configuration du Jeu</div>';
        html += '<div class="form-group">';
        html += '<label class="form-label">Prix d\'un tirage (jetons)</label>';
        html += '<input class="form-input" id="jeu-prix" type="number" value="' + (config ? config.prix_tirage : 12) + '" min="1">';
        html += '</div>';
        html += '<button class="btn btn--primary" id="btn-save-jeu-config">Sauvegarder</button>';
        container.innerHTML = html;

        document.getElementById('btn-save-jeu-config').addEventListener('click', async function () {
            var prix = parseInt(document.getElementById('jeu-prix').value) || 12;
            await window.REN.supabase.from('jeu_config').update({ prix_tirage: prix }).eq('id', config.id);
            window.REN.toast('Config sauvegardee !', 'success');
        });
    }

    /* === TAB: JEU LOTS === */
    async function tabJeuLots(container) {
        var { data: lots } = await window.REN.supabase.from('jeu_lots').select('*').order('pourcentage', { ascending: false });

        var html = '<div class="admin-panel__title">Gestion des Lots</div>';

        /* Formulaire */
        html += '<div style="display:flex;gap:var(--spacing-sm);margin-bottom:var(--spacing-lg);flex-wrap:wrap;">';
        html += '<input class="form-input" id="add-lot-nom" placeholder="Nom du lot" style="flex:2;min-width:150px;">';
        html += '<input class="form-input" id="add-lot-pourcent" type="number" placeholder="%" min="0" max="100" step="0.01" style="flex:1;min-width:80px;">';
        html += '<input class="form-input" id="add-lot-jetons" type="number" placeholder="Gain jetons" min="0" value="0" style="flex:1;min-width:80px;">';
        html += '<button class="btn btn--primary btn--small" id="btn-add-lot">Ajouter</button>';
        html += '</div>';

        /* Liste */
        if (lots && lots.length) {
            html += '<div class="table-wrapper"><table class="table">';
            html += '<thead><tr><th>Lot</th><th>%</th><th>Gain jetons</th><th>Actions</th></tr></thead><tbody>';
            lots.forEach(function (l) {
                html += '<tr>';
                html += '<td>' + l.nom + '</td>';
                html += '<td>' + l.pourcentage + '%</td>';
                html += '<td>' + (l.gain_jetons || 0) + '</td>';
                html += '<td><button class="table__action table__action--danger admin-delete-lot" data-id="' + l.id + '">Supprimer</button></td>';
                html += '</tr>';
            });
            html += '</tbody></table></div>';
        }

        container.innerHTML = html;

        document.getElementById('btn-add-lot').addEventListener('click', async function () {
            var nom = document.getElementById('add-lot-nom').value.trim();
            var pourcent = parseFloat(document.getElementById('add-lot-pourcent').value);
            var jetons = parseInt(document.getElementById('add-lot-jetons').value) || 0;
            if (!nom || isNaN(pourcent)) { window.REN.toast('Remplissez nom et pourcentage.', 'error'); return; }
            await window.REN.supabase.from('jeu_lots').insert({ nom: nom, pourcentage: pourcent, gain_jetons: jetons });
            window.REN.toast('Lot ajoute !', 'success');
            loadTab('jeu-lots');
        });

        container.querySelectorAll('.admin-delete-lot').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                if (!confirm('Supprimer ce lot ?')) return;
                await window.REN.supabase.from('jeu_lots').delete().eq('id', btn.dataset.id);
                window.REN.toast('Lot supprime.', 'info');
                loadTab('jeu-lots');
            });
        });
    }

    /* === TAB: JEU HISTORIQUE === */
    async function tabJeuHistorique(container) {
        var { data: historique } = await window.REN.supabase
            .from('jeu_historique')
            .select('*, user:profiles(username), lot:jeu_lots(nom)')
            .order('created_at', { ascending: false })
            .limit(50);

        var html = '<div class="admin-panel__title">Historique des Tirages</div>';

        if (!historique || !historique.length) {
            html += '<p class="text-muted text-center">Aucun tirage effectue.</p>';
            container.innerHTML = html;
            return;
        }

        html += '<div class="table-wrapper"><table class="table">';
        html += '<thead><tr><th>Joueur</th><th>Lot</th><th>Resultat</th><th>Donne</th><th>Date</th><th>Actions</th></tr></thead><tbody>';

        historique.forEach(function (h) {
            html += '<tr>';
            html += '<td>' + (h.user ? h.user.username : '?') + '</td>';
            html += '<td>' + (h.lot ? h.lot.nom : '?') + '</td>';
            html += '<td>' + h.resultat + '</td>';
            html += '<td>' + (h.donne ? '<span class="text-success">Oui</span>' : '<span class="text-danger">Non</span>') + '</td>';
            html += '<td>' + window.REN.formatDateFull(h.created_at) + '</td>';
            html += '<td>';
            if (!h.donne) {
                html += '<button class="btn btn--primary btn--small admin-mark-given" data-id="' + h.id + '">Marquer donne</button>';
            }
            html += '</td>';
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;

        container.querySelectorAll('.admin-mark-given').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                await window.REN.supabase.from('jeu_historique').update({ donne: true }).eq('id', btn.dataset.id);
                window.REN.toast('Lot marque comme donne.', 'success');
                loadTab('jeu-historique');
            });
        });
    }
})();
