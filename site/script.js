/* ============================================ */
/* Alliance REN - Script principal              */
/* Supabase init, auth guard, nav, utils        */
/* ============================================ */
(function () {
    'use strict';

    /* === CONFIG SUPABASE === */
    const SUPABASE_URL = 'https://sptvkumqciuegjuvmyhf.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwdHZrdW1xY2l1ZWdqdXZteWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjA1OTksImV4cCI6MjA4NzMzNjU5OX0.4RPkORUIhLxPDQ0F0PMtTxUC3Zw6ZmyoxS4aT3Agz8k';

    let supabaseClient = null;
    if (window.supabase && SUPABASE_URL !== 'VOTRE_SUPABASE_URL') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    /* === EXPOSE GLOBAL === */
    window.REN = {
        supabase: supabaseClient,
        currentUser: null,
        currentProfile: null,
        isReady: false
    };

    /* === CONSTANTES === */
    const MOBILE_BREAKPOINT = 768;
    const PAGES = ['accueil', 'attaque', 'defense', 'classement', 'historique', 'membres', 'builds', 'jeux'];
    const AUTH_PAGE = 'connexion.html';
    const ADMIN_PAGE = 'admin.html';

    /* === SELECTEURS === */
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const nav = document.querySelector('.nav');
    const navUsername = document.getElementById('nav-username');
    const navAdminLink = document.getElementById('nav-admin-link');
    const btnLogout = document.getElementById('btn-logout');
    const footerMemberCount = document.getElementById('footer-member-count');

    /* === AUTH GUARD === */
    async function checkAuth() {
        if (!window.REN.supabase) {
            console.warn('[REN] Supabase non configure. Mode demo.');
            window.REN.isReady = true;
            document.dispatchEvent(new Event('ren:ready'));
            return;
        }

        const currentPage = getCurrentPage();
        const isAuthPage = currentPage === 'connexion';
        const isAdminPage = currentPage === 'admin';

        try {
            const { data: { session } } = await window.REN.supabase.auth.getSession();

            if (!session && !isAuthPage) {
                window.location.href = AUTH_PAGE;
                return;
            }

            if (session && isAuthPage) {
                window.location.href = 'index.html';
                return;
            }

            if (session) {
                window.REN.currentUser = session.user;

                const { data: profile } = await window.REN.supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                window.REN.currentProfile = profile;

                if (profile && !profile.is_validated && !isAuthPage) {
                    showPendingValidation();
                    return;
                }

                if (isAdminPage && profile && !profile.is_admin) {
                    window.location.href = 'index.html';
                    return;
                }

                updateNavUser(profile);
                updateMemberCount();
            }
        } catch (err) {
            console.error('[REN] Erreur auth:', err);
        }

        window.REN.isReady = true;
        document.dispatchEvent(new Event('ren:ready'));
    }

    /* === NAV === */
    function getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop().replace('.html', '');
        if (!filename || filename === 'index') return 'accueil';
        return filename;
    }

    function setActiveNav() {
        const currentPage = getCurrentPage();
        const links = document.querySelectorAll('.nav__link');
        links.forEach(function (link) {
            const page = link.getAttribute('data-page');
            if (page === currentPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    function updateNavUser(profile) {
        if (navUsername && profile) {
            navUsername.textContent = profile.username;
            navUsername.style.cursor = 'pointer';
            navUsername.addEventListener('click', function () {
                window.location.href = 'profil.html';
            });
        }
        if (navAdminLink) {
            navAdminLink.style.display = (profile && profile.is_admin) ? '' : 'none';
        }
    }

    async function updateMemberCount() {
        if (!footerMemberCount || !window.REN.supabase) return;
        try {
            const { count } = await window.REN.supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('is_validated', true);
            if (count !== null) {
                footerMemberCount.textContent = count + ' Membres Inscrits';
            }
        } catch (err) {
            /* ignore */
        }
    }

    /* === MOBILE MENU === */
    function initMobileMenu() {
        if (!navToggle || !nav) return;

        navToggle.addEventListener('click', function () {
            navToggle.classList.toggle('active');
            nav.classList.toggle('active');
            document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
        });

        if (navMenu) {
            navMenu.addEventListener('click', function (e) {
                if (e.target.classList.contains('nav__link')) {
                    navToggle.classList.remove('active');
                    nav.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        }
    }

    /* === LOGOUT === */
    function initLogout() {
        if (!btnLogout) return;
        btnLogout.addEventListener('click', async function () {
            if (window.REN.supabase) {
                await window.REN.supabase.auth.signOut();
            }
            window.location.href = AUTH_PAGE;
        });
    }

    /* === PENDING VALIDATION === */
    function showPendingValidation() {
        document.body.innerHTML = '\
            <div class="pending-validation">\
                <div class="pending-validation__icon">&#9203;</div>\
                <h1 class="pending-validation__title">Compte en attente</h1>\
                <p class="pending-validation__text">\
                    Votre compte a bien ete cree. Un administrateur doit valider votre acces avant que vous puissiez utiliser le site.\
                </p>\
                <button class="btn btn--secondary mt-lg" onclick="window.location.href=\'connexion.html\'">\
                    Se deconnecter\
                </button>\
            </div>';
    }

    /* === TOAST SYSTEM === */
    window.REN.toast = function (message, type) {
        type = type || 'info';
        var container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        var toast = document.createElement('div');
        toast.className = 'toast toast--' + type;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(function () {
            toast.classList.add('removing');
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 3000);
    };

    /* === LOADING HELPERS === */
    window.REN.showLoading = function (container) {
        if (!container) return;
        container.innerHTML = '<div class="loading"><div class="spinner"></div> Chargement...</div>';
    };

    window.REN.hideLoading = function (container) {
        var loader = container ? container.querySelector('.loading') : null;
        if (loader) loader.remove();
    };

    /* === FORMAT HELPERS === */
    window.REN.formatKamas = function (value) {
        if (!value || value === 0) return '0 K';
        if (value >= 1000000000) return Math.floor(value / 1000000000).toLocaleString('fr-FR') + ' G';
        if (value >= 1000000) return Math.floor(value / 1000000).toLocaleString('fr-FR') + ' M';
        if (value >= 1000) return Math.floor(value / 1000).toLocaleString('fr-FR') + ' K';
        return value.toLocaleString('fr-FR');
    };

    /* === CADRES PROFIL - TIERS === */
    var TIERS = [
        { key: 'legendaire', min: 2000, name: 'Legendaire', title: 'Dieu du PVP', reward: 400 },
        { key: 'diamant', min: 1500, name: 'Diamant', title: 'Faucheuse des Champs', reward: 200 },
        { key: 'rubis', min: 1000, name: 'Rubis', title: 'Machine de Guerre', reward: 150 },
        { key: 'emeraude', min: 750, name: 'Emeraude', title: 'Seigneur de Guerre', reward: 100 },
        { key: 'saphir', min: 500, name: 'Saphir', title: 'Veteran des Arenes', reward: 70 },
        { key: 'or', min: 300, name: 'Or', title: 'Elite PVP', reward: 40 },
        { key: 'argent', min: 150, name: 'Argent', title: 'Combattant Confirme', reward: 20 },
        { key: 'bronze', min: 50, name: 'Bronze', title: 'Guerrier de Base', reward: 10 },
        { key: 'initie', min: 0, name: 'Initie', title: 'Joueur Lambda', reward: 0 }
    ];

    window.REN.getTierFromPoints = function (points) {
        var pts = points || 0;
        for (var i = 0; i < TIERS.length; i++) {
            if (pts >= TIERS[i].min) return TIERS[i];
        }
        return TIERS[TIERS.length - 1];
    };

    window.REN.buildAvatarFrame = function (avatarUrl, points, size) {
        var tier = window.REN.getTierFromPoints(points);
        var sz = size || 100;
        var containerSz = tier.key === 'legendaire' ? sz * 1.2 : sz * 1.15;
        var userSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        var imgContent = avatarUrl ? '<img src="' + avatarUrl + '" alt="Avatar">' : userSvg;
        var flames = '';
        if (tier.key === 'legendaire') {
            flames = '<div class="frame-flames">';
            for (var i = 0; i < 8; i++) flames += '<div class="frame-flame"></div>';
            flames += '</div>';
        }
        var html = '<div class="avatar-frame avatar-frame--' + tier.key + '" style="width:' + containerSz + 'px;height:' + containerSz + 'px;">';
        html += '<div class="avatar-frame__img" style="width:' + sz + 'px;height:' + sz + 'px;">' + imgContent + '</div>';
        html += flames;
        html += '</div>';
        return html;
    };

    /* Expose TIERS pour les autres modules */
    window.REN.TIERS_ASC = TIERS.slice().reverse(); /* initie -> legendaire */

    /* Claim des recompenses de palier (jetons) */
    window.REN.claimTierRewards = async function (totalPoints) {
        var profile = window.REN.currentProfile;
        if (!profile) return null;

        var claimed = profile.tier_rewards_claimed || [];
        var tiersAsc = window.REN.TIERS_ASC;
        var newClaims = [];
        var totalBonus = 0;

        for (var i = 0; i < tiersAsc.length; i++) {
            var t = tiersAsc[i];
            if (totalPoints >= t.min && t.reward > 0 && claimed.indexOf(t.key) === -1) {
                newClaims.push(t.key);
                totalBonus += t.reward;
            }
        }

        if (newClaims.length === 0) return null;

        var updatedClaimed = claimed.concat(newClaims);
        var newJetons = (profile.jetons || 0) + totalBonus;

        try {
            var { error } = await window.REN.supabase
                .from('profiles')
                .update({ tier_rewards_claimed: updatedClaimed, jetons: newJetons })
                .eq('id', window.REN.currentUser.id);

            if (error) throw error;

            profile.tier_rewards_claimed = updatedClaimed;
            profile.jetons = newJetons;

            return { newClaims: newClaims, totalBonus: totalBonus, newJetons: newJetons };
        } catch (err) {
            console.error('[REN] Erreur claim rewards:', err);
            return null;
        }
    };

    window.REN.formatNumber = function (value) {
        if (value === null || value === undefined) return '0';
        return Number(value).toLocaleString('fr-FR');
    };

    window.REN.formatDate = function (dateStr) {
        if (!dateStr) return '';
        var d = new Date(dateStr);
        var now = new Date();
        var diff = now - d;
        var minutes = Math.floor(diff / 60000);
        var hours = Math.floor(diff / 3600000);
        var days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'a l\'instant';
        if (minutes < 60) return 'il y a ' + minutes + ' min';
        if (hours < 24) return 'il y a ' + hours + ' h';
        if (days < 7) return 'il y a ' + days + ' j';

        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: undefined });
    };

    window.REN.formatDateFull = function (dateStr) {
        if (!dateStr) return '';
        var d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) +
            ', ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    /* === COMBAT FORM SHARED === */
    window.REN.initCombatForm = function (type) {
        /* Returns an object with references and submit handler - used by attaque.js and defense.js */
        return {
            type: type,
            nbAllies: 1,
            nbEnnemis: 1,
            selectedAllies: [],
            allianceEnnemieId: null,
            resultat: null,
            butinKamas: 0
        };
    };

    /* === INIT === */
    function init() {
        setActiveNav();
        initMobileMenu();
        initLogout();
        checkAuth();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
