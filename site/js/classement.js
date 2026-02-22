/* ============================================ */
/* Alliance REN - Classement                   */
/* Rankings PvP : semaine, definitif, kamas    */
/* ============================================ */
(function () {
    'use strict';

    var currentTab = 'semaine';

    document.addEventListener('ren:ready', init);

    function init() {
        if (!window.REN.supabase || !window.REN.currentProfile) return;
        setupTabs();
        loadTab(currentTab);
    }

    /* === TABS === */
    function setupTabs() {
        var container = document.getElementById('classement-tabs');
        if (!container) return;
        container.addEventListener('click', function (e) {
            var btn = e.target.closest('.tabs__btn');
            if (!btn) return;
            container.querySelectorAll('.tabs__btn').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            currentTab = btn.getAttribute('data-tab');
            loadTab(currentTab);
        });
    }

    async function loadTab(tab) {
        var content = document.getElementById('classement-content');
        if (!content) return;
        content.innerHTML = '<div class="loading"><div class="spinner"></div> Chargement...</div>';

        try {
            switch (tab) {
                case 'semaine': await loadSemaine(content); break;
                case 'definitif': await loadDefinitif(content); break;
                case 'kamas': await loadKamas(content); break;
                case 'jetons': await loadJetons(content); break;
            }
        } catch (err) {
            console.error('[REN] Erreur classement:', err);
            content.innerHTML = '<p class="text-muted" style="padding:1rem;">Erreur de chargement.</p>';
        }
    }

    /* === PVP SEMAINE === */
    async function loadSemaine(container) {
        var { data, error } = await window.REN.supabase.from('classement_pvp_semaine').select('*');
        if (error) throw error;
        renderRanking(container, data || [], 'total_points', 'pts', 'Classement PvP - Semaine');
    }

    /* === PVP DEFINITIF === */
    async function loadDefinitif(container) {
        var { data, error } = await window.REN.supabase.from('classement_pvp_definitif').select('*');
        if (error) throw error;
        renderRanking(container, data || [], 'total_points', 'pts', 'Classement PvP - Definitif');
    }

    /* === KAMAS === */
    async function loadKamas(container) {
        var [joueurRes, allianceRes] = await Promise.all([
            window.REN.supabase.from('classement_kamas_joueur').select('*'),
            window.REN.supabase.from('classement_kamas_alliance').select('*')
        ]);

        var html = '<div class="ranking-split">';

        /* Kamas par joueur */
        html += '<div>';
        html += '<div class="ranking-split__title">Par Joueur</div>';
        html += buildRankingList(joueurRes.data || [], 'total_kamas', 'K', true);
        html += '</div>';

        /* Kamas par alliance */
        html += '<div>';
        html += '<div class="ranking-split__title">Par Alliance</div>';
        html += buildAllianceRankingList(allianceRes.data || []);
        html += '</div>';

        html += '</div>';
        container.innerHTML = html;
    }

    /* === JETONS === */
    async function loadJetons(container) {
        var { data, error } = await window.REN.supabase.from('classement_jetons').select('*');
        if (error) throw error;
        renderRanking(container, data || [], 'jetons', 'jetons', 'Classement Jetons');
    }

    /* === RENDER === */
    function renderRanking(container, data, valueKey, suffix, title) {
        if (!data.length) {
            container.innerHTML = '<p class="text-muted" style="padding:1rem;">Aucune donnee pour le moment.</p>';
            return;
        }
        var html = '<div class="ranking-list">';
        data.forEach(function (row, i) {
            var rankClass = i === 0 ? ' ranking-item--gold' : i === 1 ? ' ranking-item--silver' : i === 2 ? ' ranking-item--bronze' : '';
            var medal = i === 0 ? '&#129351;' : i === 1 ? '&#129352;' : i === 2 ? '&#129353;' : '#' + (i + 1);
            var value = valueKey === 'total_kamas' ? window.REN.formatKamas(row[valueKey]) : row[valueKey];
            html += '<div class="ranking-item' + rankClass + '">';
            html += '<div class="ranking-item__left">';
            html += '<span class="ranking-item__rank">' + medal + '</span>';
            html += '<span class="ranking-item__name">' + (row.username || 'Inconnu') + '</span>';
            html += '</div>';
            html += '<span class="ranking-item__value">' + value + ' ' + suffix + '</span>';
            html += '</div>';
        });
        html += '</div>';
        container.innerHTML = html;
    }

    function buildRankingList(data, valueKey, suffix, isKamas) {
        if (!data.length) return '<p class="text-muted" style="padding:0.5rem;">Aucune donnee.</p>';
        var html = '<div class="ranking-list">';
        data.forEach(function (row, i) {
            var rankClass = i === 0 ? ' ranking-item--gold' : i === 1 ? ' ranking-item--silver' : i === 2 ? ' ranking-item--bronze' : '';
            var medal = i === 0 ? '&#129351;' : i === 1 ? '&#129352;' : i === 2 ? '&#129353;' : '#' + (i + 1);
            var value = isKamas ? window.REN.formatKamas(row[valueKey]) : row[valueKey];
            html += '<div class="ranking-item' + rankClass + '">';
            html += '<div class="ranking-item__left">';
            html += '<span class="ranking-item__rank">' + medal + '</span>';
            html += '<span class="ranking-item__name">' + (row.username || 'Inconnu') + '</span>';
            html += '</div>';
            html += '<span class="ranking-item__value">' + value + '</span>';
            html += '</div>';
        });
        html += '</div>';
        return html;
    }

    function buildAllianceRankingList(data) {
        if (!data.length) return '<p class="text-muted" style="padding:0.5rem;">Aucune donnee.</p>';
        var html = '<div class="ranking-list">';
        data.forEach(function (row, i) {
            var rankClass = i === 0 ? ' ranking-item--gold' : i === 1 ? ' ranking-item--silver' : i === 2 ? ' ranking-item--bronze' : '';
            var medal = i === 0 ? '&#129351;' : i === 1 ? '&#129352;' : i === 2 ? '&#129353;' : '#' + (i + 1);
            html += '<div class="ranking-item' + rankClass + '">';
            html += '<div class="ranking-item__left">';
            html += '<span class="ranking-item__rank">' + medal + '</span>';
            html += '<span class="ranking-item__name">' + (row.alliance_nom || row.alliance_ennemie_nom || 'Inconnu') + '</span>';
            html += '</div>';
            html += '<span class="ranking-item__value">' + window.REN.formatKamas(row.total_kamas) + '</span>';
            html += '</div>';
        });
        html += '</div>';
        return html;
    }
})();
