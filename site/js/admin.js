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

    /* === SIDEBAR TABS === */
    function setupTabs() {
        var sidebar = document.getElementById('admin-sidebar');
        var overlay = document.getElementById('admin-sidebar-overlay');
        var toggle = document.getElementById('admin-sidebar-toggle');
        if (!sidebar) return;

        /* Navigation onglets */
        sidebar.addEventListener('click', function (e) {
            var btn = e.target.closest('.admin-sidebar__btn');
            if (!btn) return;
            sidebar.querySelectorAll('.admin-sidebar__btn').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            currentTab = btn.getAttribute('data-tab');
            loadTab(currentTab);

            /* Fermer sidebar sur mobile */
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
            }
        });

        /* Toggle mobile */
        if (toggle) {
            toggle.addEventListener('click', function () {
                sidebar.classList.toggle('active');
                if (overlay) overlay.classList.toggle('active');
            });
        }

        /* Fermer via overlay */
        if (overlay) {
            overlay.addEventListener('click', function () {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });
        }
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
                case 'cadres': tabCadres(content); break;
                case 'board': await tabBoard(content); break;
                case 'bareme-perco': await tabBaremePerco(content); break;
                case 'boutique': await tabBoutique(content); break;
                case 'demandes-kamas': await tabDemandesKamas(content); break;
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
        html += '<div style="display:flex;gap:var(--spacing-sm);margin-bottom:var(--spacing-sm);flex-wrap:wrap;">';
        html += '<div class="form-group" style="flex:1;margin-bottom:0;min-width:120px;"><select class="form-input" id="add-build-type"><option value="">Type (optionnel)</option><option value="pvp">PVP</option><option value="pvm">PVM</option></select></div>';
        html += '<div class="form-group" style="flex:1;margin-bottom:0;min-width:120px;"><select class="form-input" id="add-build-classe"><option value="">Classe (optionnel)</option>';
        html += '<option value="Cra">Cra</option><option value="Ecaflip">Ecaflip</option><option value="Eliotrope">Eliotrope</option><option value="Eniripsa">Eniripsa</option>';
        html += '<option value="Enutrof">Enutrof</option><option value="Feca">Feca</option><option value="Forge">Forge</option><option value="Huppermage">Huppermage</option>';
        html += '<option value="Iop">Iop</option><option value="Osamodas">Osamodas</option><option value="Ouginak">Ouginak</option><option value="Pandawa">Pandawa</option>';
        html += '<option value="Roublard">Roublard</option><option value="Sacrieur">Sacrieur</option><option value="Sadida">Sadida</option><option value="Sram">Sram</option>';
        html += '<option value="Steamer">Steamer</option><option value="Xelor">Xelor</option><option value="Zobal">Zobal</option>';
        html += '</select></div>';
        html += '<div class="form-group" style="flex:1;margin-bottom:0;min-width:120px;"><input class="form-input" id="add-build-kamas" type="number" min="0" placeholder="Valeur estimee en kamas (optionnel)"></div>';
        html += '</div>';
        html += '<div class="form-group"><label class="form-label">Capture d\'ecran (optionnel)</label><input type="file" class="form-input" id="add-build-image" accept="image/*"></div>';
        html += '<button class="btn btn--primary btn--small" id="btn-add-build">Ajouter le build</button>';
        html += '</div>';

        /* Liste */
        if (builds && builds.length) {
            html += '<div class="table-wrapper"><table class="table">';
            html += '<thead><tr><th>Image</th><th>Titre</th><th>Type</th><th>Classe</th><th>Kamas</th><th>Lien</th><th>Actions</th></tr></thead><tbody>';
            builds.forEach(function (b) {
                html += '<tr data-id="' + b.id + '" data-image="' + (b.image_url || '') + '">';
                /* Image */
                html += '<td>';
                if (b.image_url) {
                    html += '<img src="' + b.image_url + '" alt="" style="width:60px;height:40px;object-fit:cover;border-radius:4px;">';
                } else {
                    html += '<span class="text-muted">-</span>';
                }
                html += '</td>';
                /* Titre : display / edit */
                html += '<td class="cell-display" data-field="titre">' + b.titre + '</td>';
                html += '<td class="cell-edit" data-field="titre" style="display:none;"><input class="form-input edit-build-titre" value="' + (b.titre || '') + '" style="width:100%;"></td>';
                /* Type : display / edit */
                html += '<td class="cell-display" data-field="type">' + (b.type_build ? '<span class="badge badge--' + b.type_build + '">' + b.type_build.toUpperCase() + '</span>' : '-') + '</td>';
                html += '<td class="cell-edit" data-field="type" style="display:none;"><select class="form-input edit-build-type" style="width:100%;"><option value="">-</option><option value="pvp"' + (b.type_build === 'pvp' ? ' selected' : '') + '>PVP</option><option value="pvm"' + (b.type_build === 'pvm' ? ' selected' : '') + '>PVM</option></select></td>';
                /* Classe : display / edit */
                html += '<td class="cell-display" data-field="classe">' + (b.classe ? '<span class="badge badge--classe">' + b.classe + '</span>' : '-') + '</td>';
                html += '<td class="cell-edit" data-field="classe" style="display:none;"><select class="form-input edit-build-classe" style="width:100%;"><option value="">-</option>';
                html += '<option value="Cra"' + (b.classe === 'Cra' ? ' selected' : '') + '>Cra</option>';
                html += '<option value="Ecaflip"' + (b.classe === 'Ecaflip' ? ' selected' : '') + '>Ecaflip</option>';
                html += '<option value="Eliotrope"' + (b.classe === 'Eliotrope' ? ' selected' : '') + '>Eliotrope</option>';
                html += '<option value="Eniripsa"' + (b.classe === 'Eniripsa' ? ' selected' : '') + '>Eniripsa</option>';
                html += '<option value="Enutrof"' + (b.classe === 'Enutrof' ? ' selected' : '') + '>Enutrof</option>';
                html += '<option value="Feca"' + (b.classe === 'Feca' ? ' selected' : '') + '>Feca</option>';
                html += '<option value="Forge"' + (b.classe === 'Forge' ? ' selected' : '') + '>Forge</option>';
                html += '<option value="Huppermage"' + (b.classe === 'Huppermage' ? ' selected' : '') + '>Huppermage</option>';
                html += '<option value="Iop"' + (b.classe === 'Iop' ? ' selected' : '') + '>Iop</option>';
                html += '<option value="Osamodas"' + (b.classe === 'Osamodas' ? ' selected' : '') + '>Osamodas</option>';
                html += '<option value="Ouginak"' + (b.classe === 'Ouginak' ? ' selected' : '') + '>Ouginak</option>';
                html += '<option value="Pandawa"' + (b.classe === 'Pandawa' ? ' selected' : '') + '>Pandawa</option>';
                html += '<option value="Roublard"' + (b.classe === 'Roublard' ? ' selected' : '') + '>Roublard</option>';
                html += '<option value="Sacrieur"' + (b.classe === 'Sacrieur' ? ' selected' : '') + '>Sacrieur</option>';
                html += '<option value="Sadida"' + (b.classe === 'Sadida' ? ' selected' : '') + '>Sadida</option>';
                html += '<option value="Sram"' + (b.classe === 'Sram' ? ' selected' : '') + '>Sram</option>';
                html += '<option value="Steamer"' + (b.classe === 'Steamer' ? ' selected' : '') + '>Steamer</option>';
                html += '<option value="Xelor"' + (b.classe === 'Xelor' ? ' selected' : '') + '>Xelor</option>';
                html += '<option value="Zobal"' + (b.classe === 'Zobal' ? ' selected' : '') + '>Zobal</option>';
                html += '</select></td>';
                /* Kamas : display / edit */
                html += '<td class="cell-display" data-field="kamas">' + (b.valeur_kamas ? Number(b.valeur_kamas).toLocaleString('fr-FR') + ' M' : '-') + '</td>';
                html += '<td class="cell-edit" data-field="kamas" style="display:none;"><input class="form-input edit-build-kamas" type="number" min="0" value="' + (b.valeur_kamas || 0) + '" style="width:100px;"></td>';
                /* Lien : display / edit */
                html += '<td class="cell-display" data-field="lien">' + (b.lien_dofusbook ? '<a href="' + b.lien_dofusbook + '" target="_blank" class="text-accent">Lien</a>' : '-') + '</td>';
                html += '<td class="cell-edit" data-field="lien" style="display:none;"><input class="form-input edit-build-lien" value="' + (b.lien_dofusbook || '') + '" style="width:100%;"></td>';
                /* Actions : display / edit */
                html += '<td class="cell-display" data-field="actions">';
                html += '<button class="table__action admin-edit-build" data-id="' + b.id + '">Modifier</button> ';
                html += '<button class="table__action table__action--danger admin-delete-build" data-id="' + b.id + '">Supprimer</button>';
                html += '</td>';
                html += '<td class="cell-edit" data-field="actions" style="display:none;">';
                html += '<button class="table__action table__action--success admin-save-build" data-id="' + b.id + '">Sauver</button> ';
                html += '<button class="table__action admin-cancel-build">Annuler</button>';
                html += '</td>';
                html += '</tr>';
            });
            html += '</tbody></table></div>';
        }

        container.innerHTML = html;

        /* === AJOUTER un build === */
        document.getElementById('btn-add-build').addEventListener('click', async function () {
            var titre = document.getElementById('add-build-titre').value.trim();
            if (!titre) { window.REN.toast('Entrez un titre.', 'error'); return; }
            var desc = document.getElementById('add-build-desc').value.trim();
            var lien = document.getElementById('add-build-lien').value.trim();
            var typeBuild = document.getElementById('add-build-type').value;
            var classeBuild = document.getElementById('add-build-classe').value;
            var valeurKamas = document.getElementById('add-build-kamas').value;

            /* Upload image si presente */
            var fileInput = document.getElementById('add-build-image');
            var imageUrl = '';
            if (fileInput && fileInput.files.length > 0) {
                var file = fileInput.files[0];
                var fileName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '');
                var { error: uploadError } = await window.REN.supabase.storage
                    .from('builds')
                    .upload(fileName, file);
                if (uploadError) {
                    console.error('[REN] Upload error:', uploadError);
                    window.REN.toast('Erreur upload image: ' + uploadError.message, 'error');
                    return;
                }
                var { data: urlData } = window.REN.supabase.storage.from('builds').getPublicUrl(fileName);
                imageUrl = urlData.publicUrl;
            }

            await window.REN.supabase.from('builds').insert({
                titre: titre, description: desc, lien_dofusbook: lien || '', image_url: imageUrl,
                type_build: typeBuild || '', classe: classeBuild || '', valeur_kamas: valeurKamas ? parseInt(valeurKamas) : 0
            });
            window.REN.toast('Build ajoute !', 'success');
            loadTab('builds');
        });

        /* === MODIFIER un build (inline edit) === */
        container.querySelectorAll('.admin-edit-build').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var row = btn.closest('tr');
                row.querySelectorAll('.cell-display').forEach(function (td) { td.style.display = 'none'; });
                row.querySelectorAll('.cell-edit').forEach(function (td) { td.style.display = ''; });
            });
        });

        /* === ANNULER l'edition === */
        container.querySelectorAll('.admin-cancel-build').forEach(function (btn) {
            btn.addEventListener('click', function () { loadTab('builds'); });
        });

        /* === SAUVER un build === */
        container.querySelectorAll('.admin-save-build').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                var row = btn.closest('tr');
                var id = btn.dataset.id;
                var newTitre = row.querySelector('.edit-build-titre').value.trim();
                if (!newTitre) { window.REN.toast('Le titre est obligatoire.', 'error'); return; }
                var newType = row.querySelector('.edit-build-type').value;
                var newClasse = row.querySelector('.edit-build-classe').value;
                var newKamas = row.querySelector('.edit-build-kamas').value;
                var newLien = row.querySelector('.edit-build-lien').value.trim();

                var { error: updateError } = await window.REN.supabase.from('builds').update({
                    titre: newTitre,
                    type_build: newType || '',
                    classe: newClasse || '',
                    valeur_kamas: newKamas ? parseInt(newKamas) : 0,
                    lien_dofusbook: newLien || ''
                }).eq('id', id);

                if (updateError) {
                    console.error('[REN] Update build error:', updateError);
                    window.REN.toast('Erreur: ' + updateError.message, 'error');
                    return;
                }
                window.REN.toast('Build modifie !', 'success');
                loadTab('builds');
            });
        });

        /* === SUPPRIMER un build === */
        container.querySelectorAll('.admin-delete-build').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                if (!confirm('Supprimer ce build ?')) return;

                /* Supprimer l'image du storage si elle existe */
                var row = btn.closest('tr');
                var imageUrl = row ? row.dataset.image : '';
                if (imageUrl) {
                    var parts = imageUrl.split('/builds/');
                    if (parts.length > 1) {
                        var filePath = parts[parts.length - 1];
                        await window.REN.supabase.storage.from('builds').remove([filePath]);
                    }
                }

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
        html += '<div class="admin-panel__desc">Ajoutez ou modifiez les lots. La somme des pourcentages doit faire 100%.</div>';

        /* Formulaire ajout */
        html += '<div style="display:flex;gap:var(--spacing-sm);margin-bottom:var(--spacing-lg);flex-wrap:wrap;">';
        html += '<input class="form-input" id="add-lot-nom" placeholder="Nom du lot" style="flex:2;min-width:150px;">';
        html += '<input class="form-input" id="add-lot-pourcent" type="number" placeholder="%" min="0" max="100" step="0.01" style="flex:1;min-width:80px;">';
        html += '<input class="form-input" id="add-lot-jetons" type="number" placeholder="Gain jetons" min="0" value="0" style="flex:1;min-width:80px;">';
        html += '<button class="btn btn--primary btn--small" id="btn-add-lot">Ajouter</button>';
        html += '</div>';

        /* Liste avec inline-edit */
        if (lots && lots.length) {
            html += '<div class="table-wrapper"><table class="table">';
            html += '<thead><tr><th>Lot</th><th>%</th><th>Gain jetons</th><th>Actions</th></tr></thead><tbody>';

            lots.forEach(function (l) {
                html += '<tr data-row-id="' + l.id + '">';
                /* Mode affichage */
                html += '<td class="cell-display" data-field="nom">' + l.nom + '</td>';
                html += '<td class="cell-display" data-field="pourcentage">' + l.pourcentage + '%</td>';
                html += '<td class="cell-display" data-field="gain_jetons">' + (l.gain_jetons || 0) + '</td>';
                /* Mode edition (masque par defaut) */
                html += '<td class="cell-edit" data-field="nom" style="display:none;"><input class="form-input edit-lot-nom" value="' + l.nom + '" style="width:100%;"></td>';
                html += '<td class="cell-edit" data-field="pourcentage" style="display:none;"><input class="form-input edit-lot-pourcent" type="number" value="' + l.pourcentage + '" step="0.01" min="0" max="100" style="width:80px;"></td>';
                html += '<td class="cell-edit" data-field="gain_jetons" style="display:none;"><input class="form-input edit-lot-jetons" type="number" value="' + (l.gain_jetons || 0) + '" min="0" style="width:80px;"></td>';
                /* Boutons */
                html += '<td>';
                html += '<span class="actions-display">';
                html += '<button class="table__action admin-edit-lot" data-id="' + l.id + '">Modifier</button> ';
                html += '<button class="table__action table__action--danger admin-delete-lot" data-id="' + l.id + '">Supprimer</button>';
                html += '</span>';
                html += '<span class="actions-edit" style="display:none;">';
                html += '<button class="btn btn--primary btn--small admin-save-lot" data-id="' + l.id + '">Sauver</button> ';
                html += '<button class="btn btn--secondary btn--small admin-cancel-lot" data-id="' + l.id + '">Annuler</button>';
                html += '</span>';
                html += '</td>';
                html += '</tr>';
            });

            html += '</tbody></table></div>';
        }

        /* Somme des probabilites */
        var sommePourcentages = (lots || []).reduce(function (sum, l) {
            return sum + parseFloat(l.pourcentage || 0);
        }, 0);
        var sommeOk = Math.abs(sommePourcentages - 100) < 0.01;
        var sommeColor = sommeOk ? 'var(--color-success)' : 'var(--color-danger)';
        var sommeWarning = !sommeOk ? '<br><span style="color:var(--color-warning);font-size:0.75rem;">La somme devrait etre 100%</span>' : '';

        html += '<div style="text-align:center;margin-top:var(--spacing-lg);padding:var(--spacing-md);background:var(--color-bg-tertiary);border-radius:var(--radius-sm);">';
        html += '<span style="font-family:var(--font-title);font-weight:600;color:' + sommeColor + ';">';
        html += 'Somme des probabilites : ' + sommePourcentages.toFixed(2) + '%';
        html += '</span>';
        html += sommeWarning;
        html += '</div>';

        container.innerHTML = html;

        /* Ajouter */
        document.getElementById('btn-add-lot').addEventListener('click', async function () {
            var nom = document.getElementById('add-lot-nom').value.trim();
            var pourcent = parseFloat(document.getElementById('add-lot-pourcent').value);
            var jetons = parseInt(document.getElementById('add-lot-jetons').value) || 0;
            if (!nom || isNaN(pourcent)) { window.REN.toast('Remplissez nom et pourcentage.', 'error'); return; }
            await window.REN.supabase.from('jeu_lots').insert({ nom: nom, pourcentage: pourcent, gain_jetons: jetons });
            window.REN.toast('Lot ajoute !', 'success');
            loadTab('jeu-lots');
        });

        /* Modifier - passer en mode edition */
        container.querySelectorAll('.admin-edit-lot').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var row = container.querySelector('tr[data-row-id="' + btn.dataset.id + '"]');
                if (!row) return;
                row.querySelectorAll('.cell-display').forEach(function (td) { td.style.display = 'none'; });
                row.querySelectorAll('.cell-edit').forEach(function (td) { td.style.display = ''; });
                row.querySelector('.actions-display').style.display = 'none';
                row.querySelector('.actions-edit').style.display = '';
            });
        });

        /* Annuler */
        container.querySelectorAll('.admin-cancel-lot').forEach(function (btn) {
            btn.addEventListener('click', function () {
                loadTab('jeu-lots');
            });
        });

        /* Sauver */
        container.querySelectorAll('.admin-save-lot').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                var row = container.querySelector('tr[data-row-id="' + btn.dataset.id + '"]');
                if (!row) return;
                var nom = row.querySelector('.edit-lot-nom').value.trim();
                var pourcent = parseFloat(row.querySelector('.edit-lot-pourcent').value);
                var jetons = parseInt(row.querySelector('.edit-lot-jetons').value) || 0;
                if (!nom || isNaN(pourcent)) { window.REN.toast('Remplissez nom et pourcentage.', 'error'); return; }
                var { error } = await window.REN.supabase.from('jeu_lots').update({ nom: nom, pourcentage: pourcent, gain_jetons: jetons }).eq('id', btn.dataset.id);
                if (error) { window.REN.toast('Erreur: ' + error.message, 'error'); return; }
                window.REN.toast('Lot modifie !', 'success');
                loadTab('jeu-lots');
            });
        });

        /* Supprimer */
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
    /* Helper : ISO du lundi courant (début de semaine) */
    function getMondayISO() {
        var now = new Date();
        var day = now.getDay();
        var diff = (day === 0 ? -6 : 1) - day;
        var monday = new Date(now);
        monday.setDate(now.getDate() + diff);
        monday.setHours(0, 0, 0, 0);
        return monday.toISOString();
    }

    async function tabJeuHistorique(container) {
        var lundiISO = getMondayISO();

        /* Charger les 3 sources en parallèle */
        var [lastWeekRes, currentWeekRes, historiqueRes] = await Promise.all([
            window.REN.supabase.from('pepites_semaine_passee').select('id, username, tirages, pepites'),
            window.REN.supabase.from('pepites_semaine_courante').select('id, username, tirages, pepites'),
            window.REN.supabase.from('jeu_historique')
                .select('*, user:profiles(username), lot:jeu_lots(nom)')
                .gte('created_at', lundiISO)
                .order('created_at', { ascending: false })
        ]);

        var lastWeek = lastWeekRes.data || [];
        var currentWeek = currentWeekRes.data || [];
        var historique = historiqueRes.data || [];

        var html = '<div class="admin-panel__title">Historique des Tirages & Distribution</div>';

        /* ==============================
           SECTION 1 : Distribution — Semaine passée
           ============================== */
        html += '<div style="background:var(--color-bg-tertiary);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--spacing-lg);margin-bottom:var(--spacing-lg);">';
        html += '<h3 style="font-family:var(--font-title);font-size:1rem;font-weight:700;margin-bottom:var(--spacing-sm);">📋 Distribution pépites — Semaine passée</h3>';

        if (lastWeek.length > 0) {
            var totalPepites = 0;
            html += '<div style="max-height:250px;overflow-y:auto;margin-bottom:var(--spacing-md);">';
            html += '<table class="admin-table"><thead><tr><th>Joueur</th><th style="text-align:center;">Tirages</th><th style="text-align:right;">Pépites</th></tr></thead><tbody>';
            lastWeek.forEach(function (p) {
                totalPepites += p.pepites;
                html += '<tr>';
                html += '<td style="font-weight:600;">' + p.username + '</td>';
                html += '<td style="text-align:center;">' + p.tirages + '</td>';
                html += '<td style="text-align:right;color:var(--color-warning);font-weight:600;">' + p.pepites.toLocaleString('fr-FR') + '</td>';
                html += '</tr>';
            });
            html += '</tbody></table>';
            html += '</div>';
            html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:var(--spacing-md);">';
            html += '<span style="font-size:0.875rem;color:var(--color-text-secondary);">Total : <strong style="color:var(--color-warning);">' + totalPepites.toLocaleString('fr-FR') + ' pépites</strong> pour ' + lastWeek.length + ' joueur' + (lastWeek.length > 1 ? 's' : '') + '</span>';
            html += '<button class="btn btn--primary" id="btn-distribute-purge">Distribuer & Purger</button>';
            html += '</div>';
        } else {
            html += '<p class="text-muted" style="font-size:0.8125rem;">Aucune pépite à distribuer (semaine passée vide ou déjà purgée).</p>';
        }
        html += '</div>';

        /* ==============================
           SECTION 2 : Semaine en cours (info)
           ============================== */
        html += '<div style="background:var(--color-bg-tertiary);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--spacing-lg);margin-bottom:var(--spacing-lg);">';
        html += '<h3 style="font-family:var(--font-title);font-size:1rem;font-weight:700;margin-bottom:var(--spacing-sm);">📊 Semaine en cours</h3>';

        if (currentWeek.length > 0) {
            var totalCurrent = 0;
            html += '<div style="max-height:200px;overflow-y:auto;">';
            html += '<table class="admin-table"><thead><tr><th>Joueur</th><th style="text-align:center;">Tirages</th><th style="text-align:right;">Pépites</th></tr></thead><tbody>';
            currentWeek.forEach(function (p) {
                totalCurrent += p.pepites;
                html += '<tr>';
                html += '<td>' + p.username + '</td>';
                html += '<td style="text-align:center;">' + p.tirages + '</td>';
                html += '<td style="text-align:right;color:var(--color-warning);">' + p.pepites.toLocaleString('fr-FR') + '</td>';
                html += '</tr>';
            });
            html += '</tbody></table>';
            html += '</div>';
            html += '<p class="text-muted" style="font-size:0.75rem;margin-top:var(--spacing-xs);">Total en cours : ' + totalCurrent.toLocaleString('fr-FR') + ' pépites — ' + currentWeek.length + ' joueur' + (currentWeek.length > 1 ? 's' : '') + '</p>';
        } else {
            html += '<p class="text-muted" style="font-size:0.8125rem;">Aucun tirage cette semaine.</p>';
        }
        html += '</div>';

        /* ==============================
           SECTION 3 : Historique détaillé (semaine en cours)
           ============================== */
        html += '<h3 style="font-family:var(--font-title);font-size:1rem;font-weight:700;margin-bottom:var(--spacing-sm);">📝 Historique détaillé (semaine en cours)</h3>';

        if (historique.length > 0) {
            html += '<div class="table-wrapper"><table class="table">';
            html += '<thead><tr><th>Joueur</th><th>Lot</th><th>Résultat</th><th>Donné</th><th>Date</th><th>Actions</th></tr></thead><tbody>';

            historique.forEach(function (h) {
                html += '<tr>';
                html += '<td>' + (h.user ? h.user.username : '?') + '</td>';
                html += '<td>' + (h.lot ? h.lot.nom : '?') + '</td>';
                html += '<td>' + h.resultat + '</td>';
                html += '<td>' + (h.donne ? '<span class="text-success">Oui</span>' : '<span class="text-danger">Non</span>') + '</td>';
                html += '<td>' + window.REN.formatDateFull(h.created_at) + '</td>';
                html += '<td style="display:flex;gap:4px;flex-wrap:wrap;">';
                if (!h.donne) {
                    html += '<button class="btn btn--primary btn--small admin-mark-given" data-id="' + h.id + '">Marquer donné</button>';
                }
                html += '<button class="btn btn--danger btn--small admin-delete-hist" data-id="' + h.id + '">Supprimer</button>';
                html += '</td>';
                html += '</tr>';
            });

            html += '</tbody></table></div>';
        } else {
            html += '<p class="text-muted text-center">Aucun tirage cette semaine.</p>';
        }

        container.innerHTML = html;

        /* ==============================
           EVENT LISTENERS
           ============================== */

        /* Distribuer & Purger */
        var distBtn = document.getElementById('btn-distribute-purge');
        if (distBtn) {
            distBtn.addEventListener('click', async function () {
                var totalP = lastWeek.reduce(function (s, p) { return s + p.pepites; }, 0);
                var recap = lastWeek.map(function (p) { return p.username + ' : ' + p.pepites.toLocaleString('fr-FR'); }).join('\n');
                if (!confirm('Distribuer & purger les pépites de la semaine passée ?\n\n' + recap + '\n\nTotal : ' + totalP.toLocaleString('fr-FR') + ' pépites\n\nLes tirages de la semaine passée seront supprimés.')) return;

                distBtn.disabled = true;
                distBtn.textContent = 'Purge en cours...';

                try {
                    var { error } = await window.REN.supabase
                        .from('jeu_historique')
                        .delete()
                        .lt('created_at', lundiISO);

                    if (error) throw error;
                    window.REN.toast('Pépites distribuées, historique purgé !', 'success');
                    loadTab('jeu-historique');
                } catch (err) {
                    console.error('[REN-ADMIN] Erreur purge:', err);
                    window.REN.toast('Erreur : ' + err.message, 'error');
                    distBtn.disabled = false;
                    distBtn.textContent = 'Distribuer & Purger';
                }
            });
        }

        /* Marquer comme donné */
        container.querySelectorAll('.admin-mark-given').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                await window.REN.supabase.from('jeu_historique').update({ donne: true }).eq('id', btn.dataset.id);
                window.REN.toast('Lot marqué comme donné.', 'success');
                loadTab('jeu-historique');
            });
        });

        /* Supprimer une ligne */
        container.querySelectorAll('.admin-delete-hist').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                if (!confirm('Supprimer ce tirage ?')) return;
                await window.REN.supabase.from('jeu_historique').delete().eq('id', btn.dataset.id);
                window.REN.toast('Tirage supprimé.', 'success');
                loadTab('jeu-historique');
            });
        });
    }
    /* === TAB: CADRES === */
    function tabCadres(content) {
        var tiers = [
            { key: 'initie', name: 'Initie', min: 0, max: 49, title: 'Joueur Lambda', desc: 'Bordure grise', reward: 0 },
            { key: 'bronze', name: 'Bronze', min: 50, max: 149, title: 'Guerrier de Base', desc: 'Bordure bronze + lueur', reward: 10 },
            { key: 'argent', name: 'Argent', min: 150, max: 299, title: 'Combattant Confirme', desc: 'Bordure argent + lueur', reward: 20 },
            { key: 'or', name: 'Or', min: 300, max: 499, title: 'Elite PVP', desc: 'Bordure doree + glow pulsante', reward: 40 },
            { key: 'saphir', name: 'Saphir', min: 500, max: 749, title: 'Veteran des Arenes', desc: 'Ring bleu rotatif + glow', reward: 70 },
            { key: 'emeraude', name: 'Emeraude', min: 750, max: 999, title: 'Seigneur de Guerre', desc: 'Ring vert rotatif + glow intense', reward: 100 },
            { key: 'rubis', name: 'Rubis', min: 1000, max: 1499, title: 'Machine de Guerre', desc: 'Ring rouge rotatif + glow intense', reward: 150 },
            { key: 'diamant', name: 'Diamant', min: 1500, max: 1999, title: 'Faucheuse des Champs', desc: 'Ring irise rotatif + glow prismatique', reward: 200 },
            { key: 'legendaire', name: 'Legendaire', min: 2000, max: null, title: 'Dieu du PVP', desc: 'Ring rouge/or + braises + mega glow', reward: 400 }
        ];

        var userSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

        var html = '<div style="padding: var(--spacing-lg);">';
        html += '<h2 style="font-family: var(--font-title); font-size: 1.3rem; font-weight: 700; margin-bottom: var(--spacing-xs);">Cadres de Profil</h2>';
        html += '<p class="text-muted" style="font-size: 0.8125rem; margin-bottom: var(--spacing-xl);">Les cadres s\'appliquent automatiquement en fonction des points PVP definitifs cumules.</p>';

        html += '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-xl);">';

        tiers.forEach(function (t) {
            var flames = '';
            if (t.key === 'legendaire') {
                flames = '<div class="frame-flames">';
                for (var i = 0; i < 8; i++) flames += '<div class="frame-flame"></div>';
                flames += '</div>';
            }

            html += '<div style="background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--spacing-lg); display: flex; flex-direction: column; align-items: center; gap: var(--spacing-md);">';
            html += '<div class="avatar-frame avatar-frame--' + t.key + '">';
            html += '<div class="avatar-frame__img">' + userSvg + '</div>';
            html += flames;
            html += '</div>';
            html += '<span class="tier-badge tier-badge--' + t.key + '">' + t.name + '</span>';
            html += '<span class="text-muted" style="font-size: 0.75rem;">' + t.min + (t.max ? ' - ' + t.max : '+') + ' pts</span>';
            html += '<span style="font-weight: 600; font-size: 0.9rem;">' + t.title + '</span>';
            html += '<span class="text-muted" style="font-size: 0.7rem;">' + t.desc + '</span>';
            if (t.reward > 0) {
                html += '<span style="font-weight: 700; font-size: 0.8rem; color: #f0ad4e;">+' + t.reward + ' jetons</span>';
            }
            html += '</div>';
        });

        html += '</div>';

        /* Tableau recapitulatif */
        html += '<h3 style="font-family: var(--font-title); font-size: 1.1rem; font-weight: 700; margin-top: var(--spacing-xl); margin-bottom: var(--spacing-md);">Recapitulatif des paliers</h3>';
        html += '<div style="overflow-x: auto;">';
        html += '<table class="admin-table" style="width: 100%;">';
        html += '<thead><tr>';
        html += '<th>Palier</th><th>Points requis</th><th>Titre</th><th>Recompense</th><th>Style du cadre</th>';
        html += '</tr></thead>';
        html += '<tbody>';
        tiers.forEach(function (t) {
            html += '<tr>';
            html += '<td><span class="tier-badge tier-badge--' + t.key + '">' + t.name + '</span></td>';
            html += '<td>' + t.min + (t.max ? ' - ' + t.max : '+') + '</td>';
            html += '<td>' + t.title + '</td>';
            html += '<td style="font-weight:700; color:#f0ad4e;">' + (t.reward > 0 ? '+' + t.reward + ' jetons' : '-') + '</td>';
            html += '<td class="text-muted" style="font-size:0.8rem;">' + t.desc + '</td>';
            html += '</tr>';
        });
        html += '</tbody></table>';
        html += '</div>';

        html += '</div>';
        content.innerHTML = html;
    }

    /* === TAB: BOARD HEBDO (archivage semaines) === */
    async function tabBoard(content) {
        /* Charger semaines archivées + config récompenses + classement semaine en cours */
        var [semainesRes, configRes, liveRes] = await Promise.all([
            window.REN.supabase.from('semaines').select('*').order('date_debut', { ascending: false }),
            window.REN.supabase.from('recompenses_config').select('*').order('ordre'),
            window.REN.supabase.from('classement_pvp_semaine').select('id, username, points')
        ]);

        var semaines = semainesRes.data || [];
        var config = configRes.data || [];
        var livePlayers = liveRes.data || [];

        var html = '<div class="admin-panel__title">Board Hebdomadaire</div>';

        /* Section archivage */
        html += '<div style="background:var(--color-bg-tertiary);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--spacing-lg);margin-bottom:var(--spacing-lg);">';
        html += '<h3 style="font-family:var(--font-title);font-size:1rem;font-weight:700;margin-bottom:var(--spacing-sm);">Archiver la semaine en cours</h3>';
        html += '<p class="text-muted" style="font-size:0.8125rem;margin-bottom:var(--spacing-md);">' + livePlayers.length + ' joueurs actifs cette semaine</p>';

        if (livePlayers.length > 0) {
            /* Afficher un aperçu */
            html += '<div style="margin-bottom:var(--spacing-md);max-height:200px;overflow-y:auto;">';
            livePlayers.forEach(function (p, i) {
                var reward = findReward(config, p.points);
                html += '<div style="display:flex;align-items:center;gap:var(--spacing-sm);padding:4px 0;font-size:0.8125rem;">';
                html += '<span style="min-width:24px;color:var(--color-text-muted);">' + (i + 1) + '.</span>';
                html += '<span style="flex:1;">' + p.username + '</span>';
                html += '<span style="color:var(--color-warning);font-weight:600;">' + p.points + ' pts</span>';
                html += '<span style="color:var(--color-success);font-size:0.75rem;">' + (reward ? reward.emoji + ' ' + reward.label : '') + '</span>';
                html += '</div>';
            });
            html += '</div>';
            html += '<button class="btn btn--primary" id="btn-archive-week">Archiver cette semaine</button>';
        } else {
            html += '<p class="text-muted">Aucun joueur actif cette semaine.</p>';
        }
        html += '</div>';

        /* Historique des semaines archivées */
        html += '<h3 style="font-family:var(--font-title);font-size:1rem;font-weight:700;margin-bottom:var(--spacing-sm);">Semaines archivées (' + semaines.length + ')</h3>';

        if (semaines.length) {
            html += '<table class="admin-table"><thead><tr>';
            html += '<th>Période</th><th>Joueurs</th><th>Date d\'archivage</th>';
            html += '</tr></thead><tbody>';

            for (var i = 0; i < semaines.length; i++) {
                var s = semaines[i];
                var { count } = await window.REN.supabase.from('semaine_snapshots').select('id', { count: 'exact', head: true }).eq('semaine_id', s.id);
                html += '<tr>';
                html += '<td style="font-weight:600;">' + formatDate(s.date_debut) + ' — ' + formatDate(s.date_fin) + '</td>';
                html += '<td>' + (count || 0) + ' joueurs</td>';
                html += '<td class="text-muted">' + new Date(s.created_at).toLocaleDateString('fr-FR') + '</td>';
                html += '</tr>';
            }
            html += '</tbody></table>';
        } else {
            html += '<p class="text-muted text-center">Aucune semaine archivée.</p>';
        }

        content.innerHTML = html;

        /* Event archivage */
        var archiveBtn = document.getElementById('btn-archive-week');
        if (archiveBtn) {
            archiveBtn.addEventListener('click', async function () {
                if (!confirm('Archiver la semaine en cours ? Les données seront sauvegardées.')) return;

                archiveBtn.disabled = true;
                archiveBtn.textContent = 'Archivage...';

                try {
                    /* Calculer dates de la semaine en cours (lundi à dimanche) */
                    var now = new Date();
                    var day = now.getDay();
                    var diffToMonday = (day === 0 ? -6 : 1) - day;
                    var monday = new Date(now);
                    monday.setDate(now.getDate() + diffToMonday);
                    var sunday = new Date(monday);
                    sunday.setDate(monday.getDate() + 6);

                    var dateDebut = monday.toISOString().split('T')[0];
                    var dateFin = sunday.toISOString().split('T')[0];

                    /* Vérifier si la semaine n'est pas déjà archivée */
                    var { data: existing } = await window.REN.supabase
                        .from('semaines')
                        .select('id')
                        .eq('date_debut', dateDebut)
                        .eq('date_fin', dateFin);

                    if (existing && existing.length > 0) {
                        window.REN.toast('Cette semaine a déjà été archivée !', 'error');
                        archiveBtn.disabled = false;
                        archiveBtn.textContent = 'Archiver cette semaine';
                        return;
                    }

                    /* Créer la semaine */
                    var { data: semaine, error: semErr } = await window.REN.supabase
                        .from('semaines')
                        .insert({ date_debut: dateDebut, date_fin: dateFin, archivee_par: window.REN.currentProfile.id })
                        .select()
                        .single();

                    if (semErr) throw semErr;

                    /* Snapshot de chaque joueur */
                    var snapshots = livePlayers.map(function (p, idx) {
                        var reward = findReward(config, p.points);
                        return {
                            semaine_id: semaine.id,
                            user_id: p.id,
                            username: p.username,
                            points: p.points,
                            rang: idx + 1,
                            recompense_pepites: reward ? reward.pepites : 0,
                            recompense_percepteurs: reward ? reward.percepteurs_bonus : 0
                        };
                    });

                    if (snapshots.length > 0) {
                        var { error: snapErr } = await window.REN.supabase.from('semaine_snapshots').insert(snapshots);
                        if (snapErr) throw snapErr;
                    }

                    window.REN.toast('Semaine archivée avec succès !', 'success');
                    loadTab('board');
                } catch (err) {
                    console.error('[REN] Erreur archivage:', err);
                    window.REN.toast('Erreur : ' + err.message, 'error');
                    archiveBtn.disabled = false;
                    archiveBtn.textContent = 'Archiver cette semaine';
                }
            });
        }
    }

    function findReward(config, points) {
        for (var i = 0; i < config.length; i++) {
            var r = config[i];
            var max = r.seuil_max !== null ? r.seuil_max : 999999;
            if (points >= r.seuil_min && points <= max) return r;
        }
        return null;
    }

    function formatDate(dateStr) {
        var d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }

    /* === TAB: BARÈME PERCO (config récompenses) === */
    async function tabBaremePerco(content) {
        var { data: config } = await window.REN.supabase
            .from('recompenses_config')
            .select('*')
            .order('ordre');

        var rows = config || [];

        var html = '<div class="admin-panel__title">Barème Percepteurs & Récompenses</div>';
        html += '<p class="text-muted" style="font-size:0.8125rem;margin-bottom:var(--spacing-lg);">Définir les paliers de récompenses en fonction des points hebdomadaires</p>';

        html += '<table class="admin-table"><thead><tr>';
        html += '<th>Palier</th><th>Emoji</th><th>Points min</th><th>Points max</th><th>Percepteurs bonus</th><th>Pépites</th><th>Actions</th>';
        html += '</tr></thead><tbody>';

        rows.forEach(function (r) {
            html += '<tr data-id="' + r.id + '">';
            html += '<td><input class="form-input" style="width:100px;" value="' + r.label + '" data-field="label"></td>';
            html += '<td><input class="form-input" style="width:50px;text-align:center;" value="' + (r.emoji || '') + '" data-field="emoji"></td>';
            html += '<td><input class="form-input" style="width:70px;text-align:center;" type="number" value="' + r.seuil_min + '" data-field="seuil_min"></td>';
            html += '<td><input class="form-input" style="width:70px;text-align:center;" type="number" value="' + (r.seuil_max !== null ? r.seuil_max : '') + '" placeholder="∞" data-field="seuil_max"></td>';
            html += '<td><input class="form-input" style="width:70px;text-align:center;" type="number" value="' + r.percepteurs_bonus + '" data-field="percepteurs_bonus"></td>';
            html += '<td><input class="form-input" style="width:90px;text-align:center;" type="number" value="' + r.pepites + '" data-field="pepites"></td>';
            html += '<td><button class="btn btn--danger btn--small btn-delete-tier" data-id="' + r.id + '">✕</button></td>';
            html += '</tr>';
        });

        html += '</tbody></table>';

        html += '<div style="display:flex;gap:var(--spacing-sm);margin-top:var(--spacing-md);">';
        html += '<button class="btn btn--primary" id="btn-save-bareme">Sauvegarder</button>';
        html += '<button class="btn btn--secondary" id="btn-add-tier">+ Ajouter un palier</button>';
        html += '</div>';

        content.innerHTML = html;

        /* Save */
        document.getElementById('btn-save-bareme').addEventListener('click', async function () {
            var tableRows = content.querySelectorAll('tbody tr');
            var updates = [];

            tableRows.forEach(function (tr) {
                var id = parseInt(tr.getAttribute('data-id'));
                if (!id) return;
                var inputs = tr.querySelectorAll('input');
                var label = inputs[0].value.trim();
                var emoji = inputs[1].value.trim();
                var seuil_min = parseInt(inputs[2].value) || 0;
                var seuil_max = inputs[3].value.trim() === '' ? null : parseInt(inputs[3].value);
                var percepteurs_bonus = parseInt(inputs[4].value) || 0;
                var pepites = parseInt(inputs[5].value) || 0;

                updates.push(
                    window.REN.supabase.from('recompenses_config').update({
                        label: label, emoji: emoji, seuil_min: seuil_min, seuil_max: seuil_max,
                        percepteurs_bonus: percepteurs_bonus, pepites: pepites
                    }).eq('id', id)
                );
            });

            await Promise.all(updates);
            window.REN.toast('Barème sauvegardé !', 'success');
        });

        /* Add tier */
        document.getElementById('btn-add-tier').addEventListener('click', async function () {
            var maxOrdre = rows.length ? Math.max.apply(null, rows.map(function (r) { return r.ordre; })) : 0;
            var { error } = await window.REN.supabase.from('recompenses_config').insert({
                label: 'Nouveau', emoji: '🏅', seuil_min: 0, seuil_max: null,
                percepteurs_bonus: 0, pepites: 0, ordre: maxOrdre + 1
            });
            if (error) {
                console.error('[REN-ADMIN] Erreur ajout palier:', error);
                window.REN.toast('Erreur : ' + error.message, 'error');
                return;
            }
            window.REN.toast('Palier ajouté !', 'success');
            loadTab('bareme-perco');
        });

        /* Delete tier */
        content.querySelectorAll('.btn-delete-tier').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                if (!confirm('Supprimer ce palier ?')) return;
                await window.REN.supabase.from('recompenses_config').delete().eq('id', parseInt(btn.getAttribute('data-id')));
                loadTab('bareme-perco');
            });
        });
    }

    /* ============================================ */
    /* ONGLET BOUTIQUE (gestion catalogue + achats) */
    /* ============================================ */
    async function tabBoutique(container) {
        var results = await Promise.all([
            window.REN.supabase.from('boutique_items').select('*').order('created_at', { ascending: false }),
            window.REN.supabase.from('boutique_achats').select('*, profiles:user_id(username), boutique_items:item_id(image_url)').eq('statut', 'en_attente').order('created_at', { ascending: false }),
            window.REN.supabase.from('boutique_config').select('*').single(),
            window.REN.supabase.from('boutique_achats').select('*, profiles:user_id(username), boutique_items:item_id(image_url)').eq('statut', 'distribue').order('created_at', { ascending: false }).limit(30)
        ]);

        var items = (results[0].data || []);
        var achatsEnAttente = (results[1].data || []);
        var config = results[2].data;
        var achatsDistribues = (results[3].data || []);
        var taux = config ? config.taux_kamas_par_jeton : 5000;

        var html = '<div class="admin-panel__title">Gestion Boutique</div>';

        /* Config taux */
        html += '<div style="margin-bottom:var(--spacing-lg);padding:var(--spacing-md);background:var(--color-bg-primary);border-radius:var(--radius-md);border:1px solid var(--color-border);">';
        html += '<label class="form-label">Taux kamas par jeton</label>';
        html += '<div style="display:flex;gap:var(--spacing-sm);align-items:center;">';
        html += '<input class="form-input" id="boutique-taux" type="number" value="' + taux + '" min="1" style="width:120px;">';
        html += '<span class="text-muted">kamas = 1 jeton</span>';
        html += '<button class="btn btn--primary btn--small" id="btn-save-taux">Sauver</button>';
        html += '</div></div>';

        /* Achats à distribuer */
        html += '<h3 style="font-family:var(--font-title);font-size:1rem;font-weight:700;margin-bottom:var(--spacing-sm);color:var(--color-warning);">Achats \u00e0 distribuer (' + achatsEnAttente.length + ')</h3>';
        if (achatsEnAttente.length > 0) {
            html += '<div class="admin-achats-list" style="margin-bottom:var(--spacing-lg);">';
            achatsEnAttente.forEach(function (a) {
                var username = a.profiles ? a.profiles.username : 'Inconnu';
                var imageUrl = (a.boutique_items && a.boutique_items.image_url) ? a.boutique_items.image_url : '';
                var date = new Date(a.created_at).toLocaleDateString('fr-FR');
                html += '<div class="admin-achat-card">';
                html += '<div class="admin-achat-card__image">';
                if (imageUrl) {
                    html += '<img src="' + imageUrl + '" alt="' + a.item_nom + '">';
                } else {
                    html += '<span class="text-muted" style="font-size:1.25rem;">?</span>';
                }
                html += '</div>';
                html += '<div class="admin-achat-card__info">';
                html += '<span class="admin-achat-card__article">' + a.item_nom + '</span>';
                html += '<span class="admin-achat-card__detail">Achet\u00e9 par <strong>' + username + '</strong> \u00b7 ' + a.prix_paye + ' <img class="icon-inline" src="assets/images/jeton.png" alt="jetons"> \u00b7 ' + date + '</span>';
                html += '</div>';
                html += '<button class="btn btn--primary btn--small btn-distribue" data-id="' + a.id + '">Distribu\u00e9 \u2713</button>';
                html += '</div>';
            });
            html += '</div>';
        } else {
            html += '<p class="text-muted" style="margin-bottom:var(--spacing-lg);">Aucun achat en attente.</p>';
        }

        /* Historique distribués */
        html += '<details style="margin-bottom:var(--spacing-lg);">';
        html += '<summary style="cursor:pointer;font-family:var(--font-title);font-size:0.9rem;font-weight:700;color:var(--color-text-muted);margin-bottom:var(--spacing-sm);">Historique distribu\u00e9s (' + achatsDistribues.length + ')</summary>';
        if (achatsDistribues.length > 0) {
            html += '<div class="admin-achats-list" style="margin-top:var(--spacing-sm);">';
            achatsDistribues.forEach(function (a) {
                var username = a.profiles ? a.profiles.username : 'Inconnu';
                var imageUrl = (a.boutique_items && a.boutique_items.image_url) ? a.boutique_items.image_url : '';
                var date = new Date(a.created_at).toLocaleDateString('fr-FR');
                html += '<div class="admin-achat-card" style="opacity:0.7;">';
                html += '<div class="admin-achat-card__image">';
                if (imageUrl) {
                    html += '<img src="' + imageUrl + '" alt="' + a.item_nom + '" loading="lazy">';
                } else {
                    html += '<span class="text-muted" style="font-size:1.25rem;">?</span>';
                }
                html += '</div>';
                html += '<div class="admin-achat-card__info">';
                html += '<span class="admin-achat-card__article">' + a.item_nom + '</span>';
                html += '<span class="admin-achat-card__detail">' + username + ' \u00b7 ' + a.prix_paye + ' <img class="icon-inline" src="assets/images/jeton.png" alt="jetons"> \u00b7 ' + date + '</span>';
                html += '</div>';
                html += '<span class="badge-statut badge-statut--distribue">Distribu\u00e9</span>';
                html += '</div>';
            });
            html += '</div>';
        } else {
            html += '<p class="text-muted" style="margin-top:var(--spacing-sm);">Aucun achat distribu\u00e9.</p>';
        }
        html += '</details>';

        /* Ajouter un article */
        html += '<h3 style="font-family:var(--font-title);font-size:1rem;font-weight:700;margin-bottom:var(--spacing-sm);">Ajouter un article</h3>';
        html += '<div style="display:flex;gap:var(--spacing-sm);flex-wrap:wrap;margin-bottom:var(--spacing-sm);align-items:flex-end;">';
        html += '<div><label class="form-label">Nom</label><input class="form-input" id="add-item-nom" placeholder="Bl\u00e9 x100" style="width:160px;"></div>';
        html += '<div><label class="form-label">Description</label><input class="form-input" id="add-item-desc" placeholder="Optionnel" style="width:180px;"></div>';
        html += '<div><label class="form-label">Prix (jetons)</label><input class="form-input" id="add-item-prix" type="number" min="1" value="1" style="width:90px;"></div>';
        html += '<div><label class="form-label">Stock (-1=illimit\u00e9)</label><input class="form-input" id="add-item-stock" type="number" value="-1" style="width:90px;"></div>';
        html += '</div>';

        /* Image : ID DofusDB */
        html += '<div style="display:flex;gap:var(--spacing-sm);flex-wrap:wrap;margin-bottom:var(--spacing-sm);align-items:flex-end;">';
        html += '<div><label class="form-label">Image - ID DofusDB</label><div style="display:flex;gap:var(--spacing-xs);align-items:center;"><input class="form-input" id="add-item-dofusdb" placeholder="Ex: 28203" style="width:120px;"><button class="btn btn--secondary btn--small" id="btn-preview-dofusdb" type="button">Importer</button></div>';
        html += '<span class="text-muted" style="font-size:0.75rem;">dofusdb.fr/database/object/<strong>28203</strong></span></div>';
        html += '</div>';
        html += '<div id="add-item-preview" style="margin-bottom:var(--spacing-sm);"></div>';

        html += '<button class="btn btn--primary" id="btn-add-item" style="margin-bottom:var(--spacing-lg);">Ajouter</button>';

        /* Liste des articles */
        html += '<h3 style="font-family:var(--font-title);font-size:1rem;font-weight:700;margin-bottom:var(--spacing-sm);">Catalogue (' + items.length + ' articles)</h3>';
        if (items.length > 0) {
            html += '<table class="admin-table"><thead><tr><th>Image</th><th>Nom</th><th>Description</th><th>Prix</th><th>Stock</th><th>Actif</th><th>Actions</th></tr></thead><tbody>';
            items.forEach(function (item) {
                var imgHtml = item.image_url
                    ? '<img src="' + item.image_url + '" style="width:40px;height:40px;object-fit:cover;border-radius:4px;">'
                    : '<span class="text-muted">-</span>';

                html += '<tr data-row-id="' + item.id + '">';
                html += '<td>' + imgHtml + '</td>';

                /* Display */
                html += '<td class="cell-display" data-field="nom">' + item.nom + '</td>';
                html += '<td class="cell-display" data-field="desc">' + (item.description || '') + '</td>';
                html += '<td class="cell-display" data-field="prix">' + item.prix_jetons + '</td>';
                html += '<td class="cell-display" data-field="stock">' + (item.stock === -1 ? '\u221e' : item.stock) + '</td>';
                html += '<td class="cell-display" data-field="actif">' + (item.actif ? '\u2705' : '\u274c') + '</td>';

                /* Edit */
                html += '<td class="cell-edit" data-field="nom" style="display:none;"><input class="form-input edit-nom" value="' + item.nom + '" style="width:120px;"></td>';
                html += '<td class="cell-edit" data-field="desc" style="display:none;"><input class="form-input edit-desc" value="' + (item.description || '') + '" style="width:140px;"></td>';
                html += '<td class="cell-edit" data-field="prix" style="display:none;"><input class="form-input edit-prix" type="number" value="' + item.prix_jetons + '" style="width:70px;"></td>';
                html += '<td class="cell-edit" data-field="stock" style="display:none;"><input class="form-input edit-stock" type="number" value="' + item.stock + '" style="width:70px;"></td>';
                html += '<td class="cell-edit" data-field="actif" style="display:none;"><select class="form-select edit-actif"><option value="true"' + (item.actif ? ' selected' : '') + '>Oui</option><option value="false"' + (!item.actif ? ' selected' : '') + '>Non</option></select></td>';

                /* Actions */
                html += '<td>';
                html += '<span class="actions-display">';
                html += '<button class="table__action admin-edit-item" data-id="' + item.id + '">Modifier</button> ';
                html += '<button class="table__action table__action--danger admin-delete-item" data-id="' + item.id + '">Supprimer</button>';
                html += '</span>';
                html += '<span class="actions-edit" style="display:none;">';
                html += '<button class="btn btn--primary btn--small admin-save-item" data-id="' + item.id + '">Sauver</button> ';
                html += '<button class="btn btn--secondary btn--small admin-cancel-item" data-id="' + item.id + '">Annuler</button>';
                html += '</span>';
                html += '</td>';

                html += '</tr>';
            });
            html += '</tbody></table>';
        } else {
            html += '<p class="text-muted">Aucun article.</p>';
        }

        container.innerHTML = html;

        /* === EVENT LISTENERS === */

        /* Save taux */
        document.getElementById('btn-save-taux').addEventListener('click', async function () {
            var newTaux = parseInt(document.getElementById('boutique-taux').value) || 5000;
            if (config && config.id) {
                await window.REN.supabase.from('boutique_config').update({ taux_kamas_par_jeton: newTaux }).eq('id', config.id);
            }
            window.REN.toast('Taux sauvegard\u00e9 !', 'success');
        });

        /* Distribué */
        container.querySelectorAll('.btn-distribue').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                if (!confirm('Confirmer que la ressource a \u00e9t\u00e9 donn\u00e9e en jeu ?')) return;
                await window.REN.supabase.from('boutique_achats').update({ statut: 'distribue' }).eq('id', parseInt(btn.dataset.id));
                window.REN.toast('Achat marqu\u00e9 comme distribu\u00e9.', 'success');
                loadTab('boutique');
            });
        });

        /* Fonction utilitaire : fetch DofusDB */
        async function fetchDofusDB(dofusId) {
            var resp = await fetch('https://api.dofusdb.fr/items/' + encodeURIComponent(dofusId));
            if (!resp.ok) throw new Error('ID introuvable');
            return await resp.json();
        }

        /* Importer depuis DofusDB */
        document.getElementById('btn-preview-dofusdb').addEventListener('click', async function () {
            var dofusId = document.getElementById('add-item-dofusdb').value.trim();
            var previewDiv = document.getElementById('add-item-preview');
            if (!dofusId) { window.REN.toast('Entre un ID DofusDB.', 'error'); return; }
            previewDiv.innerHTML = '<span class="text-muted">Chargement...</span>';
            try {
                var data = await fetchDofusDB(dofusId);
                if (data.img) {
                    previewDiv.innerHTML = '<div style="display:flex;align-items:center;gap:var(--spacing-sm);"><img src="' + data.img + '" style="width:64px;height:64px;object-fit:contain;border-radius:4px;border:1px solid var(--color-border);background:var(--color-bg-primary);"><span style="color:var(--color-success);">\u2713 Import\u00e9</span></div>';
                    previewDiv.dataset.resolvedUrl = data.img;
                    /* Auto-remplir le nom si vide */
                    if (data.name && data.name.fr && !document.getElementById('add-item-nom').value.trim()) {
                        document.getElementById('add-item-nom').value = data.name.fr;
                    }
                } else {
                    previewDiv.innerHTML = '<span class="text-muted">Pas d\'image trouv\u00e9e.</span>';
                }
            } catch (err) {
                previewDiv.innerHTML = '<span style="color:var(--color-danger);">Erreur : ' + err.message + '</span>';
            }
        });

        /* Add item */
        document.getElementById('btn-add-item').addEventListener('click', async function () {
            var nom = document.getElementById('add-item-nom').value.trim();
            var desc = document.getElementById('add-item-desc').value.trim();
            var prix = parseInt(document.getElementById('add-item-prix').value) || 1;
            var stock = parseInt(document.getElementById('add-item-stock').value);
            var previewDiv = document.getElementById('add-item-preview');
            var dofusId = document.getElementById('add-item-dofusdb').value.trim();
            var imageUrl = previewDiv.dataset.resolvedUrl || '';

            /* Si ID DofusDB rempli mais pas encore importé, le faire auto */
            if (!imageUrl && dofusId) {
                try {
                    var data = await fetchDofusDB(dofusId);
                    if (data.img) imageUrl = data.img;
                    if (data.name && data.name.fr && !nom) nom = data.name.fr;
                } catch (err) {
                    window.REN.toast('Erreur DofusDB : ' + err.message, 'error');
                    return;
                }
            }

            if (!nom) { window.REN.toast('Le nom est obligatoire.', 'error'); return; }

            await window.REN.supabase.from('boutique_items').insert({
                nom: nom,
                description: desc,
                prix_jetons: prix,
                stock: isNaN(stock) ? -1 : stock,
                image_url: imageUrl,
                actif: true
            });
            window.REN.toast('Article ajout\u00e9 !', 'success');
            loadTab('boutique');
        });

        /* Edit item */
        container.querySelectorAll('.admin-edit-item').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var row = container.querySelector('tr[data-row-id="' + btn.dataset.id + '"]');
                if (!row) return;
                row.querySelectorAll('.cell-display').forEach(function (td) { td.style.display = 'none'; });
                row.querySelectorAll('.cell-edit').forEach(function (td) { td.style.display = ''; });
                row.querySelector('.actions-display').style.display = 'none';
                row.querySelector('.actions-edit').style.display = '';
            });
        });

        /* Save item */
        container.querySelectorAll('.admin-save-item').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                var row = container.querySelector('tr[data-row-id="' + btn.dataset.id + '"]');
                if (!row) return;
                var updateData = {
                    nom: row.querySelector('.edit-nom').value.trim(),
                    description: row.querySelector('.edit-desc').value.trim(),
                    prix_jetons: parseInt(row.querySelector('.edit-prix').value) || 1,
                    stock: parseInt(row.querySelector('.edit-stock').value),
                    actif: row.querySelector('.edit-actif').value === 'true'
                };
                if (!updateData.nom) { window.REN.toast('Le nom est obligatoire.', 'error'); return; }
                await window.REN.supabase.from('boutique_items').update(updateData).eq('id', parseInt(btn.dataset.id));
                window.REN.toast('Article modifi\u00e9 !', 'success');
                loadTab('boutique');
            });
        });

        /* Cancel edit */
        container.querySelectorAll('.admin-cancel-item').forEach(function (btn) {
            btn.addEventListener('click', function () { loadTab('boutique'); });
        });

        /* Delete item */
        container.querySelectorAll('.admin-delete-item').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                if (!confirm('Supprimer cet article ?')) return;
                await window.REN.supabase.from('boutique_items').delete().eq('id', parseInt(btn.dataset.id));
                window.REN.toast('Article supprim\u00e9.', 'info');
                loadTab('boutique');
            });
        });
    }

    /* ============================================ */
    /* ONGLET DEMANDES KAMAS                        */
    /* ============================================ */
    async function tabDemandesKamas(container) {
        var { data, error } = await window.REN.supabase
            .from('boutique_demandes_kamas')
            .select('*, profiles:user_id(username)')
            .order('created_at', { ascending: false });

        var demandes = data || [];
        var enAttente = demandes.filter(function (d) { return d.statut === 'en_attente'; });
        var traitees = demandes.filter(function (d) { return d.statut !== 'en_attente'; });

        var html = '<div class="admin-panel__title">Demandes d\'achat de jetons (kamas)</div>';

        /* En attente */
        html += '<h3 style="font-family:var(--font-title);font-size:1rem;font-weight:700;margin-bottom:var(--spacing-sm);color:var(--color-warning);">En attente (' + enAttente.length + ')</h3>';
        if (enAttente.length > 0) {
            html += '<table class="admin-table" style="margin-bottom:var(--spacing-lg);"><thead><tr><th>Joueur</th><th>Kamas</th><th>Jetons demand\u00e9s</th><th>Date</th><th>Actions</th></tr></thead><tbody>';
            enAttente.forEach(function (d) {
                var username = d.profiles ? d.profiles.username : 'Inconnu';
                var date = new Date(d.created_at).toLocaleDateString('fr-FR');
                html += '<tr>';
                html += '<td><strong>' + username + '</strong></td>';
                html += '<td>' + window.REN.formatKamas(d.montant_kamas) + '</td>';
                html += '<td style="color:var(--color-warning);font-weight:700;">' + d.jetons_demandes + ' jetons</td>';
                html += '<td>' + date + '</td>';
                html += '<td>';
                html += '<button class="btn btn--primary btn--small btn-valider-kamas" data-id="' + d.id + '" data-user="' + d.user_id + '" data-jetons="' + d.jetons_demandes + '">Valider \u2713</button> ';
                html += '<button class="btn btn--secondary btn--small btn-refuser-kamas" data-id="' + d.id + '">Refuser</button>';
                html += '</td>';
                html += '</tr>';
            });
            html += '</tbody></table>';
        } else {
            html += '<p class="text-muted" style="margin-bottom:var(--spacing-lg);">Aucune demande en attente.</p>';
        }

        /* Historique traité */
        if (traitees.length > 0) {
            html += '<h3 style="font-family:var(--font-title);font-size:1rem;font-weight:700;margin-bottom:var(--spacing-sm);">Historique</h3>';
            html += '<table class="admin-table"><thead><tr><th>Joueur</th><th>Kamas</th><th>Jetons</th><th>Date</th><th>Statut</th></tr></thead><tbody>';
            traitees.forEach(function (d) {
                var username = d.profiles ? d.profiles.username : 'Inconnu';
                var date = new Date(d.created_at).toLocaleDateString('fr-FR');
                var badgeClass = 'badge-statut badge-statut--' + d.statut;
                var statutText = d.statut === 'valide' ? 'Valid\u00e9' : 'Refus\u00e9';
                html += '<tr>';
                html += '<td>' + username + '</td>';
                html += '<td>' + window.REN.formatKamas(d.montant_kamas) + '</td>';
                html += '<td>' + d.jetons_demandes + '</td>';
                html += '<td>' + date + '</td>';
                html += '<td><span class="' + badgeClass + '">' + statutText + '</span></td>';
                html += '</tr>';
            });
            html += '</tbody></table>';
        }

        container.innerHTML = html;

        /* === EVENT LISTENERS === */

        /* Valider : crédite les jetons au joueur */
        container.querySelectorAll('.btn-valider-kamas').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                var demandeId = parseInt(btn.dataset.id);
                var targetUserId = btn.dataset.user;
                var jetons = parseInt(btn.dataset.jetons);

                if (!confirm('Valider cette demande et cr\u00e9diter ' + jetons + ' jetons au joueur ?')) return;

                try {
                    /* Créditer les jetons */
                    await window.REN.supabase.rpc('ajouter_jetons', {
                        p_user_id: targetUserId,
                        p_points: jetons
                    });

                    /* Marquer comme validé */
                    await window.REN.supabase.from('boutique_demandes_kamas')
                        .update({ statut: 'valide' })
                        .eq('id', demandeId);

                    window.REN.toast('Demande valid\u00e9e, ' + jetons + ' jetons cr\u00e9dit\u00e9s !', 'success');
                    loadTab('demandes-kamas');
                } catch (err) {
                    window.REN.toast('Erreur : ' + err.message, 'error');
                }
            });
        });

        /* Refuser */
        container.querySelectorAll('.btn-refuser-kamas').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                if (!confirm('Refuser cette demande ?')) return;
                await window.REN.supabase.from('boutique_demandes_kamas')
                    .update({ statut: 'refuse' })
                    .eq('id', parseInt(btn.dataset.id));
                window.REN.toast('Demande refus\u00e9e.', 'info');
                loadTab('demandes-kamas');
            });
        });
    }

})();
