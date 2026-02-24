/* ============================================ */
/* Alliance REN - Historique                   */
/* Historique de tous les combats              */
/* ============================================ */
(function () {
    'use strict';

    var currentFilter = 'tous';
    var allCombats = [];

    document.addEventListener('ren:ready', init);

    async function init() {
        if (!window.REN.supabase || !window.REN.currentProfile) return;
        setupTabs();
        await loadCombats();
    }

    function setupTabs() {
        var container = document.getElementById('history-tabs');
        if (!container) return;
        container.addEventListener('click', function (e) {
            var btn = e.target.closest('.tabs__btn');
            if (!btn) return;
            container.querySelectorAll('.tabs__btn').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-tab');
            renderCombats();
        });
    }

    async function loadCombats() {
        try {
            var { data, error } = await window.REN.supabase
                .from('combats')
                .select('*, auteur:profiles!auteur_id(username), alliance:alliances(nom, tag), participants:combat_participants(user:profiles(username))')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            allCombats = data || [];
            renderCombats();
        } catch (err) {
            console.error('[REN] Erreur historique:', err);
            var grid = document.getElementById('history-grid');
            if (grid) grid.innerHTML = '<p class="text-muted" style="padding:1rem;">Erreur de chargement.</p>';
        }
    }

    function renderCombats() {
        var grid = document.getElementById('history-grid');
        if (!grid) return;

        var filtered = allCombats.filter(function (c) {
            switch (currentFilter) {
                case 'attaques': return c.type === 'attaque';
                case 'defenses': return c.type === 'defense';
                case 'victoires': return c.resultat === 'victoire';
                case 'defaites': return c.resultat === 'defaite';
                default: return true;
            }
        });

        if (!filtered.length) {
            grid.innerHTML = '<p class="text-muted" style="padding:1rem;">Aucun combat trouve.</p>';
            return;
        }

        var html = '';
        filtered.forEach(function (c) {
            var badgeType = '<span class="badge badge--' + c.type + '">' + c.type.toUpperCase() + '</span>';
            var badgeResult = '<span class="badge badge--' + c.resultat + '">' + c.resultat.toUpperCase() + '</span>';
            var auteur = c.auteur ? c.auteur.username : 'Inconnu';
            var alliance = c.alliance ? c.alliance.nom + (c.alliance.tag ? ' [' + c.alliance.tag + ']' : '') : (c.alliance_ennemie_nom || 'N/A');

            var participants = [];
            if (c.participants) {
                c.participants.forEach(function (p) {
                    if (p.user) participants.push(p.user.username);
                });
            }

            html += '<div class="history-card">';
            html += '<div class="history-card__header">' + badgeType + ' ' + badgeResult + '</div>';
            html += '<div class="history-card__body">';
            html += '<strong>' + auteur + '</strong> vs <strong>' + alliance + '</strong><br>';
            html += c.nb_allies + 'v' + c.nb_ennemis;
            if (c.butin_kamas > 0) html += ' &mdash; Butin: <span class="text-warning">' + window.REN.formatKamas(c.butin_kamas) + '</span>';
            if (c.points_gagnes !== 0) html += ' &mdash; <span class="' + (c.points_gagnes > 0 ? 'text-success' : 'text-danger') + '">' + (c.points_gagnes > 0 ? '+' : '') + c.points_gagnes + ' pts</span>';
            if (participants.length > 1) {
                html += '<br><span class="text-muted">Avec: ' + participants.filter(function(p) { return p !== auteur; }).join(', ') + '</span>';
            }
            if (c.commentaire) {
                html += '<br><span class="text-muted">&#128205; ' + c.commentaire + '</span>';
            }
            html += '</div>';
            html += '<div class="history-card__footer">' + window.REN.formatDateFull(c.created_at) + '</div>';
            html += '</div>';
        });

        grid.innerHTML = html;
    }
})();
