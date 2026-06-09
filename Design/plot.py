import os
import textwrap
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

# Configurazione stile grafici
sns.set_theme(style="whitegrid")
plt.rcParams["figure.figsize"] = (10, 6)
plt.rcParams["font.size"] = 10


def analizza_e_plotta_survey(file_path, output_dir):
    # 1. Caricamento dati
    if not os.path.exists(file_path):
        print(f"Errore: Il file {file_path} non esiste.")
        return

    df = pd.read_csv(file_path)

    # Creiamo la cartella di output se non esiste
    os.makedirs(output_dir, exist_ok=True)

    print(f"File caricato correttamente. Righe: {df.shape[0]}, Colonne: {df.shape[1]}")

    # Funzione di supporto per andare a capo nei titoli lunghi senza troncarli
    def formatta_testo_lungo(testo, larghezza=55):
        if pd.isna(testo):
            return ""
        return textwrap.fill(str(testo), width=larghezza)

    # 2. Generazione Grafici Automatici per colonna
    # Saltiamo la prima colonna (Timestamp/Informazioni cronologiche)
    colonne_da_analizzare = df.columns[1:]

    for i, col in enumerate(colonne_da_analizzare):
        # Pulizia dati per la colonna corrente
        data_clean = df[col].dropna()

        if data_clean.empty:
            continue

        plt.figure(figsize=(12, 7))
        titolo_grafico = formatta_testo_lungo(col)

        # Determina il tipo di grafico in base al contenuto della colonna
        # Caso A: Risposte numeriche (es. scale Likert da 1 a 5)
        if (
            pd.api.types.is_numeric_dtype(data_clean)
            or data_clean.astype(str).str.isdigit().all()
        ):
            data_numeric = data_clean.astype(int)
            # Definiamo i bin corretti per scale tipiche 1-5
            bins = np.arange(0.5, 6.5, 1)
            sns.histplot(
                data_numeric,
                bins=bins,
                kde=False,
                color="skyblue",
                edgecolor="black",
                shrink=0.8,
            )
            plt.xticks(range(1, 6))
            plt.xlabel("Punteggio")
            plt.ylabel("Numero di Risposte")
            plt.title(f"Distribuzione Punteggi:\n{titolo_grafico}", fontsize=12)

        # Caso B: Domande a testo/Categorie (es. Fascia d'età, Tipo utente, Sì/No)
        else:
            # Se la risposta contiene virgole ed è una scelta multipla complessa,
            # contiamo le singole opzioni separandole
            if data_clean.str.contains(",").any() and data_clean.str.contains(
                ":"
            ).any():
                # Split delle risposte multiple (es. Passaparola, Vicinanza...)
                valori_esplosi = (
                    data_clean.str.split(",").explode().str.strip()
                )
                # Accorciamo le risposte troppo lunghe per l'asse Y
                valori_esplosi = valori_esplosi.apply(
                    lambda x: formatta_testo_lungo(x, 35)
                )
                conteggio = valori_esplosi.value_counts()
            else:
                # Categoria standard (es. fasce d'età o Sì/No)
                conteggio = data_clean.value_counts()

            # Se ci sono troppe categorie uniche (es. testo libero/commenti), saltiamo il plot
            if len(conteggio) > 15:
                print(
                    f"Colonna '{col[:30]}...' saltata (testo libero o troppe categorie)."
                )
                plt.close()
                continue

            # Grafico a barre orizzontali per favorire la lettura delle etichette lunghe
            sns.barplot(
                x=conteggio.values,
                y=conteggio.index,
                hue=conteggio.index,
                palette="viridis",
                legend=False,
            )
            plt.xlabel("Numero di Risposte")
            plt.ylabel("Opzioni")
            plt.title(f"Frequenza Risposte:\n{titolo_grafico}", fontsize=12)
            plt.yticks(fontsize=9)

        plt.tight_layout(pad=2.0)

        # Salvataggio del grafico
        nome_file = f"grafico_{i+1}_{col[:15].replace('/', '_').replace(' ', '_').strip('?')}.png"
        path_salvataggio = os.path.join(output_dir, nome_file)
        plt.savefig(path_salvataggio, dpi=150)
        plt.close()
        print(f"Salvato: {nome_file}")

    print(f"\nAnalisi completata! Trovi tutti i grafici in: {output_dir}")


# --- ESECUZIONE ---
if __name__ == "__main__":
    # Percorso del file che hai indicato
    PATH_INPUT = (
        r"C:\Users\stefa\Downloads\Questionario MuccApp (Risposte) - Risposte del modulo 1 (1).csv"
    )

    # Cartella dove verranno salvate le immagini dei grafici (.png)
    PATH_OUTPUT = r"C:\Users\stefa\Downloads\Grafici_MuccApp"

    analizza_e_plotta_survey(PATH_INPUT, PATH_OUTPUT)