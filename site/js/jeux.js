/* ============================================ */
/* Alliance REN - Jeu de Cartes                */
/* Tirage avec jetons, lots configurables      */
/* ============================================ */
(function () {
    'use strict';

    var prixTirage = 12;
    var lots = [];
    var isDrawing = false;

    document.addEventListener('ren:ready', init);

    async function init() {
        if (!window.REN.supabase || !window.REN.currentProfile) return;
        await loadConfig();
        await loadLots();
        updateJetonsDisplay();
        setupDraw();
    }

    async function loadConfig() {
        try {
            var { data } = await window.REN.supabase.from('jeu_config').select('*').single();
            if (data) prixTirage = data.prix_tirage;
            var priceEl = document.getElementById('prix-tirage');
            if (priceEl) priceEl.textContent = prixTirage;
            var btnTirer = document.getElementById('btn-tirer');
            if (btnTirer) btnTirer.textContent = 'Tirer une carte (' + prixTirage + ' jetons)';
        } catch (err) {
            console.error('[REN] Erreur config jeu:', err);
        }
    }

    async function loadLots() {
        try {
            var { data } = await window.REN.supabase.from('jeu_lots').select('*').order('pourcentage', { ascending: false });
            lots = data || [];
            renderLots();
        } catch (err) {
            console.error('[REN] Erreur lots:', err);
        }
    }

    function renderLots() {
        var container = document.getElementById('lots-list');
        if (!container) return;

        if (!lots.length) {
            container.innerHTML = '<p class="text-muted" style="padding:1rem;">Aucun lot configure.</p>';
            return;
        }

        var html = '<div class="ranking-list">';
        lots.forEach(function (lot) {
            html += '<div class="ranking-item">';
            html += '<div class="ranking-item__left">';
            html += '<span class="ranking-item__name">' + lot.nom + '</span>';
            html += '</div>';
            html += '<span class="ranking-item__value">' + lot.pourcentage + '%</span>';
            html += '</div>';
        });
        html += '</div>';
        container.innerHTML = html;
    }

    function updateJetonsDisplay() {
        var el = document.getElementById('jetons-count');
        if (el && window.REN.currentProfile) {
            el.textContent = window.REN.currentProfile.jetons || 0;
        }
    }

    function setupDraw() {
        var btn = document.getElementById('btn-tirer');
        if (!btn) return;

        btn.addEventListener('click', async function () {
            if (isDrawing) return;

            var jetonsActuels = window.REN.currentProfile.jetons || 0;
            if (jetonsActuels < prixTirage) {
                window.REN.toast('Pas assez de jetons ! (' + jetonsActuels + '/' + prixTirage + ')', 'error');
                return;
            }

            if (!lots.length) {
                window.REN.toast('Aucun lot configure.', 'error');
                return;
            }

            isDrawing = true;
            btn.disabled = true;

            /* Tirer un lot aleatoire selon les pourcentages */
            var selectedLot = drawRandomLot();

            /* Reset toutes les cartes */
            var cards = document.querySelectorAll('.game-card');
            cards.forEach(function (card) { card.classList.remove('flipped'); });

            /* Attendre un petit moment */
            await sleep(300);

            /* Retourner une carte aleatoire */
            var randomCardIndex = Math.floor(Math.random() * cards.length);
            var chosenCard = cards[randomCardIndex];
            var backText = chosenCard.querySelector('.lot-name');
            if (backText) backText.textContent = selectedLot.nom;
            chosenCard.classList.add('flipped');

            /* Determiner le resultat */
            var resultatType = 'normal';
            var gainJetons = selectedLot.gain_jetons || 0;

            /* Enregistrer en DB */
            try {
                /* Deduire les jetons */
                var newJetons = jetonsActuels - prixTirage + gainJetons;
                await window.REN.supabase.from('profiles').update({ jetons: newJetons }).eq('id', window.REN.currentProfile.id);
                window.REN.currentProfile.jetons = newJetons;
                updateJetonsDisplay();

                /* Historique */
                await window.REN.supabase.from('jeu_historique').insert({
                    user_id: window.REN.currentProfile.id,
                    lot_id: selectedLot.id,
                    resultat: resultatType
                });

                var msg = 'Vous avez obtenu : ' + selectedLot.nom;
                if (gainJetons > 0) msg += ' (+' + gainJetons + ' jetons)';
                window.REN.toast(msg, 'success');

            } catch (err) {
                console.error('[REN] Erreur tirage:', err);
                window.REN.toast('Erreur lors du tirage.', 'error');
            }

            setTimeout(function () {
                isDrawing = false;
                btn.disabled = false;
            }, 2000);
        });
    }

    function drawRandomLot() {
        var total = lots.reduce(function (sum, l) { return sum + parseFloat(l.pourcentage); }, 0);
        var rand = Math.random() * total;
        var cumul = 0;
        for (var i = 0; i < lots.length; i++) {
            cumul += parseFloat(lots[i].pourcentage);
            if (rand <= cumul) return lots[i];
        }
        return lots[lots.length - 1];
    }

    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }
})();
