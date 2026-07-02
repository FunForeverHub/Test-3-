# Enterprise Solutions Portfolio Dashboard

Static GitHub Pages dashboard for the Smartsheet/Jira portfolio report.

## Publish on GitHub Pages

1. Upload these files to the root of your GitHub repository:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `data.js`
   - `README.md`
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select **main** and **/ (root)**.
5. Click **Save**.

Your dashboard will publish at:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY-NAME/`

For your current repo, it should be:

`https://funforeverhub.github.io/Test-3-/`

## Updating the dashboard data

Open the dashboard in the browser and use **Upload new data file** to upload the latest Smartsheet Excel export. The dashboard refreshes immediately and stores that upload in your browser using local storage.

Use **Restore packaged data** to go back to the original embedded dataset.

## Notes

- The upload updates your local browser view. It does not overwrite the files in GitHub.
- To make the new data the default for everyone, regenerate/replace `data.js` from the latest Excel export and commit it to GitHub.
- KPI logic uses filtered data consistently.
- Business Solutions and Annual Savings are calculated from parent solution rows.
- Departments Impacted is a distinct count after filters are applied.
