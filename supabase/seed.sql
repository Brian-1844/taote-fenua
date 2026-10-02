-- Données FICTIVES pour tester la vraie base (facultatif).
-- À supprimer avant l'ouverture au public :  delete from public.etablissements where nom like '%Démo%';  delete from public.gardes where source = 'Démo';

insert into public.etablissements (id, nom, type, specialite, ile, commune, pk, cote, repere, adresse, lat, lng, tel_fixe, tel_mobile, mode_accueil, horaires, infos, actif) values
  ('00000000-0000-4000-8000-000000000001', 'Cabinet médical Démo Taapuna', 'medecin', 'Médecin généraliste', 'Tahiti', 'Punaauia', '15,2', 'mer', 'Démo : en face de l''arrêt de bus', null, -17.6105, -149.6105, '40 00 00 01', '87 00 00 01', 'mixte', '{"lun": [["07:00", "12:00"], ["14:00", "18:00"]], "mar": [["07:00", "12:00"], ["14:00", "18:00"]], "mer": [["07:00", "12:00"], ["14:00", "18:00"]], "jeu": [["07:00", "12:00"], ["14:00", "18:00"]], "ven": [["07:00", "12:00"], ["14:00", "17:00"]], "sam": [["07:00", "11:00"]], "dim": []}'::jsonb, 'Parking devant le cabinet · accès fauteuil roulant. Sans rendez-vous le matin, sur rendez-vous l''après-midi.', True),
  ('00000000-0000-4000-8000-000000000002', 'Pharmacie Démo Outumaoro', 'pharmacie', 'Pharmacie', 'Tahiti', 'Punaauia', null, null, null, 'Démo : centre commercial, rez-de-chaussée', -17.5905, -149.6115, '40 00 00 02', null, 'sans_rdv', '{"lun": [["07:30", "19:00"]], "mar": [["07:30", "19:00"]], "mer": [["07:30", "19:00"]], "jeu": [["07:30", "19:00"]], "ven": [["07:30", "19:00"]], "sam": [["08:00", "18:00"]], "dim": [["08:00", "10:00"]]}'::jsonb, 'Préparation d''ordonnance à l''avance possible par téléphone.', True),
  ('00000000-0000-4000-8000-000000000003', 'Cabinet dentaire Démo Punaruu', 'dentiste', 'Chirurgien-dentiste', 'Tahiti', 'Punaauia', '14', 'montagne', 'Démo : au-dessus de la boulangerie', null, -17.6205, -149.6055, '40 00 00 03', null, 'sur_rdv', '{"lun": [["08:00", "12:00"], ["13:30", "17:00"]], "mar": [["08:00", "12:00"], ["13:30", "17:00"]], "mer": [["08:00", "12:00"]], "jeu": [["08:00", "12:00"], ["13:30", "17:00"]], "ven": [["08:00", "12:00"], ["13:30", "16:00"]], "sam": [], "dim": []}'::jsonb, 'Uniquement sur rendez-vous, par téléphone.', True),
  ('00000000-0000-4000-8000-000000000004', 'Cabinet médical Démo Paofai', 'medecin', 'Médecin généraliste', 'Tahiti', 'Papeete', null, null, 'Démo : près du front de mer', 'Démo : rue fictive, immeuble B', -17.5395, -149.5735, '40 00 00 04', null, 'sans_rdv', '{"lun": [["06:30", "18:00"]], "mar": [["06:30", "18:00"]], "mer": [["06:30", "18:00"]], "jeu": [["06:30", "18:00"]], "ven": [["06:30", "18:00"]], "sam": [["07:00", "12:00"]], "dim": []}'::jsonb, null, True),
  ('00000000-0000-4000-8000-000000000005', 'Kinésithérapie Démo Faa''a', 'kine', 'Masseur-kinésithérapeute', 'Tahiti', 'Faa''a', '5,5', 'montagne', null, null, -17.5555, -149.5985, '40 00 00 05', '87 00 00 05', 'sur_rdv', '{"lun": [["07:00", "19:00"]], "mar": [["07:00", "19:00"]], "mer": [["07:00", "19:00"]], "jeu": [["07:00", "19:00"]], "ven": [["07:00", "19:00"]], "sam": [], "dim": []}'::jsonb, null, True),
  ('00000000-0000-4000-8000-000000000006', 'Dispensaire Démo de Moorea', 'dispensaire', 'Dispensaire', 'Moorea', 'Moorea-Maiao', '4', 'mer', 'Démo : à côté de la mairie annexe', null, -17.5465, -149.7975, '40 00 00 06', null, 'sans_rdv', '{"lun": [["07:30", "15:30"]], "mar": [["07:30", "15:30"]], "mer": [["07:30", "15:30"]], "jeu": [["07:30", "15:30"]], "ven": [["07:30", "14:30"]], "sam": [], "dim": []}'::jsonb, 'Médicaments délivrés sur place pour les patients du dispensaire.', True)
on conflict (id) do nothing;

insert into public.statuts (etablissement_id, niveau, attente_min, personnes, sans_rdv_aujourdhui) values
  ('00000000-0000-4000-8000-000000000001', 'peu', 15, 3, true),
  ('00000000-0000-4000-8000-000000000002', 'beaucoup', 35, 9, true),
  ('00000000-0000-4000-8000-000000000004', 'complet', null, null, true),
  ('00000000-0000-4000-8000-000000000006', 'peu', 10, 2, true)
on conflict (etablissement_id) do nothing;

-- Gardes de démo : du moment présent jusqu'à dans 2 jours
insert into public.gardes (type, secteur, ile, nom, tel, adresse, horaires_texte, source, debut, fin) values
  ('medecin', 'Papeete · Faa''a · Punaauia', 'Tahiti', 'Dr Démo A', '40 00 01 01', null, 'sam. 12–22 h · dim. 6–22 h', 'Démo', now() - interval '1 hour', now() + interval '2 days'),
  ('medecin', 'Papeete · Pirae · Arue · Mahina', 'Tahiti', 'Dr Démo B', '40 00 01 02', null, 'sam. 12–22 h · dim. 6–22 h', 'Démo', now() - interval '1 hour', now() + interval '2 days'),
  ('medecin', 'Paea', 'Tahiti', 'Dr Démo C', '40 00 01 03', null, 'sam. 12–18 h · dim. 9–11 h', 'Démo', now() - interval '1 hour', now() + interval '2 days'),
  ('medecin', 'Moorea', 'Moorea', 'Dr Démo D', '40 00 01 04', null, 'sam. 12–18 h · dim. 8–18 h', 'Démo', now() - interval '1 hour', now() + interval '2 days'),
  ('pharmacie', 'Tahiti Ouest · Punaauia · Paea', 'Tahiti', 'Pharmacie Démo Outumaoro', '40 00 00 02', 'Démo : centre commercial, rez-de-chaussée', 'sam. 12–20 h · dim. 8–20 h', 'Démo', now() - interval '1 hour', now() + interval '2 days'),
  ('pharmacie', 'Papeete · Pirae · Arue', 'Tahiti', 'Pharmacie Démo Centre', '40 00 02 02', 'Démo : rue fictive', 'sam. 12–20 h · dim. 8–20 h', 'Démo', now() - interval '1 hour', now() + interval '2 days'),
  ('pharmacie', 'Moorea', 'Moorea', 'Pharmacie Démo Maharepa', '40 00 02 03', 'Démo : PK 6 côté mer', 'dim. 8–11 h', 'Démo', now() - interval '1 hour', now() + interval '2 days');
