# Enterprise Solutions Portfolio Dashboard

Static GitHub Pages dashboard for the Smartsheet/Jira portfolio report.

## Files

- `index.html` - dashboard page
- `styles.css` - dashboard styling
- `app.js` - filtering, calculations, charts, and Excel upload logic
- `data.js` - packaged starter dataset

## How to use

1. Upload all files to a GitHub repository.
2. Enable GitHub Pages for the repository.
3. Open the dashboard URL.
4. To refresh the dashboard with a new report, use **Upload new data file** at the top-right of the dashboard and select the latest `.xlsx` export.

The upload happens directly in your browser. The file is not sent anywhere. The dashboard refreshes immediately and tries to save the uploaded data in browser storage so it stays available after page refreshes.

## Data rules

- Business Solutions are counted from parent rows only.
- Total Tickets are counted from all filtered Jira work items.
- Annual Savings are summed from parent Business Solution rows only.
- Departments Impacted is a distinct count after filters are applied.
- Active Portfolio excludes Done and Cancelled items.
