# Smartsheet Enterprise Solutions Portfolio Dashboard

A static, GitHub Pages-ready executive dashboard for the Smartsheet Enterprise Solutions portfolio.

## How to host in GitHub Pages

1. Extract this ZIP.
2. Upload the individual files and folders to your GitHub repository:
   - `index.html`
   - `assets/`
   - `README.md`
3. In GitHub, go to **Settings → Pages**.
4. Set **Source** to **Deploy from a branch**.
5. Select **main** and **/(root)**.
6. Click **Save**.

Your dashboard will publish at:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`

## Refreshing the data

Open the live dashboard and use **Upload new data file** at the top right. Select or drag/drop a new `.xlsx` export. The dashboard refreshes immediately and stores the latest upload in your browser.

## Data logic

- **Business Solutions** = unique parent solution rows.
- **Total Tickets** = filtered Jira work items.
- **Initiatives / Enhancements / KTLO** = ticket volume using `GTO Work Category`.
- **Annual Savings** = sum of `Total Savings/ Year` from parent rows only.
- **Departments Impacted** = distinct departments from filtered parent solution rows.
- **Completed Solutions** = parent solutions with status `Done`.
- **Active Portfolio** = parent solutions with `Backlog`, `Queued`, `In Progress`, or `In UAT`.

## Notes

This is a fully static dashboard. It does not require a server, database, or paid hosting.
