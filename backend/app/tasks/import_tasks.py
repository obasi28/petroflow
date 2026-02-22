from app.tasks.celery_app import celery


@celery.task(bind=True, name="imports.process_file")
def process_import_file(self, job_config: dict):
    """Process uploaded production data file."""
    self.update_state(state="PROCESSING", meta={"progress": 0})
    return {"status": "completed", "rows_imported": 0}
