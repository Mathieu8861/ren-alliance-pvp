-- =============================================
-- 008-slot.sql
-- Machine a Sous du Dieu Enutrof
-- Table historique + RPC jouer_slot()
-- =============================================

-- === TABLE: Historique des tirages slot ===
CREATE TABLE IF NOT EXISTS public.slot_historique (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    joueur_id UUID NOT NULL REFERENCES public.profiles(id),
    mise INTEGER NOT NULL,
    resultat TEXT[] NOT NULL,
    gain_jetons INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.slot_historique ENABLE ROW LEVEL SECURITY;

-- Joueur voit son propre historique
CREATE POLICY "slot_select_own" ON public.slot_historique
    FOR SELECT TO authenticated
    USING (joueur_id = auth.uid());

-- Insert via RPC uniquement (SECURITY DEFINER)
CREATE POLICY "slot_insert_own" ON public.slot_historique
    FOR INSERT TO authenticated
    WITH CHECK (joueur_id = auth.uid());

-- Admin voit tout
CREATE POLICY "slot_admin" ON public.slot_historique
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- === TABLE: Configuration slot (prix, symboles, etc.) ===
CREATE TABLE IF NOT EXISTS public.slot_config (
    id SERIAL PRIMARY KEY,
    symboles TEXT[] DEFAULT ARRAY['enutrof','kamas','pelle','coffre','pepite','jeton'],
    mises_possibles INTEGER[] DEFAULT ARRAY[1,5,10,25,50],
    actif BOOLEAN DEFAULT TRUE
);

INSERT INTO public.slot_config (symboles, mises_possibles) VALUES (
    ARRAY['enutrof','kamas','pelle','coffre','pepite','jeton'],
    ARRAY[1,5,10,25,50]
) ON CONFLICT DO NOTHING;

ALTER TABLE public.slot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slot_config_select" ON public.slot_config
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "slot_config_admin" ON public.slot_config
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- === RPC: jouer_slot(p_mise) ===
-- Genere 3 symboles aleatoires, calcule les gains, met a jour les jetons
CREATE OR REPLACE FUNCTION public.jouer_slot(p_mise INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_joueur_id UUID;
    v_jetons INTEGER;
    v_symboles TEXT[];
    v_config_symboles TEXT[];
    v_s1 TEXT;
    v_s2 TEXT;
    v_s3 TEXT;
    v_gain INTEGER := 0;
    v_multiplicateur INTEGER := 0;
    v_nouveau_solde INTEGER;
BEGIN
    v_joueur_id := auth.uid();
    IF v_joueur_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifie';
    END IF;

    -- Lire solde joueur
    SELECT jetons INTO v_jetons FROM public.profiles WHERE id = v_joueur_id;
    IF v_jetons IS NULL THEN
        RAISE EXCEPTION 'Joueur introuvable';
    END IF;

    -- Verifier la mise
    IF p_mise < 1 THEN
        RAISE EXCEPTION 'Mise invalide';
    END IF;
    IF v_jetons < p_mise THEN
        RAISE EXCEPTION 'Solde insuffisant';
    END IF;

    -- Charger les symboles depuis la config
    SELECT symboles INTO v_config_symboles FROM public.slot_config WHERE actif = true LIMIT 1;
    IF v_config_symboles IS NULL THEN
        v_config_symboles := ARRAY['enutrof','kamas','pelle','coffre','pepite','jeton'];
    END IF;

    -- Generer 3 symboles aleatoires
    v_s1 := v_config_symboles[1 + floor(random() * array_length(v_config_symboles, 1))::int];
    v_s2 := v_config_symboles[1 + floor(random() * array_length(v_config_symboles, 1))::int];
    v_s3 := v_config_symboles[1 + floor(random() * array_length(v_config_symboles, 1))::int];
    v_symboles := ARRAY[v_s1, v_s2, v_s3];

    -- Calculer les gains
    IF v_s1 = v_s2 AND v_s2 = v_s3 THEN
        -- Triple identique
        IF v_s1 = 'enutrof' THEN
            v_multiplicateur := 50;  -- JACKPOT
        ELSIF v_s1 = 'kamas' THEN
            v_multiplicateur := 20;
        ELSIF v_s1 = 'coffre' THEN
            v_multiplicateur := 15;
        ELSE
            v_multiplicateur := 10;
        END IF;
    ELSIF v_s1 = v_s2 OR v_s2 = v_s3 OR v_s1 = v_s3 THEN
        -- Paire
        IF (v_s1 = 'enutrof' AND v_s2 = 'enutrof') OR (v_s2 = 'enutrof' AND v_s3 = 'enutrof') OR (v_s1 = 'enutrof' AND v_s3 = 'enutrof') THEN
            v_multiplicateur := 5;   -- Paire Enutrof
        ELSE
            v_multiplicateur := 2;   -- Paire normale
        END IF;
    END IF;

    v_gain := p_mise * v_multiplicateur;

    -- Mettre a jour les jetons : -mise +gain
    v_nouveau_solde := v_jetons - p_mise + v_gain;
    UPDATE public.profiles SET jetons = v_nouveau_solde WHERE id = v_joueur_id;

    -- Historique
    INSERT INTO public.slot_historique (joueur_id, mise, resultat, gain_jetons)
    VALUES (v_joueur_id, p_mise, v_symboles, v_gain);

    RETURN jsonb_build_object(
        'symboles', to_jsonb(v_symboles),
        'gain', v_gain,
        'multiplicateur', v_multiplicateur,
        'nouveau_solde', v_nouveau_solde
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
