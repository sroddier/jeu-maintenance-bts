import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EMAIL_PROF, SUPABASE_CLE_PUBLIQUE, SUPABASE_URL, VERSION_JEU } from "../src/online/config";
import { exporterCsvProf } from "../src/online/csv";
import { formaterDateParis, jourParis } from "../src/online/dates";
import { resultatDepuisPartie } from "../src/online/depuis-partie";
import { deposerResultat, renvoyerFile, type ClientResultats, type ErreurEnvoi } from "../src/online/envoi";
import { familleErreur, messageConnexion, messageLecture, messageSuppression } from "../src/online/erreurs";
import { lireFile } from "../src/online/file";
import { ligneSql, type LigneResultat } from "../src/online/ligne";
import { CARACTERES_PSEUDO, RAPPEL_PSEUDO, pseudoValide } from "../src/online/pseudo";
import { stockageMemoire } from "../src/online/stockage";
import { adaptateur } from "../src/online/supabase";
import { filtrerEtTrier, ligneDepuisApi } from "../src/online/tableau";
import { evaluerPartie, jouer, politiqueReference, demarrer } from "../src/sim/partie";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

describe("pseudo", () => {
  it("accepte un pseudonyme court, avec accent, tiret ou underscore", () => {
    expect(pseudoValide("camille")).toBe(true);
    expect(pseudoValide("  Jean-Luc  ")).toBe(true);
    expect(pseudoValide("élève_2")).toBe(true);
    expect(pseudoValide("Éloïse")).toBe(true);
    expect(pseudoValide("A B")).toBe(true);
    expect(RAPPEL_PSEUDO).toBe("N'utilise pas ton vrai nom.");
  });

  it("refuse un pseudo trop court, trop long, vide ou avec un autre signe", () => {
    expect(pseudoValide("ab")).toBe(false);
    expect(pseudoValide("a".repeat(21))).toBe(false);
    expect(pseudoValide("   ")).toBe(false);
    expect(pseudoValide("___")).toBe(false);
    expect(pseudoValide("nom@mail")).toBe(false);
    expect(pseudoValide("L'élève")).toBe(false);
    expect(pseudoValide("")).toBe(false);
  });
});

describe("ligne envoyée", () => {
  it("reprend le score de la graine 2026, sans le recalculer", () => {
    const partie = jouer("2026", politiqueReference);
    const evaluation = evaluerPartie(partie);
    const ligne = resultatDepuisPartie(partie, ID_A);
    expect(ligne).not.toBeNull();
    expect(ligneSql(ligne!)).toEqual({
      id: ID_A,
      pseudo: "simulation",
      seed: "2026",
      niveau: 1,
      score: evaluation.score.total,
      ao: evaluation.synthese.indicateurs.Ao,
      etoiles: evaluation.score.etoiles,
      pct_calculs_justes: evaluation.score.justesseRatio * 100,
      version_jeu: VERSION_JEU,
    });
    expect(Object.keys(ligneSql(ligne!)).sort()).toEqual(
      ["ao", "etoiles", "id", "niveau", "pct_calculs_justes", "pseudo", "score", "seed", "version_jeu"].sort(),
    );
  });

  it("n'envoie rien tant que la partie n'est pas finie", () => {
    expect(resultatDepuisPartie(demarrer("2026", "camille"), ID_A)).toBeNull();
  });

  it("insert sans select, avec les noms de colonnes", async () => {
    const appels: ReturnType<typeof ligneSql>[] = [];
    let select = 0;
    const source = {
      from(table: string) {
        expect(table).toBe("resultats");
        return {
          insert(ligne: ReturnType<typeof ligneSql>) {
            appels.push(ligne);
            const promesse = Promise.resolve({ error: null });
            return Object.assign(promesse, {
              select() {
                select += 1;
                return promesse;
              },
            });
          },
        };
      },
    };
    const client = adaptateur(source);
    expect(await client.inserer(exemple(ID_A))).toBeNull();
    expect(select).toBe(0);
    expect(appels).toEqual([ligneSql(exemple(ID_A))]);
    expect(appels[0]).not.toHaveProperty("created_at");
  });
});

