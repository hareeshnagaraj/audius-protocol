from inspect import currentframe
from time import time

from sqlalchemy import text
from src.utils.update_indexing_checkpoints import (
    get_last_indexed_checkpoint,
    save_indexed_checkpoint,
)


def try_updating_aggregate_table(logger, db, redis, table_name, aggregate_func):
    # get name of the caller function
    task_name = currentframe().f_back.f_code.co_name

    # Define lock acquired boolean
    have_lock = False
    # Define redis lock object
    lock_name = f"index_{table_name}_lock"
    update_lock = redis.lock(lock_name, timeout=60 * 10)
    try:
        # Attempt to acquire lock - do not block if unable to acquire
        have_lock = update_lock.acquire(blocking=False)
        if have_lock:
            start_time = time()

            with db.scoped_session() as session:
                aggregate_func(session)

            logger.info(
                f"{task_name} | Finished updating \
                {table_name} in: {time()-start_time} sec"
            )
        else:
            logger.info(f"{task_name} | Failed to acquire {lock_name}")
    except Exception as e:
        logger.error(f"{task_name} | Fatal error in main loop", exc_info=True)
        raise e
    finally:
        if have_lock:
            update_lock.release()


def update_aggregate_table(
    logger,
    session,
    table_name,
    query,
    checkpoint_name,
    current_checkpoint,
):
    # get name of the caller function
    task_name = f"{currentframe().f_back.f_code.co_name}()"

    # get the last updated id that counted towards the current aggregate track
    prev_checkpoint = get_last_indexed_checkpoint(session, table_name)

    if not current_checkpoint or current_checkpoint == prev_checkpoint:
        logger.info(
            f"{task_name} | Skip update because there are no new blocks"
            f" | checkpoint: ({prev_checkpoint}, {current_checkpoint}]"
        )
        return

    # update aggregate track with new tracks that came after the prev_checkpoint
    logger.info(
        f"{task_name} | Updating {table_name}"
        f" | checkpoint: ({prev_checkpoint}, {current_checkpoint}]"
    )

    session.execute(
        text(query),
        {
            f"prev_{checkpoint_name}": prev_checkpoint,
            f"current_{checkpoint_name}": current_checkpoint,
        },
    )

    # update indexing_checkpoints with the new id
    save_indexed_checkpoint(session, table_name, current_checkpoint)