#!/usr/bin/env python3
"""Move the oldest file in _queue/ into _posts/ with today's date.

One file per run. An empty queue is a no-op.
"""

import datetime
import os
import re
import subprocess
import sys

QUEUE = "_queue"
POSTS = "_posts"


def added_timestamp(path):
    """Unix time of the commit that added the file, for ordering the queue."""
    result = subprocess.run(
        ["git", "log", "--diff-filter=A", "--format=%ct", "-1", "--", path],
        capture_output=True,
        text=True,
        check=False,
    )
    stamp = result.stdout.strip().splitlines()
    return int(stamp[0]) if stamp else 0


def oldest_queued():
    candidates = [
        os.path.join(QUEUE, name)
        for name in sorted(os.listdir(QUEUE))
        if name.endswith(".md")
    ]
    if not candidates:
        return None
    return min(candidates, key=lambda path: (added_timestamp(path), path))


def stamp(text, today):
    """Set the date to today and draft to false in the front matter."""
    match = re.match(r"^---\n(.*?)\n---\n?", text, re.DOTALL)
    if not match:
        raise SystemExit("Queued file has no YAML front matter.")

    front, body = match.group(1), text[match.end():]

    if re.search(r"^date:.*$", front, re.MULTILINE):
        front = re.sub(r"^date:.*$", "date: %s" % today, front, count=1, flags=re.MULTILINE)
    else:
        front += "\ndate: %s" % today

    if re.search(r"^draft:.*$", front, re.MULTILINE):
        front = re.sub(r"^draft:.*$", "draft: false", front, count=1, flags=re.MULTILINE)
    else:
        front += "\ndraft: false"

    return "---\n%s\n---\n%s" % (front, body)


def set_output(name, value):
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as handle:
            handle.write("%s=%s\n" % (name, value))


def main():
    if not os.path.isdir(QUEUE):
        set_output("published", "false")
        return

    source = oldest_queued()
    if source is None:
        print("Queue is empty. Nothing to publish.")
        set_output("published", "false")
        return

    today = datetime.date.today().isoformat()
    slug = os.path.basename(source)[: -len(".md")]
    destination = os.path.join(POSTS, "%s-%s.md" % (today, slug))

    with open(source, encoding="utf-8") as handle:
        text = handle.read()

    os.makedirs(POSTS, exist_ok=True)
    with open(destination, "w", encoding="utf-8") as handle:
        handle.write(stamp(text, today))
    os.remove(source)

    print("Published %s -> %s" % (source, destination))
    set_output("published", "true")
    set_output("slug", slug)


if __name__ == "__main__":
    sys.exit(main())
