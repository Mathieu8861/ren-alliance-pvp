/* ============================================ */
/* Alliance REN - Droits Percepteurs            */
/* Points semaine passée → droits semaine       */
/* ============================================ */
(function () {
    'use strict';

    var recompensesConfig = [];
    var semaines = [];
    var currentSelection = 'current';

    document.addEventListener('ren:ready', init);

    async function init() {
        if (!window.REN.supabase || !window.REN.currentProfile) return;
        await loadRecompensesConfig();
        await loadSemaines();
        setupWeekSelect();
        renderBareme();
        loadBoard(currentSelection);
    }

    /* === CHARGER CONFIG RÉCOMPENSES === */
    async function loadRecompensesConfig() {
        try {
            var { data } = await window.REN.supabase
                .from('recompenses_config')
                .select('*')
                .order('ordre', { ascending: true });
            recompensesConfig = data || [];
        } catch (err) {
            console.error('[REN-BOARD] Erreur config:', err);
        }
    }

    /* === CHARGER LISTE DES SEMAINES ARCHIVÉES === */
    async function loadSemaines() {
        try {
            var { data } = await window.REN.supabase
                .from('semaines')
                .select('*')
                .order('date_debut', { ascending: false });
            semaines = data || [];
        } catch (err) {
            console.error('[REN-BOARD] Erreur semaines:', err);
        }
    }

    /* === SETUP SELECT SEMAINES === */
    function setupWeekSelect() {
        var select = document.getElementById('board-week-select');
        if (!select) return;

        semaines.forEach(function (s) {
            var opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = formatWeekLabel(s.date_debut, s.date_fin);
            select.appendChild(opt);
        });

        select.addEventListener('change', function () {
            currentSelection = select.value;
            loadBoard(currentSelection);
        });
    }

    /* === RENDER BARÈME (légende des paliers) === */
    function renderBareme() {
        var container = document.getElementById('board-bareme');
        if (!container || !recompensesConfig.length) {
            if (container) container.innerHTML = '';
            return;
        }

        var html = '<div class="board-bareme__grid">';
        recompensesConfig.forEach(function (r) {
            var range = r.seuil_min + (r.seuil_max ? '-' + r.seuil_max : '+') + ' pts';
            var perco = r.percepteurs_bonus > 0
                ? r.percepteurs_bonus + ' perco' + (r.percepteurs_bonus > 1 ? 's' : '')
                : '0 perco';
            var pepites = r.pepites > 0 ? formatNumber(r.pepites) + ' pep' : '';

            html += '<div class="board-bareme__item">';
            html += '<span class="board-bareme__emoji">' + r.emoji + '</span>';
            html += '<div class="board-bareme__info">';
            html += '<span class="board-bareme__label">' + r.label + '</span>';
            html += '<span class="board-bareme__range">' + range + '</span>';
            html += '</div>';
            html += '<div class="board-bareme__rewards">';
            html += '<span class="board-bareme__perco">' + perco + '</span>';
            if (pepites) html += '<span class="board-bareme__pepites">' + pepites + '</span>';
            html += '</div>';
            html += '</div>';
        });
        html += '</div>';

        container.innerHTML = html;
    }

    /* === CHARGER LE BOARD === */
    async function loadBoard(selection) {
        var tableWrap = document.getElementById('board-table-wrap');
        var periodEl = document.getElementById('board-period');
        if (!tableWrap) return;

        tableWrap.innerHTML = '<div class="loading"><div class="spinner"></div> Chargement...</div>';

        var players = [];
        var periodText = '';

        if (selection === 'current') {
            players = await loadCurrentWeek();
            /* Calculer les dates de la semaine en cours */
            var now = new Date();
            var day = now.getDay();
            var diffToMonday = (day === 0 ? -6 : 1) - day;
            var monday = new Date(now);
            monday.setDate(now.getDate() + diffToMonday);
            var sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            periodText = 'Points du ' + formatDate(monday) + ' au ' + formatDate(sunday) + ' — Droits de la semaine prochaine';
        } else {
            var sem = semaines.find(function (s) { return s.id === parseInt(selection); });
            players = await loadArchivedWeek(parseInt(selection));
            if (sem) {
                var nextMonday = new Date(sem.date_fin);
                nextMonday.setDate(nextMonday.getDate() + 1);
                var nextSunday = new Date(nextMonday);
                nextSunday.setDate(nextMonday.getDate() + 6);
                periodText = 'Points du ' + formatDate(new Date(sem.date_debut)) + ' au ' + formatDate(new Date(sem.date_fin)) + ' — Droits du ' + formatDate(nextMonday) + ' au ' + formatDate(nextSunday);
            }
        }

        if (periodEl) periodEl.textContent = periodText;

        renderTable(players, tableWrap);
    }

    /* === SEMAINE EN COURS === */
    async function loadCurrentWeek() {
        try {
            var { data } = await window.REN.supabase
                .from('classement_pvp_semaine')
                .select('id, username, points');
            if (!data) return [];

            /* Trier par points décroissants */
            data.sort(function (a, b) { return b.points - a.points; });

            return data.map(function (p, i) {
                var reward = getReward(p.points);
                return {
                    user_id: p.id,
                    username: p.username,
                    points: p.points,
                    rang: i + 1,
                    recompense_pepites: reward.pepites,
                    recompense_percepteurs: reward.percepteurs_bonus,
                    tier_label: reward.label,
                    tier_emoji: reward.emoji
                };
            });
        } catch (err) {
            console.error('[REN-BOARD] Erreur semaine en cours:', err);
            return [];
        }
    }

    /* === SEMAINE ARCHIVÉE === */
    async function loadArchivedWeek(semaineId) {
        try {
            var { data } = await window.REN.supabase
                .from('semaine_snapshots')
                .select('*')
                .eq('semaine_id', semaineId)
                .order('rang', { ascending: true });
            if (!data) return [];

            return data.map(function (p) {
                var reward = getReward(p.points);
                return {
                    user_id: p.user_id,
                    username: p.username,
                    points: p.points,
                    rang: p.rang,
                    recompense_pepites: p.recompense_pepites,
                    recompense_percepteurs: p.recompense_percepteurs,
                    tier_label: reward.label,
                    tier_emoji: reward.emoji
                };
            });
        } catch (err) {
            console.error('[REN-BOARD] Erreur semaine archivée:', err);
            return [];
        }
    }

    /* === TROUVER LA RÉCOMPENSE SELON LES POINTS === */
    function getReward(points) {
        for (var i = 0; i < recompensesConfig.length; i++) {
            var r = recompensesConfig[i];
            var min = r.seuil_min;
            var max = r.seuil_max !== null ? r.seuil_max : 999999;
            if (points >= min && points <= max) {
                return r;
            }
        }
        return { pepites: 0, percepteurs_bonus: 0, label: 'Aucun', emoji: '' };
    }

    /* === RENDER TABLEAU === */
    function renderTable(players, container) {
        if (!players.length) {
            container.innerHTML = '<p class="text-muted text-center" style="padding:2rem;">Aucune donnée pour cette semaine.</p>';
            return;
        }

        var html = '<table class="board-table">';
        html += '<thead><tr>';
        html += '<th class="board-table__th board-table__th--rank">#</th>';
        html += '<th class="board-table__th board-table__th--name">Joueur</th>';
        html += '<th class="board-table__th board-table__th--points">Points</th>';
        html += '<th class="board-table__th board-table__th--tier">Palier</th>';
        html += '<th class="board-table__th board-table__th--perco">Percepteurs</th>';
        html += '<th class="board-table__th board-table__th--pepites">Pépites</th>';
        html += '</tr></thead>';
        html += '<tbody>';

        players.forEach(function (p) {
            var percoText = p.recompense_percepteurs > 0
                ? '+' + p.recompense_percepteurs
                : '0';
            var pepitesText = p.recompense_pepites > 0
                ? formatNumber(p.recompense_pepites)
                : '—';

            html += '<tr class="board-table__row">';
            html += '<td class="board-table__td board-table__td--rank">' + p.rang + '</td>';
            html += '<td class="board-table__td board-table__td--name">' + p.username + '</td>';
            html += '<td class="board-table__td board-table__td--points">' + p.points + '</td>';
            html += '<td class="board-table__td board-table__td--tier">' + p.tier_emoji + ' ' + p.tier_label + '</td>';
            html += '<td class="board-table__td board-table__td--perco">' + percoText + '</td>';
            html += '<td class="board-table__td board-table__td--pepites">' + pepitesText + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    /* === UTILS === */
    function formatNumber(n) {
        return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    function formatWeekLabel(debut, fin) {
        var d = new Date(debut);
        var f = new Date(fin);
        var mois = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
        return d.getDate() + ' ' + mois[d.getMonth()] + ' — ' + f.getDate() + ' ' + mois[f.getMonth()] + ' ' + f.getFullYear();
    }

    function formatDate(date) {
        var mois = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
        return date.getDate() + ' ' + mois[date.getMonth()];
    }

})();
