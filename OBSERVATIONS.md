# Observations Tracker

## Initial Observations (Round 1)

| # | Observation | Status | Notes/Decision | Commit |
|---|---|---|---|---|
| 1 | The production rate visualization graph is rendered beautifully. I love it but it can be better using a primary and secondary axis, since gas, oil and water are usually of different scaled dimension. | done | Implemented dual Y-axis in production chart: liquids on primary axis, gas on secondary axis, with unit-aware tooltip formatting. | pending |
| 2 | The DCA analysis: only the results of the fit model is visualized in the graph after the analysis. I should also be able to visualize all models auto fitted after clicking that button as well. | done | Added auto-fit overlay rendering on DCA chart with top-3 visible by default and per-model toggles + show all/none controls. | pending |
| 3 | The DCA should be broad enough to capture gas DCA too. Read literature and include that as well if already not captured. I see I can toggle between the type of fluid option. That should inherently capture the DCA for the respective fluid. | done | Added fluid-aware DCA UI behavior across chart, forecast table, parameter units, controls, and summary cards (oil/gas/water/boe units and actuals). | pending |
| 4 | "R2" is not written or rendered properly in the result. It appears as a writing/rendering issue. | done | Standardized user-facing metric labels to plain ASCII `R2` in results, model comparison, toasts, and project DCA table. | pending |
| 5 | There is a button for the Monte Carlo simulation, it runs successfully but no output of result nor a visualization of results. | done | Fixed stale analysis selection via analysis-id store flow; added Monte Carlo histogram/CDF visualization and backend chart-ready histogram payload fields. | pending |
| 6 | Can we be able to add well CSV and have it automatically populate the required fields needed to create a well rather than manually filling those information? | done | Added `/imports/wells/upload` preview+execute workflow, frontend well import wizard, CSV template, and upsert-by-API-then-UWI behavior. | pending |
| 7 | There is a create project function but it only creates a project and it is empty. When we create a project, it should be a container for every analysis right within that project. | done | Added project summary + project DCA endpoints and upgraded project detail page into a Wells/DCA/Summary analysis hub; added project selector in well form. | pending |

## Future Observations

Use this section for new rounds.

| Round | Date | Observation | Priority | Status | Notes/Decision | Commit |
|---|---|---|---|---|---|---|
|  |  |  |  | todo |  |  |