describe("file hors ligne", () => {
  it("garde le score, le renvoie, et n'insère pas deux fois le même id", async () => {
    const stockage = stockageMemoire();
    const appels: string[] = [];
    const reponses: Array<ErreurEnvoi | null> = [
      { message: "Failed to fetch" },
      { message: "Failed to fetch" },
      { message: "Failed to fetch" },
      { message: "Failed to fetch" },
    ];
    const client = fauxClient(appels, reponses);

    expect(await deposerResultat(exemple(ID_A), client, stockage)).toBe("en_attente");
    expect(lireFile(stockage).map((ligne) => ligne.id)).toEqual([ID_A]);

    expect(await deposerResultat(exemple(ID_A), client, stockage)).toBe("en_attente");
    expect(lireFile(stockage)).toHaveLength(1);
    expect(appels).toEqual([ID_A, ID_A]);

    expect(await deposerResultat(exemple(ID_B), client, stockage)).toBe("en_attente");
    expect(lireFile(stockage).map((ligne) => ligne.id)).toEqual([ID_A, ID_B]);

    const renvoi = await renvoyerFile(client, stockage);
    expect(renvoi.envoyes.sort()).toEqual([ID_A, ID_B].sort());
    expect(renvoi.enAttente).toEqual([]);
    expect(lireFile(stockage)).toEqual([]);

    const avant = appels.length;
    const encore = await renvoyerFile(client, stockage);
    expect(encore.envoyes).toEqual([]);
    expect(appels).toHaveLength(avant);
    expect(await deposerResultat(exemple(ID_A), client, stockage)).toBe("envoye");
    expect(appels).toHaveLength(avant);
  });

  it("prend une clé déjà présente pour un envoi réussi", async () => {
    const stockage = stockageMemoire();
    const appels: string[] = [];
    const client = fauxClient(appels, [{ code: "23505", message: "duplicate key" }]);
    expect(await deposerResultat(exemple(ID_A), client, stockage)).toBe("envoye");
    expect(lireFile(stockage)).toEqual([]);
    expect(await deposerResultat(exemple(ID_A), client, stockage)).toBe("envoye");
    expect(appels).toEqual([ID_A]);
  });

  it("ne met pas en file un pseudo refusé", async () => {
    const stockage = stockageMemoire();
    const appels: string[] = [];
    const client = fauxClient(appels, []);
    const mauvaise = { ...exemple(ID_A), pseudo: "ab" };
    expect(await deposerResultat(mauvaise, client, stockage)).toBe("refuse");
    expect(lireFile(stockage)).toEqual([]);
    expect(appels).toEqual([]);
  });

  it("deux envois du même id en parallèle ne créent pas deux lignes", async () => {
    const stockage = stockageMemoire();
    let appels = 0;
    let relacher: (valeur: null) => void = () => undefined;
    const client: ClientResultats = {
      inserer: () =>
        new Promise((resolve) => {
          appels += 1;
          relacher = () => resolve(null);
        }),
    };
    const premier = deposerResultat(exemple(ID_A), client, stockage);
    const second = deposerResultat(exemple(ID_A), client, stockage);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(appels).toBe(1);
    relacher(null);
    expect(await Promise.all([premier, second])).toEqual(["envoye", "envoye"]);
    expect(appels).toBe(1);
    expect(lireFile(stockage)).toEqual([]);
  });
});

