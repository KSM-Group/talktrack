# TalkTrack — wdrożenie poza claude.ai (prawdziwe logowanie + działający mikrofon)

To jest samodzielna wersja TalkTrack, którą hostujesz sam (np. na Vercel — darmowy plan).
Dzięki temu:
- każdy może założyć konto e-mail + hasło (Supabase Auth) — nie tylko osoby z Twojej organizacji Anthropic,
- mikrofon działa normalnie, bo strona nie jest w izolowanym iframe Claude,
- klucz do API Claude jest bezpieczny — leży tylko na serwerze (funkcja `api/ai.js`), nigdy w przeglądarce.

## Krok 1 — Supabase (baza danych + logowanie)
1. Załóż darmowe konto na https://supabase.com i utwórz nowy projekt.
2. Wejdź w **SQL Editor** → New query → wklej całą zawartość pliku `supabase_schema.sql` → **Run**.
3. Wejdź w **Authentication → Providers** i upewnij się, że **Email** jest włączony (domyślnie jest).
   - Dla szybkich testów możesz w **Authentication → Settings** wyłączyć "Confirm email", żeby konta aktywowały się od razu bez klikania linku potwierdzającego.
4. Wejdź w **Project Settings → API** i skopiuj:
   - `Project URL`
   - `anon public` key

## Krok 2 — wklej dane Supabase do frontendu
Otwórz `public/index.html`, na samej górze `<script>` znajdziesz:
```js
const SUPABASE_URL = "REPLACE_WITH_YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "REPLACE_WITH_YOUR_SUPABASE_ANON_KEY";
```
Podmień na wartości z Kroku 1. (Klucz `anon` jest bezpieczny do umieszczenia w kodzie frontendu — dostęp do danych i tak jest ograniczony regułami RLS z `supabase_schema.sql`, każdy widzi tylko swój wiersz.)

## Krok 3 — klucz do API Claude
Będziesz potrzebować klucza API z https://console.anthropic.com (Settings → API Keys). **Nie wklejaj go nigdzie w `public/index.html`** — trafia wyłącznie jako zmienna środowiskowa na serwerze (patrz Krok 4).

## Krok 4 — wdrożenie na Vercel
1. Załóż darmowe konto na https://vercel.com.
2. Najprościej: wrzuć ten folder na GitHub (nowe repo) i w Vercel kliknij **Add New → Project → Import** z tego repo.
   (Alternatywnie: zainstaluj `npm i -g vercel`, wejdź do tego folderu w terminalu i wpisz `vercel`.)
3. W ustawieniach projektu na Vercel: **Settings → Environment Variables** → dodaj:
   - `ANTHROPIC_API_KEY` = Twój klucz z Kroku 3
4. Kliknij **Deploy**. Po chwili dostaniesz adres typu `https://twoj-projekt.vercel.app`.

## Krok 5 — gotowe
Wejdź pod swój adres z Vercel, załóż konto (e-mail + hasło), zezwól na mikrofon gdy przeglądarka zapyta (tym razem naprawdę zapyta, bo to Twoja domena) — i aplikacja działa dla dowolnej liczby użytkowników, niezależnie od Twojej organizacji Anthropic.

## Struktura projektu
```
public/index.html     ← cała aplikacja (UI, głos, lekcje, logowanie)
api/ai.js              ← bezpieczna funkcja serwerowa wołająca Claude (klucz API ukryty)
supabase_schema.sql    ← tabela postępów użytkowników + reguły bezpieczeństwa (RLS)
package.json
```

## Co dalej / możliwe rozszerzenia
- Panel administracyjny do przeglądania postępów uczniów (osobny widok czytający tabelę `progress` w Supabase).
- Reset hasła (Supabase ma to wbudowane: `supabase.auth.resetPasswordForEmail`).
- Płatności / plany (Stripe + webhook w kolejnej funkcji `api/`).
- Własna domena zamiast `*.vercel.app` (Vercel → Settings → Domains).
