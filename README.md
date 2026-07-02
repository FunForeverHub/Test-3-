# Smartsheet Enterprise Solutions Portfolio Dashboard

A GitHub Pages-ready executive dashboard for the Smartsheet Enterprise Solutions Portfolio.

## Files to upload to GitHub

Upload the individual files/folders to the root of your repository:

- `index.html`
- `styles.css`
- `app.js`
- `data.js`
- `README.md`
- `assets/ship-bg.svg`

Do **not** upload only the ZIP file.

## Publish with GitHub Pages

1. Go to your repository in GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select branch **main** and folder **/ (root)**.
5. Click **Save**.

Your site will publish at:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY-NAME/`

For your current repo, it should be:

`https://funforeverhub.github.io/Test-3-/`

## Refreshing the data

Use the **Upload new data file** section at the top of the dashboard to upload a new Smartsheet Excel export. The dashboard refreshes immediately and stores that uploaded data in your browser.

Important: uploading through the dashboard updates your browser view only. To make the new data the default for everyone, replace/regenerate `data.js` and commit it to GitHub.

## Dashboard logic

- Business Solutions = parent solution rows only.
- Total Tickets = all filtered work items.
- Initiative, Enhancement, and KTLO = ticket counts by GTO Work Category.
- Annual Savings = sum of parent rows only.
- Departments Impacted = distinct count of departments after filters.
- Business Sponsor has been removed from both table views.
- Active Portfolio excludes Done and Cancelled solutions.
