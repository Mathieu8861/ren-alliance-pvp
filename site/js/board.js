/* ============================================ */
/* Alliance REN - Droits Percepteurs            */
/* Points semaine passée → droits semaine       */
/* ============================================ */
(function () {
    'use strict';

    var recompensesConfig = [];
    var semaines = [];
    var preferencesMap = {};
    var currentSelection = 'last';

    document.addEventListener('ren:ready', init);

    async function init() {
        if (!window.REN.supabase || !window.REN.currentProfile) return;
        await loadRecompensesConfig();
        await loadPreferences();
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

    /* === CHARGER PRÉFÉRENCES JOUEURS (percos vs pépites) === */
    async function loadPreferences() {
        try {
            var { data } = await window.REN.supabase
                .from('profiles')
                .select('id, prefere_pepites')
                .eq('is_validated', true);
            preferencesMap = {};
            (data || []).forEach(function (p) {
                preferencesMap[p.id] = p.prefere_pepites || false;
            });
        } catch (err) {
            console.error('[REN-BOARD] Erreur preferences:', err);
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
                ? r.percepteurs_bonus + ' <img class="icon-inline icon-inline--perco" src="assets/images/percepteur.png" alt="">'
                : '0 <img class="icon-inline icon-inline--perco" src="assets/images/percepteur.png" alt="">';
            var pepites = r.pepites > 0 ? formatNumber(r.pepites) + ' <img class="icon-inline" src="assets/images/pepite.png" alt="">' : '';

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

        if (selection === 'last') {
            players = await loadLastWeek();
            /* Calculer les dates de la semaine passée */
            var now = new Date();
            var day = now.getDay();
            var diffToMonday = (day === 0 ? -6 : 1) - day;
            var thisMonday = new Date(now);
            thisMonday.setDate(now.getDate() + diffToMonday);
            var lastMonday = new Date(thisMonday);
            lastMonday.setDate(thisMonday.getDate() - 7);
            var lastSunday = new Date(thisMonday);
            lastSunday.setDate(thisMonday.getDate() - 1);
            var thisSunday = new Date(thisMonday);
            thisSunday.setDate(thisMonday.getDate() + 6);
            periodText = 'Points du ' + formatDate(lastMonday) + ' au ' + formatDate(lastSunday) + ' — Droits du ' + formatDate(thisMonday) + ' au ' + formatDate(thisSunday);
        } else if (selection === 'current') {
            players = await loadCurrentWeek();
            /* Calculer les dates de la semaine en cours */
            var now = new Date();
            var day = now.getDay();
            var diffToMonday = (day === 0 ? -6 : 1) - day;
            var monday = new Date(now);
            monday.setDate(now.getDate() + diffToMonday);
            var sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            var nextMonday = new Date(sunday);
            nextMonday.setDate(sunday.getDate() + 1);
            var nextSunday = new Date(nextMonday);
            nextSunday.setDate(nextMonday.getDate() + 6);
            periodText = 'Points du ' + formatDate(monday) + ' au ' + formatDate(sunday) + ' — Droits du ' + formatDate(nextMonday) + ' au ' + formatDate(nextSunday);
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

    /* === SEMAINE PASSÉE === */
    async function loadLastWeek() {
        try {
            var [pvpRes, pepitesRes] = await Promise.all([
                window.REN.supabase.from('classement_pvp_semaine_passee').select('id, username, points'),
                window.REN.supabase.from('pepites_semaine_passee').select('id, pepites')
            ]);
            var data = pvpRes.data || [];
            var pepitesMap = {};
            (pepitesRes.data || []).forEach(function (p) { pepitesMap[p.id] = p.pepites; });

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
                    tier_emoji: reward.emoji,
                    pepites_jeu: pepitesMap[p.id] || 0,
                    prefere_pepites: preferencesMap[p.id] || false
                };
            });
        } catch (err) {
            console.error('[REN-BOARD] Erreur semaine passée:', err);
            return [];
        }
    }

    /* === SEMAINE EN COURS === */
    async function loadCurrentWeek() {
        try {
            var [pvpRes, pepitesRes] = await Promise.all([
                window.REN.supabase.from('classement_pvp_semaine').select('id, username, points'),
                window.REN.supabase.from('pepites_semaine_courante').select('id, pepites')
            ]);
            var data = pvpRes.data || [];
            var pepitesMap = {};
            (pepitesRes.data || []).forEach(function (p) { pepitesMap[p.id] = p.pepites; });

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
                    tier_emoji: reward.emoji,
                    pepites_jeu: pepitesMap[p.id] || 0,
                    prefere_pepites: preferencesMap[p.id] || false
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
                    tier_emoji: reward.emoji,
                    pepites_jeu: 0,
                    prefere_pepites: preferencesMap[p.user_id] || false
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
        html += '<th class="board-table__th board-table__th--reward">R\u00e9compense PVP</th>';
        html += '<th class="board-table__th board-table__th--pepjeu">Pépites jeu</th>';
        html += '</tr></thead>';
        html += '<tbody>';

        players.forEach(function (p) {
            /* Récompense PVP : affiche le choix du joueur (percos ou pépites) */
            var rewardPvp = '—';
            if (p.prefere_pepites && p.recompense_pepites > 0) {
                rewardPvp = formatNumber(p.recompense_pepites) + ' <img class="icon-inline" src="assets/images/pepite.png" alt="">';
            } else if (p.recompense_percepteurs > 0) {
                rewardPvp = '+' + p.recompense_percepteurs + ' <img class="icon-inline icon-inline--perco" src="assets/images/percepteur.png" alt="">';
            } else if (p.recompense_pepites > 0) {
                rewardPvp = formatNumber(p.recompense_pepites) + ' <img class="icon-inline" src="assets/images/pepite.png" alt="">';
            }

            var pepJeuText = p.pepites_jeu > 0 ? formatNumber(p.pepites_jeu) + ' <img class="icon-inline" src="assets/images/pepite.png" alt="">' : '—';

            html += '<tr class="board-table__row">';
            html += '<td class="board-table__td board-table__td--rank">' + p.rang + '</td>';
            html += '<td class="board-table__td board-table__td--name">' + p.username + '</td>';
            html += '<td class="board-table__td board-table__td--points">' + p.points + '</td>';
            html += '<td class="board-table__td board-table__td--tier">' + p.tier_emoji + ' ' + p.tier_label + '</td>';
            html += '<td class="board-table__td board-table__td--reward">' + rewardPvp + '</td>';
            html += '<td class="board-table__td board-table__td--pepjeu" style="color:var(--color-warning);">' + pepJeuText + '</td>';
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