describe("export CSV du professeur", () => {
  it("écrit un fichier Excel français", () => {
    const csv = exporterCsvProf([
      {
        pseudo: "camille",
        seed: "2026",
        niveau: 1,
        score: 87.5,
        ao: 92.5,
        etoiles: 2,
        pctCalculsJustes: 70,
        dateParis: "16/03/2026 00:30",
      },
      {
        pseudo: 'dit "lulu"',
        seed: "a;b",
        niveau: 1,
        score: 100,
        ao: 98.01,
        etoiles: 3,
        pctCalculsJustes: 100,
        dateParis: "01/07/2026 14:00",
      },
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.startsWith("\uFEFFPseudo;Graine;Niveau;Score;Ao;Étoiles;% calculs justes;Date (Paris)\r\n")).toBe(true);
    expect(csv).toContain("camille;2026;1;87,5;92,5;2;70;16/03/2026 00:30\r\n");
    expect(csv).toContain('"dit ""lulu""";"a;b";1;100;98,01;3;100;01/07/2026 14:00\r\n');
    expect(csv.endsWith("\r\n")).toBe(true);
  });
});

describe("dates de Paris et tableau", () => {
  it("affiche l'heure de Paris, hiver comme été", () => {
    expect(formaterDateParis("2026-03-15T23:30:00.000Z")).toBe("16/03/2026 00:30");
    expect(jourParis("2026-03-15T23:30:00.000Z")).toBe("2026-03-16");
    expect(formaterDateParis("2026-07-01T12:00:00.000Z")).toBe("01/07/2026 14:00");
  });

  it("filtre le pseudo sans tenir compte des accents, et trie le score", () => {
    const lignes = [
      ligneApi("1", "Camille", "2026-03-15T23:30:00.000Z", 10),
      ligneApi("2", "Léo", "2026-07-01T12:00:00.000Z", 90),
    ];
    expect(filtrerEtTrier(lignes, { pseudo: "leo", debut: "", fin: "" }, { colonne: "score", sens: "desc" }).map((l) => l.id)).toEqual(["2"]);
    expect(
      filtrerEtTrier(lignes, { pseudo: "", debut: "2026-03-16", fin: "2026-03-16" }, { colonne: "createdAt", sens: "asc" }).map((l) => l.id),
    ).toEqual(["1"]);
    expect(filtrerEtTrier(lignes, { pseudo: "", debut: "", fin: "" }, { colonne: "score", sens: "desc" }).map((l) => l.score)).toEqual([90, 10]);
  });

  it("lit les nombres renvoyés en texte par la base", () => {
    const ligne = ligneDepuisApi({
      id: ID_A,
      created_at: "2026-03-15T23:30:00.000Z",
      pseudo: "camille",
      seed: "2026",
      niveau: 1,
      score: "87.5",
      ao: "92.5",
      etoiles: 2,
      pct_calculs_justes: "70",
      version_jeu: "0.1.0",
    });
    expect(ligne).toMatchObject({ score: 87.5, ao: 92.5, pctCalculsJustes: 70, etoiles: 2 });
  });
});

describe("messages d'erreur", () => {
  it("traduit les identifiants, la table absente et l'absence de droit", () => {
    expect(messageConnexion({ message: "Invalid login credentials" })).toBe("Identifiants incorrects.");
    expect(messageLecture({ code: "PGRST205", message: "Could not find the table public.resultats" })).toContain("supabase/schema.sql");
    expect(messageLecture({ code: "42501", message: "permission denied" })).toBe("Aucun droit pour lire les résultats.");
    expect(messageSuppression({ code: "42501", message: "permission denied" })).toBe("Aucun droit pour supprimer ce résultat.");
    expect(familleErreur({ message: "Failed to fetch" })).toBe("autre");
  });
});

describe("schéma SQL", () => {
  const sql = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");

  it("est rejouable et réserve la lecture au professeur", () => {
    const minuscule = sql.toLowerCase();
    expect(minuscule).toContain("create table if not exists");
    expect(minuscule).toContain("enable row level security");
    expect(minuscule).toContain("force row level security");
    expect(minuscule).toContain("drop policy if exists");
    expect(minuscule).toContain("for insert");
    expect(minuscule).toContain("for select");
    expect(minuscule).toContain("for delete");
    expect(minuscule).not.toContain("for update");
    expect(minuscule).toContain("grant insert");
    expect(minuscule).toContain("grant select, delete");
    expect(sql).toContain(EMAIL_PROF);
    expect(sql).toContain(CARACTERES_PSEUDO);
    expect(sql).toContain("(auth.jwt() ->> 'email')");
  });

  it("publie l'adresse du projet et la clé publique prévues", () => {
    expect(SUPABASE_URL).toBe("https://mbefjocapackbcgsmnyb.supabase.co");
    expect(SUPABASE_CLE_PUBLIQUE.startsWith("sb_publishable_")).toBe(true);
  });
});

function exemple(id: string): LigneResultat {
  return {
    id,
    pseudo: "camille",
    seed: "2026",
    niveau: 1,
    score: 87.5,
    ao: 92.5,
    etoiles: 2,
    pctCalculsJustes: 70,
    versionJeu: VERSION_JEU,
  };
}

function fauxClient(appels: string[], reponses: Array<ErreurEnvoi | null>): ClientResultats {
  return {
    async inserer(ligne) {
      appels.push(ligne.id);
      const prochaine = reponses.shift();
      return prochaine === undefined ? null : prochaine;
    },
  };
}

function ligneApi(id: string, pseudo: string, createdAt: string, score: number) {
  return {
    id,
    createdAt,
    pseudo,
    seed: "2026",
    niveau: 1,
    score,
    ao: 90,
    etoiles: 1,
    pctCalculsJustes: 80,
    versionJeu: "0.1.0",
  };
}
