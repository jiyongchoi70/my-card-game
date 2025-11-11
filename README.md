# Card Flip Memory Game

A lightweight card matching game built with plain HTML, CSS, and JavaScript. Scores are saved to Supabase and GPT-4o provides optional hints through a PHP endpoint that uses `curl`.

## Project Structure

```
public/
  index.html        # Game UI markup
  styles.css        # Styling and flip animations
  game.js           # Game logic, Supabase integration, hint requests
  config.example.js # Client-side configuration template
server/
  gpt-helper.php    # GPT-4o hint endpoint (curl-based)
.gitignore          # Ignore local secrets/config
README.md
```

## Setup

1. **Create `public/config.js`**  
   Copy `public/config.example.js` and update the values. 기본 설정은 점수 API 프록시와 GPT 힌트 엔드포인트만 포함합니다.
   ```js
   window.APP_CONFIG = {
     scoreEndpoint: "../server/supabase-api.php",
     hintEndpoint: "../server/gpt-helper.php"
   };
   ```

2. **Generate `server/supabase-config.php`**  
   - 환경 변수 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SCORES_TABLE`(선택 사항)을 설정한 뒤 아래 명령을 실행합니다.
     ```bash
     node scripts/create-supabase-config.js
     ```
   - Vercel 등 배포 환경에서는 동일한 환경 변수를 등록하고 Build Command에 `npm run build`(또는 `node scripts/create-supabase-config.js`)를 추가하면 배포 시 자동으로 생성됩니다.

3. **Prepare Supabase**
   - Create a table named `scores`:
     ```sql
     create table if not exists scores (
       id uuid primary key default gen_random_uuid(),
       player_name text not null,
       moves integer not null,
       duration_seconds integer not null,
       created_at timestamp with time zone default timezone('utc'::text, now())
     );
     ```
   - Enable Row Level Security and add policies:
     ```sql
     alter table scores enable row level security;

     create policy "Allow anonymous insert" on scores
       for insert with check (true);

     create policy "Allow anonymous read" on scores
       for select using (true);
     ```

4. **Configure OpenAI**
   - Set environment variable `OPENAI_API_KEY` on the server that runs PHP.
   - Ensure PHP 8.1+ and the curl extension are available.

5. **Run Locally / Deploy**
   - Serve the `public/` directory with any static server (e.g., `npx serve public`).
   - Host `server/gpt-helper.php` on a PHP-capable server. If using a different origin, review CORS requirements.

## Usage

1. Open `public/index.html`, enter a name, and click **Start Game**.
2. Upon matching all cards, the score is stored in Supabase and recent scores appear in the list.
3. Clicking **Hint** triggers the GPT-4o helper (once configured) to return a short strategy tip.

## Development Notes

- Watch network requests in DevTools to debug Supabase or hint calls.
- Before Supabase is configured, the scoreboard displays a placeholder message.
- Check PHP server logs if the hint endpoint fails.

## License

Use and modify freely for your project needs.
