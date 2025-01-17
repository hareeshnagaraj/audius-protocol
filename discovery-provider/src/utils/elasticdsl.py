import copy
import datetime
import os

from elasticsearch import Elasticsearch
from src.utils.spl_audio import to_wei

es_url = os.getenv("audius_elasticsearch_url")
esclient = None
if es_url and not esclient:
    esclient = Elasticsearch(es_url, request_timeout=60)

# uses aliases
ES_PLAYLISTS = "playlists"
ES_REPOSTS = "reposts"
ES_SAVES = "saves"
ES_TRACKS = "tracks"
ES_USERS = "users"

ES_INDEXES = [ES_PLAYLISTS, ES_REPOSTS, ES_SAVES, ES_TRACKS, ES_USERS]

STALE_THRESHOLD_SECONDS = 4 * 60 * 60  # 4 hours


def raise_if_es_is_stale():
    # get most recent repost
    # if the created_at is > 4 hours old, ES is stale so raise an exception

    is_prod = os.getenv("audius_discprov_env") == "prod"
    if not is_prod:
        return

    found = esclient.search(index="reposts", size=1, sort="created_at:desc")
    ts_str = found["hits"]["hits"][0]["_source"]["created_at"]
    ts = datetime.datetime.strptime(ts_str, "%Y-%m-%dT%H:%M:%S.%fZ")
    age = datetime.datetime.now() - ts
    if age.seconds > STALE_THRESHOLD_SECONDS:
        raise Exception(f"ES data is stale. Last repost: {ts_str}")


def listify(things):
    if isinstance(things, list):
        return [str(t) for t in things]
    return [str(things)]


def pluck_hits(found):
    if "error" in found:
        raise Exception(found["error"])

    res = [h["_source"] for h in found["hits"]["hits"]]

    # add score for search_quality.py script
    for i in range(len(found["hits"]["hits"])):
        res[i]["_score"] = found["hits"]["hits"][i]["_score"]
    return res


def populate_user_metadata_es(user, current_user):
    user["total_balance"] = str(
        int(user.get("balance", "0") or "0")
        + int(user.get("associated_wallets_balance", "0") or "0")
        + to_wei(user.get("associated_sol_wallets_balance", "0") or 0)
        + to_wei(user.get("waudio", "0") or 0)
    )

    # Mutual box on profile page will fetch the data to compute this number
    # using the /v1/full/users/xyz/related?user_id=abc endpoint
    # Avoid extra round trips by not computing it here
    user["current_user_followee_follow_count"] = None

    if current_user:
        user_following = user.get("following_ids", [])
        current_user_following = current_user.get("following_ids", [])
        user["does_current_user_follow"] = user["user_id"] in current_user_following
        user["does_follow_current_user"] = current_user["user_id"] in user_following
    else:
        user["does_current_user_follow"] = False
        user["does_follow_current_user"] = False
    return omit_indexed_fields(user)


def populate_track_or_playlist_metadata_es(item, current_user):
    if current_user:
        my_id = current_user["user_id"]
        item["has_current_user_reposted"] = my_id in item["reposted_by"]
        item["has_current_user_saved"] = my_id in item["saved_by"]
    else:
        item["has_current_user_reposted"] = False
        item["has_current_user_saved"] = False
    return omit_indexed_fields(item)


omit_keys = [
    # user index
    "following_ids",
    "follower_ids",
    "tracks",
    # track index
    "reposted_by",
    "saved_by",
    # saves + reposts
    "item_key",
]


def omit_indexed_fields(doc):
    doc = copy.copy(doc)

    # track
    if "tags" in doc and isinstance(doc["tags"], list):
        doc["tags"] = ",".join(doc["tags"])

    if "following_count" in doc:
        doc["followee_count"] = doc["following_count"]

    for key in omit_keys:
        if key in doc:
            del doc[key]

    return doc
