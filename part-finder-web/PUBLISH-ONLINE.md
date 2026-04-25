# Publish Part Finder Web

## Best option: GitHub Pages

This project is already prepared for GitHub Pages.

Files used:

- [index.html](C:/Users/dell/Documents/Bright%20Sun%20engineering/Sketchup/part-finder-web/index.html)
- [admin.html](C:/Users/dell/Documents/Bright%20Sun%20engineering/Sketchup/part-finder-web/admin.html)
- [.nojekyll](C:/Users/dell/Documents/Bright%20Sun%20engineering/Sketchup/part-finder-web/.nojekyll)
- [.github/workflows/part-finder-web-pages.yml](C:/Users/dell/Documents/Bright%20Sun%20engineering/Sketchup/.github/workflows/part-finder-web-pages.yml)

### Steps

1. Create a GitHub repository.
2. Upload this whole project.
3. Push to `main` or `master`.
4. In GitHub, open `Settings > Pages`.
5. Under `Build and deployment`, choose `GitHub Actions`.
6. Wait for the workflow to finish.
7. Open the published site URL.
8. Open `/admin.html` to manage the dataset.

## Quick option: Netlify

1. Open Netlify.
2. Create a new static site.
3. Upload the `part-finder-web` folder.
4. Open the published URL.
5. Open `/admin.html`.

## Dataset flow after publishing

1. Export JSON from SketchUp using the LEGNO exporter.
2. Upload the JSON file to Google Drive.
3. Share the JSON file link, not the folder link.
4. Open the published `admin.html`.
5. Paste the Google Drive file link.
6. Generate the user link.
7. Share that user link with the team.

## Important

- The app accepts a shared JSON file link.
- The app does not accept a Google Drive folder link.
- If Google Drive blocks direct browser fetch because of CORS or resource-key behavior, use a small Google Apps Script proxy and paste that JSON endpoint into the admin page instead.
