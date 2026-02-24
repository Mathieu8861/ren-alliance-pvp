/* ============================================ */
/* Alliance REN - Builds                       */
/* Builds recommandes par l'alliance           */
/* ============================================ */
(function () {
    'use strict';

    var allBuilds = [];

    document.addEventListener('ren:ready', init);

    async function init() {
        if (!window.REN.supabase || !window.REN.currentProfile) return;
        await loadBuilds();

        /* Barre de recherche */
        var searchInput = document.getElementById('builds-search');
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                var query = this.value.toLowerCase().trim();
                if (!query) {
                    renderBuilds(allBuilds);
                    return;
                }
                var filtered = allBuilds.filter(function (b) {
                    var titre = (b.titre || '').toLowerCase();
                    var desc = (b.description || '').toLowerCase();
                    var type = (b.type_build || '').toLowerCase();
                    return titre.indexOf(query) !== -1 || desc.indexOf(query) !== -1 || type.indexOf(query) !== -1;
                });
                renderBuilds(filtered);
            });
        }
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

            allBuilds = data || [];
            renderBuilds(allBuilds);
        } catch (err) {
            console.error('[REN] Erreur builds:', err);
            grid.innerHTML = '<p class="text-muted" style="padding:1rem;">Erreur de chargement.</p>';
        }
    }

    function renderBuilds(builds) {
        var grid = document.getElementById('builds-grid');
        if (!grid) return;

        if (!builds || !builds.length) {
            grid.innerHTML = '<p class="text-muted" style="padding:1rem;">Aucun build trouve.</p>';
            return;
        }

        var html = '';
        builds.forEach(function (b) {
            html += '<div class="build-card">';
            if (b.image_url) {
                html += '<div class="build-card__image">';
                html += '<img src="' + b.image_url + '" alt="' + b.titre + '" loading="lazy">';
                html += '</div>';
            }
            html += '<div class="build-card__body">';
            /* Badges type + kamas */
            if (b.type_build || b.valeur_kamas) {
                html += '<div class="build-card__meta">';
                if (b.type_build) {
                    html += '<span class="badge badge--' + b.type_build + '">' + b.type_build.toUpperCase() + '</span>';
                }
                if (b.valeur_kamas) {
                    html += '<span class="build-card__kamas"><span class="build-card__kamas-label">Estimation de prix :</span> ' + Number(b.valeur_kamas).toLocaleString('fr-FR') + ' M</span>';
                }
                html += '</div>';
            }
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
            html += '</div>';
        });

        grid.innerHTML = html;
    }
})();
