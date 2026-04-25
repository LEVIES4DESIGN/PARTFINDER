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
  User page. Search only by Part Number or Persistent ID. Includes a Project Name dropdown at the top.
- [admin.html](C:/Users/dell/Documents/Bright%20Sun%20engineering/Sketchup/part-finder-web/admin.html)
  Admin page. Choose the local project folder, store the project JSON files in the browser, and generate the user search link.

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

## How to use with local project folders

1. Export the JSON from SketchUp using the LEGNO `Part Finder Web Export` button.
2. Keep the project JSON files inside one local project folder.
3. Open [admin.html](C:/Users/dell/Documents/Bright%20Sun%20engineering/Sketchup/part-finder-web/admin.html).
4. Click `Choose Project Folder`.
5. Let the app load and store the JSON files in this browser.
6. Open the main user page, or click `Generate User Link`.
7. Use that user page in the same browser/device.

## Important note on local browser storage

This local-folder method stores the project data inside the current browser.

That means:

- it works well for the same device and same browser
- it does not automatically share the data to another person's device
- if you later want multi-user online sharing, we can add a hosted project registry next

## Online hosting note

Once the app is published online, the admin flow stays the same:

1. Admin opens `admin.html` on the published site.
2. Admin chooses the local project folder.
3. The main user page automatically reads the stored projects in that browser.
4. Users on the same browser/device can open the main `index.html` page and search only by Part Number or Persistent ID.

## Multiple projects

The user page can also load a project list and show it in the Project Name dropdown.

Use a URL like:

`index.html?projects=https://example.com/projects.json`

Example registry format:

```json
{
  "default_project": "mr-ajith-final",
  "projects": [
    {
      "key": "mr-ajith-final",
      "name": "Mr Ajith Final Production",
      "source": "https://example.com/project-a.json"
    },
    {
      "key": "foyer-project",
      "name": "Foyer Project",
      "source": "https://example.com/project-b.json"
    }
  ]
}
```

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
