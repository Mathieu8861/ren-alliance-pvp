/* ============================================ */
/* Alliance REN - Membres                      */
/* Liste des membres avec stats                */
/* ============================================ */
(function () {
    'use strict';

    var allMembers = [];

    document.addEventListener('ren:ready', init);

    async function init() {
        if (!window.REN.supabase || !window.REN.currentProfile) return;
        setupSearch();
        await loadMembers();
    }

    function setupSearch() {
        var input = document.getElementById('search-members');
        if (!input) return;
        input.addEventListener('input', function () {
            var query = input.value.toLowerCase().trim();
            renderMembers(query);
        });
    }

    async function loadMembers() {
        var grid = document.getElementById('member-grid');
        if (!grid) return;

        try {
            var { data, error } = await window.REN.supabase.rpc('get_member_stats');
            if (error) throw error;
            allMembers = data || [];
            renderMembers('');
        } catch (err) {
            console.error('[REN] Erreur membres:', err);
            grid.innerHTML = '<p class="text-muted" style="padding:1rem;">Erreur de chargement.</p>';
        }
    }

    function renderMembers(query) {
        var grid = document.getElementById('member-grid');
        if (!grid) return;

        var filtered = allMembers;
        if (query) {
            filtered = allMembers.filter(function (m) {
                return m.username.toLowerCase().includes(query) ||
                    (m.classe && m.classe.toLowerCase().includes(query));
            });
        }

        if (!filtered.length) {
            grid.innerHTML = '<p class="text-muted" style="padding:1rem;">Aucun membre trouve.</p>';
            return;
        }

        var html = '';
        filtered.forEach(function (m) {
            var totalCombats = (m.total_attaques || 0) + (m.total_defenses || 0);
            var totalVictoires = (m.victoires_attaque || 0) + (m.victoires_defense || 0);
            var winrate = totalCombats > 0 ? Math.round(totalVictoires / totalCombats * 100) : 0;

            html += '<div class="member-card">';
            html += '<div class="member-card__name">' + m.username + '</div>';
            html += '<div class="member-card__class">' + (m.classe || '?') + ' &bull; ' + (m.element || '?') + '</div>';

            html += '<div class="member-card__stats">';
            html += '<div class="member-card__stat"><span class="member-card__stat-label">ATK</span><span class="member-card__stat-value">' + (m.total_attaques || 0) + '</span></div>';
            html += '<div class="member-card__stat"><span class="member-card__stat-label">DEF</span><span class="member-card__stat-value">' + (m.total_defenses || 0) + '</span></div>';
            html += '<div class="member-card__stat"><span class="member-card__stat-label">Winrate</span><span class="member-card__stat-value">' + winrate + '%</span></div>';
            html += '<div class="member-card__stat"><span class="member-card__stat-label">Points</span><span class="member-card__stat-value">' + (m.total_points || 0) + '</span></div>';
            html += '</div>';

            html += '<div class="member-card__info">';
            html += '<p>Jetons: <span>' + (m.jetons || 0) + '</span></p>';
            if (m.total_kamas > 0) html += '<p>Kamas: <span class="text-warning">' + window.REN.formatKamas(m.total_kamas) + '</span></p>';
            html += '</div>';

            html += '</div>';
        });

        grid.innerHTML = html;
    }
})();
