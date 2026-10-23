/* Jeu de données de DÉMONSTRATION pour PMSB Gestion — tout est inventé.
   Aucun client, montant, numéro ou coordonnée réels. Utilisé uniquement
   pour des captures vidéo LTNS°, dans une base locale jetable. */

import bcrypt from "bcryptjs";
import { PrismaClient, type Prisma } from "@prisma/client";
import { versTexte } from "../lib/calculs";
import {
  acomptesParTaux,
  calculerAcompte,
  calculerSituation,
  ETAT_INITIAL,
  etatDepuisLignes,
  totauxFacture,
  type LigneCalculee,
  type Marche,
} from "../lib/facturation";

const db = new PrismaClient();
const J = (iso: string) => new Date(`${iso}T00:00:00Z`);
const T = (iso: string, h = "10:00") => new Date(`${iso}T${h}:00Z`);
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setUTCDate(r.getUTCDate() + n); return r; };

async function reset() {
  await db.relance.deleteMany();
  await db.paiement.deleteMany();
  await db.ligneFacture.deleteMany();
  await db.facture.deleteMany({ where: { factureOrigineId: { not: null } } });
  await db.facture.deleteMany();
  await db.achat.deleteMany();
  await db.ligneDevis.deleteMany();
  await db.devis.deleteMany();
  await db.document.deleteMany();
  await db.client.deleteMany();
  await db.ouvrage.deleteMany();
  await db.compteur.deleteMany();
  await db.entreprise.deleteMany();
  await db.tentativeConnexion.deleteMany();
  await db.utilisateur.deleteMany();
}

