.PHONY: backend worker frontend

backend:
	venv\Scripts\uvicorn main:app --reload --port 8000

worker:
	venv\Scripts\celery -A src.infrastructure.workers.celery_app worker -P solo -l INFO

frontend:
	cd frontend && npm run dev
