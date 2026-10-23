# Afterglow — submission kit

## Status dla PW

MVP jest gotowy do testowania na danych demo. **Nie zgłaszaj go jeszcze jako potwierdzonej integracji live Qloo.** Adapter REST jest zaimplementowany i przetestowany kontraktowo, ale nie ma klucza Qloo do wykonania rzeczywistego zapytania. Klucz nie blokuje demo.

- Publiczne demo: **https://schultzenator.github.io/afterglow-qloo/**
- Publiczne repo: **https://github.com/Schultzenator/afterglow-qloo**
- Licencja: [MIT](LICENSE)
- Projekt Devpost: PW tworzy po zalogowaniu; URL nie został jeszcze utworzony.
- Termin: **30 października 2026, 23:45 EDT = 31 października, 04:45 w Warszawie**.
- Demo powinno pozostać dostępne do końca oceniania 5 listopada. Video nie jest wymagane. Źródło wymagań: [strona konkursu](https://qloo.devpost.com/) i [regulamin](https://qloo.devpost.com/rules).

## Co robi PW

1. Zaloguj się jako Schultzenator, [dołącz do konkursu](https://qloo.devpost.com/) i wypełnij formularz dostępu do API przez [instrukcję Qloo](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide#getting-your-api-key).
2. Po otrzymaniu klucza wdroż backend. Gotowe są Cloudflare Worker + statyczne assety oraz Dockerfile. [Instrukcja](README.md#deploy), [checklista aktywacji Qloo](docs/API-CONTRACT.md#qloo-activation-checklist).
3. Przetestuj publiczny backend z kluczem. Odznaka musi pokazać **Live Qloo**, a wynik musi pochodzić z Qloo. Uzupełnij wynik testu w WORK-STATE.md. Dla pełnej pętli LLM dodaj również serwerowy `MISTRAL_API_KEY`.
4. Wklej URL wdrożenia live w polu demo Devpost. GitHub Pages jest stabilnym fallbackiem do demonstracji UX; sam używa fixtures i reguł.
5. Wklej repo, opis poniżej i screeny z `docs/`. Sprawdź zgodność opisu z faktycznie uruchomionym trybem. Dopiero wtedy wyślij projekt.

Nie potrzeba konta użytkownika ani danych do logowania dla sędziów. Rejestracja konkursowa i formularz Qloo pozostały po stronie PW zgodnie z zadaniem.

## Pola Devpost do wklejenia

**Project name**

Afterglow

**Elevator pitch**

Your favorite artist is a starting point, not a dead end. Afterglow connects your taste across music, dining and film to plan one evening that feels like you.

**Built with**

TypeScript, Node.js, React, Vite, Qloo Taste AI API, Mistral function calling, Cloudflare Workers, GitHub Pages, Docker, Playwright.

W Devpost zaznacz tylko faktycznie użyte usługi hostingu. Obecne publiczne demo działa na GitHub Pages; Worker jest gotowy do wdrożenia, ale nie został opublikowany.

**Try it out / demo URL**

https://schultzenator.github.io/afterglow-qloo/

Zastąp adresem wdrożenia live po aktywacji Qloo. Nie publikuj sekretów ani pliku `.env`.

**Source code**

https://github.com/Schultzenator/afterglow-qloo

## Project story — English draft

### Inspiration

Planning a good evening means jumping between disconnected recommendation systems. Your music app knows your listening habits. A restaurant search knows your location. A streaming service knows your watch history. None of them gives you a small, coherent plan with a cultural thread running through it.

Afterglow starts with a few things you already love and asks a more useful question: where else could that taste take you tonight?

### What it does

Describe a few favorite artists, films or creators. Choose a city, party size and total budget. Afterglow builds one evening: a soundtrack to start with, a dinner spot to look up, and a film for the end of the night.

Each recommendation includes a short explanation and a link for the next step. You can replace a pick, inspect the execution trail, or save a compact itinerary. Rejected results become exclusions, while the interface keeps the other two choices stable. Budget allocations make the plan tangible without pretending to know current menu or streaming prices.

### How we built it

The TypeScript agent exposes three tools: `resolve_tastes`, `discover`, and `compose_plan`. A live Qloo provider resolves favorite names and requests cross-category Insights recommendations, using the returned entity IDs as taste signals. Place discovery applies locality and price-tier filters; rejected entities are excluded from subsequent requests.

An optional Mistral function-calling loop chooses the tool calls and selections. The application executes tools and validates the result: a model cannot insert an entity that was never returned by discovery. Qloo explainability metadata, when available, remains visible in the trace. We distinguish retrieved evidence from the planner's contextual explanation.

A deterministic planner and curated mock provider share the same tool interface so the experience stays runnable without credentials. We adapted the mock/live gateway, observable workflow and substitution patterns from our earlier AgentCart project into a new cultural-planning product. There is no checkout or payment integration.

### Current demo disclosure

The current public GitHub Pages demo uses a hand-authored fixture catalog and a rule-based planner. It is not evidence of live Qloo recommendations. The Qloo REST adapter is implemented and contract-tested; a credentialed integration test is pending API access. We also tested the Mistral tool-calling loop locally against the fixture provider. This state is visible in the app and documented in the repository.

### Challenges and what we learned

The difficult part is keeping a charming recommendation experience honest. A taste match is not a reservation, a budget allocation is not a quoted price, and a language model's explanation is not automatically Qloo evidence. We made those boundaries explicit while preserving a short, friendly flow.

We also learned that an agent benefits from strict result validation. Tool-selected IDs, explicit exclusions and inspectable inputs make the workflow easier to trust and debug than an unconstrained generated itinerary.

### What's next

Activate and verify the live Qloo integration, then test whether cross-domain suggestions help people find a more coherent evening than separate category searches. Later versions could add date-specific availability and reservation partners. The MVP deliberately focuses on one good flow rather than a general travel or shopping assistant.

---

Po aktywacji live: zastąp sekcję **Current demo disclosure** faktycznym statusem, datą smoke testu i użytym URL. Nie deklaruj poprawy trafności względem LLM bez przeprowadzonego porównania. Usuń z **What's next** zakończone kroki i zaktualizuj użyty hosting.

## Testing instructions — English, paste into Devpost

1. Open the demo URL in a desktop or mobile browser. No login or payment is required.
2. Leave the example brief in place, choose a city, and click **Find my evening**.
3. Inspect the three recommendations and open **Why this fits**.
4. Open **Follow the agent's trail** to see tool inputs, outputs and the current provider/planner mode.
5. Click the circular-arrow button on the film card. The film changes while the other two choices stay in place.
6. Click **Save evening** to download the plan. Try **A little electric** or **Soul after sunset** to change the taste profile.

The current public demo is labeled **Curated demo** and uses sample data. Restaurant hours, prices, dietary suitability and film availability must be checked directly. No booking takes place. The venue and media links are searches, not availability confirmations.

## Screenshots

- [Desktop landing and planner](docs/afterglow-desktop.png)
- [The connected evening](docs/afterglow-evening.png)
- [Mobile flow](docs/afterglow-mobile.png)

Screeny pokazują dane demo. Nie podpisuj ich jako wyniku live Qloo.

## Opcjonalne 45 sekund prezentacji

“Your music taste knows more about your ideal evening than a generic restaurant search does. Afterglow follows that connection. I tell it I love Khruangbin, Wes Anderson and Murakami. It resolves those anchors, discovers candidates across three categories, and builds one coherent evening. Here is the execution trail, including the current data-provider mode. If a choice doesn't click, I swap it: the rejected entity goes into exclusions and the rest of the evening stays intact. The result is a small plan I can actually use, with clear boundaries around prices and availability.”

## Pliki i środowisko

Kod w tej sesji znajduje się w dostępnym do zapisu katalogu:

`/home/schultze/Factory/workspaces/qloo-agentic-20261030/repo/qloo-agentic-2026/`

Wymagany katalog docelowy jest poza zakresem zapisu sesji. Poza sandboxem można pobrać dokładnie to samo publiczne repo:

```bash
git clone https://github.com/Schultzenator/afterglow-qloo.git /home/schultze/Factory/HCTN/qloo-agentic-2026
```
