/* ============================================ */
/* Alliance REN - Builds                       */
/* Builds recommandes par l'alliance           */
/* ============================================ */
(function () {
    'use strict';

    document.addEventListener('ren:ready', init);

    async function init() {
        if (!window.REN.supabase || !window.REN.currentProfile) return;
        await loadBuilds();
    }

    async function loadBuilds() {
        var grid = document.getElementById('builds-grid');
        if (!grid) return;

        try {
            var { data, error } = await window.REN.supabase
                .from('builds')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || !data.length) {
                grid.innerHTML = '<p class="text-muted" style="padding:1rem;">Aucun build publie pour le moment. Les administrateurs peuvent en ajouter depuis le panneau admin.</p>';
                return;
            }

            var html = '';
            data.forEach(function (b) {
                html += '<div class="build-card">';
                html += '<div class="build-card__title">' + b.titre + '</div>';
                if (b.description) {
                    html += '<div class="build-card__desc">' + b.description + '</div>';
                }
                if (b.lien_dofusbook) {
                    html += '<a class="build-card__link" href="' + b.lien_dofusbook + '" target="_blank" rel="noopener noreferrer">';
                    html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
                    html += ' Voir sur Dofusbook';
                    html += '</a>';
                }
                html += '</div>';
            });

            grid.innerHTML = html;
        } catch (err) {
            console.error('[REN] Erreur builds:', err);
            grid.innerHTML = '<p class="text-muted" style="padding:1rem;">Erreur de chargement.</p>';
        }
    }
})();
