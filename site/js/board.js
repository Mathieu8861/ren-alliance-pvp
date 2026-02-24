/* ============================================ */
/* Alliance REN - Board Hebdomadaire           */
/* Classement semaine + récompenses auto       */
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

        /* Ajouter les semaines archivées */
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

    function formatWeekLabel(debut, fin) {
        var d = new Date(debut);
        var f = new Date(fin);
        var mois = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
        return d.getDate() + ' ' + mois[d.getMonth()] + ' — ' + f.getDate() + ' ' + mois[f.getMonth()] + ' ' + f.getFullYear();
    }

    /* === CHARGER LE BOARD === */
    async function loadBoard(selection) {
        var tiersContainer = document.getElementById('board-tiers');
        var summaryContainer = document.getElementById('board-summary');
        if (!tiersContainer) return;

        tiersContainer.innerHTML = '<div class="loading"><div class="spinner"></div> Chargement...</div>';
        if (summaryContainer) summaryContainer.innerHTML = '';

        var players = [];

        if (selection === 'current') {
            players = await loadCurrentWeek();
        } else {
            players = await loadArchivedWeek(parseInt(selection));
        }

        renderBoard(players, tiersContainer, summaryContainer, selection);
    }

    /* === SEMAINE EN COURS (live depuis classement_pvp_semaine) === */
    async function loadCurrentWeek() {
        try {
            var { data } = await window.REN.supabase
                .from('classement_pvp_semaine')
                .select('id, username, points');
            if (!data) return [];

            /* Calculer les récompenses pour chaque joueur */
            return data.map(function (p, i) {
                var reward = getReward(p.points);
                return {
                    user_id: p.id,
                    username: p.username,
                    points: p.points,
                    rang: i + 1,
                    recompense_pepites: reward.pepites,
                    recompense_percepteurs: reward.percepteurs_bonus
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
            return data || [];
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

    /* === RENDER BOARD === */
    function renderBoard(players, tiersContainer, summaryContainer, selection) {
        if (!players.length) {
            tiersContainer.innerHTML = '<p class="text-muted text-center" style="padding:2rem;">Aucune donnée pour cette semaine.</p>';
            return;
        }

        /* Grouper par palier */
        var tiers = {};
        recompensesConfig.forEach(function (r) {
            tiers[r.label] = { config: r, players: [] };
        });

        players.forEach(function (p) {
            var reward = getReward(p.points);
            var tierName = reward.label || 'Aucun';
            if (tiers[tierName]) {
                tiers[tierName].players.push(p);
            }
        });

        /* Résumé */
        var totalPepites = 0;
        var totalPlayers = players.length;
        var totalPoints = 0;
        players.forEach(function (p) {
            totalPepites += p.recompense_pepites || 0;
            totalPoints += p.points;
        });

        if (summaryContainer) {
            var weekLabel = 'Semaine en cours';
            if (selection !== 'current') {
                var sem = semaines.find(function (s) { return s.id === parseInt(selection); });
                if (sem) weekLabel = formatWeekLabel(sem.date_debut, sem.date_fin);
            }

            summaryContainer.innerHTML = ''
                + '<div class="board-summary__card">'
                + '    <div class="board-summary__value">' + totalPlayers + '</div>'
                + '    <div class="board-summary__label">Joueurs actifs</div>'
                + '</div>'
                + '<div class="board-summary__card">'
                + '    <div class="board-summary__value">' + totalPoints + '</div>'
                + '    <div class="board-summary__label">Points totaux</div>'
                + '</div>'
                + '<div class="board-summary__card">'
                + '    <div class="board-summary__value">' + formatNumber(totalPepites) + '</div>'
                + '    <div class="board-summary__label">Pépites distribuées</div>'
                + '</div>';
        }

        /* Rendu des paliers */
        var html = '';

        recompensesConfig.forEach(function (config) {
            var tier = tiers[config.label];
            if (!tier || !tier.players.length) return;

            html += '<div class="board-tier">';
            html += '<div class="board-tier__header">';
            html += '<span class="board-tier__emoji">' + config.emoji + '</span>';
            html += '<span class="board-tier__title">' + config.label + '</span>';
            html += '<span class="board-tier__reward">';
            if (config.percepteurs_bonus > 0) {
                html += '+' + config.percepteurs_bonus + ' percepteur' + (config.percepteurs_bonus > 1 ? 's' : '') + ' bonus';
            }
            if (config.pepites > 0) {
                if (config.percepteurs_bonus > 0) html += ' ou ';
                html += formatNumber(config.pepites) + ' pépites';
            }
            html += '</span>';
            html += '<span class="board-tier__range">(' + config.seuil_min + (config.seuil_max ? ' à ' + config.seuil_max : '+') + ' pts)</span>';
            html += '</div>';

            html += '<div class="board-tier__players">';
            tier.players.forEach(function (p) {
                html += '<div class="board-player">';
                html += '<span class="board-player__rank">' + p.rang + '.</span>';
                html += '<span class="board-player__name">' + p.username + '</span>';
                html += '<span class="board-player__points">' + p.points + ' pts</span>';
                html += '</div>';
            });
            html += '</div>';
            html += '</div>';
        });

        tiersContainer.innerHTML = html;
    }

    /* === UTILS === */
    function formatNumber(n) {
        return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

})();
