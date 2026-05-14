Run the Puppeteer screenshot script to capture all app pages and update docs/screenshots/.

Execute: `make screenshots`

The script will:
1. Run pending DB migrations
2. Seed demo data
3. Start the backend (port 3001) and frontend (port 5173) dev servers
4. Capture: login, google_oauth (if GOOGLE_CLIENT_ID is set), dashboard, charts, transactions, categories
5. Save PNGs to docs/screenshots/
6. Kill both servers when done

After the screenshots are captured, commit the updated images:
`git add docs/screenshots/ && git commit -m "Update screenshots"`
