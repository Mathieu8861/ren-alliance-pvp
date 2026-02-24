/* ============================================ */
/* Alliance REN - Defense                      */
/* Formulaire de declaration de defense PvP    */
/* ============================================ */
(function () {
    'use strict';

    var combatType = 'defense';
    var nbAllies = 1;
    var nbEnnemis = 1;
    var selectedAllies = [];
    var resultat = null;
    var allProfiles = [];
    var allAlliances = [];

    document.addEventListener('ren:ready', init);

    async function init() {
        if (!window.REN.supabase || !window.REN.currentProfile) return;
        await loadData();
        setupCountButtons();
        setupAllianceSelect();
        setupResultButtons();
        setupSubmit();
        renderAlliesList();
    }

    async function loadData() {
        try {
            var [profilesRes, alliancesRes] = await Promise.all([
                window.REN.supabase.from('profiles').select('id, username, mules').eq('is_validated', true).order('username'),
                window.REN.supabase.from('alliances').select('*').order('nom')
            ]);
            allProfiles = profilesRes.data || [];
            allAlliances = alliancesRes.data || [];
        } catch (err) {
            console.error('[REN] Erreur chargement donnees:', err);
        }
    }

    function setupCountButtons() {
        setupCountGroup('count-allies', function (val) {
            nbAllies = val;
            renderAlliesList();
        });
        setupCountGroup('count-ennemis', function (val) {
            nbEnnemis = val;
        });
    }

    function setupCountGroup(containerId, callback) {
        var container = document.getElementById(containerId);
        if (!container) return;
        var btns = container.querySelectorAll('.count-btn');
        btns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                btns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                callback(parseInt(btn.getAttribute('data-value')));
            });
        });
    }

    function renderAlliesList() {
        var container = document.getElementById('allies-list');
        if (!container) return;
        selectedAllies = [window.REN.currentProfile.id];
        var selfText = window.REN.currentProfile.username;
        var myMules = window.REN.currentProfile.mules || [];
        if (myMules.length > 0) {
            selfText += ' <span class="combat-form__ally-sep">/</span> ' + myMules.join(' <span class="combat-form__ally-sep">/</span> ');
        }
        var html = '<div class="combat-form__ally-self">' + selfText + ' <span>(vous)</span></div>';
        for (var i = 1; i < nbAllies; i++) {
            html += '<select class="form-select ally-select" data-index="' + i + '">';
            html += '<option value="">Allie ' + (i + 1) + '</option>';
            allProfiles.forEach(function (p) {
                if (p.id !== window.REN.currentProfile.id) {
                    html += '<option value="' + p.id + '">' + p.username + '</option>';
                    if (p.mules && p.mules.length > 0) {
                        p.mules.forEach(function (mule) {
                            html += '<option value="' + p.id + '">&#8627; ' + mule + '</option>';
                        });
                    }
                }
            });
            html += '</select>';
        }
        container.innerHTML = html;
        container.querySelectorAll('.ally-select').forEach(function (sel) {
            sel.addEventListener('change', function () { updateSelectedAllies(); });
        });
    }

    function updateSelectedAllies() {
        selectedAllies = [window.REN.currentProfile.id];
        document.querySelectorAll('.ally-select').forEach(function (sel) {
            if (sel.value) selectedAllies.push(sel.value);
        });
    }

    function setupAllianceSelect() {
        var select = document.getElementById('select-alliance');
        var customInput = document.getElementById('input-alliance-custom');
        if (!select) return;
        allAlliances.forEach(function (a) {
            var opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = a.nom + (a.tag ? ' [' + a.tag + ']' : '');
            select.appendChild(opt);
        });
        var optAutre = document.createElement('option');
        optAutre.value = 'autre';
        optAutre.textContent = 'Autre / Pas d\'alliance';
        select.appendChild(optAutre);
        select.addEventListener('change', function () {
            if (customInput) customInput.style.display = select.value === 'autre' ? '' : 'none';
        });
    }

    function setupResultButtons() {
        var btnV = document.getElementById('btn-victoire');
        var btnD = document.getElementById('btn-defaite');
        var sectionCommentaire = document.getElementById('section-commentaire');
        if (btnV) {
            btnV.addEventListener('click', function () {
                resultat = 'victoire';
                btnV.classList.add('active');
                if (btnD) btnD.classList.remove('active');
                if (sectionCommentaire) sectionCommentaire.style.display = '';
            });
        }
        if (btnD) {
            btnD.addEventListener('click', function () {
                resultat = 'defaite';
                btnD.classList.add('active');
                if (btnV) btnV.classList.remove('active');
                if (sectionCommentaire) sectionCommentaire.style.display = '';
            });
        }
    }

    function setupSubmit() {
        var btn = document.getElementById('btn-submit-combat');
        if (!btn) return;

        btn.addEventListener('click', async function () {
            if (!resultat) {
                window.REN.toast('Selectionnez victoire ou defaite.', 'error');
                return;
            }

            var selectAlliance = document.getElementById('select-alliance');
            var customInput = document.getElementById('input-alliance-custom');
            var allianceId = null;
            var allianceNom = null;

            if (selectAlliance && selectAlliance.value && selectAlliance.value !== 'autre') {
                allianceId = parseInt(selectAlliance.value);
            } else if (customInput && customInput.value.trim()) {
                allianceNom = customInput.value.trim();
            }

            var inputCommentaire = document.getElementById('input-commentaire');
            var commentaire = inputCommentaire && inputCommentaire.value.trim() ? inputCommentaire.value.trim() : null;

            btn.disabled = true;
            btn.textContent = 'Envoi...';

            try {
                var pointsRes = await window.REN.supabase.rpc('calculer_points', {
                    p_nb_allies: nbAllies,
                    p_nb_ennemis: nbEnnemis,
                    p_resultat: resultat,
                    p_alliance_id: allianceId,
                    p_type: combatType
                });

                var points = pointsRes.data || 0;

                var combatRes = await window.REN.supabase.from('combats').insert({
                    type: combatType,
                    auteur_id: window.REN.currentProfile.id,
                    alliance_ennemie_id: allianceId,
                    alliance_ennemie_nom: allianceNom,
                    nb_allies: nbAllies,
                    nb_ennemis: nbEnnemis,
                    resultat: resultat,
                    butin_kamas: 0,
                    points_gagnes: points,
                    commentaire: commentaire
                }).select().single();

                if (combatRes.error) throw combatRes.error;

                var participants = selectedAllies.map(function (uid) {
                    return { combat_id: combatRes.data.id, user_id: uid };
                });
                if (participants.length > 0) {
                    await window.REN.supabase.from('combat_participants').insert(participants);
                }

                var msg = resultat === 'victoire'
                    ? 'Victoire enregistree ! +' + points + ' points'
                    : 'Defaite enregistree. ' + points + ' points';
                window.REN.toast(msg, resultat === 'victoire' ? 'success' : 'info');

                setTimeout(function () { window.location.reload(); }, 1500);
            } catch (err) {
                console.error('[REN] Erreur enregistrement combat:', err);
                window.REN.toast('Erreur: ' + (err.message || 'Impossible d\'enregistrer'), 'error');
            }

            btn.disabled = false;
            btn.textContent = 'Enregistrer la defense';
        });
    }
})();
