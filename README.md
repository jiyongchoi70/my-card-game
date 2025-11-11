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
   Copy `public/config.example.js` and update the values:
   ```js
   window.APP_CONFIG = {
     supabaseUrl: "https://<project-id>.supabase.co",
     supabaseAnonKey: "<Supabase anon key>",
     hintEndpoint: "../server/gpt-helper.php"
   };
   ```

2. **Prepare Supabase**
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

3. **Configure OpenAI**
   - Set environment variable `OPENAI_API_KEY` on the server that runs PHP.
   - Ensure PHP 8.1+ and the curl extension are available.

4. **Run Locally / Deploy**
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
