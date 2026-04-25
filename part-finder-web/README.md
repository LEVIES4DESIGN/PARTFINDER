# LEGNO Part Finder Web

Small standalone web app that mirrors the search behavior of the LEGNO SketchUp Part Finder.

## What it does

- search by part number or Persistent ID
- sort results with the same priority style as the plugin:
  - exact normalized match
  - exact raw match
  - starts-with normalized match
  - starts-with raw match
  - contains normalized match
  - contains raw match
- show detailed part information in a clean panel

## Pages

- [index.html](C:/Users/dell/Documents/Bright%20Sun%20engineering/Sketchup/part-finder-web/index.html)
  User page. Search only by Part Number or Persistent ID.
- [admin.html](C:/Users/dell/Documents/Bright%20Sun%20engineering/Sketchup/part-finder-web/admin.html)
  Admin page. Load local JSON, paste the shared Google Drive link, and generate the user search link.

## Publish online

### Recommended: GitHub Pages

This workspace now includes a GitHub Pages workflow:

- [.github/workflows/part-finder-web-pages.yml](C:/Users/dell/Documents/Bright%20Sun%20engineering/Sketchup/.github/workflows/part-finder-web-pages.yml)

How to publish:

1. Create a GitHub repository.
2. Upload this project, including the `part-finder-web` folder and the `.github/workflows` folder.
3. Push to the default branch.
4. In GitHub, open `Settings > Pages`.
5. Set `Build and deployment` to `GitHub Actions`.
6. Wait for the Pages workflow to finish.
7. Your site will be published online with both:
   - `/index.html`
   - `/admin.html`

### Fast backup option: Netlify

If you want it live quickly without GitHub setup, you can upload just the `part-finder-web` folder to Netlify as a static site.

## How to use with Google Drive

1. Export the JSON from SketchUp using the LEGNO `Part Finder Web Export` button.
2. Upload that JSON file into your shared Google Drive folder.
3. Set it to `Anyone with the link` can view.
4. Open [admin.html](C:/Users/dell/Documents/Bright%20Sun%20engineering/Sketchup/part-finder-web/admin.html).
5. Paste the Google Drive share link for the JSON file itself.
6. Click `Generate User Link`.
7. Share that generated user link with the team.

## Important note on Google Drive

The app will try to convert a normal Google Drive share link into a direct-download link automatically.

Google's Drive docs note that some Drive download URLs are not ideal for direct web-app use because of CORS behavior. If a shared file link doesn't load cleanly in the browser, the next stable step is a tiny proxy like Google Apps Script instead of direct Drive fetch.

Folder links are not supported in the search app. The app needs the shared file link for the JSON inside that folder.

## Online hosting note

Once the app is published online, the admin flow stays the same:

1. Admin uploads the exported JSON to Google Drive.
2. Admin shares the JSON file link.
3. Admin opens `admin.html` on the published site.
4. Admin pastes the link and generates the user search link.
5. Users open the generated `index.html?...` link and search only by Part Number or Persistent ID.

## Accepted JSON

The app accepts either:

- a plain array of part records
- or an object with:

```json
{
  "meta": { "model_name": "My Project" },
  "parts": [ ... ]
}
```

Each part can include these fields:

- `display_code`
- `entity_name`
- `definition_name`
- `part_name`
- `item_code`
- `material`
- `sub`
- `assembly_no`
- `unit`
- `floor`
- `room`
- `path_text`
- `lenx_mm`
- `leny_mm`
- `lenz_mm`
- `width_mm`
- `depth_mm`
- `height_mm`
- `persistent_id`
- `full_label`

## Note

This is a standalone web app, so it does not highlight geometry inside SketchUp yet. It mirrors the search and details behavior of the LEGNO Part Finder, and we can wire it to exported model data next.