async function main() {
  await reset();

  const user = await db.utilisateur.create({
    data: { email: "demo@exemple.fr", nom: "Alex Démo", motDePasse: await bcrypt.hash("demo-ltns-2026!", 10) },
  });

  // Identité de l'entreprise : coordonnées FICTIVES (le nom et le logo restent ceux de l'appli).
  const entreprise = await db.entreprise.create({
    data: {
      id: 1,
      raisonSociale: "PMSB",
      nomCommercial: "Prestations Multi Services Bâtiment",
      formeJuridique: "SARL",
      capital: "10 000 €",
      siret: "00000000000000",
      rcs: "RCS Démo 000 000 000",
      tvaIntracom: "FR00000000000",
      codeApe: "4334Z",
      adresse: "1 rue de l'Exemple",
      codePostal: "94000",
      ville: "Ville-Démo",
      telephone: "01 99 00 12 34 / 06 39 98 00 00",
      email: "contact@exemple.fr",
      siteWeb: "exemple.fr",
      iban: "FR76 0000 0000 0000 0000 0000 000",
      bic: "DEMOFRPPXXX",
      assureurNom: "Assureur Démo",
      assureurAdresse: "1 place de l'Exemple, 75000 Paris",
      assurancePolice: "DEMO-000000",
      assuranceCouverture: "France métropolitaine",
      mediateurNom: "Médiateur de démonstration",
      mediateurSite: "exemple.fr",
      validiteDevisJours: 30,
      acompteParDefaut: "30",
    },
  });

  /* ── Bibliothèque de prix (prix inventés) ── */
  const ouvrages: [string, string, string, string, string, string][] = [
    ["Installation", "Installation de chantier et déplacement", "Amenée et repli du matériel, protections.", "forfait", "250", "10"],
    ["Installation", "Échafaudage de façade, montage et démontage", "Échafaudage de pied conforme, filets de protection.", "m²", "12", "10"],
    ["Installation", "Protection des abords, sols et menuiseries", "Bâchage, film polyane, ruban adhésif.", "forfait", "450", "10"],
    ["Ravalement", "Nettoyage haute pression de la façade", "Lavage à l'eau sous pression, rinçage.", "m²", "8.5", "10"],
    ["Ravalement", "Traitement anti-mousse et fongicide", "Application au pulvérisateur, temps d'action respecté.", "m²", "4.2", "10"],
    ["Ravalement", "Reprise des fissures", "Ouverture, rebouchage au mortier, entoilage.", "ml", "18", "10"],
    ["Ravalement", "Enduit monocouche gratté", "Enduit à la chaux, finition grattée.", "m²", "42", "10"],
    ["Ravalement", "Peinture de façade pliolite, 2 couches", "Impression puis deux couches, teinte au choix.", "m²", "28", "10"],
    ["Ravalement", "Imperméabilisation de façade (I3)", "Revêtement semi-épais, classe D3.", "m²", "34", "10"],
    ["Isolation", "Isolation thermique par l'extérieur, PSE 140 mm", "Collage et chevillage, sous-enduit armé, finition.", "m²", "135", "5.5"],
    ["Isolation", "Isolation des combles perdus, laine soufflée 300 mm", "R ≥ 7, repérage des boîtiers électriques.", "m²", "32", "5.5"],
    ["Peinture intérieure", "Préparation des murs", "Rebouchage, ponçage, dépoussiérage.", "m²", "9", "10"],
    ["Peinture intérieure", "Peinture des murs, 2 couches velours", "Peinture acrylique, finition velours.", "m²", "22", "10"],
    ["Peinture intérieure", "Peinture des plafonds, 2 couches mat", "Peinture acrylique, finition mate.", "m²", "24", "10"],
    ["Peinture intérieure", "Peinture des boiseries et portes", "Ponçage, impression, laque satinée.", "u", "85", "10"],
    ["Maçonnerie", "Reprise d'appui de fenêtre", "Purge, ragréage, larmier.", "u", "95", "10"],
    ["Maçonnerie", "Ragréage et étanchéité des balcons", "Ragréage, résine d'étanchéité circulable.", "m²", "48", "10"],
    ["Divers", "Évacuation des gravats et nettoyage de fin de chantier", "", "forfait", "380", "10"],
  ];
  for (const [categorie, designation, description, unite, prix, tva] of ouvrages) {
    await db.ouvrage.create({ data: { categorie, designation, description, unite, prixUnitaireHT: prix, tauxTva: tva } });
  }
  const ouv = (d: string) => {
    const o = ouvrages.find((x) => x[1] === d);
    if (!o) throw new Error(`Ouvrage inconnu : ${d}`);
    return o;
  };

  /* ── Clients (tous inventés, numéros réservés à la fiction) ── */
  const cli = async (data: Prisma.ClientCreateInput) => db.client.create({ data });
  const lefevre = await cli({ type: "PARTICULIER", civilite: "M.", prenom: "Thomas", nom: "Lefèvre", email: "t.lefevre@exemple.fr", telephone: "06 39 98 10 21", adresse: "14 allée des Peupliers", codePostal: "94100", ville: "Saint-Maur-des-Fossés", creeLe: T("2026-08-03") });
  const glycines = await cli({ type: "PROFESSIONNEL", nom: "SCI Les Glycines", contact: "M. Durand, gérant", siret: "00000000000101", tvaIntracom: "FR00000000101", email: "gestion@exemple.fr", telephone: "01 99 00 45 12", adresse: "8 rue des Glycines", codePostal: "94300", ville: "Vincennes", creeLe: T("2026-08-11") });
  const parc = await cli({ type: "PROFESSIONNEL", nom: "Syndic Résidence du Parc", contact: "Mme Garnier, gestionnaire", siret: "00000000000202", email: "syndic.parc@exemple.fr", telephone: "01 99 00 78 30", adresse: "3 avenue du Parc", codePostal: "94000", ville: "Créteil", creeLe: T("2026-07-02") });
  const fontaine = await cli({ type: "PARTICULIER", civilite: "Mme", prenom: "Claire", nom: "Fontaine", email: "claire.fontaine@exemple.fr", telephone: "06 39 98 22 47", adresse: "27 rue Victor-Hugo", codePostal: "94130", ville: "Nogent-sur-Marne", creeLe: T("2026-09-01") });
  const marchand = await cli({ type: "PARTICULIER", civilite: "Mme", prenom: "Sophie", nom: "Marchand", email: "s.marchand@exemple.fr", telephone: "06 39 98 31 09", adresse: "5 impasse des Lilas", codePostal: "94170", ville: "Le Perreux-sur-Marne", creeLe: T("2026-10-05") });
  const tilleuls = await cli({ type: "PROFESSIONNEL", nom: "Copropriété Les Tilleuls", contact: "M. Roche, président du conseil syndical", email: "cs.tilleuls@exemple.fr", telephone: "01 99 00 63 55", adresse: "41 boulevard des Tilleuls", codePostal: "94210", ville: "La Varenne", creeLe: T("2026-09-10") });
  const robert = await cli({ type: "PARTICULIER", civilite: "M. et Mme", nom: "Robert", email: "famille.robert@exemple.fr", telephone: "06 39 98 54 76", adresse: "9 rue des Écoles", codePostal: "94380", ville: "Bonneuil-sur-Marne", creeLe: T("2026-09-28") });
  const perrin = await cli({ type: "PARTICULIER", civilite: "Mme", prenom: "Nadia", nom: "Perrin", email: "n.perrin@exemple.fr", telephone: "06 39 98 67 12", adresse: "2 chemin Vert", codePostal: "94370", ville: "Sucy-en-Brie", creeLe: T("2026-09-12") });
  const lambert = await cli({ type: "PARTICULIER", civilite: "M.", prenom: "Hugo", nom: "Lambert", email: "hugo.lambert@exemple.fr", telephone: "06 39 98 70 88", adresse: "16 rue Pasteur-Démo", codePostal: "94450", ville: "Limeil-Brévannes", creeLe: T("2026-10-16") });
  const horizon = await cli({ type: "PROFESSIONNEL", nom: "Bâtir Horizon (démo)", contact: "Service travaux", siret: "00000000000303", tvaIntracom: "FR00000000303", email: "travaux@exemple.fr", telephone: "01 99 00 90 14", adresse: "120 avenue de l'Industrie", codePostal: "94000", ville: "Créteil", creeLe: T("2026-10-12") });

  /* ── Devis ── */
  let nDev = 0;
  let nDr = 0;
  type L = { type: "SECTION" | "OUVRAGE" | "TEXTE"; designation: string; description?: string; quantite?: string; unite?: string; prixUnitaireHT?: string; tauxTva?: string };
  const S = (designation: string): L => ({ type: "SECTION", designation });
  const O = (nom: string, quantite: string): L => {
    const o = ouv(nom);
    return { type: "OUVRAGE", designation: o[1], description: o[2], quantite, unite: o[3], prixUnitaireHT: o[4], tauxTva: o[5] };
  };
  const TX = (designation: string): L => ({ type: "TEXTE", designation });

  async function devis(p: {
    client: { id: string; adresse: string; codePostal: string; ville: string };
    objet: string;
    emission: string;
    statut: "BROUILLON" | "ENVOYE" | "ACCEPTE" | "REFUSE";
    dateStatut?: string;
    lignes: L[];
    acompte?: string;
    remise?: string;
    materiel?: "PMSB" | "FOURNI";
    debut?: string;
    duree?: string;
    recu?: { ref: string };
    autoliquidation?: boolean;
    notes?: string;
    notesInternes?: string;
    creeLe?: string;
  }) {
    const numero = p.recu ? `DR-2026-${String(++nDr).padStart(4, "0")}` : `DEV-2026-${String(++nDev).padStart(4, "0")}`;
    return db.devis.create({
      data: {
        numero,
        origine: p.recu ? "RECU" : "EMIS",
        referenceExterne: p.recu?.ref ?? "",
        materiel: p.materiel ?? "PMSB",
        clientId: p.client.id,
        objet: p.objet,
        adresseChantier: p.client.adresse,
        codePostalChantier: p.client.codePostal,
        villeChantier: p.client.ville,
        dateEmission: J(p.emission),
        validiteJours: 30,
        dateDebutPrevue: p.debut ? J(p.debut) : null,
        dureeTravaux: p.duree ?? "",
        statut: p.statut,
        dateStatut: p.dateStatut ? T(p.dateStatut, "09:30") : null,
        autoliquidation: p.autoliquidation ?? false,
        remisePourcent: p.remise ?? "0",
        acomptePourcent: p.acompte ?? "30",
        conditionsPaiement: entreprise.conditionsPaiement,
        notes: p.notes ?? "",
        notesInternes: p.notesInternes ?? "",
        creeParId: user.id,
        creeLe: T(p.creeLe ?? p.emission, "08:15"),
        lignes: {
          create: p.lignes.map((l, ordre) => ({
            ordre,
            type: l.type,
            designation: l.designation,
            description: l.description ?? "",
            quantite: l.quantite ?? "0",
            unite: l.unite ?? "",
            prixUnitaireHT: l.prixUnitaireHT ?? "0",
            tauxTva: l.tauxTva ?? "10",
          })),
        },
      },
      include: { lignes: { orderBy: { ordre: "asc" } } },
    });
  }

  const d1 = await devis({
    client: lefevre, objet: "Ravalement de la façade sur rue", emission: "2026-08-10", statut: "ACCEPTE", dateStatut: "2026-08-20",
    debut: "2026-09-07", duree: "3 semaines",
    lignes: [
      S("Lot 1 — Installation"), O("Installation de chantier et déplacement", "1"), O("Échafaudage de façade, montage et démontage", "120"),
      S("Lot 2 — Ravalement"), O("Nettoyage haute pression de la façade", "120"), O("Traitement anti-mousse et fongicide", "120"),
      O("Reprise des fissures", "22"), O("Peinture de façade pliolite, 2 couches", "120"),
      S("Lot 3 — Finitions"), O("Reprise d'appui de fenêtre", "4"), O("Évacuation des gravats et nettoyage de fin de chantier", "1"),
    ],
  });
  const d2 = await devis({
    client: glycines, objet: "Ravalement de l'immeuble R+3 sur rue", emission: "2026-08-18", statut: "ACCEPTE", dateStatut: "2026-08-28",
    acompte: "20", debut: "2026-09-14", duree: "8 semaines", remise: "3",
    lignes: [
      S("Lot 1 — Installation de chantier"), O("Installation de chantier et déplacement", "1"), O("Échafaudage de façade, montage et démontage", "420"),
      O("Protection des abords, sols et menuiseries", "1"),
      S("Lot 2 — Ravalement"), O("Nettoyage haute pression de la façade", "420"), O("Reprise des fissures", "85"), O("Enduit monocouche gratté", "160"),
      O("Peinture de façade pliolite, 2 couches", "260"),
      S("Lot 3 — Maçonnerie"), O("Reprise d'appui de fenêtre", "18"), O("Ragréage et étanchéité des balcons", "36"),
      TX("Teinte de la façade à valider sur échantillon avant application."),
      S("Lot 4 — Fin de chantier"), O("Évacuation des gravats et nettoyage de fin de chantier", "1"),
    ],
  });
  const d3 = await devis({
    client: parc, objet: "Imperméabilisation de la façade arrière et des balcons", emission: "2026-07-06", statut: "ACCEPTE", dateStatut: "2026-07-15",
    acompte: "0", debut: "2026-08-17", duree: "10 semaines",
    lignes: [
      S("Lot 1 — Installation"), O("Installation de chantier et déplacement", "1"), O("Échafaudage de façade, montage et démontage", "640"),
      S("Lot 2 — Façade arrière"), O("Nettoyage haute pression de la façade", "640"), O("Reprise des fissures", "140"), O("Imperméabilisation de façade (I3)", "640"),
      S("Lot 3 — Balcons"), O("Ragréage et étanchéité des balcons", "96"),
    ],
  });
  const d4 = await devis({
    client: fontaine, objet: "Peinture intérieure d'un appartement 3 pièces", emission: "2026-09-02", statut: "ACCEPTE", dateStatut: "2026-09-10",
    acompte: "0", materiel: "FOURNI", duree: "1 semaine",
    lignes: [
      S("Séjour et chambres"), O("Préparation des murs", "145"), O("Peinture des murs, 2 couches velours", "145"), O("Peinture des plafonds, 2 couches mat", "58"),
      O("Peinture des boiseries et portes", "6"),
      TX("Peinture fournie par la cliente."),
    ],
  });
  const d5 = await devis({
    client: marchand, objet: "Isolation des combles perdus", emission: "2026-10-08", statut: "ENVOYE", dateStatut: "2026-10-08",
    lignes: [S("Isolation"), O("Installation de chantier et déplacement", "1"), O("Isolation des combles perdus, laine soufflée 300 mm", "85")],
  });
  const d6 = await devis({
    client: tilleuls, objet: "Ravalement complet et isolation du pignon", emission: "2026-09-15", statut: "ENVOYE", dateStatut: "2026-09-15",
    lignes: [
      S("Lot 1 — Installation"), O("Installation de chantier et déplacement", "1"), O("Échafaudage de façade, montage et démontage", "520"),
      S("Lot 2 — Ravalement"), O("Nettoyage haute pression de la façade", "380"), O("Peinture de façade pliolite, 2 couches", "380"),
      S("Lot 3 — Isolation du pignon"), O("Isolation thermique par l'extérieur, PSE 140 mm", "140"),
    ],
  });
  const d7 = await devis({
    client: robert, objet: "Reprise des fissures et peinture de la façade", emission: "2026-09-29", statut: "ACCEPTE", dateStatut: "2026-10-06",
    debut: "2026-10-26", duree: "2 semaines",
    lignes: [
      S("Façade principale"), O("Échafaudage de façade, montage et démontage", "90"), O("Traitement anti-mousse et fongicide", "90"),
      O("Reprise des fissures", "18"), O("Peinture de façade pliolite, 2 couches", "90"),
    ],
  });
  const d8 = await devis({
    client: perrin, objet: "Peinture de la façade et des volets", emission: "2026-09-14", statut: "REFUSE", dateStatut: "2026-09-25",
    lignes: [S("Façade"), O("Nettoyage haute pression de la façade", "75"), O("Peinture de façade pliolite, 2 couches", "75")],
  });
  const d9 = await devis({
    client: lambert, objet: "Ravalement d'un pavillon", emission: "2026-10-19", statut: "ENVOYE", dateStatut: "2026-10-19",
    lignes: [
      S("Ravalement"), O("Échafaudage de façade, montage et démontage", "150"), O("Nettoyage haute pression de la façade", "150"),
      O("Enduit monocouche gratté", "150"),
    ],
  });
  const d10 = await devis({
    client: parc, objet: "Ravalement de la façade sur cour", emission: "2026-09-30", statut: "ACCEPTE", dateStatut: "2026-10-15",
    debut: "2026-11-09", duree: "5 semaines",
    lignes: [
      S("Lot 1 — Installation"), O("Échafaudage de façade, montage et démontage", "310"),
      S("Lot 2 — Ravalement"), O("Nettoyage haute pression de la façade", "310"), O("Reprise des fissures", "60"), O("Peinture de façade pliolite, 2 couches", "310"),
    ],
  });
  const d11 = await devis({
    client: glycines, objet: "Peinture de la cage d'escalier", emission: "2026-10-21", statut: "BROUILLON", creeLe: "2026-10-21",
    lignes: [
      S("Cage d'escalier — 4 niveaux"), O("Préparation des murs", "210"), O("Peinture des murs, 2 couches velours", "210"),
      O("Peinture des plafonds, 2 couches mat", "48"),
    ],
    notesInternes: "Exemple de démonstration.",
  });
  const d12 = await devis({
    client: tilleuls, objet: "Remplacement des appuis de fenêtre", emission: "2026-06-10", statut: "REFUSE", dateStatut: "2026-06-30",
    lignes: [S("Appuis"), O("Reprise d'appui de fenêtre", "24")],
  });
  const dr1 = await devis({
    client: horizon, objet: "Résidence neuve — lot peinture des façades (sous-traitance)", emission: "2026-10-12", statut: "BROUILLON",
    recu: { ref: "BH-2026-114" }, autoliquidation: true, materiel: "FOURNI", acompte: "0", creeLe: "2026-10-13",
    lignes: [S("Lot peinture"), O("Peinture de façade pliolite, 2 couches", "540"), O("Protection des abords, sols et menuiseries", "1")],
  });
  void d5; void d6; void d8; void d9; void d11; void d12; void dr1;

  /* ── Factures ── */
  let nFac = 0;
  const emises = new Map<string, { type: string; rang: number; lignes: LigneCalculee[] }[]>();

  const marcheDe = (d: typeof d1): Marche => ({
    lignes: d.lignes.map((l) => ({
      id: l.id, type: l.type, designation: l.designation, description: l.description,
      quantite: l.quantite.toString(), unite: l.unite, prixUnitaireHT: l.prixUnitaireHT.toString(), tauxTva: l.tauxTva.toString(),
    })),
    remisePourcent: d.remisePourcent.toString(),
    autoliquidation: d.autoliquidation,
  });

  async function emettre(
    d: typeof d1,
    client: { id: string },
    type: "ACOMPTE" | "SITUATION" | "SOLDE" | "FACTURE",
    lignes: LigneCalculee[],
    p: { emission: string; delai?: number; retenue?: number; periode?: string; rang?: number },
  ) {
    const delai = p.delai ?? 30;
    const retenue = p.retenue ?? 0;
    const t = totauxFacture(lignes, d.autoliquidation, retenue);
    const c = await db.client.findUniqueOrThrow({ where: { id: client.id } });
    const { id: _e, modificationLe: _m, ...emetteur } = entreprise;
    const { id: _c, creeLe: _cl, modifieLe: _ml, notes: _n, ...destinataire } = c;
    const numero = `FAC-2026-${String(++nFac).padStart(4, "0")}`;
    const f = await db.facture.create({
      data: {
        numero, type, statut: "EMISE", rang: p.rang ?? 0,
        clientId: client.id, devisId: d.id, objet: d.objet,
        adresseChantier: d.adresseChantier, codePostalChantier: d.codePostalChantier, villeChantier: d.villeChantier,
        periode: p.periode ?? "", dateEmission: J(p.emission), delaiPaiementJours: delai,
        dateEcheance: addDays(J(p.emission), delai), autoliquidation: d.autoliquidation,
        retenuePourcent: versTexte(retenue, 2),
        totalHT: versTexte(t.totalHT, 2), totalTVA: versTexte(t.totalTVA, 2), totalTTC: versTexte(t.totalTTC, 2),
        retenue: versTexte(t.retenue, 2), netAPayer: versTexte(t.netAPayer, 2),
        conditionsPaiement: "", notes: "",
        instantane: JSON.parse(JSON.stringify({ entreprise: emetteur, client: destinataire })),
        creeParId: user.id, creeLe: T(p.emission, "11:00"),
        lignes: {
          create: lignes.map((l, ordre) => ({
            ordre, type: l.type, designation: l.designation, description: l.description,
            quantite: l.quantite, unite: l.unite, prixUnitaireHT: l.prixUnitaireHT,
            tauxTva: versTexte(l.tauxTva, 2), montantHT: versTexte(l.montantHT, 2),
            ligneDevisId: l.ligneDevisId ?? null,
            marcheHT: l.marcheHT === undefined ? null : versTexte(l.marcheHT, 2),
            avancement: l.avancement === undefined ? null : versTexte(l.avancement, 2),
            cumulHT: l.cumulHT === undefined ? null : versTexte(l.cumulHT, 2),
          })),
        },
      },
    });
    const liste = emises.get(d.id) ?? [];
    liste.push({ type, rang: p.rang ?? 0, lignes });
    emises.set(d.id, liste);
    return { facture: f, totaux: t };
  }

  function acompte(d: typeof d1, pct: number) {
    return calculerAcompte(marcheDe(d), pct, d.numero);
  }
  function situation(d: typeof d1, avancement: Record<string, number> | number) {
    const m = marcheDe(d);
    const liste = emises.get(d.id) ?? [];
    const av = liste.filter((f) => f.type !== "ACOMPTE").sort((a, b) => a.rang - b.rang);
    const derniere = av.at(-1);
    const precedent = derniere ? etatDepuisLignes(derniere.lignes.map((l) => ({ ...l, avancement: l.avancement, cumulHT: l.cumulHT !== undefined ? versTexte(l.cumulHT, 2) : null, montantHT: versTexte(l.montantHT, 2), tauxTva: versTexte(l.tauxTva, 2) }))) : ETAT_INITIAL;
    // etatDepuisLignes lit des décimaux : on repasse avancement en texte.
    if (derniere) {
      for (const l of derniere.lignes) if (l.type === "OUVRAGE" && l.ligneDevisId) precedent.avancements[l.ligneDevisId] = l.avancement ?? 0;
    }
    const acomptes = acomptesParTaux(
      liste.filter((f) => f.type === "ACOMPTE").flatMap((f) => f.lignes.map((l) => ({ ...l, tauxTva: versTexte(l.tauxTva, 2), montantHT: versTexte(l.montantHT, 2) }))),
    );
    const avancements: Record<string, number> = {};
    for (const l of m.lignes) {
      if (l.type !== "OUVRAGE") continue;
      avancements[l.id] = typeof avancement === "number" ? avancement : (avancement[l.designation] ?? precedent.avancements[l.id] ?? 0);
    }
    const r = calculerSituation(m, avancements, precedent, acomptes);
    return { lignes: r.lignes, rang: av.length + 1 };
  }

  async function payer(factureId: string, date: string, montantCentimes: number, mode: "VIREMENT" | "CHEQUE" | "ESPECES" | "CARTE", reference = "") {
    await db.paiement.create({ data: { factureId, date: J(date), montant: versTexte(montantCentimes, 2), mode, reference, creeLe: T(date, "15:00") } });
  }

  // 1. D1 acompte 30 % — payé
  const f1 = await emettre(d1, lefevre, "ACOMPTE", acompte(d1, 3000), { emission: "2026-08-21", delai: 15 });
  await payer(f1.facture.id, "2026-08-25", f1.totaux.netAPayer, "VIREMENT", "VIR DEMO 0825");

  // 2. D3 situation 1 (35 %) — en retard, relancée
  const s31 = situation(d3, 3500);
  const f2 = await emettre(d3, parc, "SITUATION", s31.lignes, { emission: "2026-08-31", retenue: 500, periode: "Août 2026", rang: s31.rang });
  await db.relance.create({ data: { factureId: f2.facture.id, niveau: 1, le: T("2026-10-05", "09:10"), parId: user.id } });
  await db.relance.create({ data: { factureId: f2.facture.id, niveau: 2, le: T("2026-10-15", "09:40"), parId: user.id } });

  // 3. D2 acompte 20 % — payé
  const f3 = await emettre(d2, glycines, "ACOMPTE", acompte(d2, 2000), { emission: "2026-09-01" });
  await payer(f3.facture.id, "2026-09-08", f3.totaux.netAPayer, "VIREMENT", "VIR SCI GLYCINES DEMO");

  // 4. D1 solde — payé ce mois-ci
  const s1s = situation(d1, 10000);
  const f4 = await emettre(d1, lefevre, "SOLDE", s1s.lignes, { emission: "2026-09-30", periode: "Septembre 2026", rang: s1s.rang });
  await payer(f4.facture.id, "2026-10-12", f4.totaux.netAPayer, "CHEQUE", "Chèque n° 0000123");
  await db.devis.update({ where: { id: d1.id }, data: { dateReception: J("2026-09-29") } });

  // 5. D2 situation 1 (avancement par lot) — à venir
  const s21 = situation(d2, {
    "Installation de chantier et déplacement": 10000,
    "Échafaudage de façade, montage et démontage": 10000,
    "Protection des abords, sols et menuiseries": 10000,
    "Nettoyage haute pression de la façade": 8000,
    "Reprise des fissures": 5000,
    "Enduit monocouche gratté": 2500,
  });
  await emettre(d2, glycines, "SITUATION", s21.lignes, { emission: "2026-09-30", retenue: 500, periode: "Septembre 2026", rang: s21.rang });

  // 6. D3 situation 2 (70 %) — à venir
  const s32 = situation(d3, 7000);
  await emettre(d3, parc, "SITUATION", s32.lignes, { emission: "2026-09-30", retenue: 500, periode: "Septembre 2026", rang: s32.rang });

  // 7. D4 facture totalité — payée en partie, en retard
  const s4 = situation(d4, 10000);
  const f7 = await emettre(d4, fontaine, "FACTURE", s4.lignes, { emission: "2026-10-02", delai: 14, periode: "Septembre 2026", rang: s4.rang });
  await payer(f7.facture.id, "2026-10-09", Math.round(f7.totaux.netAPayer / 2 / 100) * 100, "CHEQUE", "Chèque n° 0000456");

  // 8. D7 acompte 30 % — payé ce mois-ci
  const f8 = await emettre(d7, robert, "ACOMPTE", acompte(d7, 3000), { emission: "2026-10-07", delai: 15 });
  await payer(f8.facture.id, "2026-10-14", f8.totaux.netAPayer, "VIREMENT", "VIR ROBERT DEMO");

  await db.compteur.createMany({
    data: [
      { cle: "DEV-2026", valeur: nDev },
      { cle: "DR-2026", valeur: nDr },
      { cle: "FAC-2026", valeur: nFac },
    ],
  });

  /* ── Achats de matériel (fournisseurs inventés) ── */
  const achat = async (p: { devis: { id: string } | null; fournisseur: string; numero: string; date: string; libelle: string; ht: number; tva?: number; echeance?: string; paye?: string }) => {
    const tva = p.tva ?? 2000;
    const montantTVA = Math.round((p.ht * tva) / 10000);
    await db.achat.create({
      data: {
        devisId: p.devis?.id ?? null, fournisseur: p.fournisseur, numero: p.numero, date: J(p.date), libelle: p.libelle,
        montantHT: versTexte(p.ht, 2), tauxTva: versTexte(tva, 2), montantTVA: versTexte(montantTVA, 2),
        dateEcheance: p.echeance ? J(p.echeance) : null, payeLe: p.paye ? J(p.paye) : null,
      },
    });
  };
  await achat({ devis: d1, fournisseur: "Négoce Façades Démo", numero: "NF-10482", date: "2026-08-24", libelle: "Peinture pliolite, fixateur, toile de verre", ht: 128000, echeance: "2026-09-23", paye: "2026-09-18" });
  await achat({ devis: d2, fournisseur: "Échafaudages Location Démo", numero: "EL-2026-0931", date: "2026-09-02", libelle: "Location échafaudage — septembre", ht: 240000, echeance: "2026-10-02", paye: "2026-10-01" });
  await achat({ devis: d2, fournisseur: "Négoce Façades Démo", numero: "NF-10611", date: "2026-09-03", libelle: "Enduit monocouche, mortier de reprise", ht: 386000, echeance: "2026-10-03", paye: "2026-10-02" });
  await achat({ devis: d2, fournisseur: "Échafaudages Location Démo", numero: "EL-2026-1047", date: "2026-10-01", libelle: "Location échafaudage — octobre", ht: 240000, echeance: "2026-10-31" });
  await achat({ devis: d3, fournisseur: "Négoce Façades Démo", numero: "NF-10377", date: "2026-08-25", libelle: "Revêtement d'imperméabilisation I3", ht: 215000, echeance: "2026-09-24", paye: "2026-09-20" });
  await achat({ devis: d3, fournisseur: "Résines & Étanchéité Démo", numero: "RE-5521", date: "2026-09-21", libelle: "Résine d'étanchéité des balcons", ht: 98000, echeance: "2026-10-21" });
  await achat({ devis: d7, fournisseur: "Dépôt Peintures Démo", numero: "DP-77310", date: "2026-10-08", libelle: "Peinture façade, anti-mousse", ht: 64000, echeance: "2026-10-18" });

  console.log("Démo prête :", { devis: nDev, recus: nDr, factures: nFac });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
