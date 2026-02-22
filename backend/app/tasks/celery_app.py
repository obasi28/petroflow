from celery import Celery
from app.config import get_settings

settings = get_settings()

celery = Celery(
    "petroflow",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.dca_tasks", "app.tasks.import_tasks"],
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    result_expires=3600,
    worker_prefetch_multiplier=1,
)
