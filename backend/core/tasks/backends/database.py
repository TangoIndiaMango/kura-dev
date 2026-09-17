"""DB-backed Django Tasks backend (durable beyond ImmediateBackend)."""
from __future__ import annotations

import logging
from traceback import format_exception

from django.tasks.base import TaskResult, TaskResultStatus
from django.tasks.backends.base import BaseTaskBackend
from django.tasks.signals import task_enqueued
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.utils.json import normalize_json
from django.utils.module_loading import import_string

logger = logging.getLogger("kura.tasks")


class DatabaseBackend(BaseTaskBackend):
    supports_async_task = False
    supports_priority = False
    supports_get_result = False

    def enqueue(self, task, args, kwargs):
        from core.models import QueuedTask

        args_norm = normalize_json(args)
        kwargs_norm = normalize_json(kwargs)
        result_id = get_random_string(32)
        QueuedTask.objects.create(
            result_id=result_id,
            task_path=task.module_path,
            args=list(args_norm) if isinstance(args_norm, (list, tuple)) else [],
            kwargs=dict(kwargs_norm) if isinstance(kwargs_norm, dict) else {},
            status=QueuedTask.Status.READY,
        )
        task_result = TaskResult(
            task=task,
            id=result_id,
            status=TaskResultStatus.READY,
            enqueued_at=timezone.now(),
            started_at=None,
            last_attempted_at=None,
            finished_at=None,
            args=args,
            kwargs=kwargs,
            backend=self.alias,
            errors=[],
            worker_ids=[],
        )
        task_enqueued.send(type(self), task_result=task_result)
        logger.info("task_queued path=%s id=%s", task.module_path, result_id)
        return task_result


def execute_queued_row(*, row) -> bool:
    """Run one QueuedTask row; returns True on success."""
    from core.models import QueuedTask

    task_fn = import_string(row.task_path)
    row.status = QueuedTask.Status.RUNNING
    row.started_at = timezone.now()
    row.attempts += 1
    row.save(update_fields=["status", "started_at", "attempts", "updated_at"])
    try:
        if hasattr(task_fn, "call"):
            task_fn.call(*row.args, **row.kwargs)
        elif callable(task_fn):
            task_fn(*row.args, **row.kwargs)
        else:
            raise TypeError(f"Not callable: {row.task_path}")
        row.status = QueuedTask.Status.SUCCEEDED
        row.finished_at = timezone.now()
        row.error = ""
        row.save(update_fields=["status", "finished_at", "error", "updated_at"])
        return True
    except Exception as exc:
        row.status = QueuedTask.Status.FAILED
        row.finished_at = timezone.now()
        row.error = "".join(format_exception(type(exc), exc, exc.__traceback__))[:4000]
        row.save(update_fields=["status", "finished_at", "error", "updated_at"])
        logger.exception("task_failed path=%s id=%s", row.task_path, row.result_id)
        return False
